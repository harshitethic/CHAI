import { app, BrowserWindow, desktopCapturer } from "electron";
import { ComputerTools } from "../src/main/computer";
import { Gateway } from "../src/core/gateway";
import { Store } from "../src/core/store";
import { join } from "node:path";
import type { Action } from "../src/core/contracts";
app.commandLine.appendSwitch("force-renderer-accessibility");
const base = process.env.CHAI_COMPUTER_TEST_DIR!;
app.setPath("userData", join(base, "profile"));
void app.whenReady().then(async () => {
  const parent = new BrowserWindow({
    width: 900,
    height: 650,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  await parent.loadURL("data:text/html,<h1>CHAI test host</h1>");
  const store = new Store(join(base, "test.sqlite"));
  const gateway = new Gateway(process.env.CHAI_COMPUTER_GATEWAY!);
  let consent = false,
    consentCalls = 0;
  const computer = new ComputerTools(
    store,
    gateway,
    () => parent,
    async () => {
      consentCalls++;
      return consent;
    },
  );
  const task = store.create(
    "Controlled browser fixture",
    join(base, "workspace"),
    "assisted",
    "",
  );
  task.capabilities = { browser: true, origins: [] };
  store.put(task);
  Object.assign(globalThis, {
    computerTest: {
      task,
      execute: (action: Extract<Action, { tool: "browser" | "desktop" }>) =>
        computer.execute(task, action, new AbortController().signal),
      executeCanceled: async (action: Extract<Action, { tool: "browser" }>) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 350);
        try {
          return await computer.execute(task, action, controller.signal);
        } finally {
          clearTimeout(timer);
        }
      },
      deny: () => {
        task.capabilities!.browser = false;
      },
      allow: () => {
        task.capabilities!.browser = true;
      },
      consent: (value: boolean) => {
        consent = value;
      },
      consentCalls: () => consentCalls,
      imageCount: () =>
        Number(store.db.prepare("SELECT count(*) n FROM task_images").get()!.n),
      createDesktop: async () => {
        const win = new BrowserWindow({
          width: 600,
          height: 400,
          title: "Disposable editor",
          webPreferences: {
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
          },
        });
        await win.loadURL(
          "data:text/html,<title>Disposable editor</title><textarea autofocus style='width:90%;height:200px'></textarea>",
        );
        const xid = win.getNativeWindowHandle().readUInt32LE(0);
        const pid = Number(
          (
            await gateway.run(
              "/usr/bin/xdotool",
              ["getwindowpid", String(xid)],
              task.root,
            )
          ).trim(),
        );
        await new Promise((r) => setTimeout(r, 600));
        const source = (
          await desktopCapturer.getSources({
            types: ["window"],
            thumbnailSize: { width: 1440, height: 1000 },
          })
        ).find((s) => s.name === "Disposable editor");
        if (!source) throw Error("Fixture source unavailable");
        task.capabilities!.desktop = {
          id: source.id,
          title: "Disposable editor",
          pid,
        };
        return xid;
      },
      desktopValue: () =>
        BrowserWindow.getAllWindows()
          .find((w) => w.getTitle() === "Disposable editor")!
          .webContents.executeJavaScript(
            "document.querySelector('textarea').value",
          ),
      tamperPid: () => {
        task.capabilities!.desktop!.pid =
          (task.capabilities!.desktop!.pid ?? 0) + 10000;
      },
      close: () => {
        computer.close();
        gateway.stop();
        store.close();
        app.quit();
      },
    },
  });
});
