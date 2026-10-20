import { _electron as electron } from "playwright";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
const base = mkdtempSync(join(tmpdir(), "chai-workbench-")),
  root = join(base, "source");
mkdirSync(root);
mkdirSync(".qa", { recursive: true });
writeFileSync(join(root, "sum.cjs"), "module.exports = n => n + 1;");
writeFileSync(
  join(root, "test.cjs"),
  "require('assert').equal(require('./sum.cjs')(1),3);console.log('Verified: 1 + 2 = 3')",
);
writeFileSync(
  join(root, "server.cjs"),
  `require('http').createServer((q,r)=>{if(q.url==='/download'){r.setHeader('Content-Disposition','attachment; filename=proof.txt');r.end('CHAI download proof');return;}r.setHeader('Content-Type','text/html');r.end('<!doctype html><title>CHAI live project</title><style>body{font:20px system-ui;padding:48px;background:#f6f3ed;color:#30302e}button{padding:12px 22px;border:0;background:#bf795e;color:white;border-radius:12px}</style><a href="/download" download>Download proof</a><h1>Project execution verified</h1><p>Built and tested inside CHAI.</p><button onclick="this.textContent=Number(this.textContent)+1">0</button>');}).listen(19877,'127.0.0.1',()=>console.log('Preview ready'));`,
);
const launch = () =>
  electron.launch({
    executablePath: process.env.CHAI_EXECUTABLE || undefined,
    args: [resolve(".")],
    env: {
      ...process.env,
      CHAI_DATA_DIR: join(base, ".config", "chai-desktop"),
      CHAI_TEST_WORKSPACE: root,
    },
  });
