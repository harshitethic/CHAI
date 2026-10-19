# DECISIONS — Architecture Decision Log

## Current implementation — 2026-10-19

The required provider is the normal signed-in ChatGPT website with 6 High selected in each role conversation. Local inference and the abandoned OAuth/Responses inference adapter have been removed. Never substitute either for this requirement.

CHAI now supplies an authenticated MCP tool server. ChatGPT receives a persistent role job through its visible composer, fetches the job with chai_get_job, and returns schema-validated JSON with chai_submit_result. Outputs are not scraped from the page. The MCP OAuth pairing grants access to CHAI's PC tools only; it does not authorize model inference or extract ChatGPT credentials.

Kali validation: typecheck, lint, build, 26 tests, native Electron E2E and SIGKILL recovery passed. Four new tests exercise real HTTP MCP, PKCE/consent/token controls, rejected/canceled jobs, and an approval-gated real file cycle. Scripted test answers are fixtures, not live-model evidence.

Live evidence: the CHAI plugin was created in the user's normal ChatGPT account; its actual tool pairing and authenticated MCP discovery succeeded. 6 High was observed in the browser. A live three-role file task is now under test; completion is not yet established. The public installer is still the older v0.1.0-alpha.1.

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

## ADR-013 · Real local model roles and bounded repair (provider superseded)

Supersedes the local-mode portion of ADR-009. Each role is a separate structured model request; Reviewer sees recorded outputs and fresh file contents, not Builder claims. A passed review is required before Manager reports completion. Requests/responses and phases persist in SQLite. Existing unread files force a read-only discovery plan; model writes receive an expected hash. Tool grants remain exclusively human-owned. Runtime/model installation is user-space, loopback-only and does not enable boot autostart. Small-model output quality is an explicit acceptance risk.

## ADR-014 · Normal ChatGPT browser is the only model provider
User corrections reject local models and the OAuth/Responses inference detour. Both were removed from active source; historical decisions remain above for traceability. Retain the durable coordinator and guarded executor.

## ADR-015 · MCP job/result bridge
Use official ChatGPT custom MCP plugins for model outputs. Send job-only instructions through visible browser controls; get context and submit structured role output through authenticated tools. No cookies, private ChatGPT endpoints, or assistant-text extraction. CHAI-owned OAuth protects the PC tools, not model usage. Role results cannot approve actions. Scope is still bounded file operations and fixed commands.

## ADR-016 · Development HTTPS transport
A CHAI-owned cloudflared quick tunnel can expose only the authenticated loopback tool server. It does not affect unrelated tunnels. Its hostname changes when recreated, so a persistent HTTPS forwarding origin is required for unattended reboot continuity. Development testing retains the same tunnel while restarting the app; that is not evidence of whole-PC reboot support.
