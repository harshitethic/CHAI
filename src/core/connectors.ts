import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Store } from "./store";
import type { Action, Task } from "./contracts";

export class Connectors {
  constructor(
    readonly store: Store,
    readonly encrypt: (s: string) => string,
    readonly decrypt: (s: string) => string,
    readonly consent: (title: string, detail: string) => Promise<boolean>,
  ) {}
  list(): { name: string; url: string }[] {
    return JSON.parse(this.store.setting("connectors") || "[]");
  }
  save(name: string, raw: string, token?: string) {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password || u.hash)
      throw Error("Use an HTTPS MCP endpoint without embedded credentials");
    const previous = this.list().find((c) => c.name === name);
    const configs = this.list().filter((c) => c.name !== name);
    configs.push({ name, url: u.href });
    if (token)
      this.store.setting("connector-token:" + name, this.encrypt(token));
    else if (previous && new URL(previous.url).origin !== u.origin)
      this.store.db
        .prepare("DELETE FROM meta WHERE key=?")
        .run("connector-token:" + name);
    this.store.setting("connectors", JSON.stringify(configs));
  }
  remove(name: string) {
    this.store.setting(
      "connectors",
      JSON.stringify(this.list().filter((c) => c.name !== name)),
    );
    this.store.db
      .prepare("DELETE FROM meta WHERE key=?")
      .run("connector-token:" + name);
  }
  async execute(
    task: Task,
    a: Extract<Action, { tool: "connector" }>,
    signal: AbortSignal,
  ) {
    if (!task.capabilities?.connectors?.includes(a.name))
      throw Error("Connector was not authorized for this task");
    const config = this.list().find((c) => c.name === a.name);
    if (!config)
      throw Error("Configure this MCP connector in Connections first");
    const secret = this.store.setting("connector-token:" + a.name);
    const token = secret ? this.decrypt(secret) : undefined;
    const client = new Client({ name: "CHAI", version: "0.7.0" });
    const transport = new StreamableHTTPClientTransport(new URL(config.url), {
      fetch: async (input, init) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
        );
        if (url.origin !== new URL(config.url).origin)
          throw Error("Connector left its configured origin");
        return fetch(input, { ...init, redirect: "error" });
      },
      requestInit: {
        redirect: "error",
        headers: token ? { Authorization: "Bearer " + token } : {},
        signal,
      },
    });
    try {
      await client.connect(transport, { timeout: 20000 });
      signal.throwIfAborted();
      const tools = await client.listTools({}, { signal, timeout: 20000 });
      if (a.operation === "tools") return tools;
      const tool = tools.tools.find((t) => t.name === a.nameOfTool);
      if (!tool) throw Error("Discover and choose an available tool first");
      const args = JSON.parse(a.arguments);
      if (!args || typeof args !== "object" || Array.isArray(args))
        throw Error("Tool arguments must be a JSON object");
      // Tool annotations are untrusted; every remote action has a concrete native review.
      if (
        !(await this.consent(
          "Run connected app action?",
          `${a.name} · ${tool.name}\n${config.url}\n\n${JSON.stringify(args, null, 2)}`,
        ))
      )
        throw Error("Connected action declined");
      signal.throwIfAborted();
      return await client.callTool(
        { name: tool.name, arguments: args },
        undefined,
        { signal, timeout: 120000 },
      );
    } finally {
      await client.close();
    }
  }
}
