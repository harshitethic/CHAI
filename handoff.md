# CHAI handoff — 2026-10-19

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
1. Manual sign-in on the official ChatGPT page inside Connections.
2. Choose/authorize a locally installed model or an appropriate model download for live inference; neither Ollama nor LM Studio was available at the inspected localhost endpoints.
3. User-safe whole-system reboot, then open CHAI and confirm retained history. Do not reboot the active desktop without arranging this.

## Next action
CHAI is open on the center Kali monitor. Have the user sign in using Connections → Open manager. Separately arrange a safe full reboot and choose/authorize a local model for live inference. Then implement remaining full-product backlog; do not claim the deterministic alpha is a complete autonomous agent. No unrelated repository was modified.

## Published checksums

- AppImage: `743ec0dcf7fb6a1b5431677b3fa02660b04d3244681b072afba27980767222a3`
- Debian: `d3432abdeaae0b60801d9289ed9198c6c2a7f8f161da5e4ad94e07c6c0cc1b63`
- Installed single-instance test passed: a second launch exits while the original coordinator remains alive.

Published-asset verification: downloaded the actual GitHub release AppImage back to Kali, verified its SHA256 against published SHA256SUMS, and ran the full native E2E successfully. Replaced the installed user AppImage with this verified published artifact. The existing visible app is the equivalent locally built runtime; the next launch uses the published binary.
