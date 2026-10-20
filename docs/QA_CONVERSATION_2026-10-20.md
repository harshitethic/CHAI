# Conversation and project workflow verification — 2026-10-20

Version: 0.9.0-alpha.1.

## Implementation

The task screen now displays a chronological conversation from saved user messages and validated model responses. Final answers are visible; technical receipts and internal logs remain expandable. React escapes content; bold and code formatting do not interpret raw HTML or executable links. The current action and checklist remain available next to the conversation on wider windows.

The new-task UI explicitly selects a new empty project or an existing folder, displays enabled permissions, and defaults to isolated project commands, network and browser previews. Existing tasks keep their original capabilities. The UI no longer silently sends a new request to a previously selected folder. Host execution still requires its separate native grant.

Informational questions may use a no-action answer path. The answer is independently reviewed, then reported; this creates no workspace grant or execution effect. A review that requests actual work returns to normal permission checks. The status says “Reply ready” to distinguish an answer from newly completed tool work.

## Local/native checks

- TypeScript, lint, build and 72 automated checks passed on Kali.
- Native Electron E2E passed: file writes, approvals, restart/reload, sandbox, browser, Git confirmation, progress and multiple widths.
- Native workbench passed: fresh-project isolation from a selected source, persisted conversation rendering after reload, real fail/fix/pass terminal workflow, preview, durable sessions, host consent and manual commands.
- The native screenshot in `qa/conversation-workspace.png` uses a scripted response fixture. It is not live model-quality evidence.

## Actual game investigation

The existing game task was paused after a provider connection error. It had project, network and browser capabilities disabled and used an older test workspace. Ten recorded actions had finished; its core Node tests and JavaScript syntax check passed. The game files included the renderer and input code by that point.

A separate real Chromium check of those existing files found no JavaScript errors. Keyboard movement changed the displayed location from the origin; flight toggled, pause worked, and the garage drawer opened. This was performed by the developer investigation, not retroactively recorded as CHAI's own browser execution. No game source was changed.

The result is a 2D arcade prototype, not the requested realistic game or a real crypto earning integration. Its original task remains paused rather than being falsely marked complete.

## Limits of this evidence

Instruction changes request more natural summaries and review the full user outcome; passing fixture tests does not establish equal model quality or reliability to Codex/Work. CHAI still uses normal signed-in ChatGPT conversations with structured job returns. It does not stream model tokens, bypass provider limits, or reproduce proprietary first-party infrastructure. Live provider and publication results must be recorded separately.

## Retry and release environment correction

Explicit Resume/Retry now allows re-delivery of an unanswered failed provider call using its existing job ID. An ordinary restart still preserves the delivery receipt; answered jobs remain immutable and no execution effects are replayed. Regression coverage checks all three cases.

The first release attempt ran on the newly selected Ubuntu 26.04 image and failed Bubblewrap network-namespace setup with `RTM_NEWADDR: Operation not permitted`. CI and release are now pinned to Ubuntu 24.04. Isolation flags and test assertions were not weakened; Ubuntu 26.04 compatibility remains unverified.

## Live and published result

A real informational request through the normal signed-in ChatGPT 6 High connection reached DONE after explicit recovery from its initial provider timeout. It used three model calls, zero tool effects and zero workspace grants. The final response was two natural sentences about investigating a failed test, making a targeted fix, rerunning checks and reporting the result. See [structured live evidence](qa/conversation-live-2026-10-20.json). This verifies the reply/retry path; it does not establish general task-quality parity.

[CI](https://github.com/harshitethic/CHAI/actions/runs/39436652934) and [release](https://github.com/harshitethic/CHAI/actions/runs/39436657377) passed for source `1de2845cfed3f46489a49e644594cfd6bf644e48`. The [public 0.9.0 alpha](https://github.com/harshitethic/CHAI/releases/tag/v0.9.0-alpha.1) AppImage has SHA256 `23f92714181de6bb1d4c618771bdba2d50681d58f5f659635372dea438d11ce7`.

The downloaded public binary passed native Electron and workbench checks on Kali. The first workbench attempt left the preview below the visible viewport; the test now scrolls it onscreen before asserting native embedding. That failed attempt's durable fixture server was stopped before the passing rerun. Test cleanup now stops fixture sessions even on failure. No application isolation or assertions were weakened.

Installed-profile verification passed: version 0.9.0, nine saved tasks (the previous eight plus the live informational check), two retained outputs, authenticated tool pairing, the visible saved final reply and “Reply ready” status. The original game task remains PAUSED. The installer retained the previous executable and launcher backup.
