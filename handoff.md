# CHAI handoff — 2026-10-19

## Current implementation — 2026-10-19

The required provider is the normal signed-in ChatGPT website with 6 High selected in each role conversation. Local inference and the abandoned OAuth/Responses inference adapter have been removed. Never substitute either for this requirement.

CHAI now supplies an authenticated MCP tool server. ChatGPT receives a persistent role job through its visible composer, fetches the job with chai_get_job, and returns schema-validated JSON with chai_submit_result. Outputs are not scraped from the page. The MCP OAuth pairing grants access to CHAI's PC tools only; it does not authorize model inference or extract ChatGPT credentials.

Kali validation: typecheck, lint, build, 26 tests, native Electron E2E and SIGKILL recovery passed. Four new tests exercise real HTTP MCP, PKCE/consent/token controls, rejected/canceled jobs, and an approval-gated real file cycle. Scripted test answers are fixtures, not live-model evidence.

Live evidence: the CHAI plugin was created in the user's normal ChatGPT account; its actual tool pairing and authenticated MCP discovery succeeded. 6 High was observed in the browser. A live three-role file task is now under test; completion is not yet established. The public installer is still the older v0.1.0-alpha.1.

## Locations
- Public source: https://github.com/harshitethic/CHAI
- Implementation: /home/kali/Projects/CHAI on Kali.
- Publishing checkout: /Users/harshitethic/Projects/CHAI on the user's Mac; use its existing gh authentication, never copy credentials.
- Private runtime data: /home/kali/.config/chai-desktop. Browser partition persist:chai-chatgpt. Do not inspect cookies or credential stores.
- Installed launcher still points to v0.1.0-alpha.1. Do not call that the browser-bridge release.

## Active verification
CHAI is on the right monitor. The private .qa/control-browser-bridge.mjs harness operates the real app and inspects visible browser controls only. A disposable task writes chai-browser-proof.txt under .qa/live-browser-workspace. Job inputs contain only ID/role; context and results travel over authenticated MCP.
The development quick tunnel is kept alive independently while the app restarts, with the same URL passed as stableOrigin. Its process and URL are private operational details in .qa; do not commit browser screenshots or session data.

## Next actions
1. Finish the live file task through all four role phases and check the actual file/evidence.
2. Verify interruption/resume of pending browser jobs without duplicate file effects.
3. Fix discovered browser/transport bugs, update meaningful tests and rerun required gates.
4. Build, install and smoke-test a new version before publishing it.
5. Resolve persistent HTTPS transport and arrange a safe whole-PC reboot test.
6. Continue the original backlog for broader terminal/desktop/browser capabilities.

Do not claim full completion from fixtures or a plugin connection alone. The source follows the normal ChatGPT browser requirement; earlier local/OAuth-inference attempts are abandoned and retained only in git history.
