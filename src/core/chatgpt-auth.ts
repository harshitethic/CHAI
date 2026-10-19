import {
  randomBytes,
  randomUUID,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { createServer, type Server } from "node:http";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  chmodSync,
} from "node:fs";
import { join } from "node:path";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { z } from "zod";
import { ProviderUnavailable } from "./agents";

const issuer = "https://auth.openai.com";
const resource = "https://api.openai.com/v1";
const scopes =
  "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  id_token: z.string().optional(),
  token_type: z.literal("Bearer"),
  expires_in: z.number().positive(),
  scope: z.string().optional(),
});
const accountSchema = z.object({
  clientId: z.string(),
  subject: z.string(),
  label: z.string(),
  access: z.string().optional(),
  refresh: z.string().optional(),
  idToken: z.string().optional(),
  expires: z.number(),
  scopes: z.array(z.string()),
});
const vaultSchema = z.object({
  host: z.string(),
  active: z.string().nullable(),
  accounts: z.array(accountSchema),
});
type Account = z.infer<typeof accountSchema>;
type Vault = z.infer<typeof vaultSchema>;
export interface ChatGPTModel {
  slug: string;
  display_name: string;
}
export function validState(expected: string, actual: string | null) {
  if (!actual) return false;
  const left = Buffer.from(expected),
    right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}
