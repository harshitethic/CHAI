import React, { useState } from "react";
import {
  Check,
  Circle,
  LoaderCircle,
  TriangleAlert,
  ListChecks,
  Activity,
} from "lucide-react";
import {
  taskLimits,
  type Task,
  type Event,
  type ActionEvidence,
} from "../core/contracts";
import { activityItem, progressView } from "./progress";
import type { WorkPlan } from "../core/work-plan";

export function TaskProgress({
  task,
  evidence,
  workPlan,
}: {
  task: Task;
  evidence: ActionEvidence[];
  workPlan?: WorkPlan | null;
}) {
  const view = progressView(task, evidence);
  const currentRole =
    task.agent?.phase === "finalize" ? "manager" : task.agent?.phase;
  const milestones =
    workPlan?.taskId === task.id && workPlan.revision === (task.revision ?? 0)
      ? workPlan.steps
      : [];
  return (
    <div className="work-overview">
      <section
        className={"current-work " + (view.active ? "is-active" : "")}
        aria-label="Current task status"
      >
        <div className="work-kicker">
          <span className="work-indicator" />
          {view.active ? "WORK IN PROGRESS" : task.state.replaceAll("_", " ")}
        </div>
        <div role="status" aria-live="polite">
          <h3>{view.now}</h3>
        </div>
        <p>
          <span>Up next</span>
          {view.next}
        </p>
        {task.agent && (
          <div className="team-chips">
            {(["manager", "builder", "reviewer"] as const).map((role) => (
              <span
                className={
                  view.active &&
                  (currentRole === role ||
                    (role === "builder" && currentRole === "execute"))
                    ? "active"
                    : ""
                }
                key={role}
              >
                {role}
              </span>
            ))}
            <small>
              Round {task.agent.round}/{taskLimits(task).rounds} ·{" "}
              {task.agent.calls}/{taskLimits(task).calls} role calls
            </small>
          </div>
        )}
      </section>
      {milestones.length > 0 && (
        <section className="work-checklist milestones" aria-label="Work plan">
          <header>
            <ListChecks size={19} />
            <h3>Work plan</h3>
            <span>
              {milestones.filter((s) => s.status === "completed").length} /{" "}
              {milestones.length}
            </span>
          </header>
          <p className="plan-explanation">
            CHAI’s reported milestones. Checks and tool results are recorded
            separately below.
          </p>
          <ol>
            {milestones.map((step) => (
              <li
                key={step.id}
                className={`milestone ${step.status}`}
                aria-current={
                  step.status === "in_progress" ? "step" : undefined
                }
              >
                <span aria-hidden="true">
                  {step.status === "completed" ? (
                    <Check size={17} />
                  ) : step.status === "blocked" ? (
                    <TriangleAlert size={17} />
                  ) : step.status === "in_progress" && view.active ? (
                    <LoaderCircle size={17} className="spin" />
                  ) : (
                    <Circle size={17} />
                  )}
                </span>
                <div>
                  <strong>{step.title}</strong>
                  {step.detail && <p>{step.detail}</p>}
                  <small>
                    {step.status === "in_progress" && !view.active
                      ? "Pending continuation"
                      : step.status.replaceAll("_", " ")}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section className="work-checklist" aria-label="Task checklist">
        <header>
          <ListChecks size={19} />
          <h3>Action plan</h3>
          <span>
            {view.completed} of {view.total} actions finished
          </span>
        </header>
        {view.total > 0 ? (
          <>
            <div
              className="plan-meter"
              role="progressbar"
              aria-label="Planned actions finished"
              aria-valuemin={0}
              aria-valuemax={view.total}
              aria-valuenow={view.completed}
            >
              <span
                style={{ width: (view.completed / view.total) * 100 + "%" }}
              />
            </div>
            <p className="plan-explanation">
              Recorded actions across rounds. Finished actions can include
              failed checks; the Reviewer decides whether the task is complete.
            </p>
            <ol>
              {view.steps.map((step) => (
                <li
                  key={step.index}
                  className={
                    "step " +
                    step.state +
                    (step.checkFailed ? " check-failed" : "")
                  }
                  aria-current={step.state === "running" ? "step" : undefined}
                >
                  <span className="step-icon" aria-hidden="true">
                    {step.checkFailed || step.state === "error" ? (
                      <TriangleAlert size={17} />
                    ) : step.state === "finished" ? (
                      <Check size={17} />
                    ) : step.state === "running" ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Circle size={17} />
                    )}
                  </span>
                  <span className="step-label">{step.label}</span>
                  <span className="step-state">{step.detail}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="plan-explanation">
            No executable plan yet. Validated actions will appear here as
            planning finishes.
          </p>
        )}
      </section>
    </div>
  );
}

export function TaskActivity({ events }: { events: Event[] }) {
  const [showAll, setShowAll] = useState(false);
  const activity = events
    .map((event) => ({ event, item: activityItem(event) }))
    .filter((row) => row.item)
    .reverse();
  const visible = showAll ? activity : activity.slice(0, 12);
  return (
    <section className="work-feed" aria-label="Task activity">
      <header>
        <Activity size={18} />
        <h3>Activity</h3>
        <span>Latest first · {activity.length} updates available</span>
      </header>
      {!activity.length && <p>Waiting for the first recorded update.</p>}
      {visible.map(({ event, item }) => (
        <article key={event.id}>
          <div className="feed-heading">
            <b>{item!.title}</b>
            <span>
              {event.role} ·{" "}
              <time dateTime={event.created}>
                {new Date(event.created).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </time>
            </span>
          </div>
          <p>
            {item!.summary.length > 480
              ? item!.summary.slice(0, 480) + "…"
              : item!.summary}
          </p>
          <details>
            <summary>Details & evidence</summary>
            <pre>{event.detail}</pre>
          </details>
        </article>
      ))}
      {activity.length > 12 && (
        <button className="feed-more" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show recent updates" : "Show earlier updates"}
        </button>
      )}
      <small className="feed-note">
        Based on saved events, not a live transcript of the model’s internal
        reasoning. Up to 500 events are available for this task.
      </small>
    </section>
  );
}
