import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  symlinkSync,
  linkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Store } from "../src/core/store";
import { Gateway } from "../src/core/gateway";
import { Engine } from "../src/core/engine";
import { requestSchema, planSchema, redact } from "../src/core/contracts";
function setup() {
  const temp = mkdtempSync(join(tmpdir(), "chai-test-"));
  const root = join(temp, "workspace");
  mkdirSync(root);
  const db = join(temp, "data.sqlite");
  const store = new Store(db);
  const gateway = new Gateway(resolve("src/core/files.py"));
  return { root, db, store, gateway, engine: new Engine(store, gateway) };
}
test("real file cycle requires approval and survives reopening SQLite", async () => {
  const s = setup();
  const id = await s.engine.create(
    "write notes.txt with content one\ntwo\nthree",
    s.root,
    "recipe",
    "",
  );
  assert.equal(s.store.get(id).state, "WAITING_APPROVAL");
  await assert.rejects(s.gateway.file(s.root, "read", "../outside"));
  s.engine.approve(id, true);
  await s.engine.idle();
  assert.equal(s.store.get(id).state, "DONE");
  assert.equal(
    readFileSync(join(s.root, "notes.txt"), "utf8"),
    "one\ntwo\nthree",
  );
  assert(
    s.store
      .events()
      .some((e) => e.role === "reviewer" && e.kind === "CHECK_PASSED"),
  );
  s.store.close();
  const reopened = new Store(s.db);
  assert.equal(reopened.get(id).state, "DONE");
  reopened.close();
});
test("denied plan produces no file", async () => {
  const s = setup();
  const id = await s.engine.create(
    "write denied.txt with content nope",
    s.root,
    "recipe",
    "",
  );
  s.engine.approve(id, false);
  await s.engine.idle();
  assert.equal(
    (await s.gateway.file(s.root, "read", "denied.txt")).content,
    null,
  );
});
test("path traversal, symlinks, hardlinks, secret names and oversized files are denied", async () => {
  const s = setup();
  writeFileSync(join(s.root, "normal"), "ok");
  writeFileSync(join(s.root, "big"), "x".repeat(100001));
  symlinkSync("/tmp", join(s.root, "escape"));
  symlinkSync("/etc/passwd", join(s.root, "link"));
  linkSync(join(s.root, "normal"), join(s.root, "hard"));
  for (const path of [
    "../outside",
    "/etc/passwd",
    "escape/file",
    "link",
    "hard",
    ".env",
    "key.pem",
    "big",
  ])
    await assert.rejects(s.gateway.file(s.root, "read", path));
});
test("schema rejects forged permission, arbitrary shell and invalid IPC", () => {
  assert.equal(
    planSchema.safeParse({
      summary: "evil",
      actions: [{ tool: "command", command: "rm -rf /", approved: true }],
    }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({ op: "approve", id: "not-a-uuid", allow: true })
      .success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({ op: "shell", command: "anything" }).success,
    false,
  );
});
test("cancel kills process group and queued task cannot execute", async () => {
  const s = setup();
  const id = await s.engine.create("cancellation check", s.root, "recipe", "");
  s.engine.approve(id, true);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(s.gateway.children.size, 1);
  const second = await s.engine.create(
    "write after.txt with content nope",
    s.root,
    "recipe",
    "",
  );
  s.engine.approve(second, true);
  s.engine.stop();
  await s.engine.idle();
  assert.equal(s.gateway.children.size, 0);
  assert.equal(s.store.get(id).state, "CANCELED");
  assert.equal(
    (await s.gateway.file(s.root, "read", "after.txt")).content,
    null,
  );
});
test("restart reconciles a write applied before result checkpoint without repeating it", async () => {
  const s = setup();
  const id = await s.engine.create(
    "write replay.txt with content once",
    s.root,
    "recipe",
    "",
  );
  const t = s.store.get(id);
  t.state = "RUNNING";
  s.store.put(t);
  s.store.db
    .prepare("INSERT INTO effects VALUES(?,?,?,?,?,?,?)")
    .run(id + ":0", id, 0, "STARTED", "null", "once", null);
  writeFileSync(join(s.root, "replay.txt"), "once");
  s.store.close();
  const store = new Store(s.db);
  const engine = new Engine(store, s.gateway);
  assert.equal(store.get(id).state, "PAUSED");
  await engine.resume(id);
  engine.approve(id, true);
  await engine.idle();
  assert.equal(store.get(id).state, "DONE");
  assert(
    store.events().some((e) => e.detail.includes("no duplicate mutation")),
  );
});
test("ambiguous partial write fails instead of clobbering user edit", async () => {
  const s = setup();
  const id = await s.engine.create(
    "write conflict.txt with content wanted",
    s.root,
    "recipe",
    "",
  );
  s.store.db
    .prepare("INSERT INTO effects VALUES(?,?,?,?,?,?,?)")
    .run(id + ":0", id, 0, "STARTED", '"old"', "wanted", null);
  writeFileSync(join(s.root, "conflict.txt"), "user edit");
  s.engine.approve(id, true);
  await s.engine.idle();
  assert.equal(s.store.get(id).state, "FAILED");
  assert.equal(readFileSync(join(s.root, "conflict.txt"), "utf8"), "user edit");
});
test("restore respects after snapshot and cannot clobber later user change", async () => {
  const s = setup();
  writeFileSync(join(s.root, "notes"), "before");
  const id = await s.engine.create(
    "write notes with content after",
    s.root,
    "recipe",
    "",
  );
  s.engine.approve(id, true);
  await s.engine.idle();
  writeFileSync(join(s.root, "notes"), "new user text");
  await assert.rejects(s.engine.undo(id));
  assert.equal(readFileSync(join(s.root, "notes"), "utf8"), "new user text");
});
test("expired approval prevents execution", async () => {
  const s = setup();
  const id = await s.engine.create(
    "write never.txt with content denied",
    s.root,
    "recipe",
    "",
  );
  const t = s.store.get(id);
  t.state = "RUNNING";
  s.store.put(t);
  s.store.db
    .prepare("INSERT INTO approvals VALUES(?,?,?)")
    .run(id, JSON.stringify(t.plan), 0);
  await s.engine.execute(id);
  assert.equal(s.store.get(id).state, "WAITING_APPROVAL");
  assert.equal(
    (await s.gateway.file(s.root, "read", "never.txt")).content,
    null,
  );
});
test("credential patterns redacted", () => {
  assert.equal(
    redact("token=abc123 ghp_abcdefghijklmnopqrstuvwxyz"),
    "token=[REDACTED] [REDACTED]",
  );
});
test("local unavailable provider waits with retained task", async () => {
  const s = setup();
  const id = await s.engine.create("test", s.root, "local", "");
  await s.engine.idle();
  assert.equal(s.store.get(id).state, "WAITING_PROVIDER");
});
test("unsupported recipe is explicitly failed, never fabricated success", async () => {
  const s = setup();
  const id = await s.engine.create("Build a rocket", s.root, "recipe", "");
  assert.equal(s.store.get(id).state, "FAILED");
});