let app = await launch();
let page;
async function waitState(id, state) {
  for (let i = 0; i < 200; i++) {
    const s = await page.evaluate(
      (id) => window.chai.request({ op: "snapshot", id }),
      id,
    );
    const task = s.tasks.find((t) => t.id === id);
    if (task.state === state) return s;
    if (task.state === "FAILED") throw Error(task.error);
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Task state timeout");
}
try {
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  // New projects must not inherit the previously selected source folder.
  const documents = join(base, "documents");
  mkdirSync(documents);
  await app.evaluate(
    ({ app }, path) => app.setPath("documents", path),
    documents,
  );
  const freshId = await page.evaluate(() =>
    window.chai.request({
      op: "create",
      newProject: true,
      mode: "recipe",
      model: "fixture",
      permission: "workspace",
      capabilities: { project: true, browser: true },
      goal: "write fresh.txt with content A clean project",
    }),
  );
  const freshSnapshot = await waitState(freshId, "DONE");
  const fresh = freshSnapshot.tasks.find((t) => t.id === freshId);
  assert.equal(
    readFileSync(join(fresh.root, "fresh.txt"), "utf8"),
    "A clean project",
  );
  assert(!existsSync(join(fresh.root, "sum.cjs")));
  assert.notEqual(fresh.sourceRoot, root);
  // Fixture responses exercise persisted conversation rendering, not live model quality.
  const fixtureDb = new DatabaseSync(
    join(base, ".config", "chai-desktop", "chai.sqlite"),
  );
  fixtureDb
    .prepare(
      "INSERT INTO events(taskId,role,kind,detail,created) VALUES(?,?,?,?,?)",
    )
    .run(
      freshId,
      "manager",
      "MODEL_RESPONSE",
      JSON.stringify({
        summary:
          "Created **fresh.txt** in a clean project.\n\nThe existing folder was preserved.",
        limitations: [],
      }),
      new Date().toISOString(),
    );
  fixtureDb.close();
  await page
    .getByRole("button", { name: /write fresh.txt with content/ })
    .first()
    .click();
  await page
    .getByRole("region", { name: "Task conversation" })
    .getByText("Created", { exact: false })
    .waitFor();
  assert.equal(
    await page.locator(".final-message strong").last().innerText(),
    "fresh.txt",
  );
  await page.reload();
  await page
    .getByRole("button", { name: /write fresh.txt with content/ })
    .first()
    .click();
  await page.locator(".final-message").waitFor();
  await page.screenshot({ path: ".qa/conversation-workspace.png" });
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page
    .getByRole("heading", { name: "Stop chatting. Start doing." })
    .waitFor();
  // Wayland uses portal sharing. Manual X11 input must never fall back to XWayland.
  const savedDisplay = await app.evaluate(() => {
    const saved = process.env.WAYLAND_DISPLAY;
    process.env.WAYLAND_DISPLAY = "wayland-fixture";
    return saved;
  });
  try {
    const support = await page.evaluate(
      async () =>
        (await window.chai.request({ op: "snapshot" })).desktopSupport,
    );
    assert.equal(support.backend, "wayland");
    const error = await page.evaluate(async () => {
      try {
        await window.chai.request({ op: "desktop-click", x: 0, y: 0 });
        return "unexpected success";
      } catch (error) {
        return String(error);
      }
    });
    assert.match(error, /manual click tool requires X11/);
  } finally {
    await app.evaluate((_electron, saved) => {
      if (saved === undefined) delete process.env.WAYLAND_DISPLAY;
      else process.env.WAYLAND_DISPLAY = saved;
    }, savedDisplay);
  }
  const actions = [
    { tool: "read", path: "sum.cjs" },
    {
      tool: "terminal",
      operation: "start",
      program: "node",
      args: ["test.cjs"],
    },
    {
      tool: "repository",
      operation: "patch",
      path: "sum.cjs",
      before: "n + 1",
      after: "n + 2",
      expectedHash: createHash("sha256")
        .update("module.exports = n => n + 1;")
        .digest("hex"),
    },
    {
      tool: "terminal",
      operation: "start",
      program: "node",
      args: ["test.cjs"],
    },
    {
      tool: "terminal",
      operation: "start",
      program: "node",
      args: ["server.cjs"],
      background: true,
      port: 19877,
    },
    { tool: "command", command: "wait", seconds: 1 },
    { tool: "browser", operation: "open", url: "http://127.0.0.1:19877/" },
    {
      tool: "artifact",
      operation: "register",
      path: "sum.cjs",
      title: "Verified project change",
    },
  ];
  const id = await page.evaluate(
    (plan) =>
      window.chai.request({
        op: "create",
        goal: "Build, repair and preview a real project",
        mode: "assisted",
        model: "native integration fixture",
        permission: "workspace",
        capabilities: {
          project: true,
          durable: true,
          budget: "extended",
          network: true,
          browser: true,
          origins: [],
        },
        plan: JSON.stringify({
          summary: "Repair failing test and open the running app",
          actions: plan,
        }),
      }),
    actions,
  );
  let snapshot = await waitState(id, "DONE");
  const task = snapshot.tasks.find((t) => t.id === id);
  assert.notEqual(task.root, root);
  assert.equal(
    readFileSync(join(root, "sum.cjs"), "utf8"),
    "module.exports = n => n + 1;",
  );
  assert.equal(
    readFileSync(join(task.root, "sum.cjs"), "utf8"),
    "module.exports = n => n + 2;",
  );
  assert.equal(snapshot.sessions[0].exitCode, 1);
  assert.equal(snapshot.sessions[1].exitCode, 0);
  assert.equal(snapshot.sessions[2].state, "running");
  await page
    .getByRole("button", { name: /Build, repair and preview a real project/ })
    .click();
  await page.getByRole("tab", { name: "Terminal" }).click();
  await page
    .getByLabel("Terminal session")
    .selectOption(snapshot.sessions[1].id);
  await page
    .getByLabel("Terminal output")
    .filter({ hasText: "Verified: 1 + 2 = 3" })
    .waitFor();
  await page.getByRole("tab", { name: "Changes" }).click();
  await page.locator(".diff-view").filter({ hasText: "n + 2" }).waitFor();
  await page.getByRole("tab", { name: "Preview" }).click();
  await page.getByLabel("Interactive local app preview").waitFor();
  // The conversation can push the preview below the fold on shorter displays.
  // Native embedding intentionally starts only when its viewport is onscreen.
  await page
    .getByLabel("Interactive local app preview")
    .scrollIntoViewIfNeeded();
  for (let i = 0; i < 100; i++) {
    const count = await app.evaluate(
      ({ webContents }) =>
        webContents
          .getAllWebContents()
          .filter((w) => w.getURL() === "http://127.0.0.1:19877/").length,
    );
    if (count >= 2) break;
    assert(i < 99);
    await new Promise((r) => setTimeout(r, 100));
  }
  await app.evaluate(async ({ webContents, BrowserWindow }) => {
    const live = webContents
      .getAllWebContents()
      .filter((w) => w.getURL() === "http://127.0.0.1:19877/")
      .sort((a, b) => b.id - a.id)[0];
    const pos = await live.executeJavaScript(
      `(()=>{const r=document.querySelector('button').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`,
    );
    live.sendInputEvent({
      type: "mouseDown",
      ...pos,
      button: "left",
      clickCount: 1,
    });
    live.sendInputEvent({
      type: "mouseUp",
      ...pos,
      button: "left",
      clickCount: 1,
    });
    await new Promise((r) => setTimeout(r, 200));
    if (
      (await live.executeJavaScript(
        "document.querySelector('button').textContent",
      )) !== "1"
    )
      throw Error("Embedded input failed");
    const main = BrowserWindow.getAllWindows().find((w) =>
      w.webContents.getURL().startsWith("file:"),
    );
    main.show();
    main.focus();
  });
  await new Promise((r) => setTimeout(r, 400));
  const xid = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.webContents.getURL().startsWith("file:"))
      .getNativeWindowHandle()
      .readUInt32LE(0),
  );
  try {
    execFileSync("import", [
      "-window",
      String(xid),
      ".qa/workbench-preview.png",
    ]);
  } catch {
    await page.screenshot({ path: ".qa/workbench-renderer.png" });
  }

  // Only this disposable fixture replaces the native dialog callback.
  const downloadBrowser = (await app.windows()).find(
    (p) => p.url() === "http://127.0.0.1:19877/",
  );
  assert(downloadBrowser);
  await app.evaluate(({ dialog }) => {
    dialog.showMessageBox = async () => ({ response: 0 });
  });
  await downloadBrowser.getByRole("link", { name: "Download proof" }).click();
  await new Promise((r) => setTimeout(r, 300));
  const beforeDownload = await page.evaluate(
    (id) => window.chai.request({ op: "snapshot", id }),
    id,
  );
  assert.equal(beforeDownload.artifacts.length, 1);
  await app.evaluate(({ dialog }) => {
    dialog.showMessageBox = async () => ({ response: 1 });
  });
  await downloadBrowser.getByRole("link", { name: "Download proof" }).click();
  for (let i = 0; i < 100; i++) {
    snapshot = await page.evaluate(
      (id) => window.chai.request({ op: "snapshot", id }),
      id,
    );
    if (snapshot.artifacts.length === 2) break;
    assert(i < 99, "Confirmed browser download was not registered");
    await new Promise((r) => setTimeout(r, 50));
  }
  const downloaded = readdirSync(join(task.root, "downloads"));
  assert.equal(downloaded.length, 1);
  assert.equal(
    readFileSync(join(task.root, "downloads", downloaded[0]), "utf8"),
    "CHAI download proof",
  );
  await page.getByRole("tab", { name: "Outputs" }).click();
  await page.getByText("Verified project change", { exact: true }).waitFor();
  await page.getByRole("tab", { name: "Files" }).click();
  await page.getByRole("button", { name: "sum.cjs", exact: true }).click();
  await page.locator(".file-content").filter({ hasText: "n + 2" }).waitFor();
  await page.evaluate(() =>
    window.chai.request({ op: "background", enabled: true }),
  );
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.webContents.getURL().startsWith("file:"))
      .close(),
  );
  assert.equal(await (await fetch("http://127.0.0.1:19877/")).status, 200);
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.webContents.getURL().startsWith("file:"))
      .show(),
  );
  await app.close();
  assert.equal(await (await fetch("http://127.0.0.1:19877/")).status, 200);
  app = await launch();
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  await page
    .getByRole("heading", { name: "Stop chatting. Start doing." })
    .waitFor();
  snapshot = await page.evaluate(
    (id) => window.chai.request({ op: "snapshot", id }),
    id,
  );
  assert.equal(snapshot.sessions[2].state, "running");
  assert.equal(snapshot.sessions[2].durable, true);
  await page.evaluate(() => window.chai.request({ op: "stop" }));
  for (let i = 0; i < 100; i++) {
    snapshot = await page.evaluate(
      (id) => window.chai.request({ op: "snapshot", id }),
      id,
    );
    if (snapshot.sessions.every((s) => s.state !== "running")) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  assert(snapshot.sessions.every((s) => s.state !== "running"));
  await app.close();
  app = await launch();
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  await page
    .getByRole("heading", { name: "Stop chatting. Start doing." })
    .waitFor();
  snapshot = await page.evaluate(
    (id) => window.chai.request({ op: "snapshot", id }),
    id,
  );
  assert.equal(snapshot.artifacts.length, 2);
  assert.equal(snapshot.sessions.length, 3);
  assert(snapshot.sessions.every((s) => s.state !== "running"));
  writeFileSync(
    ".qa/workbench-verification.json",
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        taskId: id,
        checks: [
          "real failing test",
          "exact patch",
          "same test passes",
          "source untouched",
          "background dev server",
          "browser observation",
          "interactive embedded preview",
          "terminal UI",
          "side-by-side diff",
          "file viewer",
          "artifact list",
          "declined download leaves no output",
          "confirmed download bytes and registration",
          "tray continuation",
          "durable project server survives app quit and reconnects",
          "Stop all",
          "restart persisted sessions without replay",
        ],
      },
      null,
      2,
    ),
  );
  // Test native grant denial/acceptance and the real host command UI in this disposable profile.
  const hostRequest = {
    op: "create",
    goal: "Host terminal UI fixture",
    mode: "assisted",
    model: "native fixture",
    permission: "workspace",
    capabilities: { host: true, durable: true, browser: false, origins: [] },
    plan: JSON.stringify({
      summary: "Read fixture",
      actions: [{ tool: "read", path: "sum.cjs" }],
    }),
  };
  await app.evaluate(({ dialog }) => {
    dialog.showMessageBox = async () => ({ response: 0 });
  });
  const denied = await page.evaluate(async (request) => {
    try {
      await window.chai.request(request);
      return "unexpected success";
    } catch (error) {
      return String(error);
    }
  }, hostRequest);
  assert.match(denied, /not authorized/);
  await app.evaluate(({ dialog }) => {
    dialog.showMessageBox = async () => ({ response: 1 });
  });
  const hostId = await page.evaluate(
    (request) => window.chai.request(request),
    hostRequest,
  );
  await waitState(hostId, "DONE");
  await page
    .getByRole("button", { name: /Host terminal UI fixture/ })
    .first()
    .click();
  await page.getByRole("tab", { name: "Terminal" }).click();
  await page
    .getByLabel("New terminal command")
    .fill("printf 'HOST_UI_VERIFIED' > host-ui.txt; cat host-ui.txt");
  assert.equal(
    await page.getByLabel("Command environment").inputValue(),
    "host",
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page
    .getByLabel("Terminal output")
    .filter({ hasText: "HOST_UI_VERIFIED" })
    .waitFor();
  assert.equal(
    readFileSync(join(root, "host-ui.txt"), "utf8"),
    "HOST_UI_VERIFIED",
  );
  await page.screenshot({ path: ".qa/host-terminal-ui.png" });
  await page.evaluate(
    (id) => window.chai.request({ op: "revoke", id }),
    hostId,
  );
  if (await app.evaluate(({ app }) => app.isPackaged)) {
    const previousHome = await app.evaluate(({ app }, home) => {
      const prior = app.getPath("home");
      app.setPath("home", home);
      return prior;
    }, base);
    try {
      await page.evaluate(() =>
        window.chai.request({ op: "startup", enabled: true }),
      );
      const desktopFile = join(base, ".config", "autostart", "chai.desktop");
      assert.match(
        readFileSync(desktopFile, "utf8"),
        /Exec=\/usr\/bin\/env APPIMAGE_EXTRACT_AND_RUN=1 "/,
      );
      await page.evaluate(() =>
        window.chai.request({ op: "startup", enabled: false }),
      );
      assert(!existsSync(desktopFile));
    } finally {
      await app.evaluate(
        ({ app }, home) => app.setPath("home", home),
        previousHome,
      );
    }
  }
  console.log("WORKBENCH_E2E_PASS");
} finally {
  // A failing test must not leave its opt-in durable fixture server alive.
  await page
    ?.evaluate(() => window.chai.request({ op: "stop" }))
    .catch(() => {});
  await app.close();
}
