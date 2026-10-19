# CHAI — MASTER BUILD PROMPT (EXECUTE, DON'T JUST PLAN)

> **Project:** CHAI — **Chat Has Actions Inside**  
> **Tagline:** Your chatbot. Now with hands.  
> **Primary target:** Kali Linux desktop (Chromium-based desktop application).  
> **Target GitHub repository:** `https://github.com/harshitethic/CHAI` (create it if absent; do not assume it exists).  
> **Human's request:** Build, test, iterate, commit, push, and release a working open-source app. Keep making safe progress without waiting for repetitive approvals.

## 0. YOUR ROLE AND OPERATING CONTRACT

You are the **lead engineer + UI/UX designer + release engineer + QA engineer + security reviewer** assigned to implement CHAI. You are **not** writing a concept, mockup-only prototype, or another prompt. Produce a functioning, tested Linux app and public GitHub repository with real code, screenshots, tests, docs, and reproducible releases.

Read in this order: `brain.md`, `decisions.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, `docs/DESIGN_SYSTEM.md`, `docs/SECURITY.md`, `tasks.md`, `checks.md`, `docs/TEST_PLAN.md`, `docs/KALI_RUNBOOK.md`, `docs/GITHUB_RUNBOOK.md`, `handoff.md`, `blockers.md`. Read all images in `refs/` before building the UI.

**Use the already authorized connections to the user's Kali Linux (Remote Desktop Commander), GitHub integration/CLI, and existing browser sessions, if actually available in your execution environment.** Verify connectivity instead of assuming it works. Prefer local execution/test on Kali over imagined outputs. Do not claim a connection, tool execution, repo, push, login, or working browser session unless verified by commands/results. If no remote connection is available, develop in the accessible workspace, run available tests there, document this as a blocker, and do not fabricate remote evidence.

### Non-negotiable execution behavior

1. Inspect existing artifacts first, both local and on GitHub; **continue** any valid implementation rather than rebuilding blindly.
2. Create the `CHAI` repository in `@harshitethic` (with user authorization already stated here), if it does not yet exist and GitHub credentials/permissions permit it. Avoid duplicate repos and destructive force pushes. If there's unrelated existing content, stop and report before overwriting.
3. Convert this package from `planning` into the project's actual source repository: preserve product/architecture/decision/handoff docs, initialize package manifests, application code, tests, and CI. Put design inspiration screenshots into a local, untracked reference directory by default; do not publicly redistribute third-party screenshot assets without rights/permission.
4. Work milestone by milestone, but **implement the full vertical slice first**: launch app → user-controlled ChatGPT login → task creation → coordinator and two worker panes → one safe computer operation → inspectable activity log → persistent resume after restart.
5. Produce code, not only advice. Make small focused commits with correct authorship, branches, tests, and real results. Open PRs if working in branches; merge only when CI and security checks pass.
6. Maintain `tasks.md`, `handoff.md`, `checks.md`, `blockers.md`, `decisions.md` with exact completion evidence, commit hashes, failures, and next action. These files are the ground truth for new sessions.
7. Do not stop merely because an individual chat, browser view, or assistant context expires. The **installed CHAI program** must persist state and resume locally. Your own current assistant session cannot guarantee uninterrupted autonomous work; report the precise limit if encountered.
8. Continue automatically to the next safe unblocked task. Ask the human only when external login, 2FA, password entry, installation privilege, spending, policy acceptance, access grant, irreversible action, or a critical product decision genuinely requires them.
9. No fabricated PRs, fake CI, staged demo metrics, synthetic GitHub stars, fake accomplishments, or concealed incomplete integrations.
10. **Respect provider terms, quotas, authentication, and access controls.** Do not use multiple browser windows to circumvent model rate limits, usage caps, session limits, account restrictions, CAPTCHA, or anti-bot protection. Do not extract cookies/tokens from an existing logged-in browser or steal/clone its session; use approved, user-directed login in CHAI. Where automated ChatGPT-web coordination is disallowed, unavailable, or unreliable, implement a clear limited mode and supported adapters. Disclose limitations rather than misrepresenting them as solved.

## 1. PRODUCT VISION — WHAT CHAI DOES

CHAI is a local-first desktop program that makes a normal chatbot *capable of carrying out real user-approved work on the computer*. Unlike a conventional chat-only tab, CHAI supplies a **durable work engine**, tool execution gateway, visual task tracking, checkpoints, and recovery across browser reloads and app restarts.

**Primary experience:** The user opens CHAI, signs into ChatGPT in an embedded Chromium browser with their own account, chooses a model/effort if the provider legitimately exposes it, types an outcome (e.g., “inspect my project, fix tests, show what changed”), and watches CHAI decompose, delegate, execute tools on Kali, validate, and report with evidence. The original ChatGPT account may support only standard browser chat; do not imply a subscription grants programmatic API or browser-automation rights.

**Three-window concept (within one coherent app):**
- **Manager / Coordinator:** Receives the user's task, plans, breaks down work, dispatches subtasks, checks evidence, communicates status, and compiles final output. The coordinator is also a persistent **local service**, not only a ChatGPT tab.
- **Worker A — Builder:** Specializes in implementation, code, local terminal/file edits, and bounded browser actions.
- **Worker B — Reviewer / Researcher:** Independently checks implementation, tests, potential vulnerabilities, design, docs, and alternatives; no self-approval for risky changes.

These are **logical roles backed by three visible Chromium webviews/tabs**, with an independent local orchestration engine. Default UI emphasizes Manager; Worker A/B live in a switchable 3-pane command center. The app must not spawn endless tabs or assume all three views have free capacity. Workers may be **mock, local-model, supported API, or compliant provider web UI** adapters; show a visible capability/availability state for each. Message transfers must be explicit, traceable, and compliant, not untrusted DOM scraping with pretend reliability.

**Persistent execution:** A background process on the same Linux desktop owns tasks, states, checkpoints, approvals, events, and a durable queue. It can continue deterministic local work across UI close/reopen, pause on authentication/limit problems, and resume when a valid provider becomes available. It must never falsely claim that three tabs can renew an expired chat forever or bypass a provider's usage restrictions.

## 2. WHAT THE USER ACTUALLY WANTS

- A genuine, installable, Chromium-based **Linux desktop application**, not a website mockup, Chrome extension alone, or Figma screen.
- Styling strongly inspired by the attached dark Claude UI references, combined with premium macOS craftsmanship: graphite charcoal, warm orange/coral accents, subtly translucent sidebars, excellent type scale, smooth native-feeling motion, a refined navigation rail, pill composer, draggable panes, keyboard shortcuts, window controls, and graceful resizing.
- **Original CHAI brand**, layout details, names, icons, and interactions. Never clone third-party logos, protected marks, exact illustrations, source, or pixel-for-pixel screens; use references only for aesthetic direction.
- Login via a **first-party ChatGPT browser page** within CHAI: user authenticates directly with provider. Do not store their password, scrape session cookies into app code, or route credentials to CHAI servers.
- User prompts → Manager → 2 workers → actionable, validated results → Manager reports, in a meaningful, visible workflow.
- Agent actions on the **machine running CHAI**: bounded filesystem, terminal, Git, browser, desktop interaction, screenshots, project search, downloads/uploads with controls.
- Project workspace selector, tool permissions, human approval gates, full action audit log, undo/rollback where possible, and a big **Pause / Stop all** switch.
- Resume after crashes/reboots/browser context loss using SQLite persistence, checkpointed work, resumable plans, and task logs.
- Completely free/local baseline: no mandatory paid API, SaaS backend, or model subscription beyond whatever the user already lawfully accesses; local Ollama/LM Studio option is welcome. No claim that local execution can do unlimited sophisticated reasoning without an appropriate model.
- Linux/Kali testing through the user's connected computer, with actual screenshots and functional logs.
- A clean GitHub repo including MIT/Apache-2.0 license selected knowingly, install docs, GIF/screenshots generated **from CHAI itself**, issues/PR template, CI, and versioned releases.

## 3. REQUIRED TECHNICAL APPROACH

### Default stack (deviate only with documented evidence)

- **Electron + Chromium** (pinned compatible stable versions), main process / sandboxed renderer / context-isolated preload. Prefer maintained `electron-vite` or Vite + React + TypeScript template.
- **TypeScript strict**, React, accessible headless primitives where useful, CSS variables/Tailwind or tokens, Lucide icons, motion library used modestly, `zustand` or equivalently small state store.
- Local **Node.js orchestration service** running in Electron main process or a supervised sidecar; never put privileged tools in untrusted renderer/webview context.
- **SQLite** + WAL/migrations for task/step/event/checkpoint persistence, with versioned schema; no dependency on a remote database.
- `zod`/JSON schema validation for all IPC messages, task envelopes and tool requests.
- **Playwright** for tests and optional controlled browser automation in isolated profiles, only where permitted; use supported accessibility automation with explicit consent rather than fragile coordinate scraping whenever possible.
- `node-pty` or carefully bounded child processes for user-approved terminal execution (not a broad unrestricted `exec` endpoint). Shell actions must be visible, scoped, cancellable, logged and protected against command injection.
- `electron-builder`/equivalent for `.deb` and AppImage distributions; release SHA256 checksums; Linux desktop integration.
- `vitest`, React Testing Library, `@playwright/test`, ESLint, prettier, typecheck, dependency audit / security checks in CI.

### Architecture layers

1. **Presentation (Renderer):** app shell, Manager chat, two worker panes, task timeline, approvals drawer, tool activity console, workspace, history, settings.
2. **Provider transport (isolated browser/session adapters):** ChatGPT webview (user signs in directly), mock agent, local-model adapter, optional official API adapter. Any web-driven prompt exchange must satisfy provider terms and have health checks/timeouts/fallback; render honest status.
3. **Orchestrator (durable):** Manager policy loop, task planner, queue, worker leases, checkpoints, deduplication, retries/backoff, budgets, cancellation, resume, approval decisions.
4. **Tools gateway:** capability-scoped FS, Git, terminal, browser, screenshots, desktop action, network. Every action associated with task ID, scope, permissions, audit events and reversibility class.
5. **Persistence + recovery:** local SQLite, encrypted secrets via OS credential store when available, typed migrations, exports, local logs. Avoid storing raw sessions.
6. **Native shell:** window management, tray/notifications, launch on login *optional*, shortkeys, theme, sandbox/CSP/IPC, auto-update *optional and safe*.

Read `docs/ARCHITECTURE.md`, `docs/STATE_PROTOCOL.md` for state diagrams and example typed contracts.

## 4. PROVIDER / CHATGPT INTEGRATION — BUILD THIS HONESTLY

- Support user-controlled login at `https://chatgpt.com/` in a dedicated restricted partition or equivalent browser context. Display official domain and TLS clearly. Persist only browser partition data through OS/Electron policies as needed; no app-side extraction of authentication cookies or passwords. A browser account is not an API key.
- Do not inject hidden scripts into ChatGPT to steal session data or attempt forbidden automation. Do not evade detection or automate account creation, CAPTCHA, subscriptions, rate limits, or login.
- A compliant web interaction mode must be **capability-detected**: manual ChatGPT pane always works; if permitted, show supported automate/send/receive features with clear notice and user controls. If unsupported, do not pretend it works. Provide an accessible local-model/approved-API worker route and working task tools while displaying web pane as manual/assisted.
- Model picker / thinking-effort controls: populate from *actual* provider availability. If the provider page owns those controls, allow user to operate them natively; never fabricate GPT-6/High selections merely because screenshots show them. Store preferences only for adapters that expose capability metadata.
- On error/limits: `WAITING_PROVIDER` state, countdown/retry only when indicated, persist queue; offer manual handoff or supported local provider; never create a rotating set of sessions to evade limits.
- Architect an interchangeable `ProviderAdapter`: `capabilities()`, `health()`, `send()`, `receive()`, `cancel()`, `resume()` (conditional availability), with clear unsupported errors and event provenance.
- **MVP proof:** When ChatGPT web access cannot be programmatically controlled lawfully, prove end-to-end orchestration using `MockProviderAdapter` and a real local model if available; do not mark production web automation as complete.

