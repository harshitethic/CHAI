# DECISIONS — Architecture Decision Log

## User correction — browser ChatGPT is the required product

The user clarified that CHAI must use the normal ChatGPT website and its interactive signed-in session, with GPT-6 and High thinking selected. They explicitly rejected both local inference and the OAuth/Responses adapter as replacements. The intended design remains one manager and two workers coordinating PC actions through normal ChatGPT conversations. Do not treat the OAuth adapter as acceptance of this requirement.

The OAuth test controller has been stopped and the newly authorized CHAI renewable session revoked successfully; local OAuth tokens were cleared by the application sign-out path. The separate Chromium ChatGPT browser session was preserved. No live model inference was run through the OAuth path. The OAuth source remains an abandoned implementation in history, not the accepted provider architecture. No new installer release was published.

The browser-to-agent bridge is still missing. Reopening ChatGPT is not completion. Resolve a permitted browser/session integration under the original provider-compliance requirement before claiming autonomous browser-driven roles work. Never silently swap the requested architecture for API, Codex, local inference or manual copy/paste again.


## Current direction — 2026-10-19: ChatGPT only

The user explicitly rejected local-model substitution. The required provider is their ChatGPT account, targeting GPT-6 with High reasoning. Do not install local model runtimes, route to Codex, silently substitute models, or count manual JSON handoff as the requested integration.

Implemented the documented OpenAI Sign in with ChatGPT plan-usage flow for open-source apps: dynamic client registration, stable host ID, PKCE/state/nonce, loopback callback, JWKS-verified identity, protected per-account credential records, serialized refresh, and sign-out/revocation. The three-role coordinator now uses the official streaming Responses endpoint with store:false and reasoning.effort:high. Model choices come from the signed-in account's catalog; no fallback. Existing browser login is separate from this explicit authorization.

Removed the CHAI-created Ollama runtime/models and the local adapter/start controls. Preserved the provider-independent coordinator, checkpoints, safety fixes and approval gates. No local-model release was published. The previously published alpha installer remains older than main.

Validation on Kali: typecheck, lint, build, 26 automated tests, native Electron E2E, and SIGKILL recovery passed. Real authorization discovery/JWKS endpoints responded successfully. Tests use explicit fixtures and do not prove live GPT-6 inference.

Current gate: the real OpenAI account chooser for CHAI is open on the right monitor. User must choose their account and authorize plan use. No credentials have been requested, printed or copied. After consent, refresh model choices, verify the exact available GPT-6 model with High reasoning, execute an approved disposable file task across all roles, then verify persistence and package/install the new release. Full-system reboot remains unverified.

Official contracts:
- https://developers.openai.com/siwc/token-sharing-open-source/sign-in
- https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference
- https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations

Earlier entries below are historical; this direction supersedes local-model plans.


Format: `ADR-ID | Status | Decision | Why | Tradeoffs / review triggers`.

## ADR-001 · Electron, Chromium, TypeScript (Accepted as initial default)

Electron provides a Chromium browser view and Linux desktop capabilities with manageable development cost. React/TypeScript allows coherent application and strict interface contracts. Tradeoff: memory footprint; profile resource use and app startup and revisit Tauri only with verified provider-webview compatibility and safety.

## ADR-002 · Local-first SQLite orchestration (Accepted)

The coordinator must exist **independently from the ChatGPT tab** so tasks persist beyond chat context resets. SQLite WAL provides simple crash-safe storage without cloud or paid server. Sensitive values are not stored in plaintext when OS keychain is available.

## ADR-003 · Three logical roles, three visible panes (Accepted)

Manager, Builder, Reviewer communicate through durable typed envelopes; do **not** create separate credential-capturing accounts. Three windows do not bypass rate limits and are not themselves a persistent reasoning engine. User may view all three or focus Manager.

## ADR-004 · Provider interface, not UI scraping as foundation (Accepted)

Browser sign-in is supported as an interactive first-party pane. Programmatic messaging requires actual capabilities and policy compliance. Full local/mock adapter is mandatory to test orchestration offline; APIs are opt-in. The app should never represent unsupported controls as working.

## ADR-005 · Tool actions require scoped grants (Accepted)

Allow safe work in a selected directory with visible audit; request explicit consent for sensitive/privileged/irreversible operations. No generalized “do literally anything without consent” mode.

## ADR-006 · Visual inspiration, not clone (Accepted)

Reference screenshots define target craft: charcoal layers, orange/coral accents, subtle neumorphism/blur, refined navigation; all CHAI icons/brand/illustrations and implementation are original. Do not publish screenshots of third-party UI into open-source repo by default.

## ADR-007 · Honest milestone naming (Accepted)

`M1` desktop shell, `M2` local loop, `M3` durability/safety, `M4` installed release, `M5` genuinely compliant browser automation. M1–M4 may ship with manual ChatGPT pane and mock/local provider. No false “unlimited ChatGPT agent” marketing.

## ADR-008 · GitHub source-of-truth (Accepted)

Source repo belongs in verified `harshitethic/CHAI` if account access allows, with clear docs, tests and CI. Use branches, valid PRs, semantic commits, no fabricated contributions. Repo creation is desired, not already completed by this archive.

## Future decisions to make only with evidence

- Desktop interaction backend per Kali session: X11/XTest vs Wayland portals vs accessibility provider (security and capabilities differ).
- License selection: MIT or Apache-2.0, check project dependencies and trademark.
- Supported model adapters and provider web automation boundaries: confirm current rules and actual mechanics; no shortcuts.
- Whether background agent should keep running after window closure: explicit opt-in, tray indicator and kill control required.

When revising decisions, append new ADRs or mark earlier ones superseded; never silently delete rationale.

## ADR-009 · Initial implementation scope (2026-10-19)

The current alpha uses a deterministic Manager scheduler, Builder gateway and Reviewer evidence checker. Offline recipes are explicitly labeled not AI. Ollama may propose a plan; manual ChatGPT JSON handoff is supported. Full autonomous ChatGPT DOM extraction is not implemented. User's latest tagline supersedes the original brief: “Stop chatting. Start doing.”

## ADR-010 · Descriptor-relative file IO and bounded terminal

A small Python 3 gateway uses directory file descriptors, O_NOFOLLOW, regular-file/hardlink checks, expected-content comparison and atomic replacement. Node executes argv arrays, never a model shell string. Terminal scope is a fixed allowlist. Models do not get arbitrary code execution. Same-user concurrent hostile processes are outside the isolation guarantee.

## ADR-011 · Packaging dependency update

Kali npm 12 rejected electron-builder 26.0.12's transitive git dependency (EALLOWGIT). Upgrade to registry-published electron-builder 26.15.3 rather than weakening npm's git-package policy.

## ADR-012 · License and independent sessions

MIT selected for CHAI-owned source. Third-party screenshots remain excluded. Authenticated GitHub on the user's Mac is used to publish code; no credential is transferred to Kali. Reboot testing is deferred until the user can safely restart their active desktop.

## ADR-013 · Real local model roles and bounded repair

Supersedes the local-mode portion of ADR-009. Each role is a separate structured model request; Reviewer sees recorded outputs and fresh file contents, not Builder claims. A passed review is required before Manager reports completion. Requests/responses and phases persist in SQLite. Existing unread files force a read-only discovery plan; model writes receive an expected hash. Tool grants remain exclusively human-owned. Runtime/model installation is user-space, loopback-only and does not enable boot autostart. Small-model output quality is an explicit acceptance risk.
