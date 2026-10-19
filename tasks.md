# TASKS — Execution Backlog

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
