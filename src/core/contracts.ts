import { z } from "zod";
const sandboxPath = z
  .string()
  .min(1)
  .max(300)
  .refine(
    (p) =>
      !p.startsWith("/") &&
      !p.includes(String.fromCharCode(0)) &&
      p.split("/").every((s) => s !== "" && s !== "." && s !== ".."),
    "Use a normalized relative file path",
  );
export const capabilitiesSchema = z
  .object({
    project: z.boolean().optional(),
    host: z.boolean().optional(),
    durable: z.boolean().optional(),
    budget: z.enum(["standard", "extended"]).optional(),
    network: z.boolean().optional(),
    connectors: z
      .array(z.string().regex(/^[a-z0-9-]{1,40}$/))
      .max(12)
      .optional(),
    browser: z.boolean().default(false),
    origins: z
      .array(
        z
          .string()
          .url()
          .refine((v) => {
            const u = new URL(v);
            return (
              u.protocol === "https:" &&
              !u.username &&
              !u.password &&
              u.pathname === "/" &&
              !u.search &&
              !u.hash
            );
          }, "Use HTTPS origins, without paths or credentials"),
      )
      .max(8)
      .default([]),
    desktop: z
      .object({
        id: z.string().regex(/^(?:window:[0-9]+:[0-9]+|portal:[a-f0-9-]{36})$/),
        title: z.string().max(500),
        pid: z.number().int().positive().optional(),
        backend: z.enum(["x11", "wayland"]).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type Capabilities = z.infer<typeof capabilitiesSchema>;
export const actionSchema = z.discriminatedUnion("tool", [
  z
    .object({
      tool: z.literal("write"),
      path: z.string().min(1).max(300),
      content: z.string().max(100000),
      expectedHash: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .nullable()
        .optional(),
    })
    .strict(),
  z
    .object({ tool: z.literal("read"), path: z.string().min(1).max(300) })
    .strict(),
  z
    .object({ tool: z.literal("list"), path: z.string().max(300).default(".") })
    .strict(),
  z
    .object({
      tool: z.literal("command"),
      command: z.enum([
        "pwd",
        "git-status",
        "git-diff",
        "node-version",
        "wait",
      ]),
      seconds: z.number().int().min(1).max(60).optional(),
    })
    .strict(),
  z
    .object({
      tool: z.literal("run"),
      program: z.enum(["python3", "node", "bash"]),
      args: z
        .array(
          z
            .string()
            .max(8000)
            .refine((s) => !s.includes(String.fromCharCode(0))),
        )
        .max(40),
      files: z
        .array(sandboxPath)
        .max(60)
        .refine((xs) => new Set(xs).size === xs.length, "Duplicate inputs"),
      timeoutSeconds: z.number().int().min(1).max(60).default(20),
      expectedHashes: z
        .record(z.string(), z.string().regex(/^[a-f0-9]{64}$/))
        .optional(),
    })
    .strict(),
  z.object({ tool: z.literal("mkdir"), path: sandboxPath }).strict(),
  z
    .object({
      tool: z.literal("search"),
      path: z.string().max(300).default("."),
      query: z.string().min(1).max(200),
    })
    .strict(),
  z
    .object({
      tool: z.literal("browser"),
      operation: z.enum([
        "open",
        "preview",
        "observe",
        "click",
        "type",
        "key",
        "upload",
        "back",
        "reload",
      ]),
      url: z.string().url().max(2000).optional(),
      path: sandboxPath.optional(),
      snapshot: z.uuid().optional(),
      ref: z
        .string()
        .regex(/^e[0-9]+$/)
        .optional(),
      text: z.string().max(8000).optional(),
      key: z
        .enum([
          "Enter",
          "Tab",
          "Escape",
          "ArrowDown",
          "ArrowUp",
          "ArrowLeft",
          "ArrowRight",
          "Backspace",
        ])
        .optional(),
    })
    .strict(),
  z
    .object({
      tool: z.literal("desktop"),
      operation: z.enum([
        "observe",
        "click",
        "type",
        "key",
        "scroll",
        "accessibility",
      ]),
      direction: z.enum(["up", "down", "left", "right"]).optional(),
      snapshot: z.uuid().optional(),
      x: z.number().int().min(0).max(20000).optional(),
      y: z.number().int().min(0).max(20000).optional(),
      text: z.string().max(8000).optional(),
      key: z
        .enum([
          "Return",
          "Tab",
          "Escape",
          "Down",
          "Up",
          "Left",
          "Right",
          "BackSpace",
          "ctrl+a",
        ])
        .optional(),
    })
    .strict(),
  z
    .object({
      tool: z.literal("git"),
      operation: z.enum(["status", "diff", "commit"]),
      paths: z
        .array(sandboxPath)
        .min(1)
        .max(12)
        .refine((xs) => new Set(xs).size === xs.length, "Duplicate paths"),
      message: z.string().min(1).max(2000).optional(),
      expectedHead: z
        .string()
        .regex(/^[a-f0-9]{40,64}$/)
        .optional(),
      expectedHashes: z
        .record(z.string(), z.string().regex(/^[a-f0-9]{64}$/))
        .optional(),
    })
    .strict(),
  z
    .object({
      tool: z.literal("terminal"),
      target: z.enum(["project", "host"]).optional(),
      operation: z.enum(["start", "poll", "input", "stop"]),
      sessionId: z.uuid().optional(),
      program: z
        .enum([
          "bash",
          "node",
          "python3",
          "npm",
          "npx",
          "corepack",
          "pip3",
          "git",
        ])
        .optional(),
      args: z
        .array(
          z
            .string()
            .max(16000)
            .refine((v) => !v.includes("\0")),
        )
        .max(80)
        .default([]),
      cwd: z
        .string()
        .min(1)
        .max(4096)
        .refine((v) => !v.includes("\0"))
        .optional(),
      input: z.string().max(16000).optional(),
      timeoutSeconds: z.number().int().min(1).max(7200).default(300),
      background: z.boolean().default(false),
      port: z.number().int().min(1024).max(65535).optional(),
    })
    .strict(),
  z
    .object({
      tool: z.literal("repository"),
      operation: z.enum([
        "files",
        "search",
        "read",
        "patch",
        "diff",
        "status",
        "commit",
        "branch",
        "pr",
        "ci",
      ]),
      path: sandboxPath.optional(),
      query: z.string().min(1).max(500).optional(),
      offset: z.number().int().min(0).default(0),
      limit: z.number().int().min(1).max(300).default(100),
      before: z.string().min(1).max(100000).optional(),
      after: z.string().max(100000).optional(),
      expectedHash: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
      message: z.string().max(4000).optional(),
      branch: z
        .string()
        .regex(/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,100}$/)
        .optional(),
    })
    .strict(),
  z
    .object({
      tool: z.literal("artifact"),
      operation: z.enum(["list", "register", "create"]),
      path: sandboxPath.optional(),
      title: z.string().max(200).optional(),
      format: z.enum(["pdf", "docx", "xlsx", "pptx"]).optional(),
      paragraphs: z.array(z.string().max(8000)).max(200).optional(),
      rows: z
        .array(
          z
            .array(
              z.union([
                z.string().max(2000),
                z.number(),
                z.boolean(),
                z.null(),
              ]),
            )
            .max(100),
        )
        .max(2000)
        .optional(),
      slides: z
        .array(
          z
            .object({
              title: z.string().max(200),
              body: z.array(z.string().max(2000)).max(12),
            })
            .strict(),
        )
        .max(60)
        .optional(),
    })
    .strict(),
  z
    .object({
      tool: z.literal("connector"),
      name: z.string().regex(/^[a-z0-9-]{1,40}$/),
      operation: z.enum(["tools", "call"]),
      nameOfTool: z.string().max(200).optional(),
      arguments: z.string().max(30000).default("{}"),
    })
    .strict(),
]);
export const planSchema = z
  .object({
    summary: z.string().min(1).max(2000),
    actions: z.array(actionSchema).min(1).max(12),
  })
  .strict();
export type Action = z.infer<typeof actionSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Mode = "recipe" | "local" | "assisted" | "chatgpt" | "browser";
export type State =
  | "PLANNING"
  | "WAITING_APPROVAL"
  | "WAITING_PROVIDER"
  | "RUNNING"
  | "VALIDATING"
  | "PAUSED"
  | "DONE"
  | "FAILED"
  | "CANCELED";
export type Role = "manager" | "builder" | "reviewer";
export interface Task {
  id: string;
  goal: string;
  root: string;
  sourceRoot?: string;
  revision?: number;
  budgetStart?: number;
  recoverable?: boolean;
  messages?: { text: string; created: string }[];
  mode: Mode;
  model: string;
  state: State;
  plan: Plan | null;
  cursor: number;
  approved: boolean;
  created: string;
  error: string | null;
  autonomous?: boolean;
  capabilities?: Capabilities;
  agent?: {
    round: number;
    calls: number;
    proposalError?: string;
    phase:
      "manager" | "builder" | "execute" | "reviewer" | "finalize" | "complete";
    brief: {
      summary: string;
      builderTask: string;
      acceptance: string[];
    } | null;
    review: {
      verdict: "pass" | "revise" | "blocked";
      summary: string;
      issues: string[];
    } | null;
    report: { summary: string; limitations: string[] } | null;
  };
}
export interface Event {
  id: number;
  taskId: string;
  role: Role;
  kind: string;
  detail: string;
  created: string;
}
export interface ActionEvidence {
  idx: number;
  state: string;
  exitCode?: number | null;
  termination?: string | null;
}
export interface Snapshot {
  evidenceTaskId?: string | null;
  effects?: ActionEvidence[];
  tasks: Task[];
  events: Event[];
  workspace: string | null;
  version: string;
  sessions?: TerminalSession[];
  artifacts?: Artifact[];
  preview?: { url: string; image?: string; title?: string; errors?: string[] };
  background?: boolean;
  startup?: boolean;
  desktopSupport?: {
    available: boolean;
    reason: string;
    backend?: "x11" | "wayland";
  };
  connectors?: (ConnectorConfig & {
    authStatus?: "signed-in" | "signed-out" | "signing-in";
  })[];
  bridge: {
    preferredOrigin: string;
    state: string;
    error: string | null;
    url: string | null;
    connected: boolean;
    lastSeen: string | null;
    jobs: {
      id: string;
      taskId: string;
      role: string;
      status: string;
      created: string;
    }[];
  };
}
export interface ConnectorConfig {
  name: string;
  url: string;
  auth?: "bearer" | "oauth";
  clientId?: string;
  issuer?: string;
  redirectPort?: number;
}
export interface TerminalSession {
  id: string;
  taskId: string;
  program: string;
  target?: "project" | "host";
  durable?: boolean;
  effectKey?: string;
  args: string[];
  cwd: string;
  state: "running" | "exited" | "interrupted";
  output: string;
  exitCode: number | null;
  termination: string | null;
  created: string;
  updated: string;
  port?: number;
}
export interface Artifact {
  path: string;
  title: string;
  bytes: number;
  sha256: string;
  mime: string;
}
export const requestSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("terminal-start"),
      id: z.uuid(),
      command: z
        .string()
        .min(1)
        .max(16000)
        .refine((v) => !v.includes("\0")),
      target: z.enum(["project", "host"]),
      background: z.boolean().default(true),
    })
    .strict(),
  z.object({ op: z.literal("snapshot"), id: z.uuid().optional() }).strict(),
  z.object({ op: z.literal("workspace") }).strict(),
  z
    .object({
      op: z.literal("preview-embed"),
      id: z.uuid(),
      bounds: z
        .object({
          x: z.number().int().min(0),
          y: z.number().int().min(0),
          width: z.number().int().min(1).max(10000),
          height: z.number().int().min(1).max(10000),
        })
        .strict()
        .optional(),
    })
    .strict(),
  z.object({ op: z.literal("startup"), enabled: z.boolean() }).strict(),
  z
    .object({
      op: z.literal("followup"),
      id: z.uuid(),
      text: z.string().min(1).max(12000),
    })
    .strict(),
  z.object({ op: z.literal("attach"), id: z.uuid() }).strict(),
  z
    .object({
      op: z.literal("project-panel"),
      id: z.uuid(),
      operation: z.enum(["files", "diff", "read", "status", "skills"]),
      path: sandboxPath.optional(),
    })
    .strict(),
  z
    .object({
      op: z.literal("terminal-input"),
      id: z.uuid(),
      sessionId: z.uuid(),
      input: z.string().max(16000),
    })
    .strict(),
  z
    .object({
      op: z.literal("terminal-stop"),
      id: z.uuid(),
      sessionId: z.uuid(),
    })
    .strict(),
  z.object({ op: z.literal("preview-show"), id: z.uuid() }).strict(),
  z
    .object({ op: z.literal("artifact-open"), id: z.uuid(), path: sandboxPath })
    .strict(),
  z
    .object({ op: z.literal("artifact-save"), id: z.uuid(), path: sandboxPath })
    .strict(),
  z.object({ op: z.literal("background"), enabled: z.boolean() }).strict(),
  z
    .object({
      op: z.literal("connector-save"),
      name: z.string().regex(/^[a-z0-9-]{1,40}$/),
      url: z.string().url(),
      token: z.string().max(8000).optional(),
      auth: z.enum(["bearer", "oauth"]).optional(),
      clientId: z.string().max(2000).optional(),
      issuer: z.string().url().optional(),
      redirectPort: z.number().int().min(1024).max(65535).optional(),
    })
    .strict(),
  z
    .object({
      op: z.literal("connector-sign-in"),
      name: z.string().regex(/^[a-z0-9-]{1,40}$/),
    })
    .strict(),
  z
    .object({
      op: z.literal("connector-sign-out"),
      name: z.string().regex(/^[a-z0-9-]{1,40}$/),
    })
    .strict(),
  z
    .object({
      op: z.literal("connector-cancel"),
      name: z.string().regex(/^[a-z0-9-]{1,40}$/),
    })
    .strict(),
  z
    .object({
      op: z.literal("connector-remove"),
      name: z.string().regex(/^[a-z0-9-]{1,40}$/),
    })
    .strict(),
  z.object({ op: z.literal("desktop-select") }).strict(),
  z
    .object({
      op: z.literal("create"),
      goal: z.string().min(1).max(12000),
      mode: z.enum(["recipe", "assisted", "browser"]),
      model: z.string().max(100),
      plan: z.string().max(110000).optional(),
      permission: z.enum(["review", "workspace"]).optional(),
      capabilities: capabilitiesSchema.optional(),
    })
    .strict(),
  z
    .object({ op: z.literal("approve"), id: z.uuid(), allow: z.boolean() })
    .strict(),
  z.object({ op: z.literal("resume"), id: z.uuid() }).strict(),
  z.object({ op: z.literal("pause"), id: z.uuid() }).strict(),
  z.object({ op: z.literal("revoke"), id: z.uuid() }).strict(),
  z.object({ op: z.literal("undo"), id: z.uuid() }).strict(),
  z.object({ op: z.literal("stop") }).strict(),
  z
    .object({
      op: z.literal("bridge-start"),
      origin: z.string().url().optional(),
    })
    .strict(),
  z.object({ op: z.literal("bridge-stop") }).strict(),
  z.object({ op: z.literal("bridge-copy") }).strict(),
  z.object({ op: z.literal("bridge-plugins") }).strict(),
  z.object({ op: z.literal("export"), id: z.uuid() }).strict(),
  z.object({ op: z.literal("delete"), id: z.uuid() }).strict(),
  z
    .object({
      op: z.literal("provider"),
      role: z.enum(["manager", "builder", "reviewer"]),
    })
    .strict(),
  z.object({ op: z.literal("clear-provider") }).strict(),
  z.object({ op: z.literal("external-chat") }).strict(),
  z.object({ op: z.literal("capture") }).strict(),
  z
    .object({ op: z.literal("browser"), url: z.string().url().max(2000) })
    .strict(),
  z.object({ op: z.literal("browser-capture") }).strict(),
  z
    .object({
      op: z.literal("browser-click"),
      x: z.number().int().min(0).max(10000),
      y: z.number().int().min(0).max(10000),
    })
    .strict(),
  z
    .object({
      op: z.literal("desktop-click"),
      x: z.number().int().min(0).max(20000),
      y: z.number().int().min(0).max(20000),
    })
    .strict(),
]);
export type Request = z.infer<typeof requestSchema>;
export function redact(value: string) {
  return value
    .replace(/(?:sk-|gh[pousr]_)[A-Za-z0-9_-]{12,}/g, "[REDACTED]")
    .replace(
      /((?:password|token|api[_-]?key|authorization)\s*[:=]\s*)\S+/gi,
      "$1[REDACTED]",
    );
}

export function taskLimits(task: Task, authorized = Boolean(task.autonomous)) {
  return authorized
    ? task.capabilities?.budget === "extended"
      ? { rounds: 50, calls: 250, actions: 600 }
      : { rounds: 12, calls: 60, actions: 144 }
    : { rounds: 3, calls: 15, actions: 36 };
}
