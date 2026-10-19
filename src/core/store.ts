import { DatabaseSync } from "node:sqlite";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import {
  redact,
  type Event,
  type Task,
  type State,
  type ActionEvidence,
} from "./contracts";
export class Store {
  readonly db: DatabaseSync;
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    chmodSync(path, 0o600);
    this.db
      .exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,body TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,taskId TEXT NOT NULL,role TEXT NOT NULL,kind TEXT NOT NULL,detail TEXT NOT NULL,created TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS effects(id TEXT PRIMARY KEY,taskId TEXT NOT NULL,idx INTEGER NOT NULL,state TEXT NOT NULL,before TEXT,after TEXT,output TEXT);
  CREATE TABLE IF NOT EXISTS approvals(taskId TEXT PRIMARY KEY,plan TEXT NOT NULL,expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS agent_calls(id TEXT PRIMARY KEY,taskId TEXT NOT NULL,role TEXT NOT NULL,round INTEGER NOT NULL,status TEXT NOT NULL,request TEXT NOT NULL,response TEXT,updated TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS task_grants(taskId TEXT PRIMARY KEY,root TEXT NOT NULL,granted TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS task_images(id TEXT PRIMARY KEY,taskId TEXT NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL);
  PRAGMA user_version=4;`);
  }
  put(task: Task) {
    this.db
      .prepare("INSERT OR REPLACE INTO tasks VALUES (?,?)")
      .run(task.id, JSON.stringify(task));
  }
  get(id: string): Task {
    const row = this.db.prepare("SELECT body FROM tasks WHERE id=?").get(id);
    if (!row) throw Error("Unknown task");
    return JSON.parse(String(row.body));
  }
  tasks(): Task[] {
    return this.db
      .prepare("SELECT body FROM tasks ORDER BY rowid DESC")
      .all()
      .map((r) => JSON.parse(String(r.body)));
  }
  event(taskId: string, role: Event["role"], kind: string, detail: string) {
    this.db
      .prepare(
        "INSERT INTO events(taskId,role,kind,detail,created) VALUES(?,?,?,?,?)",
      )
      .run(
        taskId,
        role,
        kind,
        redact(detail).slice(0, 12000),
        new Date().toISOString(),
      );
  }
  events(taskId?: string): Event[] {
    return this.db
      .prepare(
        taskId
          ? "SELECT * FROM events WHERE taskId=? ORDER BY id DESC LIMIT 500"
          : "SELECT * FROM events ORDER BY id DESC LIMIT 500",
      )
      .all(...(taskId ? [taskId] : []))
      .reverse() as unknown as Event[];
  }
  actionEvidence(taskId: string): ActionEvidence[] {
    return this.db
      .prepare(
        "SELECT idx,state,output FROM effects WHERE taskId=? ORDER BY idx",
      )
      .all(taskId)
      .map((row) => {
        const result: ActionEvidence = {
          idx: Number(row.idx),
          state: String(row.state),
        };
        try {
          const output = JSON.parse(String(row.output));
          if (output && typeof output === "object" && "exitCode" in output) {
            result.exitCode =
              typeof output.exitCode === "number" ? output.exitCode : null;
            result.termination =
              typeof output.termination === "string"
                ? output.termination
                : null;
          }
        } catch {
          /* Non-JSON output is represented by its durable effect state. */
        }
        return result;
      });
  }
  state(id: string, state: State, error: string | null = null) {
    const t = this.get(id);
    t.state = state;
    t.error = error;
    this.put(t);
    return t;
  }
  setting(key: string, value?: string) {
    if (value !== undefined)
      this.db
        .prepare("INSERT OR REPLACE INTO meta VALUES(?,?)")
        .run(key, value);
    return this.db.prepare("SELECT value FROM meta WHERE key=?").get(key)
      ?.value as string | undefined;
  }
  create(goal: string, root: string, mode: Task["mode"], model: string) {
    const t: Task = {
      id: randomUUID(),
      goal,
      root,
      mode,
      model,
      state: "PLANNING",
      plan: null,
      cursor: 0,
      approved: false,
      created: new Date().toISOString(),
      error: null,
    };
    this.put(t);
    this.event(t.id, "manager", "TASK_CREATED", goal);
    return t;
  }
  hasWorkspaceGrant(task: Task) {
    const grant = this.db
      .prepare("SELECT root FROM task_grants WHERE taskId=?")
      .get(task.id);
    return !!grant && grant.root === task.root;
  }
  image(taskId: string, data: Buffer) {
    if (data.length > 2000000) throw Error("Screenshot exceeds 2 MB limit");
    const id = randomUUID();
    this.db
      .prepare("INSERT INTO task_images VALUES(?,?,?,?)")
      .run(id, taskId, data.toString("base64"), new Date().toISOString());
    this.db
      .prepare(
        "DELETE FROM task_images WHERE taskId=? AND id NOT IN (SELECT id FROM task_images WHERE taskId=? ORDER BY rowid DESC LIMIT 12)",
      )
      .run(taskId, taskId);
    return id;
  }
  close() {
    this.db.close();
  }
}
