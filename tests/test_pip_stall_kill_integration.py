"""The stall detector must actually KILL a hung child — end-to-end.

WHY THIS EXISTS SEPARATELY FROM test_pip_stall_detector.py:
that file proves the pure decision (pip_made_progress) and pins the source
structure (the heartbeat must not assign last_line_t).  Neither actually
drives _run_pip's loop, so neither would notice if the loop stopped consulting
the helper, mis-ordered the checks, or never reached proc.kill().

The original bug WAS exactly that: proc.kill() was unreachable while every
surrounding piece looked correct.  A fix for an unreachable-code defect is not
credible until something demonstrates the code is now reached.  So this test
runs the real loop against a fake child that is:
    - alive          (poll() returns None)
    - silent         (stdout yields nothing)
    - byte-idle      (io_counters never move)
and asserts it gets killed with the stall message.

The child is faked rather than spawning real pip: we need a process that is
provably alive AND provably moving no bytes, deterministically and in
milliseconds.  A real subprocess cannot guarantee byte-idleness (interpreter
startup alone does I/O) and would make the test slow and flaky.
"""

import os
import sys
import types

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tts import package_installer  # noqa: E402


class _FakeStdout:
    """Yields nothing and never blocks — a silent pip."""

    def __iter__(self):
        return iter(())

    def close(self):
        pass


class _FakeProc:
    """Alive until killed. poll() is the loop's liveness signal."""

    def __init__(self):
        self.stdout = _FakeStdout()
        self.pid = 424242
        self.killed = False
        self._rc = None

    def poll(self):
        return self._rc

    def kill(self):
        self.killed = True
        self._rc = -9

    def wait(self, timeout=None):
        return self._rc


class _StaticIO:
    read_bytes = 1000
    write_bytes = 2000


@pytest.fixture
def hung_child(monkeypatch, tmp_path):
    """Wire _run_pip onto a child that is alive, silent and byte-idle."""
    proc = _FakeProc()
    monkeypatch.setattr(package_installer, 'get_embed_python',
                        lambda: sys.executable)
    monkeypatch.setattr(package_installer, 'get_user_site_packages',
                        lambda: str(tmp_path))
    monkeypatch.setattr(package_installer.subprocess, 'Popen',
                        lambda *a, **k: proc)
    # Byte counters that never advance => genuinely no progress.
    monkeypatch.setattr(package_installer, '_child_io_counters',
                        lambda pid: _StaticIO())
    return proc


def test_a_silent_byte_idle_child_is_killed(hung_child):
    """THE test. Before the fix this hung until the 900s wall clock."""
    steps = []
    ok, msg = package_installer._run_pip(
        ['install', 'somepkg'], progress_cb=steps.append,
        timeout=60, stall_timeout=2, heartbeat_s=1)

    assert hung_child.killed is True, (
        'the child was never killed — proc.kill() is unreachable again')
    assert ok is False
    assert 'stall' in msg.lower(), f'expected a stall message, got {msg!r}'


def test_the_heartbeat_still_fired_while_stalling(hung_child):
    """The UI must keep updating; the fix must not silence the heartbeat."""
    steps = []
    package_installer._run_pip(['install', 'somepkg'], progress_cb=steps.append,
                               timeout=60, stall_timeout=2, heartbeat_s=1)
    beats = [s for s in steps if s.startswith('pip: ')]
    assert beats, f'no heartbeat emitted during the stall; steps={steps}'


def test_a_byte_moving_child_is_NOT_killed(monkeypatch, tmp_path):
    """The 79dcd068 protection, kept: a silent-but-downloading wheel survives.

    Same fake child, except its byte counters advance — which is exactly the
    2.5 GB CUDA torch case (one 'Downloading...' line, then silent for minutes
    while bytes stream). It must run to completion, not be killed.
    """
    proc = _FakeProc()
    monkeypatch.setattr(package_installer, 'get_embed_python', lambda: sys.executable)
    monkeypatch.setattr(package_installer, 'get_user_site_packages', lambda: str(tmp_path))
    monkeypatch.setattr(package_installer.subprocess, 'Popen', lambda *a, **k: proc)

    moving = {'n': 0}

    def _advancing(pid):
        moving['n'] += 1
        # Finish the "download" after a few samples so the test terminates.
        if moving['n'] > 6:
            proc._rc = 0
        return types.SimpleNamespace(read_bytes=1000 * moving['n'],
                                     write_bytes=2000 * moving['n'])

    monkeypatch.setattr(package_installer, '_child_io_counters', _advancing)

    ok, msg = package_installer._run_pip(
        ['install', 'torch'], progress_cb=lambda s: None,
        timeout=60, stall_timeout=2, heartbeat_s=1)

    assert proc.killed is False, (
        'a child that was actively moving bytes got killed — this is the '
        'false positive 79dcd068 fixed, reintroduced')
    assert 'stall' not in (msg or '').lower()
