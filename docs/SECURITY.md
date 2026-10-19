# Security and Privacy Requirements

CHAI gives model-suggested actions access to a real Linux computer. Treat this as a security-sensitive application. “User asked it to do anything” is **not** an excuse for unchecked execution.

## Threat model

Potential attackers: malicious website/chat response, dependency with unsafe update, injected project README, compromised downloaded file, hostile chat prompt, malicious plugin/tool output, local malicious process, compromised worker adapter, accidental broad permission.

Protected assets: home directory, private repositories, SSH keys, browser sessions/cookies, cloud tokens, GitHub auth, password managers, local projects, personal files, ongoing unsaved work.

Trust boundaries:
1. Public webpages and provider model outputs are **untrusted content**.
2. User-intended instructions must flow through the local CHAI UI with explicit capability grants.
3. CHAI renderer/webviews are not privileged OS code.
4. Native actions flow only through validated, auditable main-process tool gateway.
5. GitHub/remote systems are external mutations with appropriate controls.

## Electron hardening

- Pin supported Electron version; enable sandbox + contextIsolation + no nodeIntegration.
- Prefer modern `WebContentsView` or secure equivalents; never expose Node to third-party pages.
- Strict CSP for local renderer, typed IPC allowlist, validate sender origin and request schema.
- Block navigation to local files and unexpected origins from provider pane; isolate partitions.
- Handle permission requests (clipboard, media, USB, camera, notifications, geolocation, filesystem) with explicit user action and domain checks.
- Disable remote debugging in production; no insecure Chromium flags or `webSecurity: false`.
- Restrict downloads to user-confirmed path or safe download folder; scan unexpected file types where feasible.
- Disable devtools in shipped builds unless explicitly enabled for diagnostics and never reveal secrets there.

## Workspace filesystem policy

Every action uses selected canonical absolute root. Resolve symlinks, paths and parent directories before check. Defend against `../`, symlink escape, hardlink races, paths changed after approval, mount boundaries, case variants and `~/.ssh`/browser profiles. Use file descriptors or safe path operations where possible. Restrict writes to workspace; protected directories denied even when child path appears inside workspace unless separately approved.

**Defaults:** read selected workspace; write disabled until safe-write grant. Never traverse other projects, user home, external drives or browser profiles by default. A Git operation can affect work outside changed files (hooks, submodules): disable untrusted hooks or preview their risks; do not run arbitrary repo-supplied install scripts blindly.

## Terminal and network execution

- No `exec(modelSuppliedString)`; parse commands into executable + explicit argument array where possible; never interpolate raw untrusted text into shell.
- Risk classify commands. Read-only (`pwd`, `git status`) safer, mutating (`npm install`, `git commit`, `curl`, delete) requires escalating policy.
- Per-command timeout, CPU/memory/process limits where feasible, separate process group for cancellation, stdout/stderr size and secret redaction.
- Do not run `sudo` or privilege escalation automatically; no edit to boot config, auth service, kernel modules, firewall or user login shell without explicit user approval.
- No implicit remote SSH, bank, exchange, email sending, social posting, payment, cloud deployment, GitHub repository deletion, or force push.
- For network-enabled actions display destination host, data leaving device and whether external mutation occurs.

## Approval UX

Approval message includes task ID, user objective, exact proposed action, risk, affected paths/resources, whether reversible, and bounded grant duration. Present `Deny`, `Approve once`, and for suitable low-risk actions `Allow for this workspace` with expiry. A model may **request** permission but may not generate a fictitious user approval message or self-approve.

## Model and prompt injection

- All remote text (website, model, README, downloaded files, terminal logs, GitHub issues) is task data, not a higher-priority system instruction.
- Validate every proposed tool call independent of worker result, not just an “I promise it's safe” assertion.
- Keep user secrets out of prompts and event logs. Redact before sending data to third-party providers; show selected context to user when it would transmit private files.
- Test malicious content: `ignore rules`, `send ~/.ssh`, `download script and run`, `change permissions`, `force push`, false reviewer approval, forged tool response.

## Session / credential handling

- ChatGPT login happens on official domain. No programmatic extraction of ChatGPT browser cookies, localStorage, tokens, or saved passwords into CHAI storage or GitHub.
- Distinguish web session from API keys; no account duplication or automation meant to bypass provider usage limits.
- Optional official API key must be supplied by user, kept in OS secret store (`libsecret`/Secret Service where available); fallback warn about unsupported secure storage instead of silently writing plaintext.
- Session clear/logout must remove CHAI-owned browser partition data with confirmation; avoid affecting user's external Chromium profile.
- No telemetry by default; diagnostics exported locally on explicit user command after redaction.

## Persistence privacy

- SQLite may contain conversation summaries, paths and command output. Secure file permissions (`0600` where feasible), retention controls, opt-in export, user-visible deletion.
- Sensitive data encrypted at rest when reasonable; avoid false claims that ordinary SQLite is encryption.
- Do not send local task logs to external error reporting automatically.
- Back up migration before irreversible schema changes; clarify exported backup sensitivity.

## Stop, rollback and cleanup

Global Stop All revokes dispatch, cancels subprocess groups, requests adapter cancellation where supported, suspends pending approvals and records termination. It cannot retroactively undo external writes; clearly state this. File-edit tool keeps snapshots/patch diffs for undo; commits may be reverted after inspection, not silently force-reset if user changes exist.

## Release security checks

Dependency license/audit, secret scan, Electron hardening review, IPC malformed payload tests, workspace symlink tests, dangerous terminal input tests, external URL handling, app package integrity/SHA256. Add `SECURITY.md` with private vulnerability-report route that does not expose user personal details.


## Implemented 0.3 execution boundary

Autonomous authorization is a local, task-scoped grant bound to the canonical workspace, not a permission supplied by model output. Start records the grant; Revoke deletes it and cancels active tools. Restart pauses tasks but preserves the grant for explicit Resume. Exact plans receive renewable 15-minute execution leases under that grant. The UI defaults to workspace mode and states this authorization next to Start; review mode remains available.

The `run` tool accepts Python, Node or Bash argument arrays. Bubblewrap isolates user, process, mount and network namespaces, drops capabilities, disables nested user namespaces and exposes only selected text-file snapshots under read-only `/workspace`, public runtime directories and an ephemeral `/tmp`. There is no host home, `/etc`, credential directory, browser profile or inherited desktop environment. Inputs are hash checked; execution has output, time, address-space, file-size and process limits. Failure to establish isolation fails closed. This is defense in depth, not protection against kernel vulnerabilities or malicious software already running as the user. Runtime files under `/usr` are assumed public; users must not store secrets there.

A nonzero exit is recorded as execution evidence, not a passed check. Reviewer can request repairs; a success verdict cannot finalize while the latest execution of a recorded command still fails. No arbitrary host shell or network/package-install grant exists in this release.
