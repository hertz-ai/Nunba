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


def _app_src():
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with open(os.path.join(here, 'app.py'), encoding='utf-8') as f:
        return f.read()


def test_frozen_debug_keeps_line_buffering():
    # self-critique drift-guard (#564): frozen_debug.log is the crash-traceback
    # capture.  It MUST keep buffering=1 (per-line flush → the last tracebacks
    # survive a hard crash).  Guard against a "drop the flush for perf" edit.
    src = _app_src()
    cls_idx = src.index('class _CappedStream')
    body = src[cls_idx:cls_idx + 3000]
    assert 'buffering=1' in body, \
        'frozen_debug must stay line-buffered (crash durability)'


def test_frozen_debug_rotation_is_reachable_mid_session():
    """Rotation must be reachable from write(), not only from boot.

    The previous version of this guard asserted only that the string
    'os.replace(_frozen_log_path' was PRESENT.  That stayed true while the
    single rotation site sat in the boot path, so the guard could not fail
    for the defect it names: sys.stdout/sys.stderr stay bound to one append
    handle for the whole process, and the file reached 405MB in 8.5h of a
    single session with C: at 2.8GB free.

    A presence check is not a reachability check.  Walk the AST and require
    that _CappedStream.write() actually calls the rotation.
    """
    import ast

    tree = ast.parse(_app_src())
    capped = next(
        (n for n in ast.walk(tree)
         if isinstance(n, ast.ClassDef) and n.name == '_CappedStream'), None)
    assert capped is not None, 'frozen_debug sink must be a capped stream'

    write = next((n for n in capped.body
                  if isinstance(n, ast.FunctionDef) and n.name == 'write'), None)
    assert write is not None, '_CappedStream must define write()'

    called = {
        n.func.attr for n in ast.walk(write)
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
    }
    assert '_rotate' in called, (
        'write() must be able to rotate — a boot-only cap cannot bound a '
        'session that never restarts'
    )

    rotate = next((n for n in capped.body
                   if isinstance(n, ast.FunctionDef) and n.name == '_rotate'), None)
    assert rotate is not None, '_CappedStream must define _rotate()'
    assert 'os.replace' in ast.unparse(rotate), '_rotate must actually replace'