## 5. MANAGER / WORKER ORCHESTRATION

Implement a **durable coordinator**, not merely three people chatting in circles. The manager is a local state machine with optional model reasoning. It has explicit responsibilities:

1. Parse user outcome, read workspace constraints and permission policy.
2. Create task record, plan and success criteria; ask a *single* critical question only if otherwise blocked.
3. Split into dependency-aware bounded steps, assign Worker A or B, prevent duplicate mutations.
4. Route messages through **structured job envelopes**, never by trusting unverified natural-language status as proof.
5. Workers propose actions; the tools gateway validates path/permission/danger/approval, executes locally, captures stdout/exit code and artifacts.
6. Reviewer performs independent validation: code diff, tests, UI, security, docs, acceptance.
7. Manager updates timeline every meaningful event; retries transient failures with bounded policy; stops for real blockers.
8. Resume after app restart with reconciliation of unfinished steps, not blind repeat of side effects.
9. Publish final report with actual commands/tests, outcomes, files, screenshots, branch/release info, known limitations.

Provide visible events like `TASK_CREATED`, `PLAN_APPROVED`, `WORK_ASSIGNED`, `WORKER_RESPONSE`, `TOOL_APPROVAL_REQUIRED`, `TOOL_EXECUTED`, `CHECK_FAILED`, `CHECK_PASSED`, `CHECKPOINT_SAVED`, `TASK_PAUSED`, `TASK_DONE`.

