import { _electron as electron } from "playwright";
import { build } from "esbuild";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
const base = mkdtempSync(join(tmpdir(), "chai-computer-"));
mkdirSync(join(base, "workspace"));
mkdirSync(".qa", { recursive: true });
writeFileSync(
  join(base, "workspace", "index.html"),
  `<!doctype html><title>CHAI browser fixture</title>
<label>Name <input aria-label="Name"></label><button id="apply">Apply greeting</button><p id="result">Waiting</p>
<button id="remove">Delete record</button><a href="https://example.org/">Outside origin</a>
<input type="password" aria-label="Password">
<script>
apply.onclick=()=>result.textContent='Hello '+document.querySelector('input').value;
remove.onclick=()=>result.textContent='Deleted';
fetch('https://example.org/').then(()=>document.body.dataset.network='leaked').catch(()=>document.body.dataset.network='blocked');
fetch('/.env').then(r=>document.body.dataset.protected=String(r.status));
</script>`,
);
writeFileSync(join(base, "workspace", ".env"), "FIXTURE_NOT_A_REAL_SECRET");
await build({
  entryPoints: ["tests/computer-entry.ts"],
  outfile: ".qa/computer-entry.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron"],
  target: "node24",
});
const app = await electron.launch({
  args: [resolve(".qa/computer-entry.cjs")],
  env: {
    ...process.env,
    CHAI_COMPUTER_TEST_DIR: base,
    CHAI_COMPUTER_GATEWAY: resolve("src/core/files.py"),
  },
});
try {
  await app.firstWindow();
  for (let i = 0; !(await app.evaluate(() => !!globalThis.computerTest)); i++) {
    assert(i < 100);
    await new Promise((r) => setTimeout(r, 50));
  }
  const execute = (action) =>
    app.evaluate((_e, a) => globalThis.computerTest.execute(a), action);
  let obs = await execute({
    tool: "browser",
    operation: "preview",
    path: "index.html",
  });
  assert.equal(obs.title, "CHAI browser fixture");
  assert(obs.imageId);
  const name = obs.controls.find((c) => c.label === "Name"),
    apply = obs.controls.find((c) => c.label === "Apply greeting");
  assert(name && apply);
  const originalSnapshot = obs.snapshot;
  await execute({
    tool: "browser",
    operation: "type",
    snapshot: obs.snapshot,
    ref: name.ref,
    text: "CHAI",
  });
  // A batch may reuse observed nodes in the same unchanged document.
  obs = await execute({
    tool: "browser",
    operation: "click",
    snapshot: originalSnapshot,
    ref: apply.ref,
  });
  assert.match(obs.text, /Hello CHAI/);
  const browser = (await app.windows()).find((p) =>
    p.url().startsWith("chai-preview:"),
  );
  assert(browser);
  assert.equal(
    await browser.evaluate(() => document.body.dataset.network),
    "blocked",
  );
  assert.equal(
    await browser.evaluate(() => document.body.dataset.protected),
    "403",
  );
  assert(!obs.text.includes("FIXTURE_NOT_A_REAL_SECRET"));
  await assert.rejects(
    execute({
      tool: "browser",
      operation: "open",
      url: "https://example.org/",
    }),
    /outside/,
  );
  await assert.rejects(
    execute({
      tool: "browser",
      operation: "click",
      snapshot: "00000000-0000-4000-8000-000000000000",
      ref: "e0",
    }),
    /Stale/,
  );
  const password = obs.controls.find((c) => c.type === "password");
  await assert.rejects(
    execute({
      tool: "browser",
      operation: "type",
      snapshot: obs.snapshot,
      ref: password.ref,
      text: "never",
    }),
    /Credential/,
  );
  const dangerous = obs.controls.find((c) => c.label === "Delete record");
  await assert.rejects(
    execute({
      tool: "browser",
      operation: "click",
      snapshot: obs.snapshot,
      ref: dangerous.ref,
    }),
    /declined/,
  );
  assert.equal(
    await app.evaluate(() => globalThis.computerTest.consentCalls()),
    1,
  );
  await app.evaluate(() => globalThis.computerTest.deny());
  await assert.rejects(
    execute({ tool: "browser", operation: "observe" }),
    /not authorized/,
  );
  await app.evaluate(() => globalThis.computerTest.allow());
  const sources = await app.evaluate(({ webContents }) =>
    webContents
      .getAllWebContents()
      .filter((w) => w.getURL().startsWith("chai-preview:"))
      .map((w) => w.getLastWebPreferences()),
  );
  assert(
    sources.every((p) => p.sandbox && p.contextIsolation && !p.nodeIntegration),
  );
  assert((await app.evaluate(() => globalThis.computerTest.imageCount())) >= 3);
  if (process.env.CHAI_TEST_DESKTOP === "1") {
    await app.evaluate(() => globalThis.computerTest.createDesktop());
    let frame = await execute({ tool: "desktop", operation: "observe" });
    assert(frame.imageId && frame.width > 0);
    frame = await execute({
      tool: "desktop",
      operation: "click",
      snapshot: frame.snapshot,
      x: Math.floor(frame.width * 0.4),
      y: Math.floor(frame.height * 0.3),
    });
    frame = await execute({
      tool: "desktop",
      operation: "type",
      snapshot: frame.snapshot,
      text: "CHAI selected-window proof",
    });
    assert.equal(
      await app.evaluate(() => globalThis.computerTest.desktopValue()),
      "CHAI selected-window proof",
    );
    await assert.rejects(
      execute({
        tool: "desktop",
        operation: "click",
        snapshot: frame.snapshot,
        x: 20000,
        y: 20000,
      }),
      /outside/,
    );
    await app.evaluate(() => globalThis.computerTest.tamperPid());
    await assert.rejects(
      execute({ tool: "desktop", operation: "observe" }),
      /replaced/,
    );
    console.log(
      "PASS real X11 selected-window capture, click, type, coordinate and PID guards.",
    );
  }
  console.log(
    "PASS isolated browser preview, capture, observed click/type, denied origin/network/secret/password, stale refs, sensitive-action consent and denied capability.",
  );
} finally {
  await app.close().catch(() => {});
}
