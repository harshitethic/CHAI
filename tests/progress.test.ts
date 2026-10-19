import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Task, Event } from "../src/core/contracts";
import { Store } from "../src/core/store";
import { progressView, activityItem } from "../src/renderer/progress";
function task(): Task {
  return {
    id: "task",
    goal: "Repair a check",
    root: "/fixture",
    mode: "browser",
    model: "ChatGPT",
    state: "RUNNING",
    cursor: 1,
    approved: true,
    created: "2026-10-19T00:00:00Z",
    error: null,
    plan: {
      summary: "Check then repair",
      actions: [
        {
          tool: "run",
          program: "python3",
          args: ["check.py"],
          files: ["check.py"],
          timeoutSeconds: 20,
        },
        { tool: "write", path: "check.py", content: "print('ok')" },
      ],
    },
  };
}
test("progress preserves a failed check while identifying the next real action", () => {
  const t = task();
  const p = progressView(t, [
    { idx: 0, state: "SUCCEEDED", exitCode: 1, termination: null },
  ]);
  assert.equal(p.completed, 1);
  assert.equal(p.total, 2);
  assert.equal(p.steps[0].checkFailed, true);
  assert.equal(p.steps[0].detail, "Finished · check failed");
  assert.equal(p.steps[1].state, "running");
  assert.equal(p.now, "Write check.py");
});
test("finished actions do not imply completed review, and paused/failed work is not shown as running", () => {
  const t = task();
  t.cursor = 2;
  t.state = "VALIDATING";
  assert.equal(progressView(t).now, "Reviewer is checking the evidence");
  t.cursor = 1;
  t.state = "PAUSED";
  assert.equal(progressView(t).steps[1].state, "waiting");
  assert.equal(progressView(t).active, false);
  t.state = "FAILED";
  assert.equal(progressView(t).steps[1].state, "error");
  assert.equal(progressView(t).active, false);
  t.state = "CANCELED";
  assert.equal(progressView(t).steps[1].detail, "Not run");
  t.state = "DONE";
  t.cursor = 2;
  assert.equal(progressView(t).now, "Task completed");
  t.state = "PLANNING";
  t.plan = null;
  t.cursor = 0;
  assert.equal(progressView(t).total, 0);
});
test("activity distinguishes nonzero/terminated checks and renders malformed evidence without crashing", () => {
  const event: Event = {
    id: 1,
    taskId: "task",
    role: "builder",
    kind: "TOOL_EXECUTED",
    detail: '{"exitCode":1,"stdout":""}',
    created: "2026-10-19T00:00:00Z",
  };
  assert.equal(activityItem(event)?.title, "Check failed");
  event.detail = '{"exitCode":0,"termination":"timeout"}';
  assert.equal(activityItem(event)?.title, "Check failed");
  event.detail = '{"exitCode":0,"stdout":"PASS"}';
  assert.equal(activityItem(event)?.title, "Check passed");
  event.kind = "MODEL_RESPONSE";
  event.detail = '{"summary":"Repaired only the selected file"}';
  assert.equal(activityItem(event)?.summary, "Repaired only the selected file");
  event.kind = "TOOL_STARTED";
  event.detail = "malformed";
  assert.equal(activityItem(event)?.title, "Action started");
});
test("selected task events survive a noisy global feed; progress metadata omits source and output", () => {
  const dir = mkdtempSync(join(tmpdir(), "chai-progress-"));
  const store = new Store(join(dir, "state.sqlite"));
  try {
    const a = store.create("A", "/fixture", "recipe", ""),
      b = store.create("B", "/fixture", "recipe", "");
    store.event(a.id, "builder", "TOOL_EXECUTED", "A evidence");
    for (let n = 0; n < 510; n++)
      store.event(b.id, "builder", "TOOL_EXECUTED", "B evidence");
    assert.equal(
      store.events().some((e) => e.taskId === a.id),
      false,
    );
    assert(store.events(a.id).every((e) => e.taskId === a.id));
    assert.equal(store.events(a.id).length, 2);
    store.db
      .prepare("INSERT INTO effects VALUES(?,?,?,?,?,?,?)")
      .run(
        a.id + ":0",
        a.id,
        0,
        "SUCCEEDED",
        "source before",
        "source after",
        JSON.stringify({
          exitCode: 1,
          termination: null,
          stdout: "private output",
        }),
      );
    assert.deepEqual(store.actionEvidence(a.id), [
      { idx: 0, state: "SUCCEEDED", exitCode: 1, termination: null },
    ]);
    assert.deepEqual(store.actionEvidence(b.id), []);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
