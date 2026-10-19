# CHAI handoff — 2026-10-19

## Latest status — 0.4.0-alpha.1, 2026-10-19

The current implementation extends the verified normal-ChatGPT workflow with scoped agent-driven browser and selected-window X11 tools, screenshot evidence, mkdir and bounded search. Browser/window permissions are explicit task capabilities; workspace grants do not activate them. No inference API or local model was added.

Verification: 42 tests, typecheck/lint/build, browser interaction guards, real X11 capture/input, native UI with local preview, AppImage execution, SIGKILL recovery and zero-vulnerability dependency audit. The dedicated Kali HTTPS endpoint uses a persistent named tunnel with an enabled user service. Whole-PC reboot remains unverified and requires saving other work first.

Current evidence and boundaries are in README.md, docs/RELEASE_BROWSER_ALPHA.md and docs/PRIVACY.md. Older entries below preserve the original backlog and historical milestones; unchecked historical items are not a current test report. General host shell/network/package installation, unrestricted file management and arbitrary desktop automation are not implemented.


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
1. Versions 0.2 and 0.3 are published; their downloadable AppImages were independently verified on Kali.
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


Release gate update: initial 0.3 CI failed before sandbox execution with Ubuntu AppArmor RTM_NEWADDR denial. A bwrap-specific namespace profile is now loaded only on the disposable CI runner. No global AppArmor/sysctl changes and no reduced application isolation. Re-run the full suite before publishing.


## Published 0.3 verification — 2026-10-19
Release source: 7af878b. CI passed: https://github.com/harshitethic/CHAI/actions/runs/39230787066 . Release passed (including packaged sandbox execution): https://github.com/harshitethic/CHAI/actions/runs/39230789300 . Published AppImage, Debian package and SHA256SUMS: https://github.com/harshitethic/CHAI/releases/tag/v0.3.0-alpha.1 .

Downloaded the published AppImage to Kali, verified SHA256 `06decc28cba27dd8d1ad08b4a82ad1d5fe6724b4b849d36c88389d43eaf4ca0c` and passed native UI/restart/autonomous-permission/real-sandbox E2E against that exact download. Installed published binary under ~/.local/opt/chai-0.3.0-alpha.1/CHAI.AppImage; local build and 0.2 retained. No credentials moved. Both source checkouts are synchronized.

Next work: broader file management and autonomous browser/desktop capabilities; better project development workflows; stable tool endpoint and a user-arranged whole-PC reboot. Do not reintroduce local inference or model API substitution. CHAI and ChatGPT have independent permission boundaries: workspace grants remove CHAI round prompts but cannot suppress ChatGPT's own prompts or service limits.


## 0.4 live computer verification
Source implementation 0921d59 includes scoped browser/X11 tools, target validation and multi-round evidence compaction. The initial creation task 51c2b96c-e656-4e5e-ab35-d16eaf66383f created the demo, passed Node execution and clicked once, then exposed duplicate-context growth. It remains FAILED honestly. The fresh verification task 2b8a1b5e-1eae-43e9-a70b-92825ad74c78 completed after the fix: three rounds, ten role calls, seven actions, Node exit 0, preview count 0 and real click results 1/2/0. One workspace grant, zero CHAI manual plan approvals; two ChatGPT tool prompts were reviewed and allowed. Evidence and the actual final screenshot are under docs/qa.

The stable CHAI Desktop MCP plugin uses https://chai-tools.harshitethic.com/mcp. Its dedicated named tunnel is enabled as the user service chai-tools-tunnel.service; the obsolete temporary CHAI tunnel was stopped. Config and credentials remain on Kali, never in git. App and transport restart verification follows installation of the published release. Whole-PC reboot remains unverified; do not reboot while other unsaved work is active.
