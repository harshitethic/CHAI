import React, { useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Coffee,
  MessageSquare,
  Workflow,
  Folder,
  Activity,
  Plug,
  Settings,
  Plus,
  ArrowUp,
  Square,
  Search,
  ShieldCheck,
  ArrowUpRight,
  ChevronRight,
  Terminal,
  FileText,
  Pause,
  Play,
  Download,
  RotateCcw,
  Trash2,
  PanelRight,
  Monitor,
  Globe,
} from "lucide-react";
import type { Request, Snapshot, Mode, Role } from "../core/contracts";
import "./style.css";
declare global {
  interface Window {
    chai: { request: (r: Request) => Promise<unknown> };
  }
}
const routes = [
  ["Chat", MessageSquare],
  ["Work", Workflow],
  ["Projects", Folder],
  ["Activity", Activity],
  ["Connections", Plug],
  ["Settings", Settings],
] as const;
const blank: Snapshot = {
  tasks: [],
  events: [],
  workspace: null,
  models: [],
  providerError: null,
  selectedModel: "",
};
function App() {
  const [data, setData] = useState(blank),
    [route, setRoute] = useState("Chat"),
    [id, setId] = useState<string | null>(null),
    [goal, setGoal] = useState(""),
    [mode, setMode] = useState<Mode>("local"),
    [model, setModel] = useState(""),
    [plan, setPlan] = useState(""),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [focus, setFocus] = useState(false),
    [url, setUrl] = useState("https://example.com"),
    [x, setX] = useState(0),
    [y, setY] = useState(0);
  const input = useRef<HTMLTextAreaElement>(null),
    searchRef = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    try {
      setData((await window.chai.request({ op: "snapshot" })) as Snapshot);
    } catch (e) {
      setError(String(e));
    }
  }, []);
  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 700);
    return () => clearInterval(interval);
  }, [refresh]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "n") {
        e.preventDefault();
        setId(null);
        setRoute("Chat");
        input.current?.focus();
      }
      if (e.key === ",") {
        e.preventDefault();
        setRoute("Settings");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (!model && data.models.length)
      setModel(
        data.models.includes(data.selectedModel)
          ? data.selectedModel
          : data.models[0],
      );
  }, [data.models, data.selectedModel, model]);
  const call = async (r: Request) => {
    try {
      setError("");
      const result = await window.chai.request(r);
      await refresh();
      return result;
    } catch (e) {
      setError(String(e));
    }
  };
  const task = data.tasks.find((t) => t.id === id);
  const events = data.events.filter((e) => e.taskId === id);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim()) return;
    setBusy(true);
    const result = await call({
      op: "create",
      goal,
      mode,
      model,
      plan: mode === "assisted" ? plan : undefined,
    });
    if (typeof result === "string") {
      setId(result);
      setGoal("");
      setRoute("Work");
    }
    setBusy(false);
  }
  const stateLabel = (s: string) => s.toLowerCase().replaceAll("_", " ");
  const rolePanel = (role: Role) => (
    <section className={"role " + role} key={role}>
      <header>
        <span className="avatar">
          {role === "manager" ? (
            <Coffee size={18} />
          ) : role === "builder" ? (
            <Terminal size={18} />
          ) : (
            <ShieldCheck size={18} />
          )}
        </span>
        <div>
          <b>{role[0].toUpperCase() + role.slice(1)}</b>
          <small>
            {role === "manager"
              ? "Plan & coordinate"
              : role === "builder"
                ? "Scoped local execution"
                : "Evidence verification"}
          </small>
        </div>
        <span
          className={
            "role-state " +
            (task?.agent &&
            ["PLANNING", "VALIDATING", "RUNNING"].includes(task.state) &&
            (task.agent.phase === role ||
              (role === "manager" && task.agent.phase === "finalize"))
              ? "thinking"
              : "")
          }
        >
          {task?.mode === "local" ? "AI" : "Local"}
        </span>
      </header>
      <div className="role-events">
        {events
          .filter((e) => e.role === role)
          .map((e) => (
            <article key={e.id}>
              <label>{e.kind.replaceAll("_", " ")}</label>
              <pre>{e.detail}</pre>
              <time>{new Date(e.created).toLocaleTimeString()}</time>
            </article>
          ))}
        {!events.some((e) => e.role === role) && (
          <p className="muted">
            Waiting for a task. Actions and evidence will appear here.
          </p>
        )}
      </div>
    </section>
  );
  return (
    <div className="shell">
      <nav className="rail" aria-label="Main navigation">
        <button
          className="brand"
          title="CHAI home"
          onClick={() => {
            setId(null);
            setRoute("Chat");
          }}
        >
          <Coffee size={26} />
        </button>
        {routes.map(([name, Icon]) => (
          <button
            key={name}
            className={route === name ? "active" : ""}
            aria-label={name}
            title={name}
            onClick={() => setRoute(name)}
          >
            <Icon size={21} />
            <span>{name}</span>
          </button>
        ))}
        <div className="rail-bottom">
          <ShieldCheck size={21} />
          <small>LOCAL</small>
        </div>
      </nav>
      <aside className="sidebar">
        <div className="wordmark">
          CHAI <span>ALPHA</span>
        </div>
        <label className="search">
          <Search size={15} />
          <input
            ref={searchRef}
            aria-label="Search tasks"
            placeholder="Find a task"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <kbd>⌃ K</kbd>
        </label>
        <button
          className="new-task"
          onClick={() => {
            setId(null);
            setRoute("Chat");
            input.current?.focus();
          }}
        >
          <Plus size={17} /> New task
        </button>
        <div className="section-label">WORKSPACE</div>
        <button
          className="workspace"
          onClick={() => void call({ op: "workspace" })}
        >
          <Folder size={17} />
          <span>{data.workspace?.split("/").at(-1) ?? "Choose a folder"}</span>
          <ChevronRight size={15} />
        </button>
        <div className="section-label">
          RECENT TASKS <span>{data.tasks.length}</span>
        </div>
        <div className="history">
          {data.tasks
            .filter((t) => t.goal.toLowerCase().includes(search.toLowerCase()))
            .map((t) => (
              <button
                className={id === t.id ? "selected" : ""}
                key={t.id}
                onClick={() => {
                  setId(t.id);
                  setRoute("Work");
                }}
              >
                <span className={"status-dot " + t.state} />
                <div>
                  <b>{t.goal}</b>
                  <small>{stateLabel(t.state)}</small>
                </div>
              </button>
            ))}
          {!data.tasks.length && (
            <p className="empty-history">
              Your work stays here.
              <br />
              Even after a restart.
            </p>
          )}
        </div>
        <div className="sidebar-foot">
          <ShieldCheck size={17} />
          <span>
            On your machine.
            <br />
            <b>Under your control.</b>
          </span>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <span>{route}</span>
            <ChevronRight size={14} />
            <b>{data.workspace?.split("/").at(-1) ?? "Personal workspace"}</b>
          </div>
          <div>
            <span className="local-pill">
              <span className="dot" /> Local engine
            </span>
            <button className="stop" onClick={() => void call({ op: "stop" })}>
              <Square size={12} fill="currentColor" /> Stop all
            </button>
          </div>
        </header>
        {error && (
          <div className="error" role="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
        <div className="content">
          {route === "Chat" && (
            <div className="home">
              <div className="eyebrow">
                <span className="dot" /> CHAT HAS ACTIONS INSIDE
              </div>
              <div className="hero-mark">
                <Coffee size={40} strokeWidth={1.3} />
              </div>
              <h1>
                Stop chatting.
                <br />
                <em>Start doing.</em>
              </h1>
              <p className="intro">
                Give your ideas a workspace.
                <br />
                Plan, act, and verify—with you in control.
              </p>
              <form className="composer" onSubmit={submit}>
                <textarea
                  ref={input}
                  aria-label="Task goal"
                  placeholder={
                    mode === "recipe"
                      ? "Try: write notes.txt with content My first CHAI task"
                      : "What do you want to accomplish?"
                  }
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
                {mode === "assisted" && (
                  <textarea
                    className="json-plan"
                    aria-label="Structured plan"
                    placeholder='Paste JSON: {"summary":"...","actions":[{"tool":"write","path":"notes.txt","content":"Hello"}]}'
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                  />
                )}
                <footer>
                  <button
                    type="button"
                    onClick={() => void call({ op: "workspace" })}
                  >
                    <Folder size={16} />
                    {data.workspace?.split("/").at(-1) ?? "Choose workspace"}
                  </button>
                  <select
                    aria-label="Provider mode"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as Mode)}
                  >
                    <option value="recipe">Offline recipes · not AI</option>
                    <option value="assisted">ChatGPT · manual handoff</option>
                    <option value="local">AI team · local model</option>
                  </select>
                  {mode === "local" && (
                    <select
                      aria-label="Team model"
                      value={model}
                      onChange={(e) => {
                        setModel(e.target.value);
                        void call({ op: "select-model", name: e.target.value });
                      }}
                    >
                      <option value="">Choose local model</option>
                      {data.models.map((name) => (
                        <option value={name} key={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    className="send"
                    aria-label="Create task"
                    disabled={
                      busy ||
                      !data.workspace ||
                      !goal.trim() ||
                      (mode === "local" && !model) ||
                      (mode === "assisted" && !plan.trim())
                    }
                  >
                    <ArrowUp size={20} />
                  </button>
                </footer>
              </form>
              <p className="caption">
                {mode === "local"
                  ? "Three AI roles on your PC. Tool actions need your approval; approved evidence stays local."
                  : "Every action is previewed. Nothing runs until you approve."}
              </p>
              {mode === "local" && !data.models.length && (
                <button
                  className="model-setup"
                  onClick={() => setRoute("Connections")}
                >
                  Connect a local model to activate the AI team{" "}
                  <ArrowUpRight size={16} />
                </button>
              )}
              <div className="quick-actions">
                {[
                  ["Inspect workspace", "list files", Folder],
                  ["Check Git changes", "git status", Terminal],
                  ["Test stop control", "cancellation check", Pause],
                ].map(([name, prompt, Icon]) => {
                  const Glyph = Icon as typeof Folder;
                  return (
                    <button
                      key={String(name)}
                      onClick={() => {
                        setMode("recipe");
                        setGoal(String(prompt));
                        input.current?.focus();
                      }}
                    >
                      <Glyph size={18} />
                      <b>{String(name)}</b>
                      <ArrowUpRight size={16} />
                    </button>
                  );
                })}
              </div>
              <div className="role-summary">
                {["Manager plans", "Builder acts", "Reviewer verifies"].map(
                  (s, i) => (
                    <span key={s}>
                      <i>{String(i + 1).padStart(2, "0")}</i>
                      {s}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}
          {route === "Work" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">COMMAND CENTER</span>
                  <h2>{task ? task.goal : "Your next idea, in motion."}</h2>
                  <p>
                    {task
                      ? `${stateLabel(task.state)} · ${task.mode} · ${task.cursor}/${task.plan?.actions.length ?? 0} actions`
                      : "Choose a task from the sidebar or create a new one."}
                  </p>
                </div>
                <button
                  aria-label="Toggle focused layout"
                  onClick={() => setFocus(!focus)}
                >
                  <PanelRight size={18} />
                </button>
              </div>
              {task?.agent && (
                <section
                  className="team-progress"
                  aria-label="AI team progress"
                >
                  <span>
                    <b>{task.model}</b> · local inference
                  </span>
                  <span>
                    Round {task.agent.round}/3 · {task.agent.calls}/15 model
                    calls
                  </span>
                  <span>{stateLabel(task.agent.phase)}</span>
                </section>
              )}
              {task?.agent?.brief && (
                <section className="acceptance-card">
                  <h3>Success criteria</h3>
                  <ul>
                    {task.agent.brief.acceptance.map((criterion, i) => (
                      <li key={i}>{criterion}</li>
                    ))}
                  </ul>
                </section>
              )}
              {task?.state === "DONE" && task.agent?.report && (
                <section className="result-card">
                  <h3>Verified result</h3>
                  <p>{task.agent.report.summary}</p>
                  {task.agent.report.limitations.map((item, i) => (
                    <p className="muted" key={i}>
                      {item}
                    </p>
                  ))}
                </section>
              )}
              {task?.error && <div className="notice">{task.error}</div>}
              {task && (
                <div className="toolbar">
                  <button
                    onClick={() => void call({ op: "pause", id: task.id })}
                    disabled={
                      ![
                        "RUNNING",
                        "PLANNING",
                        "VALIDATING",
                        "WAITING_APPROVAL",
                      ].includes(task.state)
                    }
                  >
                    <Pause size={15} />
                    Pause
                  </button>
                  <button
                    onClick={() => void call({ op: "resume", id: task.id })}
                    disabled={
                      !["PAUSED", "WAITING_PROVIDER"].includes(task.state)
                    }
                  >
                    <Play size={15} />
                    Resume
                  </button>
                  <button
                    onClick={() => void call({ op: "export", id: task.id })}
                  >
                    <Download size={15} />
                    Export
                  </button>
                  <button
                    onClick={() => void call({ op: "undo", id: task.id })}
                  >
                    <RotateCcw size={15} />
                    Restore edits
                  </button>
                </div>
              )}
              {task?.state === "WAITING_APPROVAL" && (
                <section className="approval">
                  <header>
                    <ShieldCheck size={23} />
                    <div>
                      <h3>Review before running</h3>
                      <p>One-time approval · {task.root}</p>
                    </div>
                  </header>
                  <p>{task.plan?.summary}</p>
                  <pre>
                    {JSON.stringify(
                      task.plan?.actions.slice(task.cursor),
                      null,
                      2,
                    )}
                  </pre>
                  <footer>
                    <span>
                      Files may change. Existing file snapshots are kept
                      locally.
                    </span>
                    <button
                      onClick={() =>
                        void call({ op: "approve", id: task.id, allow: false })
                      }
                    >
                      Deny
                    </button>
                    <button
                      className="primary"
                      onClick={() =>
                        void call({ op: "approve", id: task.id, allow: true })
                      }
                    >
                      Approve plan
                    </button>
                  </footer>
                </section>
              )}
              <div className={"roles " + (focus ? "focused" : "")}>
                {(["manager", "builder", "reviewer"] as Role[]).map(rolePanel)}
              </div>
            </>
          )}
          {route === "Projects" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">A BOUNDARY YOU CHOOSE</span>
                  <h2>Your workspace</h2>
                  <p>
                    File tools stay inside a dedicated folder. Terminal commands
                    use a fixed allowlist.
                  </p>
                </div>
              </div>
              <section className="settings-card">
                <Folder size={28} />
                <h3>{data.workspace ?? "No workspace selected"}</h3>
                <button
                  className="primary"
                  onClick={() => void call({ op: "workspace" })}
                >
                  Choose workspace
                </button>
                <p>
                  Symlinks, traversal, hardlinks, special files and common
                  credential paths are rejected. Existing tasks keep their
                  original folder.
                </p>
              </section>
            </>
          )}
          {route === "Activity" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">THE ACTUAL RECORD</span>
                  <h2>Activity & evidence</h2>
                  <p>
                    Recent local events. Task exports include the visible event
                    history.
                  </p>
                </div>
              </div>
              <div className="activity">
                {data.events
                  .slice()
                  .reverse()
                  .map((e) => (
                    <article key={e.id}>
                      <span className="event-icon">
                        <FileText size={16} />
                      </span>
                      <div>
                        <label>
                          {e.role} / {e.kind.replaceAll("_", " ")}
                        </label>
                        <pre>{e.detail}</pre>
                      </div>
                      <time>{new Date(e.created).toLocaleTimeString()}</time>
                    </article>
                  ))}
                {!data.events.length && (
                  <p>No actions yet. Your first task will start the record.</p>
                )}
              </div>
            </>
          )}
          {route === "Connections" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">BRING YOUR THINKING</span>
                  <h2>Connections</h2>
                  <p>
                    Three roles. Honest capabilities. No session rotation or
                    hidden credential access.
                  </p>
                </div>
              </div>
              <section className="settings-card">
                <div className="card-title">
                  <MessageSquare />
                  <h3>ChatGPT</h3>
                  <span className="badge">Interactive only</span>
                </div>
                <p>
                  Sign in directly on chatgpt.com. These three isolated views
                  share CHAI’s own browser session. Automatic messaging is
                  unavailable; paste a structured plan into Manual handoff.
                </p>
                <div className="toolbar">
                  {(["manager", "builder", "reviewer"] as Role[]).map(
                    (role) => (
                      <button
                        key={role}
                        onClick={() => void call({ op: "provider", role })}
                      >
                        Open {role}
                        <ArrowUpRight size={14} />
                      </button>
                    ),
                  )}
                  <button onClick={() => void call({ op: "external-chat" })}>
                    External browser
                  </button>
                </div>
              </section>
              <section className="settings-card">
                <div className="card-title">
                  <Terminal />
                  <h3>Local AI team</h3>
                  <span className="badge">Local model</span>
                </div>
                <p>
                  Manager assigns work, Builder proposes actions, and Reviewer
                  checks the real results. Your goal and approved tool evidence
                  are sent only to Ollama on this PC (127.0.0.1:11434). Failed
                  reviews can trigger up to three rounds; new actions always
                  need approval.
                </p>
                <div className="toolbar">
                  <button onClick={() => void call({ op: "models" })}>
                    Check installed models
                  </button>
                  <button onClick={() => void call({ op: "start-local" })}>
                    Start local service
                  </button>
                  <select
                    aria-label="Local model"
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      if (e.target.value)
                        void call({ op: "select-model", name: e.target.value });
                    }}
                  >
                    <option value="">Choose model</option>
                    {data.models.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                {data.providerError && (
                  <p className="warning">{data.providerError}</p>
                )}
              </section>
              <section className="settings-card">
                <div className="card-title">
                  <Globe />
                  <h3>Browser & desktop tools</h3>
                  <span className="badge">Approval each time</span>
                </div>
                <p>
                  Separate browser profile; no access to the ChatGPT session.
                  Clicks can have external effects—inspect the target before
                  approving.
                </p>
                <div className="toolbar">
                  <input
                    aria-label="Browser URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <button onClick={() => void call({ op: "browser", url })}>
                    Open browser
                  </button>
                  <button onClick={() => void call({ op: "browser-capture" })}>
                    Capture browser
                  </button>
                  <button onClick={() => void call({ op: "capture" })}>
                    <Monitor size={16} />
                    Capture desktop
                  </button>
                </div>
                <div className="toolbar">
                  <label>
                    X{" "}
                    <input
                      aria-label="Click X"
                      type="number"
                      value={x}
                      onChange={(e) => setX(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Y{" "}
                    <input
                      aria-label="Click Y"
                      type="number"
                      value={y}
                      onChange={(e) => setY(Number(e.target.value))}
                    />
                  </label>
                  <button
                    onClick={() => void call({ op: "browser-click", x, y })}
                  >
                    Browser click
                  </button>
                  <button
                    onClick={() => void call({ op: "desktop-click", x, y })}
                  >
                    X11 desktop click
                  </button>
                </div>
              </section>
            </>
          )}
          {route === "Settings" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR MACHINE, YOUR RULES</span>
                  <h2>Settings & privacy</h2>
                  <p>Local data. Explicit permissions. No telemetry.</p>
                </div>
              </div>
              <section className="settings-card">
                <h3>Execution policy</h3>
                <p>
                  Every plan requires one-time approval. Approvals expire after
                  15 minutes and are revoked on restart. Closing the main window
                  pauses tasks. Background execution and autostart are disabled.
                </p>
                <p>
                  Terminal tools: pwd, git status, git diff summary, node
                  version, bounded sleep. Arbitrary shell execution and
                  destructive tools are unavailable in this alpha.
                </p>
                <h3>Data on this computer</h3>
                <p>
                  Task history and before-edit snapshots are stored in a private
                  local SQLite database. They are not encrypted. Browser sign-in
                  lives only in CHAI’s isolated Chromium partition.
                </p>
                <button onClick={() => void call({ op: "clear-provider" })}>
                  Clear CHAI ChatGPT session
                </button>
              </section>
              <section className="settings-card">
                <h3>Keyboard & accessibility</h3>
                <p>
                  Ctrl+K: find task · Ctrl+N: new task · Ctrl+,: settings ·
                  Ctrl+Shift+.: stop all. System reduced-motion preferences are
                  respected. Use the View menu to zoom.
                </p>
                {task && (
                  <button
                    className="danger"
                    onClick={async () => {
                      await call({ op: "delete", id: task.id });
                      setId(null);
                    }}
                  >
                    <Trash2 size={15} />
                    Delete selected task history
                  </button>
                )}
              </section>
            </>
          )}
        </div>
        <footer className="statusbar">
          <span>
            CHAI <b>0.1.0 alpha</b>
          </span>
          <span>Local-first · Approvals required · Recoverable history</span>
        </footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
