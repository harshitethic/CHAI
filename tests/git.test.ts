import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { Gateway } from "../src/core/gateway";
import { type GitAction, gitHead } from "../src/core/git";
import { Engine } from "../src/core/engine";
import { Store } from "../src/core/store";
function fixture() {
  const base = mkdtempSync(join(tmpdir(), "chai-git-test-")),
    root = join(base, "repo");
  mkdirSync(root);
  const git = (...args: string[]) =>
    execFileSync("/usr/bin/git", args, {
      cwd: root,
      encoding: "utf8",
      env: {
        PATH: "/usr/bin:/bin",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
      },
    }).trim();
  git("init", "-q");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@example.invalid");
  writeFileSync(join(root, "code.txt"), "old\n");
  writeFileSync(join(root, "other.txt"), "original\n");
  git("add", ".");
  git("commit", "-qm", "Initial");
  const gateway = new Gateway(resolve("src/core/files.py")),
    signal = new AbortController().signal;
  return {
    base,
    root,
    git,
    gateway,
    signal,
    close: () => {
      gateway.stop();
      rmSync(base, { recursive: true, force: true });
    },
  };
}
const action = (
  operation: GitAction["operation"],
  paths = ["code.txt"],
): GitAction => ({
  tool: "git",
  operation,
  paths,
  message: "Review selected changes",
});
test("Git creates only selected snapshot changes without touching HEAD, staging or working files", async () => {
  const s = fixture();
  try {
    const head = s.git("rev-parse", "HEAD");
    writeFileSync(join(s.root, "other.txt"), "user staged\n");
    s.git("add", "other.txt");
    const index = readFileSync(join(s.root, ".git/index"));
    writeFileSync(join(s.root, "code.txt"), "new\n");
    writeFileSync(join(s.root, "new.txt"), "created\n");
    let confirmed = false;
    s.gateway.gitConsent = async (_, detail) => {
      confirmed = true;
      assert.match(detail, /\+new/);
      assert.match(detail, /\+created/);
      return true;
    };
    const a = action("commit", ["code.txt", "new.txt"]);
    await s.gateway.prepareRuns(s.root, [a]);
    const result = await s.gateway.git(s.root, a, "chai/abc-1", s.signal);
    assert(confirmed);
    assert("commit" in result);
    assert.equal(s.git("show", result.commit + ":code.txt"), "new");
    assert.equal(s.git("show", result.commit + ":new.txt"), "created");
    assert.equal(s.git("show", result.commit + ":other.txt"), "original");
    assert.equal(s.git("rev-parse", "HEAD"), head);
    assert.deepEqual(readFileSync(join(s.root, ".git/index")), index);
    assert.equal(
      readFileSync(join(s.root, "other.txt"), "utf8"),
      "user staged\n",
    );
    assert.match(
      s.git("show", "-s", "--format=%an <%ae>", result.commit),
      /CHAI <chai@localhost>/,
    );
    const before = s.git("rev-parse", "refs/heads/chai/abc-1");
    await assert.rejects(s.gateway.git(s.root, a, "chai/abc-1", s.signal));
    assert.equal(s.git("rev-parse", "refs/heads/chai/abc-1"), before);
  } finally {
    s.close();
  }
});
test("Git confirmation cannot be replaced by a workspace grant and denial leaves no review branch", async () => {
  const s = fixture();
  try {
    writeFileSync(join(s.root, "code.txt"), "changed\n");
    const a = action("commit");
    await s.gateway.prepareRuns(s.root, [a]);
    await assert.rejects(
      s.gateway.git(s.root, a, "chai/abc-2", s.signal),
      /confirmation/,
    );
    s.gateway.gitConsent = async () => false;
    await assert.rejects(
      s.gateway.git(s.root, a, "chai/abc-2", s.signal),
      /declined/,
    );
    assert.equal(s.git("for-each-ref", "refs/heads/chai"), "");
  } finally {
    s.close();
  }
});
test("Git rejects changed files or HEAD before publishing a branch", async () => {
  const s = fixture();
  try {
    writeFileSync(join(s.root, "code.txt"), "changed\n");
    const a = action("commit");
    await s.gateway.prepareRuns(s.root, [a]);
    s.gateway.gitConsent = async () => {
      writeFileSync(join(s.root, "code.txt"), "concurrent\n");
      return true;
    };
    await assert.rejects(
      s.gateway.git(s.root, a, "chai/abc-3", s.signal),
      /during confirmation/,
    );
    await s.gateway.prepareRuns(s.root, [a]);
    s.git("commit", "--allow-empty", "-qm", "Concurrent HEAD");
    await assert.rejects(
      s.gateway.git(s.root, a, "chai/abc-3", s.signal),
      /HEAD changed/,
    );
    assert.equal(s.git("for-each-ref", "refs/heads/chai"), "");
  } finally {
    s.close();
  }
});
test("Git refuses credentials, symlinks, pathspec escapes and linked worktrees", async () => {
  const s = fixture();
  try {
    writeFileSync(join(s.root, ".env"), "fixture");
    symlinkSync(join(s.root, "code.txt"), join(s.root, "link.txt"));
    for (const path of [".env", "link.txt", "../outside", ".git/config"])
      await assert.rejects(
        s.gateway.prepareRuns(s.root, [action("diff", [path])]),
      );
    const outside = join(s.base, "linked");
    s.git("worktree", "add", "-q", "-b", "linked", outside);
    await assert.rejects(
      gitHead(s.gateway, outside, s.signal),
      /repository root/,
    );
  } finally {
    s.close();
  }
});
test("Git preview and commit bypass hooks, clean filters and external diff commands", async () => {
  const s = fixture();
  try {
    writeFileSync(
      join(s.root, ".git/hooks/pre-commit"),
      "#!/bin/sh\ntouch /workspace/.git/hook-ran\n",
      { mode: 0o755 },
    );
    s.git(
      "config",
      "filter.evil.clean",
      "touch /workspace/.git/filter-ran; cat",
    );
    s.git("config", "diff.external", "touch /workspace/.git/diff-ran");
    writeFileSync(join(s.root, ".gitattributes"), "code.txt filter=evil\n");
    writeFileSync(join(s.root, "code.txt"), "new\n");
    const a = action("commit");
    await s.gateway.prepareRuns(s.root, [a]);
    s.gateway.gitConsent = async () => true;
    const r = await s.gateway.git(s.root, a, "chai/abc-4", s.signal);
    assert("commit" in r);
    for (const file of ["hook-ran", "filter-ran", "diff-ran"])
      assert(!existsSync(join(s.root, ".git", file)));
  } finally {
    s.close();
  }
});
test("Engine persists Git branch evidence and cancels confirmation before mutation", async () => {
  const s = fixture();
  const store = new Store(join(s.base, "db.sqlite"));
  const engine = new Engine(store, s.gateway);
  try {
    writeFileSync(join(s.root, "code.txt"), "new\n");
    s.gateway.gitConsent = async () => true;
    const id = await engine.create(
      "Review commit",
      s.root,
      "assisted",
      "",
      JSON.stringify({
        summary: "Commit selected file",
        actions: [action("commit")],
      }),
      "workspace",
    );
    await engine.idle();
    assert.equal(store.get(id).state, "DONE", store.get(id).error ?? "");
    const result = JSON.parse(
      String(
        store.db.prepare("SELECT output FROM effects WHERE taskId=?").get(id)
          ?.output,
      ),
    );
    assert.match(result.commit, /^[a-f0-9]{40}$/);
    assert.equal(result.branch, "chai/" + id + "-0");
    const ctrl = new AbortController();
    const a = action("commit");
    await s.gateway.prepareRuns(s.root, [a]);
    s.gateway.gitConsent = async () => {
      ctrl.abort();
      return true;
    };
    await assert.rejects(s.gateway.git(s.root, a, "chai/abc-5", ctrl.signal));
    assert.equal(s.git("for-each-ref", "refs/heads/chai/abc-5"), "");
  } finally {
    engine.stop();
    store.close();
    s.close();
  }
});

