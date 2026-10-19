# CHECKS — Verification Gates

## Latest status — 0.4.0-alpha.1, 2026-10-19

The current implementation extends the verified normal-ChatGPT workflow with scoped agent-driven browser and selected-window X11 tools, screenshot evidence, mkdir and bounded search. Browser/window permissions are explicit task capabilities; workspace grants do not activate them. No inference API or local model was added.

Verification: 41 tests, typecheck/lint/build, browser interaction guards, real X11 capture/input, native UI with local preview, AppImage execution, SIGKILL recovery and zero-vulnerability dependency audit. The dedicated Kali HTTPS endpoint uses a persistent named tunnel with an enabled user service. Whole-PC reboot remains unverified and requires saving other work first.

Current evidence and boundaries are in README.md, docs/RELEASE_BROWSER_ALPHA.md and docs/PRIVACY.md. Older entries below preserve the original backlog and historical milestones; unchecked historical items are not a current test report. General host shell/network/package installation, unrestricted file management and arbitrary desktop automation are not implemented.


## Current implementation — 2026-10-19

Normal signed-in ChatGPT with 6 High is the required and tested provider. Local inference and the abandoned model-inference OAuth/Responses adapter are removed.

CHAI sends job IDs/roles through visible ChatGPT input controls. Its installed MCP plugin fetches context and returns schema-validated results. No assistant text, cookies or private model endpoints are scraped. MCP OAuth authorizes CHAI PC tools only.

Two real three-role tasks passed on Kali: a new-file task and an existing-file edit, each using seven actual ChatGPT role calls across two rounds. The installed AppImage retained pairing, conversation links and a pending plan across a normal app restart, then completed the edit after renewed approval.

Version 0.2.0-alpha.1 is built and installed on Kali. Typecheck, lint, 30 tests, native UI, SIGKILL recovery, AppImage extraction-mode E2E and dependency audit (zero vulnerabilities) pass. Both AppImage and amd64 Debian packages are built; AppImage is the launch-tested installed artifact. Whole-PC reboot is still unverified.

## A. Product truthfulness
- [ ] CHAI launches as a native Chromium/Electron **Linux app** (not only `npm run dev` in a browser).
- [ ] Real user prompt produces a durable local task ID and state transitions.
- [ ] Manager + two workers are separate observable roles with meaningful routing.
- [ ] Tasks stop, wait, recover and complete based on actual execution.
- [ ] User knows whether an action was mock, local-model, official API, manual browser or verified compliant web automation.
- [ ] The app never claims three ChatGPT tabs bypass a provider limit or extend its subscription.
- [ ] ChatGPT login stays on the official provider origin without proxy/password capture.

## B. Visual quality
- [ ] All six reference images reviewed and mapped to intentional, original CHAI components.
- [ ] Unique brand; no Claude logo, protected illustration, or pixel-for-pixel copy.
- [ ] High legibility, no clipped controls at 100–200% scale, dark theme cohesive across every page.
- [ ] Manager/Builder/Reviewer panels resize and collapse correctly at desktop widths.
- [ ] Empty, loading, error, unavailable-provider, approval and paused states all designed.
- [ ] Keyboard-only navigation, visible focus, high-enough contrast, reduced-motion option.
- [ ] No fake buttons, dead panels, meaningless hardcoded statistics, or misleading demo results.

## C. Tool isolation and safety
- [ ] Webview has no Node integration or unrestricted OS access.
- [ ] Context isolation and sandbox enabled; narrow validated IPC bridge; navigation and downloads restricted.
- [ ] Tool paths reject `../`, symlink escapes and out-of-root writes.
- [ ] Shell/pty commands require appropriate scope and approval; no unrestricted arbitrary privileged exec via chat output.
- [ ] Secret reads blocked by default; no cookie/token extraction; logs redact secret values.
- [ ] Stop-all terminates child processes and prevents new task dispatch; cancellation visible.
- [ ] Irreversible writes never silently auto-approve.
- [ ] Hostile README/web prompts cannot alter tool permissions or system instructions.

## D. Runtime durability
- [ ] Schema migration up/down or documented forward-only backups tested on a blank DB.
- [ ] DB WAL and transactional writes tested; duplicate event IDs deduplicated.
- [ ] Crash during non-destructive step recovers without lost messages.
- [ ] Crash during mutating step reconciles before retry to avoid double edits.
- [ ] Provider unavailable → task pauses with accurate reason, no unlimited retry spin.
- [ ] Concurrent worker results cannot corrupt a plan/version; optimistic version checks or task locks.
- [ ] Timeout, retry budget and safe shutdown behavior verified.

