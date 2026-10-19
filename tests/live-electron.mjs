/** Opt-in real-model desktop integration. Approvals are limited to a disposable fixture. */
import { _electron as electron } from "playwright";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
const model = process.env.CHAI_TEST_MODEL;
if (!model)
  throw Error("CHAI_TEST_MODEL must name an installed real Ollama model");
const base = mkdtempSync(join(tmpdir(), "chai-live-ui-"));
const root = join(base, "workspace");
mkdirSync(root);
writeFileSync(
  join(root, "brief.md"),
  "Project: CHAI\nStatus: draft\nOwner: user\n",
);
mkdirSync(".qa", { recursive: true });
const launch = () =>
  electron.launch({
    executablePath: process.env.CHAI_EXECUTABLE || undefined,
    args: [resolve(".")],
    env: {
      ...process.env,
      CHAI_DATA_DIR: join(base, "data"),
      CHAI_TEST_WORKSPACE: root,
    },
  });
let app = await launch();
try {
  let page = await app.firstWindow();
  await page
    .getByRole("heading", { name: "Stop chatting. Start doing." })
    .waitFor();
  await page.waitForFunction(
    (model) =>
      [
        ...document.querySelectorAll('select[aria-label="Team model"] option'),
      ].some((o) => o.value === model),
    model,
  );
  await page
    .getByRole("combobox", { name: "Team model", exact: true })
    .selectOption(model);
  await page
    .getByRole("textbox", { name: "Task goal" })
    .fill(
      "In brief.md, replace exactly 'Status: draft' with 'Status: ready'. Keep every other line unchanged. Read the existing file before proposing an edit, and verify the final content.",
    );
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  for (let n = 0; n < 4; n++) {
    let s;
    const deadline = Date.now() + 240000;
    while (Date.now() < deadline) {
      s = await page.evaluate(() => window.chai.request({ op: "snapshot" }));
      if (
        s.tasks[0] &&
        ["WAITING_APPROVAL", "WAITING_PROVIDER", "DONE", "FAILED"].includes(
          s.tasks[0].state,
        )
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    const t = s.tasks[0];
    console.log(t.state, "round", t.agent?.round, t.error ?? "");
    if (t.state === "DONE") break;
    assert.equal(t.state, "WAITING_APPROVAL", t.error ?? "Unexpected state");
    for (const action of t.plan.actions.slice(t.cursor)) {
      assert(action.tool !== "command");
      assert.equal(action.path, action.tool === "list" ? "." : "brief.md");
    }
    await page
      .getByRole("button", { name: "Approve plan", exact: true })
      .waitFor();
    await page.screenshot({ path: `.qa/live-approval-${n}.png` });
    await page
      .getByRole("button", { name: "Approve plan", exact: true })
      .click();
  }
  const snapshot = await page.evaluate(() =>
    window.chai.request({ op: "snapshot" }),
  );
  assert.equal(snapshot.tasks[0].state, "DONE");
  assert.equal(
    readFileSync(join(root, "brief.md"), "utf8"),
    "Project: CHAI\nStatus: ready\nOwner: user\n",
  );
  assert(snapshot.events.some((e) => e.kind === "REVIEW_REJECTED"));
  assert(snapshot.events.some((e) => e.kind === "REVIEW_PASSED"));
  await page.getByRole("heading", { name: "Verified result" }).waitFor();
  await page.screenshot({ path: ".qa/live-team-result.png" });
  writeFileSync(
    ".qa/live-electron.json",
    JSON.stringify({ model, root, snapshot }, null, 2),
  );
  const id = snapshot.tasks[0].id;
  await app.close();
  app = await launch();
  page = await app.firstWindow();
  await page
    .getByRole("heading", { name: "Stop chatting. Start doing." })
    .waitFor();
  const again = await page.evaluate(() =>
    window.chai.request({ op: "snapshot" }),
  );
  assert(
    again.tasks.some(
      (t) => t.id === id && t.state === "DONE" && t.agent?.report,
    ),
  );
  assert.equal(again.selectedModel, model);
  console.log(
    "PASS: real-model UI discovery → rejected incomplete work → fresh approval → exact edit → independent review → persisted report and model selection.",
  );
} finally {
  await app.close().catch(() => {});
}
