"""Detached terminal owner. Private atomic receipts survive the GUI process."""
import json
import os
import selectors
import signal
import subprocess
import sys
import time
from pathlib import Path

# Electron can leave Chromium descriptors inheritable. Never retain those in a helper.
for inherited_fd in os.listdir("/proc/self/fd"):
    if int(inherited_fd) > 2:
        try:
            os.close(int(inherited_fd))
        except OSError:
            pass

os.umask(0o077)
root = Path(sys.argv[1])
config = json.loads((root / 'config.json').read_text())
status = dict(state='running', output='', exitCode=None, termination=None)
child = None
claimed = False


def receipt():
    status['heartbeat'] = time.time() * 1000
    temporary = root / 'status.tmp'
    temporary.write_text(json.dumps(status))
    temporary.replace(root / 'status.json')


def stop(reason):
    status['termination'] = reason
    if child and child.poll() is None:
        try:
            os.killpg(child.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass


signal.signal(signal.SIGTERM, lambda *_: stop('supervisor stopped'))
signal.signal(signal.SIGINT, lambda *_: stop('supervisor stopped'))
try:
    # Exclusive launch receipt prevents a duplicate supervisor from running a command.
    with (root / 'launched').open('x') as marker:
        marker.write(str(os.getpid()))
    claimed = True
    child = subprocess.Popen(config['argv'], cwd=config['cwd'], env=config['env'],
                             stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                             stderr=subprocess.STDOUT, start_new_session=True)
    os.set_blocking(child.stdout.fileno(), False)
    os.set_blocking(child.stdin.fileno(), False)
    selector = selectors.DefaultSelector()
    selector.register(child.stdout, selectors.EVENT_READ)
    deadline = time.monotonic() + config['timeout']
    pending = b''
    receipt()
    while child.poll() is None:
        if time.monotonic() >= deadline:
            stop('timeout')
        for path in sorted(root.glob('control-*.json')):
            action = json.loads(path.read_text())
            path.unlink()
            if action['op'] == 'stop':
                stop('stopped')
            elif action['op'] == 'input':
                pending += action['input'].encode()
                if len(pending) > 65536:
                    stop('stdin queue limit')
        if pending:
            try:
                pending = pending[os.write(child.stdin.fileno(), pending):]
            except BlockingIOError:
                pass
            except BrokenPipeError:
                pending = b''
        for key, _ in selector.select(timeout=0.1):
            data = os.read(key.fd, 65536)
            if data:
                status['output'] = (status['output'] + data.decode(errors='replace'))[-240000:]
            else:
                selector.unregister(key.fileobj)
        receipt()
    # Drain output after exit without waiting for inherited pipes held by descendants.
    while True:
        try:
            data = os.read(child.stdout.fileno(), 65536)
        except BlockingIOError:
            break
        if not data:
            break
        status['output'] = (status['output'] + data.decode(errors='replace'))[-240000:]
    status['exitCode'] = child.wait()
except FileExistsError:
    sys.exit(2)
except BaseException as error:
    stop(str(error))
finally:
    if child:
        # A completed session must not leave untracked descendants running.
        try:
            os.killpg(child.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        child.wait()
    if claimed:
        status['state'] = 'exited'
        receipt()
