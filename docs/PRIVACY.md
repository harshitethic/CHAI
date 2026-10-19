# CHAI privacy

CHAI has no telemetry, analytics service or remote task backend. On Linux it stores task goals, plans, local event output and before-edit snapshots under Electron's user-data directory, normally `~/.config/chai-desktop`. The directory uses private permissions; SQLite is not encrypted. The ChatGPT partition is Chromium-managed browser storage, never exported by application code.

In local AI mode the task goal, role assignments, approved tool outputs and file evidence are sent to Ollama at 127.0.0.1:11434. They are not sent to a cloud model. Role request/response records and checkpoints are retained in the private local SQLite database; common credential patterns are redacted from outbound context, but this is not comprehensive secret detection. Interactive ChatGPT and browser content contact their respective websites under those services' policies. Screenshots are captured only following a user action and confirmation, then saved to a user-selected path. They are not automatically sent to any provider.

Export is opt-in and redacts common credential patterns, not every possible secret. Inspect exports before sharing. Delete selected task history in Settings to remove task records and snapshots; this is logical deletion, not forensic secure erasure of SQLite pages or backups. Clear CHAI ChatGPT session affects only CHAI's partition, not other browsers.
