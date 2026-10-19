import { test } from "node:test";
import assert from "node:assert/strict";
import { desktopSupport } from "../src/core/desktop-support";

test("desktop control rejects Wayland including XWayland and incomplete session environments", () => {
  for (const env of [
    { XDG_SESSION_TYPE: "wayland", DISPLAY: ":0" },
    { WAYLAND_DISPLAY: "wayland-0", DISPLAY: ":0" },
    { XDG_SESSION_TYPE: "x11", WAYLAND_DISPLAY: "wayland-0", DISPLAY: ":0" },
  ]) {
    const support = desktopSupport("linux", env);
    assert.equal(support.available, false);
    assert.match(support.reason, /Wayland desktop control is not implemented/);
  }
  assert.equal(desktopSupport("linux", {}).available, false);
  assert.equal(desktopSupport("darwin", { DISPLAY: ":0" }).available, false);
  assert.equal(desktopSupport("linux", { DISPLAY: ":0" }).available, true);
  assert.equal(
    desktopSupport("linux", { XDG_SESSION_TYPE: "x11", DISPLAY: ":1" })
      .available,
    true,
  );
});
