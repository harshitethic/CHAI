# CHAI workflow acceptance contract

CHAI’s main goal is to complete real work through a visible, steerable and recoverable desktop workflow. Resembling another app is insufficient: a task needs observable outcomes. This is a product contract for CHAI, not a claim that it reproduces proprietary Codex/Work infrastructure or model quality.

## Nine acceptance areas

| Area | Required behavior | Current evidence / remaining work |
| --- | --- | --- |
| Goal continuity | Preserve the original request, apply follow-ups, and check the full outcome. “Continue” must not replace the goal. | Coordinator retains the original goal; a real-write regression test covers two queued follow-ups. Long context and subjective visual quality still need larger benchmarks. |
| Visible planning | Show meaningful milestones, one current step, remaining work and blockers. | Durable, revision-scoped work plans delivered through authenticated MCP. Milestones are model-reported; they do not replace tool evidence. |
| Live conversation | Explain useful findings during work, keep the final answer readable, avoid internal handoff chatter. | New progress tool persists messages before the role result. Successful review paraphrases and draft informational answers remain in detailed logs. No token streaming. |
| Execution | Read, edit, run, install dependencies and inspect results in the authorized workspace. | Existing isolated-project execution and persistent sessions; sandbox and project suites remain release gates. |
| Steering | Receive a correction without discarding a completed operation or killing a running preview. | Follow-ups queue at role/action boundaries. Explicit interruption remains available. A provider step can still wait until its timeout; choose Interrupt when necessary. |
| Recovery | Retain plans, messages and effects across restart; never blindly replay uncertain mutations. | SQLite progress persistence, sequence deduplication, plan version checks, restart-paused queued follow-ups and existing effect reconciliation. Provider restrictions still require a real resolution. |
| Verification | Run actual checks, fix failures, and compare the result with the full request before claiming completion. | Existing independent review and captured exit codes. A passing unit test alone cannot establish visual fidelity or feature completeness. |
| Workspace | Make files, diffs, terminal output, browser previews and deliverables inspectable while work proceeds. | Native workbench integration tests cover real files, repaired checks, interactive previews and multiple window sizes. |
| Delivery | Publish reproducible releases with honest evidence and usable setup instructions. | CI tests source and packaged executable. Scripted fixtures and live ChatGPT runs are labeled separately. GitHub popularity is not an acceptance test. |

## Upgrading an existing ChatGPT connection

ChatGPT can retain the previous MCP tool list after CHAI upgrades. Open **Settings → Plugins → CHAI Desktop → Refresh tools** in the signed-in ChatGPT account. This keeps the existing pairing; reinstalling the plugin is unnecessary. The worker can still complete role jobs before refresh, but live milestone updates require the new tool to be available.

## New protocol

`chai_get_job` exposes the current milestone plan, plan version and next progress sequence. The exact assigned role may call `chai_report_progress` with a short public message and an optional replacement plan. Plan IDs are stable; at most one milestone may be active. A plan update must use the current version.

Updates are atomic and stored separately from task JSON, so an older in-flight Coordinator save cannot erase them. Identical retries do not duplicate the conversation. Wrong roles, out-of-order sequences, conflicting retries, paused tasks and superseded task revisions are rejected. Progress cannot authorize tools, execute actions or mark a task done.

The conversation follows new updates while the reader is at the bottom. Scrolling up suspends automatic following; **Latest update** returns to the newest message. Milestones remain fully visible rather than hiding pending steps inside the action-history scroller.

A follow-up queued during execution is applied only at a boundary with no unresolved STARTED effect. Completed effects remain; unstarted actions are replaced. Queued messages survive restart and wait for explicit resume. An immediate interrupt retains the existing stop-and-replan behavior.

## Browser recovery

Input proposals require an observed snapshot and target. Canvas controls are included in observations; supported keys may be held for 0–2000 ms and are released in a finally block. DOM arrow-key names are translated to Electron accelerator names.

Only a typed precondition rejection raised before dispatch triggers automatic replanning. Its receipt records executed:false, retains completed effects, removes unstarted actions and asks for a fresh observation under the existing round/call/action budget and permissions. Timeout, ambiguous outcome, denied capability and declined consent errors do not use this path.

## Completion evidence

- `tests/work-plan.test.ts`: restart, stale task save, role isolation, revision isolation, sequence and version conflicts, bounded plan validation.
- `tests/browser-bridge.test.ts`: actual OAuth-authenticated HTTP MCP progress while all four role phases execute a real filesystem task.
- `tests/agents.test.ts`: steering during an active write, retained completed file, skipped obsolete action, original-goal continuity, queued-message restart/resume, role-boundary steering, rejected-input recovery, budget exhaustion and non-retry of uncertain outcomes.
- `tests/conversation.test.ts`: immediate progress rendering and suppression of duplicate review/draft answers.
- `tests/computer.mjs`: actual held canvas input, flight-key toggle, key release on cancellation, stale/removed targets and permission boundaries.
- `tests/workspace-electron.mjs`: native milestone and conversation rendering alongside the real workbench.

## Next benchmark priorities

Use existing projects, including the flying-car game, to measure completed requirements, independently reproduced checks, browser interaction, retained corrections, recovery behavior and time spent waiting on the provider. Track failures openly. A 2D prototype with fictional points does not satisfy a request for realistic 3D streets and real crypto earning; the agent must expose that gap instead of declaring the smaller project complete.

Remaining work includes provider-independent scheduling, broader long-running recovery coverage, better large-context retention, richer artifact previews and a repeatable visual-quality benchmark. The normal signed-in ChatGPT provider remains subject to its available tools, login state, service limits and response behavior.
