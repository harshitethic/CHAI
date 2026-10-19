# Definition of Done — CHAI, Evidence-Based

## Alpha v0.1 minimum

**Actual Linux program:** Electron (Chromium-based) app starts as its own desktop window on Kali. Polished original CHAI UI with real navigation, resizable Manager/Builder/Reviewer panes, workspace selection, task submission, task history and safe action visibility. No dead fake features.

**Real local-agent cycle:** from a user task through persisted Manager plan → Worker A local operation → Worker B validation → Manager evidence-backed answer, using offline deterministic mock or a configured actual local model; all steps inspectable. Does not pretend mock is ChatGPT.

**Computer control and safeguards:** works inside chosen workspace and can inspect/edit a disposable file; terminal operations are bounded/cancellable and permissioned; Stop All works; risky actions need proper approvals; provenance recorded; untrusted model text cannot invoke arbitrary native APIs.

**Persistence:** task checkpoints in SQLite; app renderer reload, application quit/restart and interrupted step scenarios recover honestly, without double applying writes; unavailable provider puts work in waiting state.

**ChatGPT session:** restricted browser view can open official ChatGPT website and provide legitimate direct user-login where provider allows; no extraction of cookies/passwords. If embedded sign-in is blocked, explain and support manual external browser fallback. No unsupported automatic web agent claims.

**GitHub:** real project repo, current branch and commit, passing CI, security/privacy docs, reproducible Linux build tested on actual Kali, release with accurate limitations and checksums.

## P0 gate — cannot call shipping-ready if failed

- App install/launch works on target machine.
- Whole worker loop is executable and auditable.
- Tools isolation and approvals tested negative/positive.
- Stop all / crash recovery / data persistence verified.
- Active provider mode is accurately labeled; cannot bypass quota/security.
- CI passes and packaged app smoke passes.
- Private/reference screenshots and secrets not committed to public source.

## Claim levels

- **Shell only:** UI running; no agent execution. Not an autonomous app.
- **Local-agent alpha:** offline mocked/local mode works with real tool actions and persistence, ChatGPT pane interactive only.
- **Integrated beta:** a supported provider adapter reliably generates/receives model messages; independently tested.
- **ChatGPT web agent:** requires documented permission and repeated lawful end-to-end web session automation. Cannot be claimed based on screenshot or demonstration alone.

## Example human acceptance walk-through

```text
1. Start installed CHAI on Kali.
2. Choose ~/Projects/CHAI-test (new disposable empty folder).
3. Select Mock provider.
4. Request: “Create a file called chai-demo.md with 3 checklist entries; verify its contents.”
5. Observe Manager plan, Builder's real edit, Reviewer's verified read/test, Manager's report.
6. Open logs; confirm command/patch, file content and accurate evidence IDs.
7. Quit and reopen app, confirm same task and history are present.
8. Attempt a write to ../outside.txt; CHAI denies it.
9. Start a benign long task, press Stop All; observe its termination.
10. Open ChatGPT pane and manually use provider login if permitted; never imply the mock task was executed through the web ChatGPT account.
```

**Done means the real outcomes above were observed, recorded and committed.**
