export function desktopSupport(
  platform: string = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): { available: boolean; reason: string } {
  if (platform !== "linux")
    return { available: false, reason: "Desktop control requires Linux X11." };
  if (env.XDG_SESSION_TYPE?.toLowerCase() === "wayland" || env.WAYLAND_DISPLAY)
    return {
      available: false,
      reason:
        "Wayland desktop control is not implemented. Use an X11 session for desktop input.",
    };
  if (!env.DISPLAY)
    return {
      available: false,
      reason: "No X11 display is available for desktop control.",
    };
  return {
    available: true,
    reason:
      "X11 session detected. Desktop control requires xdotool and a selected window for task input.",
  };
}

export function requireDesktopSupport() {
  const support = desktopSupport();
  if (!support.available) throw Error(support.reason);
}
