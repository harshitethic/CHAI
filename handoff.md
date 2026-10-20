## Workflow update — 2026-10-20, 0.10.0-alpha.1

Implemented authenticated live progress and revision-scoped milestone plans, durable queued follow-ups at action/planning/review boundaries, explicit interrupt, original-goal continuity, and less repeated review chatter. Progress never grants permissions or marks execution complete. Native follow-up queue survives restart and waits for resume.

Verified locally on Kali: 77 tests, typecheck/lint/build and native workbench including new milestone/progress rendering. Actual HTTP MCP integration covers progress while executing real files. Release/public-binary and live-provider results are recorded separately after they finish. See `docs/WORKFLOW.md` for the nine-area acceptance contract and remaining gaps. Do not claim proprietary parity or equate the original game prototype with its requested graphics/crypto outcome.

# Current work — 0.9.0-alpha.1, 2026-10-20

Conversation UI, informational answers without tools, explicit fresh projects, provider waiting/recovery controls, and more natural agent summaries are implemented. User-facing defaults enable isolated project commands, network and browser previews, with visible controls before submission; existing permissions are not migrated. Published and installed on Kali. CI/release and public-binary native checks passed; 72 automated checks pass. A live ChatGPT informational reply and explicit retry passed with zero tool actions; all previous tasks, outputs and pairing were retained. See docs/QA_CONVERSATION_2026-10-20.md. See docs/RELEASE_BROWSER_ALPHA.md and the current git history. Older entries below are historical and may describe superseded limits.

# CHAI handoff — 2026-10-19

## 0.7.1 boundary update — 2026-10-19

The four stated boundaries remain in place: isolated execution, HTTPS/bearer external MCP connections, X11 desktop input and bounded background continuation. Settings and README now describe them explicitly. This update does not add unrestricted host execution, an OAuth app client, Wayland input or unlimited unattended operation.

Desktop support detection now covers Wayland/XWayland and missing displays at both task and manual-click entry points; unsupported UI controls are disabled. HTTP 401 responses from app connectors explain supported authentication. Settings no longer incorrectly claim all commands are offline/read-only or that confirmed project PR publication is unavailable.

