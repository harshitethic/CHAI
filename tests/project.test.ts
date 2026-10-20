import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  symlinkSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { Store } from "../src/core/store";
import { Gateway } from "../src/core/gateway";
import { ProjectRuntime, projectFile, projectFiles } from "../src/core/project";
import { Connectors } from "../src/core/connectors";
import { actionSchema, type Action } from "../src/core/contracts";
import { Engine } from "../src/core/engine";

function fixture(inSettings = false) {
  const base = mkdtempSync(join(tmpdir(), "chai-project-"));
  const root = join(base, "source");
  mkdirSync(root);
  const projects = inSettings
    ? join(base, ".config", "chai-desktop", "projects")
    : join(base, "projects");
  mkdirSync(projects, { recursive: true });
  const store = new Store(join(base, "state.sqlite"));
  const gateway = new Gateway(resolve("src/core/files.py"));
  const project = new ProjectRuntime(store, gateway, projects);
  gateway.project = project;
  return { base, root, store, gateway, project };
}
const signal = () => new AbortController().signal;
const terminal = (fields: Record<string, unknown>) =>
  actionSchema.parse({
    tool: "terminal",
    operation: "start",
    ...fields,
  }) as Extract<Action, { tool: "terminal" }>;
async function task(f: ReturnType<typeof fixture>, network = false) {
  const t = f.store.create("Verify project", f.root, "assisted", "test");
  t.capabilities = { project: true, network, browser: true, origins: [] };
  f.store.put(t);
  await f.project.prepare(t);
  return t;
}
async function until(fn: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.fail("Timed out");
}

test("host commands require native consent, retain real output and stop after revocation", async () => {
  const f = fixture();
  const engine = new Engine(f.store, f.gateway);
  try {
    const caps = { host: true, browser: false, origins: [] };
    const forged = f.store.create("No grant", f.root, "assisted", "test");
    forged.capabilities = caps;
    f.store.put(forged);
    await assert.rejects(
      f.project.execute(
        forged,
        terminal({
          target: "host",
          program: "node",
          args: ["-e", "process.exit(0)"],
        }),
        signal(),
      ),
      /native task grant/,
    );
    f.project.consent = async () => false;
    await assert.rejects(
      engine.create(
        "Declined host",
        f.root,
        "assisted",
        "",
        undefined,
        "workspace",
        caps,
      ),
      /not authorized/,
    );
    f.project.consent = async () => true;
    const id = await engine.create(
      "Authorized host fixture",
      f.root,
      "assisted",
      "",
      undefined,
      "workspace",
      caps,
    );
    const t = f.store.get(id);
    const outside = join(f.base, "host-proof.txt");
    const result = await f.project.execute(
      t,
      terminal({
        target: "host",
        program: "node",
        cwd: f.base,
        args: [
          "-e",
          `require('fs').writeFileSync(${JSON.stringify(outside)},'host verified');console.log(process.cwd())`,
        ],
      }),
      signal(),
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.target, "host");
    assert.equal(readFileSync(outside, "utf8"), "host verified");
    assert.match(result.output, new RegExp(f.base));
    const live = await f.project.execute(
      t,
      terminal({
        target: "host",
        program: "node",
        args: ["-e", "setInterval(()=>{},1000)"],
        background: true,
      }),
      signal(),
    );
    engine.revoke(id);
    await until(
      () =>
        f.project.sessions(id).find((s) => s.id === live.id)?.state ===
        "exited",
    );
    await assert.rejects(
      f.project.execute(
        t,
        terminal({
          target: "host",
          program: "node",
          args: ["-e", "process.exit(0)"],
        }),
        signal(),
      ),
      /native task grant/,
    );
    await assert.rejects(
      f.project.execute(
        t,
        terminal({
          target: "host",
          operation: "input",
          sessionId: live.id,
          input: "ignored",
        }),
        signal(),
      ),
      /revoked/,
    );
  } finally {
    engine.stop();
    f.store.close();
  }
});

