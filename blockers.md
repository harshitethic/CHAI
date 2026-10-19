# CHAI remaining acceptance gates — 2026-10-19

Normal signed-in ChatGPT with 6 High is verified live. The 0.4 release is published and installed, adding scoped browser/X11 actions, screenshots, directory creation and search. Forty-two automated tests and live ChatGPT browser interaction verification pass. The exact published AppImage passed native tests and a fresh authenticated ChatGPT connection check after upgrade.

- Whole-PC reboot remains unverified. It interrupts other applications and needs a safe restart window after unsaved work is handled.
- Stable transport is configured on Kali: a dedicated named Cloudflare tunnel maps chai-tools.harshitethic.com to loopback 40671, with an enabled user service. ChatGPT uses the CHAI Desktop plugin. No tunnel credentials are committed.
- Full original product parity is not claimed. Network-enabled host shell tasks, package installation, unrestricted file management, arbitrary whole-desktop automation and unattended startup remain outside the bounded implementation.
- Browser sessions and target references are ephemeral. On restart, unfinished tasks pause; uncertain input effects are never automatically replayed. X11 is required for selected-window control.

No ChatGPT credentials or alternative inference provider are needed. Provider permission prompts and usage limits remain effective.