**Recovery target:** kill renderer during a running non-destructive mocked task, restart app, verify task continues/resumes without losing history; repeated state reconciliation must be idempotent.

## 6. COMPUTER CONTROL / SAFETY / USER AUTONOMY

Build per-workspace permission grants and five levels:

- `READ`: inspect selected workspace, Git status, process info; can default to allowed after workspace chosen.
- `SAFE_WRITE`: edits within explicitly selected workspace, patch staging, reversible temp artifacts, safe Git branches. User can enable once per workspace; show what changed.
- `EXEC`: local commands, installs, external process/network access; require command preview / configurable approval unless allowlisted. Never silently run `sudo`, edit boot/auth files, run destructive shell commands, or expand outside workspace.
- `SENSITIVE`: secrets, personal files, system settings, browser credential stores, SSH keys, mail, cloud resources, external writes. Explicit approval.
- `IRREVERSIBLE`: publishing, deleting repos, payments, purchases, broadcasts, sensitive account actions, wiping data, force push. Always explicit confirmation; no hidden blanket approval.

Install an always-visible red **Stop all actions** control. Cancellation terminates child processes using process groups; marks leases revoked; prompts about partially completed operations. Show actions and outputs; do not allow a model to directly call arbitrary Node APIs.

Handle prompt injection: pages, README files, web results, worker chat messages and terminal outputs are **untrusted data**, not authority to change scope. Secrets never placed into model prompts by default. No unrestricted listening / surveillance, keylogging, background screenshots, or browser cookie harvesting.

