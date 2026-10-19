# CHAI privacy

CHAI has no telemetry, analytics service or remote task backend. On Linux it stores task goals, plans, local event output and before-edit snapshots under Electron's user-data directory, normally `~/.config/chai-desktop`. The directory uses private permissions; SQLite is not encrypted. The ChatGPT partition is Chromium-managed browser storage, never exported by application code.

Only a task goal is sent to configured localhost Ollama. Interactive ChatGPT and browser content contact their respective websites under those services' policies. Screenshots are captured only following a user action and confirmation, then saved to a user-selected path. They are not automatically sent to any provider.

Export is opt-in and redacts common credential patterns, not every possible secret. Inspect exports before sharing. Delete selected task history in Settings to remove task records and snapshots; this is logical deletion, not forensic secure erasure of SQLite pages or backups. Clear CHAI ChatGPT session affects only CHAI's partition, not other browsers.
