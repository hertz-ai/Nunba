"""A llama-server Nunba spawns dies when Nunba exits.

The tray quits with os._exit(0).  On Windows an orphaned llama-server kept
its RAM and CPU, and the next launch reused it as "external" (2026-10-01:
2.2 GB at full CPU after quit, 1.4 GB free on relaunch, chat at 60-200 s).
llama_config binds both spawns (main and caption) through _bind_child,
which uses HARTOS core.child_lifecycle when it is available.

    python -m pytest tests/test_llama_dies_with_nunba.py -q
"""
import os
import subprocess
import sys
import textwrap
import time

import pytest

_NUNBA = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
_HARTOS = os.path.join(os.path.dirname(_NUNBA), 'HARTOS')
for _p in (_NUNBA, _HARTOS):
    if _p not in sys.path:
        sys.path.insert(0, _p)

psutil = pytest.importorskip('psutil')


def _hartos_has_child_lifecycle() -> bool:
    try:
        import core.child_lifecycle  # noqa: F401
        return True
    except ImportError:
        return False


needs_binding = pytest.mark.skipif(
    sys.platform != 'win32' or not _hartos_has_child_lifecycle(),
    reason='needs Windows and a HARTOS with core.child_lifecycle')


@needs_binding
def test_a_server_bound_by_llama_config_dies_when_nunba_os_exits():
    script = textwrap.dedent(f"""
        import os, subprocess, sys
        for p in ({_NUNBA!r}, {_HARTOS!r}):
            sys.path.insert(0, p)
        from llama.llama_config import _bind_child
        child = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(120)'],
                                 stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL)
        print(child.pid, _bind_child(child), flush=True)
        os._exit(0)   # the tray quit
    """)
    out = subprocess.run([sys.executable, '-c', script],
                         capture_output=True, text=True, timeout=120)
    pid, bound = out.stdout.split()[-2:]
    pid = int(pid)
    try:
        assert bound == 'True', out.stderr[-2000:]
        deadline = time.monotonic() + 10
        while psutil.pid_exists(pid) and time.monotonic() < deadline:
            time.sleep(0.2)
        assert not psutil.pid_exists(pid), 'llama-server outlived Nunba'
    finally:
        if psutil.pid_exists(pid):
            psutil.Process(pid).kill()


def test_an_older_hartos_without_the_helper_spawns_unbound(monkeypatch):
    import llama.llama_config as lc
    monkeypatch.setattr(lc, '_bind_to_parent', None)
    assert lc._bind_child(object()) is False
