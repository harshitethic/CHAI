import type { Event, Task } from "../core/contracts";

export interface Message {
  id: string;
  kind: "user" | "assistant" | "tool";
  text: string;
  created: string;
  detail?: string;
  final?: boolean;
}

/** Only persisted model replies and tool receipts, never simulated reasoning. */
export function conversation(task: Task, events: Event[]): Message[] {
  const messages: Message[] = [
    { id: "goal", kind: "user", text: task.goal, created: task.created },
    ...(task.messages ?? []).map((m, i) => ({
      id: "followup-" + i,
      kind: "user" as const,
      text: m.text,
      created: m.created,
    })),
  ];
  for (const event of events) {
    if (event.taskId !== task.id) continue;
    if (event.kind === "MODEL_RESPONSE") {
      try {
        const response = JSON.parse(event.detail);
        if (typeof response.summary !== "string") continue;
        // Builder proposals are announced by PLAN_PROPOSED after validation.
        if (Array.isArray(response.actions)) continue;
        const final = Array.isArray(response.limitations);
        const limitations = final
          ? response.limitations.filter((v: unknown) => typeof v === "string")
          : [];
        messages.push({
          id: "event-" + event.id,
          kind: "assistant",
          created: event.created,
          text: [response.summary, ...limitations].join("\n\n"),
          final,
        });
      } catch {
        /* Truncated or invalid legacy evidence stays in detailed logs. */
      }
    } else if (event.kind === "PLAN_PROPOSED") {
      if (
        messages.at(-1)?.kind === "assistant" &&
        messages.at(-1)?.text === event.detail
      )
        continue;
      messages.push({
        id: "event-" + event.id,
        kind: "assistant",
        text: event.detail,
        created: event.created,
      });
    } else if (
      [
        "CHECK_PASSED",
        "EXECUTION_CAPTURED",
        "CHECK_FAILED",
        "PROVIDER_ERROR",
        "TASK_PAUSED",
        "RECOVERED",
      ].includes(event.kind)
    ) {
      messages.push({
        id: "event-" + event.id,
        kind: "tool",
        text:
          event.kind === "CHECK_PASSED"
            ? "Tool finished"
            : event.kind.replaceAll("_", " ").toLowerCase(),
        detail: event.detail,
        created: event.created,
      });
    }
  }
  messages.sort((a, b) => a.created.localeCompare(b.created));
  // The event window is bounded; keep a completed result visible even after older events expire.
  if (
    task.state === "DONE" &&
    task.agent?.report &&
    !messages.some(
      (m) => m.final && m.text.startsWith(task.agent!.report!.summary),
    )
  ) {
    messages.push({
      id: "result",
      kind: "assistant",
      text: [task.agent.report.summary, ...task.agent.report.limitations].join(
        "\n\n",
      ),
      created: "",
      final: true,
    });
  }
  return messages;
}
