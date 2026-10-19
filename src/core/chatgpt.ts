import {
  ProviderUnavailable,
  type AgentAdapter,
  type AgentRequest,
} from "./agents";
import type { ChatGPTAuth } from "./chatgpt-auth";

type StreamEvent = {
  type?: string;
  response?: {
    status?: string;
    model?: string;
    reasoning?: { effort?: string };
    error?: { code?: string };
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };
  error?: { code?: string };
};
export async function readCompletedResponse(
  response: Response,
  signal: AbortSignal,
): Promise<string> {
  if (!response.ok) {
    // Do not include arbitrary response bodies, which may echo sensitive input.
    throw new ProviderUnavailable(
      "ChatGPT request failed (HTTP " +
        response.status +
        "). Check account access or plan usage in ChatGPT Settings; no fallback was used.",
    );
  }
  if (!response.body)
    throw new ProviderUnavailable("ChatGPT returned no response stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "",
    bytes = 0,
    completed = false,
    output = "";
  try {
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 4 * 1024 * 1024)
        throw new ProviderUnavailable(
          "ChatGPT response exceeded the output limit.",
        );
      buffer = (buffer + decoder.decode(chunk.value, { stream: true })).replace(
        /\r\n/g,
        "\n",
      );
      let split: number;
      while ((split = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        const data = block
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trimStart())
          .join("\n");
        if (!data || data === "[DONE]") continue;
        const event = JSON.parse(data) as StreamEvent;
        if (
          ["error", "response.failed", "response.incomplete"].includes(
            event.type ?? "",
          )
        ) {
          const code =
            event.response?.error?.code ?? event.error?.code ?? event.type;
          const safe = /^[a-z0-9_.-]{1,100}$/i.test(code ?? "")
            ? code
            : "provider_error";
          throw new ProviderUnavailable(
            "ChatGPT stopped: " +
              safe +
              ". Task checkpoint retained; no fallback was used.",
          );
        }
        if (event.type === "response.completed") {
          if (event.response?.status !== "completed")
            throw new ProviderUnavailable("ChatGPT response did not complete.");
          output = (event.response.output ?? [])
            .filter((item) => item.type === "message")
            .flatMap((item) => item.content ?? [])
            .filter((c) => c.type === "output_text")
            .map((c) => c.text ?? "")
            .join("");
          completed = true;
        }
      }
    }
    if (!completed || !output.trim())
      throw new ProviderUnavailable(
        "ChatGPT stream ended without a completed answer. Resume when the connection is available.",
      );
    return output;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export class ChatGPTAdapter implements AgentAdapter {
  readonly name = "ChatGPT plan · High reasoning";
  constructor(private auth: Pick<ChatGPTAuth, "accessToken" | "models">) {}
  async send(request: AgentRequest, signal: AbortSignal): Promise<unknown> {
    if (!/^gpt-6(?:[.-]|$)/.test(request.model))
      throw new ProviderUnavailable(
        "Choose an available GPT-6 model in Connections. CHAI will not substitute another model.",
      );
    const catalog = await this.auth.models();
    if (!catalog.some((m) => m.slug === request.model))
      throw new ProviderUnavailable(
        "The selected GPT-6 model is unavailable to this ChatGPT account. No fallback was used.",
      );
    signal.throwIfAborted();
    const token = await this.auth.accessToken();
    const timeout = AbortSignal.any([signal, AbortSignal.timeout(300000)]);
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        redirect: "error",
        signal: timeout,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: request.model,
          reasoning: { effort: "high" },
          store: false,
          stream: true,
          instructions: request.system,
          input: [{ role: "user", content: request.input }],
          text: {
            format: {
              type: "json_schema",
              name: "chai_role_result",
              strict: false,
              schema: request.schema,
            },
          },
        }),
      });
      return JSON.parse(await readCompletedResponse(response, timeout));
    } catch (error) {
      if (signal.aborted) throw error;
      if (error instanceof ProviderUnavailable) throw error;
      throw new ProviderUnavailable(
        "ChatGPT response was interrupted or invalid. Checkpoint retained; resume to retry.",
      );
    }
  }
}
