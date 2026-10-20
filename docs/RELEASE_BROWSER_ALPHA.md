# CHAI 0.9.0-alpha.1 — Conversations and clearer project setup

- Chronological user/assistant conversation with readable text, bold/code formatting, visible final results and expandable execution receipts.
- Informational questions can be answered and independently reviewed without fabricated tool actions or workspace grants.
- Explicit new-project versus existing-folder selection; new tasks cannot silently inherit an old selected folder. Enabled commands/network/browser are visible before submission.
- ChatGPT waiting status and direct conversation controls for stalled work.
- Agent instructions favor short natural updates, continuing implementation and browser verification, and checking the full user outcome rather than accepting a reduced assignment.
- Existing tasks, permissions, effects and reports remain intact. No provider credentials or private APIs are accessed.

This does not reproduce proprietary Codex/Work infrastructure, stream model tokens, or establish equivalent task quality. The game investigation found a provider interruption after passing core tests, disabled project/browser capabilities, and a working 2D prototype that did not satisfy a realistic-game request. Browser interaction checks were performed separately; that is not a completed live CHAI task.

---

# CHAI 0.8.1-alpha.1 — Preserve refreshable ChatGPT pairing

Fix restart status when the ChatGPT tool connection's short-lived access token has expired but its refresh grant is still valid. CHAI can dispatch the next job and let ChatGPT perform the normal refresh flow. Expired access tokens and refresh tokens remain invalid for tool access; explicit disconnect still revokes the grant.

Includes all 0.8 runtime and UI improvements below. The installed-profile check identified this issue in pairing records that predated the upgrade.

---

# CHAI 0.8.0-alpha.1 — Host commands, OAuth and durable work

- Optional host terminal execution with a native task grant, real output, stdin, Stop and Revoke.
- HTTPS MCP OAuth discovery, PKCE sign-in, dynamic or pre-registered public clients, encrypted credentials, refresh and local sign-out. Bearer authentication remains supported.
- Wayland RemoteDesktop/ScreenCast portal capture and input through a user-selected source; X11 support remains available.
- Opt-in terminal supervisors survive application exit/crash and reconnect to the same command. Saved effect identities prevent duplicate launches. Computer reboot ends processes.
- Standard or extended workspace budgets, shown in the progress UI. Completed provider replies can resume background work; uncertain external mutations still pause.
- Updated task controls, terminal environment selector, connection status and setup documentation.

Normal signed-in ChatGPT conversations remain the reasoning provider. Native sharing/authorization prompts and provider restrictions still apply. This does not claim every proprietary Codex/Work feature.

Earlier release notes follow for historical context.

---

# CHAI 0.7.1-alpha.1 — Clear capability boundaries

- Keep command execution isolated, with no unrestricted PC shell.
- Explain HTTPS/bearer app connections and distinguish them from ChatGPT’s OAuth pairing. Authentication failures now give actionable guidance.
- Reject Wayland and XWayland desktop input consistently, including the manual click tool; disable unsupported controls with an explanation.
- Show background budgets, tray/quit behavior and pauses for uncertain actions or provider restrictions.
- Correct outdated Settings descriptions of project execution and confirmed GitHub publication.

This is a boundary and clarity update. It does not add host shell access, an OAuth app client, Wayland automation or unlimited unattended operation. Existing 0.7 feature and live-run evidence is retained below.

---

# CHAI 0.7.0-alpha.1

Nine capability areas now have working implementations: isolated project commands and dependency installs; persistent terminal sessions; local-server browser verification; same-task follow-ups; paginated repository context and patches; project branches/commits and GitHub adapter; tray/startup/recovery controls; document outputs and authenticated MCP app connections; expanded browser/X11 interaction.

The Work screen adds Terminal, Files, Changes, interactive Preview and Outputs tabs, follow-up messages and attachments, connection retry states, current/next action and truthful failed/passing check results.

Normal signed-in ChatGPT 6 High remains the provider. No model API, local model, cookie scraping or service-limit bypass was introduced.

Project execution and network access are separate task opt-ins. Commits, GitHub publication and external app actions retain native confirmation. See README and privacy/security documentation for limits, including GitHub account setup, bearer-only MCP authentication, X11-only desktop control and deferred whole-PC reboot verification.

Verification evidence is documented in docs/QA_WORKSPACE_2026-10-19.md. Native/scripted tests are not presented as live ChatGPT results.
