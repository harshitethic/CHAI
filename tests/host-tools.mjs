import { _electron as electron } from "playwright";
import { mkdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
mkdirSync(".qa/host-workspace", { recursive: true });
const app = await electron.launch({
  executablePath: process.env.CHAI_EXECUTABLE,
  args: [],
  env: {
    ...process.env,
    CHAI_DATA_DIR: resolve(".qa/host-data"),
    CHAI_TEST_WORKSPACE: resolve(".qa/host-workspace"),
  },
});
try {
  const page = await app.firstWindow();
  await page
    .getByRole("heading", { name: "Stop chatting. Start doing." })
    .waitFor();
  // Controlled test-only native-dialog approvals. Production code remains unchanged.
  await app.evaluate(({ dialog }, folder) => {
    let i = 0;
    dialog.showMessageBox = async () => ({
      response: 1,
      checkboxChecked: false,
    });
    dialog.showSaveDialog = async () => ({
      canceled: false,
      filePath: folder + "/host-" + ++i + ".png",
    });
  }, resolve(".qa"));
  await page.evaluate(() =>
    window.chai.request({ op: "browser", url: "https://example.com/" }),
  );
  await new Promise((r) => setTimeout(r, 1500));
  const before = await app.evaluate(
    ({ webContents }) =>
      webContents
        .getAllWebContents()
        .find((w) => w.getURL().startsWith("https://example.com/")).id,
  );
  const noBridge = await app.evaluate(
    async ({ webContents }, id) =>
      webContents
        .fromId(id)
        .executeJavaScript('typeof window.chai + ":" + typeof require'),
    before,
  );
  assert.equal(noBridge, "undefined:undefined");
  await page.evaluate(() => window.chai.request({ op: "browser-capture" }));
  assert(statSync(".qa/host-1.png").size > 1000);
  await page.evaluate(() =>
    window.chai.request({ op: "browser-click", x: 20, y: 20 }),
  );
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .find((w) => w.getTitle().includes("Isolated browser"))
      ?.setPosition(1600, 650),
  );
  await page.evaluate(() =>
    window.chai.request({ op: "desktop-click", x: 1800, y: 850 }),
  );
  await page.evaluate(() => window.chai.request({ op: "capture" }));
  assert(statSync(".qa/host-2.png").size > 1000);
  const state = await page.evaluate(() =>
    window.chai.request({ op: "snapshot" }),
  );
  assert(state.events.some((e) => e.kind === "DESKTOP_CLICK"));
  assert(state.events.some((e) => e.kind === "BROWSER_CLICK"));
  console.log(
    "PASS controlled host test: isolated browser no Node/bridge, real browser capture/click, real X11 click, real desktop capture, audited events. Native approval dialogs auto-confirmed only by test harness.",
  );
} finally {
  await app.close().catch(() => {});
}
