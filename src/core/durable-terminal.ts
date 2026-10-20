import { spawn } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { redact, type TerminalSession } from "./contracts";

export class DurableTerminals {
  constructor(readonly directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  private root(id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw Error("Invalid terminal identity");
    return join(this.directory, id);
  }
  launch(
    record: TerminalSession,
    argv: string[],
    cwd: string,
    env: NodeJS.ProcessEnv,
    timeout: number,
  ) {
    const root = this.root(record.id);
    mkdirSync(root, { mode: 0o700 });
    writeFileSync(
      join(root, "config.json"),
      JSON.stringify({ argv, cwd, env, timeout }),
      { mode: 0o600, flag: "wx" },
    );
    const packaged = resolve(
      typeof __dirname === "string" ? __dirname : "dist",
      "terminal-worker.py",
    ).replace("app.asar/", "app.asar.unpacked/");
    const script = existsSync(packaged)
      ? packaged
      : resolve("src/core/terminal-worker.py");
    const worker = spawn("/usr/bin/python3", ["-u", script, root], {
      detached: true,
      stdio: "ignore",
      env: { PATH: "/usr/bin:/bin", LANG: "C.UTF-8" },
    });
    worker.on("error", () => {
      /* Missing receipt is surfaced as interrupted. */
    });
    worker.unref();
  }
  refresh(record: TerminalSession): TerminalSession {
    if (!record.durable || record.state !== "running") return record;
    try {
      const receipt = JSON.parse(
        readFileSync(join(this.root(record.id), "status.json"), "utf8"),
      );
      record.output = redact(String(receipt.output).slice(-240000));
      record.exitCode =
        typeof receipt.exitCode === "number" ? receipt.exitCode : null;
      record.termination = receipt.termination;
      if (receipt.state === "exited") record.state = "exited";
      else if (Date.now() - receipt.heartbeat > 10000) {
        record.state = "interrupted";
        record.termination =
          "Terminal supervisor unavailable; command was not replayed";
      }
    } catch {
      if (Date.now() - Date.parse(record.created) > 10000) {
        record.state = "interrupted";
        record.termination =
          "No durable launch receipt; inspect the command before retrying";
      }
    }
    return record;
  }
  control(id: string, op: "input" | "stop", input = "") {
    const path = join(this.root(id), `control-${Date.now()}-${randomUUID()}`);
    writeFileSync(path + ".tmp", JSON.stringify({ op, input }), {
      mode: 0o600,
      flag: "wx",
    });
    renameSync(path + ".tmp", path + ".json");
  }
  async wait(record: TerminalSession, signal: AbortSignal) {
    while (this.refresh(record).state === "running") {
      signal.throwIfAborted();
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    return record;
  }
}
