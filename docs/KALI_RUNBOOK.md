# Kali Linux Implementation and Testing Runbook

## Scope and protection

Use the user's **authorized remote Kali** through the available Remote Desktop Commander/terminal integration. This prompt file does not itself create or verify a live connection. Never assume a command has run based on an agent narrative. Avoid changing unrelated services, dual-boot config, GRUB, firewall, display settings, other repos, or server infrastructure. **Do not touch ClonePeek, KyaLoge, their processes, secrets, or folders.** Preserve the user's active desktop session, work and browser tabs.

## First commands (no privileges)

```bash
printf '%s\n' '---SYSTEM---'; uname -a; cat /etc/os-release
printf '%s\n' '---SESSION---'; printf 'XDG_SESSION_TYPE=%s DISPLAY=%s WAYLAND_DISPLAY=%s\n' "$XDG_SESSION_TYPE" "$DISPLAY" "$WAYLAND_DISPLAY"
printf '%s\n' '---TOOLS---'; for tool in node npm pnpm git gh chromium chromium-browser; do command -v "$tool" || true; done
printf '%s\n' '---AUTH---'; gh auth status || true
printf '%s\n' '---DISK---'; df -h "$HOME"
printf '%s\n' '---DISPLAYS---'; command -v xrandr >/dev/null && xrandr --query || true
```

Inspect running process/desktop only as needed. Confirm which tools are actually available and whether this is a graphic session (not a headless shell). Avoid requesting sudo until a specific install requires it; first attempt user-space Node tooling/AppImage.

## Workspace selection

Choose a project directory such as `~/Projects/CHAI` **only after checking** no unrelated existing directory/worktree is there. Confirm with `pwd`, `git status` and `ls -la`. Do not overwrite uncommitted work. Use `mktemp -d` for dangerous test scenarios; clean only that test directory after verifying path identity and no user files.

## GitHub auth and remote

Check `gh auth status`. If authorized and authenticated, inspect `gh repo view harshitethic/CHAI` before creating. If absent, create with actual code once base source is ready. No account credentials into terminal output, prompts, README or screenshots. If GitHub permissions aren't available, keep work committed locally and document smallest needed user action.

## Build workflow

```bash
# illustrative only — exact commands come from created package.json
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Do not report success if scripts don't exist, processes return nonzero or output is suppressed. Review `npm audit` and prefer locked dependencies. Do not install globally unnecessarily. If `electron-sandbox` constraints cause issues, fix packaging/config rather than using unsafe `--no-sandbox` for production.

## Testing graphic UI

Launch CHAI on primary display without minimizing/closing user's other windows. Verify title bar, resizes, scroll, focus, browser view, tool status, permissions, 3-role command center. Capture screenshots using authorized desktop tool or test runner; keep private screenshots outside public repo unless they contain only CHAI and no personal data.

### Resolution matrix

- Main standard display: 1920×1080.
- Ultrawide reference: 3440×1440 if actually available.
- 27-inch high DPI: 3840×2160 with common scaling if actual available.

Do **not** change the user's permanent multi-monitor layout just for CHAI screenshots. If only one test resolution is available, record that limitation.

## Session-type caveat

On Wayland, arbitrary desktop automation and screen capture may be restricted and require compositor portals / user prompts. On X11 tools may have broader access but should still be constrained and consent-based. Recognize remote desktop headless limitations. Never install keyloggers or turn on broad surveillance.

## Packaged install

Prefer testing AppImage first without root. A `.deb` installation may require user-authorized elevation; request approval once with exact operation. Capture app launch output and log location. After package testing, do not change system autostart; opt-in only.

## Resume / handoff

At end of any tool call session, write in `handoff.md`: local CHAI path, Git branch, commit, test results, screenshot paths, build file, current provider mode, pending blockers and one next command. If reconnection breaks, continue non-Kali safe tasks with clear status, not a fictional remote execution claim.
