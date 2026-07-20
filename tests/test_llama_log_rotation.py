"""PERF-2 (audit #564): bound Nunba's raw log writers.

The llama-server log uses the ONE canonical rotation helper
(``llama.llama_config._rotate_log_if_oversized``).  ``app.py``'s frozen_debug
capture uses a documented early-boot inline of the same idiom (it runs before
the bundle import path is ready, so it cannot import a Nunba module).  The last
test is a drift-guard pinning the self-critique decision: frozen_debug MUST keep
``buffering=1`` (crash-traceback durability) AND rotate.
"""
import importlib
import os


def _helper():
    return importlib.import_module('llama.llama_config')._rotate_log_if_oversized


def test_rotate_when_over_cap(tmp_path):
    rot = _helper()
    p = tmp_path / 'llama_server.log'
    p.write_bytes(b'x' * (2 * 1024 * 1024))  # 2 MB
    assert rot(str(p), max_bytes=1024 * 1024) is True
    assert not p.exists()
    assert (tmp_path / 'llama_server.log.old').exists()


def test_noop_when_under_cap(tmp_path):
    rot = _helper()
    p = tmp_path / 'llama_server.log'
    p.write_bytes(b'x' * 1024)               # 1 KB
    assert rot(str(p), max_bytes=1024 * 1024) is False
    assert p.exists()
    assert not (tmp_path / 'llama_server.log.old').exists()


def test_missing_file_is_safe(tmp_path):
    rot = _helper()
    assert rot(str(tmp_path / 'nope.log')) is False


def test_single_backup_generation(tmp_path):
    rot = _helper()
    p = tmp_path / 'llama_server.log'
    old = tmp_path / 'llama_server.log.old'
    old.write_bytes(b'OLD')
    p.write_bytes(b'x' * (2 * 1024 * 1024))
    assert rot(str(p), max_bytes=1024 * 1024) is True
    assert old.read_bytes() != b'OLD'        # one generation — prior .old replaced


def test_env_cap_override_rotates(tmp_path, monkeypatch):
    rot = _helper()
    monkeypatch.setenv('HEVOLVE_RAW_LOG_MAX_MB', '1')
    p = tmp_path / 'llama_server.log'
    p.write_bytes(b'x' * (2 * 1024 * 1024))  # 2 MB > 1 MB env cap
    assert rot(str(p)) is True               # no explicit max_bytes → reads env


def test_env_cap_garbage_falls_back_to_default(tmp_path, monkeypatch):
    rot = _helper()
    monkeypatch.setenv('HEVOLVE_RAW_LOG_MAX_MB', 'garbage')
    p = tmp_path / 'llama_server.log'
    p.write_bytes(b'x' * (2 * 1024 * 1024))  # 2 MB < 20 MB default
    assert rot(str(p)) is False              # garbage → 20 MB default → no rotate, no raise


def test_frozen_debug_keeps_line_buffering_and_rotates():
    # self-critique drift-guard (#564): frozen_debug.log is the crash-traceback
    # capture.  It MUST keep buffering=1 (per-line flush → the last tracebacks
    # survive a hard crash) AND must rotate (bound the ~688MB).  Guard both
    # against a future "drop the flush for perf" edit.
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with open(os.path.join(here, 'app.py'), encoding='utf-8') as f:
        src = f.read()
    assert 'os.replace(_frozen_log_path' in src, 'frozen_debug must rotate (PERF-2)'
    open_idx = src.index('_frozen_log = open(_frozen_log_path')
    assert 'buffering=1' in src[open_idx:open_idx + 200], \
        'frozen_debug must stay line-buffered (crash durability)'
