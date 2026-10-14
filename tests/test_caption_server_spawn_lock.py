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

HARTOS reads the same lock before it would spawn its own 0.8B on the port
(Qwen08BBackend._launch_owner), so the lock's name and the age under which
it means "a start is in progress" are ONE definition, HARTOS's
Qwen08BBackend.start_lock_path and START_LOCK_STALE_S, which
start_caption_server reads.  Nunba kept its own spelling and a literal 120:
the review of HARTOS 77a8b166b measured every test here passing with that
literal at 300, while HARTOS ages the lock at 120 -- a lock 121-299 s old
was "stale" to one side and "in progress" to the other.  These tests need
HARTOS (the sibling checkout, put on the path below) and skip without it.

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
_HARTOS = os.path.normpath(os.path.join(_NUNBA, '..', 'HARTOS'))
if os.path.isdir(_HARTOS) and _HARTOS not in sys.path:
    sys.path.insert(0, _HARTOS)

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


@pytest.fixture
def hartos():
    """HARTOS's caption-server class: the lock rule start_caption_server
    reads.  Skipped where HARTOS cannot be imported."""
    lvb = pytest.importorskip('integrations.vision.lightweight_backend',
                              reason='HARTOS sibling not importable here')
    return lvb.Qwen08BBackend


def _lock(tmp_path):
    return tmp_path / f'.caption_server_starting.{PORT}.lock'


def _aged(path, age_s):
    path.write_text('4242')
    then = time.time() - age_s
    os.utime(path, (then, then))
    return path


def _never_up(monkeypatch, spawned):
    """The port answers nothing; a spawn is recorded and says True; the
    60 s wait on a held lock costs nothing."""
    monkeypatch.setattr(LlamaConfig, 'check_server_running',
                        lambda self, port=None: False)
    monkeypatch.setattr(LlamaConfig, '_do_start_caption_server',
                        lambda self, port: spawned.append(port) or True)
    monkeypatch.setattr(time, 'sleep', lambda s: None)


@pytest.mark.parametrize('age_s, held', [(118, True), (122, False)],
                         ids=['under_120s_held', 'over_120s_stale'])
def test_the_lock_is_held_while_younger_than_hartos_number(
        tmp_path, monkeypatch, hartos, age_s, held):
    """2 s either side of START_LOCK_STALE_S (120 s): a 118 s lock is a start
    in progress -- waited on, nothing spawned, the lock left to its owner; a
    122 s lock was left by a start that died -- removed, one spawn.  HARTOS's
    tests/unit/test_caption_server_one_launch.py pins the reader at the same
    two ages.  Fails with Nunba's threshold at 300 (the reviewer's probe)."""
    lock = _aged(_lock(tmp_path), age_s)
    spawned = []
    _never_up(monkeypatch, spawned)
    ok = _cfg(tmp_path).start_caption_server(port=PORT)
    assert spawned == ([] if held else [PORT])
    assert ok is (not held)
    assert lock.exists() is held


@pytest.mark.parametrize('number, age_s, held', [(300, 200, True), (60, 90, False)],
                         ids=['raised_200s_held', 'lowered_90s_stale'])
def test_nunba_ages_the_lock_by_hartos_number(tmp_path, monkeypatch, hartos,
                                              number, age_s, held):
    """Not a copy of any number: move HARTOS's START_LOCK_STALE_S either way
    and Nunba's answer moves with it (a literal 120 fails both cases, a
    literal 300 the second)."""
    monkeypatch.setattr(hartos, 'START_LOCK_STALE_S', number)
    _aged(_lock(tmp_path), age_s)
    spawned = []
    _never_up(monkeypatch, spawned)
    assert _cfg(tmp_path).start_caption_server(port=PORT) is (not held)
    assert spawned == ([] if held else [PORT])


def test_nunba_holds_the_lock_where_hartos_reads_it(tmp_path, monkeypatch, hartos):
    """Nunba's default config folder (~/.nunba) is where HARTOS looks: while
    Nunba spawns, the lock is at start_lock_path(PORT) with no folder given,
    the path HARTOS's _launch_owner reads.  After the start it is gone."""
    home = tmp_path / 'home'
    monkeypatch.setenv('USERPROFILE', str(home))
    monkeypatch.setenv('HOME', str(home))
    seen = []

    def spawn(self, port):
        seen.append(os.path.exists(hartos.start_lock_path(port)))
        return True
    monkeypatch.setattr(LlamaConfig, 'check_server_running',
                        lambda self, port=None: False)
    monkeypatch.setattr(LlamaConfig, '_do_start_caption_server', spawn)
    assert _cfg(home / '.nunba').start_caption_server(port=PORT) is True
    assert seen == [True], "Nunba's lock was not where HARTOS reads it"
    assert not os.path.exists(hartos.start_lock_path(PORT))


def test_the_lock_file_is_named_by_hartos(tmp_path, monkeypatch, hartos):
    """No private spelling of the name: Nunba takes and releases its lock
    wherever start_lock_path says, given its own config folder."""
    named = []

    def path(port, config_dir=None):
        named.append(str(config_dir))
        return str(tmp_path / 'moved' / f'start.{port}.lock')
    monkeypatch.setattr(hartos, 'start_lock_path', staticmethod(path))
    (tmp_path / 'moved').mkdir()
    held = []
    monkeypatch.setattr(LlamaConfig, 'check_server_running',
                        lambda self, port=None: False)
    monkeypatch.setattr(LlamaConfig, '_do_start_caption_server',
                        lambda self, port: held.append(
                            (tmp_path / 'moved' / f'start.{port}.lock').exists()) or True)
    assert _cfg(tmp_path).start_caption_server(port=PORT) is True
    assert named == [str(tmp_path)]
    assert held == [True] and not _lock(tmp_path).exists()


def test_without_hartos_nothing_is_started_beside_a_lock_nobody_can_age(
        tmp_path, monkeypatch):
    """No fallback copy of the rule: where HARTOS's lock rule cannot be
    imported, start_caption_server refuses (an error in the log), spawns
    nothing and writes no lock -- starting anyway risks the two-servers-on-
    one-port incident this lock exists for."""
    monkeypatch.setitem(sys.modules, 'integrations.vision.lightweight_backend', None)
    spawned = []
    _never_up(monkeypatch, spawned)
    assert _cfg(tmp_path).start_caption_server(port=PORT) is False
    assert spawned == [] and not _lock(tmp_path).exists()


def test_two_callers_in_the_load_window_spawn_once(tmp_path, monkeypatch, hartos):
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
        tmp_path, monkeypatch, hartos):
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


def test_a_stale_lock_does_not_block_the_spawn(tmp_path, monkeypatch, hartos):
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
        tmp_path, monkeypatch, hartos):
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
