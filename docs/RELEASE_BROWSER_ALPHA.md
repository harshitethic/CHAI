# CHAI 0.10.2-alpha.1 — visible, steerable work

- Fix browser input failures found in the game audit: require observed input targets, expose canvas controls, translate DOM arrow keys to Electron key codes, and support held keys up to two seconds with release on cancellation. Stale preconditions trigger bounded replanning; uncertain outcomes and declined confirmations are never retried automatically.
- After restart or a closed browser, request an explicit page reopen instead of waiting indefinitely on an empty browser document.
- Keep interrupted browser receipts intact when compacting older observations, preventing a review crash after recovery and several subsequent successful inputs.
- Follow the latest conversation updates automatically, retain your position while reading earlier messages, and jump to new updates with one click. Waiting text distinguishes progress from the final result.
- Live public updates through `chai_report_progress`, alongside a durable milestone plan with completed, current, pending and blocked states.
- Job/role scoping, monotonic progress sequences, idempotent retries and optimistic plan versions. Old jobs cannot update a superseded task revision.
- Follow-ups queue at safe planning/action/review boundaries by default. Completed actions and running previews remain; choose Interrupt current work to stop immediately.
- Original requirements remain primary when the user sends “continue.”
- When a role posts live progress, suppress its repeated assignment/proposal summary in the conversation; retain the structured response in the audit log and always show the final result.
- Successful review paraphrases and draft informational replies stay in detailed logs; the final answer stays visible.
- Native UI and authenticated HTTP MCP regression coverage; corrected installation examples.

Progress is a public assessment from the active ChatGPT job, not proof that tool checks passed. The engine still owns authorization, execution and completion. Existing conversations may need to refresh the CHAI plugin tool list for the new progress tool. Token streaming and identical Codex/Work model behavior are not implemented.

Read `docs/WORKFLOW.md` for the acceptance contract and known gaps. Source and packaged-executable gates must pass before this release is published.
