import { createConnection } from "node:net";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants, existsSync } from "node:fs";
import {
  mkdir,
  open,
  readdir,
  lstat,
  realpath,
  writeFile,
  readFile,
} from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { homedir } from "node:os";
import type { Action, Task, TerminalSession, Artifact } from "./contracts";
import { redact } from "./contracts";
import type { Store } from "./store";
import type { Gateway } from "./gateway";

import { DurableTerminals } from "./durable-terminal";

const excluded = new Set([
  ".git",
  "node_modules",
  ".venv",
  "venv",
  "__pycache__",
  ".next",
  "dist",
  "build",
  ".cache",
  ".chai-tools",
  ".ssh",
  ".gnupg",
  ".aws",
  ".config",
  ".npmrc",
  ".pypirc",
  "Cookies",
  "Login Data",
  "Local State",
]);
export function safeProjectPath(path: string) {
  if (
    !path ||
    path.startsWith("/") ||
    path.includes("\0") ||
    path
      .split("/")
      .some(
        (p) =>
          !p ||
          p === "." ||
          p === ".." ||
          excluded.has(p) ||
          p.startsWith(".env") ||
          /\.(pem|key|sqlite3?)$/i.test(p),
      )
  )
    throw Error("Protected project path");
  return path;
}
export async function projectFile(
  root: string,
  path: string,
  max = 20_000_000,
) {
  safeProjectPath(path);
  const directories: Awaited<ReturnType<typeof open>>[] = [];
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    let parent = await open(
      root,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
    );
    directories.push(parent);
    const parts = path.split("/");
    for (const part of parts.slice(0, -1)) {
      parent = await open(
        `/proc/self/fd/${parent.fd}/${part}`,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
      );
      directories.push(parent);
    }
    handle = await open(
      `/proc/self/fd/${parent.fd}/${parts.at(-1)}`,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    const stat = await handle.stat();
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > max)
      throw Error("Unsafe file or size limit");
    return await handle.readFile();
  } finally {
    await handle?.close();
    for (const dir of directories.reverse()) await dir.close();
  }
}
export async function projectWrite(root: string, path: string, data: Buffer) {
  safeProjectPath(path);
  const handles: Awaited<ReturnType<typeof open>>[] = [];
  try {
    let parent = await open(
      root,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
    );
    handles.push(parent);
    const parts = path.split("/");
    for (const part of parts.slice(0, -1)) {
      const next = `/proc/self/fd/${parent.fd}/${part}`;
      try {
        await mkdir(next, { mode: 0o700 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
      parent = await open(
        next,
        constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
      );
      handles.push(parent);
    }
    const file = await open(
      `/proc/self/fd/${parent.fd}/${parts.at(-1)}`,
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_WRONLY |
        constants.O_NOFOLLOW,
      0o600,
    );
    try {
      await file.writeFile(data);
      await file.sync();
    } finally {
      await file.close();
    }
  } finally {
    for (const handle of handles.reverse()) await handle.close();
  }
}
export async function projectFiles(root: string, limit = 20000) {
  const files: string[] = [];
  let truncated = false,
    visited = 0;
  async function walk(fd: number, path: string, depth: number): Promise<void> {
    if (depth > 24) {
      truncated = true;
      return;
    }
    for (const entry of await readdir(`/proc/self/fd/${fd}`, {
      withFileTypes: true,
    })) {
      if (files.length >= limit || visited++ > 50000) {
        truncated = true;
        return;
      }
      const name = path ? path + "/" + entry.name : entry.name;
      try {
        safeProjectPath(name);
      } catch {
        continue;
      }
      if (entry.isDirectory()) {
        let child;
        try {
          child = await open(
            `/proc/self/fd/${fd}/${entry.name}`,
            constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
          );
          await walk(child.fd, name, depth + 1);
        } catch (error) {
          if (
            !["ELOOP", "ENOENT", "ENOTDIR"].includes(
              (error as NodeJS.ErrnoException).code ?? "",
            )
          )
            throw error;
        } finally {
          await child?.close();
        }
      } else if (entry.isFile()) {
        try {
          const s = await lstat(`/proc/self/fd/${fd}/${entry.name}`);
          if (s.isFile() && s.nlink === 1) files.push(name);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
      }
    }
  }
  const handle = await open(
    root,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
  );
  try {
    await walk(handle.fd, "", 0);
  } finally {
    await handle.close();
  }
  return { files: files.sort(), truncated };
}
export class ProjectRuntime {
  readonly durable: DurableTerminals;
  private running = new Map<
    string,
    {
      child: ChildProcessWithoutNullStreams;
      timer: ReturnType<typeof setTimeout>;
      record: TerminalSession;
      done: Promise<TerminalSession>;
    }
  >();
  github?: (
    repo: string,
    args: string[],
    signal: AbortSignal,
  ) => Promise<unknown>;
  consent?: (title: string, detail: string) => Promise<boolean>;
  constructor(
    readonly store: Store,
    readonly gateway: Gateway,
    readonly directory: string,
  ) {
    this.durable = new DurableTerminals(
      join(dirname(directory), "terminal-workers"),
    );
    store.db.exec(
      "CREATE TABLE IF NOT EXISTS terminal_sessions(id TEXT PRIMARY KEY,taskId TEXT NOT NULL,body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS artifacts(taskId TEXT NOT NULL,path TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(taskId,path));",
    );
    for (const r of store.db
      .prepare("SELECT body FROM terminal_sessions")
      .all()) {
      const session = JSON.parse(String(r.body)) as TerminalSession;
      if (session.state === "running" && !session.durable) {
        session.state = "interrupted";
        session.termination = "Application restarted; command was not replayed";
        this.save(session);
      }
    }
  }
  ownsRoot(root: string) {
    return this.store
      .tasks()
      .some(
        (task) =>
          task.capabilities?.project &&
          task.sourceRoot &&
          resolve(task.root) === root &&
          resolve(this.directory, task.id) === root,
      );
  }
  private save(s: TerminalSession) {
    s.updated = new Date().toISOString();
    this.store.db
      .prepare("INSERT OR REPLACE INTO terminal_sessions VALUES(?,?,?)")
      .run(s.id, s.taskId, JSON.stringify(s));
  }
  sessions(taskId: string): TerminalSession[] {
    return this.store.db
      .prepare(
        "SELECT body FROM terminal_sessions WHERE taskId=? ORDER BY rowid",
      )
      .all(taskId)
      .map((r) => this.durable.refresh(JSON.parse(String(r.body))));
  }
  private owned(task: Task, id?: string) {
    const s = this.sessions(task.id).find((s) => s.id === id);
    if (!s) throw Error("Unknown task session");
    return s;
  }
  async prepare(task: Task) {
    if (!task.capabilities?.project) return;
    const source = task.root,
      target = join(this.directory, task.id);
    await mkdir(target, { recursive: false, mode: 0o700 });
    const inventory = await projectFiles(source);
    let total = 0;
    if (inventory.truncated)
      throw Error(
        "Project exceeds 20,000 source files; select a smaller project",
      );
    for (const path of inventory.files) {
      const data = await projectFile(source, path);
      total += data.length;
      if (total > 250_000_000) throw Error("Project source exceeds 250 MB");
      await mkdir(dirname(join(target, path)), { recursive: true });
      await writeFile(join(target, path), data, { flag: "wx", mode: 0o600 });
    }
    await this.git(target, ["init", "-b", "chai/" + task.id]);
    // Preserve source history without checking out hooks, credentials or dependency trees.
    if (existsSync(join(source, ".git"))) {
      await this.git(target, [
        "-c",
        "protocol.file.allow=always",
        "fetch",
        "--no-tags",
        source,
        "HEAD",
      ]);
      await this.git(target, ["reset", "--mixed", "FETCH_HEAD"]);
      try {
        const remote = (
          await this.git(source, ["remote", "get-url", "origin"])
        ).trim();
        const match = remote.match(
          /^(?:https:\/\/github\.com\/|git@github\.com:)([\w.-]+\/[\w.-]+?)(?:\.git)?$/,
        );
        if (match) this.store.setting("project-repo:" + task.id, match[1]);
      } catch {
        /* Local-only repository. */
      }
    }
    if (inventory.files.length)
      await this.git(target, ["add", "--", ...inventory.files]);
    await this.git(target, [
      "-c",
      "user.name=CHAI",
      "-c",
      "user.email=chai@localhost",
      "commit",
      "--allow-empty",
      "-m",
      "CHAI project baseline",
    ]);
    task.sourceRoot = source;
    task.root = target;
    this.store.put(task);
    this.store.event(
      task.id,
      "manager",
      "PROJECT_CREATED",
      `Isolated project copied from ${source}. ${inventory.files.length} source files; dependencies, credentials and symlinks excluded. Original project unchanged.`,
    );
  }
  async git(root: string, args: string[], signal?: AbortSignal) {
    return this.gateway.run(
      "/usr/bin/git",
      [
        "-c",
        "core.hooksPath=/dev/null",
        "-c",
        "core.fsmonitor=false",
        "-c",
        "core.attributesFile=/dev/null",
        "-c",
        "diff.external=",
        "-c",
        "commit.gpgsign=false",
        ...args,
      ],
      root,
      signal,
      undefined,
      120000,
    );
  }
  private assert(task: Task) {
    if (
      !task.capabilities?.project ||
      !task.sourceRoot ||
      resolve(task.root) !== resolve(this.directory, task.id)
    )
      throw Error("Enable isolated project execution when creating the task");
  }
  async execute(
    task: Task,
    a: Extract<Action, { tool: "terminal" }>,
    signal: AbortSignal,
    effectKey?: string,
  ) {
    signal.throwIfAborted();
    if (a.operation !== "start") {
      const s = this.owned(task, a.sessionId);
      if (a.operation === "input") {
        if (s.target === "host" && !this.store.hasHostGrant(task))
          throw Error("Host execution grant was revoked");
        if (s.durable) {
          if (s.state !== "running") throw Error("Session is not running");
          this.durable.control(s.id, "input", a.input ?? "");
          return s;
        }
        const live = this.running.get(s.id);
        if (!live) throw Error("Session is not running");
        live.child.stdin.write(a.input ?? "");
      }
      if (a.operation === "stop") this.stopSession(task, s.id);
      return this.owned(task, s.id);
    }
    const host = a.target === "host";
    if (host) {
      if (!this.store.hasHostGrant(task))
        throw Error("Host execution requires a native task grant");
    } else this.assert(task);
    const previous =
      effectKey &&
      this.sessions(task.id).find((s) => s.effectKey === effectKey);
    if (previous) {
      if (!previous.durable || previous.state === "interrupted")
        throw Error(
          "Interrupted terminal has unknown outcome; inspect its evidence",
        );
      return a.background ? previous : this.durable.wait(previous, signal);
    }
    if (!a.program) throw Error("Program required");
    if (!host && !existsSync("/usr/bin/bwrap"))
      throw Error("Bubblewrap is required; no host-shell fallback");
    if (a.port && (!a.background || (!host && !task.capabilities?.network)))
      throw Error(
        "Preview server requires background mode and task network access",
      );
    if (
      this.store
        .tasks()
        .flatMap((t) => this.sessions(t.id))
        .filter((s) => s.state === "running").length >= 6
    )
      throw Error("Six active sessions maximum; stop an existing session");
    const cwd = host
      ? await realpath(resolve(task.sourceRoot ?? task.root, a.cwd ?? "."))
      : a.cwd
        ? safeProjectPath(a.cwd)
        : "";
    if (
      !host &&
      cwd &&
      (await realpath(join(task.root, cwd))) !== join(task.root, cwd)
    )
      throw Error("Unsafe working directory");
    const args = host
      ? [...a.args]
      : [
          "--unshare-all",
          "--unshare-user",
          "--disable-userns",
          "--die-with-parent",
          "--new-session",
          "--cap-drop",
          "ALL",
        ];
    if (!host) {
      if (task.capabilities?.network) args.push("--share-net");
      for (const p of ["/usr", "/bin", "/lib", "/lib64"])
        if (existsSync(p)) args.push("--ro-bind", p, p);
      args.push(
        "--proc",
        "/proc",
        "--dev",
        "/dev",
        "--tmpfs",
        "/tmp",
        "--dir",
        "/home",
        "--dir",
        "/home/chai",
        "--dir",
        "/etc",
      );
      for (const p of [
        "/etc/ssl",
        "/etc/resolv.conf",
        "/etc/hosts",
        "/etc/nsswitch.conf",
      ])
        if (existsSync(p)) args.push("--ro-bind", p, p);
      args.push(
        "--bind",
        task.root,
        "/workspace",
        "--tmpfs",
        "/workspace/.git",
        "--chdir",
        "/workspace" + (cwd ? "/" + cwd : ""),
        "--clearenv",
        "--setenv",
        "PATH",
        "/workspace/node_modules/.bin:/usr/local/bin:/usr/bin:/bin",
        "--setenv",
        "HOME",
        "/home/chai",
        "--setenv",
        "LANG",
        "C.UTF-8",
        "--setenv",
        "CI",
        "1",
        "--setenv",
        "PIP_DISABLE_PIP_VERSION_CHECK",
        "1",
        "--setenv",
        "npm_config_cache",
        "/workspace/.cache/npm",
        "--setenv",
        "PYTHONUNBUFFERED",
        "1",
        a.program,
        ...a.args,
      );
    }
    const env: NodeJS.ProcessEnv = host
      ? {
          PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
          HOME: homedir(),
          USER: process.env.USER,
          LANG: process.env.LANG ?? "C.UTF-8",
          TERM: "xterm-256color",
          DISPLAY: process.env.DISPLAY,
          WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY,
          XAUTHORITY: process.env.XAUTHORITY,
          XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR,
          DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS,
          PYTHONUNBUFFERED: "1",
        }
      : { PATH: "/usr/bin:/bin", LANG: "C.UTF-8" };
    const s: TerminalSession = {
      id: randomUUID(),
      taskId: task.id,
      program: a.program,
      target: host ? "host" : "project",
      durable: Boolean(task.capabilities?.durable),
      ...(effectKey ? { effectKey } : {}),
      args: a.args,
      cwd: cwd || ".",
      state: "running",
      output: "",
      exitCode: null,
      termination: null,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      ...(a.port ? { port: a.port } : {}),
    };
    this.save(s);
    if (s.durable) {
      this.durable.launch(
        s,
        [host ? a.program : "/usr/bin/bwrap", ...args],
        host ? cwd : task.root,
        env,
        a.timeoutSeconds,
      );
      this.store.event(
        task.id,
        "builder",
        "TERMINAL_STARTED",
        JSON.stringify({ sessionId: s.id, target: s.target, durable: true }),
      );
      if (a.background && a.port) {
        for (let attempt = 0; attempt < 100; attempt++) {
          signal.throwIfAborted();
          if (this.durable.refresh(s).state !== "running") return s;
          const ready = await new Promise<boolean>((resolve) => {
            const socket = createConnection({
              host: "127.0.0.1",
              port: a.port!,
            });
            const finish = (ready: boolean) => {
              socket.destroy();
              resolve(ready);
            };
            socket.once("connect", () => finish(true));
            socket.once("error", () => finish(false));
            socket.setTimeout(200, () => finish(false));
          });
          if (ready) return s;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        this.durable.control(s.id, "stop");
        throw Error("Preview port did not become ready; command stopped");
      }
      return a.background ? s : this.durable.wait(s, signal);
    }
    const child = spawn(host ? a.program : "/usr/bin/bwrap", args, {
      cwd: host ? cwd : task.root,
      detached: true,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let finish!: (s: TerminalSession) => void;
    const done = new Promise<TerminalSession>((r) => {
      finish = r;
    });
    const stop = (why: string) => {
      s.termination = why;
      try {
        process.kill(-child.pid!, "SIGKILL");
      } catch {
        /* exited */
      }
    };
    const timer = setTimeout(() => stop("timeout"), a.timeoutSeconds * 1000);
    this.running.set(s.id, { child, timer, record: s, done });
    const output = (d: Buffer) => {
      s.output = redact(s.output + d.toString());
      if (s.output.length > 240000) {
        s.output = s.output.slice(-240000);
        stop("output-limit");
      }
      this.save(s);
    };
    child.stdout.on("data", output);
    child.stderr.on("data", output);
    child.stdin.on("error", () => {});
    child.on("error", (e) => {
      s.termination = String(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      s.exitCode = code;
      s.state = "exited";
      this.save(s);
      this.running.delete(s.id);
      this.store.event(
        task.id,
        "builder",
        "TERMINAL_EXIT",
        `${a.program}: exit ${code}, ${s.termination ?? "completed"}`,
      );
      finish(s);
    });
    this.store.event(
      task.id,
      "builder",
      "TERMINAL_STARTED",
      JSON.stringify({
        sessionId: s.id,
        target: s.target,
        program: a.program,
        args: a.args,
        port: a.port,
      }),
    );
    if (a.background) {
      if (a.port) {
        for (
          let attempt = 0;
          attempt < 100 && s.state === "running";
          attempt++
        ) {
          signal.throwIfAborted();
          const ready = await new Promise<boolean>((resolve) => {
            const socket = createConnection({
              host: "127.0.0.1",
              port: a.port!,
            });
            let ended = false;
            const finish = (ready: boolean) => {
              if (ended) return;
              ended = true;
              socket.destroy();
              resolve(ready);
            };
            socket.on("connect", () => finish(true));
            socket.on("error", () => finish(false));
            socket.setTimeout(200, () => finish(false));
          });
          if (ready) return { ...s };
          await new Promise((r) => setTimeout(r, 100));
        }
        if (s.state === "running") {
          stop("preview port did not become ready");
          await done;
        }
      }
      return { ...s };
    }
    const abort = () => stop("canceled");
    signal.addEventListener("abort", abort, { once: true });
    try {
      return await done;
    } finally {
      signal.removeEventListener("abort", abort);
    }
  }
  stopSession(task: Task, id: string) {
    const session = this.owned(task, id);
    if (session.durable && session.state === "running") {
      this.durable.control(id, "stop");
      return;
    }
    const live = this.running.get(id);
    if (live) {
      live.record.termination = "stopped";
      try {
        process.kill(-live.child.pid!, "SIGKILL");
      } catch {
        /* exited */
      }
    }
  }
  stopTask(task: Task) {
    for (const s of this.sessions(task.id))
      if (s.state === "running") this.stopSession(task, s.id);
  }
  stop(preserveDurable = false) {
    if (!preserveDurable)
      for (const task of this.store.tasks()) this.stopTask(task);
    for (const live of this.running.values()) {
      live.record.termination = "application stopped";
      try {
        process.kill(-live.child.pid!, "SIGKILL");
      } catch {
        /* exited */
      }
    }
  }
  previewAllowed(task: Task, url: string) {
    try {
      const u = new URL(url);
      return (
        ["http:", "ws:"].includes(u.protocol) &&
        u.hostname === "127.0.0.1" &&
        this.sessions(task.id).some(
          (s) => s.state === "running" && s.port === Number(u.port),
        )
      );
    } catch {
      return false;
    }
  }
  private async changedPaths(root: string) {
    const tracked = (await this.git(root, ["ls-files", "-z"]))
      .split("\0")
      .filter(Boolean);
    return [
      ...new Set([...(await projectFiles(root)).files, ...tracked]),
    ].filter((path) => {
      try {
        safeProjectPath(path);
        return true;
      } catch {
        return false;
      }
    });
  }
  async repository(
    task: Task,
    a: Extract<Action, { tool: "repository" }>,
    signal: AbortSignal,
  ) {
    if (
      ["status", "diff", "commit", "branch", "pr", "ci"].includes(a.operation)
    )
      this.assert(task);
    if (a.operation === "files") {
      const all = await projectFiles(task.root);
      return {
        ...all,
        files: all.files.slice(a.offset, a.offset + a.limit),
        total: all.files.length,
      };
    }
    if (a.operation === "read") {
      const text = (await projectFile(task.root, a.path!, 2_000_000)).toString(
        "utf8",
      );
      return {
        path: a.path,
        hash: createHash("sha256").update(text).digest("hex"),
        lines: text.split("\n").slice(a.offset, a.offset + a.limit),
        totalLines: text.split("\n").length,
      };
    }
    if (a.operation === "search") {
      if (!a.query) throw Error("Query required");
      const found: { path: string; line: number; text: string }[] = [];
      const all = await projectFiles(task.root);
      for (const path of all.files) {
        signal.throwIfAborted();
        let data;
        try {
          data = await projectFile(task.root, path, 2_000_000);
        } catch {
          continue;
        }
        if (data.includes(0)) continue;
        const lines = data.toString("utf8").split("\n");
        for (let i = 0; i < lines.length; i++)
          if (lines[i].includes(a.query))
            found.push({ path, line: i + 1, text: lines[i].slice(0, 500) });
        if (found.length >= a.offset + a.limit) break;
      }
      return {
        matches: found.slice(a.offset, a.offset + a.limit),
        truncated: found.length >= a.offset + a.limit,
      };
    }
    if (a.operation === "patch") {
      if (!a.path || !a.before || a.after === undefined || !a.expectedHash)
        throw Error("Patch needs path, exact before/after and observed SHA256");
      const data = (await projectFile(task.root, a.path, 100000)).toString(
        "utf8",
      );
      if (createHash("sha256").update(data).digest("hex") !== a.expectedHash)
        throw Error("Patch conflict: file changed");
      if (data.split(a.before).length !== 2)
        throw Error("Patch must match exactly once");
      const content = data.replace(a.before, a.after);
      await this.gateway.file(
        task.root,
        "write",
        a.path,
        { expected: data, content },
        signal,
      );
      return {
        path: a.path,
        before: data,
        after: content,
        hash: createHash("sha256").update(content).digest("hex"),
      };
    }
    if (a.operation === "status")
      return {
        status: await this.git(task.root, ["status", "--short"], signal),
        branch: (
          await this.git(task.root, ["branch", "--show-current"], signal)
        ).trim(),
        source: task.sourceRoot,
      };
    if (a.operation === "diff") {
      const paths = await this.changedPaths(task.root);
      if (!paths.length) return { patch: "" };
      await this.git(
        task.root,
        ["add", "--intent-to-add", "--", ...paths],
        signal,
      );
      return {
        patch: await this.git(
          task.root,
          ["diff", "--no-ext-diff", "--no-textconv", "HEAD", "--", ...paths],
          signal,
        ),
      };
    }
    if (a.operation === "commit") {
      const paths = await this.changedPaths(task.root);
      if (!paths.length) return { unchanged: true };
      await this.git(task.root, ["add", "--all", "--", ...paths], signal);
      const patch = await this.git(
        task.root,
        ["diff", "--cached", "--no-ext-diff", "--no-textconv"],
        signal,
      );
      if (!patch) return { unchanged: true };
      if (
        !a.message ||
        !(await this.consent?.(
          "Commit project changes?",
          `${a.message}\n\n${patch}`,
        ))
      ) {
        await this.git(task.root, ["reset"], signal);
        throw Error("Commit declined");
      }
      await this.git(
        task.root,
        [
          "-c",
          "user.name=CHAI",
          "-c",
          "user.email=chai@localhost",
          "commit",
          "-m",
          a.message,
        ],
        signal,
      );
      return {
        commit: (
          await this.git(task.root, ["rev-parse", "HEAD"], signal)
        ).trim(),
      };
    }
    if (a.operation === "branch") {
      if (!a.branch || a.branch.includes(".."))
        throw Error("Valid branch required");
      await this.git(task.root, ["switch", "-c", a.branch], signal);
      return { branch: a.branch };
    }
    if (a.operation === "pr" || a.operation === "ci") {
      const repo = this.store.setting("project-repo:" + task.id);
      if (!repo)
        throw Error(
          "Source needs a GitHub origin, or use an authenticated GitHub connector",
        );
      if (!task.capabilities?.network)
        throw Error("Network was not authorized for this task");
      if (!this.github) throw Error("GitHub integration is unavailable");
      if (a.operation === "ci")
        return this.github(
          repo,
          [
            "run",
            "list",
            "--repo",
            repo,
            "--limit",
            "10",
            "--json",
            "databaseId,status,conclusion,headBranch,url",
          ],
          signal,
        );
      const branch = (
        await this.git(task.root, ["branch", "--show-current"], signal)
      ).trim();
      const diff = await this.git(
        task.root,
        ["log", "--oneline", "-5"],
        signal,
      );
      if (
        !(await this.consent?.(
          "Publish branch and create draft pull request?",
          `${repo} · ${branch}\n${a.message ?? task.goal}\n${diff}`,
        ))
      )
        throw Error("Publish declined");
      return this.github(
        repo,
        ["chai-publish", task.root, branch, a.message ?? task.goal],
        signal,
      );
    }
    throw Error("Unknown repository operation");
  }
  async artifact(
    task: Task,
    a: Extract<Action, { tool: "artifact" }>,
    signal: AbortSignal,
  ) {
    if (a.operation === "list") return this.artifacts(task.id);
    if (a.operation === "register")
      return this.register(task, a.path!, a.title);
    this.assert(task);
    if (!a.format || !a.path || !a.path.endsWith("." + a.format))
      throw Error("Choose a matching document format and output path");
    safeProjectPath(a.path);
    const spec = JSON.stringify(a);
    if (spec.length > 100000)
      throw Error("Document specification exceeds 100 KB");
    const helper = await readFile(
      join(dirname(this.gateway.script), "artifacts.py"),
      "utf8",
    );
    const specName = "chai-document-" + randomUUID() + ".json",
      scriptName = "chai-render-" + randomUUID() + ".py";
    await this.gateway.file(
      task.root,
      "write",
      specName,
      { expected: null, content: spec },
      signal,
    );
    await this.gateway.file(
      task.root,
      "write",
      scriptName,
      { expected: null, content: helper },
      signal,
    );
    const packages: Record<string, string> = {
      pdf: "reportlab==4.4.3",
      docx: "python-docx==1.2.0",
      xlsx: "openpyxl==3.1.5",
      pptx: "python-pptx==1.0.2",
    };
    if (!existsSync(join(task.root, ".chai-tools/bin/python"))) {
      const setup = await this.execute(
        task,
        {
          tool: "terminal",
          operation: "start",
          program: "python3",
          args: ["-m", "venv", ".chai-tools"],
          timeoutSeconds: 120,
          background: false,
        },
        signal,
      );
      if (setup.exitCode !== 0)
        throw Error("Document environment setup failed: " + setup.output);
    }
    const module = {
      pdf: "reportlab",
      docx: "docx",
      xlsx: "openpyxl",
      pptx: "pptx",
    }[a.format];
    const check = await this.execute(
      task,
      {
        tool: "terminal",
        operation: "start",
        program: "bash",
        args: ["-c", `.chai-tools/bin/python -c 'import ${module}'`],
        timeoutSeconds: 30,
        background: false,
      },
      signal,
    );
    if (check.exitCode !== 0) {
      if (!task.capabilities?.network)
        throw Error(
          "Document library needs package download permission; enable network on a new project task",
        );
      const install = await this.execute(
        task,
        {
          tool: "terminal",
          operation: "start",
          program: "bash",
          args: [
            "-c",
            `.chai-tools/bin/python -m pip install ${packages[a.format]}`,
          ],
          timeoutSeconds: 300,
          background: false,
        },
        signal,
      );
      if (install.exitCode !== 0)
        throw Error(
          "Document dependency installation failed: " + install.output,
        );
    }
    const result = await this.execute(
      task,
      {
        tool: "terminal",
        operation: "start",
        program: "bash",
        args: [
          "-c",
          '.chai-tools/bin/python "$1" "$2"',
          "chai",
          scriptName,
          specName,
        ],
        timeoutSeconds: 60,
        background: false,
      },
      signal,
    );
    if (result.exitCode !== 0)
      throw Error("Document rendering failed: " + result.output);
    return this.register(task, a.path, a.title);
  }
  artifacts(taskId: string): Artifact[] {
    return this.store.db
      .prepare("SELECT body FROM artifacts WHERE taskId=? ORDER BY rowid")
      .all(taskId)
      .map((r) => JSON.parse(String(r.body)));
  }
  async register(task: Task, path: string, title?: string) {
    const data = await projectFile(task.root, path);
    const mime: Record<string, string> = {
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      svg: "image/svg+xml",
      html: "text/html",
      csv: "text/csv",
      json: "application/json",
      txt: "text/plain",
      md: "text/markdown",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    };
    const artifact: Artifact = {
      path,
      title: title || path.split("/").at(-1)!,
      bytes: data.length,
      sha256: createHash("sha256").update(data).digest("hex"),
      mime: mime[path.split(".").at(-1)!] || "application/octet-stream",
    };
    this.store.db
      .prepare("INSERT OR REPLACE INTO artifacts VALUES(?,?,?)")
      .run(task.id, path, JSON.stringify(artifact));
    return artifact;
  }
}
