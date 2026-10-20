"""Private JSON-lines bridge to an explicitly consented XDG desktop portal session."""
import base64
import json
import os
import secrets
import sys
import threading
import time

# Electron can leave Chromium descriptors inheritable. Never retain those in a helper.
for inherited_fd in os.listdir("/proc/self/fd"):
    if int(inherited_fd) > 2:
        try:
            os.close(int(inherited_fd))
        except OSError:
            pass

import gi
gi.require_version("Gio", "2.0")
gi.require_version("Gst", "1.0")
from gi.repository import Gio, GLib, Gst

Gst.init(None)
DEST = "org.freedesktop.portal.Desktop"
PATH = "/org/freedesktop/portal/desktop"
RD = "org.freedesktop.portal.RemoteDesktop"
SC = "org.freedesktop.portal.ScreenCast"


class Portal:
    def __init__(self):
        self.bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
        self.session = None
        self.pipeline = None
        self.fd = None
        self.closed = False
        self.stream = None
        self.properties = {}
        self.last = None

    def call(self, interface, method, signature, values, reply=None):
        return self.bus.call_sync(DEST, PATH, interface, method,
                                 GLib.Variant(signature, values),
                                 GLib.VariantType.new(reply) if reply else None,
                                 Gio.DBusCallFlags.NONE, 30000, None)

    def prop(self, interface, name):
        return self.call("org.freedesktop.DBus.Properties", "Get", "(ss)",
                         (interface, name), "(v)").unpack()[0]

    def request(self, interface, method, signature, args, options=None):
        token = "chai" + secrets.token_hex(12)
        sender = self.bus.get_unique_name()[1:].replace(".", "_")
        request_path = f"/org/freedesktop/portal/desktop/request/{sender}/{token}"
        received = threading.Event()
        result = []

        def response(_bus, _sender, _path, _interface, _signal, params):
            result.extend(params.unpack())
            received.set()

        subscription = self.bus.signal_subscribe(DEST, "org.freedesktop.portal.Request",
                                                "Response", request_path, None,
                                                Gio.DBusSignalFlags.NONE, response)
        try:
            opts = dict(options or {})
            opts["handle_token"] = GLib.Variant("s", token)
            returned = self.call(interface, method, signature, (*args, opts), "(o)").unpack()[0]
            if returned != request_path:
                raise RuntimeError("Portal returned an unexpected request handle")
            if not received.wait(180):
                self.bus.call_sync(DEST, request_path, "org.freedesktop.portal.Request", "Close",
                                   None, None, Gio.DBusCallFlags.NONE, 5000, None)
                raise RuntimeError("Desktop sharing approval timed out")
            if result[0] != 0:
                raise RuntimeError("Desktop sharing was canceled or denied")
            return result[1]
        finally:
            self.bus.signal_unsubscribe(subscription)

    def connect(self):
        for plugin in ("pipewiresrc", "videoconvert", "videoscale", "jpegenc", "appsink"):
            if not Gst.ElementFactory.find(plugin):
                raise RuntimeError(f"Missing GStreamer {plugin}; install gstreamer1.0-pipewire and base/good plugins")
        try:
            devices = self.prop(RD, "AvailableDeviceTypes")
            sources = self.prop(SC, "AvailableSourceTypes")
        except GLib.Error as error:
            raise RuntimeError("This Wayland session needs an XDG RemoteDesktop/ScreenCast portal backend (for example GNOME or KDE)") from error
        if devices & 3 != 3 or sources & 3 == 0:
            raise RuntimeError("Desktop portal does not provide keyboard, pointer and screen sharing")
        created = self.request(RD, "CreateSession", "(a{sv})", (), {
            "session_handle_token": GLib.Variant("s", "chai" + secrets.token_hex(12)),
        })
        self.session = created["session_handle"]
        self.bus.signal_subscribe(DEST, "org.freedesktop.portal.Session", "Closed", self.session,
                                  None, Gio.DBusSignalFlags.NONE, self.revoked)
        self.request(RD, "SelectDevices", "(oa{sv})", (self.session,), {"types": GLib.Variant("u", 3)})
        self.request(SC, "SelectSources", "(oa{sv})", (self.session,), {
            "types": GLib.Variant("u", sources & 3), "multiple": GLib.Variant("b", False),
            "cursor_mode": GLib.Variant("u", 2),
        })
        started = self.request(RD, "Start", "(osa{sv})", (self.session, ""))
        if started.get("devices", 0) & 3 != 3 or len(started.get("streams", [])) != 1:
            raise RuntimeError("Select exactly one source and allow keyboard and pointer control")
        self.stream, self.properties = started["streams"][0]
        value, fds = self.bus.call_with_unix_fd_list_sync(
            DEST, PATH, SC, "OpenPipeWireRemote", GLib.Variant("(oa{sv})", (self.session, {})),
            GLib.VariantType.new("(h)"), Gio.DBusCallFlags.NONE, 30000, None, None)
        self.fd = fds.get(value.unpack()[0])
        self.pipeline = Gst.parse_launch(
            f"pipewiresrc fd={self.fd} path={self.stream} do-timestamp=true ! "
            "videoconvert ! videoscale ! video/x-raw,width=(int)[1,1600],height=(int)[1,1200] ! "
            "jpegenc quality=80 ! appsink name=frames max-buffers=1 drop=true sync=false")
        self.pipeline.set_state(Gst.State.PLAYING)
        return self.capture()

    def revoked(self, *_args):
        self.closed = True
        if self.pipeline:
            self.pipeline.set_state(Gst.State.NULL)

    def capture(self):
        if self.closed or not self.pipeline:
            raise RuntimeError("Desktop sharing ended; choose the source again")
        sample = self.pipeline.get_by_name("frames").emit("try-pull-sample", 8 * Gst.SECOND)
        if self.closed:
            raise RuntimeError("Desktop sharing ended; choose the source again")
        if sample:
            caps = sample.get_caps().get_structure(0)
            width, height = caps.get_value("width"), caps.get_value("height")
            data = sample.get_buffer().extract_dup(0, sample.get_buffer().get_size())
            if len(data) > 2000000:
                raise RuntimeError("Portal screenshot exceeds 2 MB")
            logical = self.properties.get("logical_size", self.properties.get("size", (width, height)))
            self.last = {"width": width, "height": height, "logicalWidth": logical[0],
                         "logicalHeight": logical[1], "sourceType": self.properties.get("source_type", 1),
                         "image": base64.b64encode(data).decode()}
        else:
            error = self.pipeline.get_bus().pop_filtered(Gst.MessageType.ERROR)
            if error:
                raise RuntimeError(str(error.parse_error()[0]))
            if not self.last:
                raise RuntimeError("No PipeWire frame received from the authorized source")
        return self.last

    def key(self, keysym, pressed):
        self.call(RD, "NotifyKeyboardKeysym", "(oa{sv}iu)", (self.session, {}, keysym, pressed))

    def action(self, request):
        if self.closed or not self.session or not self.last:
            raise RuntimeError("Desktop sharing ended; choose the source again")
        operation = request["operation"]
        if operation == "click":
            x, y = request["x"], request["y"]
            if not (0 <= x < self.last["logicalWidth"] and 0 <= y < self.last["logicalHeight"]):
                raise RuntimeError("Pointer is outside the shared source")
            self.call(RD, "NotifyPointerMotionAbsolute", "(oa{sv}udd)", (self.session, {}, self.stream, float(x), float(y)))
            for state in (1, 0):
                self.call(RD, "NotifyPointerButton", "(oa{sv}iu)", (self.session, {}, 272, state))
        elif operation == "scroll":
            dx, dy = {"up": (0., -120.), "down": (0., 120.), "left": (-120., 0.), "right": (120., 0.)}[request.get("direction", "down")]
            self.call(RD, "NotifyPointerAxis", "(oa{sv}dd)", (self.session, {"finish": GLib.Variant("b", True)}, dx, dy))
        elif operation == "key":
            name = request["key"]
            keys = {"Return": 0xff0d, "Tab": 0xff09, "Escape": 0xff1b, "Down": 0xff54,
                    "Up": 0xff52, "Left": 0xff51, "Right": 0xff53, "BackSpace": 0xff08, "ctrl+a": 97}
            if name == "ctrl+a": self.key(0xffe3, 1)
            try:
                self.key(keys[name], 1)
                self.key(keys[name], 0)
            finally:
                if name == "ctrl+a": self.key(0xffe3, 0)
        elif operation == "type":
            text = request["text"]
            if len(text) > 8000: raise RuntimeError("Text exceeds input limit")
            for character in text:
                code = ord(character)
                keysym = {10: 0xff0d, 13: 0xff0d, 9: 0xff09}.get(code, code if code <= 255 else 0x01000000 | code)
                self.key(keysym, 1)
                self.key(keysym, 0)
        elif operation != "observe":
            raise RuntimeError("Unsupported portal operation")
        if operation != "observe": time.sleep(.2)
        return self.capture()

    def close(self):
        self.revoked()
        if self.session:
            try:
                self.bus.call_sync(DEST, self.session, "org.freedesktop.portal.Session", "Close", None, None, Gio.DBusCallFlags.NONE, 3000, None)
            except GLib.Error: pass
        if self.fd is not None:
            os.close(self.fd)
            self.fd = None


def main():
    loop = GLib.MainLoop()

    def worker():
        portal = None
        try:
            for line in sys.stdin:
                request = {}
                try:
                    if len(line) > 100000: raise RuntimeError("Request too large")
                    request = json.loads(line)
                    if request["operation"] == "connect":
                        if portal: raise RuntimeError("Session already connected")
                        portal = Portal()
                        result = portal.connect()
                    else:
                        if not portal: raise RuntimeError("No authorized desktop session")
                        result = portal.action(request)
                    response = {"id": request.get("id"), "result": result}
                except Exception as error:
                    response = {"id": request.get("id"), "error": str(error)}
                print(json.dumps(response), flush=True)
        finally:
            if portal: portal.close()
            GLib.idle_add(loop.quit)

    threading.Thread(target=worker, daemon=True).start()
    loop.run()


if __name__ == "__main__":
    main()
