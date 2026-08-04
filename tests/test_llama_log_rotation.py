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


def _capped_stream_cls():
    """Compile the REAL _CappedStream out of app.py and return the class.

    It lives inside app.py's ``if frozen:`` block, so it cannot be imported —
    which is why every guard above can only assert its SHAPE.  A shape
    assertion cannot catch a behavioural defect (that is exactly how the
    405MB-in-one-session bug survived its own drift-guard).  Exec the real
    class body so the tests below exercise shipped code, not a replica.
    """
    import ast

    tree = ast.parse(_app_src())
    node = next(n for n in ast.walk(tree)
                if isinstance(n, ast.ClassDef) and n.name == '_CappedStream')
    ns = {'os': os}
    exec(compile(ast.Module(body=[node], type_ignores=[]),
                 '<app.py:_CappedStream>', 'exec'), ns)
    return ns['_CappedStream']


def test_failed_reopen_does_not_kill_the_stream(tmp_path, monkeypatch):
    """A failed reopen must NOT leave the sink permanently dead.

    Regression shipped in 633fb913.  ``_rotate()`` closes ``self._fh`` FIRST
    (Windows refuses os.replace on an open handle), then reopens inside
    ``try/except OSError``.  app.py:863 notes that subprocesses (llama-server,
    langchain) INHERIT this handle — and on Windows an inherited handle keeps
    the file locked, so the reopen can raise PermissionError.  The except
    swallowed it and left ``self._fh`` CLOSED, so every later write raised
    ``ValueError: I/O operation on closed file`` for the rest of the process.

    ``sys.stdout`` IS this object, so autogen's ``print()`` died on every chat
    turn (autogen/io/console.py:21), HARTOS never finished booting, and the
    desktop app served its "Nunba is waking up..." stub indefinitely — which
    the SPA renders as "Something's off on our end."

    The docstring claimed failures "degrade to keep appending".  They did not:
    after a failed reopen there is nothing left to append to.
    """
    cls = _capped_stream_cls()
    p = tmp_path / 'frozen_debug.log'
    s = cls(str(p), 64)           # tiny cap so one write rotates

    real_open = open

    def locked_open(path, *a, **kw):
        # __init__ already opened the file before this patch, so ONLY the
        # post-rotation reopen hits this.  devnull (a different path) is
        # deliberately still allowed through.
        if str(path) == str(p):
            raise PermissionError(32, 'locked by an inheriting subprocess')
        return real_open(path, *a, **kw)

    monkeypatch.setattr('builtins.open', locked_open)

    s.write('x' * 200)            # over cap -> rotate -> reopen raises
    s.write('still alive\n')      # must NOT raise ValueError
    s.write('and again\n')


def test_failed_reopen_does_not_retry_on_every_write(tmp_path, monkeypatch):
    """After a failed reopen the byte counter must be reset.

    ``_n`` was only zeroed inside the reopen ``try``, so a failed rotation
    left it above the cap — turning ONE failed rotation into a rotate attempt
    (close + os.replace + open) on EVERY subsequent write.  A dead stream that
    also thrashes the filesystem.
    """
    cls = _capped_stream_cls()
    p = tmp_path / 'frozen_debug.log'
    s = cls(str(p), 64)

    real_open = open
    replaces = {'n': 0}
    real_replace = os.replace

    def counting_replace(src, dst, *a, **kw):
        replaces['n'] += 1
        return real_replace(src, dst, *a, **kw)

    def locked_open(path, *a, **kw):
        if str(path) == str(p):
            raise PermissionError(32, 'locked')
        return real_open(path, *a, **kw)

    monkeypatch.setattr(os, 'replace', counting_replace)
    monkeypatch.setattr('builtins.open', locked_open)

    s.write('x' * 200)            # one rotation
    for _ in range(20):
        s.write('more\n')         # 20 x 5 = 100 bytes against a 64-byte cap

    # Rotations must track BYTES, not writes.  100 bytes over a 64-byte cap
    # legitimately earns one more rotation, so 2 is correct here — the bug was
    # that a failed reopen left _n above the cap, making every single write
    # re-attempt a rotation (21 for this sequence).
    assert replaces['n'] <= 3, (
        f'rotation attempted {replaces["n"]}x for 21 writes — a failed reopen '
        'must reset the counter, or every write re-attempts a rotation'
    )