test("legacy Git inspection retains real index semantics inside isolation", async () => {
  const s = fixture();
  try {
    writeFileSync(join(s.root, "other.txt"), "staged\n");
    s.git("add", "other.txt");
    const index = readFileSync(join(s.root, ".git/index"));
    const status = await s.gateway.command(
      s.root,
      { tool: "command", command: "git-status" },
      s.signal,
    );
    assert.match(status, /M  other.txt/);
    assert(!status.includes("code.txt"));
    const diff = await s.gateway.command(
      s.root,
      { tool: "command", command: "git-diff" },
      s.signal,
    );
    assert.match(diff, /other.txt/);
    assert.deepEqual(readFileSync(join(s.root, ".git/index")), index);
  } finally {
    s.close();
  }
});
test("an interrupted Git effect is never replayed after resume", async () => {
  const s = fixture();
  const store = new Store(join(s.base, "db.sqlite"));
  const engine = new Engine(store, s.gateway);
  try {
    writeFileSync(join(s.root, "code.txt"), "new\n");
    let confirmations = 0;
    s.gateway.gitConsent = async () => {
      confirmations++;
      return true;
    };
    const id = await engine.create(
      "Commit",
      s.root,
      "assisted",
      "",
      JSON.stringify({ summary: "Commit", actions: [action("commit")] }),
      "workspace",
    );
    await engine.idle();
    assert.equal(store.get(id).state, "DONE");
    const branch = s.git("rev-parse", "refs/heads/chai/" + id + "-0");
    const t = store.get(id);
    t.cursor = 0;
    t.state = "PAUSED";
    store.put(t);
    store.db
      .prepare("UPDATE effects SET state='STARTED',output=NULL WHERE taskId=?")
      .run(id);
    await engine.resume(id);
    await engine.idle();
    assert.equal(store.get(id).state, "FAILED");
    assert.match(store.get(id).error ?? "", /will not be replayed/);
    assert.equal(confirmations, 1);
    assert.equal(s.git("rev-parse", "refs/heads/chai/" + id + "-0"), branch);
  } finally {
    engine.stop();
    store.close();
    s.close();
  }
});
