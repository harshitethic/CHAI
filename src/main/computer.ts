import {
  BrowserWindow,
  desktopCapturer,
  dialog,
  protocol,
  session,
} from "electron";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import type { Action, Capabilities, Task } from "../core/contracts";
import type { Gateway } from "../core/gateway";
import type { Store } from "../core/store";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "chai-preview",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);
type ComputerAction = Extract<Action, { tool: "browser" | "desktop" }>;
type Frame = {
  id: string;
  created: number;
  width: number;
  height: number;
  targetWidth: number;
  targetHeight: number;
};
const forbiddenOrigin = (url: URL) =>
  /(^|\.)(chatgpt\.com|openai\.com)$/.test(url.hostname);
export class ComputerTools {
  private windows = new Map<string, BrowserWindow>();
  private frames = new Map<string, Frame>();
  constructor(
    readonly store: Store,
    readonly gateway: Gateway,
    readonly parent: () => BrowserWindow,
    readonly consent: (title: string, detail: string) => Promise<boolean>,
  ) {}
  async selectDesktop(): Promise<Capabilities["desktop"] | null> {
    if (
      process.platform !== "linux" ||
      process.env.XDG_SESSION_TYPE === "wayland"
    )
      throw Error("Selected-window control currently requires Linux X11.");
    const sources = (
      await desktopCapturer.getSources({
        types: ["window"],
        thumbnailSize: { width: 0, height: 0 },
      })
    ).filter((s) => !/CHAI|ChatGPT|password|sign.?in/i.test(s.name));
    const choice = await dialog.showMessageBox(this.parent(), {
      title: "Authorize one desktop window",
      message: "Choose a window CHAI may control and show to ChatGPT",
      detail:
        "Starting a task with this selection allows screenshots, clicks and text input in this window. Use a disposable editor or test application. Terminal and browser windows use their separate tools. Closing/replacing the window invalidates access. Stop or revoke at any time.",
      buttons: [
        "Cancel",
        ...sources.slice(0, 15).map((s) => s.name.slice(0, 100)),
      ],
      cancelId: 0,
      defaultId: 0,
    });
    if (!choice.response) return null;
    const source = sources[choice.response - 1];
    const xid = source.id.split(":")[1];
    const wmClass = await this.gateway.run(
      "/usr/bin/xprop",
      ["-id", xid, "WM_CLASS"],
      this.parentRoot(),
    );
    if (
      /term|console|chrom|brave|firefox|browser|password|keepass/i.test(wmClass)
    )
      throw Error(
        "Use the isolated browser or sandbox terminal tools for this application.",
      );
    const pid = Number(
      (
        await this.gateway.run(
          "/usr/bin/xdotool",
          ["getwindowpid", xid],
          this.parentRoot(),
        )
      ).trim(),
    );
    if (!Number.isInteger(pid) || pid <= 0)
      throw Error("Cannot verify the selected window process.");
    return { id: source.id, title: source.name, pid };
  }
  private parentRoot() {
    return this.store.setting("workspace") || "/tmp";
  }
  private allowed(task: Task, raw: string) {
    try {
      const u = new URL(raw);
      if (u.username || u.password) return false;
      if (u.protocol === "chai-preview:") return u.hostname === task.id;
      return (
        u.protocol === "https:" &&
        !forbiddenOrigin(u) &&
        (task.capabilities?.origins ?? []).some(
          (origin) => new URL(origin).origin === u.origin,
        )
      );
    } catch {
      return false;
    }
  }
  private async window(task: Task) {
    let win = this.windows.get(task.id);
    if (win && !win.isDestroyed()) return win;
    const part = session.fromPartition("chai-task-" + task.id);
    part.setPermissionRequestHandler((_w, _p, cb) => cb(false));
    part.setPermissionCheckHandler(() => false);
    part.on("will-download", (e) => e.preventDefault());
    part.webRequest.onBeforeRequest((details, cb) =>
      cb({
        cancel:
          !this.allowed(task, details.url) &&
          !details.url.startsWith("data:") &&
          details.url !== "about:blank",
      }),
    );
    part.protocol.handle("chai-preview", async (request) => {
      try {
        const u = new URL(request.url);
        if (u.hostname !== task.id || request.method !== "GET")
          return new Response("Denied", { status: 403 });
        const path = decodeURIComponent(u.pathname.slice(1)) || "index.html";
        const result = await this.gateway.file(task.root, "read", path);
        if (result.content == null)
          return new Response("Not found", { status: 404 });
        const mime: Record<string, string> = {
          ".html": "text/html",
          ".css": "text/css",
          ".js": "text/javascript",
          ".json": "application/json",
          ".svg": "image/svg+xml",
          ".txt": "text/plain",
        };
        return new Response(result.content, {
          headers: {
            "Content-Type":
              (mime[extname(path)] || "text/plain") + "; charset=utf-8",
            "Content-Security-Policy":
              "default-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
          },
        });
      } catch {
        return new Response("Workspace resource denied", { status: 403 });
      }
    });
    win = new BrowserWindow({
      ...this.parent().getBounds(),
      title: "CHAI · task browser",
      webPreferences: {
        session: part,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
      },
    });
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (e, url) => {
      if (!this.allowed(task, url)) e.preventDefault();
    });
    win.webContents.on("will-redirect", (e, url) => {
      if (!this.allowed(task, url)) e.preventDefault();
    });
    win.on("closed", () => {
      this.windows.delete(task.id);
      this.frames.delete(task.id);
    });
    this.windows.set(task.id, win);
    return win;
  }
  private async isolated(win: BrowserWindow, code: string) {
    const result = await win.webContents.executeJavaScriptInIsolatedWorld(999, [
      {
        code: `(() => {try {return {ok:true,value:(${code})};} catch(error) {return {ok:false,error:String(error)};}})()`,
      },
    ]);
    if (!result.ok) throw Error(result.error);
    return result.value;
  }
  private async browserObservation(
    task: Task,
    win: BrowserWindow,
    signal: AbortSignal,
  ) {
    signal.throwIfAborted();
    const id = randomUUID();
    const data = await this.isolated(
      win,
      `(() => {
      const nodes = [...document.querySelectorAll('a,button,input,textarea,select,[role=button],[contenteditable=true]')].filter(e => e.getClientRects().length).slice(0,100);
      globalThis.__chaiObservations ??= new Map();
      globalThis.__chaiObservation = {id: ${JSON.stringify(id)}, url: location.href, created: Date.now(), nodes};
      globalThis.__chaiObservations.set(globalThis.__chaiObservation.id, globalThis.__chaiObservation);
      if(globalThis.__chaiObservations.size>8)globalThis.__chaiObservations.delete(globalThis.__chaiObservations.keys().next().value);
      return {url:location.href,title:document.title,text:document.body?.innerText.slice(0,9000) || '',controls:nodes.map((e,i) => ({ref:'e'+i,tag:e.tagName.toLowerCase(),type:e.getAttribute('type'),label:(e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.innerText || '').slice(0,160),disabled:!!e.disabled}))};
    })()`,
    );
    if (!this.allowed(task, data.url))
      throw Error("Browser left its authorized origin.");
    win.show();
    await new Promise((resolve) => setTimeout(resolve, 300));
    signal.throwIfAborted();
    const screenshot = await win.webContents.capturePage();
    signal.throwIfAborted();
    const resized = screenshot.resize({
      width: Math.min(1440, screenshot.getSize().width),
    });
    const imageId = this.store.image(task.id, resized.toJPEG(70));
    return {
      ...data,
      snapshot: id,
      imageId,
      imageWidth: resized.getSize().width,
      imageHeight: resized.getSize().height,
    };
  }
  async execute(
    task: Task,
    action: ComputerAction,
    signal: AbortSignal,
  ): Promise<unknown> {
    signal.throwIfAborted();
    if (action.tool === "desktop") return this.desktop(task, action, signal);
    if (!task.capabilities?.browser)
      throw Error("Browser access is not authorized.");
    const win = await this.window(task);
    if (action.operation === "open" || action.operation === "preview") {
      const url =
        action.operation === "preview"
          ? "chai-preview://" +
            task.id +
            "/" +
            (action.path ?? "index.html")
              .split("/")
              .map(encodeURIComponent)
              .join("/")
          : action.url;
      if (!url || !this.allowed(task, url))
        throw Error(
          "Browser destination is outside the task's authorized origins.",
        );
      await win.loadURL(url);
    } else if (action.operation !== "observe") {
      if (!action.snapshot || !action.ref)
        throw Error(
          "Browser input requires an observed snapshot and target ref.",
        );
      const info = await this.isolated(
        win,
        `(() => {
        const s=globalThis.__chaiObservations?.get(${JSON.stringify(action.snapshot)});
        if(!s || s.id!==${JSON.stringify(action.snapshot)} || s.url!==location.href || Date.now()-s.created>600000)throw Error('Stale browser observation; observe again.');
        const i=Number(${JSON.stringify(action.ref ?? "")}.slice(1)), e=s.nodes[i];
        if(!e || !e.isConnected || !e.getClientRects().length || e.disabled)throw Error('Observed target is unavailable.');
        const type=e.getAttribute('type')||'';
        if(type==='password' || type==='file' || /password|credit.?card|card.?number|otp|one.?time|security.?code/i.test(e.getAttribute('autocomplete')||''))throw Error('Credential entry requires the user.');
        e.scrollIntoView({block:'center'});
        const r=e.getBoundingClientRect();
        return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),tag:e.tagName,type,label:(e.getAttribute('aria-label')||e.innerText||'').slice(0,200),form:!!e.closest('form'),editable:e.matches('input,textarea,[contenteditable=true]')};
      })()`,
      );
      const sensitive =
        /delete|remove|purchase|buy|pay|checkout|send|publish|transfer|confirm|sign.?out|log.?out/i.test(
          info.label,
        ) ||
        (action.operation === "click" &&
          info.form &&
          (info.tag === "BUTTON" || info.type === "submit")) ||
        (action.operation === "key" && action.key === "Enter" && info.form);
      if (
        sensitive &&
        !(await this.consent(
          "Confirm website action",
          "Task: " +
            task.goal +
            "\nTarget: " +
            info.label +
            "\nURL: " +
            win.webContents.getURL(),
        ))
      )
        throw Error("Website action declined.");
      signal.throwIfAborted();
      win.show();
      if (action.operation === "click") {
        win.webContents.sendInputEvent({
          type: "mouseDown",
          x: info.x,
          y: info.y,
          button: "left",
          clickCount: 1,
        });
        win.webContents.sendInputEvent({
          type: "mouseUp",
          x: info.x,
          y: info.y,
          button: "left",
          clickCount: 1,
        });
      } else if (action.operation === "type") {
        if (!info.editable || action.text === undefined)
          throw Error("Type requires an editable observed target and text.");
        await this.isolated(
          win,
          `globalThis.__chaiObservations.get(${JSON.stringify(action.snapshot)}).nodes[Number(${JSON.stringify(action.ref)}.slice(1))].focus()`,
        );
        await win.webContents.insertText(action.text);
      } else if (action.operation === "key") {
        if (!action.key) throw Error("Key is required.");
        await this.isolated(
          win,
          `globalThis.__chaiObservations.get(${JSON.stringify(action.snapshot)}).nodes[Number(${JSON.stringify(action.ref)}.slice(1))].focus()`,
        );
        win.webContents.sendInputEvent({
          type: "keyDown",
          keyCode: action.key,
        });
        win.webContents.sendInputEvent({ type: "keyUp", keyCode: action.key });
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    return this.browserObservation(task, win, signal);
  }
  private async desktop(
    task: Task,
    action: Extract<ComputerAction, { tool: "desktop" }>,
    signal: AbortSignal,
  ) {
    const grant = task.capabilities?.desktop;
    if (!grant) throw Error("No desktop window authorized.");
    if (process.env.XDG_SESSION_TYPE === "wayland")
      throw Error("Desktop control requires X11.");
    const xid = grant.id.split(":")[1];
    const run = (args: string[]) =>
      this.gateway.run("/usr/bin/xdotool", args, task.root, signal);
    const pid = Number((await run(["getwindowpid", xid])).trim());
    if (pid !== grant.pid)
      throw Error("Authorized desktop window was replaced. Select it again.");
    const geometry = await run(["getwindowgeometry", "--shell", xid]);
    const width = Number(geometry.match(/^WIDTH=(\d+)$/m)?.[1]),
      height = Number(geometry.match(/^HEIGHT=(\d+)$/m)?.[1]);
    if (!width || !height) throw Error("Cannot determine window geometry.");
    if (action.operation !== "observe") {
      const frame = this.frames.get(task.id);
      if (
        !frame ||
        action.snapshot !== frame.id ||
        Date.now() - frame.created > 600000 ||
        width !== frame.targetWidth ||
        height !== frame.targetHeight
      )
        throw Error(
          "Desktop observation is stale; observe the selected window again.",
        );
      if (
        (action.operation === "key" && action.key === "Return") ||
        (action.operation === "type" &&
          /[\r\n]|\b(sudo|rm|shutdown|reboot|mkfs)\b/.test(action.text ?? ""))
      )
        if (
          !(await this.consent(
            "Confirm desktop input",
            "Selected window: " +
              grant.title +
              "\nInput can submit an action.\n" +
              (action.text ?? action.key),
          ))
        )
          throw Error("Desktop input declined.");
      signal.throwIfAborted();
      await run(["windowactivate", "--sync", xid]);
      if (action.operation === "click") {
        if (
          action.x === undefined ||
          action.y === undefined ||
          action.x >= frame.width ||
          action.y >= frame.height
        )
          throw Error("Click is outside the selected window screenshot.");
        await run([
          "mousemove",
          "--sync",
          "--window",
          xid,
          String(Math.floor((action.x * width) / frame.width)),
          String(Math.floor((action.y * height) / frame.height)),
        ]);
        // Recheck focus immediately before sending input.
        if ((await run(["getactivewindow"])).trim() !== xid)
          throw Error("Desktop focus changed; action stopped.");
        await run(["click", "1"]);
      } else if (action.operation === "type") {
        if (action.text === undefined) throw Error("Text is required.");
        if ((await run(["getactivewindow"])).trim() !== xid)
          throw Error("Desktop focus changed; action stopped.");
        await run([
          "type",
          "--clearmodifiers",
          "--delay",
          "0",
          "--",
          action.text,
        ]);
      } else if (action.operation === "key") {
        if (!action.key) throw Error("Key is required.");
        if ((await run(["getactivewindow"])).trim() !== xid)
          throw Error("Desktop focus changed; action stopped.");
        await run(["key", "--clearmodifiers", action.key]);
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    const sources = await desktopCapturer.getSources({
      types: ["window"],
      thumbnailSize: { width: 1440, height: 1000 },
    });
    const source = sources.find((s) => s.id === grant.id);
    if (!source || source.thumbnail.isEmpty())
      throw Error("Cannot capture the authorized window.");
    signal.throwIfAborted();
    const size = source.thumbnail.getSize(),
      id = randomUUID();
    this.frames.set(task.id, {
      id,
      created: Date.now(),
      width: size.width,
      height: size.height,
      targetWidth: width,
      targetHeight: height,
    });
    return {
      snapshot: id,
      title: source.name,
      width: size.width,
      height: size.height,
      imageId: this.store.image(task.id, source.thumbnail.toJPEG(70)),
    };
  }
  closeTask(id: string) {
    this.windows.get(id)?.close();
    this.frames.delete(id);
  }
  close() {
    for (const win of this.windows.values()) win.close();
    this.frames.clear();
  }
}
