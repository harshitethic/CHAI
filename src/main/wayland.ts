import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { app } from "electron";
export interface PortalFrame {
  width: number;
  height: number;
  logicalWidth: number;
  logicalHeight: number;
  sourceType: number;
  image: string;
}
export class WaylandSession {
  readonly id = "portal:" + randomUUID();
  private child: ChildProcessWithoutNullStreams;
  private pending = new Map<
    string,
    { resolve: (frame: PortalFrame) => void; reject: (error: Error) => void }
  >();
  private ended = false;
  constructor() {
    const root = app.isPackaged
      ? __dirname.replace("app.asar", "app.asar.unpacked")
      : __dirname;
    this.child = spawn("/usr/bin/python3", ["-u", join(root, "wayland.py")], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let errors = "";
    this.child.stderr.on("data", (data) => {
      errors = (errors + String(data)).slice(-4000);
    });
    createInterface({ input: this.child.stdout }).on("line", (line) => {
      try {
        if (line.length > 3_000_000)
          throw Error("Portal response exceeds limit");
        const row = JSON.parse(line);
        const pending = this.pending.get(row.id);
        if (!pending) return;
        if (row.error) pending.reject(new Error(String(row.error)));
        else {
          const frame = row.result as PortalFrame;
          if (
            !frame ||
            ![
              frame.width,
              frame.height,
              frame.logicalWidth,
              frame.logicalHeight,
            ].every((n) => Number.isFinite(n) && n > 0 && n <= 32768) ||
            typeof frame.image !== "string"
          )
            throw Error("Invalid portal frame");
          pending.resolve(frame);
        }
      } catch (error) {
        this.fail(new Error(String(error)));
      }
    });
    this.child.on("error", (error) => this.fail(error));
    this.child.on("exit", () =>
      this.fail(new Error("Desktop sharing ended. " + errors)),
    );
    this.child.stdin.on("error", (error) => this.fail(error));
  }
  private fail(error: Error) {
    this.ended = true;
    for (const row of this.pending.values()) row.reject(error);
    this.pending.clear();
  }
  async request(
    action: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<PortalFrame> {
    signal?.throwIfAborted();
    if (this.ended)
      throw Error("Desktop sharing ended; choose the source again");
    const id = randomUUID();
    const timeout = setTimeout(
      () => this.close(),
      action.operation === "connect" ? 210000 : 60000,
    );
    const abort = () => this.close();
    signal?.addEventListener("abort", abort, { once: true });
    try {
      return await new Promise<PortalFrame>((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        this.child.stdin.write(JSON.stringify({ ...action, id }) + "\n");
      });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      this.pending.delete(id);
    }
  }
  close() {
    this.fail(new Error("Desktop sharing closed"));
    this.child.kill("SIGTERM");
  }
}
