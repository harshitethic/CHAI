# Current work — 0.9.0-alpha.1, 2026-10-20

Conversation UI, informational answers without tools, explicit fresh projects, provider waiting/recovery controls, and more natural agent summaries are implemented. User-facing defaults enable isolated project commands, network and browser previews, with visible controls before submission; existing permissions are not migrated. Published and installed on Kali. CI/release and public-binary native checks passed; 72 automated checks pass. A live ChatGPT informational reply and explicit retry passed with zero tool actions; all previous tasks, outputs and pairing were retained. See docs/QA_CONVERSATION_2026-10-20.md. See docs/RELEASE_BROWSER_ALPHA.md and the current git history. Older entries below are historical and may describe superseded limits.

# TASKS — Execution Backlog

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

Priority: P0 must be addressed for a responsible prototype; P1 before stable public release; P2 afterwards.

## P0 · Recon & repo bootstrap

- [ ] Verify connected Kali tool capability, current OS/desktop, Node, Chromium, Git, GitHub authentication.
- [ ] Inspect `harshitethic/CHAI` and local paths for a pre-existing repo; reuse it if it belongs to this project.
- [ ] Create repository `CHAI` if missing, with README, license, `.gitignore`, `SECURITY.md`, issue/PR templates, branch protection if supported.
- [ ] Create Electron + React + TypeScript strict project with lockfile, lint/typecheck/unit/test scripts.
- [ ] Add GitHub Actions CI and dependency review/secret scanning where accessible.

## P0 · Original premium product shell

- [ ] Build responsive three-column shell: navigation rail, project/sidebar, central workspace.
- [ ] Build real Home / Chat / Work / Projects / Activity / Connections / Settings screens.
- [ ] Add original CHAI logo and icons; charcoal/coral tokenized theme + well-designed empty/error/loading states.
- [ ] Build resizable Manager / Builder / Reviewer command center (wide, standard, compact breakpoint modes).
- [ ] Add keyboard shortcuts, command palette, focus states, reduced-motion support, notification state.
- [ ] Take and review Kali screenshots at 1920x1080, 3440x1440, 4K/fractional scale if feasible.

## P0 · Authentication / provider adapters

- [ ] Embed restricted Chromium view for direct login at `https://chatgpt.com/`.
- [ ] Show official origin, logout/clear session controls, loading/error/disconnected status; never extract cookies.
- [x] Provider interface implemented; scripted adapters exist only in tests.
- Superseded by user: local-model inference is excluded.
- [ ] Document real ChatGPT web mode capabilities and provider compliance findings; do not claim unsupported browser automation.
- Superseded by user: model API adapters are excluded.
- [ ] If lawful and reliable, add capability-gated browser orchestration with end-to-end tests and explicit user consent.

## P0 · Durable task core

- [ ] SQLite migration system and WAL-backed task/step/message/event/checkpoint tables.
- [ ] Explicit task state machine and unique IDs/idempotency key per mutating tool call.
- [ ] Persistent manager state, queue, worker leases, timeouts and bounded retries.
- [ ] Log proposed vs approved vs executed actions with stdout/stderr/error and timestamps.
- [ ] Implement resumption reconciliation after crash, app quit, provider pause and reboot.
- [ ] Support stop/pause/retry/cancel with real cleanup of running subprocess groups.

## P0 · Real tools and safety

- [ ] Workspace picker and canonical-path enforcement (symlink and traversal defenses).
- [ ] Read-only file browse / search tool restricted to chosen root.
- [ ] Safe patch edit tool (snapshot before, diff after, undo supported), concurrency lock.
- [x] Scoped Git inspection/diff and opt-in local review-branch commit; no push. Evidence: tests/git.test.ts and docs/qa/git-live-2026-10-19.json.
- [ ] Terminal tool with command preview, allowlist tiers, timeout, exit code and cancellation.
- [ ] Browser/screenshot tool with visible target and approval for sensitive pages/data.
- [ ] Approval drawer and permission policy persistence (explicit scope, expiration).
- [ ] Unmissable stop-all control; defaults disallow destructive, secret, privilege and out-of-scope ops.
- [ ] Audit events and export/redact/delete history.
- [ ] Tested rejection of malicious instructions from untrusted web/file/worker content.

