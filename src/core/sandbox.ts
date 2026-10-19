import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { Gateway } from "./gateway";
import { actionSchema, type Action } from "./contracts";

export type RunAction = Extract<Action, { tool: "run" }>;
export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  termination: "timeout" | "output-limit" | null;
  durationMs: number;
  files: { path: string; sha256: string }[];
  isolation: "bubblewrap";
}
export async function sandboxRun(
  gateway: Gateway,
  root: string,
  raw: RunAction,
  signal: AbortSignal,
): Promise<RunResult> {
  const action = actionSchema.parse(raw) as RunAction;
  if (action.tool !== "run") throw Error("Expected sandbox run");
  if (process.platform !== "linux" || !existsSync("/usr/bin/bwrap"))
    throw Error(
      "Sandbox unavailable: install bubblewrap. Execution is refused without isolation.",
    );
  if (
    !action.expectedHashes ||
    action.files.some((path) => !Object.hasOwn(action.expectedHashes!, path))
  )
    throw Error("Sandbox input hashes are missing; prepare a fresh plan.");
  const staged = await mkdtemp(join(tmpdir(), "chai-sandbox-"));
  const files: RunResult["files"] = [];
  let bytes = 0;
  try {
    for (const path of action.files) {
      signal.throwIfAborted();
      // Descriptor-relative gateway rejects symlinks, hardlinks, traversal and secret paths.
      const file = await gateway.file(root, "read", path, {}, signal);
      if (file.content == null || !file.hash)
        throw Error("Sandbox input is missing: " + path);
      if (file.hash !== action.expectedHashes[path])
        throw Error("Sandbox input changed since approval: " + path);
      bytes += Buffer.byteLength(file.content);
      if (bytes > 1000000) throw Error("Sandbox input budget exceeded (1 MB).");
      const target = resolve(staged, path);
      if (!target.startsWith(staged + "/"))
        throw Error("Invalid sandbox input path");
      await mkdir(dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, file.content, { mode: 0o600, flag: "wx" });
      files.push({ path, sha256: file.hash });
    }
    const runner = resolve(dirname(gateway.script), "sandbox.py");
    const args = [
      "--unshare-all",
      "--unshare-user",
      "--disable-userns",
      "--die-with-parent",
      "--new-session",
      "--cap-drop",
      "ALL",
      "--ro-bind",
      "/usr",
      "/usr",
    ];
    for (const dir of ["/lib", "/lib64", "/bin"])
      if (existsSync(dir)) args.push("--ro-bind", dir, dir);
    args.push(
      "--proc",
      "/proc",
      "--dev",
      "/dev",
      "--size",
      "67108864",
      "--tmpfs",
      "/tmp",
      "--ro-bind",
      staged,
      "/workspace",
      "--ro-bind",
      runner,
      "/chai-runner.py",
      "--chdir",
      "/workspace",
      "--clearenv",
      "--setenv",
      "PATH",
      "/usr/bin:/bin",
      "--setenv",
      "LANG",
      "C.UTF-8",
      "--setenv",
      "TMPDIR",
      "/tmp",
      "/usr/bin/python3",
      "-I",
      "-B",
      "/chai-runner.py",
    );
    const output = await gateway.run(
      "/usr/bin/bwrap",
      args,
      staged,
      signal,
      JSON.stringify({
        program: action.program,
        args: action.args,
        timeoutSeconds: action.timeoutSeconds,
      }),
      (action.timeoutSeconds + 5) * 1000,
    );
    const result = JSON.parse(output);
    if (
      !Number.isInteger(result.exitCode) ||
      typeof result.stdout !== "string" ||
      typeof result.stderr !== "string" ||
      ![null, "timeout", "output-limit"].includes(result.termination)
    )
      throw Error("Invalid sandbox execution evidence");
    return { ...result, files, isolation: "bubblewrap" };
  } finally {
    await rm(staged, { recursive: true, force: true });
  }
}
