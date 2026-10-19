/** Opt-in integration test. Requires a real installed Ollama model; no fixture fallback. */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Store } from "../src/core/store";
import { Gateway } from "../src/core/gateway";
import { Engine } from "../src/core/engine";

const model = process.env.CHAI_TEST_MODEL;
if (!model)
  throw Error("Set CHAI_TEST_MODEL to an actual installed Ollama model.");
const base = mkdtempSync(join(tmpdir(), "chai-live-agents-"));
const root = join(base, "workspace");
mkdirSync(root);
const store = new Store(join(base, "state.sqlite"));
const engine = new Engine(store, new Gateway(resolve("src/core/files.py")));
const goal =
  "Create brief.md with the Markdown heading '# Mission', one sentence explaining photosynthesis, and exactly three bullet points about plants. Do not create any other files. Verify the file content.";
const id = await engine.create(goal, root, "local", model);
try {
  for (let round = 1; round <= 3; round++) {
    await engine.idle();
    const t = store.get(id);
    console.log(
      "Real model state:",
      t.state,
      "round",
      t.agent?.round,
      "calls",
      t.agent?.calls,
      t.error ?? "",
    );
    if (t.state === "DONE") break;
    assert.equal(
      t.state,
      "WAITING_APPROVAL",
      t.error ?? "Expected a bounded tool plan",
    );
    const pending = t.plan!.actions.slice(t.cursor);
    assert(pending.length > 0);
    for (const action of pending) {
      assert(
        action.tool !== "command",
        "Live test never approves process execution",
      );
      if (action.tool === "list") assert.equal(action.path, ".");
      else
        assert.equal(
          action.path,
          "brief.md",
          "Live test approves only its disposable file",
        );
    }
    console.log(
      "Approving only disposable test-file actions:",
      pending.map((a) => a.tool).join(", "),
    );
    engine.approve(id, true);
  }
  await engine.idle();
  const result = store.get(id);
  assert.equal(
    result.state,
    "DONE",
    result.error ?? "Live task did not complete",
  );
  const content = readFileSync(join(root, "brief.md"), "utf8");
  assert.match(content, /^# Mission\s*$/m);
  assert.equal(
    content.split("\n").filter((line) => /^[-*] /.test(line)).length,
    3,
  );
  assert.match(content, /photosynthesis/i);
  const calls = store.db
    .prepare("SELECT role,status FROM agent_calls ORDER BY rowid")
    .all();
  assert(calls.some((c) => c.role === "reviewer" && c.status === "SUCCEEDED"));
  assert.equal(result.agent?.phase, "complete");
  mkdirSync(".qa", { recursive: true });
  writeFileSync(
    ".qa/live-agents.json",
    JSON.stringify(
      { model, root, task: result, content, calls, events: store.events() },
      null,
      2,
    ),
  );
  console.log(
    "PASS: actual local Manager → Builder → file tools → independent Reviewer → Manager report.",
  );
  console.log(
    JSON.stringify(
      {
        root,
        model,
        round: result.agent?.round,
        calls: result.agent?.calls,
        report: result.agent?.report,
        content,
      },
      null,
      2,
    ),
  );
} finally {
  engine.stop();
  await engine.idle();
  store.close();
}
