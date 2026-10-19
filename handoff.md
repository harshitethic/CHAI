# CHAI handoff — 2026-10-19

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


## Verified state
- Repository: https://github.com/harshitethic/CHAI (public).
- Release code commit: 1614a2e1e6e77ef2fe11c69fc2b276f2f015b418; tag v0.1.0-alpha.1. Initial implementation 618cae0; QA/packaging 4e14aac; single-instance lock 2c512c9.
- Kali source: `/home/kali/Projects/CHAI`.
- Mac publishing checkout: `/Users/harshitethic/Projects/CHAI`. Mac gh is authenticated; Kali gh is not. No credentials transferred.
- Installed Kali launcher: `/home/kali/.local/bin/chai`; desktop application-menu entry `~/.local/share/applications/chai.desktop`. AppImage stored under `~/.local/opt/chai-0.1.0-alpha.1`. Autostart is disabled.
- Packages built under Kali `release/`: CHAI-0.1.0-alpha.1.AppImage and chai-desktop_0.1.0-alpha.1_amd64.deb.
- 12 core tests, lint/typecheck/build, native Electron E2E, packaged E2E, AppImage extraction-mode E2E, actual X11 file/provider smoke, controlled host-tools test and real SIGKILL recovery passed. Full evidence: docs/QA_2026-10-19.md.
- npm audit: zero vulnerabilities, including dev dependencies.
- GitHub CI passed: https://github.com/harshitethic/CHAI/actions/runs/39210807712 . Release workflow passed all stages including packaged verification: https://github.com/harshitethic/CHAI/actions/runs/39210808952 . Published alpha: https://github.com/harshitethic/CHAI/releases/tag/v0.1.0-alpha.1 . AppImage, Debian package and SHA256SUMS independently listed. Private vulnerability reporting enabled.

## Product reality
Working local task-engine alpha. Manager is a persistent scheduler, Builder a guarded executor, Reviewer a deterministic evidence checker. Offline recipes explicitly say not AI. Ollama can propose bounded plans if a local model is installed. ChatGPT views are manual, isolated and do not extract credentials/output. No autonomous ChatGPT browser agent or rate-limit bypass is implemented.

## Human-only remaining gates
1. Manual sign-in completed and visually verified after reopening the manager view (2026-10-19).
2. Choose/authorize a locally installed model or an appropriate model download for live inference; neither Ollama nor LM Studio was available at the inspected localhost endpoints.
3. User-safe whole-system reboot, then open CHAI and confirm retained history. Do not reboot the active desktop without arranging this.

## Next action
CHAI and its signed-in manager view are open on the right Kali monitor. Manual sign-in is verified; closing and reopening the provider view resolved an initially incomplete page. Separately arrange a safe full reboot and choose/authorize a local model for live inference. Then implement remaining full-product backlog; do not claim the deterministic alpha is a complete autonomous agent. No unrelated repository was modified.

## Published checksums

- AppImage: `743ec0dcf7fb6a1b5431677b3fa02660b04d3244681b072afba27980767222a3`
- Debian: `d3432abdeaae0b60801d9289ed9198c6c2a7f8f161da5e4ad94e07c6c0cc1b63`
- Installed single-instance test passed: a second launch exits while the original coordinator remains alive.

Published-asset verification: downloaded the actual GitHub release AppImage back to Kali, verified its SHA256 against published SHA256SUMS, and ran the full native E2E successfully. Replaced the installed user AppImage with this verified published artifact. The existing visible app is the equivalent locally built runtime; the next launch uses the published binary.

## Model-backed coordination checkpoint — 2026-10-19

Implemented separate Manager assignment, Builder proposal, Reviewer assessment and Manager report calls using local Ollama. SQLite persists role responses and phases; bounded to 3 rounds/15 calls/36 actions. Repair plans require fresh human approval. Added existing-file discovery enforcement and expected-hash conflict checks. Typecheck, lint, build and 22 unit/integration tests pass on Kali. Actual qwen2.5-coder:3b completed a new-file task with all four calls; the harder existing-file UI test exposed poor proposals, correctly rejected by review/policy. That harder live gate remains in progress. No ChatGPT automation is enabled.
