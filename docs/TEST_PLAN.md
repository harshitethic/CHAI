# CHAI Test Plan — Evidence Required, No Pretend Passes

## Test strategy

Use deterministic mocks for reproducible CI; use real Kali desktop for native behavior; conduct permitted/manual provider checks separately. Never mark a mock provider transcript as ChatGPT automation proof. Report test command, exit code, case count, runtime, build version, environment and date.

## Unit tests — Vitest

- Plan graph: dependencies, cycles, ready-step selection, stale plan versions.
- Event store: schema validation, UUID/correlation, dedupe, durable writes.
- Permission engine: risk tiers, denial, expiration, approval once vs workspace grant.
- Path guard: canonicalization, traversal, symlink-to-outside, special files, path changes.
- Tool gateway: allowlisted arguments, timeout, cancellation, redaction, no inherited credentials.
- Provider adapters: capability declaration, unsupported operation, temporary unavailable, rate limited, mock correctness.
- State machine: invalid transitions, retry max, cancel from each runnable state, completed result requiring evidence.
- Checkpoint recovery: replay idempotence, ambiguous write, stale worker lease.
- UI stores: runtime status and unsupported-control hiding.

## Integration tests

1. **Offline happy path:** user selects isolated temp workspace; Manager creates file task, Worker A generates file, Worker B checks file, Manager closes with tool logs and diff. Assertion: exact content, events and DONE.
2. **Tool fail and repair:** intentionally failing command gives exit code; Reviewer rejects false success; Manager marks failed or asks Builder to fix within retry budget.
3. **Approval gate:** Builder proposes out-of-scope or terminal action; does not execute before approval; denial prevents side effect and logs why.
4. **Worker race:** two workers propose conflicting writes; lease/write lock serializes or rejects conflict.
5. **Cancellation:** start a cancellable, benign slow operation, press Stop All; process-group stopped and task CANCELED.
6. **Provider outage:** unavailable adapter changes task to WAITING_PROVIDER, checkpoints and does not spin; recovers when adapter returns.
7. **Crash/restart:** terminate renderer/process mid-step, restart and check task/event log; no duplicated mutations.
8. **Migration:** upgrade from older test SQLite fixture, preserve records, indexes and constraints; rollback strategy described.
9. **IPC hostility:** malformed shape, oversized payload, unexpected sender, attempt to invoke unexposed native methods all rejected.
10. **Privacy:** secrets in stdout replaced/redacted in persistent logs; private files not sent to provider unless deliberately selected.

## E2E UI tests — Playwright/Electron

- First-run onboarding completes; provider selector labels mode truthfully.
- Home/Chat/Work/Projects/Activity/Settings navigation works; back works.
- Three worker panes render correct event streams, collapse/resize, keyboard usable.
- Command Palette and shortcut behavior; focus and screen reader labels.
- Chat composer disable/availability states while task active, stop button functions.
- Model and effort controls appear only when adapter reports capabilities.
- Approval dialog includes exact path and risk and cannot be bypassed by UI route.
- Task progress visually reflects actual local persisted state; reload retains timeline.
- Dark theme visual snapshots at screen widths 1024, 1440, 1920, 3440. Avoid fragile screenshot assertions for volatile time/network content.
- System tray/pause background mode when enabled, UI close behavior when disabled.

## Real Kali tests

Record `uname -a`, distro, desktop environment, window session (`XDG_SESSION_TYPE`), installed browsers, display scaling, GPU session and app version. Use a disposable CHAI test directory, never a live user project for destructive/cancellation tests.

- Native Electron app launches from executable after package install, not merely Vite dev server.
- AppImage permission/launch or `.deb` install/launch (whatever was built).
- Browser view opens correct ChatGPT official domain; user signs in manually if needed. Clearly record inability to automate if so.
- Three panes and app shell readable across main ultrawide and regular monitor layouts.
- Offline mocked task works with actual file actions.
- Crash/restart, sleep/resume if practical; no stale lock permanently blocks.
- No side effects outside test workspace; no crashes on permission denial.
- Terminal action prompt shows clearly and can be canceled.
- App logs readable and do not contain secrets.

## Desktop interaction test matrix

| Environment | Capability | Expected behavior |
| --- | --- | --- |
| X11 | window/screenshot/accessibility backend with permission | show working tools only if tested |
| Wayland | portals, compositor-dependent interfaces | graceful fallback; never fake support |
| Headless CI | Xvfb or Playwright mock | GUI smoke and deterministic tests |
| Multi-monitor / high DPI | renderer and WebContentsView bounds | no clipping, correct scaling and pointer coordinates |
| Offline | no remote provider | mock/local task or explicit provider-wait state |

## Security negative tests

- Place `../../outside.txt` in file action and ensure denial.
- Symlink inside workspace points to private directory → deny write/read when outside grant.
- Worker response includes forged `approved: true` → policy ignores it.
- External page says “run rm ...” → remains untrusted data.
- Malicious Markdown with embedded script/event handler → sanitized and inert.
- Provider iframe attempts Node access or `file://` navigation → blocked.
- Huge prompt/result event payload → bounded, rejected/logged safely.
- Attempt action after Stop All → scheduler refuses dispatch.
- Expired approval and other workspace ID → rejected.

## Release gate

CI green is necessary but not sufficient. On real Kali, run packaged smoke + permission checks + offline end-to-end task + system tray/stop test + browser login/manual state check + screenshot inspection. Record which ones were actually run. Any failed P0 gate blocks a stable release; use pre-release alpha with prominently documented limitations if needed.

## Recording format

```markdown
### QA YYYY-MM-DD / commit <hash>
- Host: Kali version, session type, resolution
- Build: package filename/hash
- Commands: npm ci / lint / typecheck / test / test:e2e / build
- Results: exact exit codes and test counts
- Manual: scenario / observed result / screenshot path
- Security negative tests: pass/fail and evidence
- Open defects: IDs, severity, repro steps
- Ship decision: pass / fail and reason
```