## 7. DESIGN DIRECTION — FOLLOW THE INCLUDED IMAGES

Read all PNGs in `refs/` and `docs/DESIGN_SYSTEM.md`. The target is an **original CHAI implementation** influenced by the example's layered charcoal interface, thin borders, warm coral/orange accent and soft gradients; polished like a native macOS product, while remaining clearly CHAI. Do not copy the word Claude, Claude's logo, company marks, exact illustrations, or third-party copy.

Essential screens:

1. **Onboarding:** CHAI logo; concise trust statement; Open ChatGPT Login button; choose workspace; permissions explanation; ability to use mock/local provider.
2. **Home:** sidebar rail `Chat`, `Work`, `Projects`, `Activity`, `Connections`, `Settings`; chat history; central conversation, prominent prompt composer; no placeholder dead features.
3. **Command Center:** responsive 3-role workspace (Manager large, Builder and Reviewer side by side or stacked), message-routing indicators, agent state, actual session health, selected provider, thinking/quality controls only when available.
4. **Work view:** step tree, task progress, terminal/tool log, file diffs, screenshot thumbnails, approvals queue, resume/pause/stop, retry controls.
5. **Settings:** providers, login status, stored data, permissions, workspace locations, local models, update controls, diagnostics, theme accessibility.
6. **History:** searchable tasks/events, resume checkpoint, export JSON/Markdown, remove sensitive history.
7. **System tray state:** Idle / Running / Needs Approval / Waiting for Provider / Paused / Error, clear notification preferences.