Verified on Kali: typecheck, lint, build, 63 unit/integration tests, HTTPS bearer authentication/declined action/401 guidance, and native workbench E2E including simulated Wayland IPC rejection, disabled control, real isolated fail/fix/pass, preview, tray continuation and saved-session recovery. Wayland rejection is tested by environment simulation under X11; no Wayland automation support is claimed. No new live ChatGPT task was necessary for this boundary/UI patch. Published and installed [0.7.1-alpha.1](https://github.com/harshitethic/CHAI/releases/tag/v0.7.1-alpha.1), source `9d5217b`. CI and release checks passed. The public AppImage passed checksum and native workbench checks; installation retained seven tasks, two prior outputs and authenticated tool pairing. Normal CHAI is running on the new version. See [publication verification](docs/qa/published-0.7.1-verification.json).


## Current status — 0.7.0-alpha.1, 2026-10-19

Published and installed: [CHAI 0.7.0-alpha.1](https://github.com/harshitethic/CHAI/releases/tag/v0.7.0-alpha.1), source `a72aec0`. CI and release workflow passed. The exact downloaded AppImage passed SHA256 verification and both native suites on Kali, including the packaged startup entry. The installed profile retained the completed live task, two outputs and saved authenticated tool pairing. See [publication verification](docs/qa/published-0.7-verification.json). Live project repair/browser verification and the same-task PDF follow-up both reached DONE. One-time Kali GitHub CLI login and a safe whole-PC reboot window remain environmental gates.

All nine requested feature areas are implemented: isolated writable projects and dependency installs; persistent process sessions; real local-server browser verification and embedded preview; same-task follow-ups and attachments; paginated repository context and exact patches; independent Git checkout/commit/PR/CI tools; opt-in tray/startup/notifications and safe recovery; document outputs and authenticated MCP connections; browser transfers and selected X11 accessibility/scrolling.

The Work UI includes Terminal, Files, Changes, Preview and Outputs, with current/next actions, durable checklists, actual failed/passing checks, provider waiting/retry and role activity. The original source tree and staging index remain separate from the task working copy.

62 automated checks pass. Native Electron, embedded input, tray continuation, persisted sessions, real npm install/fail/fix/pass/server, HTTPS bearer MCP consent, four document formats, X11 controls and crash recovery were exercised. A live run caught an app-settings path integration issue; only exact recorded task project roots now pass the legacy file gateway, and regression coverage uses the real `.config/chai-desktop/projects` layout. See [0.7 verification](docs/QA_WORKSPACE_2026-10-19.md) for release and live-run evidence.

Provider remains normal signed-in ChatGPT with three persistent roles. No model API, local inference, credential scraping or bypass of provider approvals/limits. Kali GitHub CLI requires its own login before in-app remote PR/CI work; never migrate Mac credentials. External MCP supports HTTPS/bearer, not OAuth-only clients. Selected desktop control is X11. Full-machine reboot remains a separate safe-window acceptance gate. Do not claim complete first-party Codex/Work parity.

Everything below is historical context; older capability exclusions and test counts describe earlier releases.


## Latest status — 0.6.0-alpha.1, 2026-10-19

The Work screen now presents current action, next step, a durable action checklist, real failed/passing check results and readable role activity with expandable evidence. Full requests, reports and raw logs are expandable. Selected-task event queries prevent unrelated activity from hiding its history. Round/call budgets reflect the active permission mode.

Verified: 54 tests, typecheck/lint/build, native task switching, one active checklist row, real interrupted Python check, Pause, reload, saved progress and honest ambiguous-resume failure. Existing native sandbox/browser/Git coverage and four widths pass. Crash recovery and zero-vulnerability audit pass. A native screenshot shows the saved live ChatGPT Git task in the new UI; no new model-run claim is made for a presentation change.

README is rewritten around capabilities, setup, real evidence and current limits. Release CI passed. The exact published AppImage passed checksum/native E2E on Kali, was installed, and retained completed history and the authenticated ChatGPT connection. Record: docs/qa/published-0.6-verification.json. Whole-PC reboot still needs a safe user-arranged window. Host shell/network/package installation, unrestricted file management and unattended startup remain outside this alpha.

Older sections below are historical records, not the current test report.

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

The stable CHAI Desktop MCP plugin uses https://chai-tools.harshitethic.com/mcp. Its dedicated named tunnel is enabled as the user service chai-tools-tunnel.service; the obsolete temporary CHAI tunnel was stopped. Config and credentials remain on Kali, never in git. Published 0.4 AppImage installed and verified; app and tunnel-service restart checks pass. Whole-PC reboot remains unverified; do not reboot while other unsaved work is active.


## Published 0.4 installation verification
Release: https://github.com/harshitethic/CHAI/releases/tag/v0.4.0-alpha.1
Release workflow passed: https://github.com/harshitethic/CHAI/actions/runs/39238073955
Release source: 1c768d4. Independently downloaded AppImage SHA256: 8d8d2eee7bc0894f8176442ffc2f47214b409d3f9e17b4d03ed4ddfea4033c76.

The exact published download passed native UI/restart/workspace-grant/sandbox/local-preview/Stop checks on Kali. Installed under ~/.local/opt/chai-0.4.0-alpha.1/CHAI.AppImage; ~/.local/bin/chai and desktop shortcut point there. Older versions and launcher backups remain. The installed app reopened with the completed live task, original permissions, ChatGPT login and 6 High intact. A fresh authenticated chai_connection_status request from normal ChatGPT succeeded after both the app upgrade and named-tunnel service restart (lastSeen 2026-10-19T10:37:07.196Z). Structured record: docs/qa/published-0.4-verification.json.

Remaining acceptance gate: arrange a whole-PC reboot after other work is saved. Broader original features remain explicitly outside this alpha; do not claim unrestricted Codex parity or bypass ChatGPT approval controls.

## Published 0.5 installation verification — 2026-10-19

Release: https://github.com/harshitethic/CHAI/releases/tag/v0.5.0-alpha.1
Release workflow: https://github.com/harshitethic/CHAI/actions/runs/39244935372 (passed, including packaged executable tests).
CI: https://github.com/harshitethic/CHAI/actions/runs/39244934193 (passed).
Source: e8a07adb4a3b0fbfd3ac5231d237246d6071a6aa.
Published AppImage SHA256: 1c8883d382a6c92b49e3927297532e1a9d630c94e07457583d31b849ea7b8ceb.

The exact downloaded AppImage passed native UI, sandbox execution, browser preview, declined and approved Git confirmation, real review-branch commit, unchanged HEAD/index and restart checks. Installed under ~/.local/opt/chai-0.5.0-alpha.1/CHAI.AppImage; launcher and desktop entry upgraded with prior versions/backups retained.

The installed app retained the live DONE task, ChatGPT login and 6 High. A fresh normal-ChatGPT chai_connection_status call succeeded at 2026-10-19T11:34:11.337Z. The dedicated tunnel service remained active. No credentials were moved. See docs/qa/published-0.5-verification.json.

Whole-PC reboot still needs a safe user-arranged window. Broader host shell/network/package installation, unrestricted file management and unattended startup are unfinished; do not describe the full original backlog as complete.

## Published 0.6 progress UI — 2026-10-19

Release: https://github.com/harshitethic/CHAI/releases/tag/v0.6.0-alpha.1
Release workflow: https://github.com/harshitethic/CHAI/actions/runs/39250146620 (passed).
CI: https://github.com/harshitethic/CHAI/actions/runs/39250145573 (passed).
Source: 5ad5bc0a8af1676c76f54828b59527872b0e9090.
AppImage SHA256: 73aaa97e20ebf72213afbc8f90f7c2399bbe41a30fe63169bc695eef306774ac.

The exact downloaded AppImage passed native UI, task switching, one active checklist row, real Python interruption, pause/reload/saved progress, ambiguous-resume failure, sandbox/browser/Git confirmation and restart checks. Installed under ~/.local/opt/chai-0.6.0-alpha.1/CHAI.AppImage with prior versions retained.

The installed app retained the live DONE task, login and 6 High. Fresh normal-ChatGPT connection status succeeded at 2026-10-19T12:17:14.383Z. Source and installed app expose current/next action, finished/pending/error steps, actual test exits and expandable activity evidence. README uses an actual native screenshot and documents the tool boundaries.

Whole-PC reboot, unrestricted host shell/network/package workflows and unattended startup remain unfinished. The new UI is progress visibility, not full ChatGPT Work/Codex feature parity.
