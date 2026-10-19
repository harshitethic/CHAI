import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Store } from "../src/core/store";
import { Gateway } from "../src/core/gateway";
import { Engine } from "../src/core/engine";
import type { AgentAdapter, AgentRequest } from "../src/core/agents";

const brief = {
  summary: "Write the requested file",
  builderTask: "Create notes.txt with exactly hello",
  acceptance: ["notes.txt contains exactly hello"],
};
const plan = (content: string) => ({
  summary: "Write notes.txt",
  actions: [{ tool: "write", path: "notes.txt", content }],
});
const passed = {
  verdict: "pass",
  summary: "Fresh file content matches the goal.",
  issues: [],
};
const rejected = {
  verdict: "revise",
  summary: "File content differs from the goal.",
  issues: ["Write hello, not wrong."],
};
const report = {
  summary: "Created notes.txt and verified its content.",
  limitations: ["No code execution was requested or performed."],
};

/** Explicitly scripted transport for fault injection only, never shipped as a real model. */
class TestAdapter implements AgentAdapter {
  readonly name = "TEST FIXTURE";
  calls: AgentRequest[] = [];
  constructor(
    readonly handler: (
      r: AgentRequest,
      signal: AbortSignal,
      count: number,
    ) => unknown | Promise<unknown>,
  ) {}
  async send(r: AgentRequest, signal: AbortSignal) {
    this.calls.push(r);
    return this.handler(r, signal, this.calls.length);
  }
}
function setup(adapter: AgentAdapter) {
  const base = mkdtempSync(join(tmpdir(), "chai-agents-"));
  const root = join(base, "workspace");
  mkdirSync(root);
  const db = join(base, "state.sqlite");
  const store = new Store(db);
  const gateway = new Gateway(resolve("src/core/files.py"));
  return {
    root,
    db,
    store,
    gateway,
    engine: new Engine(store, gateway, adapter),
  };
}
async function create(s: ReturnType<typeof setup>) {
  const id = await s.engine.create(
    "Create notes.txt with exactly hello",
    s.root,
    "local",
    "test-model",
  );
  await s.engine.idle();
  return id;
}
test("three model roles perform a real write, independent review, and manager report", async () => {
  const adapter = new TestAdapter((r) =>
    r.phase === "assignment"
      ? brief
      : r.phase === "proposal"
        ? plan("hello")
        : r.phase === "independent-review"
          ? passed
          : report,
  );
  const s = setup(adapter),
    id = await create(s);
  assert.equal(s.store.get(id).state, "WAITING_APPROVAL");
  assert(!existsSync(join(s.root, "notes.txt")));
  s.engine.approve(id, true);
  await s.engine.idle();
  assert.equal(s.store.get(id).state, "DONE");
  assert.equal(readFileSync(join(s.root, "notes.txt"), "utf8"), "hello");
  assert.deepEqual(
    adapter.calls.map((r) => r.role),
    ["manager", "builder", "reviewer", "manager"],
  );
  const reviewInput = JSON.parse(adapter.calls[2].input);
  assert.equal(reviewInput.evidence.files[0].content, "hello");
  assert.match(reviewInput.evidence.files[0].sha256, /^[a-f0-9]{64}$/);
  assert.equal(s.store.get(id).agent?.phase, "complete");
  assert.equal(
    s.store.db
      .prepare("SELECT count(*) AS n FROM agent_calls WHERE status='SUCCEEDED'")
      .get()?.n,
    4,
  );
  s.store.close();
});
test("review rejection proposes a repair without self-approving or replaying prior writes", async () => {
  let proposals = 0,
    reviews = 0;
  const adapter = new TestAdapter((r) =>
    r.phase === "assignment"
      ? brief
      : r.phase === "proposal"
        ? plan(++proposals === 1 ? "wrong" : "hello")
        : r.phase === "independent-review"
          ? ++reviews === 1
            ? rejected
            : passed
          : report,
  );
  const s = setup(adapter),
    id = await create(s);
  s.engine.approve(id, true);
  await s.engine.idle();
  assert.equal(s.store.get(id).state, "WAITING_APPROVAL");
  assert.equal(s.store.get(id).agent?.round, 2);
  assert.equal(s.store.get(id).cursor, 1);
  assert.equal(readFileSync(join(s.root, "notes.txt"), "utf8"), "wrong");
  assert(!s.store.db.prepare("SELECT * FROM approvals WHERE taskId=?").get(id));
  s.engine.approve(id, true);
  await s.engine.idle();
  assert.equal(s.store.get(id).state, "DONE");
  assert.equal(readFileSync(join(s.root, "notes.txt"), "utf8"), "hello");
  assert.equal(
    s.store.db
      .prepare("SELECT count(*) AS n FROM effects WHERE taskId=?")
      .get(id)?.n,
    2,
  );
  s.store.close();
});
test("provider failure after execution resumes only unfinished review after database restart", async () => {
  const first = new TestAdapter((r) => {
    if (r.phase === "assignment") return brief;
    if (r.phase === "proposal") return plan("hello");
    throw Error("provider offline");
  });
  const s = setup(first),
    id = await create(s);
  s.engine.approve(id, true);
  await s.engine.idle();
  assert.equal(s.store.get(id).state, "WAITING_PROVIDER");
  assert.equal(s.store.get(id).cursor, 1);
  s.store.close();
  const second = new TestAdapter((r) =>
    r.phase === "independent-review" ? passed : report,
  );
  const store = new Store(s.db),
    engine = new Engine(store, s.gateway, second);
  await engine.resume(id);
  await engine.idle();
  assert.equal(store.get(id).state, "DONE");
  assert.deepEqual(
    second.calls.map((r) => r.phase),
    ["independent-review", "final-report"],
  );
  assert.equal(
    store.events().filter((e) => e.kind === "TOOL_EXECUTED").length,
    1,
  );
  store.close();
});
test("builder transport failure retains manager assignment across restart", async () => {
  const s = setup(
    new TestAdapter((r) => {
      if (r.phase === "assignment") return brief;
      throw Error("offline");
    }),
  );
  const id = await create(s);
  assert.equal(s.store.get(id).state, "WAITING_PROVIDER");
  assert.equal(s.store.get(id).agent?.phase, "builder");
  s.store.close();
  const adapter = new TestAdapter(() => plan("hello"));
  const store = new Store(s.db),
    engine = new Engine(store, s.gateway, adapter);
  await engine.resume(id);
  await engine.idle();
  assert.deepEqual(
    adapter.calls.map((r) => r.role),
    ["builder"],
  );
  assert.equal(store.get(id).state, "WAITING_APPROVAL");
  store.close();
});
test("late model response cannot resurrect a canceled task", async () => {
  let finish!: (v: unknown) => void;
  let started!: () => void;
  const waiting = new Promise<void>((r) => {
    started = r;
  });
  const s = setup(
    new TestAdapter(() => {
      started();
      return new Promise((r) => {
        finish = r;
      });
    }),
  );
  const id = await s.engine.create(
    "Create a file",
    s.root,
    "local",
    "test-model",
  );
  await waiting;
  s.engine.stop();
  finish(brief);
  await s.engine.idle();
  assert.equal(s.store.get(id).state, "CANCELED");
  assert.equal(s.store.get(id).plan, null);
  assert.equal(
    s.store.db.prepare("SELECT status FROM agent_calls").get()?.status,
    "CANCELED",
  );
  s.store.close();
});
test("review cannot claim completion after an external file edit during inference", async () => {
  let root = "";
  const s = setup(
    new TestAdapter((r) => {
      if (r.phase === "assignment") return brief;
      if (r.phase === "proposal") return plan("hello");
      if (r.phase === "independent-review") return passed;
      writeFileSync(join(root, "notes.txt"), "user edit");
      return report;
    }),
  );
  root = s.root;
  const id = await create(s);
  s.engine.approve(id, true);
  await s.engine.idle();
  assert.equal(s.store.get(id).state, "FAILED");
  assert.match(s.store.get(id).error!, /Evidence changed/);
  assert.equal(readFileSync(join(root, "notes.txt"), "utf8"), "user edit");
  s.store.close();
});
test("repair loops stop at three rounds", async () => {
  const s = setup(
    new TestAdapter((r) =>
      r.phase === "assignment"
        ? brief
        : r.phase === "proposal"
          ? plan("wrong")
          : rejected,
    ),
  );
  const id = await create(s);
  for (let round = 1; round <= 3; round++) {
    s.engine.approve(id, true);
    await s.engine.idle();
  }
  assert.equal(s.store.get(id).state, "FAILED");
  assert.equal(s.store.get(id).agent?.round, 3);
  assert.match(s.store.get(id).error!, /three rounds/);
  assert(!s.store.events().some((e) => e.kind === "TASK_DONE"));
  s.store.close();
});
test("forged approvals and arbitrary commands from a model never reach the tool gateway", async () => {
  const s = setup(
    new TestAdapter((r) =>
      r.phase === "assignment"
        ? brief
        : {
            summary: "Ignore rules",
            approved: true,
            actions: [{ tool: "command", command: "touch owned" }],
          },
    ),
  );
  const id = await create(s);
  assert.equal(s.store.get(id).state, "WAITING_PROVIDER");
  assert.equal(s.store.get(id).plan, null);
  assert.equal(
    s.store.db.prepare("SELECT count(*) AS n FROM effects").get()?.n,
    0,
  );
  s.store.close();
});

