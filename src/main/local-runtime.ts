import { spawn } from "node:child_process";
import { existsSync, openSync, closeSync } from "node:fs";
import { join } from "node:path";
import { models } from "../core/providers";

let starting: Promise<string[]> | undefined;
/** Starts only the optional CHAI-owned runtime. Never downloads models or changes autostart. */
export function startLocalRuntime(home: string): Promise<string[]> {
  if (starting) return starting;
  starting = start(home).finally(() => {
    starting = undefined;
  });
  return starting;
}
async function start(home: string) {
  try {
    return await models();
  } catch {
    /* not running */
  }
  const root = join(home, ".local/opt/chai-ollama");
  const binary = join(root, "bin/ollama");
  if (!existsSync(binary))
    throw Error(
      "CHAI-owned Ollama runtime is not installed. Start your own Ollama service, then check installed models.",
    );
  const log = openSync(join(root, "server.log"), "a", 0o600);
  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(binary, ["serve"], {
      detached: true,
      stdio: ["ignore", log, log],
      cwd: root,
      env: {
        HOME: home,
        PATH: "/usr/local/bin:/usr/bin:/bin",
        LANG: "C.UTF-8",
        OLLAMA_HOST: "127.0.0.1:11434",
        OLLAMA_MODELS: join(home, ".local/share/chai-models"),
        OLLAMA_NUM_PARALLEL: "1",
        OLLAMA_MAX_LOADED_MODELS: "1",
        OLLAMA_NO_CLOUD: "1",
      },
    });
  } finally {
    closeSync(log);
  }
  await new Promise<void>((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  child.unref();
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise((r) => setTimeout(r, 400));
    try {
      return await models();
    } catch {
      /* give startup a bounded interval */
    }
  }
  throw Error(
    "Local model service did not become ready. Inspect ~/.local/opt/chai-ollama/server.log.",
  );
}
