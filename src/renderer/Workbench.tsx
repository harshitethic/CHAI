import React, { useState, useEffect, useRef } from "react";
import type { Task, Snapshot, Request } from "../core/contracts";
import {
  Terminal,
  Files,
  GitCompare,
  Globe,
  Download,
  ArrowUp,
  Paperclip,
  Square,
  RefreshCw,
} from "lucide-react";
const tabs = [
  ["terminal", "Terminal", Terminal],
  ["files", "Files", Files],
  ["diff", "Changes", GitCompare],
  ["preview", "Preview", Globe],
  ["outputs", "Outputs", Download],
] as const;
function EmbeddedPreview({ taskId, url }: { taskId: string; url: string }) {
  const ref = useRef<HTMLDivElement>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const place = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!live) return;
        const rect = element.getBoundingClientRect();
        const x = Math.max(0, Math.ceil(rect.x)),
          y = Math.max(0, Math.ceil(rect.y));
        const width = Math.floor(Math.min(rect.right, window.innerWidth) - x),
          height = Math.floor(Math.min(rect.bottom, window.innerHeight) - y);
        void window.chai
          .request({
            op: "preview-embed",
            id: taskId,
            ...(width > 10 && height > 10
              ? { bounds: { x, y, width, height } }
              : {}),
          })
          .catch((e) => {
            if (live) setError(String(e));
          });
      }, 80);
    };
    const observer = new ResizeObserver(place);
    observer.observe(element);
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    place();
    return () => {
      live = false;
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
      void window.chai
        .request({ op: "preview-embed", id: taskId })
        .catch(() => {});
    };
  }, [taskId, url]);
  return (
    <div
      ref={ref}
      className="embedded-preview"
      aria-label="Interactive local app preview"
    >
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <p>Loading interactive preview…</p>
      )}
    </div>
  );
}
export function Workbench({
  task,
  data,
  refresh,
}: {
  task: Task;
  data: Snapshot;
  refresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<string>("terminal"),
    [followup, setFollowup] = useState(""),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false),
    [panel, setPanel] = useState<unknown>(null),
    [loading, setLoading] = useState(false),
    [terminalInput, setTerminalInput] = useState("");
  const [command, setCommand] = useState(""),
    [commandTarget, setCommandTarget] = useState<"project" | "host">("project");
  const sessions = data.evidenceTaskId === task.id ? (data.sessions ?? []) : [];
  const [selectedSession, setSelectedSession] = useState("");
  const session =
    sessions.find((s) => s.id === selectedSession) ?? sessions.at(-1);
  async function run(request: Request) {
    setError("");
    try {
      const result = await window.chai.request(request);
      await refresh();
      return result;
    } catch (e) {
      setError(String(e));
      throw e;
    }
  }
  useEffect(() => {
    let canceled = false;
    if (tab !== "files" && tab !== "diff") return;
    setLoading(true);
    window.chai
      .request({
        op: "project-panel",
        id: task.id,
        operation: tab === "files" ? "files" : "diff",
      })
      .then((result) => {
        if (!canceled) setPanel(result);
      })
      .catch((e) => {
        if (!canceled) setError(String(e));
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [tab, task.id, task.cursor]);
  const files =
    panel && typeof panel === "object" && "files" in panel
      ? (panel as { files: string[] }).files
      : [];
  const patch =
    panel && typeof panel === "object" && "patch" in panel
      ? String(panel.patch)
      : "";
  const lines =
    panel && typeof panel === "object" && "lines" in panel
      ? (panel as { lines: string[] }).lines
      : null;
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!followup.trim()) return;
    setSending(true);
    try {
      await run({ op: "followup", id: task.id, text: followup });
      setFollowup("");
    } catch {
      /* Visible error retained. */
    } finally {
      setSending(false);
    }
  }
  return (
    <section className="workbench" aria-label="Task workspace">
      {error ? (
        <div className="error" role="alert">
          {error}
          <button
            onClick={() => setError("")}
            aria-label="Dismiss workspace error"
          >
            ×
          </button>
        </div>
      ) : null}
      {task.state === "WAITING_PROVIDER" ? (
        <div className="work-status">
          <span className="status-dot WAITING_PROVIDER" />
          ChatGPT needs attention. Open the role conversation, resolve its
          prompt or connection issue, then resume.
          <button
            onClick={() =>
              void run({ op: "resume", id: task.id }).catch(() => {})
            }
          >
            <RefreshCw size={14} />
            Retry connection
          </button>
        </div>
      ) : null}
      {task.state === "WAITING_APPROVAL" ? (
        <div className="work-status">
          Waiting for you · review the proposed actions above.
        </div>
      ) : null}
      <div
        className="workbench-tabs"
        role="tablist"
        aria-label="Workspace views"
      >
        {tabs.map(([key, label, Icon]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            aria-controls={"panel-" + key}
            id={"tab-" + key}
            onClick={() => {
              setPanel(null);
              setTab(key);
            }}
          >
            <Icon size={15} />
            {label}
            {key === "terminal" &&
            sessions.some((s) => s.state === "running") ? (
              <span className="dot" />
            ) : null}
            {key === "outputs" && (data.artifacts?.length ?? 0) > 0 ? (
              <span className="count">{data.artifacts!.length}</span>
            ) : null}
          </button>
        ))}
      </div>
      <div
        className="workbench-panel"
        role="tabpanel"
        id={"panel-" + tab}
        aria-labelledby={"tab-" + tab}
      >
        {tab === "terminal" ? (
          <>
            {session ? (
              <>
                <div className="terminal-head">
                  <select
                    aria-label="Terminal session"
                    value={session.id}
                    onChange={(e) => setSelectedSession(e.target.value)}
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.target === "host" ? "Host" : "Project"} · {s.program}{" "}
                        {s.args.join(" ").slice(0, 80)} · {s.state}
                        {s.durable ? " · survives app close" : ""}
                      </option>
                    ))}
                  </select>
                  <span>
                    {session.state === "running"
                      ? "Running"
                      : session.state === "interrupted"
                        ? "Interrupted"
                        : `Exit ${session.exitCode}`}
                  </span>
                  {session.state === "running" ? (
                    <button
                      onClick={() =>
                        void run({
                          op: "terminal-stop",
                          id: task.id,
                          sessionId: session.id,
                        }).catch(() => {})
                      }
                    >
                      <Square size={13} />
                      Stop process
                    </button>
                  ) : null}
                </div>
                <pre
                  className="terminal-output"
                  aria-label="Terminal output"
                  tabIndex={0}
                >
                  {session.output || "Waiting for output…"}
                </pre>
                {session.termination ? (
                  <p className="warning">{session.termination}</p>
                ) : null}
                {session.state === "running" ? (
                  <form
                    className="terminal-input"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run({
                        op: "terminal-input",
                        id: task.id,
                        sessionId: session.id,
                        input: terminalInput + "\n",
                      })
                        .then(() => setTerminalInput(""))
                        .catch(() => {});
                    }}
                  >
                    <input
                      aria-label="Terminal input"
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      placeholder="Send input to this process"
                    />
                    <button>Send</button>
                  </form>
                ) : null}
              </>
            ) : (
              <p className="panel-empty">
                Commands and their live output will appear here.
                {!task.capabilities?.project && !task.capabilities?.host
                  ? " Enable project execution on a new task to run builds and install dependencies."
                  : ""}
              </p>
            )}
            {(task.capabilities?.project || task.capabilities?.host) && (
              <form
                className="terminal-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = !task.capabilities?.host
                    ? "project"
                    : task.capabilities?.project
                      ? commandTarget
                      : "host";
                  void run({
                    op: "terminal-start",
                    id: task.id,
                    command,
                    target,
                    background: true,
                  })
                    .then(() => setCommand(""))
                    .catch(() => {});
                }}
              >
                <select
                  aria-label="Command environment"
                  value={
                    !task.capabilities?.host
                      ? "project"
                      : task.capabilities?.project
                        ? commandTarget
                        : "host"
                  }
                  onChange={(e) =>
                    setCommandTarget(e.target.value as "project" | "host")
                  }
                >
                  {task.capabilities?.project && (
                    <option value="project">Isolated project</option>
                  )}
                  {task.capabilities?.host && (
                    <option value="host">Host computer</option>
                  )}
                </select>
                <input
                  aria-label="New terminal command"
                  placeholder="Run a command (pause the agent first)"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  required
                />
                <button
                  disabled={["PLANNING", "RUNNING", "VALIDATING"].includes(
                    task.state,
                  )}
                >
                  Run
                </button>
              </form>
            )}
          </>
        ) : null}
        {tab === "files" ? (
          <>
            {loading ? (
              <p>Loading project files…</p>
            ) : lines ? (
              <>
                <button
                  onClick={() =>
                    void run({
                      op: "project-panel",
                      id: task.id,
                      operation: "files",
                    })
                      .then(setPanel)
                      .catch(() => {})
                  }
                >
                  Back to files
                </button>
                <pre className="file-content">
                  {lines
                    .map((line, i) => `${String(i + 1).padStart(4)}  ${line}`)
                    .join("\n")}
                </pre>
              </>
            ) : (
              <div className="file-list">
                {files.map((path) => (
                  <button
                    key={path}
                    onClick={() =>
                      void run({
                        op: "project-panel",
                        id: task.id,
                        operation: "read",
                        path,
                      })
                        .then(setPanel)
                        .catch(() => {})
                    }
                  >
                    <Files size={14} />
                    {path}
                  </button>
                ))}
              </div>
            )}
            <p className="muted">
              Source files · dependencies and credential files excluded. The
              agent can paginate larger projects.
            </p>
          </>
        ) : null}
        {tab === "diff" ? (
          <>
            {loading ? (
              <p>Loading changes…</p>
            ) : patch ? (
              <div className="diff-view">
                <div className="diff-heading">
                  <b>Before</b>
                  <b>After</b>
                </div>
                {patch.split("\n").map((line, i) => (
                  <div
                    key={i}
                    className={
                      "diff-row " +
                      (line.startsWith("+")
                        ? "added"
                        : line.startsWith("-")
                          ? "removed"
                          : "")
                    }
                  >
                    <pre>{line.startsWith("+") ? "" : line}</pre>
                    <pre>{line.startsWith("-") ? "" : line}</pre>
                  </div>
                ))}
              </div>
            ) : (
              <p className="panel-empty">
                No tracked changes to show. Commit results and review evidence
                remain in the activity feed.
              </p>
            )}
          </>
        ) : null}
        {tab === "preview" ? (
          data.preview ? (
            <>
              <div className="preview-toolbar">
                <span>{data.preview.url}</span>
                <button
                  onClick={() =>
                    void run({ op: "preview-show", id: task.id }).catch(
                      () => {},
                    )
                  }
                >
                  Open interactive preview
                </button>
              </div>
              {data.preview.url.startsWith("http://127.0.0.1:") ? (
                <EmbeddedPreview taskId={task.id} url={data.preview.url} />
              ) : data.preview.image ? (
                <img
                  className="app-preview"
                  src={data.preview.image}
                  alt={data.preview.title || "Latest browser observation"}
                />
              ) : null}
              <p className="muted">
                Local apps are interactive here. Website captures show the
                latest observation.
              </p>
              {data.preview.errors?.length ? (
                <details>
                  <summary>
                    Browser errors ({data.preview.errors.length})
                  </summary>
                  <pre>{data.preview.errors.join("\n")}</pre>
                </details>
              ) : null}
            </>
          ) : (
            <p className="panel-empty">
              Ask CHAI to start the app and open its local preview. Browser
              observations and errors appear here.
            </p>
          )
        ) : null}
        {tab === "outputs" ? (
          <div className="output-list">
            {data.artifacts?.length ? (
              data.artifacts.map((a) => (
                <article key={a.path}>
                  <div>
                    <strong>{a.title}</strong>
                    <small>
                      {a.path} · {(a.bytes / 1024).toFixed(1)} KB
                    </small>
                  </div>
                  <button
                    onClick={() =>
                      void run({
                        op: "artifact-open",
                        id: task.id,
                        path: a.path,
                      }).catch(() => {})
                    }
                  >
                    Open
                  </button>
                  <button
                    onClick={() =>
                      void run({
                        op: "artifact-save",
                        id: task.id,
                        path: a.path,
                      }).catch(() => {})
                    }
                  >
                    <Download size={14} />
                    Save
                  </button>
                </article>
              ))
            ) : (
              <p className="panel-empty">
                Generated documents, spreadsheets, presentations, images and
                downloads appear here when registered.
              </p>
            )}
          </div>
        ) : null}
      </div>
      {task.messages?.length ? (
        <details className="followup-history">
          <summary>Your follow-ups ({task.messages.length})</summary>
          {task.messages.map((m, i) => (
            <p key={i}>{m.text}</p>
          ))}
        </details>
      ) : null}
      {task.mode === "browser" ? (
        <form className="followup-composer" onSubmit={send}>
          <textarea
            aria-label="Task follow-up"
            placeholder="Add a detail, change direction, or continue this task…"
            value={followup}
            onChange={(e) => setFollowup(e.target.value)}
          />
          <footer>
            <button
              type="button"
              onClick={() =>
                void run({ op: "attach", id: task.id })
                  .then((paths) => {
                    if (Array.isArray(paths) && paths.length)
                      setFollowup(
                        (v) => v + "\nUse attached files: " + paths.join(", "),
                      );
                  })
                  .catch(() => {})
              }
            >
              <Paperclip size={15} />
              Attach files
            </button>
            <span>Sending pauses current work and revises the plan.</span>
            <button className="primary" disabled={sending || !followup.trim()}>
              <ArrowUp size={16} />
              {sending ? "Updating…" : "Send follow-up"}
            </button>
          </footer>
        </form>
      ) : null}
      {task.sourceRoot ? (
        <p className="worktree-location">
          Working copy: {task.root}
          <br />
          Source: {task.sourceRoot}
        </p>
      ) : null}
    </section>
  );
}
export function ConnectorSettings({
  data,
  refresh,
}: {
  data: Snapshot;
  refresh: () => Promise<void>;
}) {
  const [name, setName] = useState(""),
    [url, setUrl] = useState(""),
    [token, setToken] = useState(""),
    [error, setError] = useState("");
  const [authMode, setAuthMode] = useState<"bearer" | "oauth">("oauth"),
    [clientId, setClientId] = useState(""),
    [issuer, setIssuer] = useState(""),
    [redirectPort, setRedirectPort] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await window.chai.request({
        op: "connector-save",
        name,
        url,
        token: token || undefined,
        auth: authMode,
        clientId: authMode === "oauth" ? clientId || undefined : undefined,
        issuer: authMode === "oauth" ? issuer || undefined : undefined,
        redirectPort:
          authMode === "oauth" && redirectPort
            ? Number(redirectPort)
            : undefined,
      });
      setToken("");
      setName("");
      setUrl("");
      setClientId("");
      setIssuer("");
      setRedirectPort("");
      setError("");
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <section className="settings-card">
      <h3>Connected app tools</h3>
      <p>
        Add an HTTPS MCP endpoint. Select which connections a task can use;
        remote actions show a native review. Bearer tokens are encrypted with
        your system keyring.
      </p>
      <p>
        Choose browser OAuth sign-in or a bearer token. OAuth credentials and
        refresh tokens stay encrypted in your system keyring-backed storage.
        This app sign-in is separate from ChatGPT’s pairing with CHAI.
      </p>
      {data.connectors?.map((c) => (
        <div className="toolbar" key={c.name}>
          <strong>{c.name}</strong>
          <span>{c.url}</span>
          {c.auth === "oauth" && (
            <>
              <span>
                {c.authStatus === "signing-in"
                  ? "Waiting for browser sign-in"
                  : c.authStatus === "signed-in"
                    ? "Signed in"
                    : "Sign-in needed"}
              </span>
              <button
                onClick={() =>
                  void window.chai
                    .request({
                      op:
                        c.authStatus === "signing-in"
                          ? "connector-cancel"
                          : c.authStatus === "signed-in"
                            ? "connector-sign-out"
                            : "connector-sign-in",
                      name: c.name,
                    })
                    .then(refresh)
                    .catch((e) => setError(String(e)))
                }
              >
                {c.authStatus === "signing-in"
                  ? "Cancel sign-in"
                  : c.authStatus === "signed-in"
                    ? "Sign out"
                    : "Sign in"}
              </button>
            </>
          )}
          <button
            onClick={() =>
              void window.chai
                .request({ op: "connector-remove", name: c.name })
                .then(refresh)
                .catch((e) => setError(String(e)))
            }
          >
            Remove
          </button>
        </div>
      ))}
      <form onSubmit={save} className="connector-form">
        <select
          aria-label="App authentication"
          value={authMode}
          onChange={(e) => {
            setAuthMode(e.target.value as "bearer" | "oauth");
            setToken("");
          }}
        >
          <option value="oauth">OAuth · sign in with browser</option>
          <option value="bearer">Bearer token / no authentication</option>
        </select>
        <input
          aria-label="Connector name"
          placeholder="github"
          pattern="[a-z0-9-]{1,40}"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          aria-label="MCP endpoint"
          placeholder="https://service.example/mcp"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        {authMode === "bearer" && (
          <input
            aria-label="Connector bearer token"
            placeholder="Bearer token (if required)"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        )}
        {authMode === "oauth" && (
          <details>
            <summary>Pre-registered OAuth client (optional)</summary>
            <p>
              Leave empty for automatic client registration. If the service
              requires registration, enter its public client ID and issuer.
              Register http://127.0.0.1:PORT/oauth/callback/NAME as the redirect
              URI using the port and connection name below.
            </p>
            <input
              aria-label="OAuth client ID"
              placeholder="Public client ID"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
            <input
              aria-label="OAuth issuer"
              placeholder="https://auth.service.example"
              type="url"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
            />
            <input
              aria-label="OAuth callback port"
              placeholder="Callback port (random when empty)"
              type="number"
              min={1024}
              max={65535}
              value={redirectPort}
              onChange={(e) => setRedirectPort(e.target.value)}
            />
          </details>
        )}
        <button>Save connection</button>
      </form>
      {error ? (
        <p role="alert" className="warning">
          {error}
        </p>
      ) : null}
    </section>
  );
}
