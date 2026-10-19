import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ToolServer } from "../core/tool-server";
import { BrowserBridge } from "../core/browser-bridge";
export class ToolBridgeRuntime {
  private server?: ToolServer;
  private tunnel?: ChildProcess;
  private generation = 0;
  state: "stopped" | "starting" | "ready" | "error" = "stopped";
  error: string | null = null;
  url: string | null = null;
  constructor(
    readonly bridge: BrowserBridge,
    readonly home: string,
    readonly consent: (message: string) => Promise<boolean>,
  ) {}
  async start(stableOrigin?: string) {
    if (this.state === "starting" || this.state === "ready") return;
    const generation = ++this.generation;
    this.state = "starting";
    this.error = null;
    await this.dispose();
    if (generation !== this.generation) return;
    const server = new ToolServer(this.bridge, this.consent);
    this.server = server;
    try {
      const port = await server.listen(40671);
      if (generation !== this.generation) {
        await server.close();
        return;
      }
      let origin = stableOrigin;
      if (!origin) {
        const binary = [
          join(this.home, ".local/bin/cloudflared"),
          "/usr/bin/cloudflared",
          "/usr/local/bin/cloudflared",
        ].find(existsSync);
        if (!binary)
          throw Error(
            "cloudflared is not installed. Configure a stable HTTPS forwarding URL or install cloudflared.",
          );
        const child = spawn(
          binary,
          [
            "tunnel",
            "--config",
            "/dev/null",
            "--no-autoupdate",
            "--protocol",
            "http2",
            "--url",
            "http://127.0.0.1:" + port,
          ],
          { stdio: ["ignore", "pipe", "pipe"] },
        );
        this.tunnel = child;
        origin = await new Promise<string>((resolve, reject) => {
          let output = "",
            settled = false;
          const timer = setTimeout(
            () => finish(new Error("Temporary tunnel did not become ready.")),
            30000,
          );
          const read = (data: Buffer) => {
            output = (output + data.toString()).slice(-12000);
            const match = output.match(
              /https:\/\/[a-z0-9-]+\.trycloudflare\.com/,
            );
            if (match) finish(undefined, match[0]);
          };
          const finish = (error?: Error, url?: string) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            child.stdout?.off("data", read);
            child.stderr?.off("data", read);
            if (error) reject(error);
            else resolve(url!);
          };
          child.stdout?.on("data", read);
          child.stderr?.on("data", read);
          child.once("error", () =>
            finish(new Error("Could not start the temporary tunnel.")),
          );
          child.once("exit", () => {
            finish(new Error("Temporary tunnel exited."));
            if (generation === this.generation && this.state === "ready") {
              this.state = "error";
              this.error =
                "Tool tunnel disconnected. Reconnect tools, then resume.";
              this.bridge.connected = false;
            }
          });
        });
      }
      if (generation !== this.generation) return;
      server.configure(origin);
      this.url = server.publicUrl + "/mcp";
      this.state = "ready";
    } catch (error) {
      if (generation !== this.generation) return;
      await this.dispose();
      this.state = "error";
      this.error = String(error);
      throw error;
    }
  }
  private async dispose() {
    this.bridge.connected = false;
    const tunnel = this.tunnel,
      server = this.server;
    this.tunnel = undefined;
    this.server = undefined;
    this.url = null;
    tunnel?.kill("SIGTERM");
    await server?.close();
  }
  async stop() {
    ++this.generation;
    this.state = "stopped";
    this.error = null;
    await this.dispose();
  }
  snapshot() {
    return {
      state: this.state,
      error: this.error,
      url: this.url,
      connected: this.bridge.connected,
      lastSeen: this.bridge.lastSeen,
      jobs: this.bridge.jobs(),
    };
  }
}
