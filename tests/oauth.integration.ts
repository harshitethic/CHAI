import { createServer } from "node:https";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { Store } from "../src/core/store";
import { Connectors } from "../src/core/connectors";

if (process.env.CHAI_OAUTH_FIXTURE) {
  const base = process.env.CHAI_OAUTH_FIXTURE;
  const origin = `https://localhost:${process.env.CHAI_FIXTURE_PORT}`;
  const store = new Store(join(base, "oauth.sqlite"));
  let browserVisits = 0;
  const connectors = new Connectors(
    store,
    (s) => Buffer.from(s).toString("base64"),
    (s) => Buffer.from(s, "base64").toString(),
    async () => true,
    async (raw) => {
      browserVisits++;
      const url = new URL(raw);
      assert.equal(url.searchParams.get("code_challenge_method"), "S256");
      assert(url.searchParams.get("code_challenge"));
      assert.equal(url.searchParams.get("resource"), origin + "/mcp");
      const callback = new URL(url.searchParams.get("redirect_uri")!);
      const invalid = new URL(callback);
      invalid.searchParams.set("state", "wrong");
      invalid.searchParams.set("code", "forged");
      assert.equal((await fetch(invalid)).status, 400);
      const authorized = await fetch(url, { redirect: "manual" });
      assert.equal(authorized.status, 302);
      assert.equal(
        (await fetch(authorized.headers.get("location")!)).status,
        200,
      );
    },
  );
  try {
    connectors.save("fixture", origin + "/mcp", undefined, { auth: "oauth" });
    const task = store.create("OAuth fixture", base, "assisted", "fixture");
    task.capabilities = {
      browser: false,
      origins: [],
      connectors: ["fixture"],
    };
    const action = {
      tool: "connector" as const,
      name: "fixture",
      operation: "tools" as const,
      arguments: "{}",
    };
    await assert.rejects(
      connectors.execute(task, action, new AbortController().signal),
      /Sign in/,
    );
    await connectors.signIn("fixture");
    assert.equal(connectors.list()[0].authStatus, "signed-in");
    const result = (await connectors.execute(
      task,
      action,
      new AbortController().signal,
    )) as { tools: { name: string }[] };
    assert.equal(result.tools[0].name, "echo");
    assert.equal(
      browserVisits,
      1,
      "expired access token refreshes without another browser login",
    );
    assert(!JSON.stringify(connectors.list()).includes("refresh-fixture"));
    assert(
      !store.setting("connector-oauth:fixture")!.includes("access-refreshed"),
    );
    const config = connectors.list()[0];
    await assert.rejects(
      connectors.oauth.fetch(config)(origin + "/other", {
        headers: { Authorization: "Bearer access-refreshed" },
      }),
      /Refusing to forward/,
    );
    connectors.oauth.clear("fixture");
    assert.equal(connectors.list()[0].authStatus, "signed-out");
    await assert.rejects(
      connectors.execute(task, action, new AbortController().signal),
      /Sign in/,
    );
    assert.equal(store.setting("connector-oauth:fixture"), undefined);
    console.log("OAUTH_PKCE_STATE_REFRESH_SIGNOUT_PASS");
  } finally {
    store.close();
  }
} else {
  const base = mkdtempSync(join(tmpdir(), "chai-oauth-tls-"));
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      join(base, "key.pem"),
      "-out",
      join(base, "cert.pem"),
      "-days",
      "1",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost",
    ],
    { stdio: "ignore" },
  );
  let origin = "",
    exchanges = 0,
    refreshes = 0;
  const codes = new Map<string, { challenge: string; redirect: string }>();
  const server = createServer(
    {
      key: readFileSync(join(base, "key.pem")),
      cert: readFileSync(join(base, "cert.pem")),
    },
    async (req, res) => {
      const url = new URL(req.url!, origin);
      const json = (status: number, data: unknown) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(data));
      };
      let body = "";
      for await (const chunk of req) body += chunk;
      if (url.pathname.startsWith("/.well-known/oauth-protected-resource"))
        return json(200, {
          resource: origin + "/mcp",
          authorization_servers: [origin],
          scopes_supported: ["tools"],
        });
      if (url.pathname === "/.well-known/oauth-authorization-server")
        return json(200, {
          issuer: origin,
          authorization_endpoint: origin + "/authorize",
          token_endpoint: origin + "/token",
          registration_endpoint: origin + "/register",
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code", "refresh_token"],
          code_challenge_methods_supported: ["S256"],
          token_endpoint_auth_methods_supported: ["none"],
        });
      if (url.pathname === "/register")
        return json(201, { ...JSON.parse(body), client_id: "chai-fixture" });
      if (url.pathname === "/authorize") {
        assert.equal(url.searchParams.get("client_id"), "chai-fixture");
        const code = randomUUID(),
          redirect = url.searchParams.get("redirect_uri")!;
        codes.set(code, {
          challenge: url.searchParams.get("code_challenge")!,
          redirect,
        });
        const callback = new URL(redirect);
        callback.searchParams.set("code", code);
        callback.searchParams.set("state", url.searchParams.get("state")!);
        res.writeHead(302, { location: callback.href });
        res.end();
        return;
      }
      if (url.pathname === "/token") {
        const params = new URLSearchParams(body);
        assert.equal(params.get("resource"), origin + "/mcp");
        if (params.get("grant_type") === "authorization_code") {
          const code = params.get("code")!,
            saved = codes.get(code);
          codes.delete(code);
          assert(saved);
          assert.equal(params.get("redirect_uri"), saved.redirect);
          assert.equal(
            createHash("sha256")
              .update(params.get("code_verifier")!)
              .digest("base64url"),
            saved.challenge,
          );
          exchanges++;
          return json(200, {
            access_token: "access-expired",
            token_type: "Bearer",
            refresh_token: "refresh-fixture",
            expires_in: 1,
          });
        }
        assert.equal(params.get("grant_type"), "refresh_token");
        assert.equal(params.get("refresh_token"), "refresh-fixture");
        refreshes++;
        return json(200, {
          access_token: "access-refreshed",
          token_type: "Bearer",
          refresh_token: "refresh-rotated",
          expires_in: 3600,
        });
      }
      if (url.pathname === "/mcp") {
        if (req.headers.authorization !== "Bearer access-refreshed") {
          res.writeHead(401, {
            "www-authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource", scope="tools"`,
          });
          res.end();
          return;
        }
        if (req.method !== "POST") {
          res.writeHead(405).end();
          return;
        }
        const message = JSON.parse(body);
        if (message.id === undefined) {
          res.writeHead(202).end();
          return;
        }
        return json(200, {
          jsonrpc: "2.0",
          id: message.id,
          result:
            message.method === "initialize"
              ? {
                  protocolVersion: "2025-03-26",
                  capabilities: { tools: {} },
                  serverInfo: { name: "OAuth fixture", version: "1" },
                }
              : { tools: [{ name: "echo", inputSchema: { type: "object" } }] },
        });
      }
      json(404, {});
    },
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `https://localhost:${(server.address() as { port: number }).port}`;
  try {
    const exit = await new Promise<number | null>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["--import", "tsx", "tests/oauth.integration.ts"],
        {
          env: {
            ...process.env,
            NODE_EXTRA_CA_CERTS: join(base, "cert.pem"),
            CHAI_OAUTH_FIXTURE: base,
            CHAI_FIXTURE_PORT: String(
              (server.address() as { port: number }).port,
            ),
          },
          stdio: "inherit",
        },
      );
      child.on("error", reject);
      child.on("exit", resolve);
    });
    assert.equal(exit, 0);
    assert.equal(exchanges, 1);
    assert.equal(refreshes, 1);
    console.log("OAUTH_TLS_E2E_PASS");
  } finally {
    server.closeAllConnections();
    server.close();
    rmSync(base, { recursive: true, force: true });
  }
}
