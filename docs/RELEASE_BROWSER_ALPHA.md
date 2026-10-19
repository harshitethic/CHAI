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
