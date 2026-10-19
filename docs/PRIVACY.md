# CHAI privacy

CHAI has no telemetry, analytics service or remote task backend. On Linux it stores task goals, plans, local event output and before-edit snapshots under Electron's user-data directory, normally `~/.config/chai-desktop`. The directory uses private permissions; SQLite is not encrypted. The ChatGPT partition is Chromium-managed browser storage, never exported by application code.

When using browser agents, task goals, role assignments, selected workspace file contents and captured execution evidence are made available to your signed-in ChatGPT conversations through the authenticated CHAI MCP connection. This information leaves your computer and is processed under ChatGPT's policies. Choose a workspace you are comfortable sharing with that service. CHAI does not use a local model or a separate model-inference API.

Role request/result records and checkpoints remain in the private local SQLite database. Common credential patterns are redacted from outbound context, but this is not comprehensive secret detection. Protected credential paths are denied by the file gateway. Interactive ChatGPT and browser content contact their respective websites. The HTTPS tunnel relays authenticated tool traffic to the local CHAI service.

Workspace authorization covers reads, edits and isolated test execution for the selected task and folder, including later repair rounds. It remains recorded across app restarts; unfinished tasks pause until Resume. Revoke access removes that grant and stops the task. Review mode asks for each plan. Sandbox processes receive only explicitly selected file snapshots and a clean environment, with no host network or browser-session access. Their outputs may become evidence sent to ChatGPT.

Browser and selected-window access are separate task permissions. Enabling them authorizes observations and screenshots for that task to be sent to ChatGPT. Browser sessions are isolated from the ChatGPT login and restricted to explicitly allowed HTTPS origins or local workspace previews. Desktop control requires a user-selected X11 window and validates its process and geometry before input. Use disposable test windows; visible private information in an authorized window may be included in screenshots. The last 12 compressed images per task are retained locally; up to the last two matching evidence images are attached to an active role job. Deleting task history also removes its images.

Manual screenshot export remains separate and saves to a user-selected path. Credential input and sensitive website actions retain local checks and confirmations; these checks are bounded safeguards, not comprehensive semantic detection.

Export is opt-in and redacts common credential patterns, not every possible secret. Inspect exports before sharing. Delete selected task history in Settings to remove task records and snapshots; this is logical deletion, not forensic secure erasure of SQLite pages or backups. Clear CHAI ChatGPT session affects only CHAI's partition, not other browsers.

Git inspection sends selected-file patches and repository/commit identifiers as task evidence. Git commits require a separate local confirmation and create only a new local review branch with author CHAI <chai@localhost>. The current branch, working files and staging index are preserved by the Git operation. No push or network access occurs. Git sees the selected repository inside Bubblewrap; hooks, external diffs, text conversion and signing are disabled. Selected files are read through the same protected file gateway.


## 0.7 project and connection additions

With **project execution** enabled, CHAI copies up to 250 MB of source into a private task directory under its user-data folder. Dependency/build caches, common credential paths, symlinks and hardlinks are excluded from the copy. An existing Git repository's history is fetched locally into the independent checkout; do not assume historical secrets have been removed from Git history. Project commands cannot access that Git metadata mount, the host home, or ChatGPT browser storage. The original checkout is not the command working directory.

Project network access is a separate grant. When enabled, dependency tools and scripts can contact internet hosts and local services. The public runtime and selected certificate/resolver files are mounted read-only. Project-generated files and captured output can be supplied to ChatGPT. File attachments and confirmed browser downloads become project files. Registered outputs include path, title, size and SHA256.

HTTPS MCP app connections use their own configured credentials, not ChatGPT's plugin credentials. Bearer tokens are encrypted with Electron safeStorage and require a real OS keyring; plaintext fallback is rejected. Task history and terminal logs remain unencrypted private SQLite data. Connections are authorized per task, and each remote tool call receives native confirmation. Tools may send their arguments to the configured service. GitHub publishing uses the local GitHub CLI's existing account after destination/branch confirmation; CHAI does not copy its token into the project.

Tray continuation and login startup are opt-in. Restart recovery resumes only checkpoints without uncertain started effects, with the existing workspace grant and a connected provider. Interrupted processes are not replayed. Deleting task history removes terminal/artifact records but does not delete the working-copy files; inspect and manage retained project folders separately.

The earlier offline-sandbox and selected-file Git sections describe the legacy tools, which remain available. Their no-network/no-push statements do not describe the separately authorized 0.7 project tools.