test("project copy preserves source and rejects secrets, links and escaping binary reads", async () => {
  const f = fixture();
  try {
    writeFileSync(join(f.root, "source.txt"), "original");
    writeFileSync(join(f.root, ".env"), "fixture-secret");
    symlinkSync("/etc/passwd", join(f.root, "outside"));
    mkdirSync(join(f.root, "node_modules"));
    writeFileSync(join(f.root, "node_modules", "ignored"), "dependency");
    const t = await task(f);
    assert.equal(readFileSync(join(t.root, "source.txt"), "utf8"), "original");
    assert(!existsSync(join(t.root, ".env")));
    assert(!existsSync(join(t.root, "outside")));
    assert(!existsSync(join(t.root, "node_modules")));
    symlinkSync("/etc", join(t.root, "escape"));
    await assert.rejects(projectFile(t.root, "escape/passwd"));
    await assert.rejects(projectFile(t.root, "../source/source.txt"));
    await assert.rejects(projectFile(f.root, ".env"));
    assert.deepEqual((await projectFiles(t.root)).files, ["source.txt"]);
    const read = (await f.project.repository(
      t,
      {
        tool: "repository",
        operation: "read",
        path: "source.txt",
        offset: 0,
        limit: 100,
      },
      signal(),
    )) as { hash: string };
    await f.project.repository(
      t,
      {
        tool: "repository",
        operation: "patch",
        path: "source.txt",
        before: "original",
        after: "changed",
        expectedHash: read.hash,
        offset: 0,
        limit: 100,
      },
      signal(),
    );
    assert.equal(readFileSync(join(f.root, "source.txt"), "utf8"), "original");
    assert.equal(readFileSync(join(t.root, "source.txt"), "utf8"), "changed");
    await assert.rejects(
      f.project.repository(
        t,
        {
          tool: "repository",
          operation: "patch",
          path: "source.txt",
          before: "changed",
          after: "bad",
          expectedHash: read.hash,
          offset: 0,
          limit: 100,
        },
        signal(),
      ),
      /conflict/,
    );
    f.project.consent = async () => false;
    await assert.rejects(
      f.project.repository(
        t,
        {
          tool: "repository",
          operation: "commit",
          message: "change",
          offset: 0,
          limit: 100,
        },
        signal(),
      ),
      /declined/,
    );
    f.project.consent = async () => true;
    const result = (await f.project.repository(
      t,
      {
        tool: "repository",
        operation: "commit",
        message: "change",
        offset: 0,
        limit: 100,
      },
      signal(),
    )) as { commit: string };
    assert.match(result.commit, /^[a-f0-9]{40}$/);
  } finally {
    f.project.stop();
    f.store.db.close();
  }
});

test("project history preserves source HEAD and staging while creating an independent checkout", async () => {
  const f = fixture();
  try {
    const git = (args: string[]) =>
      execFileSync(
        "/usr/bin/git",
        [
          "-c",
          "user.name=Fixture",
          "-c",
          "user.email=fixture@localhost",
          ...args,
        ],
        { cwd: f.root, encoding: "utf8" },
      ).trim();
    git(["init", "-b", "main"]);
    writeFileSync(join(f.root, "file.txt"), "base");
    git(["add", "."]);
    git(["commit", "-m", "base"]);
    const head = git(["rev-parse", "HEAD"]);
    writeFileSync(join(f.root, "file.txt"), "user staged");
    git(["add", "."]);
    const index = readFileSync(join(f.root, ".git", "index"));
    const t = await task(f);
    assert.equal(git(["rev-parse", "HEAD"]), head);
    assert.deepEqual(readFileSync(join(f.root, ".git", "index")), index);
    assert.equal(readFileSync(join(t.root, "file.txt"), "utf8"), "user staged");
    assert.equal(
      (await f.project.git(t.root, ["rev-parse", "HEAD^"])).trim(),
      head,
    );
  } finally {
    f.store.db.close();
  }
});

