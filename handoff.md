# CHAI handoff — 2026-10-19

## Current implementation — 2026-10-19

Normal signed-in ChatGPT with 6 High is the required and tested provider. Local inference and the abandoned model-inference OAuth/Responses adapter are removed.

CHAI sends job IDs/roles through visible ChatGPT input controls. Its installed MCP plugin fetches context and returns schema-validated results. No assistant text, cookies or private model endpoints are scraped. MCP OAuth authorizes CHAI PC tools only.

Two real three-role tasks passed on Kali: a new-file task and an existing-file edit, each using seven actual ChatGPT role calls across two rounds. The installed AppImage retained pairing, conversation links and a pending plan across a normal app restart, then completed the edit after renewed approval.

Version 0.2.0-alpha.1 is built and installed on Kali. Typecheck, lint, 30 tests, native UI, SIGKILL recovery, AppImage extraction-mode E2E and dependency audit (zero vulnerabilities) pass. Both AppImage and amd64 Debian packages are built; AppImage is the launch-tested installed artifact. Whole-PC reboot is still unverified.

## Locations
- Public source: https://github.com/harshitethic/CHAI
- Implementation: /home/kali/Projects/CHAI on Kali.
- Publishing checkout: /Users/harshitethic/Projects/CHAI on the user's Mac; use its existing gh authentication, never copy credentials.
- Private runtime data: /home/kali/.config/chai-desktop. Browser partition persist:chai-chatgpt. Do not inspect cookies or credential stores.
- Installed launcher points to v0.2.0-alpha.1. The previous executable and launcher backups are retained.

## Verified live results
- New file: chai-browser-proof.txt = CHAI runs through normal ChatGPT.
- After installed-app restart and approved existing-file edit: CHAI recovered and verified through normal ChatGPT.
- Both tasks reached DONE after independent review and manager reporting. Actual file hashes and role phases are in docs/qa/browser-live-2026-10-19.json and docs/qa/browser-recovery-2026-10-19.json.
- The same development tunnel was intentionally kept running during app restart; this does not establish whole-PC reboot continuity.
- Private .qa/control-browser-bridge.mjs controls the installed real application. .qa contains private browser screenshots and must never be committed.

## Remaining work
1. Version 0.2 release is published and its downloadable AppImage was verified. Publish the 0.3 release and verify its downloadable asset.
2. Resolve a persistent user-controlled HTTPS origin for reboot-stable pairing, or document reconnecting a newly created temporary URL.
3. Arrange a safe whole-PC reboot after other work is saved; verify task history, login, tools and fresh task execution afterward.
4. Implement the broader original backlog: agent-driven browser/desktop actions, general approved shell workflows and broader file management. Current tools remain bounded and honest.

The core browser-role loop is functional, but the full original project is not complete. Do not equate an alpha release with all acceptance checks. Do not reinstall a local LLM, add model inference OAuth/API, or replace the browser workflow with manual JSON handoff.


## 0.3 autonomous workspace continuation — 2026-10-19
- Source adds a task/root-bound workspace grant, review mode, Revoke, automatic discovery/repair and bounded 12-round execution. Provider stays normal ChatGPT.
- Bubblewrap run tool executes real Python/Node/Bash using selected hash-checked file snapshots; host credentials, host network and writable host mounts are excluded. Missing isolation fails closed.
- Live task b8e71d02-13e2-49dc-9cfe-d86ce9d3c522 completed: read buggy function, create four tests, real exit 1 (three failures), fix function, same tests exit 0. Two rounds, seven role calls, one grant, zero per-round manual approvals. Evidence is in docs/qa/autonomous-live-2026-10-19.json.
- 38 tests, typecheck/lint/build, native UI (including autonomous selector and real sandbox run), SIGKILL recovery, AppImage E2E and npm audit (zero vulnerabilities) pass on Kali. Linux AppImage and Debian builds succeed.
- Installed launcher now points to ~/.local/opt/chai-0.3.0-alpha.1/CHAI.AppImage; old version retained. Installed upgrade reopened with connected tool pairing, completed task and original grant intact. Private controller remains .qa/control-browser-bridge.mjs; never commit .qa or browser credentials.
- Privacy documentation corrected: selected local file contents, goals and evidence are sent to ChatGPT via MCP. No local inference privacy claim applies.
- Remaining: publish/verify 0.3 assets; stable transport/reboot; broader autonomous computer tools and development workflows. Do not claim complete Codex parity.
