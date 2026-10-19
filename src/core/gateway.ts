import { spawn } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { redact, type Action } from "./contracts";
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
      workspace(root),
      signal,
      JSON.stringify({ root: workspace(root), op, path, ...extra }),
    );
    return JSON.parse(output);
  }
  async command(
    root: string,
    action: Extract<Action, { tool: "command" }>,
    signal: AbortSignal,
  ) {
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
    return this.run(exe, args, workspace(root), signal, undefined, 65000);
  }
  stop() {
    for (const child of this.children) {
      try {
        process.kill(-child.pid!, "SIGKILL");
      } catch {
        /* gone */
      }
    }
  }
}
