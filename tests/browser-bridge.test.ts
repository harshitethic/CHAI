import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Store } from "../src/core/store";
import { BrowserBridge } from "../src/core/browser-bridge";
import { ToolServer } from "../src/core/tool-server";
import { Gateway } from "../src/core/gateway";
import { Engine } from "../src/core/engine";
const origin = "https://chai-test.example";
const callback = "https://chatgpt.com/connector_platform/oauth/callback";
const brief = {
  summary: "Create a file",
  builderTask: "Write notes.txt with hello",
  acceptance: ["notes.txt contains hello"],
};
async function setup(consent = true) {
  const base = mkdtempSync(join(tmpdir(), "chai-bridge-"));
  const root = join(base, "workspace");
  mkdirSync(root);
  const store = new Store(join(base, "state.sqlite"));
  const bridge = new BrowserBridge(store);
  const server = new ToolServer(bridge, async () => consent);
  server.configure(origin);
  const port = await server.listen();
  const local = "http://127.0.0.1:" + port;
  const register = await fetch(local + "/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "CHAI TEST FIXTURE",
      redirect_uris: [callback],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    }),
  });
  assert.equal(register.status, 201);
  const client = (await register.json()) as { client_id: string };
  const verifier = randomBytes(32).toString("base64url");
  const params = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: callback,
    response_type: "code",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    scope: "chai.tools",
    resource: origin + "/mcp",
    state: "fixture-state",
  });
  const auth = await fetch(local + "/authorize?" + params, {
    redirect: "manual",
  });
  assert.equal(auth.status, 302);
  const redirect = new URL(auth.headers.get("location")!);
  assert.equal(redirect.searchParams.get("state"), "fixture-state");
  const code = redirect.searchParams.get("code");
  const token = async (codeVerifier: string) =>
    fetch(local + "/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: client.client_id,
        code: code ?? "",
        code_verifier: codeVerifier,
        redirect_uri: callback,
        resource: origin + "/mcp",
      }),
    });
  return {
    base,
    root,
    store,
    bridge,
    server,
    local,
    client,
    verifier,
    redirect,
    token,
    close: async () => {
      await server.close();
      store.close();
    },
  };
}
test("MCP pairing requires consent and PKCE; tokens remain scoped, hashed, revocable", async () => {
  const s = await setup();
  try {
    assert.equal(
      (await fetch(s.local + "/mcp", { method: "POST" })).status,
      401,
    );
    assert.equal(
      (
        await fetch(s.local + "/mcp", {
          method: "POST",
          headers: { Origin: "https://evil.example" },
        })
      ).status,
      403,
    );
    assert.equal((await s.token("wrong".repeat(12))).status, 400);
    const r = await s.token(s.verifier);
    assert.equal(r.status, 200);
    const grant = (await r.json()) as {
      access_token: string;
      refresh_token: string;
    };
    assert.equal((await s.token(s.verifier)).status, 400);
    const auth = await s.server.auth!.verifyAccessToken(grant.access_token);
    assert.equal(auth.resource.href, origin + "/mcp");
    const rows = JSON.stringify(
      s.store.db.prepare("SELECT * FROM bridge_tokens").all(),
    );
    assert(!rows.includes(grant.access_token));
    assert(!rows.includes(grant.refresh_token));
    await assert.rejects(s.server.auth!.verifyAccessToken(grant.refresh_token));
    const sdk = new Client({ name: "CHAI fixture", version: "1" });
    await sdk.connect(
      new StreamableHTTPClientTransport(new URL(s.local + "/mcp"), {
        requestInit: {
          headers: { Authorization: "Bearer " + grant.access_token },
        },
      }),
    );
    const listed = await sdk.listTools();
    assert.deepEqual(listed.tools.map((t) => t.name).sort(), [
      "chai_connection_status",
      "chai_get_job",
      "chai_report_progress",
      "chai_submit_result",
    ]);
    const status = await sdk.callTool({
      name: "chai_connection_status",
      arguments: {},
    });
    assert.equal(status.isError, undefined);
    assert.equal(s.bridge.connected, true);
    await sdk.close();
    s.server.auth!.disconnectAll();
    await assert.rejects(s.server.auth!.verifyAccessToken(grant.access_token));
  } finally {
    await s.close();
  }
});
test("denied pairing never creates access tokens; foreign callbacks are rejected", async () => {
  const s = await setup(false);
  try {
    assert.equal(s.redirect.searchParams.get("error"), "access_denied");
    assert.equal(
      s.store.db.prepare("SELECT count(*) n FROM bridge_tokens").get()?.n,
      0,
    );
    const r = await fetch(s.local + "/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        redirect_uris: ["https://evil.example/callback"],
      }),
    });
    assert.equal(r.status, 400);
  } finally {
    await s.close();
  }
});
test("browser jobs reject wrong roles, forged permissions and late canceled responses", async () => {
  const s = await setup();
  s.bridge.connected = true;
  const task = s.store.create("Create notes.txt", s.root, "browser", "browser");
  const controller = new AbortController();
  const pending = s.bridge.send(
    {
      taskId: task.id,
      callId: "fixture-1",
      role: "manager",
      phase: "assignment",
      model: "browser",
      system: "fixture",
      input: "{}",
      schema: {},
    },
    controller.signal,
  );
  const id = s.bridge.jobs()[0].id;
  assert.throws(() => s.bridge.get(id, "reviewer"), /role/);
  assert.throws(() =>
    s.bridge.answer(id, "manager", { ...brief, approved: true }),
  );
  controller.abort();
  await assert.rejects(pending);
  assert.throws(() => s.bridge.answer(id, "manager", brief), /active/);
  await s.close();
});
test("actual HTTP MCP results drive three roles, approval, filesystem evidence and final report", async () => {
  const s = await setup();
  const grant = (await (await s.token(s.verifier)).json()) as {
    access_token: string;
  };
  const client = new Client({ name: "TEST FIXTURE ONLY", version: "1" });
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL(s.local + "/mcp"), {
        requestInit: {
          headers: { Authorization: "Bearer " + grant.access_token },
        },
      }),
    );
    const phases: string[] = [];
    s.bridge.deliver = async (role, id) => {
      const result = await client.callTool({
        name: "chai_get_job",
        arguments: { jobId: id, role },
      });
      assert(!result.isError);
      const content = result.content as { type: string; text: string }[];
      const job = JSON.parse(content[0].text);
      phases.push(job.phase);
      const update = {
        sequence: job.progress.nextSequence,
        message:
          job.phase === "assignment"
            ? "I’ll create the file and check its contents."
            : "I’m checking the saved evidence.",
        ...(job.phase === "assignment"
          ? {
              expectedPlanVersion: job.progress.planVersion,
              plan: [
                {
                  id: "build",
                  title: "Create notes.txt",
                  status: "in_progress",
                },
                {
                  id: "verify",
                  title: "Check exact contents",
                  status: "pending",
                },
              ],
            }
          : {}),
      };
      const progress = await client.callTool({
        name: "chai_report_progress",
        arguments: { jobId: id, role, update },
      });
      assert(!progress.isError);
      if (job.phase === "assignment") {
        const taskId = s.bridge.jobs().find((j) => j.id === id)!.taskId;
        assert.equal(s.store.get(taskId).approved, false);
        assert.equal(s.store.actionEvidence(taskId).length, 0);
      }
      if (job.phase === "independent-review")
        assert.equal(job.input.evidence.files[0].content, "hello");
      const answer =
        job.phase === "assignment"
          ? brief
          : job.phase === "proposal"
            ? {
                summary: "Write notes",
                actions: [
                  { tool: "write", path: "notes.txt", content: "hello" },
                ],
              }
            : job.phase === "independent-review"
              ? { verdict: "pass", summary: "File matches", issues: [] }
              : { summary: "Verified hello", limitations: [] };
      const accepted = await client.callTool({
        name: "chai_submit_result",
        arguments: { jobId: id, role, resultJSON: JSON.stringify(answer) },
      });
      assert(!accepted.isError);
    };
    const engine = new Engine(
      s.store,
      new Gateway(resolve("src/core/files.py")),
      s.bridge,
    );
    const id = await engine.create(
      "Create notes.txt containing hello",
      s.root,
      "browser",
      "browser",
    );
    await engine.idle();
    assert.equal(s.store.get(id).state, "WAITING_APPROVAL");
    assert(!existsSync(join(s.root, "notes.txt")));
    engine.approve(id, true);
    await engine.idle();
    assert.equal(s.store.get(id).state, "DONE");
    assert.equal(readFileSync(join(s.root, "notes.txt"), "utf8"), "hello");
    assert.equal(s.store.workPlan(id)?.steps[1].status, "pending"); // Reporting is never completion authority.
    assert.equal(
      s.store.events(id).filter((e) => e.kind === "ASSISTANT_PROGRESS").length,
      4,
    );
    assert.deepEqual(phases, [
      "assignment",
      "proposal",
      "independent-review",
      "final-report",
    ]);
    assert.equal(
      s.store.db
        .prepare("SELECT count(*) n FROM browser_jobs WHERE status='ANSWERED'")
        .get()?.n,
      4,
    );
  } finally {
    await client.close();
    await s.close();
  }
});

