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
    document.body.innerText.includes("TASK DONE"),
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
    "PASS: native Electron task, approval, actual file, renderer reload, app restart, hardened preferences, invalid IPC, autonomous UI flow, real sandbox execution, four widths.",
  );
} finally {
  await app.close().catch(() => {});
}