test("real isolated command, persistent input, stop, artifact hash and saved session recovery", async () => {
  const f = fixture();
  try {
    const t = await task(f);
    const r = await f.project.execute(
      t,
      terminal({
        program: "node",
        args: [
          "-e",
          "const fs=require('fs');fs.writeFileSync('result.txt','verified');console.log(fs.existsSync('/home/kali/.ssh'),fs.readdirSync('.git').length);process.exit(7)",
        ],
      }),
      signal(),
    );
    assert.equal(r.exitCode, 7);
    assert.match(r.output, /false 0/);
    const artifact = await f.project.register(t, "result.txt");
    assert.equal(artifact.bytes, 8);
    assert.equal(artifact.sha256.length, 64);
    const live = await f.project.execute(
      t,
      terminal({
        program: "node",
        args: [
          "-e",
          "process.stdin.on('data',d=>{console.log('echo:'+d);process.exit(0)});console.log('ready')",
        ],
        background: true,
      }),
      signal(),
    );
    await until(() =>
      f.project.sessions(t.id).some((s) => s.output.includes("ready")),
    );
    await f.project.execute(
      t,
      terminal({ operation: "input", sessionId: live.id, input: "hello\n" }),
      signal(),
    );
    await until(
      () =>
        f.project.sessions(t.id).find((s) => s.id === live.id)?.state ===
        "exited",
    );
    assert.match(
      f.project.sessions(t.id).find((s) => s.id === live.id)!.output,
      /echo:hello/,
    );
    const other = f.store.create("other", t.root, "assisted", "test");
    other.capabilities = t.capabilities;
    other.sourceRoot = t.sourceRoot;
    await assert.rejects(
      f.project.execute(
        other,
        terminal({ operation: "stop", sessionId: live.id }),
        signal(),
      ),
    );
    const running = await f.project.execute(
      t,
      terminal({
        program: "node",
        args: ["-e", "setInterval(()=>{},1000)"],
        background: true,
      }),
      signal(),
    );
    f.project.stopSession(t, running.id);
    await until(
      () =>
        f.project.sessions(t.id).find((s) => s.id === running.id)?.state ===
        "exited",
    );
    const row = {
      ...running,
      id: "11111111-1111-4111-8111-111111111111",
      state: "running",
    };
    f.store.db
      .prepare("INSERT INTO terminal_sessions VALUES(?,?,?)")
      .run(row.id, t.id, JSON.stringify(row));
    const recovered = new ProjectRuntime(
      f.store,
      f.gateway,
      join(f.base, "projects"),
    );
    assert.equal(
      recovered.sessions(t.id).find((s) => s.id === row.id)?.state,
      "interrupted",
    );
  } finally {
    f.project.stop();
    f.store.db.close();
  }
});

