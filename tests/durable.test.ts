import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Store } from "../src/core/store";
import { Gateway } from "../src/core/gateway";
import { ProjectRuntime } from "../src/core/project";
import { actionSchema, taskLimits, type Action } from "../src/core/contracts";

async function until(check: () => boolean) {
  for (let i = 0; i < 150; i++) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.fail("Timed out waiting for durable receipt");
}
test("durable host session reconnects, receives input, reconciles effect and stops", async () => {
  const root = mkdtempSync(join(tmpdir(), "chai-durable-"));
  const projects = join(root, "projects");
  mkdirSync(projects);
  const store = new Store(join(root, "test.sqlite"));
  const gateway = new Gateway(resolve("src/core/files.py"));
  let runtime = new ProjectRuntime(store, gateway, projects);
  const task = store.create("Durable fixture", root, "assisted", "test");
  task.capabilities = {
    host: true,
    durable: true,
    browser: false,
    origins: [],
  };
  store.put(task);
  store.db
    .prepare("INSERT INTO host_grants VALUES(?,?,?)")
    .run(task.id, task.root, new Date().toISOString());
  const action = actionSchema.parse({
    tool: "terminal",
    operation: "start",
    target: "host",
    program: "python3",
    args: [
      "-u",
      "-c",
      "from pathlib import Path; import time; p=Path('launches'); p.write_text(p.read_text()+'x' if p.exists() else 'x'); print('READY',flush=True); print(input(),flush=True); time.sleep(120)",
    ],
    background: true,
    timeoutSeconds: 60,
  }) as Extract<Action, { tool: "terminal" }>;
  const signal = new AbortController().signal;
  try {
    const first = await runtime.execute(task, action, signal, task.id + ":0");
    await until(() => runtime.sessions(task.id)[0].output.includes("READY"));
    runtime.stop(true);
    runtime = new ProjectRuntime(store, gateway, projects);
    const recovered = await runtime.execute(
      task,
      action,
      signal,
      task.id + ":0",
    );
    assert.equal(recovered.id, first.id);
    assert.equal(readFileSync(join(root, "launches"), "utf8"), "x");
    await runtime.execute(
      task,
      actionSchema.parse({
        tool: "terminal",
        operation: "input",
        sessionId: first.id,
        input: "HELLO_RECONNECTED\n",
      }) as typeof action,
      signal,
    );
    await until(() =>
      runtime.sessions(task.id)[0].output.includes("HELLO_RECONNECTED"),
    );
    runtime.stopTask(task);
    await until(() => runtime.sessions(task.id)[0].state === "exited");
    assert.equal(runtime.sessions(task.id)[0].termination, "stopped");
    assert(existsSync(join(root, "terminal-workers", first.id, "status.json")));
    assert.deepEqual(
      taskLimits({
        ...task,
        autonomous: true,
        capabilities: { ...task.capabilities, budget: "extended" },
      }),
      { rounds: 50, calls: 250, actions: 600 },
    );
  } finally {
    runtime.stop();
    store.db.close();
  }
});

test("supervisor survives owner SIGKILL and reports exit from the original command", async () => {
  const { spawn } = await import("node:child_process");
  const { randomUUID } = await import("node:crypto");
  const { DurableTerminals } = await import("../src/core/durable-terminal");
  const directory = mkdtempSync(join(tmpdir(), "chai-owner-crash-"));
  const record = {
    id: randomUUID(),
    taskId: randomUUID(),
    program: "python3",
    args: [],
    cwd: directory,
    state: "running" as const,
    output: "",
    exitCode: null,
    termination: null,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    durable: true,
  };
  const module = resolve("src/core/durable-terminal.ts");
  const source = `import {DurableTerminals} from ${JSON.stringify(module)}; const runtime=new DurableTerminals(${JSON.stringify(directory)}); runtime.launch(${JSON.stringify(record)},['/usr/bin/python3','-u','-c','import time; print("ALIVE",flush=True); time.sleep(2); print("SURVIVED",flush=True)'],${JSON.stringify(directory)},{PATH:'/usr/bin:/bin'},30); setInterval(()=>{},1000);`;
  const owner = spawn(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", source],
    { stdio: "ignore" },
  );
  const runtime = new DurableTerminals(directory);
  try {
    await until(() => runtime.refresh({ ...record }).output.includes("ALIVE"));
    owner.kill("SIGKILL");
    await until(() => runtime.refresh({ ...record }).state === "exited");
    const final = runtime.refresh({ ...record });
    assert.equal(final.exitCode, 0);
    assert.match(final.output, /SURVIVED/);
  } finally {
    owner.kill("SIGKILL");
    if (runtime.refresh({ ...record }).state === "running")
      runtime.control(record.id, "stop");
  }
});

test("supervisor does not retain inherited descriptors", async () => {
  const { spawn } = await import("node:child_process");
  const { openSync, closeSync, writeFileSync, readdirSync, readlinkSync } =
    await import("node:fs");
  const directory = mkdtempSync(join(tmpdir(), "chai-worker-fds-"));
  const sentinel = join(directory, "must-not-inherit");
  writeFileSync(sentinel, "fixture");
  const fd = openSync(sentinel, "r");
  writeFileSync(
    join(directory, "config.json"),
    JSON.stringify({
      argv: ["/usr/bin/python3", "-u", "-c", "import time;time.sleep(30)"],
      cwd: directory,
      env: { PATH: "/usr/bin:/bin" },
      timeout: 30,
    }),
  );
  const worker = spawn(
    "/usr/bin/python3",
    [resolve("src/core/terminal-worker.py"), directory],
    { stdio: ["ignore", "ignore", "ignore", fd] },
  );
  try {
    await until(() => existsSync(join(directory, "status.json")));
    const descriptors = readdirSync(`/proc/${worker.pid}/fd`).flatMap(
      (name) => {
        try {
          return [readlinkSync(`/proc/${worker.pid}/fd/${name}`)];
        } catch {
          return [];
        }
      },
    );
    assert(!descriptors.includes(sentinel));
  } finally {
    closeSync(fd);
    worker.kill("SIGTERM");
  }
});
