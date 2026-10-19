# CHAI blockers — 2026-10-19

The normal-ChatGPT 6 High core is verified live, including an installed-app restart and existing-file edit. It is no longer blocked on model connectivity.

## Remaining acceptance gates
- Whole-PC reboot is unverified. It interrupts other applications and requires a safe restart window after unsaved work is handled.
- A quick tunnel gets a new hostname when recreated. Persistent pairing after whole-PC reboot needs a stable HTTPS origin forwarded to loopback 40671, or manual reconnection of the new temporary URL. The developer test retained one tunnel across app restarts only.
- General agent-driven desktop/browser workflows, network-enabled host shell tasks and broader file management are still unimplemented. These are product backlog, not a claim that the current bounded tools are complete.

The 0.2 release is published and independently downloaded/verified. The 0.3 AppImage is installed and tested, with autonomous workspace grants and isolated Python/Node/Bash execution. The 0.3 release publication is gated by CI. No ChatGPT credentials or alternative model provider are needed.
