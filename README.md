# CHAI — Chat Has Actions Inside

## User correction — browser ChatGPT is the required product

The user clarified that CHAI must use the normal ChatGPT website and its interactive signed-in session, with GPT-6 and High thinking selected. They explicitly rejected both local inference and the OAuth/Responses adapter as replacements. The intended design remains one manager and two workers coordinating PC actions through normal ChatGPT conversations. Do not treat the OAuth adapter as acceptance of this requirement.

The OAuth test controller has been stopped and the newly authorized CHAI renewable session revoked successfully; local OAuth tokens were cleared by the application sign-out path. The separate Chromium ChatGPT browser session was preserved. No live model inference was run through the OAuth path. The OAuth source remains an abandoned implementation in history, not the accepted provider architecture. No new installer release was published.

The browser-to-agent bridge is still missing. Reopening ChatGPT is not completion. Resolve a permitted browser/session integration under the original provider-compliance requirement before claiming autonomous browser-driven roles work. Never silently swap the requested architecture for API, Codex, local inference or manual copy/paste again.


**Stop chatting. Start doing.**

A Chromium-based Linux desktop application with a persistent Manager, Builder and Reviewer, scoped tools, approval gates and recoverable task history.

## Current status

Main now integrates **Sign in with ChatGPT** using OpenAI's documented ChatGPT plan-usage flow for open-source applications. The requested target is GPT-6 with **High reasoning**. CHAI retrieves the account's available models and never falls back to local inference or another provider.

**Live ChatGPT acceptance is pending user authorization.** The real OpenAI account chooser has been opened on Kali. Automated transport/authentication tests, native desktop tests and crash recovery pass; those tests do not demonstrate a completed live GPT-6 task.

The published `v0.1.0-alpha.1` installer predates this integration. A new release will follow live verification.

## Connect ChatGPT

1. Open Connections → **Continue with ChatGPT**.
2. Choose your account on OpenAI's page and authorize CHAI to use your ChatGPT plan.
3. Refresh available models and choose the intended GPT-6 model. Reasoning is set to High.
4. Choose a dedicated workspace and submit a goal.
5. Review the proposed file/command actions before approving them.

Eligible requests use your ChatGPT plan under its limits and configured credits policy. Review access and limits in [ChatGPT Settings](https://chatgpt.com/settings/usage). A browser login by itself is separate from the plan-usage authorization. CHAI does not read browser cookies or scrape ChatGPT output.

OAuth credentials stay in an owner-only directory/file under the application data directory. They are never returned through renderer IPC, written to task logs, or included in exports. This is protected filesystem storage, not encrypted storage. Signing out attempts remote session revocation and clears credentials locally.

## Implemented

- Manager assignments, Builder plans, Reviewer decisions and Manager reports, persisted separately.
- Bounded repair rounds, provider-error pause/resume and cached completed role calls.
- Real workspace read/list/write and fixed terminal commands.
- Exact-plan approvals, cancellation, before/after evidence and conflict-aware undo.
- SQLite task queue and reconciliation after interrupted execution; ambiguous commands are not blindly replayed.
- Manual isolated browser and X11 controls, screenshots and explicit confirmations.
- Charcoal desktop interface, keyboard shortcuts, task search, role timelines and activity logs.
- AppImage and Debian packaging configuration.

Model roles can propose actions; they cannot grant permissions. New plans require approval. Tool execution is bounded to the existing gateway. General autonomous browser/desktop control, arbitrary shell workflows and broader task quality remain unfinished acceptance items.

## Development

Requires modern Node.js, npm, Python 3 and Linux desktop libraries.

```sh
npm ci
npm run check
npm start
npm run test:e2e
npm run test:crash
npm run package
```

The Electron tests require a desktop display or Xvfb. On Kali, native tests use its X11 session. The core suite includes OAuth signature/issuer/audience/nonce/expiry checks, invalid-state rejection, secure file permissions, interrupted SSE, provider failure, cancellation, repair approvals, path protection and crash reconciliation. Fixtures are used only in automated tests.

## Limits and handoff

This is an alpha. Live ChatGPT model availability and a complete real-provider task must be verified after consent. Full-system reboot has not been tested. Existing task data is retained; legacy local-model tasks are disabled rather than silently migrated to another provider.

Read `brain.md`, `tasks.md`, `checks.md`, `decisions.md`, `blockers.md` and `handoff.md` before resuming.

Implementation follows OpenAI's [registration guide](https://developers.openai.com/siwc/token-sharing-open-source/sign-in), [models and inference contract](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference), and [preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations).