## E. Automated testing
- [ ] `npm ci` installs reproducibly from lockfile.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes with recorded count.
- [ ] `npm run test:e2e` passes on Linux (mock/no paid service required).
- [ ] Tool permissions, cancellation, IPC validation, provider errors, crash recovery unit/integration coverage.
- [ ] CI runs actual suites on GitHub Actions.
- [ ] At least one packaged build installs and launches on target Kali desktop.

## F. GitHub and release
- [ ] Repo URL and current branch independently verified.
- [ ] No unrelated repositories modified, including ClonePeek or KyaLoge.
- [ ] No tokens, cookies, passwords, private key material, or user-private files committed.
- [ ] README contains verified install, first-run, limitations and troubleshooting.
- [ ] LICENSE, SECURITY.md, CONTRIBUTING.md, .gitignore and CI present.
- [ ] Third-party inspiration screenshots excluded from public repo absent redistribution rights.
- [ ] Published release assets were actually built and smoke-tested; SHA256 recorded.
- [ ] Real screenshot/demo from running CHAI (not third-party mockups) published.

## G. Acceptance scenario

1. Open CHAI on Kali with selected empty disposable workspace.
2. Select **ChatGPT browser · 3 roles** with 6 High in each role window and start: `Create notes.txt with three lines, check content, summarize the changes.`
3. See Manager plan, Builder tool action, Reviewer verification, Manager evidence-backed completion.
4. Open Work timeline, inspect actual file diff, tool output and event sequence.
5. Start a second longer test and quit/restart renderer mid-flight; state persists.
6. Attempt writing outside workspace and reject with a visible error.
7. Start an executing cancellable command and press **Stop all**; verify stopped state.
8. If provider-login check is possible, open official ChatGPT site; manually sign in and verify session remains in restricted pane without secrets being exported.

**Pass condition:** Every step backed by observed result and recorded in HANDOFF. A broken, simulated or omitted step fails the gate.

## Executed current gates
- [x] TypeScript, ESLint and production bundle pass on Kali.
- [x] 30 tests pass, including real HTTP MCP with authorization and actual filesystem effects.
- [x] Native Electron UI approval/file/task cycle, renderer reload and application restart pass.
- [x] Hard-kill recovery retains completed writes and refuses ambiguous command replay.
- [x] ChatGPT session retained, 6 High visibly selected, CHAI plugin paired.
- [x] Public HTTPS discovery and authenticated MCP requests observed.
- [x] Live browser-based three-role new-file and existing-file tasks complete.
- [x] Updated packaged application, safe installer upgrade and real profile restart verified.
- [ ] Full-system reboot verified.

Automated model fixtures do not count as live ChatGPT acceptance. Prior v0.1.0-alpha.1 release verification remains in docs/QA_2026-10-19.md.


## 0.3 update — 2026-10-19
Autonomous task-scoped workspace authorization now covers discovery, writes, isolated execution and repair without repeated approvals. Revoke removes the grant and pauses tools. Review-each-plan remains available. Bubblewrap Python/Node/Bash has explicit input hashes, no host network/credentials, read-only staged workspace and bounded runtime/output. Normal signed-in ChatGPT is the only live reasoning provider.

Verified live: four Python tests, three original failures, repair, unchanged tests passing; seven role calls, one workspace grant, zero manual plan approvals. See docs/qa/autonomous-live-2026-10-19.json. All 38 automated tests, typecheck/lint/build, native UI, crash recovery, AppImage execution and dependency audit pass. No full-machine reboot or general autonomous browser/desktop workflow is claimed.


## Published 0.3 verification — 2026-10-19
Release source: 7af878b. CI passed: https://github.com/harshitethic/CHAI/actions/runs/39230787066 . Release passed (including packaged sandbox execution): https://github.com/harshitethic/CHAI/actions/runs/39230789300 . Published AppImage, Debian package and SHA256SUMS: https://github.com/harshitethic/CHAI/releases/tag/v0.3.0-alpha.1 .

Downloaded the published AppImage to Kali, verified SHA256 `06decc28cba27dd8d1ad08b4a82ad1d5fe6724b4b849d36c88389d43eaf4ca0c` and passed native UI/restart/autonomous-permission/real-sandbox E2E against that exact download. Installed published binary under ~/.local/opt/chai-0.3.0-alpha.1/CHAI.AppImage; local build and 0.2 retained. No credentials moved. Both source checkouts are synchronized.

Next work: broader file management and autonomous browser/desktop capabilities; better project development workflows; stable tool endpoint and a user-arranged whole-PC reboot. Do not reintroduce local inference or model API substitution. CHAI and ChatGPT have independent permission boundaries: workspace grants remove CHAI round prompts but cannot suppress ChatGPT's own prompts or service limits.
