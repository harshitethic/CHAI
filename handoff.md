# CHAI handoff — 2026-10-19

## Verified state
- Repository: https://github.com/harshitethic/CHAI (public).
- Initial implementation commit: 618cae0. CI diagnosis follow-up: ced3921. Current packaging/QA follow-up is being committed; use git log for authoritative latest SHA.
- Kali source: `/home/kali/Projects/CHAI`.
- Mac publishing checkout: `/Users/harshitethic/Projects/CHAI`. Mac gh is authenticated; Kali gh is not. No credentials transferred.
- Installed Kali launcher: `/home/kali/.local/bin/chai`; desktop application-menu entry `~/.local/share/applications/chai.desktop`. AppImage stored under `~/.local/opt/chai-0.1.0-alpha.1`. Autostart is disabled.
- Packages built under Kali `release/`: CHAI-0.1.0-alpha.1.AppImage and chai-desktop_0.1.0-alpha.1_amd64.deb.
- 12 core tests, lint/typecheck/build, native Electron E2E, packaged E2E, AppImage extraction-mode E2E, actual X11 file/provider smoke, controlled host-tools test and real SIGKILL recovery passed. Full evidence: docs/QA_2026-10-19.md.
- npm audit: zero vulnerabilities, including dev dependencies.
- GitHub CI initial failure was Chromium sandbox helper ownership on Ubuntu; runner-specific fix added. Final CI/release status must be verified before claiming success.

## Product reality
Working local task-engine alpha. Manager is a persistent scheduler, Builder a guarded executor, Reviewer a deterministic evidence checker. Offline recipes explicitly say not AI. Ollama can propose bounded plans if a local model is installed. ChatGPT views are manual, isolated and do not extract credentials/output. No autonomous ChatGPT browser agent or rate-limit bypass is implemented.

## Human-only remaining gates
1. Manual sign-in on the official ChatGPT page inside Connections.
2. Choose/authorize a locally installed model or an appropriate model download for live inference; neither Ollama nor LM Studio was available at the inspected localhost endpoints.
3. User-safe whole-system reboot, then open CHAI and confirm retained history. Do not reboot the active desktop without arranging this.

## Next action
Verify the next CI run after sandbox provisioning, dispatch Release alpha, verify successful published assets/checksums, and record its URL. Then open the installed CHAI on the user's desktop for manual sign-in. Do not redo implementation or touch unrelated repositories.
