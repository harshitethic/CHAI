"""Trusted supervisor inside Bubblewrap; no host workspace or credential mounts."""
import json, os, resource, selectors, signal, subprocess, sys, time

req = json.load(sys.stdin)
programs = {
    "python3": ["/usr/bin/python3", "-I", "-B"],
    "node": ["/usr/bin/node", "--jitless", "--max-old-space-size=256"],
    "bash": ["/usr/bin/bash", "--noprofile", "--norc"],
}
def limits():
    for kind, value in [
        (resource.RLIMIT_AS, 2 * 1024**3),
        (resource.RLIMIT_CPU, req["timeoutSeconds"] + 1),
        (resource.RLIMIT_NPROC, 64),
        (resource.RLIMIT_NOFILE, 64),
        (resource.RLIMIT_FSIZE, 16 * 1024**2),
        (resource.RLIMIT_CORE, 0),
    ]:
        resource.setrlimit(kind, (value, value))

child = subprocess.Popen(programs[req["program"]] + req["args"],
    stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    cwd="/workspace", start_new_session=True, preexec_fn=limits)
selector = selectors.DefaultSelector()
for stream, name in [(child.stdout, "stdout"), (child.stderr, "stderr")]:
    os.set_blocking(stream.fileno(), False)
    selector.register(stream, selectors.EVENT_READ, name)
captured = {"stdout": bytearray(), "stderr": bytearray()}
start = time.monotonic()
reason = None
while selector.get_map():
    if time.monotonic() - start > req["timeoutSeconds"]:
        reason = "timeout"
        break
    for key, _ in selector.select(0.05):
        data = os.read(key.fileobj.fileno(), 4096)
        if not data:
            selector.unregister(key.fileobj)
            key.fileobj.close()
        else:
            available = 8000 - sum(len(v) for v in captured.values())
            captured[key.data].extend(data[:max(0, available)])
            if len(data) > available:
                reason = "output-limit"
                break
    if reason:
        break
if reason:
    try: os.killpg(child.pid, signal.SIGKILL)
    except ProcessLookupError: pass
try:
    code = child.wait(timeout=max(0.1, req["timeoutSeconds"] - (time.monotonic() - start)))
except subprocess.TimeoutExpired:
    reason = "timeout"
    try: os.killpg(child.pid, signal.SIGKILL)
    except ProcessLookupError: pass
    code = child.wait(timeout=1)
for key in list(selector.get_map().values()):
    key.fileobj.close()
selector.close()
print(json.dumps({
    "exitCode": code,
    "stdout": captured["stdout"].decode("utf-8", errors="replace"),
    "stderr": captured["stderr"].decode("utf-8", errors="replace"),
    "termination": reason,
    "durationMs": round((time.monotonic() - start) * 1000),
}))
