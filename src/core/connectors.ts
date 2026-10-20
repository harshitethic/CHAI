import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Store } from "./store";
import type { Action, Task, ConnectorConfig } from "./contracts";
import { ConnectorAuth } from "./connector-auth";

export class Connectors {
  readonly oauth: ConnectorAuth;
  private locks = new Map<string, Promise<void>>();
  constructor(
    readonly store: Store,
    readonly encrypt: (s: string) => string,
    readonly decrypt: (s: string) => string,
    readonly consent: (title: string, detail: string) => Promise<boolean>,
    openBrowser?: (url: string) => Promise<void>,
  ) {
    this.oauth = new ConnectorAuth(
      store,
      encrypt,
      decrypt,
      consent,
      openBrowser,
    );
  }
  private configs(): ConnectorConfig[] {
    return JSON.parse(this.store.setting("connectors") || "[]");
  }
  list(): (ConnectorConfig & { authStatus?: ReturnType<ConnectorAuth["status"]> })[] {
    return this.configs().map((c) =>
      c.auth === "oauth" ? { ...c, authStatus: this.oauth.status(c.name) } : c,
    );
  }
  signIn(name: string) {
    const config = this.configs().find((c) => c.name === name);
    if (config?.auth !== "oauth")
      throw Error("Save an OAuth app connection first");
    return this.oauth.signIn(config);
  }
  save(
    name: string,
    raw: string,
    token?: string,
    options: Omit<ConnectorConfig, "name" | "url"> = {},
  ) {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password || u.hash)
      throw Error("Use an HTTPS MCP endpoint without embedded credentials");
    if (options.issuer) {
      const issuer = new URL(options.issuer);
      if (
        issuer.protocol !== "https:" ||
        issuer.username ||
        issuer.password ||
        issuer.hash ||
        issuer.search
      )
        throw Error(
          "Use an HTTPS OAuth issuer without credentials or query parameters",
        );
    }
    if (options.auth === "oauth" && options.clientId && !options.issuer)
      throw Error("A pre-registered client ID requires its OAuth issuer");
    if (options.auth === "oauth" && token)
      throw Error("Do not enter a bearer token for OAuth sign-in");
    const previous = this.configs().find((c) => c.name === name);
    const configs = this.configs().filter((c) => c.name !== name);
    const config = { name, url: u.href, ...options };
    configs.push(config);
    if (JSON.stringify(previous) !== JSON.stringify(config))
      this.oauth.clear(name);
    if (token)
      this.store.setting("connector-token:" + name, this.encrypt(token));
    else if (
      options.auth === "oauth" ||
      (previous && new URL(previous.url).origin !== u.origin)
    )
      this.store.db
        .prepare("DELETE FROM meta WHERE key=?")
        .run("connector-token:" + name);
    this.store.setting("connectors", JSON.stringify(configs));
  }
  remove(name: string) {
    this.oauth.clear(name);
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
    const previous = this.locks.get(a.name);
    let release!: () => void;
    const lock = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(a.name, lock);
    try {
      await previous;
      signal.throwIfAborted();
      return await this.executeOnce(task, a, signal);
    } finally {
      release();
      if (this.locks.get(a.name) === lock) this.locks.delete(a.name);
    }
  }
  private async executeOnce(
    task: Task,
    a: Extract<Action, { tool: "connector" }>,
    signal: AbortSignal,
  ) {
    if (!task.capabilities?.connectors?.includes(a.name))
      throw Error("Connector was not authorized for this task");
    const config = this.list().find((c) => c.name === a.name);
    if (!config)
      throw Error("Configure this MCP connector in Connections first");
    const useOAuth = config.auth === "oauth";
    if (useOAuth && this.oauth.status(config.name) !== "signed-in")
      throw Error(
        `Sign in to ${config.name} in Connections before using this app`,
      );
    const secret = this.store.setting("connector-token:" + a.name);
    const token = secret ? this.decrypt(secret) : undefined;
    const client = new Client({ name: "CHAI", version: "0.7.0" });
    const transport = new StreamableHTTPClientTransport(new URL(config.url), {
      authProvider: useOAuth
        ? this.oauth.provider(config, { signal })
        : undefined,
      fetch: useOAuth
        ? this.oauth.fetch(config, signal)
        : async (input, init) => {
            const url = new URL(
              input instanceof Request ? input.url : String(input),
            );
            if (url.origin !== new URL(config.url).origin)
              throw Error("Connector left its configured origin");
            const response = await fetch(input, { ...init, redirect: "error" });
            if (response.status === 401) {
              await response.body?.cancel();
              throw Error(
                "App connection authentication failed. Check the bearer token, or choose OAuth in Connections if this service requires browser sign-in.",
              );
            }
            return response;
          },
      requestInit: {
        redirect: "error",
        headers: !useOAuth && token ? { Authorization: "Bearer " + token } : {},
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
