import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  symlinkSync,
  linkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { Gateway } from "../src/core/gateway";
import { Engine } from "../src/core/engine";
import { Store } from "../src/core/store";
import { actionSchema } from "../src/core/contracts";
import type { RunAction } from "../src/core/sandbox";
import type { AgentAdapter } from "../src/core/agents";

function setup() {
  const base = mkdtempSync(join(tmpdir(), "chai-run-test-"));
  const root = join(base, "workspace");
  mkdirSync(root);
  const gateway = new Gateway(resolve("src/core/files.py"));
  return { base, root, gateway };
}
const run = (
  program: RunAction["program"],
  args: string[],
  files: string[] = [],
  timeoutSeconds = 5,
): RunAction => ({ tool: "run", program, args, files, timeoutSeconds });
async function execute(
  s: ReturnType<typeof setup>,
  action: RunAction,
  signal = new AbortController().signal,
) {
  await s.gateway.prepareRuns(s.root, [action], signal);
  return s.gateway.sandbox(s.root, action, signal);
}

test("sandbox executes real Python, Node and Bash using only staged files", async () => {
  const s = setup();
  try {
    writeFileSync(join(s.root, "check.py"), "print(6 * 7)\n");
    const result = await execute(s, run("python3", ["check.py"], ["check.py"]));
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout.trim(), "42");
    assert.match(result.files[0].sha256, /^[a-f0-9]{64}$/);
    assert.equal(
      (
        await execute(s, run("node", ["-e", "console.log(21 * 2)"]))
      ).stdout.trim(),
      "42",
    );
    assert.equal(
      (await execute(s, run("bash", ["-c", "printf 42"]))).stdout,
      "42",
    );
  } finally {
    s.gateway.stop();
    rmSync(s.base, { recursive: true, force: true });
  }
});

test("sandbox cannot see unselected files, host paths, environment or host network", async () => {
  const s = setup();
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const fakeSecretPath = join(s.base, "private-fixture.txt");
  writeFileSync(fakeSecretPath, "test-fixture-only");
  writeFileSync(join(s.root, "unselected.txt"), "hidden fixture");
  const script = [
    "import os, socket",
    "assert not os.path.exists(" + JSON.stringify(fakeSecretPath) + ")",
    "assert not os.path.exists('/workspace/unselected.txt')",
    "assert not os.path.exists('/home/kali')",
    "assert 'DISPLAY' not in os.environ and 'XAUTHORITY' not in os.environ",
    "s=socket.socket(); s.settimeout(0.3)",
    "try:",
    " s.connect(('127.0.0.1', " + address.port + "))",
    " raise AssertionError('host network exposed')",
    "except OSError: pass",
    "open('/tmp/result.txt','w').write('ephemeral')",
    "print('isolated')",
  ].join("\n");
  try {
    const result = await execute(s, run("python3", ["-c", script]));
    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(result.stdout.trim(), "isolated");
  } finally {
    server.close();
    s.gateway.stop();
    rmSync(s.base, { recursive: true, force: true });
  }
});

test("sandbox rejects secrets, symlinks, hardlinks, traversal and changed inputs", async () => {
  const s = setup();
  try {
    writeFileSync(join(s.root, "safe.py"), "print('safe')");
    writeFileSync(join(s.root, ".env"), "fixture only");
    symlinkSync("safe.py", join(s.root, "link.py"));
    linkSync(join(s.root, "safe.py"), join(s.root, "hard.py"));
    for (const file of [".env", "link.py", "hard.py", "../private.txt"])
      await assert.rejects(
        execute(s, run("python3", ["-c", "print(1)"], [file])),
      );
    // Independent regular input for hash guard.
    writeFileSync(join(s.root, "input.py"), "print(1)");
    const action = run("python3", ["input.py"], ["input.py"]);
    await s.gateway.prepareRuns(s.root, [action]);
    writeFileSync(join(s.root, "input.py"), "print(2)");
    await assert.rejects(
      s.gateway.sandbox(s.root, action, new AbortController().signal),
      /changed since approval/,
    );
    assert.throws(() => actionSchema.parse(run("python3", ["x\0y"])));
    await assert.rejects(
      s.gateway.sandbox(
        s.root,
        run("python3", ["-c", "print(1)"]),
        new AbortController().signal,
      ),
      /hashes are missing/,
    );
  } finally {
    s.gateway.stop();
    rmSync(s.base, { recursive: true, force: true });
  }
});

test("sandbox keeps workspace read-only and returns nonzero exit evidence", async () => {
  const s = setup();
  try {
    writeFileSync(join(s.root, "input.txt"), "original");
    const result = await execute(
      s,
      run(
        "python3",
        ["-c", "open('input.txt','w').write('changed')"],
        ["input.txt"],
      ),
    );
    assert.notEqual(result.exitCode, 0);
    assert.match(result.stderr, /Read-only file system/);
    assert.equal(readFileSync(join(s.root, "input.txt"), "utf8"), "original");
    const failure = await execute(
      s,
      run("bash", ["-c", "echo problem >&2; exit 7"]),
    );
    assert.equal(failure.exitCode, 7);
    assert.equal(failure.stderr.trim(), "problem");
  } finally {
    s.gateway.stop();
    rmSync(s.base, { recursive: true, force: true });
  }
});

