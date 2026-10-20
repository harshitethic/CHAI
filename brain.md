## Current continuation — 0.10.1-alpha.1

Browser input repair is implemented: grounded targets, canvas observation, bounded held keys, Electron arrow translation, cancellation release and typed pre-dispatch recovery. Verified 83 tests, typecheck/lint/build, native computer and workbench. The actual GhostSprint audit is running again with its original goal and prior evidence preserved; original game task stays paused. Publication/install and live audit outcome are pending. Do not claim completion until their evidence is recorded.

## Live workflow polish — 0.10.1-alpha.1

Added conversation following, preserved reader scroll position, jump-to-latest updates and truthful waiting text. Queued steering now returns to the engine after each role response, before spending another stale role call. Verified: 79 tests, typecheck/lint/build and native scrolling/workbench tests. Live game audit verified new MCP progress after refreshing the existing ChatGPT tool catalog; ongoing run and public-binary results are recorded in QA separately.

## Workflow update — 2026-10-20, 0.10.0-alpha.1

Implemented authenticated live progress and revision-scoped milestone plans, durable queued follow-ups at action/planning/review boundaries, explicit interrupt, original-goal continuity, and less repeated review chatter. Progress never grants permissions or marks execution complete. Native follow-up queue survives restart and waits for resume.

Verified locally on Kali: 77 tests, typecheck/lint/build and native workbench including new milestone/progress rendering. Actual HTTP MCP integration covers progress while executing real files. Release/public-binary and live-provider results are recorded separately after they finish. See `docs/WORKFLOW.md` for the nine-area acceptance contract and remaining gaps. Do not claim proprietary parity or equate the original game prototype with its requested graphics/crypto outcome.

# Current work — 0.9.0-alpha.1, 2026-10-20

Conversation UI, informational answers without tools, explicit fresh projects, provider waiting/recovery controls, and more natural agent summaries are implemented. User-facing defaults enable isolated project commands, network and browser previews, with visible controls before submission; existing permissions are not migrated. Published and installed on Kali. CI/release and public-binary native checks passed; 72 automated checks pass. A live ChatGPT informational reply and explicit retry passed with zero tool actions; all previous tasks, outputs and pairing were retained. See docs/QA_CONVERSATION_2026-10-20.md. See docs/RELEASE_BROWSER_ALPHA.md and the current git history. Older entries below are historical and may describe superseded limits.

# BRAIN — CHAI's Long-Term Memory

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

**Project name:** CHAI  
**Expanded:** Chat Has Actions Inside  
**Tagline:** Stop chatting. Start doing.
**Maintainer target:** GitHub user `harshitethic`  
**Target repository:** `harshitethic/CHAI` (verify existence)  
**Primary machine:** user-authorized Kali Linux desktop, likely multi-monitor  
**Target form factor:** installable desktop application for Linux  
**Preferred app runtime:** Chromium/Electron + TypeScript + React; local background orchestrator  
**Budget:** free/local-first. No compulsory paid API, cloud-hosted queues, or SaaS.  
**North star:** One user intent becomes a completed, verified, auditable local outcome.

## Problem statement

A ChatGPT browser chat is conversational; it normally cannot reliably persist multi-stage execution and authorized computer actions across browser/chat interruptions by itself. The user wants a desktop shell where chat is the command surface and a durable local work engine does the actual work, even if provider windows are closed, reloaded, or interrupted.

## Personas and jobs

- **Developer:** “Fix tests in this repository, run checks, summarize and commit when safe.”
- **Power user:** “Sort my work files in an explicitly selected folder; preview before renaming.”
- **Designer:** “Build the UI from reference images and show live screenshots.”
- **Operator:** “Run a repeatable, documented series of local checks and pause for privileged actions.”

## Fixed goals

1. Linux desktop app built on Chromium, attractive and installable.
2. Real first-party ChatGPT login pane owned by a restricted web context.
3. Visible logical Manager, Builder, Reviewer workspaces: three panes/views, not independent uncontrolled autonomous accounts.
4. Durable local orchestration, retries, checkpoints, SQLite history and recovery.
5. Permission-scoped tools, user approvals, audit trail, stop-all, rollback assistance.
6. Clear separation of capability: browser login, manual assisted workflow, locally modeled worker, optional provider API, and verified permitted web automation.
7. Open-source GitHub repo, working CI, screenshots of CHAI, Linux package release.
8. Operate and test on Kali through actual authorized computer tools when available.

## Fixed non-goals

- Bypassing provider subscription/usage limits, session timeouts, anti-automation systems or CAPTCHA.
- Browser cookie exfiltration or hidden login impersonation.
- Making a visual clone of Claude or distributing their visual assets in public code.
- Unsupported “100% autonomous forever” marketing claims.
- Unrestricted sudo commands or access to other user projects/data without explicit approval.
- Fake GitHub growth, PRs, CI results, test stats, or achievements.

## Engineering principles

**Real over impressive.** A working single computer action with retry, approval and evidence beats a staged dashboard pretending to be autonomous. **Local ownership.** Tasks and artifacts live on the computer; user can delete/export them. **Plan vs permission.** LLM messages can propose actions; only the guarded tools gateway executes. **Inspectable.** Show real diffs, exact commands, status, result/error, and origins. **Provider honest.** A session-based browser tab is different from a supported programmatic model adapter. **Resume safely.** No repeated irreversible action after reboot. **Design coherence.** Every implemented screen feels like one CHAI system.

## Keep these documents updated

- `tasks.md` — atomic tasks and objective done evidence.
- `handoff.md` — current commit, tested machine, what's working, next action.
- `blockers.md` — only independently verified blockers.
- `decisions.md` — decision change trail.
- `checks.md` — actual checked verifications; never precheck untested items.

## Rules for the next engineer/agent

Read `handoff.md` first. Reconcile the filesystem and GitHub before proceeding. Do not overwrite existing code based on the spec alone. Continue from the last objectively verified milestone. Report any mismatch between docs and running code. Preserve repo work unrelated to CHAI. Commit and push progress with real checks when credentials are available. No blind high-risk actions.

## Current handoff
Kali checkout: /home/kali/Projects/CHAI. Public repository: https://github.com/harshitethic/CHAI.
Read handoff.md for the exact current test and remaining gates. App restart and crash recovery are tested separately from a full-system reboot, which remains unverified.


## 0.3 update — 2026-10-19
Autonomous task-scoped workspace authorization now covers discovery, writes, isolated execution and repair without repeated approvals. Revoke removes the grant and pauses tools. Review-each-plan remains available. Bubblewrap Python/Node/Bash has explicit input hashes, no host network/credentials, read-only staged workspace and bounded runtime/output. Normal signed-in ChatGPT is the only live reasoning provider.

Verified live: four Python tests, three original failures, repair, unchanged tests passing; seven role calls, one workspace grant, zero manual plan approvals. See docs/qa/autonomous-live-2026-10-19.json. All 38 automated tests, typecheck/lint/build, native UI, crash recovery, AppImage execution and dependency audit pass. No full-machine reboot or general autonomous browser/desktop workflow is claimed.