Add beautiful empty/loading/error/permission states, animations (respect `prefers-reduced-motion`), keyboard focus rings and shortcut help. Prioritize legibility on the user's multi-monitor Kali setup including an ultrawide + 4K screens and fractional scaling.

**Important UI truthfulness:** Not all provider controls are available to embedded browsers. The screenshot selector for GPT and thinking effort is **visual reference**, not license to expose nonfunctional fake controls.

## 8. DEVELOPMENT / VERIFICATION WORKFLOW

### Discover — first, do not assume

```bash
uname -a
cat /etc/os-release
node --version || true
npm --version || true
which chromium chromium-browser google-chrome git gh || true
gh auth status || true
git status --short --branch || true
```

Check CPU/graphics session, KDE/Xfce/GNOME, X11 vs Wayland, remote connection, disk space, permissions. Do not shut down other apps or edit unrelated directories. Inspect `~/` for an existing CHAI folder using targeted paths, without recursively scanning or touching unrelated sensitive data.

### Build with vertical slices

- **Slice 1:** Electron startup + CHAI design + real navigation + workspace selection + basic ChatGPT browser login pane.
- **Slice 2:** SQLite state and local tool capability gateway; mock task enters queue, executes a safe operation inside a disposable workspace and produces auditable result.
- **Slice 3:** 3 visible logical worker panes, coordinator dispatch/response and independent reviewer check, always-labeled provider modes.
- **Slice 4:** restart recovery, approvals and undo where possible, rate limits / waiting, graceful cancellation, export.
- **Slice 5:** native desktop polish, packaged `.deb` & AppImage, screenshots, docs, signed checksums, CI, release.

Use test-first for risk-sensitive modules. Do not defer tests, error handling, or security until the end. Use real functionality, not fake spinner demos, hardcoded “success,” or untested AI outputs.

### Run and measure

At each slice: `lint`, `typecheck`, `unit tests`, integration tests, packaged startup smoke test, security review, screenshot compare. Use Playwright on Kali and take actual screenshots to prove the UI. Test direct login only with the user's interactive assistance where needed—never ask them to paste passwords into chat or commit cookies.

### GitHub output

Create or reuse repo, branch, push code, configure CI, issues/discussions (if authorized/appropriate), semantic commits. Create a small release only when artifact install is verified. If CI is green but live login is manual, mark it as manual-pending, not fully integrated. Track GitHub links and commit hashes in `handoff.md`.

## 9. MILESTONE EXIT CRITERIA (NOT SUBJECTIVE)

