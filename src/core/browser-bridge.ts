import { createHash, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { Store } from "./store";
import {
  ProviderUnavailable,
  validateRoleOutput,
  type AgentAdapter,
  type AgentRequest,
} from "./agents";
import type { Role } from "./contracts";
const roleSchema = z.enum(["manager", "builder", "reviewer"]);
export class BrowserBridge implements AgentAdapter {
  readonly name = "ChatGPT browser · tool bridge";
  connected = false;
  lastSeen: string | null = null;
  deliver?: (role: Role, id: string, signal: AbortSignal) => Promise<void>;
  constructor(readonly store: Store) {
    store.db.exec(`CREATE TABLE IF NOT EXISTS browser_jobs(
      id TEXT PRIMARY KEY, callKey TEXT NOT NULL, taskId TEXT NOT NULL,
      role TEXT NOT NULL, body TEXT NOT NULL, response TEXT,
      status TEXT NOT NULL, created TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS browser_jobs_call ON browser_jobs(callKey);
      CREATE TABLE IF NOT EXISTS browser_delivery(id TEXT PRIMARY KEY,sent TEXT NOT NULL);`);
  }
  jobs() {
    return this.store.db
      .prepare(
        "SELECT id,taskId,role,status,created FROM browser_jobs ORDER BY rowid DESC LIMIT 30",
      )
      .all()
      .map((r) => ({
        id: String(r.id),
        taskId: String(r.taskId),
        role: String(r.role),
        status: String(r.status),
        created: String(r.created),
      }));
  }
  async send(request: AgentRequest, signal: AbortSignal): Promise<unknown> {
    if (!request.taskId || !request.callId)
      throw new ProviderUnavailable(
        "Browser request lacks a persistent task identity.",
      );
    signal.throwIfAborted();
    let row = this.store.db
      .prepare(
        "SELECT * FROM browser_jobs WHERE callKey=? AND status!='CANCELED' ORDER BY rowid DESC LIMIT 1",
      )
      .get(request.callId);
    if (row?.status === "ANSWERED") return JSON.parse(String(row.response));
    if (!this.connected)
      throw new ProviderUnavailable(
        "Connect the CHAI tools plugin to normal ChatGPT first.",
      );

    if (!row) {
      const id = randomUUID();
      this.store.db
        .prepare("INSERT INTO browser_jobs VALUES(?,?,?,?,?,?,?,?)")
        .run(
          id,
          request.callId,
          request.taskId,
          request.role,
          JSON.stringify(request),
          null,
          "WAITING",
          new Date().toISOString(),
        );
      row = this.store.db
        .prepare("SELECT * FROM browser_jobs WHERE id=?")
        .get(id)!;
      this.store.event(
        request.taskId,
        request.role,
        "BROWSER_JOB_READY",
        "Waiting for the normal ChatGPT conversation to answer job " + id,
      );
    }
    const id = String(row.id);
    if (row.status === "ANSWERED") return JSON.parse(String(row.response));
    try {
      const delivered = this.store.db
        .prepare("SELECT 1 FROM browser_delivery WHERE id=?")
        .get(id);
      if (this.deliver && !delivered) {
        await this.deliver(request.role, id, signal);
        this.store.db
          .prepare("INSERT OR IGNORE INTO browser_delivery VALUES(?,?)")
          .run(id, new Date().toISOString());
      }
      const deadline = Date.now() + 10 * 60 * 1000;
      while (Date.now() < deadline) {
        signal.throwIfAborted();
        const current = this.store.db
          .prepare("SELECT status,response FROM browser_jobs WHERE id=?")
          .get(id);
        if (current?.status === "ANSWERED")
          return JSON.parse(String(current.response));
        if (!current || current.status === "CANCELED")
          throw new ProviderUnavailable("Browser job was canceled.");
        await delay(350, undefined, { signal });
      }
      throw new ProviderUnavailable(
        "ChatGPT browser response timed out. Check login, tool connection and service limits, then resume.",
      );
    } catch (error) {
      if (signal.aborted)
        this.store.db
          .prepare(
            "UPDATE browser_jobs SET status='CANCELED' WHERE id=? AND status='WAITING'",
          )
          .run(id);
      throw error;
    }
  }
  get(id: string, role: Role) {
    roleSchema.parse(role);
    const row = this.store.db
      .prepare("SELECT * FROM browser_jobs WHERE id=?")
      .get(z.uuid().parse(id));
    if (!row || row.role !== role || row.status === "CANCELED")
      throw Error("No active job for this role.");
    const task = this.store.get(String(row.taskId));
    if (
      !["PLANNING", "VALIDATING", "RUNNING", "WAITING_PROVIDER"].includes(
        task.state,
      )
    )
      throw Error("Task is paused or finished.");
    this.lastSeen = new Date().toISOString();
    const request = JSON.parse(String(row.body)) as AgentRequest;
    return {
      id,
      role,
      status: row.status,
      phase: request.phase,
      instructions: request.system,
      input: JSON.parse(request.input),
      responseSchema: request.schema,
    };
  }
  images(id: string, role: Role) {
    const job = this.get(id, role);
    const taskId = this.store.db
      .prepare("SELECT taskId FROM browser_jobs WHERE id=?")
      .get(id)!.taskId;
    const ids = new Set<string>();
    for (const row of job.input?.evidence?.outputs ?? [])
      if (typeof row.output?.imageId === "string") ids.add(row.output.imageId);
    return [...ids].slice(-2).flatMap((imageId) => {
      const image = this.store.db
        .prepare("SELECT data FROM task_images WHERE id=? AND taskId=?")
        .get(imageId, taskId);
      return image
        ? [
            {
              type: "image" as const,
              mimeType: "image/jpeg",
              data: String(image.data),
            },
          ]
        : [];
    });
  }
  answer(id: string, role: Role, value: unknown) {
    const existing = this.store.db
      .prepare("SELECT * FROM browser_jobs WHERE id=?")
      .get(z.uuid().parse(id));
    if (!existing || existing.role !== role || existing.status === "CANCELED")
      throw Error("No active job for this role.");
    const phase = (JSON.parse(String(existing.body)) as AgentRequest).phase;
    const parsed = validateRoleOutput(phase, value);
    const encoded = JSON.stringify(parsed);
    if (encoded.length > 120000) throw Error("Answer is too large.");
    const row = this.store.db
      .prepare("SELECT response,status,taskId FROM browser_jobs WHERE id=?")
      .get(id)!;
    if (row.status === "ANSWERED") {
      if (
        createHash("sha256").update(String(row.response)).digest("hex") !==
        createHash("sha256").update(encoded).digest("hex")
      )
        throw Error("This job already has a different accepted answer.");
      return { accepted: true, duplicate: true };
    }
    this.get(id, role);
    this.store.db
      .prepare(
        "UPDATE browser_jobs SET response=?,status='ANSWERED' WHERE id=? AND status='WAITING'",
      )
      .run(encoded, id);
    this.store.event(
      String(row.taskId),
      role,
      "BROWSER_ANSWER_RECEIVED",
      "Structured result received through the ChatGPT tool connection.",
    );
    return {
      accepted: true,
      message:
        "CHAI will validate this result. Tool execution follows the local user's recorded permission scope. Do not perform other roles.",
    };
  }
}
