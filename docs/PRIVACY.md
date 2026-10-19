# CHAI privacy

CHAI has no telemetry, analytics service or remote task backend. On Linux it stores task goals, plans, local event output and before-edit snapshots under Electron's user-data directory, normally `~/.config/chai-desktop`. The directory uses private permissions; SQLite is not encrypted. The ChatGPT partition is Chromium-managed browser storage, never exported by application code.

When using browser agents, task goals, role assignments, selected workspace file contents and captured execution evidence are made available to your signed-in ChatGPT conversations through the authenticated CHAI MCP connection. This information leaves your computer and is processed under ChatGPT's policies. Choose a workspace you are comfortable sharing with that service. CHAI does not use a local model or a separate model-inference API.

Role request/result records and checkpoints remain in the private local SQLite database. Common credential patterns are redacted from outbound context, but this is not comprehensive secret detection. Protected credential paths are denied by the file gateway. Interactive ChatGPT and browser content contact their respective websites. The HTTPS tunnel relays authenticated tool traffic to the local CHAI service.

Workspace authorization covers reads, edits and isolated test execution for the selected task and folder, including later repair rounds. It remains recorded across app restarts; unfinished tasks pause until Resume. Revoke access removes that grant and stops the task. Review mode asks for each plan. Sandbox processes receive only explicitly selected file snapshots and a clean environment, with no host network or browser-session access. Their outputs may become evidence sent to ChatGPT.

Screenshots are captured only following a user action and confirmation, then saved to a user-selected path. They are not automatically sent to any provider.

Export is opt-in and redacts common credential patterns, not every possible secret. Inspect exports before sharing. Delete selected task history in Settings to remove task records and snapshots; this is logical deletion, not forensic secure erasure of SQLite pages or backups. Clear CHAI ChatGPT session affects only CHAI's partition, not other browsers.