test("npm installation, failure/patch/pass and local server inside a real project", async () => {
  const f = fixture();
  const packageDir = join(f.base, "package");
  mkdirSync(packageDir);
  writeFileSync(
    join(packageDir, "package.json"),
    JSON.stringify({
      name: "chai-fixture",
      version: "1.0.0",
      main: "index.js",
    }),
  );
  writeFileSync(join(packageDir, "index.js"), "module.exports = 2");
  execFileSync("tar", [
    "-czf",
    join(f.base, "fixture.tgz"),
    "-C",
    f.base,
    "package",
  ]);
  const server = createServer((q, res) => {
    if (q.url?.endsWith(".tgz"))
      res.end(readFileSync(join(f.base, "fixture.tgz")));
    else {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          name: "chai-fixture",
          "dist-tags": { latest: "1.0.0" },
          versions: {
            "1.0.0": {
              name: "chai-fixture",
              version: "1.0.0",
              dist: {
                tarball: `http://127.0.0.1:${(server.address() as { port: number }).port}/fixture.tgz`,
              },
            },
          },
        }),
      );
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  try {
    writeFileSync(
      join(f.root, "package.json"),
      JSON.stringify({
        name: "chai-test",
        version: "1.0.0",
        scripts: { test: "node test.cjs" },
        dependencies: { "chai-fixture": "1.0.0" },
      }),
    );
    writeFileSync(join(f.root, "sum.cjs"), "module.exports = n => n + 1;");
    writeFileSync(
      join(f.root, "test.cjs"),
      "require('assert').equal(require('./sum.cjs')(1),1+require('chai-fixture'));console.log('PASS')",
    );
    const t = await task(f, true);
    let r = await f.project.execute(
      t,
      terminal({
        program: "npm",
        args: [
          "install",
          "--ignore-scripts",
          "--no-audit",
          "--no-fund",
          "--registry",
          `http://127.0.0.1:${port}`,
        ],
        timeoutSeconds: 120,
      }),
      signal(),
    );
    assert.equal(r.exitCode, 0, r.output);
    r = await f.project.execute(
      t,
      terminal({ program: "npm", args: ["test"] }),
      signal(),
    );
    assert.notEqual(r.exitCode, 0);
    const read = (await f.project.repository(
      t,
      {
        tool: "repository",
        operation: "read",
        path: "sum.cjs",
        offset: 0,
        limit: 100,
      },
      signal(),
    )) as { hash: string };
    await f.project.repository(
      t,
      {
        tool: "repository",
        operation: "patch",
        path: "sum.cjs",
        before: "n + 1",
        after: "n + 2",
        expectedHash: read.hash,
        offset: 0,
        limit: 100,
      },
      signal(),
    );
    r = await f.project.execute(
      t,
      terminal({ program: "npm", args: ["test"] }),
      signal(),
    );
    assert.equal(r.exitCode, 0, r.output);
    assert.match(r.output, /PASS/);
    assert.equal(
      readFileSync(join(f.root, "sum.cjs"), "utf8"),
      "module.exports = n => n + 1;",
    );
    const live = await f.project.execute(
      t,
      terminal({
        program: "node",
        args: [
          "-e",
          "require('http').createServer((q,r)=>r.end('CHAI preview verified')).listen(19876,'127.0.0.1',()=>console.log('listening'))",
        ],
        background: true,
        port: 19876,
      }),
      signal(),
    );
    await until(
      () =>
        f.project
          .sessions(t.id)
          .find((s) => s.id === live.id)
          ?.output.includes("listening") ?? false,
    );
    assert(f.project.previewAllowed(t, "http://127.0.0.1:19876/"));
    assert(!f.project.previewAllowed(t, "http://127.0.0.1:19877/"));
    assert.equal(
      await (await fetch("http://127.0.0.1:19876/")).text(),
      "CHAI preview verified",
    );
    f.project.stopSession(t, live.id);
    await until(
      () =>
        f.project.sessions(t.id).find((s) => s.id === live.id)?.state ===
        "exited",
    );
    assert(!f.project.previewAllowed(t, "http://127.0.0.1:19876/"));
  } finally {
    server.close();
    f.project.stop();
    await new Promise((r) => setTimeout(r, 100));
    f.store.db.close();
  }
});

test("connector configuration keeps encrypted secrets out of snapshots and enforces task grants", async () => {
  const f = fixture();
  try {
    const c = new Connectors(
      f.store,
      (s) => "cipher:" + s,
      (s) => s.slice(7),
      async () => false,
    );
    c.save("fixture", "https://example.com/mcp", "secret");
    assert(!JSON.stringify(c.list()).includes("secret"));
    c.save("fixture", "https://example.com/v2/mcp");
    assert.equal(f.store.setting("connector-token:fixture"), "cipher:secret");
    c.save("fixture", "https://example.org/mcp");
    assert(!f.store.setting("connector-token:fixture"));
    assert.throws(() => c.save("bad", "http://localhost/mcp"));
    const t = f.store.create("test", f.root, "assisted", "test");
    await assert.rejects(
      c.execute(
        t,
        {
          tool: "connector",
          name: "fixture",
          operation: "tools",
          arguments: "{}",
        },
        signal(),
      ),
      /not authorized/,
    );
    c.remove("fixture");
    assert.equal(c.list().length, 0);
  } finally {
    f.store.db.close();
  }
});