test("browser result survives database restart; completed jobs are immutable and idempotent", async () => {
  const base = mkdtempSync(join(tmpdir(), "chai-browser-recovery-"));
  const db = join(base, "state.sqlite");
  let store = new Store(db);
  let bridge = new BrowserBridge(store);
  const task = store.create("fixture", base, "browser", "browser");
  const request = {
    taskId: task.id,
    callId: "persistent-call",
    role: "manager" as const,
    phase: "assignment",
    model: "browser",
    system: "fixture",
    input: "{}",
    schema: {},
  };
  const id = crypto.randomUUID();
  store.db
    .prepare("INSERT INTO browser_jobs VALUES(?,?,?,?,?,?,?,?)")
    .run(
      id,
      request.callId,
      task.id,
      "manager",
      JSON.stringify(request),
      null,
      "WAITING",
      new Date().toISOString(),
    );
  store.db
    .prepare("INSERT INTO browser_delivery VALUES(?,?)")
    .run(id, new Date().toISOString());
  store.close();
  store = new Store(db);
  bridge = new BrowserBridge(store);
  bridge.connected = true;
  bridge.deliver = async () => {
    throw Error("Must not resend an already delivered job");
  };
  const pending = bridge.send(request, new AbortController().signal);
  bridge.answer(id, "manager", brief);
  assert.deepEqual(await pending, brief);
  store.state(task.id, "DONE");
  assert.deepEqual(bridge.answer(id, "manager", brief), {
    accepted: true,
    duplicate: true,
  });
  assert.throws(
    () => bridge.answer(id, "manager", { ...brief, summary: "different" }),
    /different/,
  );
  store.close();
  store = new Store(db);
  bridge = new BrowserBridge(store);
  assert.deepEqual(
    await bridge.send(request, new AbortController().signal),
    brief,
  );
  assert.equal(bridge.jobs().length, 1);
  store.close();
});
test("explicit provider retry redelivers an unanswered failed call once with the same job identity", async () => {
  const base = mkdtempSync(join(tmpdir(), "chai-explicit-retry-"));
  const store = new Store(join(base, "state.sqlite"));
  const bridge = new BrowserBridge(store);
  const task = store.create("fixture", base, "browser", "browser");
  const request = {
    taskId: task.id,
    callId: "failed-call",
    role: "manager" as const,
    phase: "assignment",
    model: "browser",
    system: "fixture",
    input: "{}",
    schema: {},
  };
  const id = crypto.randomUUID(),
    created = new Date().toISOString();
  store.db
    .prepare("INSERT INTO browser_jobs VALUES(?,?,?,?,?,?,?,?)")
    .run(
      id,
      request.callId,
      task.id,
      "manager",
      JSON.stringify(request),
      null,
      "WAITING",
      created,
    );
  store.db.prepare("INSERT INTO browser_delivery VALUES(?,?)").run(id, created);
  store.db
    .prepare("INSERT INTO agent_calls VALUES(?,?,?,?,?,?,?,?)")
    .run(request.callId, task.id, "manager", 1, "FAILED", "{}", null, created);
  assert.throws(() => bridge.retryPending(task.id), /current provider request/);
  store.state(task.id, "WAITING_PROVIDER");
  assert.equal(bridge.retryPending(task.id), 1);
  assert.equal(bridge.retryPending(task.id), 0);
  bridge.connected = true;
  let deliveries = 0;
  bridge.deliver = async (role, jobId) => {
    deliveries++;
    assert.equal(jobId, id);
    bridge.answer(jobId, role, brief);
  };
  assert.deepEqual(
    await bridge.send(request, new AbortController().signal),
    brief,
  );
  assert.equal(deliveries, 1);
  assert.equal(bridge.jobs().length, 1);
  assert.equal(bridge.retryPending(task.id), 0);
  assert.deepEqual(
    await bridge.send(request, new AbortController().signal),
    brief,
  );
  assert.equal(deliveries, 1);
  store.close();
});
test("normal tool-server shutdown preserves pairing; explicit disconnect revokes it", async () => {
  const s = await setup();
  const grant = (await (await s.token(s.verifier)).json()) as {
    access_token: string;
  };
  await s.server.close(false);
  const resumed = new ToolServer(new BrowserBridge(s.store), async () => true);
  try {
    resumed.configure(origin);
    assert.equal(resumed.bridge.connected, true);
    await resumed.auth!.verifyAccessToken(grant.access_token);
    await resumed.close();
    await assert.rejects(resumed.auth!.verifyAccessToken(grant.access_token));
  } finally {
    s.store.close();
  }
});

