# CHAI 0.10.0-alpha.1 — visible, steerable work

- Live public updates through `chai_report_progress`, alongside a durable milestone plan with completed, current, pending and blocked states.
- Job/role scoping, monotonic progress sequences, idempotent retries and optimistic plan versions. Old jobs cannot update a superseded task revision.
- Follow-ups queue at safe planning/action/review boundaries by default. Completed actions and running previews remain; choose Interrupt current work to stop immediately.
- Original requirements remain primary when the user sends “continue.”
- Successful review paraphrases and draft informational replies stay in detailed logs; the final answer stays visible.
- Native UI and authenticated HTTP MCP regression coverage; corrected installation examples.

Progress is a public assessment from the active ChatGPT job, not proof that tool checks passed. The engine still owns authorization, execution and completion. Existing conversations may need to refresh the CHAI plugin tool list for the new progress tool. Token streaming and identical Codex/Work model behavior are not implemented.

Read `docs/WORKFLOW.md` for the acceptance contract and known gaps. Source and packaged-executable gates must pass before this release is published.
