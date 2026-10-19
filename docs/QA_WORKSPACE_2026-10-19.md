# CHAI 0.7 verification — 2026-10-19

Implementation covers all nine requested capability areas and the Work UI additions. This is broader alpha functionality, not a claim of complete first-party Codex/Work parity.

## Evidence gathered on Kali

- 62 unit/integration checks passed, including real npm registry installation, a failing Node test, exact patch, the same test passing, source/index preservation, real background processes, input, Stop, ownership checks and persisted interruption state.
- Existing native Electron suite passed: approvals, files, sandbox, browser, Git confirmation, progress, switching, pause/reload and four widths.
- New native workspace suite passed: terminal display, file viewer, side-by-side diff, owned server, real input in embedded preview, output registration, closing to tray, Stop and restart without process replay.
- Authenticated HTTPS MCP fixture passed with a trusted test certificate: tool discovery, denied action with zero executions, approved action with one execution. This is a transport fixture, not a live third-party account claim.
- Real PDF, DOCX, XLSX and PPTX generation passed inside the isolated project. Output signatures, sizes and SHA256 values were recorded. No claim of manual visual review of arbitrary documents is made.
- Existing computer boundaries and SIGKILL recovery passed. Real X11 capture/click/type/scroll, browser upload and protected-file rejection pass; AT-SPI availability is reported honestly per target application.
- Dependency audit reports zero vulnerabilities.
- A normal-profile live run exposed legacy file tools rejecting app-owned projects under `.config`. The gateway now accepts only exact recorded project roots. Both the regression test and native workspace fixture use that directory structure.

## Outstanding environmental gates

Kali GitHub CLI is not signed in. The PR/CI adapter is implemented, but publishing from the installed app requires a one-time GitHub login; existing Mac publishing credentials are not copied. OAuth-only external MCP servers need a compatible bearer gateway or additional OAuth client support. Whole-PC reboot remains deferred until unrelated work can be saved. X11 is the implemented desktop platform.

## Evidence locations

Native screenshot: `docs/qa/workbench-preview.png`. Local verification records are copied into `docs/qa` before release. Test fixtures and normal ChatGPT runs are distinguished explicitly.

## Live normal-ChatGPT acceptance

Task `b9aaa7a0-6b9e-41b7-bf70-fbac5d7dc8e0` reached DONE after the integration fix and same-task follow-up. Normal signed-in 6 High conversations completed three rounds and ten role calls after that follow-up: npm dependency install (exit 0), original npm test (exit 1), exact one-file repair, identical unchanged test (exit 0), background server on 19879, real browser 0 → 1 click plus fresh confirming observation, and output registration. Original source and test-file hashes were independently checked. The reviewer passed, then the Manager produced its report. No model adapter was substituted. See `docs/qa/project-live-2026-10-19.json`.

The packaged native workbench test also passed consented download bytes/registration, declined download without output, embedded input, tray continuation, Stop and restart persistence. Final CI/public-download installation records follow in a separate publication verification record.
