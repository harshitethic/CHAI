import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import {
  ChatGPTAuth,
  validState,
  verifyIdentity,
} from "../src/core/chatgpt-auth";
import { ChatGPTAdapter, readCompletedResponse } from "../src/core/chatgpt";
const signal = new AbortController().signal;
const complete = {
  type: "response.completed",
  response: {
    status: "completed",
    output: [
      {
        type: "message",
        content: [{ type: "output_text", text: '{"ok":true}' }],
      },
    ],
  },
};
function stream(events: unknown[]) {
  const data = events
    .map((e) => "data: " + JSON.stringify(e) + "\r\n\r\n")
    .join("");
  return new Response(
    new ReadableStream({
      start(c) {
        // Deliberately split CRLF delimiters and JSON across chunks.
        const bytes = new TextEncoder().encode(data);
        for (let i = 0; i < bytes.length; i++) c.enqueue(bytes.slice(i, i + 1));
        c.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
}
test("ChatGPT stream requires the completed event and never accepts partial output", async () => {
  assert.equal(
    await readCompletedResponse(stream([complete]), signal),
    '{"ok":true}',
  );
  await assert.rejects(
    readCompletedResponse(
      stream([{ type: "response.output_text.delta", delta: '{"ok":true}' }]),
      signal,
    ),
    /without a completed/,
  );
  await assert.rejects(
    readCompletedResponse(stream([{ type: "response.incomplete" }]), signal),
    /stopped/,
  );
  await assert.rejects(
    readCompletedResponse(
      stream([
        complete,
        {
          type: "response.failed",
          response: {
            error: { code: "subscription_sharing_usage_limit_exceeded" },
          },
        },
      ]),
      signal,
    ),
    /usage_limit_exceeded/,
  );
  await assert.rejects(
    readCompletedResponse(
      new Response("secret diagnostic", { status: 403 }),
      signal,
    ),
    (e) => String(e).includes("403") && !String(e).includes("secret"),
  );
});
test("ChatGPT uses High reasoning, plan credentials, and the official streaming endpoint", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(init?.redirect, "error");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "gpt-6-sol");
    assert.deepEqual(body.reasoning, { effort: "high" });
    assert.equal(body.store, false);
    assert.equal(body.stream, true);
    for (const field of [
      "temperature",
      "max_output_tokens",
      "previous_response_id",
      "background",
    ])
      assert.equal(field in body, false);
    assert.deepEqual(body.input, [{ role: "user", content: "test" }]);
    return stream([complete]);
  };
  try {
    const adapter = new ChatGPTAdapter({
      accessToken: async () => "test-only-credential",
      models: async () => [{ slug: "gpt-6-sol", display_name: "GPT-6" }],
    });
    const request = {
      role: "manager" as const,
      phase: "manager",
      model: "gpt-6-sol",
      system: "JSON",
      input: "test",
      schema: { type: "object" },
    };
    assert.deepEqual(await adapter.send(request, signal), { ok: true });
    await assert.rejects(
      adapter.send({ ...request, model: "local-model" }, signal),
      /substitute/,
    );
    await assert.rejects(
      adapter.send({ ...request, model: "gpt-6-unavailable" }, signal),
      /unavailable/,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});
test("OAuth identity validation rejects bad issuer, audience, nonce, expiry, and signature", async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  const keys = createLocalJWKSet({ keys: [jwk] });
  const sign = (
    issuer = "https://auth.openai.com",
    audience = "test-client",
    nonce = "nonce",
    expires = "2m",
  ) =>
    new SignJWT({ nonce })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject("test-user")
      .setIssuedAt()
      .setExpirationTime(expires)
      .sign(privateKey);
  const good = await sign();
  assert.equal(
    (await verifyIdentity(good, "test-client", "nonce", keys)).sub,
    "test-user",
  );
  await assert.rejects(
    verifyIdentity(
      await sign("https://invalid.example"),
      "test-client",
      "nonce",
      keys,
    ),
  );
  await assert.rejects(
    verifyIdentity(
      await sign(undefined, "wrong"),
      "test-client",
      "nonce",
      keys,
    ),
  );
  await assert.rejects(
    verifyIdentity(
      await sign(undefined, undefined, "wrong"),
      "test-client",
      "nonce",
      keys,
    ),
  );
  await assert.rejects(
    verifyIdentity(
      await sign(undefined, undefined, undefined, "-1h"),
      "test-client",
      "nonce",
      keys,
    ),
  );
  const pieces = good.split(".");
  pieces[2] = "AAAA";
  await assert.rejects(
    verifyIdentity(pieces.join("."), "test-client", "nonce", keys),
  );
});
test("OAuth uses stable host identity, fresh PKCE, loopback binding, and rejects bad state without exchange", async () => {
  const root = mkdtempSync(join(tmpdir(), "chai-oauth-test-"));
  const auth = new ChatGPTAuth(root);
  try {
    let url = "";
    await auth.begin(async (value) => {
      url = value;
    });
    const first = new URL(url);
    assert.equal(first.origin, "https://auth.openai.com");
    assert.equal(first.searchParams.get("client_id"), "dynamic_agent_client");
    assert.equal(first.searchParams.get("agent_name_hint"), "CHAI");
    assert.equal(first.searchParams.get("code_challenge_method"), "S256");
    const callback = new URL(first.searchParams.get("redirect_uri")!);
    assert.equal(callback.hostname, "127.0.0.1");
    callback.searchParams.set("state", "wrong");
    assert.equal((await fetch(callback)).status, 400);
    assert.equal(auth.status().connected, false);
    assert.equal(validState("expected", "wrong"), false);
    assert.equal(validState("abcd", "éééé"), false);
    assert.equal(validState("expected", "expected"), true);
    const vault = join(root, "chatgpt-auth", "credentials.json");
    assert.equal(statSync(vault).mode & 0o777, 0o600);
    assert.equal(statSync(join(root, "chatgpt-auth")).mode & 0o777, 0o700);
    const host = JSON.parse(readFileSync(vault, "utf8")).host;
    auth.cancel();
    const restarted = new ChatGPTAuth(root);
    try {
      await restarted.begin(async (value) => {
        url = value;
      });
      const next = new URL(url);
      assert.equal(next.searchParams.get("ext_agent_host_id"), host);
      assert.notEqual(
        first.searchParams.get("state"),
        next.searchParams.get("state"),
      );
      assert.notEqual(
        first.searchParams.get("code_challenge"),
        next.searchParams.get("code_challenge"),
      );
    } finally {
      restarted.cancel();
    }
  } finally {
    auth.cancel();
    rmSync(root, { recursive: true });
  }
});