export async function verifyIdentity(
  token: string,
  clientId: string,
  nonce: string | undefined,
  key: JWTVerifyGetKey = createRemoteJWKSet(
    new URL(issuer + "/.well-known/jwks.json"),
  ),
) {
  const { payload } = await jwtVerify(token, key, {
    issuer,
    audience: clientId,
    requiredClaims: ["sub", "exp", "iat"],
    clockTolerance: 5,
  });
  if (!payload.sub || (nonce !== undefined && payload.nonce !== nonce))
    throw Error("ChatGPT identity could not be verified.");
  return payload;
}
function atomic(path: string, content: string) {
  const temporary = path + "." + randomUUID() + ".tmp";
  writeFileSync(temporary, content, { mode: 0o600, flag: "wx" });
  renameSync(temporary, path);
  chmodSync(path, 0o600);
}
async function jsonRequest(url: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new ProviderUnavailable(
      "ChatGPT connection failed. Check the network and retry.",
    );
  }
  if (!response.ok)
    throw new ProviderUnavailable(
      "ChatGPT authorization request failed (HTTP " +
        response.status +
        "). Sign in again if access was revoked.",
    );
  const text = await response.text();
  if (text.length > 1000000)
    throw Error("ChatGPT response exceeded the limit.");
  return JSON.parse(text) as unknown;
}
export class ChatGPTAuth {
  private vault: Vault;
  private server?: Server;
  private timer?: ReturnType<typeof setTimeout>;
  private refreshFlight?: Promise<string>;
  pending = false;
  error: string | null = null;
  private generation = 0;
  private file: string;
  constructor(directory: string) {
    const root = join(directory, "chatgpt-auth");
    mkdirSync(root, { recursive: true, mode: 0o700 });
    chmodSync(root, 0o700);
    this.file = join(root, "credentials.json");
    this.vault = existsSync(this.file)
      ? vaultSchema.parse(JSON.parse(readFileSync(this.file, "utf8")))
      : { host: "urn:uuid:" + randomUUID(), active: null, accounts: [] };
    this.save();
  }
  private save() {
    atomic(this.file, JSON.stringify(this.vault));
  }
  private account() {
    return this.vault.accounts.find((a) => a.clientId === this.vault.active);
  }
  status() {
    const account = this.account();
    return {
      connected: !!account?.access,
      enabled:
        !!account?.access &&
        account.scopes.includes("chatgpt.tokens.use.direct"),
      pending: this.pending,
      error: this.error,
      active: this.vault.active,
      accounts: this.vault.accounts.map((a) => ({
        id: a.clientId,
        label: a.label,
      })),
    };
  }
  cancel() {
    this.generation++;
    this.server?.close();
    this.server = undefined;
    if (this.timer) clearTimeout(this.timer);
    this.pending = false;
  }
  async begin(open: (url: string) => Promise<void>, selected?: string) {
    this.cancel();
    const generation = this.generation;
    const prior = selected
      ? this.vault.accounts.find((a) => a.clientId === selected)
      : undefined;
    if (selected && !prior) throw Error("Unknown ChatGPT account.");
    this.error = null;
    const state = randomBytes(32).toString("base64url");
    const nonce = randomBytes(32).toString("base64url");
    const verifier = randomBytes(64).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    let consumed = false;
    let redirect = "";
    const server = createServer(async (req, res) => {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Security-Policy", "default-src 'none'");
      const callback = new URL(req.url ?? "/", redirect);
      if (
        req.method !== "GET" ||
        callback.pathname !== "/auth/callback" ||
        req.headers.host !== new URL(redirect).host
      ) {
        res.writeHead(404).end();
        return;
      }
      if (consumed || !validState(state, callback.searchParams.get("state"))) {
        res
          .writeHead(400)
          .end("Sign-in could not be verified. Return to CHAI.");
        return;
      }
      consumed = true;
      try {
        if (callback.searchParams.has("error"))
          throw Error("ChatGPT sign-in was declined.");
        const code = callback.searchParams.get("code");
        const returnedClient = callback.searchParams.get("client_id");
        const clientId = prior?.clientId ?? returnedClient;
        if (
          !code ||
          !clientId ||
          clientId === "dynamic_agent_client" ||
          (prior && returnedClient && returnedClient !== prior.clientId)
        )
          throw Error("ChatGPT registration was incomplete.");
        const token = tokenSchema.parse(
          await jsonRequest(issuer + "/api/accounts/oauth/token", {
            method: "POST",
            body: new URLSearchParams({
              grant_type: "authorization_code",
              client_id: clientId,
              code,
              code_verifier: verifier,
              redirect_uri: redirect,
              resource,
            }),
          }),
        );
        if (!token.id_token)
          throw Error("ChatGPT did not return a verified identity.");
        const identity = await verifyIdentity(token.id_token, clientId, nonce);
        if (prior && prior.subject !== identity.sub)
          throw Error("The selected ChatGPT account does not match.");
        if (generation !== this.generation)
          throw Error("Sign-in was canceled.");
        const account: Account = {
          clientId,
          subject: identity.sub!,
          label: String(identity.email ?? identity.name ?? "ChatGPT account"),
          access: token.access_token,
          refresh: token.refresh_token,
          idToken: token.id_token,
          expires: Date.now() + token.expires_in * 1000,
          scopes: (token.scope ?? "").split(" "),
        };
        this.vault.accounts = [
          ...this.vault.accounts.filter((a) => a.clientId !== clientId),
          account,
        ];
        this.vault.active = clientId;
        this.save();
        if (!account.scopes.includes("chatgpt.tokens.use.direct"))
          this.error = "Signed in, but ChatGPT plan usage was not authorized.";
        res.end(
          "CHAI is connected. You can close this tab and return to CHAI.",
        );
      } catch {
        this.error =
          "ChatGPT sign-in could not be completed or verified. Return to CHAI and try again.";
        res.writeHead(400).end(this.error);
      } finally {
        this.pending = false;
        if (this.timer) clearTimeout(this.timer);
        server.close();
      }
    });
    this.server = server;
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw Error("Could not start ChatGPT callback.");
    redirect = "http://127.0.0.1:" + address.port + "/auth/callback";
    const url = new URL(issuer + "/api/accounts/authorize");
    url.search = new URLSearchParams({
      client_id: prior?.clientId ?? "dynamic_agent_client",
      ...(!prior ? { agent_name_hint: "CHAI" } : {}),
      ext_agent_host_id: this.vault.host,
      response_type: "code",
      redirect_uri: redirect,
      scope: scopes,
      resource,
      state,
      nonce,
      code_challenge_method: "S256",
      code_challenge: challenge,
    }).toString();
    // Deliberately omit login hints from browser URLs; the user chooses their account.
    this.pending = true;
    this.timer = setTimeout(
      () => {
        this.cancel();
        this.error = "ChatGPT sign-in timed out. Try again.";
      },
      10 * 60 * 1000,
    );
    this.timer.unref();
    try {
      await open(url.href);
    } catch {
      this.cancel();
      throw Error("Could not open the ChatGPT sign-in page.");
    }
  }
  async accessToken() {
    const a = this.account();
    if (!a?.access || !a.scopes.includes("chatgpt.tokens.use.direct"))
      throw new ProviderUnavailable(
        "Continue with ChatGPT in Connections and authorize plan usage.",
      );
    if (a.expires > Date.now() + 60000) return a.access;
    if (!a.refresh)
      throw new ProviderUnavailable("ChatGPT sign-in expired. Sign in again.");
    if (!this.refreshFlight)
      this.refreshFlight = this.refresh(a).finally(() => {
        this.refreshFlight = undefined;
      });
    return this.refreshFlight;
  }
  private async refresh(a: Account) {
    const generation = this.generation;
    const token = tokenSchema.parse(
      await jsonRequest(issuer + "/api/accounts/oauth/token", {
        method: "POST",
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: a.clientId,
          refresh_token: a.refresh!,
          resource,
        }),
      }),
    );
    if (token.id_token) {
      const identity = await verifyIdentity(
        token.id_token,
        a.clientId,
        undefined,
      );
      if (identity.sub !== a.subject)
        throw new ProviderUnavailable(
          "ChatGPT account identity changed. Sign in again.",
        );
    }
    if (generation !== this.generation)
      throw new ProviderUnavailable("ChatGPT connection changed.");
    a.access = token.access_token;
    a.refresh = token.refresh_token ?? a.refresh;
    a.idToken = token.id_token ?? a.idToken;
    a.expires = Date.now() + token.expires_in * 1000;
    a.scopes = token.scope ? token.scope.split(" ") : a.scopes;
    this.save();
    if (!a.scopes.includes("chatgpt.tokens.use.direct"))
      throw new ProviderUnavailable(
        "ChatGPT plan permission is no longer enabled.",
      );
    return a.access;
  }
  async models(): Promise<ChatGPTModel[]> {
    const token = await this.accessToken();
    const body = await jsonRequest(resource + "/models", {
      headers: { Authorization: "Bearer " + token },
    });
    const result = z
      .object({
        models: z.array(
          z.object({
            slug: z.string(),
            display_name: z.string(),
            visibility: z.string(),
          }),
        ),
      })
      .parse(body);
    return result.models
      .filter((m) => m.visibility === "list")
      .map(({ slug, display_name }) => ({ slug, display_name }));
  }
  async signOut() {
    this.cancel();
    const a = this.account();
    if (!a) return;
    let revoked = !a.refresh;
    if (a.refresh) {
      try {
        const discovery = z
          .object({ revocation_endpoint: z.string().url() })
          .parse(
            await jsonRequest(issuer + "/.well-known/openid-configuration"),
          );
        const endpoint = new URL(discovery.revocation_endpoint);
        if (endpoint.origin !== issuer)
          throw Error("Unexpected revocation endpoint.");
        const response = await fetch(endpoint, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(15000),
          body: new URLSearchParams({
            token: a.refresh,
            token_type_hint: "refresh_token",
            client_id: a.clientId,
          }),
        });
        revoked = response.status === 200;
      } catch {
        revoked = false;
      }
    }
    delete a.access;
    delete a.refresh;
    delete a.idToken;
    a.expires = 0;
    this.save();
    this.error = revoked
      ? null
      : "Signed out locally. Remote revocation was not confirmed; disconnect CHAI in ChatGPT Settings.";
  }
}
