# Progress UI verification — 2026-10-19

Version: 0.6.0-alpha.1, Kali X11.

- `npm run check`: 54 tests, typecheck, lint and build pass.
- Native Electron E2E: actual task switching, action checklist, one active step, real Python interruption, Pause, renderer reload, saved cursor, Resume rejection for an ambiguous started effect, explicit error and unexecuted later action. Existing file/sandbox/browser/Git/approval/restart tests and four widths remain covered.
- SIGKILL recovery passes. Dependency audit reports zero vulnerabilities.
- New progress tests distinguish nonzero/terminated checks, executed actions versus final review, planning without a plan, paused/canceled/failed states, malformed activity evidence and per-task event retrieval after more than 500 unrelated events.
- UI inspection found duplicate sibling React keys for progress and activity components. Distinct keys fixed stale/duplicate rows during task switching; the native test checks that only one active row exists.
- Native screenshot `qa/progress-workspace.jpg` shows the actual app and the saved live Git task `1348cf96-1d34-4cc2-8d5c-820562ad03f8`. The test failed originally and passed after the repair. The screenshot uses real retained evidence from the 0.5 ChatGPT run, not a new 0.6 model-run claim.
- Electron capturePage returned an incomplete redraw on this X11 session; the published screenshot was captured directly from the visible CHAI window. The native window was visually checked.

Progress is derived from the stored execution cursor, task state, validated action plan and lightweight effect summaries. Selected-task reads return up to 500 of that task's events. The activity feed initially shows the latest 12 relevant updates; earlier updates and exact raw evidence are expandable. The checklist is bounded to the plan and scrolls for long tasks. Reduced motion disables its active indicator animation. Long task requests and reports are expandable.

Release CI and exact downloaded-artifact installation results are recorded separately after publication. No whole-PC reboot was performed.