test("sandbox bounds output and time, and abort terminates execution", async () => {
  const s = setup();
  try {
    const loud = await execute(s, run("python3", ["-c", "print('x'*100000)"]));
    assert.equal(loud.termination, "output-limit");
    assert(loud.stdout.length <= 8000);
    const slow = await execute(
      s,
      run("python3", ["-c", "import time; time.sleep(30)"], [], 1),
    );
    assert.equal(slow.termination, "timeout");
    const ctrl = new AbortController();
    const promise = execute(s, run("bash", ["-c", "sleep 30"]), ctrl.signal);
    const timer = setTimeout(() => ctrl.abort(), 200);
    await assert.rejects(promise, /Canceled|Abort/);
    clearTimeout(timer);
    assert.equal(s.gateway.children.size, 0);
  } finally {
    s.gateway.stop();
    rmSync(s.base, { recursive: true, force: true });
  }
});

test("workspace authorization completes a real failed-test repair without per-round approvals", async () => {
  const s = setup();
  const store = new Store(join(s.base, "state.sqlite"));
  let proposals = 0,
    reviews = 0;
  const adapter: AgentAdapter = {
    name: "EXPLICIT TEST FIXTURE",
    async send(r) {
      if (r.phase === "assignment")
        return {
          summary: "Implement and test",
          builderTask: "Write check.py and execute it",
          acceptance: ["check.py exits zero and prints 42"],
        };
      if (r.phase === "proposal")
        return {
          summary: "Write and test",
          actions: [
            {
              tool: "write",
              path: "check.py",
              content:
                ++proposals === 1
                  ? "assert False, 'repair me'\n"
                  : "print(42)\n",
            },
            run("python3", ["check.py"], ["check.py"]),
          ],
        };
      if (r.phase === "independent-review") {
        const evidence = JSON.parse(r.input)
          .evidence.outputs.filter(
            (v: { action: { tool: string } }) => v.action.tool === "run",
          )
          .at(-1).output;
        if (++reviews === 1) {
          assert.notEqual(evidence.exitCode, 0);
          return {
            verdict: "revise",
            summary: "Assertion failed",
            issues: ["Repair check.py and rerun"],
          };
        }
        assert.equal(evidence.exitCode, 0);
        assert.equal(evidence.stdout.trim(), "42");
        return {
          verdict: "pass",
          summary: "Verified real execution",
          issues: [],
        };
      }
      return { summary: "Fixed and tested", limitations: [] };
    },
  };
  const engine = new Engine(store, s.gateway, adapter);
  try {
    const id = await engine.create(
      "Create and run check.py printing 42",
      s.root,
      "browser",
      "fixture",
      undefined,
      "workspace",
    );
    await engine.idle();
    const task = store.get(id);
    assert.equal(task.state, "DONE", task.error ?? "");
    assert.equal(task.agent?.round, 2);
    assert.equal(proposals, 2);
    assert.equal(reviews, 2);
    assert.equal(readFileSync(join(s.root, "check.py"), "utf8"), "print(42)\n");
    assert.equal(
      store.events().filter((e) => e.kind === "WORKSPACE_AUTHORIZED").length,
      1,
    );
    assert.equal(
      store.events().filter((e) => e.kind === "WORKSPACE_GRANT_USED").length,
      2,
    );
    assert.equal(
      store
        .events()
        .filter(
          (e) =>
            e.kind === "PLAN_APPROVED" && e.detail.includes("User approved"),
        ).length,
      0,
    );
  } finally {
    engine.stop();
    store.close();
    rmSync(s.base, { recursive: true, force: true });
  }
});

test("revocation pauses execution and leaves later rounds requiring approval", async () => {
  const s = setup(),
    store = new Store(join(s.base, "state.sqlite"));
  const engine = new Engine(store, s.gateway);
  try {
    const id = await engine.create(
      "wait",
      s.root,
      "assisted",
      "fixture",
      JSON.stringify({
        summary: "Wait",
        actions: [{ tool: "command", command: "wait", seconds: 5 }],
      }),
      "workspace",
    );
    engine.revoke(id);
    await engine.idle();
    assert.equal(store.get(id).state, "PAUSED");
    assert.equal(store.hasWorkspaceGrant(store.get(id)), false);
    await engine.resume(id);
    assert.equal(store.get(id).state, "WAITING_APPROVAL");
    const other = join(s.base, "other");
    mkdirSync(other);
    store.db
      .prepare("INSERT INTO task_grants VALUES(?,?,?)")
      .run(id, other, new Date().toISOString());
    assert.equal(store.hasWorkspaceGrant(store.get(id)), false);
  } finally {
    engine.stop();
    store.close();
    rmSync(s.base, { recursive: true, force: true });
  }
});

test("review mode still waits and a failed sandbox check cannot be marked DONE", async () => {
  const s = setup(),
    store = new Store(join(s.base, "state.sqlite")),
    engine = new Engine(store, s.gateway);
  try {
    const id = await engine.create(
      "run failing test",
      s.root,
      "assisted",
      "fixture",
      JSON.stringify({
        summary: "Fail",
        actions: [run("bash", ["-c", "exit 9"])],
      }),
    );
    await engine.idle();
    assert.equal(store.get(id).state, "WAITING_APPROVAL");
    engine.approve(id, true);
    await engine.idle();
    assert.equal(store.get(id).state, "FAILED");
    assert.match(store.get(id).error!, /Sandbox check failed/);
  } finally {
    engine.stop();
    store.close();
    rmSync(s.base, { recursive: true, force: true });
  }
});