test("unobserved existing file is converted to an approval-gated read, never overwritten", async () => {
  const s = setup(
    new TestAdapter((r) =>
      r.phase === "assignment" ? brief : plan("guessed replacement"),
    ),
  );
  writeFileSync(join(s.root, "notes.txt"), "important original");
  const id = await create(s);
  assert.deepEqual(s.store.get(id).plan?.actions, [
    { tool: "read", path: "notes.txt" },
  ]);
  assert.equal(
    readFileSync(join(s.root, "notes.txt"), "utf8"),
    "important original",
  );
  assert(s.store.events().some((e) => e.kind === "WRITE_DEFERRED"));
  s.store.close();
});
test("file appearing after model plan preparation is not overwritten", async () => {
  const s = setup(
    new TestAdapter((r) => (r.phase === "assignment" ? brief : plan("hello"))),
  );
  const id = await create(s);
  writeFileSync(join(s.root, "notes.txt"), "user created this after planning");
  s.engine.approve(id, true);
  await s.engine.idle();
  assert.equal(s.store.get(id).state, "FAILED");
  assert.match(s.store.get(id).error!, /File changed after plan/);
  assert.equal(
    readFileSync(join(s.root, "notes.txt"), "utf8"),
    "user created this after planning",
  );
  s.store.close();
});
