CHAI — Chat Has Actions Inside. **Stop chatting. Start doing.**

This is a working **local task-engine alpha**, not the completed autonomous ChatGPT agent.

Includes the Electron/React Linux desktop app, SQLite history and recovery, three role timelines, exact-plan approvals, scoped real file actions, cancellable terminal allowlist, restore snapshots, local-model plan adapter and manual ChatGPT windows.

Verified on Kali 2026.2 x86_64: native desktop task execution, isolated ChatGPT origin with Node disabled, process cancellation and recovery tests, packaged executable and AppImage extraction-mode end-to-end tests. Browser click/capture and X11 desktop click/capture passed a controlled test with test-only native-dialog approvals. CI repeats automated tests and verifies the packaged executable before publishing these artifacts.

**Limitations:** ChatGPT messaging is manual; no session scraping, rotation or usage-limit bypass. Offline recipes are deterministic, not AI. Reviewer checks evidence, not open-ended semantic correctness. No installed local model was available for live inference testing. Manual sign-in and a full system reboot remain unverified. No arbitrary shell, autonomous visual navigation, unattended background service or automatic destructive tools.

**Install on Kali:** download the AppImage, verify it using `sha256sum -c SHA256SUMS`, make it executable and run it. If FUSE 2 is unavailable:

```sh
chmod +x CHAI-0.1.0-alpha.1.AppImage
APPIMAGE_EXTRACT_AND_RUN=1 ./CHAI-0.1.0-alpha.1.AppImage
```

The repository's `scripts/install-local.sh` adds a user-only application-menu entry without changing system packages or autostart. A Debian package is also included; installation requires normal package-manager privileges. Other Linux distributions, particularly those restricting Chromium user namespaces, need separate compatibility testing. Sandbox protections are not disabled.

Use a disposable workspace for this alpha. SQLite snapshots are private but not encrypted. Read README, SECURITY.md, docs/PRIVACY.md and handoff.md before using important data.
