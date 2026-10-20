import { z } from "zod";

/** Public milestones, not executable permissions or proof that checks passed. */
export const workStepsSchema = z
  .array(
    z
      .object({
        id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
        title: z.string().trim().min(1).max(200),
        status: z.enum(["pending", "in_progress", "completed", "blocked"]),
        detail: z.string().trim().max(500).optional(),
      })
      .strict(),
  )
  .min(1)
  .max(12)
  .superRefine((steps, ctx) => {
    if (new Set(steps.map((s) => s.id)).size !== steps.length)
      ctx.addIssue({ code: "custom", message: "Milestone IDs must be unique" });
    if (steps.filter((s) => s.status === "in_progress").length > 1)
      ctx.addIssue({
        code: "custom",
        message: "Only one milestone can be in progress",
      });
  });

export const progressUpdateSchema = z
  .object({
    sequence: z.number().int().min(1).max(100),
    message: z.string().trim().min(1).max(2000),
    plan: workStepsSchema.optional(),
    expectedPlanVersion: z.number().int().nonnegative().optional(),
  })
  .strict()
  .refine((v) => Boolean(v.plan) === (v.expectedPlanVersion !== undefined), {
    message:
      "Plan updates require expectedPlanVersion; omit it for message-only updates",
  });

export interface WorkPlan {
  taskId: string;
  revision: number;
  version: number;
  updated: string;
  steps: z.infer<typeof workStepsSchema>;
}