## P0 · True manager + two workers vertical slice

- [ ] User submits a task → manager creates plan with acceptance criteria.
- [ ] Worker A completes one bounded, real local file/test task; result includes proof.
- [ ] Worker B reviews the diff/test output independently and can reject or ask for fix.
- [ ] Manager compiles verified final report, not narrative-only success.
- [ ] Three panes show actual messages, agent availability, queue and progress (not fake role labels).
- [ ] Terminate renderer mid-task and verify durable resume without duplicate mutation.

## P1 · Linux packaging and QA

- [ ] Build AppImage and `.deb` for correct architecture; verify both build and at least one installs/launches on Kali.
- [ ] Ensure no insecure Electron flags in production, CSP/IPC checks, no remote content in privileged renderer.
- [ ] Run unit, integration, E2E, crash, permission, invalid IPC, and packaged-app smoke tests.
- [ ] Add first-run guide, troubleshooting, verified screenshots from CHAI and developer architecture docs.
- [ ] Run dependency audit, secret scan, license review, privacy/security policy.
- [ ] Release tag `v0.1.0` only after the packaged artifact meets stated acceptance checks; publish SHA256.

## P2 · Enhancements (never fake core completion)

- [ ] Optional tray daemon / autostart opt-in with startup health and safe resume.
- [ ] Workspaces and task templates, notifications, Markdown report export.
- [ ] Optional desktop control adapter (X11/Wayland constraints handled separately).
- [ ] Multiple model providers via capability contracts without hidden subscription bypass.
- [ ] Optional self-update, signed binaries, advanced audit/reporting.

## Maintenance protocol

For a checked item add proof in `handoff.md` or the appropriate test report: commit + command/test result + screenshot when UI-related. Do not bulk-check tasks based on a generated scaffold.

## Current verified milestones
- [x] Native six-screen Electron shell, real scoped file/command execution, approvals, logs and checkpoints.
- [x] Three-role coordinator with independent result schemas and bounded repairs.
- [x] Normal ChatGPT browser input delivery and persistent role conversation URLs.
- [x] Authenticated MCP job/result tools, local pairing consent, exact role/output validation.
- [x] Kali tests: 30 unit/integration cases, native UI, file execution, application restart and SIGKILL recovery.
- [x] Actual ChatGPT plugin creation, pairing and authenticated MCP discovery.
- [x] Complete live 6 High manager → builder → reviewer → manager file task.
- [ ] Stable HTTPS connection across whole-machine reboot.
- [x] Package, install and validate the 0.2.0-alpha.1 AppImage; build amd64 Debian package.
- [ ] General approved shell execution and agent-driven desktop/browser tools.
- [ ] Whole-system reboot acceptance.

The original backlog above remains as the source brief; check items only against matching evidence. The user explicitly superseded its local/mock/API-provider options.


## 0.3 update — 2026-10-19
Autonomous task-scoped workspace authorization now covers discovery, writes, isolated execution and repair without repeated approvals. Revoke removes the grant and pauses tools. Review-each-plan remains available. Bubblewrap Python/Node/Bash has explicit input hashes, no host network/credentials, read-only staged workspace and bounded runtime/output. Normal signed-in ChatGPT is the only live reasoning provider.

Verified live: four Python tests, three original failures, repair, unchanged tests passing; seven role calls, one workspace grant, zero manual plan approvals. See docs/qa/autonomous-live-2026-10-19.json. All 38 automated tests, typecheck/lint/build, native UI, crash recovery, AppImage execution and dependency audit pass. No full-machine reboot or general autonomous browser/desktop workflow is claimed.
