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
  version: "",
  bridge: {
    preferredOrigin: "",
    state: "stopped",
    error: null,
    url: null,
    connected: false,
    lastSeen: null,
    jobs: [],
  },
};
function App() {
  const [data, setData] = useState(blank),
    [route, setRoute] = useState("Chat"),
    [id, setId] = useState<string | null>(null),
    [goal, setGoal] = useState(""),
    [mode, setMode] = useState<Exclude<Mode, "local" | "chatgpt">>("browser"),
    [permission, setPermission] = useState<"review" | "workspace">("workspace"),
    [browserAccess, setBrowserAccess] = useState(false),
    [browserOrigins, setBrowserOrigins] = useState(""),
    [desktopTarget, setDesktopTarget] = useState<{
      id: string;
      title: string;
      pid: number;
    } | null>(null),
    [origin, setOrigin] = useState(""),
    [plan, setPlan] = useState(""),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [focus, setFocus] = useState(false),
    [url, setUrl] = useState("https://example.com"),
    [x, setX] = useState(0),
    [y, setY] = useState(0);
  const originLoaded = useRef(false);
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
    if (data.version && !originLoaded.current) {
      setOrigin(data.bridge.preferredOrigin);
      originLoaded.current = true;
    }
  }, [data.version, data.bridge.preferredOrigin]);
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
      permission,
      capabilities: {
        browser: browserAccess,
        origins: browserAccess
          ? browserOrigins
              .split(/[\s,]+/)
              .filter(Boolean)
              .map((v) => v.replace(/\/$/, ""))
          : [],
        ...(desktopTarget ? { desktop: desktopTarget } : {}),
      },
      model: "ChatGPT browser · user-selected model",
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
          {task?.mode === "browser" ? "ChatGPT" : "Recipe"}
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
          <small>ON PC</small>
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
            Actions on your machine.
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
              <span className="dot" />{" "}
              {data.bridge.connected
                ? "ChatGPT tools connected"
                : "Connect ChatGPT tools"}
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
                <label className="permission-choice">
                  <ShieldCheck size={16} />
                  <select
                    aria-label="Task permissions"
                    value={permission}
                    onChange={(e) =>
                      setPermission(e.target.value as "review" | "workspace")
                    }
                  >
                    <option value="workspace">
                      Autonomous in this workspace
                    </option>
                    <option value="review">Review each plan</option>
                  </select>
                  <span>
                    {permission === "workspace"
                      ? "Starting authorizes file edits, Git inspection and isolated tests. Git commits require a separate confirmation. Stop or revoke anytime."
                      : "Preview and approve each round before it runs."}
                  </span>
                </label>
                <details className="tool-access">
                  <summary>Browser and desktop access</summary>
                  <label>
                    <input
                      type="checkbox"
                      checked={browserAccess}
                      onChange={(e) => setBrowserAccess(e.target.checked)}
                    />{" "}
                    Allow project previews and task browser
                  </label>
                  {browserAccess && (
                    <label>
                      Allowed website origins (optional)
                      <input
                        aria-label="Allowed website origins"
                        placeholder="https://example.com"
                        value={browserOrigins}
                        onChange={(e) => setBrowserOrigins(e.target.value)}
                      />
                    </label>
                  )}
                  <p>
                    Observations and screenshots from enabled tools go to your
                    ChatGPT conversations. Website access stays within these
                    origins. Sensitive submissions still ask.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      const target = await call({ op: "desktop-select" });
                      if (target)
                        setDesktopTarget(
                          target as { id: string; title: string; pid: number },
                        );
                    }}
                  >
                    Choose desktop window
                  </button>
                  {desktopTarget && (
                    <span>
                      {desktopTarget.title}{" "}
                      <button
                        type="button"
                        onClick={() => setDesktopTarget(null)}
                      >
                        Remove window access
                      </button>
                    </span>
                  )}
                </details>
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
                    onChange={(e) =>
                      setMode(
                        e.target.value as Exclude<Mode, "local" | "chatgpt">,
                      )
                    }
                  >
                    <option value="recipe">Offline recipes · not AI</option>
                    <option value="assisted">ChatGPT · manual handoff</option>
                    <option value="browser">ChatGPT browser · 3 roles</option>
                  </select>
                  <button
                    className="send"
                    aria-label="Create task"
                    disabled={
                      busy ||
                      !data.workspace ||
                      !goal.trim() ||
                      (mode === "browser" && !data.bridge.connected) ||
                      (mode === "assisted" && !plan.trim())
                    }
                  >
                    <ArrowUp size={20} />
                  </button>
                </footer>
              </form>
              <p className="caption">
                {mode === "browser"
                  ? "Your normal ChatGPT conversations plan, act and review with 6 High. Workspace authorization carries across repair rounds."
                  : "Your selected permission mode controls when actions run."}
              </p>
              {mode === "browser" && !data.bridge.connected && (
                <button
                  className="model-setup"
                  onClick={() => setRoute("Connections")}
                >
                  Connect ChatGPT to activate the AI team{" "}
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
                    <b>Normal ChatGPT</b> · model chosen in each role window
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
              {task?.autonomous && (
                <section className="autonomy-status">
                  <ShieldCheck size={18} />
                  <span>
                    Workspace authorized · automatic discovery, edits and tests
                  </span>
                  <button
                    onClick={() => void call({ op: "revoke", id: task.id })}
                  >
                    Revoke access
                  </button>
                </section>
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
                    File tools stay inside a dedicated folder. Python, Node and
                    Bash run against approved snapshots in an offline Linux
                    sandbox.
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
                  <h3>ChatGPT tool connection</h3>
                  <span className="badge">
                    {data.bridge.connected ? "Connected" : data.bridge.state}
                  </span>
                </div>
                <p>
                  ChatGPT does the thinking in its normal browser conversations.
                  Connect this CHAI plugin so those conversations can receive
                  jobs and return structured results. Your ChatGPT sign-in stays
                  in the browser.
                </p>
                <div className="toolbar">
                  <button
                    disabled={["starting", "ready"].includes(data.bridge.state)}
                    onClick={() =>
                      void call({
                        op: "bridge-start",
                        origin: origin.trim() || undefined,
                      })
                    }
                  >
                    {data.bridge.state === "starting"
                      ? "Starting connection…"
                      : "Start tool connection"}
                  </button>
                  <button onClick={() => void call({ op: "bridge-plugins" })}>
                    Open ChatGPT Plugins <ArrowUpRight size={14} />
                  </button>
                  <button
                    disabled={data.bridge.state === "stopped"}
                    onClick={() => void call({ op: "bridge-stop" })}
                  >
                    Disconnect tools
                  </button>
                </div>
                {data.bridge.url && (
                  <div className="toolbar">
                    <input
                      aria-label="CHAI tool URL"
                      readOnly
                      value={data.bridge.url}
                    />
                    <button onClick={() => void call({ op: "bridge-copy" })}>
                      Copy tool URL
                    </button>
                  </div>
                )}
                <p>
                  Add the tool URL as a custom MCP server in ChatGPT Plugins and
                  select OAuth. CHAI asks locally before pairing access to its
                  tools. This pairing does not provide model access or request
                  ChatGPT credentials.
                </p>
                <details>
                  <summary>Persistent connection address</summary>
                  <p>
                    A temporary connection gets a new URL when restarted. For a
                    stable connection, route your HTTPS domain to this
                    computer’s port 40671 and enter its origin. Stable
                    connections reconnect when CHAI opens; tasks stay paused
                    after a restart.
                  </p>
                  <input
                    aria-label="Stable HTTPS origin"
                    placeholder="https://chai.example.com"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                  />
                </details>
                {data.bridge.error && (
                  <p className="warning">{data.bridge.error}</p>
                )}
              </section>
              <section className="settings-card">
                <div className="card-title">
                  <Globe />
                  <h3>ChatGPT browser</h3>
                  <span className="badge">Interactive</span>
                </div>
                <p>
                  Open each role, select 6 High, and enable the CHAI plugin in
                  its conversation. CHAI pauses if the required browser controls
                  are unavailable.
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
                  Autonomous tasks use the workspace authorization you grant
                  when starting them. Discovery, edits, isolated tests and
                  repairs continue without repeated approval. Review mode asks
                  per plan. Pause or revoke at any time. Restart pauses
                  unfinished tasks; Resume retains the original workspace scope.
                </p>
                <p>
                  Python, Node and Bash run in Bubblewrap with only selected
                  file snapshots, no network, a read-only workspace and a
                  temporary output directory. Host credentials and browser
                  sessions are not mounted. Destructive host tools remain
                  unavailable.
                </p>
                <p>
                  Git review commits require confirmation of the exact
                  selected-file diff. They create a local CHAI branch while
                  preserving your current branch and staging area. CHAI does not
                  push commits.
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
            CHAI <b>{data.version}</b>
          </span>
          <span>
            Workspace-scoped · Under your control · Recoverable history
          </span>
        </footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
