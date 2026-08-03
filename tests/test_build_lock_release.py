"""The BUILD-LOCK must actually be released when a build exits cleanly.

``scripts/build.py:_acquire_build_lock`` registers an ``atexit`` handler that
deletes ``%TEMP%/nunba_build.lock``.  The original handler called
``os.remove()`` from INSIDE the ``with open(lock_path)`` block, so the delete
raced its own still-open read handle.  POSIX unlinks an open file happily, so
the bug was invisible on the Linux/macOS CI legs and only ever bit Windows —
the primary build platform — where it raises ``WinError 32`` and the bare
``except Exception: pass`` swallowed it without a word.

Observed 2026-08-04: ``build.py`` PID 34232 ran to completion, printed
"To install: Output\\Nunba_Setup.exe", exited 0 — and
``%TEMP%/nunba_build.lock`` still held ``34232|1785784196.0592558``.

This matters even though ``_acquire_build_lock`` reclaims stale locks, because
reclaim is gated on ``psutil.pid_exists(pid) and age < 3600``.  Windows recycles
PIDs aggressively, so a leftover lock whose PID gets reused within the hour
makes the NEXT build print "Another build is already running" and ``sys.exit(2)``
against a process that has nothing to do with building.  That is a spurious,
self-inflicted build refusal with no diagnostic pointing at the real cause.

NOTE ON PLATFORM SENSITIVITY: ``test_exit_handler_removes_the_lock`` is red on
Windows pre-fix and green on POSIX pre-fix, because the defect is Windows-only.
It is kept as a plain (unskipped) test on every OS: it is the observable
contract ("after the exit handler runs, the lock is gone"), and it guards the
release path against regressions everywhere, not just where the original bug
reproduced.
"""

import atexit
import os
import sys
import tempfile
import time

import pytest

_SCRIPTS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts')
if _SCRIPTS not in sys.path:
    sys.path.insert(0, _SCRIPTS)

# Safe to import: build.py's module level is constants + os.environ + sys.path
# only; every side-effecting step lives under main(), guarded by
# `if __name__ == '__main__'` at build.py:2413.
import build as build_script  # noqa: E402


def _acquire(monkeypatch, tmp_path):
    """Run _acquire_build_lock with TEMP redirected and atexit intercepted.

    ``_acquire_build_lock`` does ``import atexit`` / ``import tempfile`` inside
    the function body, but those resolve through ``sys.modules`` to the very
    module objects patched here, so the redirection holds.

    Returns the list of handlers the function registered.
    """
    monkeypatch.setattr(tempfile, 'gettempdir', lambda: str(tmp_path))
    handlers = []
    monkeypatch.setattr(atexit, 'register', lambda fn: handlers.append(fn) or fn)
    build_script._acquire_build_lock()
    return handlers


def _lock(tmp_path):
    return tmp_path / 'nunba_build.lock'


def test_acquire_writes_a_lock_naming_this_process(monkeypatch, tmp_path):
    """Sanity anchor: without this, the release tests could pass vacuously."""
    _acquire(monkeypatch, tmp_path)
    assert _lock(tmp_path).exists()
    assert _lock(tmp_path).read_text().split('|')[0] == str(os.getpid())


def test_acquire_registers_exactly_one_exit_handler(monkeypatch, tmp_path):
    handlers = _acquire(monkeypatch, tmp_path)
    assert len(handlers) == 1


def test_exit_handler_removes_the_lock(monkeypatch, tmp_path):
    """THE regression. Red on Windows before the fix — os.remove ran inside
    the `with open(...)` block and WinError 32 was swallowed."""
    handlers = _acquire(monkeypatch, tmp_path)
    assert _lock(tmp_path).exists(), 'precondition: lock was written'

    handlers[0]()  # simulate interpreter exit

    assert not _lock(tmp_path).exists(), (
        'lock survived a clean exit — the next build within 3600s will refuse '
        'to start if this PID is recycled')


def test_exit_handler_leaves_another_builds_lock_alone(monkeypatch, tmp_path):
    """The ownership check must survive the fix.

    If our handler ever deleted a lock it does not own, two concurrent builds
    could both proceed — the exact corruption the lock exists to prevent.
    """
    handlers = _acquire(monkeypatch, tmp_path)
    # A second build reclaimed the lock after ours went stale.
    _lock(tmp_path).write_text('999999|1785784196.0')

    handlers[0]()

    assert _lock(tmp_path).exists(), 'deleted a lock owned by another build'
    assert _lock(tmp_path).read_text().startswith('999999')


def test_exit_handler_is_quiet_when_the_lock_is_already_gone(monkeypatch, tmp_path):
    """Double-release / manual cleanup must not raise out of an atexit hook."""
    handlers = _acquire(monkeypatch, tmp_path)
    _lock(tmp_path).unlink()

    handlers[0]()  # must not raise


def test_live_lock_from_a_running_pid_refuses_the_build(monkeypatch, tmp_path):
    """The lock's actual job: refuse a second concurrent build."""
    _lock(tmp_path).write_text(f'{os.getpid()}|{time.time()}')
    monkeypatch.setattr(tempfile, 'gettempdir', lambda: str(tmp_path))
    monkeypatch.setattr(atexit, 'register', lambda fn: fn)

    with pytest.raises(SystemExit) as exc:
        build_script._acquire_build_lock()
    assert exc.value.code == 2


def test_stale_lock_from_a_dead_pid_is_reclaimed(monkeypatch, tmp_path):
    """A dead owner must not block the build — this is the escape hatch that
    kept the Windows leak from being noticed for so long.

    Liveness is stubbed rather than fed a hopefully-dead PID: picking a real
    number is either flaky (the OS may hand it to someone) or invalid (a first
    draft of this test used 4294967294, which does not fit a Windows DWORD, so
    psutil raised and the conservative fallback below treated it as ALIVE).
    """
    import psutil
    monkeypatch.setattr(psutil, 'pid_exists', lambda _pid: False)
    _lock(tmp_path).write_text(f'424242|{time.time()}')

    _acquire(monkeypatch, tmp_path)

    assert _lock(tmp_path).read_text().split('|')[0] == str(os.getpid())


def test_unusable_liveness_check_fails_safe_toward_refusing(monkeypatch, tmp_path):
    """Pins the deliberate conservative fallback, so nobody "fixes" it later.

    When psutil cannot answer (absent, or raising on a malformed PID), the code
    falls back to age alone and treats a lock younger than an hour as live.  It
    refuses the build rather than risk two concurrent builds trampling the same
    python-embed/ and build/ trees.  Losing this would turn a safe stop into
    silent corruption, so it is a contract, not an accident.
    """
    import psutil

    def _boom(_pid):
        raise OverflowError('PID out of range for this platform')

    monkeypatch.setattr(psutil, 'pid_exists', _boom)
    _lock(tmp_path).write_text(f'424242|{time.time()}')
    monkeypatch.setattr(tempfile, 'gettempdir', lambda: str(tmp_path))
    monkeypatch.setattr(atexit, 'register', lambda fn: fn)

    with pytest.raises(SystemExit) as exc:
        build_script._acquire_build_lock()
    assert exc.value.code == 2
