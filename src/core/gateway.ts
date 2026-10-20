import {
  gitAction,
  gitHead,
  gitLegacyInspection,
  type GitAction,
  type GitConsent,
} from "./git";
import { createHash } from "node:crypto";
import { sandboxRun, type RunAction } from "./sandbox";
import { spawn } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { redact, type Action, type Task } from "./contracts";
export function workspace(path: string) {
  const root = realpathSync(path);
  if (
    !statSync(root).isDirectory() ||
    [homedir(), "/", "/home", "/tmp", "/etc", "/usr", "/var"].includes(root) ||
    root
      .split("/")
      .some((p) => [".ssh", ".config", ".gnupg", ".aws"].includes(p))
  )
    throw Error(
      "Select a dedicated project folder, not a system or home folder",
    );
  return root;
}
export class Gateway {
  project?: import("./project").ProjectRuntime;
  connectors?: import("./connectors").Connectors;
  gitConsent?: GitConsent;
  private workspaceRoot(path: string) {
    const root = realpathSync(path);
    if (this.project?.ownsRoot(root) && statSync(root).isDirectory())
      return root;
    return workspace(root);
  }
  git(root: string, action: GitAction, branch: string, signal: AbortSignal) {
    return gitAction(
      this,
      this.workspaceRoot(root),
      action,
      branch,
      signal,
      this.gitConsent,
    );
  }
  computer?: (
    task: Task,
    action: Extract<Action, { tool: "browser" | "desktop" }>,
    signal: AbortSignal,
  ) => Promise<unknown>;
  children = new Set<ReturnType<typeof spawn>>();
  constructor(readonly script: string) {}
  run(
    exe: string,
    args: string[],
    cwd: string,
    signal?: AbortSignal,
    input?: string,
    timeout = 15000,
  ): Promise<string> {
    return new Promise((resolvePromise, reject) => {
      if (signal?.aborted) return reject(Error("Canceled"));
      const child = spawn(exe, args, {
        cwd,
        detached: true,
        env: {
          PATH: "/usr/local/bin:/usr/bin:/bin",
          LANG: "C.UTF-8",
          HOME: cwd,
          ...(process.env.DISPLAY ? { DISPLAY: process.env.DISPLAY } : {}),
          ...(process.env.XAUTHORITY
            ? { XAUTHORITY: process.env.XAUTHORITY }
            : {}),
          ...(process.env.DBUS_SESSION_BUS_ADDRESS
            ? { DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS }
            : {}),
          ...(process.env.XDG_RUNTIME_DIR
            ? { XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR }
            : {}),
          GIT_CONFIG_NOSYSTEM: "1",
          GIT_CONFIG_GLOBAL: "/dev/null",
          GIT_OPTIONAL_LOCKS: "0",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });
      this.children.add(child);
      let output = "",
        error = "",
        settled = false;
      const kill = () => {
        try {
          process.kill(-child.pid!, "SIGKILL");
        } catch {
          /* already exited */
        }
      };
      const timer = setTimeout(() => {
        error = "Command timeout";
        kill();
      }, timeout);
      const abort = () => {
        error = "Canceled";
        kill();
      };
      signal?.addEventListener("abort", abort, { once: true });
      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        this.children.delete(child);
        if (err) reject(err);
        else resolvePromise(output);
      };
      child.stdout.on("data", (d: Buffer) => {
        output += d.toString();
        if (output.length > 200000) {
          error = "Output limit";
          kill();
        }
      });
      child.stderr.on("data", (d: Buffer) => {
        error = (error + d.toString()).slice(0, 12000);
      });
      child.on("error", finish);
      child.on("close", (code) =>
        finish(
          code === 0 && !signal?.aborted
            ? undefined
            : Error(redact(error || output || `Exit ${code}`)),
        ),
      );
      child.stdin.on("error", () => {});
      child.stdin.end(input);
    });
  }
  async file(
    root: string,
    op: string,
    path: string,
    extra: Record<string, unknown> = {},
    signal?: AbortSignal,
  ): Promise<{
    content?: string | null;
    hash?: string;
    entries?: string[];
    bytes?: number;
  }> {
    const output = await this.run(
      "/usr/bin/python3",
      [resolve(this.script)],
      this.workspaceRoot(root),
      signal,
      JSON.stringify({ root: this.workspaceRoot(root), op, path, ...extra }),
    );
    return JSON.parse(output);
  }
  async command(
    root: string,
    action: Extract<Action, { tool: "command" }>,
    signal: AbortSignal,
  ) {
    if (action.command === "git-status" || action.command === "git-diff")
      return gitLegacyInspection(
        this,
        this.workspaceRoot(root),
        action.command,
        signal,
      );
    const commands: Record<string, [string, string[]]> = {
      pwd: ["/usr/bin/pwd", []],
      "node-version": ["/usr/bin/node", ["--version"]],
      "git-status": [
        "/usr/bin/git",
        [
          "-c",
          "core.fsmonitor=false",
          "-c",
          "core.hooksPath=/dev/null",
          "status",
          "--short",
          "--untracked-files=no",
        ],
      ],
      "git-diff": [
        "/usr/bin/git",
        [
          "-c",
          "core.fsmonitor=false",
          "-c",
          "core.hooksPath=/dev/null",
          "diff",
          "--no-ext-diff",
          "--no-textconv",
          "--stat",
        ],
      ],
      wait: ["/usr/bin/sleep", [String(action.seconds ?? 10)]],
    };
    const [exe, args] = commands[action.command];
    return this.run(
      exe,
      args,
      this.workspaceRoot(root),
      signal,
      undefined,
      65000,
    );
  }
  async prepareRuns(root: string, actions: Action[], signal?: AbortSignal) {
    const written = new Map<string, string>();
    for (const action of actions) {
      if (action.tool === "write") written.set(action.path, action.content);
      if (action.tool !== "run" && action.tool !== "git") continue;
      if (action.tool === "git")
        action.expectedHead = await gitHead(
          this,
          this.workspaceRoot(root),
          signal ?? new AbortController().signal,
        );
      const hashes: Record<string, string> = Object.create(null);
      for (const path of action.tool === "git" ? action.paths : action.files) {
        const planned = written.get(path);
        if (planned !== undefined)
          hashes[path] = createHash("sha256").update(planned).digest("hex");
        else {
          const file = await this.file(root, "read", path, {}, signal);
          if (file.content == null || !file.hash)
            throw Error("Missing sandbox input: " + path);
          hashes[path] = file.hash;
        }
      }
      action.expectedHashes = hashes;
    }
  }
  sandbox(root: string, action: RunAction, signal: AbortSignal) {
    return sandboxRun(this, this.workspaceRoot(root), action, signal);
  }
  stop(preserveDurable = false) {
    this.project?.stop(preserveDurable);
    for (const child of this.children) {
      try {
        process.kill(-child.pid!, "SIGKILL");
      } catch {
        /* gone */
      }
    }
  }
}
