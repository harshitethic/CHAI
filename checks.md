# CHECKS — Verification Gates

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
