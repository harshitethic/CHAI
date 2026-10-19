# CHAI remaining acceptance gates — 2026-10-19

0.6 progress UI and README improvements pass source/native checks. Publication and downloaded-artifact installation are pending at this source commit.

Normal signed-in ChatGPT with 6 High is verified live. The 0.5 source adds selected-file Git inspection and locally confirmed review commits; all 50 tests and a real ChatGPT fix/test/diff/commit task pass. The 0.5 release is published and its exact downloaded AppImage passed native E2E, was installed on Kali, and retained the completed task and authenticated tool pairing.


- Whole-PC reboot remains unverified. It interrupts other applications and needs a safe restart window after unsaved work is handled.
- Stable transport is configured on Kali: a dedicated named Cloudflare tunnel maps chai-tools.harshitethic.com to loopback 40671, with an enabled user service. ChatGPT uses the CHAI Desktop plugin. No tunnel credentials are committed.
- Full original product parity is not claimed. Network-enabled host shell tasks, package installation, unrestricted file management, arbitrary whole-desktop automation and unattended startup remain outside the bounded implementation.
- Browser sessions and target references are ephemeral. On restart, unfinished tasks pause; uncertain input effects are never automatically replayed. X11 is required for selected-window control.

No ChatGPT credentials or alternative inference provider are needed. Provider permission prompts and usage limits remain effective.
