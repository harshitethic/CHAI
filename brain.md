# BRAIN — CHAI's Long-Term Memory

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
