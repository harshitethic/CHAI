import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { Store } from "../src/core/store";
import { Engine } from "../src/core/engine";
import { Gateway } from "../src/core/gateway";
import { BrowserBridge } from "../src/core/browser-bridge";
import { requestSchema } from "../src/core/contracts";
function setup() {
  const base = mkdtempSync(join(tmpdir(), "chai-capabilities-")),
    root = join(base, "workspace");
  mkdirSync(root);
  const store = new Store(join(base, "db.sqlite")),
    gateway = new Gateway(resolve("src/core/files.py"));
  return { base, root, store, gateway, engine: new Engine(store, gateway) };
}
test("one workspace grant creates a nested project and searches without escaping", async () => {
  const s = setup();
  try {
    const id = await s.engine.create(
      "Create project",
      s.root,
      "assisted",
      "",
      JSON.stringify({
        summary: "Create nested project",
        actions: [
          { tool: "mkdir", path: "app" },
          { tool: "mkdir", path: "app/src" },
          {
            tool: "write",
            path: "app/src/main.py",
            content: "print('needle')\n",
          },
          { tool: "search", path: ".", query: "needle" },
        ],
      }),
      "workspace",
    );
    await s.engine.idle();
    assert.equal(s.store.get(id).state, "DONE", s.store.get(id).error ?? "");
    assert.equal(
      readFileSync(join(s.root, "app/src/main.py"), "utf8"),
      "print('needle')\n",
    );
    writeFileSync(join(s.root, ".env"), "needle secret fixture");
    symlinkSync(s.base, join(s.root, "escape"));
    const output = (await s.gateway.file(s.root, "search", ".", {
      query: "needle",
    })) as unknown as { matches: { path: string }[] };
    assert.deepEqual(
      output.matches.map((x) => x.path),
      ["app/src/main.py"],
    );
    await assert.rejects(s.gateway.file(s.root, "mkdir", "escape/illegal"));
    await assert.rejects(
      s.gateway.file(s.root, "search", "../", { query: "needle" }),
    );
  } finally {
    s.engine.stop();
    s.store.close();
    rmSync(s.base, { recursive: true, force: true });
  }
});
test("workspace permission alone cannot authorize model browser or desktop actions", async () => {
  const s = setup();
  let called = 0;
  s.gateway.computer = async () => {
    called++;
    return {};
  };
  try {
    for (const tool of ["browser", "desktop"]) {
      const id = await s.engine.create(
        "Attempt unsupported capability",
        s.root,
        "assisted",
        "",
        JSON.stringify({
          summary: "Observe",
          actions: [{ tool, operation: "observe" }],
        }),
        "workspace",
      );
      await s.engine.idle();
      assert.equal(s.store.get(id).state, "FAILED");
    }
    assert.equal(called, 0);
    const id = await s.engine.create(
      "Authorized browser",
      s.root,
      "assisted",
      "",
      JSON.stringify({
        summary: "Observe",
        actions: [{ tool: "browser", operation: "observe" }],
      }),
      "workspace",
      { browser: true, origins: [] },
    );
    await s.engine.idle();
    assert.equal(s.store.get(id).state, "DONE");
    assert.equal(called, 1);
    assert.throws(() =>
      requestSchema.parse({
        op: "create",
        goal: "x",
        mode: "browser",
        model: "",
        capabilities: { browser: true, origins: ["http://localhost"] },
      }),
    );
  } finally {
    s.engine.stop();
    s.store.close();
    rmSync(s.base, { recursive: true, force: true });
  }
});
test("MCP images belong to the assigned active task and cannot cross roles or tasks", () => {
  const s = setup();
  const bridge = new BrowserBridge(s.store);
  try {
    const task = s.store.create("Observe", s.root, "browser", ""),
      other = s.store.create("Other", s.root, "browser", "");
    const own = s.store.image(task.id, Buffer.from("fixture image")),
      foreign = s.store.image(other.id, Buffer.from("foreign image"));
    const jobId = crypto.randomUUID();
    s.store.db.prepare("INSERT INTO browser_jobs VALUES(?,?,?,?,?,?,?,?)").run(
      jobId,
      "fixture",
      task.id,
      "builder",
      JSON.stringify({
        phase: "proposal",
        system: "fixture",
        schema: {},
        input: JSON.stringify({
          evidence: {
            outputs: [
              { output: { imageId: own } },
              { output: { imageId: foreign } },
            ],
          },
        }),
      }),
      null,
      "WAITING",
      new Date().toISOString(),
    );
    const images = bridge.images(jobId, "builder");
    assert.equal(images.length, 1);
    assert.equal(
      Buffer.from(images[0].data, "base64").toString(),
      "fixture image",
    );
    assert.throws(() => bridge.images(jobId, "reviewer"));
    s.store.state(task.id, "PAUSED");
    assert.throws(() => bridge.images(jobId, "builder"));
  } finally {
    s.store.close();
    rmSync(s.base, { recursive: true, force: true });
  }
});

test("multi-round evidence retains fresh files once and supports bounded computer context", async () => {
  const s = setup();
  try {
    const content = "verified source line\n".repeat(1800);
    const id = await s.engine.create(
      "Large page",
      s.root,
      "assisted",
      "",
      JSON.stringify({
        summary: "Write page",
        actions: [{ tool: "write", path: "page.txt", content }],
      }),
      "workspace",
    );
    await s.engine.idle();
    const { Coordinator } = await import("../src/core/agents");
    let called = false;
    const coordinator = new Coordinator(s.store, s.gateway, {
      name: "test",
      async send() {
        called = true;
        return {
          summary: "bounded",
          builderTask: "Observe",
          acceptance: ["Observed"],
        };
      },
    });
    const task = s.store.get(id);
    const evidence = await coordinator.evidence(
      task,
      new AbortController().signal,
    );
    assert.equal(evidence.files[0].content, content);
    assert(!("content" in evidence.outputs[0].action!));
    assert(JSON.stringify(evidence).length < content.length + 5000);
    const { z } = await import("zod");
    await coordinator.call(
      task,
      "manager",
      "assignment",
      "",
      { evidence },
      z.object({
        summary: z.string(),
        builderTask: z.string(),
        acceptance: z.array(z.string()),
      }),
      new AbortController().signal,
    );
    assert(called);
    writeFileSync(join(s.root, "page.txt"), "unexpected change");
    await assert.rejects(
      coordinator.evidence(task, new AbortController().signal),
      /Evidence changed/,
    );
  } finally {
    s.engine.stop();
    s.store.close();
    rmSync(s.base, { recursive: true, force: true });
  }
});
