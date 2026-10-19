import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { Store } from "../src/core/store";
import { Gateway } from "../src/core/gateway";
import { ProjectRuntime } from "../src/core/project";
const base = mkdtempSync(join(tmpdir(), "chai-documents-"));
mkdirSync(join(base, "source"));
mkdirSync(join(base, "projects"));
const store = new Store(join(base, "data.sqlite"));
const gateway = new Gateway(resolve("src/core/files.py"));
const runtime = new ProjectRuntime(store, gateway, join(base, "projects"));
gateway.project = runtime;
const task = store.create(
  "Create and verify four document formats",
  join(base, "source"),
  "assisted",
  "fixture",
);
task.capabilities = {
  project: true,
  network: true,
  browser: false,
  origins: [],
};
store.put(task);
try {
  await runtime.prepare(task);
  const results = [];
  for (const format of ["pdf", "docx", "xlsx", "pptx"] as const) {
    const result = await runtime.artifact(
      task,
      {
        tool: "artifact",
        operation: "create",
        format,
        path: "outputs/proof." + format,
        title: "CHAI document verification",
        paragraphs: [
          "A document generated inside the isolated project.",
          "The original project remains unchanged.",
        ],
        rows: [
          ["Check", "Result"],
          ["Real generation", "Passed"],
        ],
        slides: [
          {
            title: "CHAI document verification",
            body: [
              "Generated inside the isolated project",
              "Recorded output hash and size",
            ],
          },
        ],
      },
      new AbortController().signal,
    );
    assert(!Array.isArray(result));
    if (Array.isArray(result)) throw Error("Expected document");
    assert(result.bytes > 100);
    const content = readFileSync(join(task.root, result.path));
    assert(
      format === "pdf"
        ? content.subarray(0, 4).toString() === "%PDF"
        : content.subarray(0, 2).toString() === "PK",
    );
    results.push(result);
    console.log("DOCUMENT_PASS", format, result.bytes);
  }
  mkdirSync(".qa", { recursive: true });
  writeFileSync(
    ".qa/documents-verification.json",
    JSON.stringify(
      { verifiedAt: new Date().toISOString(), root: task.root, results },
      null,
      2,
    ),
  );
  console.log("DOCUMENTS_E2E_PASS");
} finally {
  runtime.stop();
  store.close();
}
