import { Store } from "./store";
import { workspace, Gateway } from "./gateway";
import { recipe } from "./providers";
import { Coordinator, ProviderUnavailable, type AgentAdapter } from "./agents";
import {
  planSchema,
  redact,
  type Task,
  type Plan,
  type Capabilities,
} from "./contracts";
const terminal = new Set(["DONE", "FAILED", "CANCELED"]);
export class Engine {
  active = new Map<string, AbortController>();
  private queue: Promise<void> = Promise.resolve();
  readonly coordinator: Coordinator;
  constructor(
    readonly store: Store,
    readonly gateway: Gateway,
    adapter: AgentAdapter = {
      name: "Not connected",
      async send() {
        throw new ProviderUnavailable("Connect ChatGPT in Connections.");
      },
    },
  ) {
    this.coordinator = new Coordinator(store, gateway, adapter);
    for (const t of store.tasks())
      if (
        ["PLANNING", "RUNNING", "VALIDATING", "WAITING_APPROVAL"].includes(
          t.state,
        )
      ) {
        t.state = "PAUSED";
        t.approved = false;
        store.put(t);
        store.event(
          t.id,
          "manager",
          "RECOVERED",
          "Execution paused after restart. Inspect evidence and resume; ambiguous side effects are reconciled before retry.",
        );
      }
    store.db.exec("DELETE FROM approvals");
  }
  async create(
    goal: string,
    root: string,
    mode: Task["mode"],
    model: string,
    plan?: string,
    permission: "review" | "workspace" = "review",
    capabilities?: Capabilities,
  ) {
    const t = this.store.create(goal, workspace(root), mode, model);
    t.capabilities = capabilities;
    this.store.put(t);
    if (permission === "workspace") {
      this.store.db
        .prepare("INSERT INTO task_grants VALUES(?,?,?)")
        .run(t.id, t.root, new Date().toISOString());
      t.autonomous = true;
      this.store.put(t);
      this.store.event(
        t.id,
        "manager",
        "WORKSPACE_AUTHORIZED",
        "User authorized routine file actions and isolated execution for this task in " +
          t.root +
          ". No repeated round approvals. Revoke or Stop at any time.",
      );
    }
    if (mode === "assisted" && !plan) {
      this.store.state(
        t.id,
        "WAITING_PROVIDER",
        "Paste a structured plan from your manual chat.",
      );
      return t.id;
    }
    if (mode === "browser") {
      this.schedulePlan(t.id);
      return t.id;
    }
    await this.plan(t, plan);
    return t.id;
  }
  private schedulePlan(id: string) {
    this.store.state(id, "PLANNING");
    this.queue = this.queue.then(async () => {
      const task = this.store.get(id);
      if (task.state === "PLANNING") await this.plan(task);
    });
  }
  async plan(t: Task, raw?: string) {
    const ctrl = new AbortController();
    this.active.set(t.id, ctrl);
    try {
      if (t.mode === "local" || t.mode === "chatgpt")
        throw new ProviderUnavailable(
          "Legacy inference task is disabled. Create a new task with ChatGPT.",
        );
      if (t.mode === "browser") {
        await this.coordinator.prepare(t, ctrl.signal);
        this.continueAuthorized(t.id);
        return;
      }
      const plan: Plan =
        t.mode === "recipe"
          ? recipe(t.goal)
          : planSchema.parse(JSON.parse(raw ?? ""));
      if (ctrl.signal.aborted) return;
      await this.gateway.prepareRuns(t.root, plan.actions, ctrl.signal);
      t.plan = plan;
      t.state = "WAITING_APPROVAL";
      this.store.put(t);
      this.store.event(t.id, "manager", "PLAN_PROPOSED", plan.summary);
      this.store.event(
        t.id,
        "builder",
        "WORK_ASSIGNED",
        JSON.stringify(plan.actions, null, 2),
      );
      this.store.event(
        t.id,
        "reviewer",
        "REVIEW_CRITERIA",
        "Reread each written file and compare exact content; require successful exit codes and captured evidence. This verifier is deterministic, not an independent reasoning model.",
      );
      this.continueAuthorized(t.id);
    } catch (e) {
      if (!ctrl.signal.aborted) {
        const message = redact(String(e));
        this.store.state(
          t.id,
          e instanceof ProviderUnavailable ? "WAITING_PROVIDER" : "FAILED",
          message,
        );
        this.store.event(t.id, "manager", "PROVIDER_ERROR", message);
      }
    } finally {
      if (this.active.get(t.id) === ctrl) this.active.delete(t.id);
    }
  }
  private continueAuthorized(id: string) {
    const t = this.store.get(id);
    if (
      t.state !== "WAITING_APPROVAL" ||
      !t.plan ||
      !this.store.hasWorkspaceGrant(t)
    )
      return;
    const allowed = new Set([
      "read",
      "list",
      "write",
      "command",
      "run",
      "mkdir",
      "search",
      "browser",
      "desktop",
      "git",
    ]);
    if (t.plan.actions.slice(t.cursor).some((a) => !allowed.has(a.tool)))
      return;
    this.store.event(
      id,
      "manager",
      "WORKSPACE_GRANT_USED",
      "Continuing the exact recorded plan under the user's existing workspace authorization.",
    );
    this.approve(id, true, true);
  }
  revoke(id: string) {
    this.store.db.prepare("DELETE FROM task_grants WHERE taskId=?").run(id);
    this.pause(id);
    const task = this.store.get(id);
    task.autonomous = false;
    this.store.put(task);
    this.store.event(
      id,
      "manager",
      "WORKSPACE_REVOKED",
      "Workspace authorization revoked. Active tools stopped; fresh approval required.",
    );
  }
  approve(id: string, allow: boolean, fromGrant = false) {
    const t = this.store.get(id);
    if (t.mode === "local" || t.mode === "chatgpt")
      throw new ProviderUnavailable(
        "Legacy inference task is disabled. Create a new ChatGPT task.",
      );
    if (t.state !== "WAITING_APPROVAL" || !t.plan)
      throw Error("No pending plan");
    if (!allow) {
      this.store.state(id, "CANCELED");
      this.store.event(id, "manager", "DENIED", "User denied plan.");
      return;
    }
    this.store.db
      .prepare("INSERT OR REPLACE INTO approvals VALUES(?,?,?)")
      .run(id, JSON.stringify(t.plan), Date.now() + 15 * 60 * 1000);
    t.approved = true;
    t.state = "RUNNING";
    this.store.put(t);
    this.store.event(
      id,
      "manager",
      "PLAN_APPROVED",
      fromGrant
        ? "Exact plan authorized by the user workspace grant (15-minute execution lease)."
        : "User approved the exact plan once (15-minute expiry).",
    );
    this.enqueue(id);
  }
  enqueue(id: string) {
    this.queue = this.queue
      .then(() => this.execute(id))
      .catch((e) => {
        this.store.state(id, "FAILED", redact(String(e)));
      });
  }
  async idle() {
    let pending;
    do {
      pending = this.queue;
      await pending;
    } while (pending !== this.queue);
  }
  private async executeComputer(
    task: Task,
    action: Extract<
      import("./contracts").Action,
      { tool: "browser" | "desktop" }
    >,
    signal: AbortSignal,
  ) {
    if (action.tool === "browser" && !task.capabilities?.browser)
      throw Error("Browser access was not authorized for this task.");
    if (action.tool === "desktop" && !task.capabilities?.desktop)
      throw Error("No desktop window was authorized for this task.");
    if (!this.gateway.computer)
      throw Error("Computer tools require the native desktop app.");
    return this.gateway.computer(task, action, signal);
  }
  async execute(id: string) {
    let t = this.store.get(id);
    if (t.state !== "RUNNING" || !t.plan || this.active.has(id)) return;
    const controller = new AbortController();
    this.active.set(id, controller);
    const signal = controller.signal;
    try {
      for (let idx = t.cursor; idx < t.plan!.actions.length; idx++) {
        if (signal.aborted) throw Error("Canceled");
        t = this.store.get(id);
        if (t.state !== "RUNNING") return;
        const grant = this.store.db
          .prepare("SELECT * FROM approvals WHERE taskId=?")
          .get(id);
        if (
          !grant ||
          Number(grant.expires) < Date.now() ||
          grant.plan !== JSON.stringify(t.plan)
        ) {
          this.store.state(id, "WAITING_APPROVAL");
          this.store.event(
            id,
            "manager",
            "APPROVAL_EXPIRED",
            "Execution lease expired.",
          );
          this.continueAuthorized(id);
          return;
        }
        const a = t.plan!.actions[idx],
          key = `${id}:${idx}`;
        const effect = this.store.db
          .prepare("SELECT * FROM effects WHERE id=?")
          .get(key);
        if (effect?.state === "SUCCEEDED") {
          t.cursor = idx + 1;
          this.store.put(t);
          continue;
        }
        if (
          effect?.state === "STARTED" &&
          (a.tool === "command" ||
            a.tool === "run" ||
            a.tool === "browser" ||
            a.tool === "desktop" ||
            a.tool === "git")
        )
          throw Error(
            "Interrupted action has unknown outcome; create a new task after inspecting evidence. It will not be replayed.",
          );
        this.store.event(id, "builder", "TOOL_STARTED", JSON.stringify(a));
        let output = "";
        if (a.tool === "write") {
          const current = await this.gateway.file(
            t.root,
            "read",
            a.path,
            {},
            signal,
          );
          const prior = effect
            ? JSON.parse(String(effect.before))
            : (current.content ?? null);
          if (
            !effect &&
            a.expectedHash !== undefined &&
            (current.hash ?? null) !== a.expectedHash
          )
            throw Error(
              "File changed after plan preparation; create a fresh plan instead of overwriting newer content.",
            );
          if (!effect)
            this.store.db
              .prepare("INSERT INTO effects VALUES(?,?,?,?,?,?,?)")
              .run(
                key,
                id,
                idx,
                "STARTED",
                JSON.stringify(prior),
                a.content,
                null,
              );
          if (effect && current.content === a.content) {
            output =
              "Recovered previously applied write; no duplicate mutation.";
          } else {
            if (effect && current.content !== prior)
              throw Error(
                "Ambiguous write: file differs from both before and after snapshot. Manual reconciliation required.",
              );
            await this.gateway.file(
              t.root,
              "write",
              a.path,
              { expected: prior, content: a.content },
              signal,
            );
            output = `Wrote ${a.path}\n--- before\n${prior ?? "(new file)"}\n+++ after\n${a.content}`;
          }
          const verified = await this.gateway.file(
            t.root,
            "read",
            a.path,
            {},
            signal,
          );
          if (verified.content !== a.content)
            throw Error("Reviewer rejected mismatched file contents");
          this.store.event(
            id,
            "reviewer",
            "CHECK_PASSED",
            `${a.path}: exact content verified. SHA256 ${verified.hash}`,
          );
        } else {
          if (!effect)
            this.store.db
              .prepare("INSERT INTO effects VALUES(?,?,?,?,?,?,?)")
              .run(key, id, idx, "STARTED", null, null, null);
          output =
            a.tool === "command"
              ? await this.gateway.command(t.root, a, signal)
              : a.tool === "run"
                ? JSON.stringify(await this.gateway.sandbox(t.root, a, signal))
                : a.tool === "git"
                  ? JSON.stringify(
                      await this.gateway.git(
                        t.root,
                        a,
                        "chai/" + id + "-" + idx,
                        signal,
                      ),
                    )
                  : a.tool === "browser" || a.tool === "desktop"
                    ? JSON.stringify(await this.executeComputer(t, a, signal))
                    : JSON.stringify(
                        await this.gateway.file(
                          t.root,
                          a.tool,
                          a.path,
                          a.tool === "search" ? { query: a.query } : {},
                          signal,
                        ),
                      );
          this.store.event(
            id,
            "reviewer",
            a.tool === "run" ? "EXECUTION_CAPTURED" : "CHECK_PASSED",
            `${a.tool}: gateway completed successfully with captured output.`,
          );
        }
        if (signal.aborted) throw Error("Canceled");
        this.store.db
          .prepare("UPDATE effects SET state=?,output=? WHERE id=?")
          .run("SUCCEEDED", redact(output), key);
        t.cursor = idx + 1;
        this.store.put(t);
        this.store.event(
          id,
          "builder",
          "TOOL_EXECUTED",
          output || "Completed with exit code 0.",
        );
        this.store.event(
          id,
          "manager",
          "CHECKPOINT_SAVED",
          `Step ${idx + 1}/${t.plan!.actions.length} persisted.`,
        );
      }
      t = this.store.state(id, "VALIDATING");
      const effects = this.store.db
        .prepare("SELECT state FROM effects WHERE taskId=?")
        .all(id);
      if (
        effects.length !== t.plan!.actions.length ||
        effects.some((e) => e.state !== "SUCCEEDED")
      )
        throw Error("Missing execution evidence");
      if (t.mode === "browser") {
        if (!t.agent) this.coordinator.initialize(t).phase = "execute";
        const complete = await this.coordinator.review(t, signal);
        if (!complete) {
          this.continueAuthorized(id);
          return;
        }
      }
      if (t.mode !== "browser") {
        for (const row of this.store.db
          .prepare("SELECT idx,output FROM effects WHERE taskId=?")
          .all(id)) {
          if (t.plan!.actions[Number(row.idx)].tool !== "run") continue;
          const result = JSON.parse(String(row.output));
          if (result.exitCode !== 0 || result.termination)
            throw Error(
              "Sandbox check failed; inspect captured execution evidence.",
            );
        }
      }
      if (signal.aborted) return;
      this.store.state(id, "DONE");
      this.store.event(
        id,
        "manager",
        "TASK_DONE",
        t.agent?.report
          ? t.agent.report.summary +
              "\n" +
              t.agent.report.limitations.join("\n")
          : `Verified ${effects.length} local actions. Provider: ${t.mode}. All evidence saved.`,
      );
    } catch (e) {
      if (!signal.aborted) {
        this.store.state(
          id,
          e instanceof ProviderUnavailable ? "WAITING_PROVIDER" : "FAILED",
          redact(String(e)),
        );
        this.store.event(
          id,
          "manager",
          e instanceof ProviderUnavailable ? "PROVIDER_ERROR" : "TASK_FAILED",
          String(e),
        );
      }
    } finally {
      if (this.active.get(id) === controller) this.active.delete(id);
    }
  }
  pause(id: string) {
    const t = this.store.get(id);
    if (terminal.has(t.state)) return;
    t.state = "PAUSED";
    t.approved = false;
    this.store.put(t);
    this.active.get(id)?.abort();
    this.store.db.prepare("DELETE FROM approvals WHERE taskId=?").run(id);
    this.store.event(
      id,
      "manager",
      "TASK_PAUSED",
      "Paused; new execution requires fresh approval.",
    );
  }
  async resume(id: string) {
    const t = this.store.get(id);
    if (t.mode === "local" || t.mode === "chatgpt")
      throw new ProviderUnavailable(
        "Legacy inference task is disabled. Create a new ChatGPT task.",
      );
    if (!["PAUSED", "WAITING_PROVIDER"].includes(t.state))
      throw Error("Task cannot resume from this state");
    if (this.active.has(id))
      throw Error("Wait for canceled operation to finish");
    if (
      t.mode === "browser" &&
      (!t.plan || ["manager", "builder"].includes(t.agent?.phase ?? "manager"))
    ) {
      this.schedulePlan(id);
      return;
    }
    if (!t.plan) {
      await this.plan(t);
      return;
    }
    if (
      t.mode === "browser" &&
      ["reviewer", "finalize"].includes(t.agent?.phase ?? "")
    ) {
      t.state = "RUNNING";
      this.store.put(t);
      this.enqueue(id);
      return;
    }
    t.state = "WAITING_APPROVAL";
    t.approved = false;
    this.store.put(t);
    this.continueAuthorized(id);
  }
  stop() {
    for (const t of this.store.tasks())
      if (!terminal.has(t.state)) {
        this.store.state(t.id, "CANCELED");
        this.active.get(t.id)?.abort();
        this.store.event(
          t.id,
          "manager",
          "TASK_CANCELED",
          "Stop all requested. Completed effects remain; inspect before undo.",
        );
      }
    this.store.db.exec("DELETE FROM approvals");
    this.gateway.stop();
  }
  async undo(id: string) {
    const t = this.store.get(id);
    if (!terminal.has(t.state) && t.state !== "PAUSED")
      throw Error("Stop or pause first");
    if (this.active.size) throw Error("Wait until active tools have stopped");
    const effects = this.store.db
      .prepare(
        "SELECT * FROM effects WHERE taskId=? AND state=? ORDER BY idx DESC",
      )
      .all(id, "SUCCEEDED");
    for (const e of effects) {
      const action = t.plan?.actions[Number(e.idx)];
      if (action?.tool !== "write") continue;
      const before = JSON.parse(String(e.before));
      if (before === null) {
        this.store.event(
          id,
          "manager",
          "UNDO_SKIPPED",
          `New file ${action.path} retained; deletion is not automatic.`,
        );
        continue;
      }
      await this.gateway.file(t.root, "write", action.path, {
        expected: action.content,
        content: before,
      });
      this.store.db
        .prepare("UPDATE effects SET state=? WHERE id=?")
        .run("UNDONE", e.id);
      this.store.event(
        id,
        "manager",
        "UNDO_APPLIED",
        `Restored ${action.path}; current content matched the recorded write.`,
      );
    }
  }
}
