# Browser-agent QA — 2026-10-19

Runtime: Kali 2026.2 amd64, X11, Electron 44.9.0, package 0.2.0-alpha.1.

- TypeScript and ESLint: pass.
- Automated tests: 30 pass, 0 fail. Includes real authenticated HTTP MCP; scripted model answers exist only in tests.
- Native Electron E2E: pass (approval, real file, reload, restart, sandbox, malformed IPC, four widths).
- SIGKILL recovery: pass (completed write retained, ambiguous command not replayed).
- AppImage extraction-mode E2E: pass.
- Upgrade installer: pass; prior executable and launchers retained, unknown launcher overwrite refused.
- npm audit: 0 vulnerabilities.
- AppImage and amd64 Debian packages: built. AppImage installed/launched; Debian metadata checked, system installation not performed.

## Live provider evidence
Normal ChatGPT browser, visible 6 High. Authenticated CHAI custom MCP plugin. Two tasks, each seven real role calls over two rounds:
1. Read-only discovery, reviewer requests missing write, approved new file, actual reread/hash, independent pass, manager report.
2. Existing-file read, normal installed-app restart at pending approval, retained pairing and role checkpoints, renewed approval, exact hash-guarded replacement, reread/hash, independent pass, manager report.

See the adjacent sanitized JSON records. They contain only CHAI-created disposable test content, not browser history, account data or credentials. The screenshot is the real packaged CHAI interface, not a mockup.

## Limits
The same temporary HTTPS tunnel stayed alive during app restart. No full-machine reboot is claimed. The current gateway supports scoped files and fixed commands; general agent-driven desktop/browser and arbitrary shell tasks are not implemented.
