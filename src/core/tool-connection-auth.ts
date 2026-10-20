import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Response } from "express";
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import {
  InvalidGrantError,
  InvalidTokenError,
  InvalidClientMetadataError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { Store } from "./store";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export class ToolConnectionAuth implements OAuthServerProvider {
  private pairing = false;
  stopped = false;
  constructor(
    readonly store: Store,
    readonly origin: string,
    readonly consent: (message: string) => Promise<boolean>,
  ) {
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS bridge_clients(id TEXT PRIMARY KEY,body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS bridge_codes(hash TEXT PRIMARY KEY,clientId TEXT NOT NULL,body TEXT NOT NULL,expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS bridge_tokens(hash TEXT PRIMARY KEY,clientId TEXT NOT NULL,kind TEXT NOT NULL,origin TEXT NOT NULL,expires INTEGER NOT NULL);`);
  }
  get clientsStore() {
    return {
      getClient: async (id: string) => {
        const row = this.store.db
          .prepare("SELECT body FROM bridge_clients WHERE id=?")
          .get(id);
        return row
          ? (JSON.parse(String(row.body)) as OAuthClientInformationFull)
          : undefined;
      },
      registerClient: async (
        metadata: Omit<
          OAuthClientInformationFull,
          "client_id" | "client_id_issued_at"
        >,
      ) => {
        if (
          metadata.redirect_uris.length > 8 ||
          !metadata.redirect_uris.every((uri) => {
            try {
              const u = new URL(uri);
              return (
                u.protocol === "https:" &&
                ["chatgpt.com", "chat.openai.com"].includes(u.hostname) &&
                !u.username &&
                !u.password &&
                !u.hash
              );
            } catch {
              return false;
            }
          })
        )
          throw new InvalidClientMetadataError(
            "Only ChatGPT HTTPS callbacks are accepted.",
          );
        const count = this.store.db
          .prepare("SELECT count(*) AS n FROM bridge_clients")
          .get()!;
        if (Number(count.n) >= 40)
          throw new InvalidClientMetadataError(
            "Too many registered clients. Disconnect unused CHAI connections.",
          );
        const client = {
          ...metadata,
          client_id: randomUUID(),
          client_id_issued_at: Math.floor(Date.now() / 1000),
        };
        this.store.db
          .prepare("INSERT INTO bridge_clients VALUES(?,?)")
          .run(client.client_id, JSON.stringify(client));
        return client;
      },
    };
  }
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ) {
    const redirect = new URL(params.redirectUri);
    if (
      this.stopped ||
      this.pairing ||
      !client.redirect_uris.includes(params.redirectUri)
    ) {
      res
        .status(409)
        .send("CHAI is unavailable or another pairing is pending.");
      return;
    }
    if (params.resource && params.resource.href !== this.origin + "/mcp") {
      res.status(400).send("Incorrect CHAI resource.");
      return;
    }
    if ((params.scopes ?? []).some((s) => s !== "chai.tools")) {
      res.status(400).send("Unsupported scope.");
      return;
    }
    this.pairing = true;
    try {
      const allow = await this.consent(
        "Allow this ChatGPT connection to receive CHAI task instructions and submit role results? File and terminal actions still require approval in CHAI. This grants access only to CHAI tools; it does not grant model inference access. Callback: " +
          redirect.origin,
      );
      if (!allow || this.stopped)
        redirect.searchParams.set("error", "access_denied");
      else {
        const code = randomBytes(32).toString("base64url");
        this.store.db
          .prepare("INSERT INTO bridge_codes VALUES(?,?,?,?)")
          .run(
            hash(code),
            client.client_id,
            JSON.stringify(params),
            Date.now() + 120000,
          );
        redirect.searchParams.set("code", code);
        this.store.event(
          "host",
          "manager",
          "CHATGPT_TOOLS_PAIRED",
          "User allowed a ChatGPT connection to CHAI's tools.",
        );
      }
      if (params.state) redirect.searchParams.set("state", params.state);
      redirect.searchParams.set("iss", this.origin + "/");
      res.setHeader("Cache-Control", "no-store");
      res.redirect(redirect.href);
    } finally {
      this.pairing = false;
    }
  }
  private code(client: OAuthClientInformationFull, code: string) {
    const row = this.store.db
      .prepare("SELECT * FROM bridge_codes WHERE hash=?")
      .get(hash(code));
    if (
      !row ||
      row.clientId !== client.client_id ||
      Number(row.expires) < Date.now()
    )
      throw new InvalidGrantError("Invalid or expired authorization code.");
    return JSON.parse(String(row.body)) as AuthorizationParams;
  }
  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    code: string,
  ) {
    return this.code(client, code).codeChallenge;
  }
  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    code: string,
    _verifier?: string,
    redirect?: string,
    resource?: URL,
  ) {
    const params = this.code(client, code);
    if (
      redirect !== params.redirectUri ||
      (resource && resource.href !== this.origin + "/mcp")
    )
      throw new InvalidGrantError("Authorization binding mismatch.");
    this.store.db
      .prepare("DELETE FROM bridge_codes WHERE hash=?")
      .run(hash(code));
    return this.issue(client.client_id);
  }
  private issue(clientId: string): OAuthTokens {
    const access = randomBytes(32).toString("base64url"),
      refresh = randomBytes(32).toString("base64url");
    this.store.db
      .prepare("INSERT INTO bridge_tokens VALUES(?,?,?,?,?)")
      .run(hash(access), clientId, "access", this.origin, Date.now() + 3600000);
    this.store.db
      .prepare("INSERT INTO bridge_tokens VALUES(?,?,?,?,?)")
      .run(
        hash(refresh),
        clientId,
        "refresh",
        this.origin,
        Date.now() + 7 * 86400000,
      );
    return {
      access_token: access,
      refresh_token: refresh,
      token_type: "Bearer",
      expires_in: 3600,
      scope: "chai.tools",
    };
  }
  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    token: string,
    scopes?: string[],
    resource?: URL,
  ) {
    const row = this.store.db
      .prepare("SELECT * FROM bridge_tokens WHERE hash=?")
      .get(hash(token));
    if (
      !row ||
      row.clientId !== client.client_id ||
      row.kind !== "refresh" ||
      row.origin !== this.origin ||
      Number(row.expires) < Date.now() ||
      (scopes && scopes.some((s) => s !== "chai.tools")) ||
      (resource && resource.href !== this.origin + "/mcp")
    )
      throw new InvalidGrantError("Invalid refresh grant.");
    this.store.db
      .prepare("DELETE FROM bridge_tokens WHERE hash=?")
      .run(hash(token));
    return this.issue(client.client_id);
  }
  async verifyAccessToken(token: string) {
    const row = this.store.db
      .prepare("SELECT * FROM bridge_tokens WHERE hash=?")
      .get(hash(token));
    if (
      this.stopped ||
      !row ||
      row.kind !== "access" ||
      row.origin !== this.origin ||
      Number(row.expires) < Date.now()
    )
      throw new InvalidTokenError("Invalid or expired CHAI tool connection.");
    return {
      token,
      clientId: String(row.clientId),
      scopes: ["chai.tools"],
      expiresAt: Math.floor(Number(row.expires) / 1000),
      resource: new URL(this.origin + "/mcp"),
    };
  }
  async revokeToken(
    client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ) {
    this.store.db
      .prepare("DELETE FROM bridge_tokens WHERE hash=? AND clientId=?")
      .run(hash(request.token), client.client_id);
  }
  hasActiveGrant() {
    return !!this.store.db
      .prepare(
        "SELECT 1 FROM bridge_tokens WHERE origin=? AND kind IN ('access','refresh') AND expires>? LIMIT 1",
      )
      .get(this.origin, Date.now());
  }
  disconnectAll() {
    this.stopped = true;
    this.store.db
      .prepare("DELETE FROM bridge_tokens WHERE origin=?")
      .run(this.origin);
    this.store.db.exec("DELETE FROM bridge_codes");
  }
}
