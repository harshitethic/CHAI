import test from "node:test";
import assert from "node:assert/strict";
import { conversation } from "../src/renderer/conversation-model";
import type { Task, Event } from "../src/core/contracts";
const task: Task = {
  id: "t",
  goal: "Build a game",
  created: "2026-10-20T00:00:00Z",
  root: "/project",
  mode: "browser",
  model: "ChatGPT",
  state: "RUNNING",
  plan: null,
  cursor: 0,
  approved: true,
  error: null,
};
const event = (
  id: number,
  kind: string,
  detail: string,
  taskId = "t",
): Event => ({
  id,
  kind,
  detail,
  taskId,
  role: "manager",
  created: `2026-10-20T00:00:0${id}Z`,
});
test("conversation orders real updates and followups without duplicating proposals or leaking other tasks", () => {
  const messages = conversation(
    {
      ...task,
      messages: [{ text: "Add flight", created: "2026-10-20T00:00:02Z" }],
    },
    [
      event(
        3,
        "MODEL_RESPONSE",
        JSON.stringify({ summary: "I'll wire flight controls.", actions: [] }),
      ),
      event(4, "PLAN_PROPOSED", "I'll wire flight controls."),
      event(
        1,
        "MODEL_RESPONSE",
        JSON.stringify({
          summary: "I've found the game entry point.",
          builderTask: "internal assignment",
        }),
      ),
      event(
        5,
        "MODEL_RESPONSE",
        JSON.stringify({ summary: "Private other task" }),
        "other",
      ),
      event(6, "MODEL_STARTED", "Not a completed response"),
      event(7, "MODEL_RESPONSE", "{truncated"),
    ],
  );
  assert.deepEqual(
    messages.map((m) => m.text),
    [
      "Build a game",
      "I've found the game entry point.",
      "Add flight",
      "I'll wire flight controls.",
    ],
  );
});
test("completed answers survive the bounded event window and keep material limitations visible", () => {
  const done: Task = {
    ...task,
    state: "DONE",
    agent: {
      round: 1,
      calls: 4,
      phase: "complete",
      brief: null,
      review: null,
      report: {
        summary: "The controls work.",
        limitations: ["Mobile remains untested."],
      },
    },
  };
  assert.equal(
    conversation(done, []).at(-1)?.text,
    "The controls work.\n\nMobile remains untested.",
  );
  const reply = event(1, "MODEL_RESPONSE", JSON.stringify(done.agent!.report));
  assert.equal(conversation(done, [reply]).filter((m) => m.final).length, 1);
});

test("live updates appear immediately while successful review chatter and draft answers stay out of the conversation", () => {
  const messages = conversation(task, [
    event(
      1,
      "ASSISTANT_PROGRESS",
      "The first check failed; I’m inspecting the mismatch.",
    ),
    event(
      2,
      "MODEL_RESPONSE",
      JSON.stringify({ responseOnly: true, summary: "Draft answer" }),
    ),
    event(
      3,
      "MODEL_RESPONSE",
      JSON.stringify({
        verdict: "pass",
        summary: "Repeated answer",
        issues: [],
      }),
    ),
    event(
      4,
      "MODEL_RESPONSE",
      JSON.stringify({ summary: "Final answer", limitations: [] }),
    ),
  ]);
  assert.deepEqual(
    messages.map((m) => m.text),
    [
      "Build a game",
      "The first check failed; I’m inspecting the mismatch.",
      "Final answer",
    ],
  );
});

test("public updates replace repeated handoffs but later calls and final results remain visible", () => {
  const manager = [
    event(1, "MODEL_STARTED", "assignment"),
    event(
      2,
      "ASSISTANT_PROGRESS",
      "The preview is open; I’ll check driving next.",
    ),
    event(
      3,
      "MODEL_RESPONSE",
      JSON.stringify({
        summary: "The preview has reopened; next check driving.",
        builderTask: "Drive",
      }),
    ),
    event(4, "MODEL_STARTED", "assignment"),
    event(
      5,
      "MODEL_RESPONSE",
      JSON.stringify({
        summary: "Driving passed. Checking flight next.",
        builderTask: "Fly",
      }),
    ),
  ];
  const builder = [
    event(6, "MODEL_STARTED", "proposal"),
    event(
      7,
      "ASSISTANT_PROGRESS",
      "I’m applying held keys to the observed canvas.",
    ),
    event(8, "PLAN_PROPOSED", "Apply held keys to the observed canvas."),
  ].map((e) => ({ ...e, role: "builder" as const }));
  const final = event(
    9,
    "MODEL_RESPONSE",
    JSON.stringify({
      summary: "Audit saved.",
      limitations: ["Real earning is missing."],
    }),
  );
  const messages = conversation(
    task,
    [...manager, ...builder, final].reverse(),
  );
  assert.deepEqual(
    messages.map((m) => m.text),
    [
      "Build a game",
      "The preview is open; I’ll check driving next.",
      "Driving passed. Checking flight next.",
      "I’m applying held keys to the observed canvas.",
      "Audit saved.\n\nReal earning is missing.",
    ],
  );
});
