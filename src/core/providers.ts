import { planSchema, type Plan } from "./contracts";
export function recipe(goal: string): Plan {
  const quoted = goal.match(/^write\s+([^\s]+)\s+with\s+content\s+([\s\S]+)$/i);
  if (quoted)
    return {
      summary: "Write the exact supplied content, then reread and compare it.",
      actions: [{ tool: "write", path: quoted[1], content: quoted[2] }],
    };
  if (/^list files$/i.test(goal.trim()))
    return {
      summary: "List the selected workspace directory.",
      actions: [{ tool: "list", path: "." }],
    };
  if (/^git status$/i.test(goal.trim()))
    return {
      summary: "Inspect tracked Git changes without running hooks.",
      actions: [{ tool: "command", command: "git-status" }],
    };
  if (/^cancellation check$/i.test(goal.trim()))
    return {
      summary:
        "Run a 30-second cancellable sleep. Press Stop all to terminate it.",
      actions: [{ tool: "command", command: "wait", seconds: 30 }],
    };
  if (
    /^create notes\.txt with three lines, check content, summarize the changes\.?$/i.test(
      goal.trim(),
    )
  )
    return {
      summary:
        "Offline test recipe: create and verify three fixed lines. This is a deterministic test, not an AI response.",
      actions: [
        {
          tool: "write",
          path: "notes.txt",
          content:
            "CHAI — Chat Has Actions Inside\nStop chatting. Start doing.\nVerified locally.\n",
        },
      ],
    };
  throw Error(
    "Recipe mode supports: list files; git status; cancellation check; write filename with content YOUR TEXT. Use Assisted or a local model for open-ended goals.",
  );
}
const endpoint = "http://127.0.0.1:11434";
async function boundedJSON(response: Response) {
  if (!response.ok) throw Error(`Local provider HTTP ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw Error("Provider returned no body");
  let body = "";
  const decoder = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    body += decoder.decode(value, { stream: true });
    if (body.length > 150000) {
      await reader.cancel();
      throw Error("Provider output too large");
    }
  }
  return JSON.parse(body);
}
export async function models(): Promise<string[]> {
  const data = await boundedJSON(
    await fetch(endpoint + "/api/tags", {
      signal: AbortSignal.timeout(3000),
      redirect: "error",
    }),
  );
  return (data.models ?? []).map((m: { name: string }) => m.name);
}
export async function localPlan(
  goal: string,
  model: string,
  signal: AbortSignal,
): Promise<Plan> {
  if (!model) throw Error("Select an installed Ollama model in Connections");
  const response = await fetch(endpoint + "/api/chat", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.any([signal, AbortSignal.timeout(90000)]),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [
        {
          role: "system",
          content:
            'You are CHAI Manager. Propose a bounded plan as JSON only: {"summary":"...","actions":[...]}. Allowed actions: {"tool":"list","path":"."}, {"tool":"read","path":"relative.txt"}, {"tool":"write","path":"relative.txt","content":"exact text"}, {"tool":"command","command":"git-status" or "git-diff" or "node-version" or "pwd"}. Max 12 actions. Never claim you ran a tool. No absolute paths, secrets, permission decisions, or shell strings. Writes require human approval. Plan only what these tools can achieve.',
        },
        { role: "user", content: goal },
      ],
    }),
  });
  const data = await boundedJSON(response);
  return planSchema.parse(JSON.parse(data.message.content));
}
