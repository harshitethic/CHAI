# CHAI 0.2.0 alpha 1 — normal ChatGPT browser agents

CHAI now runs Manager, Builder and Reviewer through normal signed-in ChatGPT conversations, with 6 High selected in the browser. A CHAI MCP plugin carries persistent job instructions and structured results. No local LLM or model-inference API is used.

Verified live on Kali: all three roles performed a disposable file task across two rounds and seven real role calls. Discovery alone was rejected as incomplete; after approval, CHAI wrote the file, reread it, obtained an independent review and a manager report. See docs/qa/browser-live-2026-10-19.json and the real application screenshot.

Includes durable SQLite task/job state, pairing consent and PKCE, role/schema validation, approval-gated file operations and fixed commands, stop/cancel, evidence hashes, conflict-aware undo, browser-session persistence, and separate manual browser/X11 controls.

Verification includes automated authorization/MCP/file/recovery tests, native Electron UI, hard-kill recovery, and AppImage extraction-mode E2E on Kali. The Debian package is built for amd64; AppImage is the installed and launch-tested artifact.

## Install
Download the AppImage and SHA256SUMS, verify the checksum, then run:

```sh
chmod +x CHAI-0.2.0-alpha.1.AppImage
APPIMAGE_EXTRACT_AND_RUN=1 ./CHAI-0.2.0-alpha.1.AppImage
```

The repository's scripts/install-local.sh can install it for the current user. Pass version 0.2.0-alpha.1 and --upgrade to replace a recognized older CHAI launcher while retaining its executable and launcher backup.

## First connection
Start the CHAI tool connection. In ChatGPT Plugins, add its HTTPS MCP URL, select OAuth and connect CHAI. Approve the local pairing prompt. Select 6 High in each role conversation. Choose a dedicated workspace and review each proposed action before execution.

Tool pairing authorizes access to CHAI only. It does not request ChatGPT credentials or authorize a separate inference endpoint. ChatGPT may show its own tool-use permission prompt.

## Known limits
This is a functional browser-agent alpha, not the entire original project backlog. General autonomous desktop/browser workflows and arbitrary shell commands remain outside the current gateway. File actions and fixed terminal commands are real, scoped and approved.

A quick tunnel requires cloudflared and changes URL when recreated. A stable HTTPS forwarding origin is needed for uninterrupted pairing across a full machine reboot; app restart with the same origin retains pairing. No whole-PC reboot has been verified. No unattended startup or provider-limit bypass is implemented.
