# CHAI 0.8 runtime verification — 20 October 2026

This release adds opt-in host execution, app OAuth, Wayland portal input and durable commands. Normal signed-in ChatGPT conversations remain the reasoning provider. These new checks are integration fixtures, not additional claimed live ChatGPT runs.

| Check | Observed result |
| --- | --- |
| Core suite | 68 tests pass on Kali, including host grants and durable command reconnect, stdin, Stop, duplicate-launch prevention, owner SIGKILL survival and descriptor isolation. |
| OAuth TLS integration | Real HTTPS fixture verifies discovery, registration, PKCE S256, resource indicator, invalid callback state rejection, code exchange, expired-token refresh, credential redaction and local sign-out. No claim of testing every external provider. |
| Bearer MCP integration | Authenticated tools and native consent checks pass. |
| Native workbench | Real isolated test failure → patch → same test passes; interactive preview; file/diff/output panes; confirmed download; tray continuation; durable server survives app quit/relaunch; Stop All terminates it. |
| Native host UI | Declined native task grant blocks host access. Accepted fixture grant enables a real host shell command from the terminal UI and captures its output. |
| Electron regression | Crash recovery, browser tools, scoped consent, progress display, reload/restart, malformed IPC and four window widths pass. |
| Wayland | Private nested Mutter compositor with GNOME RemoteDesktop/ScreenCast portal and PipeWire. Approved the native source picker; captured a 1280×800 real GTK window, clicked its entry, typed text, used Ctrl+A, replaced text, invoked scroll, and clicked Save. The GTK app wrote the exact text `Keyboard verified`. Closing the helper removed its portal session. |

The Wayland fixture uses a private nested desktop and locally unpacked dependencies; it does not change the user's desktop session. It exercises the actual portal/PipeWire implementation, not a mock. It does not establish compatibility with every Wayland compositor or portal backend. The general Electron desktop integration remains tested on X11.

The native quit/reopen check exposed inherited Chromium descriptors in the detached Python helper. The helper now closes all inherited descriptors above stdin/stdout/stderr before opening its own files. A regression test verifies this boundary.

Durable commands survive application exit/crash, not an OS reboot. Only terminal effects with matching durable receipts can be reconciled automatically; uncertain external mutations remain paused. OAuth credentials use production OS-backed encryption; the isolated TLS fixture supplies a deterministic test codec. Provider sign-in, availability, approvals and service limits remain separate.

Packaged CI and downloaded-release verification are recorded separately after publication.

The installed-profile check found pre-existing expired access tokens alongside a valid refresh grant. Version 0.8.1 recognizes that pairing on restart; its regression test rejects expired access tokens and refresh tokens as bearer credentials, verifies the normal refresh exchange and verifies explicit revocation.
