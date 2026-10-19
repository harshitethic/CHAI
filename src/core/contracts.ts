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
        id: z.string().regex(/^window:[0-9]+:[0-9]+$/),
        title: z.string().max(500),
        pid: z.number().int().positive(),
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
      operation: z.enum(["open", "preview", "observe", "click", "type", "key"]),
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
      operation: z.enum(["observe", "click", "type", "key"]),
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
export interface Snapshot {
  tasks: Task[];
  events: Event[];
  workspace: string | null;
  version: string;
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
export const requestSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("snapshot") }).strict(),
  z.object({ op: z.literal("workspace") }).strict(),
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
