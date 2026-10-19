# CHAI remaining environmental gates — 2026-10-19

The nine requested capability areas and workbench UI are implemented in 0.7. See [verification](docs/QA_WORKSPACE_2026-10-19.md) for exact results and current release status. These are scoped alpha features, not complete first-party Codex/Work parity.

- Kali GitHub CLI is not signed in. Local Git works; in-app PR/CI account verification needs `gh auth login` on Kali. The publishing Mac already has separate authorization; its credentials are never copied.
- External MCP connections support HTTPS Streamable HTTP with optional bearer credentials encrypted by the OS keyring. OAuth-only services need compatible gateways or additional OAuth client implementation.
- Selected desktop control uses X11; AT-SPI content depends on the target application's accessibility support. Wayland and arbitrary whole-desktop control remain outside scope.
- Whole-PC reboot remains unverified and must wait until unrelated unsaved work is handled. Tray continuation, application restart and crash recovery have separate tests.
- Project execution is isolated and task-scoped. It is not unrestricted host administration. Network grants include access to local services; six processes and per-command time/output limits do not constitute global CPU/memory/disk quotas.
- ChatGPT sign-in, model availability, native permission prompts and service limits remain effective. The persistent named tunnel uses an enabled user service; credentials are private.
