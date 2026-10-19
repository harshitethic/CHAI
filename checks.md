# CHECKS — Verification Gates

## Current implementation — 2026-10-19

The required provider is the normal signed-in ChatGPT website with 6 High selected in each role conversation. Local inference and the abandoned OAuth/Responses inference adapter have been removed. Never substitute either for this requirement.

CHAI now supplies an authenticated MCP tool server. ChatGPT receives a persistent role job through its visible composer, fetches the job with chai_get_job, and returns schema-validated JSON with chai_submit_result. Outputs are not scraped from the page. The MCP OAuth pairing grants access to CHAI's PC tools only; it does not authorize model inference or extract ChatGPT credentials.

Kali validation: typecheck, lint, build, 26 tests, native Electron E2E and SIGKILL recovery passed. Four new tests exercise real HTTP MCP, PKCE/consent/token controls, rejected/canceled jobs, and an approval-gated real file cycle. Scripted test answers are fixtures, not live-model evidence.

Live evidence: the CHAI plugin was created in the user's normal ChatGPT account; its actual tool pairing and authenticated MCP discovery succeeded. 6 High was observed in the browser. A live three-role file task is now under test; completion is not yet established. The public installer is still the older v0.1.0-alpha.1.

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
- [x] 26 tests pass, including real HTTP MCP with authorization and actual filesystem effects.
- [x] Native Electron UI approval/file/task cycle, renderer reload and application restart pass.
- [x] Hard-kill recovery retains completed writes and refuses ambiguous command replay.
- [x] ChatGPT session retained, 6 High visibly selected, CHAI plugin paired.
- [x] Public HTTPS discovery and authenticated MCP requests observed.
- [ ] Live browser-based three-role acceptance task complete.
- [ ] Updated packaged application and installer verified.
- [ ] Full-system reboot verified.

Automated model fixtures do not count as live ChatGPT acceptance. Prior v0.1.0-alpha.1 release verification remains in docs/QA_2026-10-19.md.
