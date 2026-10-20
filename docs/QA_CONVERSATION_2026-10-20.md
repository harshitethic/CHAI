# Conversation and project workflow verification — 2026-10-20

Version: 0.9.0-alpha.1.

## Implementation

The task screen now displays a chronological conversation from saved user messages and validated model responses. Final answers are visible; technical receipts and internal logs remain expandable. React escapes content; bold and code formatting do not interpret raw HTML or executable links. The current action and checklist remain available next to the conversation on wider windows.

The new-task UI explicitly selects a new empty project or an existing folder, displays enabled permissions, and defaults to isolated project commands, network and browser previews. Existing tasks keep their original capabilities. The UI no longer silently sends a new request to a previously selected folder. Host execution still requires its separate native grant.

Informational questions may use a no-action answer path. The answer is independently reviewed, then reported; this creates no workspace grant or execution effect. A review that requests actual work returns to normal permission checks. The status says “Reply ready” to distinguish an answer from newly completed tool work.

## Local/native checks

- TypeScript, lint, build and 71 automated checks passed on Kali.
- Native Electron E2E passed: file writes, approvals, restart/reload, sandbox, browser, Git confirmation, progress and multiple widths.
- Native workbench passed: fresh-project isolation from a selected source, persisted conversation rendering after reload, real fail/fix/pass terminal workflow, preview, durable sessions, host consent and manual commands.
- The native screenshot in `qa/conversation-workspace.png` uses a scripted response fixture. It is not live model-quality evidence.

## Actual game investigation

The existing game task was paused after a provider connection error. It had project, network and browser capabilities disabled and used an older test workspace. Ten recorded actions had finished; its core Node tests and JavaScript syntax check passed. The game files included the renderer and input code by that point.

A separate real Chromium check of those existing files found no JavaScript errors. Keyboard movement changed the displayed location from the origin; flight toggled, pause worked, and the garage drawer opened. This was performed by the developer investigation, not retroactively recorded as CHAI's own browser execution. No game source was changed.

The result is a 2D arcade prototype, not the requested realistic game or a real crypto earning integration. Its original task remains paused rather than being falsely marked complete.

## Limits of this evidence

Instruction changes request more natural summaries and review the full user outcome; passing fixture tests does not establish equal model quality or reliability to Codex/Work. CHAI still uses normal signed-in ChatGPT conversations with structured job returns. It does not stream model tokens, bypass provider limits, or reproduce proprietary first-party infrastructure. Live provider and publication results must be recorded separately.
