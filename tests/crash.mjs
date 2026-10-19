import { _electron as electron } from "playwright";
import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
const temp = mkdtempSync(join(tmpdir(), "chai-crash-")),
  root = join(temp, "workspace");
mkdirSync(root);
const start = () =>
  electron.launch({
    args: [resolve(".")],
    env: {
      ...process.env,
      CHAI_DATA_DIR: join(temp, "data"),
      CHAI_TEST_WORKSPACE: root,
    },
  });
let app = await start();
try {
  let page = await app.firstWindow();
  await page
    .getByRole("heading", { name: "Stop chatting. Start doing." })
    .waitFor();
  const id = await page.evaluate(() =>
    window.chai.request({
      op: "create",
      goal: "Crash recovery test",
      mode: "assisted",
      model: "",
      plan: JSON.stringify({
        summary: "Write then wait for controlled crash test",
        actions: [
          { tool: "write", path: "once.txt", content: "once" },
          { tool: "command", command: "wait", seconds: 2 },
        ],
      }),
    }),
  );
  await page.evaluate(
    (id) => window.chai.request({ op: "approve", id, allow: true }),
    id,
  );
  for (let n = 0; n < 100; n++) {
    const s = await page.evaluate(() =>
      window.chai.request({ op: "snapshot" }),
    );
    if (
      s.tasks[0].cursor === 1 &&
      s.events.some(
        (e) => e.kind === "TOOL_STARTED" && e.detail.includes("wait"),
      )
    )
      break;
    if (n === 99) throw Error("Checkpoint not reached");
    await new Promise((r) => setTimeout(r, 50));
  }
  app.process().kill("SIGKILL");
  await new Promise((r) => setTimeout(r, 400));
  app = await start();
  page = await app.firstWindow();
  await page
    .getByRole("heading", { name: "Stop chatting. Start doing." })
    .waitFor();
  const s = await page.evaluate(() => window.chai.request({ op: "snapshot" }));
  assert.equal(s.tasks[0].state, "PAUSED");
  assert.equal(s.tasks[0].cursor, 1);
  assert.equal(readFileSync(join(root, "once.txt"), "utf8"), "once");
  await page.evaluate((id) => window.chai.request({ op: "resume", id }), id);
  await page.evaluate(
    (id) => window.chai.request({ op: "approve", id, allow: true }),
    id,
  );
  for (let n = 0; n < 100; n++) {
    const s = await page.evaluate(() =>
      window.chai.request({ op: "snapshot" }),
    );
    if (s.tasks[0].state === "FAILED") break;
    if (n === 99) throw Error("Ambiguous command not blocked");
    await new Promise((r) => setTimeout(r, 50));
  }
  assert.equal(readFileSync(join(root, "once.txt"), "utf8"), "once");
  console.log(
    "PASS SIGKILL recovery: persisted file checkpoint retained; interrupted command marked ambiguous and not repeated.",
  );
} finally {
  await app.close().catch(() => {});
}
