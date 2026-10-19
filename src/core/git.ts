import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Gateway } from "./gateway";
import type { Action } from "./contracts";
export type GitAction = Extract<Action, { tool: "git" }>;
export type GitConsent = (title: string, detail: string) => Promise<boolean>;

function repository(root: string) {
  const dir = join(root, ".git");
  if (
    !existsSync(dir) ||
    !lstatSync(dir).isDirectory() ||
    lstatSync(dir).isSymbolicLink() ||
    realpathSync(dir) !== dir
  )
    throw Error(
      "Choose a repository root with its own .git directory; linked worktrees and symlinked Git directories are not supported.",
    );
  if (!existsSync("/usr/bin/bwrap") || !existsSync("/usr/bin/git"))
    throw Error(
      "Git tools require Git and Bubblewrap; no unisolated fallback.",
    );
}
async function command(
  gateway: Gateway,
  root: string,
  work: string,
  args: string[],
  signal: AbortSignal,
  input?: string,
  writable = false,
  privateObjects = true,
  actualIndex = false,
) {
  repository(root);
  const flags = [
    "--unshare-all",
    "--unshare-user",
    "--disable-userns",
    "--die-with-parent",
    "--new-session",
    "--cap-drop",
    "ALL",
    "--ro-bind",
    "/usr",
    "/usr",
  ];
  for (const dir of ["/bin", "/lib", "/lib64"])
    if (existsSync(dir)) flags.push("--ro-bind", dir, dir);
  flags.push(
    "--proc",
    "/proc",
    "--dev",
    "/dev",
    "--tmpfs",
    "/tmp",
    "--ro-bind",
    root,
    "/workspace",
    "--bind",
    work,
    "/work",
  );
  if (writable) flags.push("--bind", join(root, ".git"), "/workspace/.git");
  flags.push("--chdir", "/workspace", "--clearenv");
  const env: Record<string, string> = {
    PATH: "/usr/bin:/bin",
    LANG: "C.UTF-8",
    HOME: "/nonexistent",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_NO_LAZY_FETCH: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_INDEX_FILE: actualIndex ? "/workspace/.git/index" : "/work/index",
    GIT_AUTHOR_NAME: "CHAI",
    GIT_AUTHOR_EMAIL: "chai@localhost",
    GIT_COMMITTER_NAME: "CHAI",
    GIT_COMMITTER_EMAIL: "chai@localhost",
  };
  if (privateObjects) {
    env.GIT_OBJECT_DIRECTORY = "/work/objects";
    env.GIT_ALTERNATE_OBJECT_DIRECTORIES = "/workspace/.git/objects";
  }
  for (const [key, value] of Object.entries(env))
    flags.push("--setenv", key, value);
  flags.push(
    "/usr/bin/git",
    "--no-pager",
    "--no-replace-objects",
    "--literal-pathspecs",
    "-c",
    "core.hooksPath=/dev/null",
    "-c",
    "core.fsmonitor=false",
    "-c",
    "commit.gpgSign=false",
    "-c",
    "core.filemode=false",
    "-c",
    "core.attributesFile=/dev/null",
    ...args,
  );
  return gateway.run("/usr/bin/bwrap", flags, root, signal, input, 15000);
}
async function temporary<T>(
  root: string,
  callback: (work: string) => Promise<T>,
) {
  repository(root);
  const work = await mkdtemp(join(tmpdir(), "chai-git-"));
  await mkdir(join(work, "objects"), { mode: 0o700 });
  try {
    return await callback(work);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
export async function gitHead(
  gateway: Gateway,
  root: string,
  signal: AbortSignal,
) {
  return temporary(root, async (work) => {
    const value = (
      await command(
        gateway,
        root,
        work,
        ["rev-parse", "--verify", "HEAD^{commit}"],
        signal,
      )
    ).trim();
    if (!/^[a-f0-9]{40,64}$/.test(value))
      throw Error("Git requires an existing initial commit.");
    return value;
  });
}
export async function gitLegacyInspection(
  gateway: Gateway,
  root: string,
  operation: string,
  signal: AbortSignal,
) {
  return temporary(root, (work) =>
    command(
      gateway,
      root,
      work,
      operation === "git-status"
        ? [
            "status",
            "--short",
            "--untracked-files=no",
            "--ignore-submodules=all",
          ]
        : [
            "diff",
            "--no-ext-diff",
            "--no-textconv",
            "--ignore-submodules=all",
            "--stat",
            "HEAD",
          ],
      signal,
      undefined,
      false,
      true,
      true,
    ),
  );
}
export async function gitAction(
  gateway: Gateway,
  root: string,
  action: GitAction,
  branch: string,
  signal: AbortSignal,
  consent?: GitConsent,
) {
  if (!action.paths.length) throw Error("Select files for Git inspection.");
  if (
    action.operation === "commit" &&
    (!consent || !action.expectedHead || !action.expectedHashes)
  )
    throw Error("Git commit needs a prepared plan and local confirmation.");
  return temporary(root, async (work) => {
    const run = (
      args: string[],
      input?: string,
      writable = false,
      privateObjects = true,
    ) =>
      command(
        gateway,
        root,
        work,
        args,
        signal,
        input,
        writable,
        privateObjects,
      );
    const head = (await run(["rev-parse", "--verify", "HEAD^{commit}"])).trim();
    if (!/^[a-f0-9]{40,64}$/.test(head))
      throw Error("Git requires an initial commit.");
    if (action.expectedHead && head !== action.expectedHead)
      throw Error("Git HEAD changed since plan preparation.");
    const files: {
      path: string;
      content: string;
      sha256: string;
      mode: string;
    }[] = [];
    let bytes = 0;
    for (const path of action.paths) {
      const file = await gateway.file(root, "read", path, {}, signal);
      if (file.content == null || !file.hash)
        throw Error("Git selection must contain existing text files: " + path);
      if (action.expectedHashes && file.hash !== action.expectedHashes[path])
        throw Error("Git input changed since plan preparation: " + path);
      bytes += Buffer.byteLength(file.content);
      if (bytes > 24000)
        throw Error("Git selection exceeds 24 KB; select fewer files.");
      const entry = await run(["ls-tree", head, "--", path]);
      if (entry && !/^100(644|755) blob /.test(entry))
        throw Error("Git selection contains a non-regular tracked entry.");
      files.push({
        path,
        content: file.content,
        sha256: file.hash,
        mode: entry.startsWith("100755") ? "100755" : "100644",
      });
    }
    async function stage(writable = false, privateObjects = true) {
      await run(["read-tree", head], undefined, writable, privateObjects);
      for (const file of files) {
        const hash = (
          await run(
            ["hash-object", "-w", "--stdin"],
            file.content,
            writable,
            privateObjects,
          )
        ).trim();
        await run(
          ["update-index", "--add", "--cacheinfo", file.mode, hash, file.path],
          undefined,
          writable,
          privateObjects,
        );
      }
    }
    await stage();
    const patch = await run([
      "diff",
      "--cached",
      "--no-ext-diff",
      "--no-textconv",
      "--ignore-submodules=all",
      "--no-color",
      head,
      "--",
      ...action.paths,
    ]);
    if (patch.length > 28000)
      throw Error("Diff is too large to review; select fewer files.");
    const changed = !!patch.trim();
    const evidence = {
      head,
      files: files.map(({ path, sha256, mode }) => ({ path, sha256, mode })),
      patch,
      changed,
      isolation: "bubblewrap",
    };
    if (action.operation !== "commit") return evidence;
    if (!changed)
      throw Error("Selected files have no content changes to commit.");
    if (!action.message?.trim()) throw Error("A commit message is required.");
    if (!/^chai\/[a-f0-9-]+$/.test(branch))
      throw Error("Invalid generated review branch.");
    const detail =
      "Create local review branch " +
      branch +
      " from " +
      head +
      "?\n\nMessage: " +
      action.message +
      "\n\nOnly these verified file snapshots are committed. Current branch, working files and staging index stay unchanged. No push. Author: CHAI <chai@localhost>.\n\n" +
      patch;
    if (!(await consent!("Create CHAI Git review commit?", detail)))
      throw Error("Git commit declined.");
    signal.throwIfAborted();
    if ((await run(["rev-parse", "--verify", "HEAD^{commit}"])).trim() !== head)
      throw Error("Git HEAD changed during confirmation.");
    for (const file of files) {
      const current = await gateway.file(root, "read", file.path, {}, signal);
      if (current.hash !== file.sha256)
        throw Error("Git input changed during confirmation: " + file.path);
    }
    await stage(true, false);
    const tree = (await run(["write-tree"], undefined, true, false)).trim();
    const commit = (
      await run(
        ["commit-tree", tree, "-p", head],
        action.message + "\n",
        true,
        false,
      )
    ).trim();
    signal.throwIfAborted();
    // Atomic create only: never move an existing branch, the current HEAD or user's index.
    await run(
      ["update-ref", "refs/heads/" + branch, commit, "0".repeat(head.length)],
      undefined,
      true,
      false,
    );
    return {
      ...evidence,
      branch,
      commit,
      tree,
      author: "CHAI <chai@localhost>",
      pushed: false,
    };
  });
}