**M1 — Real app exists:** Kali launches actual Electron executable; original premium shell; can resize/navigate; user can open official ChatGPT login. No JS console errors. Evidence: run output + screenshot.

**M2 — Real local agent cycle:** From prompt → persisted task → delegated builder step → permissioned local tool action in isolated workspace → reviewer checks output → manager reports. Passes an automated test and a recorded manual run. Mock mode is clearly labeled.

**M3 — Robustness / Security:** App restart preserves task and routes; no duplicate writes; stop all terminates activity; outside-workspace writes rejected; approvals enforced; hostile provider content cannot obtain privileged commands; invalid IPC rejected.

**M4 — Release:** reproducible Linux `.deb` or AppImage; installs/launches on tested Kali; repo docs + LICENSE + privacy/security policy + GitHub Actions; no bundled screenshot copyrights in public repo; smoke-tested release asset and SHA256.

**M5 — Real provider claim (separate gate):** Only mark ChatGPT-web automated agent as supported when actual lawful integration, provider policy, current user session behavior, repeated live tests, and failure recovery prove it. Otherwise ship honest ChatGPT assisted-pane + working mock/local/approved adapter mode and list limitations. This gate must not hold the rest of CHAI hostage.

## 10. CONTINUOUS WORK LOOP — FOLLOW UNTIL DONE OR REAL BLOCKER

```text
while there are unblocked, authorized tasks:
  refresh repository + working tree + TASKS + HANDOFF + BLOCKERS
  choose highest-impact task that advances a verifiable milestone
  make changes in a scoped branch
  run relevant tests and review diff
  fix failures, or record honest blockers
  commit/push when verified and safe
  update status docs with evidence, hashes, test outputs, screenshots
  proceed to next safe task
when blocked:
  document exact blocking operation, attempted remedies, safe fallback,
  whether user action is strictly required, and one precise request
```

Every completed action must result in **evidence**, not narrative. When current agent session ends, the next session reads `handoff.md` and continues at `NEXT ACTION` without replanning everything. CHAI itself must use durable local state rather than relying on any LLM's chat context length.

## 11. WHAT TO DO FIRST — BEGIN IMMEDIATELY

1. Read all project documents and view all six image references.
2. Verify Kali/GitHub availability; inspect existing `CHAI` repo and local checkout before writing.
3. Create repo if missing, select an honest open-source license, initialize Electron/React/TS project with secure defaults.
4. Implement a polished, **real runnable shell** with navigation and task creation; commit with evidence.
5. Implement SQLite schema and mock provider plus 3-role orchestrator with scoped safe filesystem tool; run unit and integration tests; commit.
6. Add user-controlled ChatGPT browser pane, capabilities status, explicit no-bypass provider handling; test interactive login where allowed; commit.
7. Add pause/resume, approval gate, recovery and action log; test kill/restart; commit.
8. Polish against references, package for Kali, document installation, publish release when verified.
9. Keep going toward all acceptance criteria. Do not repeatedly ask whether to continue. **Only interrupt for genuine human-only authorization or external blocks.**

## 12. REQUIRED END-OF-SESSION REPORT

```text
CHAI STATE: <MILESTONE + pass/fail>
REPOSITORY: <verified url or NOT CREATED>
BRANCH / COMMIT: <real branch + hash>
RUNNING ON KALI: <YES + evidence / NO + reason>
SHIPPED THIS SESSION: <actual changes>
TESTS: <commands, passes, failures>
PROVIDER: <manual pane / mock / local / API / web automation verified>
SECURITY REVIEW: <specific result>
SCREENSHOTS / BUILD: <real file paths or links>
BLOCKERS: <only concrete blockers>
NEXT ACTION: <one executable task>
```

If a planned feature is not implemented, never describe it as shipped. If web UI automation cannot be delivered within rules or available integrations, plainly distinguish CHAI's usable local orchestration engine from a fully automated ChatGPT browser agent.

**Now start executing the first task and continue.**