test("follow-up keeps task identity and completed effects, supersedes pending plan, and includes user steering", async () => {
  const f = fixture();
  let input = "";
  const engine = new Engine(f.store, f.gateway, {
    name: "test",
    async send(r) {
      input = r.input;
      throw Error("fixture pause");
    },
  });
  try {
    const t = f.store.create("initial", f.root, "browser", "test");
    t.state = "DONE";
    t.plan = {
      summary: "prior",
      actions: [
        { tool: "read", path: "a.txt" },
        { tool: "read", path: "unused.txt" },
      ],
    };
    t.cursor = 1;
    f.store.put(t);
    f.store.db
      .prepare("INSERT INTO effects VALUES(?,?,?,?,?,?,?)")
      .run(
        t.id + ":0",
        t.id,
        0,
        "SUCCEEDED",
        null,
        null,
        JSON.stringify({ content: null, hash: null }),
      );
    await engine.followup(t.id, "Now add a README");
    await engine.idle();
    const after = f.store.get(t.id);
    assert.equal(after.id, t.id);
    assert.equal(after.plan!.actions.length, 1);
    assert.equal(after.messages![0].text, "Now add a README");
    assert.match(input, /Now add a README/);
    assert.equal(JSON.parse(input).goal, "Now add a README");
    assert.equal(JSON.parse(input).originalGoal, t.goal);
    assert.equal(f.store.actionEvidence(t.id).length, 1);
  } finally {
    f.store.db.close();
  }
});

test("legacy tools accept only recorded isolated projects inside app settings", async () => {
  const f = fixture(true);
  try {
    writeFileSync(join(f.root, "example.txt"), "original");
    const t = await task(f);
    assert.equal(
      (await f.gateway.file(t.root, "read", "example.txt")).content,
      "original",
    );
    await f.gateway.file(t.root, "write", "example.txt", {
      expected: "original",
      content: "updated",
    });
    assert.equal(readFileSync(join(f.root, "example.txt"), "utf8"), "original");
    assert.equal(
      (await f.gateway.file(t.root, "read", "example.txt")).content,
      "updated",
    );
    const sibling = join(f.base, ".config", "chai-desktop", "private");
    mkdirSync(sibling);
    writeFileSync(join(sibling, "secret.txt"), "private");
    await assert.rejects(
      f.gateway.file(sibling, "read", "secret.txt"),
      /dedicated project/,
    );
    await assert.rejects(
      f.gateway.file(t.root, "read", "..\/..\/private\/secret.txt"),
    );
  } finally {
    f.store.db.close();
  }
});

test("a repository containing only protected tracked files never falls back to an unscoped diff", async () => {
  const f = fixture();
  try {
    writeFileSync(join(f.root, ".env"), "PROTECTED_FIXTURE_CONTENT");
    await f.project.git(f.root, ["init", "-b", "main"]);
    await f.project.git(f.root, ["add", ".env"]);
    await f.project.git(f.root, [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@localhost",
      "commit",
      "-m",
      "fixture",
    ]);
    const t = await task(f);
    const action = (operation: string) =>
      actionSchema.parse({ tool: "repository", operation }) as Extract<
        Action,
        { tool: "repository" }
      >;
    assert.deepEqual(await f.project.repository(t, action("diff"), signal()), {
      patch: "",
    });
    assert.deepEqual(
      await f.project.repository(t, action("commit"), signal()),
      { unchanged: true },
    );
    assert(!existsSync(join(t.root, ".env")));
  } finally {
    f.store.db.close();
  }
});
