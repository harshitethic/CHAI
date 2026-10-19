import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await build({
  entryPoints: ["src/main/index.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "dist/main.cjs",
  external: ["electron"],
  target: "node24",
});
await build({
  entryPoints: ["src/main/preload.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "dist/preload.cjs",
  external: ["electron"],
  target: "node24",
});
await build({
  entryPoints: ["src/renderer/index.tsx"],
  bundle: true,
  platform: "browser",
  outfile: "dist/renderer.js",
  target: "chrome140",
  minify: true,
});
await copyFile("src/renderer/index.html", "dist/index.html");
await copyFile("src/core/files.py", "dist/files.py");
