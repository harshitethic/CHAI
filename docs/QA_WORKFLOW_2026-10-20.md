# Workflow verification — 2026-10-20

## Release and reproducibility

- Source: `7e9ca7f` (CHAI 0.10.0-alpha.1).
- [Source CI](https://github.com/harshitethic/CHAI/actions/runs/39442023494): success.
- [Release workflow](https://github.com/harshitethic/CHAI/actions/runs/39442154972): success, including source and packaged native tests.
- [Public release](https://github.com/harshitethic/CHAI/releases/tag/v0.10.0-alpha.1).
- Downloaded AppImage SHA256: `64170e8755bcee28cfce069de696eb1cad060cc57ce95b5f5af990637ee3bb5d`.
- The downloaded public AppImage passed native Electron acceptance and the workbench suite on Kali. The prior installation was retained during upgrade.

## Automated and native checks

All 77 automated tests passed with typecheck, lint and build. New cases exercise actual OAuth-authenticated HTTP MCP progress, persistent milestone state, stale Coordinator saves, role isolation, task revision isolation, sequence/version conflicts, queued steering during a real write, original-goal retention and queued-message restart/resume.

The native workbench verifies a rendered milestone plan and immediate public progress message alongside the existing filesystem, terminal, repaired check and browser preview scenarios. `docs/qa/workflow-workspace.png` is an actual capture of this scripted fixture. It is not a live model transcript.

An initial native assertion matched the conversation and the raw audit log simultaneously; scoping it to the conversation corrected the test. No product behavior or safety assertion was removed.

## Upgrade path discovered in the live run

The existing ChatGPT connection initially exposed only the older three tools. The Manager submitted a valid role result but accurately said the new progress tool was unavailable. Refreshing tools under **ChatGPT Settings → Plugins → CHAI Desktop → Refresh tools** updates the existing connection without replacing its pairing.

The real-project audit also paused when the Reviewer composer contained an unsent draft. The draft was preserved privately before the composer was cleared and the same job resumed. Completed inspection actions were retained.

Live provider results and installation checks are recorded separately when completed. The original game request remains distinct from this audit: a working 2D prototype and passing logic tests do not establish realistic 3D graphics, authentic NYC streets or real crypto earning.

## 0.10.1 recovery and conversation fixes

The real game audit exposed a key action without an observed snapshot/ref. CHAI stopped before dispatch. New validation rejects that proposal. Native testing then exposed Electron receiving an empty key for DOM ArrowUp; the runtime now translates arrow names. Canvas inputs support bounded holds and release on cancellation. Native tests demonstrate movement across frames, Space flight toggling, release on cancellation and rejection of removed targets.

All 83 automated tests pass with typecheck, lint and build. Recovery tests confirm a rejected precondition produces executed:false, replans without obsolete actions, respects the existing budget and does not retry uncertain outcomes or declined consent. The native workbench passes conversation follow/scroll preservation/jump-to-latest and milestone rendering. The real audit was explicitly continued on the updated runtime; its final outcome is recorded below when available.

Electron key input uses [accelerator key codes](https://www.electronjs.org/docs/latest/api/structures/keyboard-input-event/); the native fixture verifies the resulting DOM events rather than assuming dispatch succeeded.
