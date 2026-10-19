import type { Action, Event, Task, ActionEvidence } from "../core/contracts";

export function actionLabel(action: Action): string {
  switch (action.tool) {
    case "terminal":
      return (
        "Terminal · " +
        action.operation +
        " " +
        (action.program ?? action.sessionId ?? "")
      );
    case "repository":
      return "Project · " + action.operation + " " + (action.path ?? "");
    case "artifact":
      return "Output · " + action.operation + " " + (action.path ?? "");
    case "connector":
      return action.name + " · " + (action.nameOfTool ?? "discover tools");
    case "read":
      return "Read " + action.path;
    case "list":
      return "List " + (action.path || "workspace");
    case "write":
      return "Write " + action.path;
    case "mkdir":
      return "Create folder " + action.path;
    case "search":
      return "Search " + (action.path || "workspace");
    case "command":
      return action.command === "wait"
        ? "Wait " + (action.seconds ?? 10) + " seconds"
        : "Run " + action.command;
    case "run":
      return "Run " + [action.program, ...action.args].join(" ");
    case "git":
      return (
        (action.operation === "commit"
          ? "Create review commit"
          : "Inspect Git " + action.operation) +
        " · " +
        action.paths.join(", ")
      );
    case "browser":
      return (
        "Browser · " +
        action.operation +
        (action.path
          ? " " + action.path
          : action.url
            ? " " + action.url
            : action.ref
              ? " " + action.ref
              : "")
      );
    case "desktop":
      return "Selected window · " + action.operation;
  }
}
export function progressView(task: Task, evidence: ActionEvidence[] = []) {
  const actions = task.plan?.actions ?? [];
  const completed = Math.min(task.cursor, actions.length);
  const current = actions[completed];
  const terminal = ["DONE", "FAILED", "CANCELED"].includes(task.state);
  const active = ["PLANNING", "RUNNING", "VALIDATING"].includes(task.state);
  let now = "Preparing the task";
  let next = "Manager will prepare an assignment.";
  if (task.state === "DONE") {
    now = "Task completed";
    next = "Read the result and inspect the recorded evidence.";
  } else if (task.state === "FAILED") {
    now = "Task stopped with an error";
    next = "Inspect the error and evidence before starting a fresh task.";
  } else if (task.state === "CANCELED") {
    now = "Task canceled";
    next = "No further actions will run.";
  } else if (task.state === "PAUSED") {
    now = "Paused";
    next = "Resume to reconcile saved progress before continuing.";
  } else if (task.state === "WAITING_PROVIDER") {
    now = "Waiting for ChatGPT";
    next = "Check the role conversation, then Resume when it is ready.";
  } else if (task.state === "WAITING_APPROVAL") {
    now = "Waiting for your plan approval";
    next = current ? actionLabel(current) : "Review the proposed plan below.";
  } else if (task.state === "PLANNING") {
    now =
      task.agent?.phase === "builder"
        ? "Builder is preparing the next actions"
        : "Manager is planning the next round";
    next = "The checklist will update when a validated plan is ready.";
  } else if (task.state === "VALIDATING") {
    now =
      task.agent?.phase === "finalize"
        ? "Manager is preparing the final report"
        : "Reviewer is checking the evidence";
    next =
      task.agent?.phase === "finalize"
        ? "Show the verified result."
        : "Complete the task or return it for another repair round.";
  } else if (current) {
    now = actionLabel(current);
    next = actions[completed + 1]
      ? actionLabel(actions[completed + 1])
      : "Review the execution evidence.";
  }
  return {
    now,
    next,
    completed,
    total: actions.length,
    active,
    terminal,
    steps: actions.map((action, index) => {
      const effect = evidence.find((e) => e.idx === index);
      const finished = index < completed;
      const state = finished
        ? "finished"
        : index === completed && task.state === "RUNNING"
          ? "running"
          : index === completed && task.state === "FAILED"
            ? "error"
            : index === completed &&
                ["PAUSED", "WAITING_PROVIDER", "WAITING_APPROVAL"].includes(
                  task.state,
                )
              ? "waiting"
              : terminal
                ? "not-run"
                : "pending";
      const isCheck =
        action.tool === "run" ||
        (action.tool === "terminal" &&
          action.operation === "start" &&
          !action.background);
      const checkFailed =
        finished &&
        isCheck &&
        effect != null &&
        (effect.exitCode !== 0 || !!effect.termination);
      const detail = checkFailed
        ? "Finished · check failed"
        : finished && isCheck && effect?.exitCode === 0
          ? "Finished · exit 0"
          : finished
            ? effect?.state === "INTERRUPTED"
              ? "Interrupted · outcome unverified"
              : action.tool === "terminal" && action.background
                ? "Started · see terminal status"
                : "Finished"
            : state === "running"
              ? "In progress"
              : state === "error"
                ? "Stopped here"
                : state === "waiting"
                  ? "Waiting"
                  : state === "not-run"
                    ? "Not run"
                    : "Pending";
      return {
        action,
        index,
        label: actionLabel(action),
        state,
        detail,
        checkFailed,
      };
    }),
  };
}
function object(value: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}
export function activityItem(
  event: Event,
): { title: string; summary: string } | null {
  const parsed = object(event.detail);
  const summary = typeof parsed?.summary === "string" ? parsed.summary : "";
  switch (event.kind) {
    case "TASK_CREATED":
      return { title: "Task started", summary: event.detail };
    case "MODEL_STARTED":
      return {
        title:
          event.role === "reviewer"
            ? "Reviewer is checking"
            : event.role === "builder"
              ? "Builder is preparing actions"
              : "Manager is working",
        summary: "Waiting for the normal ChatGPT role conversation.",
      };
    case "MODEL_RESPONSE":
      return summary
        ? {
            title:
              event.role[0].toUpperCase() + event.role.slice(1) + " update",
            summary,
          }
        : null;
    case "PLAN_PROPOSED":
      return { title: "Plan updated", summary: event.detail };
    case "TOOL_STARTED": {
      try {
        return {
          title: "Action started",
          summary: actionLabel(parsed as Action),
        };
      } catch {
        return {
          title: "Action started",
          summary: "See the recorded tool request.",
        };
      }
    }
    case "TOOL_EXECUTED": {
      if (parsed && "exitCode" in parsed)
        return {
          title:
            parsed.exitCode === 0 && !parsed.termination
              ? "Check passed"
              : "Check failed",
          summary:
            "Exit " +
            String(parsed.exitCode ?? "unavailable") +
            (parsed.termination ? " · " + String(parsed.termination) : "") +
            (typeof parsed.stdout === "string" && parsed.stdout.trim()
              ? " · " + parsed.stdout.trim().slice(0, 300)
              : ""),
        };
      if (typeof parsed?.commit === "string")
        return {
          title: "Review commit created",
          summary: String(parsed.branch) + " · " + parsed.commit.slice(0, 12),
        };
      if (typeof parsed?.patch === "string")
        return {
          title: "Git diff captured",
          summary: parsed.changed
            ? "Selected-file changes are ready to inspect."
            : "No selected-file content changes.",
        };
      if (event.detail.startsWith("Wrote "))
        return { title: "File updated", summary: event.detail.split("\n")[0] };
      return {
        title: "Action finished",
        summary: "Output recorded. Expand for the exact evidence.",
      };
    }
    case "REVIEW_REJECTED":
      return { title: "Another round is needed", summary: event.detail };
    case "REVIEW_PASSED":
      return { title: "Review passed", summary: event.detail };
    case "TASK_DONE":
      return { title: "Task completed", summary: event.detail };
    case "USER_FOLLOWUP":
      return { title: "Your follow-up", summary: event.detail };
    case "TERMINAL_STARTED":
      return { title: "Terminal started", summary: event.detail };
    case "TERMINAL_EXIT":
      return { title: "Terminal finished", summary: event.detail };
    case "PROJECT_CREATED":
      return { title: "Project ready", summary: event.detail };
    case "TASK_FAILED":
      return { title: "Task stopped with an error", summary: event.detail };
    case "PROVIDER_ERROR":
      return { title: "ChatGPT needs attention", summary: event.detail };
    case "PAUSED":
    case "TASK_PAUSED":
      return { title: "Task paused", summary: event.detail };
    case "WORKSPACE_AUTHORIZED":
      return {
        title: "Workspace authorized",
        summary:
          "Routine workspace actions can continue. Separate confirmations still apply.",
      };
    case "WORKSPACE_REVOKED":
    case "ACCESS_REVOKED":
      return { title: "Workspace access revoked", summary: event.detail };
    case "DENIED":
      return { title: "Plan declined", summary: event.detail };
    case "UNDO":
    case "RESTORED":
    case "FILE_RESTORED":
      return { title: "Recorded edit restored", summary: event.detail };
    default:
      return null;
  }
}