test("restart recognizes a valid refresh grant without accepting expired access tokens", async () => {
  const s = await setup();
  const grant = (await (await s.token(s.verifier)).json()) as {
    access_token: string;
    refresh_token: string;
  };
  s.store.db
    .prepare("UPDATE bridge_tokens SET expires=0 WHERE kind='access'")
    .run();
  await s.server.close(false);
  const resumed = new ToolServer(new BrowserBridge(s.store), async () => true);
  try {
    resumed.configure(origin);
    assert.equal(resumed.bridge.connected, true);
    await assert.rejects(resumed.auth!.verifyAccessToken(grant.access_token));
    await assert.rejects(resumed.auth!.verifyAccessToken(grant.refresh_token));
    const port = await resumed.listen();
    const refreshed = await fetch(`http://127.0.0.1:${port}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: s.client.client_id,
        refresh_token: grant.refresh_token,
        resource: origin + "/mcp",
      }),
    });
    assert.equal(refreshed.status, 200);
    const rotated = (await refreshed.json()) as { access_token: string };
    await resumed.auth!.verifyAccessToken(rotated.access_token);
    resumed.auth!.disconnectAll();
    assert.equal(resumed.auth!.hasActiveGrant(), false);
    await assert.rejects(resumed.auth!.verifyAccessToken(rotated.access_token));
  } finally {
    await resumed.close();
    s.store.close();
  }
});
