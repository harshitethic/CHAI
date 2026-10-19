import { z } from "zod";
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
]);
export const planSchema = z
  .object({
    summary: z.string().min(1).max(2000),
    actions: z.array(actionSchema).min(1).max(12),
  })
  .strict();
export type Action = z.infer<typeof actionSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Mode = "recipe" | "local" | "assisted";
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
  models: string[];
  providerError: string | null;
  selectedModel: string;
}
export const requestSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("snapshot") }).strict(),
  z.object({ op: z.literal("workspace") }).strict(),
  z
    .object({
      op: z.literal("create"),
      goal: z.string().min(1).max(12000),
      mode: z.enum(["recipe", "local", "assisted"]),
      model: z.string().max(100),
      plan: z.string().max(110000).optional(),
    })
    .strict(),
  z
    .object({ op: z.literal("approve"), id: z.uuid(), allow: z.boolean() })
    .strict(),
  z.object({ op: z.literal("resume"), id: z.uuid() }).strict(),
  z.object({ op: z.literal("pause"), id: z.uuid() }).strict(),
  z.object({ op: z.literal("undo"), id: z.uuid() }).strict(),
  z.object({ op: z.literal("stop") }).strict(),
  z.object({ op: z.literal("models") }).strict(),
  z.object({ op: z.literal("start-local") }).strict(),
  z
    .object({ op: z.literal("select-model"), name: z.string().min(1).max(100) })
    .strict(),
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
