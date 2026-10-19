# Implemented architecture — 0.5.0-alpha.1

Normal signed-in ChatGPT with 6 High is the reasoning provider. Manager, Builder and Reviewer each have a restricted Chromium view and a saved conversation URL. CHAI checks visible model/composer/send controls and delivers a job ID and role through the ordinary input UI. Login remains in Chromium-managed storage; application code never extracts session credentials or assistant text.

The Broker persists jobs in SQLite. The installed CHAI Desktop MCP plugin fetches scoped instructions, evidence and output schemas with chai_get_job, then returns schema-validated role results with chai_submit_result. Duplicate accepted results are idempotent; conflicting answers and canceled jobs are rejected. Sent-job receipts prevent automatic delivery replay.

The Coordinator runs Manager assignment → Builder proposal → execution → independent Reviewer → Manager report. Failed tests or missing evidence trigger another bounded round. Workspace mode allows up to 12 rounds, 60 role attempts and 144 actions. Evidence compaction preserves current files, execution results and recent observations without repeatedly duplicating file contents.

The Engine owns permissions and durable effects. A local task/workspace grant authorizes routine file actions and isolated execution across repair rounds; review mode approves each exact plan. Browser and selected-window capabilities are separate grants. Git commit and sensitive computer actions retain native confirmation. Interrupted uncertain commands, Git actions and computer input are never automatically replayed.

The file gateway uses descriptor-relative Python operations, protected-path checks, no-follow/regular-file checks, expected hashes and before-edit snapshots. The run tool stages explicit text-file inputs into a Bubblewrap sandbox with no host home/network, a read-only workspace, temporary outputs and bounded execution. Browser previews and exact HTTPS origins use an isolated Electron session; control references and screenshot IDs are tied to task observations. X11 input validates the selected window's process, geometry, focus and observation age.

Git inspection uses offline Bubblewrap, a temporary index and raw selected-file snapshots. Confirmed commits build a tree from the original HEAD and selected files, create a CHAI-authored commit, then atomically create a new task-specific review branch. Current HEAD, working files and staging index are preserved. No checkout or push exists. See SECURITY.md for supported repository/file limits.

The authenticated MCP service listens on loopback port 40671. CHAI supports a temporary tunnel or a persistent HTTPS origin. Kali uses a dedicated named tunnel/user service. CHAI OAuth protects PC tools only: local pairing consent, PKCE and hashed tool tokens; it does not provide model inference access. Shutdown preserves pairing for the same origin; disconnect revokes it.

The renderer has no Node access. Remote content has no privileged preload or CHAI IPC. Narrow IPC validates the packaged renderer origin; navigation, downloads and device permissions are restricted. Task data is private on disk but SQLite is not encrypted.

Whole-PC reboot, unattended app startup, network/package installation, unrestricted host shell and general file management remain outside verified scope. Browser observations are ephemeral; unfinished tasks pause on app restart and need Resume. App restart and SIGKILL recovery are tested separately from full-machine reboot.
