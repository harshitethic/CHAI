# CHAI 0.6.0 alpha 1 — visible task progress

Follow the work in the native app: current action, next step, a persistent checklist and readable Manager/Builder/Reviewer activity. Normal signed-in ChatGPT remains the reasoning provider.

## New in 0.6
- Current-task panel shows planning, execution, review, report preparation, pause, provider wait and completion states.
- Action checklist distinguishes finished, active, waiting and unexecuted actions. Real failed checks remain visible beside successful reruns.
- Progress counts describe planned actions, not a guessed percentage of the whole goal. New repair rounds can add actions, and completed execution still needs review.
- Readable activity updates with expandable exact evidence and detailed role logs. Full request and verified report are expandable to keep the progress view useful.
- Selected-task event retrieval prevents other tasks' activity from displacing its history. A compact effect summary supplies actual exit/termination results without duplicating source/output payloads.
- UI round/call limits now reflect workspace versus review mode correctly.
- Rewritten README with real app screenshot, quickstart, tested workflows and explicit limits.

## Verification
54 automated tests pass, plus native Electron UI tests of real execution, task switching, active checklist, pause, reload, saved progress and ambiguous-resume errors. Native tests also retain sandbox/browser/Git confirmation coverage and four window widths. Crash recovery and dependency audit pass. CI tests the packaged executable before publication.

The README screenshot is the actual Kali app displaying the previously verified live ChatGPT Git task. It is not a new model run or a mock dashboard. UI testing caught and fixed duplicate React keys during task switching. See docs/QA_PROGRESS_2026-10-19.md.

## Install
Download the AppImage and SHA256SUMS from this release, verify the checksum and run:

```sh
chmod +x CHAI-0.6.0-alpha.1.AppImage
APPIMAGE_EXTRACT_AND_RUN=1 ./CHAI-0.6.0-alpha.1.AppImage
```

Requires Python 3, Bubblewrap and Git. Sandbox Node execution uses /usr/bin/node. Selected-window control requires xdotool, x11-utils and X11. The amd64 Debian package declares its system dependencies.

User-only upgrade from a checkout: `sh scripts/install-local.sh /path/to/CHAI-0.6.0-alpha.1.AppImage 0.6.0-alpha.1 --upgrade`. Previous versions and launcher backups are retained.

## Scope
CHAI supports bounded file edits, offline Python/Node/Bash execution, selected-file Git review commits, scoped browser actions and selected-window X11 input. Workspace grants never enable browser/window access or authorize Git commits by themselves. Commits still need native exact-patch confirmation; current HEAD and staging remain unchanged, with no push.

This improves progress visibility; it does not add unrestricted host shell execution, package installation, arbitrary desktop control or unattended startup. ChatGPT permission prompts and usage limits remain effective. Whole-PC reboot remains unverified. Unfinished tasks pause after app restart, and ambiguous side effects are not blindly repeated.

Selected files, goals, patches, execution evidence and authorized screenshots are shared with your signed-in ChatGPT conversations. Read docs/PRIVACY.md and README.md for the full boundaries.
