import { createServer } from "node:https";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import assert from "node:assert/strict";
import { Store } from "../src/core/store";
import { Connectors } from "../src/core/connectors";
if (process.env.CHAI_CONNECTOR_FIXTURE) {
  const base = process.env.CHAI_CONNECTOR_FIXTURE;
  const store = new Store(join(base, "client.sqlite"));
  let consent = false;
  const client = new Connectors(
    store,
    (s) => Buffer.from(s).toString("base64"),
    (s) => Buffer.from(s, "base64").toString(),
    async () => consent,
  );
  client.save(
    "fixture",
    `https://localhost:${process.env.CHAI_FIXTURE_PORT}/mcp`,
    "fixture-only",
  );
  const task = store.create(
    "Connector verification",
    base,
    "assisted",
    "fixture",
  );
  task.capabilities = { browser: false, origins: [], connectors: ["fixture"] };
  const signal = new AbortController().signal;
  try {
    const tools = (await client.execute(
      task,
      {
        tool: "connector",
        name: "fixture",
        operation: "tools",
        arguments: "{}",
      },
      signal,
    )) as { tools: { name: string }[] };
    assert.equal(tools.tools[0].name, "echo");
    await assert.rejects(
      client.execute(
        task,
        {
          tool: "connector",
          name: "fixture",
          operation: "call",
          nameOfTool: "echo",
          arguments: '{"value":"verified"}',
        },
        signal,
      ),
      /declined/,
    );
    consent = true;
    const result = (await client.execute(
      task,
      {
        tool: "connector",
        name: "fixture",
        operation: "call",
        nameOfTool: "echo",
        arguments: '{"value":"verified"}',
      },
      signal,
    )) as { content: { text: string }[] };
    assert.equal(result.content[0].text, "verified");
    client.save(
      "fixture",
      `https://localhost:${process.env.CHAI_FIXTURE_PORT}/mcp`,
      "invalid-fixture-token",
    );
    await assert.rejects(
      client.execute(
        task,
        {
          tool: "connector",
          name: "fixture",
          operation: "tools",
          arguments: "{}",
        },
        signal,
      ),
      /authentication failed.*OAuth-only app connections are not implemented/,
    );
    console.log("AUTHENTICATED_MCP_PASS");
  } finally {
    store.close();
  }
} else {
  const base = mkdtempSync(join(tmpdir(), "chai-mcp-tls-"));
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
  let calls = 0;
  const server = createServer(
    {
      key: readFileSync(join(base, "key.pem")),
      cert: readFileSync(join(base, "cert.pem")),
    },
    async (req, res) => {
      if (req.headers.authorization !== "Bearer fixture-only") {
        res.writeHead(401);
        res.end();
        return;
      }
      if (req.method !== "POST") {
        res.writeHead(405);
        res.end();
        return;
      }
      let text = "";
      for await (const data of req) text += data;
      const message = JSON.parse(text);
      if (message.id === undefined) {
        res.writeHead(202);
        res.end();
        return;
      }
      let result: unknown;
      if (message.method === "initialize")
        result = {
          protocolVersion: "2025-03-26",
          capabilities: { tools: {} },
          serverInfo: { name: "CHAI test fixture", version: "1" },
        };
      else if (message.method === "tools/list")
        result = {
          tools: [
            {
              name: "echo",
              description: "Return a fixture value",
              inputSchema: {
                type: "object",
                properties: { value: { type: "string" } },
                required: ["value"],
              },
            },
          ],
        };
      else if (message.method === "tools/call") {
        calls++;
        result = {
          content: [{ type: "text", text: message.params.arguments.value }],
        };
      } else result = {};
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: message.id, result }));
    },
  );
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  try {
    const exit = await new Promise<number | null>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["--import", "tsx", "tests/connectors.integration.ts"],
        {
          env: {
            ...process.env,
            NODE_EXTRA_CA_CERTS: join(base, "cert.pem"),
            CHAI_CONNECTOR_FIXTURE: base,
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
    assert.equal(calls, 1);
    console.log("CONNECTOR_TLS_CONSENT_E2E_PASS");
  } finally {
    server.close();
  }
}
