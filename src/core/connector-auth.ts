import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  auth,
  type OAuthClientProvider,
  type OAuthDiscoveryState,
} from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthTokens,
  OAuthClientInformationMixed,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { Store } from "./store";
import type { ConnectorConfig } from "./contracts";

type Credentials = {
  endpoint: string;
  redirect?: string;
  client?: OAuthClientInformationMixed;
  tokens?: OAuthTokens;
  discovery?: OAuthDiscoveryState;
};
function https(raw: string | URL) {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.hash)
    throw Error("OAuth endpoints must use HTTPS without embedded credentials");
  return url;
}
export class ConnectorAuth {
  private pending = new Map<string, AbortController>();
  constructor(
    readonly store: Store,
    readonly encrypt: (s: string) => string,
    readonly decrypt: (s: string) => string,
    readonly consent: (title: string, detail: string) => Promise<boolean>,
    readonly openBrowser?: (url: string) => Promise<void>,
  ) {}
  private read(config: ConnectorConfig): Credentials {
    const encoded = this.store.setting("connector-oauth:" + config.name);
    const value = encoded
      ? (JSON.parse(this.decrypt(encoded)) as Credentials)
      : undefined;
    return value?.endpoint === config.url ? value : { endpoint: config.url };
  }
  private save(
    config: ConnectorConfig,
    data: Credentials,
    signal?: AbortSignal,
  ) {
    signal?.throwIfAborted();
    this.store.setting(
      "connector-oauth:" + config.name,
      this.encrypt(JSON.stringify(data)),
    );
    this.store.setting(
      "connector-oauth-connected:" + config.name,
      String(!!data.tokens),
    );
  }
  status(name: string) {
    return this.pending.has(name)
      ? ("signing-in" as const)
      : this.store.setting("connector-oauth-connected:" + name) === "true"
        ? ("signed-in" as const)
        : ("signed-out" as const);
  }
  clear(name: string) {
    this.pending.get(name)?.abort(new Error("App connection sign-in canceled"));
    this.pending.delete(name);
    this.store.db
      .prepare("DELETE FROM meta WHERE key IN (?,?)")
      .run("connector-oauth:" + name, "connector-oauth-connected:" + name);
  }
  cancel(name: string) {
    this.pending.get(name)?.abort(new Error("App connection sign-in canceled"));
  }
  provider(
    config: ConnectorConfig,
    options: {
      signal?: AbortSignal;
      redirect?: string;
      state?: string;
      interactive?: boolean;
    } = {},
  ): OAuthClientProvider {
    let verifier = "";
    const read = () => this.read(config);
    const write = (patch: Partial<Credentials>) =>
      this.save(config, { ...read(), ...patch }, options.signal);
    const redirect =
      options.redirect ??
      read().redirect ??
      `http://127.0.0.1:${config.redirectPort ?? 40673}/oauth/callback/${config.name}`;
    return {
      redirectUrl: redirect,
      clientMetadata: {
        client_name: "CHAI Desktop",
        redirect_uris: [redirect],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
      state: () => options.state ?? randomBytes(32).toString("hex"),
      clientInformation: () =>
        read().client ??
        (config.clientId
          ? { client_id: config.clientId, issuer: config.issuer }
          : undefined),
      saveClientInformation: (client) => write({ client, redirect }),
      tokens: () => read().tokens,
      saveTokens: (tokens) => write({ tokens, redirect }),
      saveCodeVerifier: (value) => {
        verifier = value;
      },
      codeVerifier: () => {
        if (!verifier)
          throw Error("Sign-in expired; start again in Connections");
        return verifier;
      },
      discoveryState: () => read().discovery,
      saveDiscoveryState: (discovery) => {
        https(String(discovery.authorizationServerUrl));
        const metadata = discovery.authorizationServerMetadata;
        for (const url of [
          metadata?.authorization_endpoint,
          metadata?.token_endpoint,
          metadata?.registration_endpoint,
        ])
          if (url) https(url);
        if (
          config.issuer &&
          new URL(String(discovery.authorizationServerUrl)).href !==
            new URL(config.issuer).href
        )
          throw Error(
            "The discovered OAuth issuer does not match the configured issuer",
          );
        write({ discovery });
      },
      redirectToAuthorization: async (url) => {
        if (!options.interactive || !this.openBrowser)
          throw Error(
            `Sign in to ${config.name} in Connections before using this app`,
          );
        https(url);
        if (
          !(await this.consent(
            "Sign in to connected app?",
            `${config.name}\nMCP: ${config.url}\nAuthorization: ${url.origin}${url.pathname}\nScopes: ${url.searchParams.get("scope") ?? "server defaults"}\n\nYour browser will open the service's own sign-in and consent page.`,
          ))
        )
          throw Error("App sign-in declined");
        options.signal?.throwIfAborted();
        await this.openBrowser(url.href);
      },
      invalidateCredentials: (scope) => {
        const data = read();
        if (scope === "all" || scope === "client") delete data.client;
        if (scope === "all" || scope === "tokens") delete data.tokens;
        if (scope === "all" || scope === "discovery") delete data.discovery;
        if (scope === "all" || scope === "verifier") verifier = "";
        this.save(config, data, options.signal);
      },
    };
  }
  fetch(config: ConnectorConfig, signal?: AbortSignal): typeof fetch {
    return async (input, init) => {
      signal?.throwIfAborted();
      const url = https(input instanceof Request ? input.url : String(input));
      const headers = new Headers(
        input instanceof Request ? input.headers : undefined,
      );
      new Headers(init?.headers).forEach((value, name) =>
        headers.set(name, value),
      );
      const endpoint = new URL(config.url);
      const isMcp =
        url.origin === endpoint.origin &&
        url.pathname === endpoint.pathname &&
        url.search === endpoint.search;
      if (!isMcp) {
        if (headers.get("authorization")?.toLowerCase().startsWith("bearer "))
          throw Error(
            "Refusing to forward an MCP access token to another endpoint",
          );
        const method = (
          init?.method ?? (input instanceof Request ? input.method : "GET")
        ).toUpperCase();
        if (method !== "GET") {
          const metadata =
            this.read(config).discovery?.authorizationServerMetadata;
          if (
            ![
              metadata?.token_endpoint,
              metadata?.registration_endpoint,
            ].includes(url.href)
          )
            throw Error(
              "OAuth request left its discovered token or registration endpoint",
            );
        }
      }
      const signals = [signal, init?.signal, AbortSignal.timeout(30000)].filter(
        (s): s is AbortSignal => !!s,
      );
      return fetch(input, {
        ...init,
        headers,
        redirect: "error",
        signal: AbortSignal.any(signals),
      });
    };
  }
  async signIn(config: ConnectorConfig) {
    if (!this.openBrowser) throw Error("Browser sign-in is unavailable");
    if (this.pending.has(config.name))
      throw Error("Sign-in is already in progress");
    const controller = new AbortController();
    this.pending.set(config.name, controller);
    const state = randomBytes(32).toString("hex");
    let accept!: (code: string) => void, reject!: (error: Error) => void;
    const code = new Promise<string>((resolve, fail) => {
      accept = resolve;
      reject = fail;
    });
    void code.catch(() => {});
    const timer = setTimeout(
      () => controller.abort(new Error("App sign-in timed out; try again")),
      300000,
    );
    const aborted = () => reject(controller.signal.reason as Error);
    controller.signal.addEventListener("abort", aborted, { once: true });
    let port = 0;
    const path = `/oauth/callback/${config.name}`;
    const server = createServer((request, response) => {
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Content-Security-Policy", "default-src 'none'");
      if (
        request.method !== "GET" ||
        request.headers.host !== `127.0.0.1:${port}`
      ) {
        response.writeHead(400).end("Invalid callback");
        return;
      }
      const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
      const returnedState = Buffer.from(url.searchParams.get("state") ?? "");
      if (
        url.pathname !== path ||
        returnedState.length !== state.length ||
        !timingSafeEqual(returnedState, Buffer.from(state))
      ) {
        response.writeHead(400).end("Invalid sign-in state");
        return;
      }
      if (url.searchParams.has("error")) {
        response.writeHead(400).end("Sign-in was declined. Return to CHAI.");
        reject(new Error("App authorization was declined"));
        return;
      }
      const value = url.searchParams.get("code");
      if (!value || value.length > 8000) {
        response.writeHead(400).end("Missing authorization code");
        return;
      }
      response.end(
        "Authorization received. Return to CHAI to check the connection.",
      );
      accept(value);
    });
    try {
      const previous = this.read(config);
      const requestedPort =
        config.redirectPort ??
        (previous.redirect ? Number(new URL(previous.redirect).port) : 0);
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(requestedPort, "127.0.0.1", resolve);
      });
      port = (server.address() as { port: number }).port;
      const provider = this.provider(config, {
        signal: controller.signal,
        redirect: `http://127.0.0.1:${port}${path}`,
        state,
        interactive: true,
      });
      const fetchFn = this.fetch(config, controller.signal);
      const result = await auth(provider, { serverUrl: config.url, fetchFn });
      if (result === "REDIRECT") {
        const authorizationCode = await code;
        controller.signal.throwIfAborted();
        if (
          (await auth(provider, {
            serverUrl: config.url,
            fetchFn,
            authorizationCode,
          })) !== "AUTHORIZED"
        )
          throw Error("App authorization did not complete");
      }
      return { status: "signed-in" };
    } finally {
      clearTimeout(timer);
      controller.signal.removeEventListener("abort", aborted);
      server.closeAllConnections();
      server.close();
      if (this.pending.get(config.name) === controller)
        this.pending.delete(config.name);
    }
  }
}
