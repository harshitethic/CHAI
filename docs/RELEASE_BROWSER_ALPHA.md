# CHAI 0.5.0 alpha 1 — confirmed Git review commits

Normal signed-in ChatGPT drives Manager, Builder and Reviewer. Select 6 High in the role conversations and enable CHAI Desktop. No local LLM or separate inference API is used.

## New in 0.5
- Inspect diffs for explicitly selected text files against the repository HEAD.
- Create a local review-branch commit after a separate native confirmation showing the exact patch, base commit, message and generated branch.
- Preserve the current branch, working files and user's staging index. Existing staged changes outside the selection stay out of the review commit.
- Execute Git offline inside Bubblewrap, with repository hooks, external diffs, clean filters and signing excluded from this commit path. Commits use CHAI <chai@localhost>.
- Reject changed HEAD/file snapshots, declined or canceled confirmation, existing branch collisions and ambiguous replay after interruption.

Scoped browser/X11 tools, screenshots, file search/directory creation and isolated Python/Node/Bash execution from 0.4 remain available. Workspace grants cover routine discovery and repair; they never authorize Git commits or enable browser/window access on their own.

## Verified
50 automated tests pass on Kali, including selected-file commit isolation, staging preservation, malicious repository helper exclusion, confirmation denial, conflicts, cancellation and interrupted commit recovery. Native Electron tests exercise the production confirmation path, decline and approval, actual branch content, app restart and local browser/test execution. Browser/X11, SIGKILL recovery and dependency audit pass. CI verifies the packaged executable before publication.

A real normal-ChatGPT task reached DONE after reading a broken function and its existing test, observing exit 1, fixing only the implementation, rerunning the unchanged test with exit 0, inspecting the selected diff and creating a native-confirmed review commit. Two rounds, seven role calls, one workspace grant and one native Git confirmation. Current HEAD and staging-index byte hash stayed identical; an unrelated staged edit was preserved. Two separate ChatGPT approval prompts were observed. Sanitized evidence: docs/qa/git-live-2026-10-19.json.

## Install
Download the AppImage and SHA256SUMS and verify its checksum. Requires Python 3, Bubblewrap and Git; sandbox Node execution requires /usr/bin/node. Selected-window control requires xdotool, x11-utils and an X11 session. The amd64 Debian package declares these dependencies.

```sh
chmod +x CHAI-0.5.0-alpha.1.AppImage
APPIMAGE_EXTRACT_AND_RUN=1 ./CHAI-0.5.0-alpha.1.AppImage
```

For a user-only upgrade: `sh scripts/install-local.sh /path/to/CHAI-0.5.0-alpha.1.AppImage 0.5.0-alpha.1 --upgrade`. Previous executable and launcher backups are retained.

## Connection and boundaries
Start the tool connection, add its HTTPS MCP endpoint in ChatGPT Plugins as CHAI Desktop, pair locally and enable it in the three role conversations. Kali uses a dedicated persistent HTTPS tunnel/user service. ChatGPT retains its own permission controls and service limits.

Selected files, patches, task goals, execution evidence and authorized browser/window screenshots are sent to ChatGPT. Read docs/PRIVACY.md before granting access. Browser sessions are isolated from the ChatGPT login. Browser scope uses exact origins; cross-origin resources require explicit authorization and local previews cannot contact remote servers.

Git scope is existing repositories with an initial commit and a real .git directory, up to 12 selected regular text files totaling 24 KB, and bounded diffs. Initial commits, deleted/binary files, linked worktrees, merges, signing, checkout and push are unsupported. New files use mode 100644; existing executable modes are retained. Git inspection does not apply staging-area changes to the review commit.

This remains a bounded alpha. Arbitrary whole-desktop control, package installation, network-enabled host shell execution and unrestricted file management are outside these tools. Desktop control requires X11. Whole-PC reboot is unverified; unfinished tasks pause after app restart and need Resume. Browser sessions and observation references are ephemeral. No provider-limit bypass or unattended app startup is implemented.
