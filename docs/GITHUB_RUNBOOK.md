# GitHub Repository and Release Runbook

**Target owner:** `harshitethic`  
**Target repo:** `CHAI`  
**Desired public URL:** `https://github.com/harshitethic/CHAI`  
**Status in this brief:** not verified or created.

## Inspect, don't overwrite

```bash
gh auth status
gh repo view harshitethic/CHAI --json name,url,visibility,defaultBranchRef || true
```

If repo exists: clone/inspect and determine if it is legitimately this project, preserve current branch and uncommitted work. If it doesn't: initialize repo **with source** and commit before creating remote. Use GitHub APIs through authenticated connector when available; otherwise `gh` CLI.

```bash
# Example only: execute after confirmed repo absence and local project initialization.
git init -b main
git add .
git commit -m "chore: initialize CHAI desktop app"
gh repo create harshitethic/CHAI --public --source=. --remote=origin --push
```

Never commit `.env`, credential store, browser partition data, private sqlite histories, terminal captures with secrets, user home files, unlicensed third-party reference images. This ZIP's `refs/` contains third-party screenshots solely for user's private design context; when promoting to a public repo, move them to a local ignored folder (such as `.private-design-refs/`) and remove from staged Git. Include an abstract design description instead.

## Required repo structure after implementation

```text
CHAI/
  README.md  LICENSE  SECURITY.md  CONTRIBUTING.md  CODE_OF_CONDUCT.md
  .gitignore  .github/workflows/ci.yml
  package.json  lockfile  electron-builder config
  apps/desktop/src/main/...
  apps/desktop/src/preload/...
  apps/desktop/src/renderer/...
  packages/orchestrator/...
  packages/tool-gateway/...
  packages/provider-adapters/...
  packages/shared/...
  tests/unit/ tests/integration/ tests/e2e/
  docs/architecture.md docs/user-guide.md docs/privacy.md
  screenshots/ [ONLY original CHAI app screenshots]
  tasks.md handoff.md decisions.md blockers.md
```

Folder layout is recommended, not mandatory; use monorepo only if justified by complexity.

## Contribution workflow

Small feature branches: `feat/desktop-shell`, `feat/workspace-sandbox`, `feat/task-recovery`, `fix/electron-provider-navigation`. Keep commits reviewable and test-backed; use draft PRs for risky changes and request review where possible. Use independent CI before merging. Avoid force pushes to `main` or changes to other projects. Prefer signed release provenance if toolchain supports it.

## GitHub Actions baseline

Use Node LTS matrix on Linux, `npm ci`, lint, typecheck, unit tests, mocked E2E, build artifact, `npm audit --omit=dev`/dependency scanning with policy for known false positives. Runtime test may use `xvfb-run` on headless runner. Protect release workflow from untrusted fork PR secrets. Use least GitHub workflow permissions (`contents: read` for CI; `contents: write` for trusted tag release job only).

## Release `v0.1.0`

Do not publish before M1–M4 gates verified. Build `.deb` and AppImage, install/launch on Kali at least one, attach SHA256 and release notes containing real supported provider modes. Label early release **alpha** if ChatGPT automation isn't supported; don't market “ChatGPT unlimited agent” or “works forever.”

Release notes should state:
- What works **today** (real tests).
- What requires user confirmation/approval.
- Which providers work automatically vs interactively.
- Known limitations/Wayland restrictions.
- Download and checksum verification.
- Links to changelog, source, security/privacy docs.

## README quality

Show original screenshot/video from CHAI running on Kali, installation instructions, quick first task, expected screen/permissions, exact commands to build, FAQ, disclaimer that third-party services have independent rules, comparison with other tools backed by tested facts only. No fake stars/badges, CI or usage stats.

## If GitHub unavailable

Do real coding/testing locally, create commits, and update `handoff.md` with the exact missing permission; do not say repo created until a remote URL has been independently verified.
