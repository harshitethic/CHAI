# CHAI 0.3.0 alpha 1 — autonomous workspace coding

Normal signed-in ChatGPT drives Manager, Builder and Reviewer. Select 6 High in the role conversations. No local LLM or separate inference API is used.

## New in 0.3
- Start with **Autonomous in this workspace** to authorize routine reads, edits and isolated tests for the task. Discovery and repair rounds continue without repeated plan approvals. Review-each-plan mode remains available.
- Revoke access cancels active work and removes the grant. Stop and Pause remain available. Restart pauses unfinished tasks; Resume retains the original workspace scope.
- Execute Python, Node and Bash in Bubblewrap using explicitly selected, hash-checked input snapshots. The workspace is read-only inside the sandbox; temporary output stays in /tmp. No host home, credentials, browser session or network is mounted.
- Failed checks become review evidence. A failure cannot be reported as successful execution; repairs can rerun the same check. Autonomous tasks allow up to 12 rounds, 60 role calls and 144 actions.

## Verified
A real signed-in ChatGPT task inspected a broken Python function, created four tests, observed three failures, fixed the function and reran the unchanged tests successfully. Manager, Builder and Reviewer completed seven role calls across two rounds with one workspace grant and **zero manual plan approvals**. Sanitized evidence: docs/qa/autonomous-live-2026-10-19.json.

38 automated tests pass, including a separate review-driven failed-test/repair cycle, isolation, input conflicts, cancellation and revocation. Native UI and AppImage tests exercise the visible workspace permission control and real sandbox execution. SIGKILL recovery and dependency audit pass. CI verifies the packaged executable before publication.

## Install
Download the AppImage and SHA256SUMS and verify its checksum. AppImage requires Python 3 and Bubblewrap; Node execution requires /usr/bin/node. These dependencies are declared by the amd64 Debian package.

```sh
chmod +x CHAI-0.3.0-alpha.1.AppImage
APPIMAGE_EXTRACT_AND_RUN=1 ./CHAI-0.3.0-alpha.1.AppImage
```

For a user-only upgrade: `sh scripts/install-local.sh /path/to/CHAI-0.3.0-alpha.1.AppImage 0.3.0-alpha.1 --upgrade`. Previous executable and launcher backups are retained.

## Connection and boundaries
Start the tool connection, add its HTTPS MCP endpoint in ChatGPT Plugins, pair locally and enable CHAI in the three role conversations. ChatGPT can still show its own permission prompts; CHAI does not bypass them. Selected file contents, task goals and execution evidence are sent to ChatGPT through this connection. See docs/PRIVACY.md.

This remains an alpha. General autonomous desktop/browser workflows, package installation, host shell execution and broad file management are unfinished. A quick tunnel changes URL when recreated; stable pairing across a whole-machine reboot needs a persistent HTTPS origin. Whole-PC reboot is unverified. No provider-limit bypass or unattended startup is implemented.
