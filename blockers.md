# CHAI blockers

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


- **ChatGPT automated web transport:** not implemented. Current published provider terms prohibit automatic/programmatic output extraction. Manual official-site interaction and user-pasted plans remain available.
- **Local model quality gate:** Ollama and qwen2.5-coder:3b are now installed in CHAI-owned user directories. A real new-file task passes. Existing-file model edits are being hardened and retested before the next release; a stronger 7B model is downloading.
- **Manual sign-in resolved (2026-10-19):** user completed sign-in; the authenticated ChatGPT home was visually verified after closing and reopening the manager view. No credentials requested or extracted.
- **Whole-system reboot:** not performed while the user's desktop is active. App restart and crash tests are separate evidence; a real reboot needs a safe user restart window.

Local-engine alpha is implemented, installed and published. CI and release are green. The items above remain genuine external acceptance gates; no claim of full mission completion is made.
