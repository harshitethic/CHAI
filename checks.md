# CHECKS — Verification Gates

## Current direction — 2026-10-19: ChatGPT only

The user explicitly rejected local-model substitution. The required provider is their ChatGPT account, targeting GPT-6 with High reasoning. Do not install local model runtimes, route to Codex, silently substitute models, or count manual JSON handoff as the requested integration.

Implemented the documented OpenAI Sign in with ChatGPT plan-usage flow for open-source apps: dynamic client registration, stable host ID, PKCE/state/nonce, loopback callback, JWKS-verified identity, protected per-account credential records, serialized refresh, and sign-out/revocation. The three-role coordinator now uses the official streaming Responses endpoint with store:false and reasoning.effort:high. Model choices come from the signed-in account's catalog; no fallback. Existing browser login is separate from this explicit authorization.

Removed the CHAI-created Ollama runtime/models and the local adapter/start controls. Preserved the provider-independent coordinator, checkpoints, safety fixes and approval gates. No local-model release was published. The previously published alpha installer remains older than main.

Validation on Kali: typecheck, lint, build, 26 automated tests, native Electron E2E, and SIGKILL recovery passed. Real authorization discovery/JWKS endpoints responded successfully. Tests use explicit fixtures and do not prove live GPT-6 inference.

Current gate: the real OpenAI account chooser for CHAI is open on the right monitor. User must choose their account and authorize plan use. No credentials have been requested, printed or copied. After consent, refresh model choices, verify the exact available GPT-6 model with High reasoning, execute an approved disposable file task across all roles, then verify persistence and package/install the new release. Full-system reboot remains unverified.

Official contracts:
- https://developers.openai.com/siwc/token-sharing-open-source/sign-in
- https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference
- https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations

Earlier entries below are historical; this direction supersedes local-model plans.


This file retains the full-product acceptance rubric. Verified alpha scope is recorded in docs/QA_2026-10-19.md and handoff.md; unchecked broader items are not claimed complete.

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
2. Select **Mock Provider** (offline) and start: `Create notes.txt with three lines, check content, summarize the changes.`
3. See Manager plan, Builder tool action, Reviewer verification, Manager evidence-backed completion.
4. Open Work timeline, inspect actual file diff, tool output and event sequence.
5. Start a second longer test and quit/restart renderer mid-flight; state persists.
6. Attempt writing outside workspace and reject with a visible error.
7. Start an executing cancellable command and press **Stop all**; verify stopped state.
8. If provider-login check is possible, open official ChatGPT site; manually sign in and verify session remains in restricted pane without secrets being exported.

**Pass condition:** Every step backed by observed result and recorded in HANDOFF. A broken, simulated or omitted step fails the gate.

## Executed alpha gates

- [x] Actual native Linux/Electron launch, actual file action, approval before action and persisted task identity.
- [x] Sandbox/context isolation/no Node confirmed for local and remote views; remote page has no CHAI bridge.
- [x] Traversal, symlink, hardlink, secret-name, oversized-file and forged schema rejection.
- [x] Stop terminates process group and blocks queued action; approval expiration tested.
- [x] SQLite reopen, renderer reload, application restart and hard process kill recovery tested.
- [x] Packaged executable and installed AppImage extraction mode tested on Kali.
- [x] Official ChatGPT URL opened with no credentials read; sign-in still manual-pending.
- [x] All dependency audit entries resolved on tested Kali lockfile.
- [ ] Full-system reboot and live local-model acceptance remain pending. Automated ChatGPT transport is unsupported.

- [x] Independent GitHub CI and release workflow passed; published artifacts and checksums verified by release API.

## Manual sign-in verification — 2026-10-19

User completed ChatGPT sign-in. Visually verified the authenticated home after closing and reopening only the manager provider window; the isolated session persisted. Initially incomplete page resolved on reopen. CHAI and provider are on the right monitor. No credentials, cookies or tokens were read. This verifies window-reopen persistence, not whole-app restart or reboot persistence. Automatic ChatGPT orchestration remains unimplemented; manual handoff is unchanged.

## Model-backed coordination checkpoint — 2026-10-19

Implemented separate Manager assignment, Builder proposal, Reviewer assessment and Manager report calls using local Ollama. SQLite persists role responses and phases; bounded to 3 rounds/15 calls/36 actions. Repair plans require fresh human approval. Added existing-file discovery enforcement and expected-hash conflict checks. Typecheck, lint, build and 22 unit/integration tests pass on Kali. Actual qwen2.5-coder:3b completed a new-file task with all four calls; the harder existing-file UI test exposed poor proposals, correctly rejected by review/policy. That harder live gate remains in progress. No ChatGPT automation is enabled.
