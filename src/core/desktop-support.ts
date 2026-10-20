export function desktopSupport(
  platform: string = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): { available: boolean; reason: string; backend?: "x11" | "wayland" } {
  if (platform !== "linux")
    return {
      available: false,
      reason: "Desktop control requires Linux X11 or a Wayland desktop portal.",
    };
  if (env.XDG_SESSION_TYPE?.toLowerCase() === "wayland" || env.WAYLAND_DISPLAY)
    return {
      available: true,
      backend: "wayland",
      reason:
        "Wayland session detected. Choose a source through your desktop's sharing portal to allow capture and input. Requires a RemoteDesktop portal backend and PipeWire GStreamer support.",
    };
  if (!env.DISPLAY)
    return {
      available: false,
      reason: "No X11 display is available for desktop control.",
    };
  return {
    available: true,
    backend: "x11",
    reason:
      "X11 session detected. Desktop control requires xdotool and a selected window for task input.",
  };
}

export function requireDesktopSupport(x11Only = false) {
  const support = desktopSupport();
  if (!support.available) throw Error(support.reason);
  if (x11Only && support.backend !== "x11")
    throw Error(
      "This manual click tool requires X11. On Wayland, choose a shared desktop source for a task.",
    );
}
