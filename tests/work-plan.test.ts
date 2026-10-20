import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Store } from "../src/core/store";
import { BrowserBridge } from "../src/core/browser-bridge";
import { workStepsSchema } from "../src/core/work-plan";

test("progress survives stale task saves and restart; retries are idempotent and stale jobs cannot change a plan", () => {
  const base = mkdtempSync(join(tmpdir(), "chai-progress-")),
    db = join(base, "state.sqlite");
  let store = new Store(db),
    bridge = new BrowserBridge(store);
  const task = store.create("Build and verify", base, "browser", "browser");
  const id = randomUUID();
  store.db
    .prepare("INSERT INTO browser_jobs VALUES(?,?,?,?,?,?,?,?)")
    .run(
      id,
      "call",
      task.id,
      "manager",
      JSON.stringify({
        revision: 0,
        phase: "assignment",
        system: "fixture",
        input: "{}",
        schema: {},
      }),
      null,
      "WAITING",
      new Date().toISOString(),
    );
  const update = {
    sequence: 1,
    message: "I’ll inspect the project first.",
    expectedPlanVersion: 0,
    plan: [
      { id: "inspect", title: "Inspect project", status: "in_progress" },
      {
        id: "verify",
        title: "Verify the requested outcome",
        status: "pending",
      },
    ],
  };
  assert.throws(() => bridge.progress(id, "builder", update), /role/);
  assert.throws(
    () => bridge.progress(id, "manager", { ...update, sequence: 2 }),
    /order/,
  );
  bridge.progress(id, "manager", update);
  store.put(task); // Coordinator still holds its older task object.
  assert.equal(store.workPlan(task.id)?.version, 1);
  assert.equal(store.get(task.id).state, "PLANNING");
  assert.equal(store.actionEvidence(task.id).length, 0);
  assert.equal(store.hasWorkspaceGrant(task), false);
  assert.deepEqual(bridge.progress(id, "manager", update), {
    accepted: true,
    duplicate: true,
  });
  assert.throws(
    () => bridge.progress(id, "manager", { ...update, message: "different" }),
    /different/,
  );
  assert.throws(
    () => bridge.progress(id, "manager", { ...update, sequence: 2 }),
    /changed/,
  );
  assert.equal(
    store.events(task.id).filter((e) => e.kind === "ASSISTANT_PROGRESS").length,
    1,
  );
  store.close();
  store = new Store(db);
  bridge = new BrowserBridge(store);
  assert.equal(
    store.workPlan(task.id)?.steps[1].title,
    "Verify the requested outcome",
  );
  assert.equal(bridge.get(id, "manager").progress.nextSequence, 2);
  store.state(task.id, "PAUSED");
  assert.throws(
    () => bridge.progress(id, "manager", { sequence: 2, message: "late" }),
    /paused/,
  );
  task.revision = 1;
  store.put(task);
  assert.equal(store.workPlan(task.id), null);
  assert.throws(
    () => bridge.progress(id, "manager", { sequence: 2, message: "late" }),
    /superseded/,
  );
  assert.throws(
    () =>
      bridge.answer(id, "manager", {
        summary: "old",
        builderTask: "old",
        acceptance: ["old"],
      }),
    /superseded/,
  );
  store.close();
});

test("milestone plans reject duplicate IDs, multiple active steps and executable extras", () => {
  const step = { id: "a", title: "Verify", status: "in_progress" };
  assert.equal(workStepsSchema.safeParse([step, step]).success, false);
  assert.equal(
    workStepsSchema.safeParse([step, { ...step, id: "b" }]).success,
    false,
  );
  assert.equal(
    workStepsSchema.safeParse([{ ...step, approved: true }]).success,
    false,
  );
});
