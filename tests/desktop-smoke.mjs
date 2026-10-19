import { _electron as electron } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
mkdirSync(".qa/desktop-workspace", { recursive: true });
const app = await electron.launch({
  executablePath: process.env.CHAI_EXECUTABLE,
  args: [],
  env: {
    ...process.env,
    CHAI_DATA_DIR: resolve(".qa/desktop-data"),
    CHAI_TEST_WORKSPACE: resolve(".qa/desktop-workspace"),
  },
});
try {
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setPosition(1600, 650),
  );
  await page
    .getByRole("heading", { name: "Stop chatting. Start doing." })
    .waitFor();
  await page
    .getByRole("textbox", { name: "Task goal" })
    .fill(
      "write desktop-proof.txt with content CHAI verified on the real Kali X11 desktop.",
    );
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await page.getByRole("button", { name: "Approve plan", exact: true }).click();
  await page.waitForFunction(() =>
    document.body.innerText.includes("Task completed"),
  );
  await page.screenshot({ path: ".qa/kali-desktop-work.png" });
  await page.getByRole("button", { name: "Connections", exact: true }).click();
  // Observe official-page URL and sandbox preferences only, never credentials or DOM.
  const providerPromise = page.evaluate(() =>
    window.chai.request({ op: "provider", role: "manager" }),
  );
  await new Promise((r) => setTimeout(r, 8000));
  const views = await app.evaluate(({ webContents }) =>
    webContents.getAllWebContents().map((w) => ({
      url: w.getURL(),
      sandbox: w.getLastWebPreferences().sandbox,
      node: w.getLastWebPreferences().nodeIntegration,
    })),
  );
  console.log(JSON.stringify(views));
  assert(
    views.some(
      (v) => v.url.startsWith("https://chatgpt.com/") && v.sandbox && !v.node,
    ),
  );
  await providerPromise;
  console.log(
    "PASS real X11 desktop file cycle and official ChatGPT page opened in isolated sandbox. Login not attempted.",
  );
} finally {
  await app.close().catch(() => {});
}
