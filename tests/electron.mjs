import { execFileSync } from "node:child_process";
import { _electron as electron } from "playwright";
import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
const base = mkdtempSync(join(tmpdir(), "chai-e2e-"));
const root = join(base, "workspace");
mkdirSync(root);
mkdirSync(".qa", { recursive: true });
const executablePath = process.env.CHAI_EXECUTABLE || undefined;
async function launch() {
  return electron.launch({
    executablePath,
    args: [resolve(".")],
    env: {
      ...process.env,
      CHAI_DATA_DIR: join(base, "data"),
      CHAI_TEST_WORKSPACE: root,
    },
  });
}
let app = await launch();
try {
  let page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("heading", { name: "Stop chatting. Start doing." })
    .waitFor();
  await page.screenshot({ path: ".qa/home.png" });
  await page
    .getByRole("combobox", { name: "Provider mode" })
    .selectOption("recipe");
  await page
    .getByRole("combobox", { name: "Task permissions" })
    .selectOption("review");
  await page
    .getByRole("textbox", { name: "Task goal" })
    .fill("write notes.txt with content one\ntwo\nthree");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await page
    .getByRole("button", { name: "Approve plan", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Approve plan", exact: true }).click();
  await page.waitForFunction(() =>
    document.body.innerText.includes("Task completed"),
  );
  assert.equal(
    readFileSync(join(root, "notes.txt"), "utf8"),
    "one\ntwo\nthree",
  );
  await page.screenshot({ path: ".qa/work.png" });
  const snapshot = await page.evaluate(() =>
    window.chai.request({ op: "snapshot" }),
  );
  const id = snapshot.tasks[0].id;
  await page.reload();
  await page.getByRole("button", { name: "Work", exact: true }).click();
  assert.equal(
    (await page.evaluate(() => window.chai.request({ op: "snapshot" })))
      .tasks[0].state,
    "DONE",
  );
  const prefs = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences(),
  );
  assert.equal(prefs.sandbox, true);
  assert.equal(prefs.contextIsolation, true);
  assert.equal(prefs.nodeIntegration, false);
  const invalid = await page.evaluate(async () => {
    try {
      await window.chai.request({ op: "shell", command: "touch bad" });
      return false;
    } catch {
      return true;
    }
  });
  assert(invalid);
  // Exercise the visible one-time permission selector, without approving a plan.
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Provider mode" })
    .selectOption("recipe");
  await page
    .getByRole("combobox", { name: "Task permissions" })
    .selectOption("workspace");
  await page
    .getByRole("textbox", { name: "Task goal" })
    .fill("write automatic.txt with content workspace authorization works");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  for (let attempt = 0; ; attempt++) {
    const state = await page.evaluate(() =>
      window.chai.request({ op: "snapshot" }),
    );
    if (
      state.tasks.some(
        (t) =>
          t.goal ===
            "write automatic.txt with content workspace authorization works" &&
          t.state === "DONE",
      )
    )
      break;
    assert(attempt < 100, "Autonomous UI task did not finish");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(
    readFileSync(join(root, "automatic.txt"), "utf8"),
    "workspace authorization works",
  );
  // Native and packaged executables must locate the external Python supervisor.
  const sandboxId = await page.evaluate(() =>
    window.chai.request({
      op: "create",
      mode: "assisted",
      model: "explicit test plan",
      permission: "workspace",
      goal: "Verify packaged sandbox runner",
      plan: JSON.stringify({
        summary: "Run a real isolated Python check",
        actions: [
          { tool: "write", path: "verify.py", content: "print(6 * 7)\n" },
          {
            tool: "run",
            program: "python3",
            args: ["verify.py"],
            files: ["verify.py"],
            timeoutSeconds: 5,
          },
        ],
      }),
    }),
  );
  for (let attempt = 0; ; attempt++) {
    const state = await page.evaluate(() =>
      window.chai.request({ op: "snapshot" }),
    );
    if (
      ["DONE", "FAILED"].includes(
        state.tasks.find((t) => t.id === sandboxId)?.state,
      )
    )
      break;
    assert(attempt < 100, "Sandbox UI task did not finish");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const verified = await page.evaluate(() =>
    window.chai.request({ op: "snapshot" }),
  );
  const sandboxTask = verified.tasks.find((t) => t.id === sandboxId);
  assert.equal(sandboxTask.state, "DONE", sandboxTask.error ?? "");
  assert(
    verified.events.some(
      (e) => e.taskId === sandboxId && e.kind === "EXECUTION_CAPTURED",
    ),
  );
  assert(
    !verified.events.some(
      (e) =>
        e.taskId === sandboxId &&
        e.kind === "PLAN_APPROVED" &&
        e.detail.includes("User approved"),
    ),
  );
  const previewId = await page.evaluate(() =>
    window.chai.request({
      op: "create",
      mode: "assisted",
      model: "assisted",
      permission: "workspace",
      capabilities: { browser: true, origins: [] },
      goal: "Verify packaged workspace browser",
      plan: JSON.stringify({
        summary: "Preview local page",
        actions: [
          { tool: "mkdir", path: "web" },
          {
            tool: "write",
            path: "web/index.html",
            content:
              "<!doctype html><h1>Packaged browser works</h1><button>Ready</button>",
          },
          { tool: "browser", operation: "preview", path: "web/index.html" },
        ],
      }),
    }),
  );
  for (let attempt = 0; ; attempt++) {
    const state = await page.evaluate(() =>
      window.chai.request({ op: "snapshot" }),
    );
    const task = state.tasks.find((t) => t.id === previewId);
    if (task?.state === "DONE") break;
    assert.notEqual(task?.state, "FAILED", task?.error);
    assert(attempt < 150, "Packaged browser did not finish");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const preview = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.webContents.getURL().startsWith("chai-preview:"))
      ?.webContents.getURL(),
  );
  assert(preview?.startsWith("chai-preview:"));
  await page.evaluate(() => window.chai.request({ op: "stop" }));
  assert.equal(
    await app.evaluate(
      ({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().filter((w) =>
          w.webContents.getURL().startsWith("chai-preview:"),
        ).length,
    ),
    0,
  );

  // Real interruption, saved progress and ambiguous-resume UI; no fabricated success states.
  const progressId = await page.evaluate(() =>
    window.chai.request({
      op: "create",
      mode: "assisted",
      model: "",
      permission: "workspace",
      goal: "Verify saved progress while a Python check is interrupted",
      plan: JSON.stringify({
        summary: "Run a check, then save a report",
        actions: [
          {
            tool: "write",
            path: "slow_check.py",
            content: "import time\ntime.sleep(20)\nprint('PASS')\n",
          },
          {
            tool: "run",
            program: "python3",
            args: ["slow_check.py"],
            files: ["slow_check.py"],
            timeoutSeconds: 30,
          },
          { tool: "write", path: "report.txt", content: "Check passed" },
        ],
      }),
    }),
  );
  const selectProgress = () =>
    page
      .getByRole("button", {
        name: /Verify saved progress while a Python check is interrupted/,
      })
      .click();
  await selectProgress();
  await page
    .getByRole("heading", { name: "Run python3 slow_check.py", exact: true })
    .waitFor();
  const checklist = page.getByRole("region", { name: "Task checklist" });
  assert.equal(await checklist.getByText("1 of 3 actions finished").count(), 1);
  assert.equal(await checklist.locator('[aria-current="step"]').count(), 1);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("heading", { name: "Paused", exact: true }).waitFor();
  assert.equal(await checklist.locator('[aria-current="step"]').count(), 0);
  await page.reload();
  await selectProgress();
  await page.getByRole("heading", { name: "Paused", exact: true }).waitFor();
  assert.equal(await page.getByText("1 of 3 actions finished").count(), 1);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page
    .getByRole("heading", { name: "Task stopped with an error", exact: true })
    .waitFor();
  const interrupted = await page.evaluate(
    (id) => window.chai.request({ op: "snapshot", id }),
    progressId,
  );
  assert.equal(
    interrupted.tasks.find((t) => t.id === progressId).state,
    "FAILED",
  );
  assert(interrupted.events.every((e) => e.taskId === progressId));
  assert.equal(interrupted.effects.find((e) => e.idx === 1).state, "STARTED");
  assert.equal(
    await page.getByText("Stopped here", { exact: true }).count(),
    1,
  );
  assert.equal(await page.getByText("Not run", { exact: true }).count(), 1);

  // Test-only dialog driver exercises the actual production confirmation path.
  const git = (...args) =>
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
  git("config", "user.name", "UI fixture");
  git("config", "user.email", "fixture@example.invalid");
  git("add", ".");
  git("commit", "-qm", "Initial UI fixture");
  const gitHead = git("rev-parse", "HEAD");
  const gitIndex = readFileSync(join(root, ".git/index"));
  await app.evaluate(({ dialog }) => {
    globalThis.gitConfirmations = [];
    globalThis.allowGit = false;
    const original = dialog.showMessageBox.bind(dialog);
    dialog.showMessageBox = async (...args) => {
      const options = args.at(-1);
      if (options.message === "Create CHAI Git review commit?") {
        globalThis.gitConfirmations.push(options);
        return {
          response: globalThis.allowGit ? 1 : 0,
          checkboxChecked: false,
        };
      }
      return original(...args);
    };
  });
  for (const allow of [false, true]) {
    await app.evaluate((_, value) => {
      globalThis.allowGit = value;
    }, allow);
    const gitId = await page.evaluate(
      (allow) =>
        window.chai.request({
          op: "create",
          mode: "assisted",
          model: "",
          permission: "workspace",
          goal: "Verify Git confirmation",
          plan: JSON.stringify({
            summary: "Review selected edit",
            actions: [
              {
                tool: "write",
                path: "notes.txt",
                content: allow ? "approved change" : "declined commit change",
              },
              {
                tool: "git",
                operation: "commit",
                paths: ["notes.txt"],
                message: "Verified UI review commit",
              },
            ],
          }),
        }),
      allow,
    );
    let current;
    for (let n = 0; n < 150; n++) {
      current = (
        await page.evaluate(() => window.chai.request({ op: "snapshot" }))
      ).tasks.find((t) => t.id === gitId);
      if (["DONE", "FAILED"].includes(current.state)) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(current.state, allow ? "DONE" : "FAILED", current.error ?? "");
    if (allow)
      assert.equal(
        git("show", "refs/heads/chai/" + gitId + "-1:notes.txt"),
        "approved change",
      );
    else
      assert.equal(git("for-each-ref", "refs/heads/chai/" + gitId + "-1"), "");
  }
  const confirmations = await app.evaluate(() => globalThis.gitConfirmations);
  assert.equal(confirmations.length, 2);
  assert.equal(confirmations[0].defaultId, 0);
  assert.deepEqual(confirmations[0].buttons, ["Cancel", "Allow once"]);
  assert.match(confirmations[1].detail, /approved change/);
  assert.equal(git("rev-parse", "HEAD"), gitHead);
  assert.deepEqual(readFileSync(join(root, ".git/index")), gitIndex);
  await page.screenshot({ path: ".qa/autonomous-work.png" });
  await app.close();
  app = await launch();
  page = await app.firstWindow();
  await page
    .getByRole("heading", { name: "Stop chatting. Start doing." })
    .waitFor();
  const again = await page.evaluate(() =>
    window.chai.request({ op: "snapshot" }),
  );
  assert(again.tasks.some((t) => t.id === id && t.state === "DONE"));
  assert(
    again.tasks.some(
      (t) => t.id === sandboxId && t.state === "DONE" && t.autonomous,
    ),
  );
  for (const width of [1024, 1440, 1920, 3440]) {
    await app.evaluate(
      ({ BrowserWindow }, w) =>
        BrowserWindow.getAllWindows()[0].setSize(w, 1000),
      width,
    );
    await page.screenshot({ path: `.qa/home-${width}.png` });
  }
  assert.deepEqual(errors, []);
  await app.close();
  console.log(
    "PASS: native Electron task, approval, actual file, renderer reload, app restart, hardened preferences, invalid IPC, autonomous UI flow, real sandbox execution, local browser, Git confirmation/branch commit, progress checklist, task switching, pause/reload/error state, four widths.",
  );
} finally {
  await app.close().catch(() => {});
}
