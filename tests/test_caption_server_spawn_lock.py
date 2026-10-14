"""One caption (0.8B draft) server per port, however many callers ask.

Measured 2026-09-26 02:11 IST: two llama-server 0.8B on :8081 started in the
same minute by DIFFERENT parent processes.  The loser could not bind and held
its VRAM anyway.  start_caption_server guarded with an HTTP probe of the
port, and a model answers nothing for the seconds it takes to load, so two
callers probing in that window both spawned.  The callers are main.py's boot
thread and its vlm_caption.requested subscriber; each builds its own
LlamaConfig, so an in-memory flag cannot see the other.

The fix is the lock protocol start_server already uses (a pid file under
config_dir with a staleness cut-off and a wait-then-reuse), scoped to the
port.  These tests drive the REAL start_caption_server with only the probe
and the spawn stubbed.

    python -m pytest tests/test_caption_server_spawn_lock.py -q
"""
import os
import sys
import threading
import time

import pytest

_NUNBA = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _NUNBA not in sys.path:
    sys.path.insert(0, _NUNBA)

from llama.llama_config import LlamaConfig  # noqa: E402

PORT = 8081


def _cfg(tmp_path):
    """A LlamaConfig that shares config_dir with its siblings, as every
    caller's fresh LlamaConfig() does, without __init__'s installer work."""
    cfg = LlamaConfig.__new__(LlamaConfig)
    cfg.config_dir = tmp_path
    return cfg


@pytest.fixture(autouse=True)
def _default_port(monkeypatch):
    monkeypatch.delenv('HEVOLVE_VLM_CAPTION_PORT', raising=False)


def _lock(tmp_path):
    return tmp_path / f'.caption_server_starting.{PORT}.lock'


def test_two_callers_in_the_load_window_spawn_once(tmp_path, monkeypatch):
    """The measured defect: the second caller arrives while the first's
    model is still loading (the port answers nothing).  One spawn, both
    callers told True, no lock left behind."""
    up = threading.Event()
    spawns = []

    def running(self, port=None):
        return up.is_set()

    def spawn(self, port):
        spawns.append(port)
        time.sleep(0.6)          # the model loading; the port is silent
        up.set()
        return True

    monkeypatch.setattr(LlamaConfig, 'check_server_running', running)
    monkeypatch.setattr(LlamaConfig, '_do_start_caption_server', spawn)

    results = {}

    def go(name, cfg):
        results[name] = cfg.start_caption_server(port=PORT)

    boot = threading.Thread(target=go, args=('boot', _cfg(tmp_path)))
    event = threading.Thread(target=go, args=('event', _cfg(tmp_path)))
    boot.start()
    time.sleep(0.1)              # the subscriber fires during the load
    event.start()
    boot.join()
    event.join()

    assert results == {'boot': True, 'event': True}
    assert spawns == [PORT], 'the second caller spawned a duplicate'
    assert not _lock(tmp_path).exists()


def test_a_server_that_came_up_between_probe_and_lock_is_reused(
        tmp_path, monkeypatch):
    probes = []

    def running(self, port=None):
        probes.append(port)
        return len(probes) > 1    # absent on the first probe, up after

    spawned = []
    monkeypatch.setattr(LlamaConfig, 'check_server_running', running)
    monkeypatch.setattr(LlamaConfig, '_do_start_caption_server',
                        lambda self, port: spawned.append(port) or True)

    assert _cfg(tmp_path).start_caption_server(port=PORT) is True
    assert spawned == []
    assert not _lock(tmp_path).exists()


def test_a_stale_lock_does_not_block_the_spawn(tmp_path, monkeypatch):
    """A crashed starter leaves its pid file; after 2 minutes it is noise."""
    lock = _lock(tmp_path)
    lock.write_text('4242')
    old = time.time() - 600
    os.utime(lock, (old, old))
    spawned = []
    monkeypatch.setattr(LlamaConfig, 'check_server_running',
                        lambda self, port=None: False)
    monkeypatch.setattr(LlamaConfig, '_do_start_caption_server',
                        lambda self, port: spawned.append(port) or True)

    assert _cfg(tmp_path).start_caption_server(port=PORT) is True
    assert spawned == [PORT]
    assert not lock.exists()


def test_a_fresh_lock_whose_server_never_comes_up_spawns_nothing(
        tmp_path, monkeypatch):
    """Another process is starting and fails silently: this caller waits
    the protocol out, spawns no second server, and reports False."""
    _lock(tmp_path).write_text('4242')
    spawned = []
    monkeypatch.setattr(LlamaConfig, 'check_server_running',
                        lambda self, port=None: False)
    monkeypatch.setattr(LlamaConfig, '_do_start_caption_server',
                        lambda self, port: spawned.append(port) or True)
    monkeypatch.setattr(time, 'sleep', lambda s: None)   # the 60 s wait

    assert _cfg(tmp_path).start_caption_server(port=PORT) is False
    assert spawned == []
    assert _lock(tmp_path).exists(), 'the other starter owns the lock'


def test_an_already_running_server_touches_no_lock(tmp_path, monkeypatch):
    monkeypatch.setattr(LlamaConfig, 'check_server_running',
                        lambda self, port=None: True)
    monkeypatch.setattr(LlamaConfig, '_do_start_caption_server',
                        lambda self, port: pytest.fail('spawned'))
    assert _cfg(tmp_path).start_caption_server(port=PORT) is True
    assert not _lock(tmp_path).exists()
