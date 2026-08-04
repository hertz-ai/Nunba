"""The pip stall detector must be able to fire.

WHAT WENT WRONG (found 2026-08-04 by reading, after a "Setting up stt..." card
sat at the same line for 7 minutes on the live desktop):

    tts/package_installer.py  _run_pip(stall_timeout=120, heartbeat_s=20)

    695  if (now - state['last_beat_t']) >= heartbeat_s:      # every 20s
    698      progress_cb(f"pip: {pkg} (elapsed {int(now - t0)}s)")
    706      state['last_line_t'] = now                        # resets stall clock
    708  if (now - state['last_line_t']) >= stall_timeout:     # needs 120s
    709      proc.kill()                                       # UNREACHABLE

heartbeat_s (20) < stall_timeout (120) and the heartbeat unconditionally reset
last_line_t, so `now - last_line_t` could never reach 120.  Lines 709-716 were
dead code and the docstring promised abort-on-stall behaviour the function
could not perform.

WHY IT WAS WRITTEN THAT WAY, and why the fix must not simply revert it: a large
wheel (torch, parler_tts) is silent on stdout during BOTH download and
extraction — pip prints one "Downloading..." line then nothing for minutes.
A naive stall detector killed those healthy pulls.  The original author reset
the clock to stop that, which cured the false positive by removing the test.

THE CONFLATION, which is the real defect: two different facts were treated as
one.
    "the process is alive"    <- proven by proc.poll() is None, and by the heartbeat
    "pip is making progress"  <- what last_line_t is meant to measure
Resetting the second using evidence for the first is what makes the guard
vacuous.  The fix supplies a REAL progress signal: bytes moved by the child.

A happy-path test would have passed against the broken code, which is how this
survived.  The central test here therefore asserts the kill branch is
REACHABLE — a child that is alive, silent, and moving no bytes must die.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tts.package_installer import pip_made_progress  # noqa: E402


class _IO:
    """Mimics psutil's io_counters() namedtuple (only the fields we read)."""

    def __init__(self, r, w):
        self.read_bytes = r
        self.write_bytes = w


# ── the pure decision: did the child actually move bytes? ─────────────
def test_no_bytes_moved_is_not_progress():
    """THE regression. A silent child moving nothing must NOT look alive."""
    assert pip_made_progress(_IO(1000, 2000), _IO(1000, 2000)) is False


def test_bytes_read_is_progress():
    """A big wheel downloading is silent on stdout but IS reading bytes."""
    assert pip_made_progress(_IO(1000, 2000), _IO(1_500_000, 2000)) is True


def test_bytes_written_is_progress():
    """Extraction is silent on stdout but writes to disk — the exact case the
    original clock-reset was protecting, now protected for a real reason."""
    assert pip_made_progress(_IO(1000, 2000), _IO(1000, 9_000_000)) is True


def test_unavailable_counters_fail_open_as_progress():
    """If psutil can't read the child (permissions, process gone mid-sample),
    treat it as progress.  Fail-open here is deliberate: the wall-clock ceiling
    still bounds the run, and killing a healthy install on a missing metric is
    worse than waiting.  Note this is the OPPOSITE choice from the release gate
    (fe16f584), which fails CLOSED — because there, passing a bad build ships
    it, while here a false kill destroys a good install."""
    assert pip_made_progress(None, _IO(1, 1)) is True
    assert pip_made_progress(_IO(1, 1), None) is True
    assert pip_made_progress(None, None) is True


def test_counters_going_backwards_is_not_progress():
    """Defensive: a reused/rolled counter must not be read as forward motion."""
    assert pip_made_progress(_IO(5000, 5000), _IO(10, 10)) is False


# ── structural: the heartbeat must not forge the progress signal ──────
def test_heartbeat_no_longer_resets_the_stall_clock():
    """Pins the exact line that made the detector unreachable.

    Source-level because the bug is invisible behaviourally without spawning a
    real hung child: `state['last_line_t'] = now` sitting inside the
    heartbeat branch reads as helpful and silently disables the guard below it.
    """
    import inspect

    from tts import package_installer

    src = inspect.getsource(package_installer._run_pip)
    # Isolate the HEARTBEAT BRANCH ONLY — from the heartbeat condition up to
    # the progress-signal block that follows it.
    #
    # The end anchor must NOT be "Stall detection": that range also contains
    # the pip_made_progress block, which legitimately assigns last_line_t, so
    # the guard failed on the very fix it exists to protect.  (Third
    # mis-anchored source guard this session — narrow the region to exactly
    # the code under test, never "everything up to the next landmark".)
    start = src.find("last_beat_t']) >=")
    end = src.find("Real progress signal")
    assert start != -1 and end > start, 'heartbeat/progress block moved — re-point this guard'
    heartbeat_block = src[start:end]
    assert "last_line_t'] = now" not in heartbeat_block, (
        "the heartbeat is assigning last_line_t again. That resets the very "
        "clock the stall detector reads, making proc.kill() unreachable — the "
        "original bug. Reset the stall clock from pip_made_progress() only.")


def test_stall_clock_is_driven_by_the_progress_helper():
    """The guard must consult real byte movement, not just a timer."""
    import inspect

    from tts import package_installer

    src = inspect.getsource(package_installer._run_pip)
    assert 'pip_made_progress' in src, (
        'the stall loop no longer consults pip_made_progress — without an '
        'independent progress signal it is back to guessing from a clock')


@pytest.mark.parametrize("prev,cur,expected", [
    (_IO(0, 0), _IO(0, 1), True),
    (_IO(0, 0), _IO(1, 0), True),
    (_IO(9, 9), _IO(9, 9), False),
])
def test_single_byte_counts_as_progress(prev, cur, expected):
    assert pip_made_progress(prev, cur) is expected
