# TASKS — Execution Backlog

**Status:** Working local-engine alpha implemented, installed and tested on Kali. The original full-product backlog below remains a future scope contract; completed alpha evidence is recorded in docs/QA_2026-10-19.md. Do not mistake the full backlog for shipped autonomous ChatGPT functionality.

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
- [ ] Implement `ProviderAdapter` interface and fully working `MockProviderAdapter`.
- [ ] Implement supported local-model adapter (Ollama/LM Studio if present or manually configured).
- [ ] Document real ChatGPT web mode capabilities and provider compliance findings; do not claim unsupported browser automation.
- [ ] Optional: implement supported official API adapter with user-supplied key stored via OS keychain; no key required for mock path.
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
- [ ] Git inspection / diff tool; opt-in branch/commit tool; no default push to unknown remotes.
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

## Alpha implementation evidence (2026-10-19)

- [x] Native Electron shell with original dark/coral UI, six working navigation screens, workspace selection and actual task history.
- [x] SQLite WAL, exact-plan approvals, expiration, real file/terminal execution, deterministic three-role verification, logs, pause/stop and recovery.
- [x] 12 core tests, native E2E, installed AppImage extraction-mode E2E, real X11 desktop smoke and controlled host-tool tests passed.
- [x] Real SIGKILL recovery retained completed write and refused ambiguous command replay.
- [x] AppImage and Debian packages built; user-only installer installed CHAI without system changes.
- [x] Zero npm audit vulnerabilities on Kali after dependency fixes.
- [ ] Live local-model inference and autonomous reasoning loop. No local model is installed/detected.
- [ ] User manual ChatGPT login and whole-system reboot acceptance.
- [ ] Final GitHub CI/release outcome: see handoff.md for latest remote evidence.
