# CHAI 0.4.0 alpha 1 — scoped computer tools

Normal signed-in ChatGPT drives Manager, Builder and Reviewer. Select 6 High in the role conversations and enable CHAI Desktop. No local LLM or separate inference API is used.

## New in 0.4
- Separate task permissions for an isolated browser and a user-selected Linux X11 window. Workspace permission alone cannot activate either.
- Preview local HTML/CSS/JavaScript directly from the authorized project, or visit explicitly allowed HTTPS origins. Browser observations return visible text, control references and screenshots. Agents can click, type and press keys using observed targets.
- Desktop observations capture only the selected window. Input checks the window process, observation age, dimensions, coordinates and focus. Terminal, browser and credential-manager windows are excluded from this path.
- Nested directory creation and bounded literal file search join read/list/write and isolated Python/Node/Bash execution.
- Task screenshots reach only the matching active Manager/Builder/Reviewer job. Recent images are bounded and deleted with task history.
- Sensitive website actions and desktop submission retain local confirmation. Stale/replaced targets fail safely; interrupted input is not replayed.
- Persistent HTTPS origins are supported. The deployed Kali instance uses a dedicated Cloudflare tunnel and user service; tunnel credentials stay on that machine.

## Verified
41 automated tests pass. Browser tests exercise real preview, click/type behavior, credential/origin restrictions, stale references and consent denial. Real X11 tests exercise selected-window capture, click/type, coordinate bounds and process replacement. Native UI tests now exercise local browser previews as well as real sandbox execution. SIGKILL recovery and dependency audit pass. CI tests the packaged executable before publication.

## Install
Download the AppImage and SHA256SUMS and verify its checksum. Requires Python 3 and Bubblewrap; sandbox Node execution requires /usr/bin/node. Selected-window control requires xdotool, x11-utils and an X11 session. The amd64 Debian package declares these dependencies.

```sh
chmod +x CHAI-0.4.0-alpha.1.AppImage
APPIMAGE_EXTRACT_AND_RUN=1 ./CHAI-0.4.0-alpha.1.AppImage
```

For a user-only upgrade: `sh scripts/install-local.sh /path/to/CHAI-0.4.0-alpha.1.AppImage 0.4.0-alpha.1 --upgrade`. Previous executable and launcher backups are retained.

## Connection and boundaries
Start the tool connection, add its HTTPS MCP endpoint in ChatGPT Plugins as CHAI Desktop, pair locally and enable it in the three role conversations. ChatGPT retains its own permission controls and service limits.

Selected files, task goals, execution evidence and authorized browser/window screenshots are sent to ChatGPT. Read docs/PRIVACY.md before granting access. Browser sessions are isolated from the ChatGPT login. Browser scope uses exact origins; cross-origin resources require explicit authorization and local previews cannot contact remote servers.

This remains a bounded alpha. Arbitrary whole-desktop control, package installation, network-enabled host shell execution and unrestricted file management are outside these tools. Desktop control requires X11. Whole-PC reboot is unverified; unfinished tasks pause after app restart and need Resume. Browser sessions and observation references are ephemeral. No provider-limit bypass or unattended app startup is implemented.
