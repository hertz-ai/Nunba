"""The release gate must not pass a build the validator failed.

WHAT WENT WRONG (2026-08-04, build7): the frozen exe's validate run ended with

    Passed: 37, Failed: 8, Warnings: 0
    *** 8 PACKAGING FAILURE(S) — exe WILL break at runtime ***
      - hart_intelligence: ImportError ... numpy.linalg ...
      - routes.hartos_backend_adapter: _active_tier='Tier-3 (llama.cpp fallback)'

and the build printed

    [INFO] Exe exited with code 1 (teardown crash), but validate.log shows
           0 failures — build is good.

The gate was

    _log_says_good = 'Failed: 0' in open(_val_log).read()

a substring search over the WHOLE log.  validate.log contains SEVEN summary
lines: six earlier ones read "Failed: 0" and the final one read "Failed: 8".
The `in` matched one of the six, so the gate returned True and green-lit a
build whose own validator said it would break at runtime.

This is the same shape as the size-only file comparator documented at
build.py:1253 — a check that cannot observe the thing it exists to catch.  A
gate that can only say yes is not a gate.

FAIL-CLOSED is deliberate: no parseable verdict means NOT good.  A truncated
or missing log must block a release, never wave it through.

Shared by all three OS build scripts (setup_freeze_nunba / _linux / _mac),
which each had their own copy of the bug.

    python -m pytest tests/test_validate_verdict.py -q
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts'))

from _validate_verdict import validate_log_is_clean  # noqa: E402


# The exact shape of build7's validate.log: six clean group summaries, then
# the real verdict.  THE regression — nothing else in this file matters more.
REAL_BUILD7_LOG = """
  [OK]   llama.llama_installer
  Passed: 43, Failed: 0, Warnings: 0
  Passed: 43, Failed: 0, Warnings: 0
  Passed: 43, Failed: 0, Warnings: 0
  Passed: 43, Failed: 0, Warnings: 0
  Passed: 43, Failed: 0, Warnings: 0
  Passed: 43, Failed: 0, Warnings: 0
  Passed: 37, Failed: 8, Warnings: 0
  *** 8 PACKAGING FAILURE(S) - exe WILL break at runtime ***
"""


def test_the_regression_a_late_failure_after_clean_runs():
    assert validate_log_is_clean(REAL_BUILD7_LOG) is False, (
        'build7 shipped because a "Failed: 0" earlier in the log satisfied a '
        'substring check while the final verdict was "Failed: 8"')


def test_old_substring_check_would_have_passed_it():
    """Pins WHY the old implementation was wrong, so nobody reverts to it."""
    assert 'Failed: 0' in REAL_BUILD7_LOG          # the old gate said yes...
    assert validate_log_is_clean(REAL_BUILD7_LOG) is False   # ...the new one says no


def test_all_clean_passes():
    assert validate_log_is_clean(
        "Passed: 43, Failed: 0, Warnings: 0\nPassed: 43, Failed: 0, Warnings: 3") is True


def test_single_clean_passes():
    assert validate_log_is_clean("Passed: 43, Failed: 0, Warnings: 0") is True


def test_single_failure_blocks():
    assert validate_log_is_clean("Passed: 37, Failed: 8, Warnings: 0") is False


def test_warnings_do_not_block():
    """Warnings are explicitly non-fatal ('runtime config issues'); only
    Failed gates the release."""
    assert validate_log_is_clean("Passed: 43, Failed: 0, Warnings: 3") is True


@pytest.mark.parametrize("text", [
    "",                       # empty
    "no verdict here at all",  # ran but never reported
    None,                      # unreadable / missing file
])
def test_absent_verdict_fails_closed(text):
    assert validate_log_is_clean(text) is False, (
        'a missing or unparseable verdict must BLOCK the release, not pass it')


@pytest.mark.parametrize("text,expected", [
    ("Failed:0", True),
    ("Failed:   0", True),
    ("Failed: 12", False),
    ("Failed:  007", False),   # any non-zero digits, however padded
])
def test_whitespace_and_padding_variants(text, expected):
    assert validate_log_is_clean(text) is expected


def test_first_failure_among_later_clean_runs_still_blocks():
    """Order must not matter — a retry that passes does not erase a failure."""
    assert validate_log_is_clean(
        "Passed: 37, Failed: 8, Warnings: 0\nPassed: 43, Failed: 0, Warnings: 0") is False


# ── validate.log is APPEND-ONLY across builds ────────────────────────────
# app.py:2264 writes one "===== validate.log session <iso> =====" header per
# run, so the file accumulates every build ever done on the machine.  Scanning
# the whole file turned the gate into a LATCH: one failed session poisoned
# every later build forever, because the failure never leaves the log.
#
# Measured on this box 2026-08-21: 32 sessions, three historical failures
# (08-16T19:55 Failed:5, 08-19T18:43 Failed:2, 08-19T19:27 Failed:2).  The
# 08-21T09:19 session was itself "Passed: 62, Failed: 0 ... Build is good",
# and the gate still returned False and killed the build.
#
# Only the LAST session is the verdict for THIS build.  Within that session
# the all-zero rule above is unchanged, so build7 stays blocked.

_SESSION_HDR = "===== validate.log session {}.000000 ====="


def _multi_session_log(*per_session_failed):
    """Build a realistic append-only log: one session per Failed: count."""
    out = []
    for i, failed in enumerate(per_session_failed):
        out.append(_SESSION_HDR.format(f"2026-08-{16 + i:02d}T10:00:00"))
        out.append("  [OK]   flask")
        out.append(f"  Passed: 62, Failed: {failed}, Warnings: 0")
    return "\n".join(out)


def test_stale_failed_session_does_not_block_a_clean_build():
    """THE regression: 08-16 failed, today is clean, today must ship."""
    log = _multi_session_log(5, 2, 2, 0)
    assert validate_log_is_clean(log) is True, (
        "a five-day-old failure still sitting in the append-only log failed a "
        "build whose own session reported Failed: 0")


def test_failure_in_the_current_session_still_blocks():
    """The inverse must hold — clean history cannot excuse today's failure."""
    log = _multi_session_log(0, 0, 0, 2)
    assert validate_log_is_clean(log) is False


def test_build7_shape_inside_one_session_still_blocks():
    """Scoping to the last session must NOT weaken the build7 guard: several
    summaries within ONE session, last one failing, still blocks."""
    log = (_SESSION_HDR.format("2026-08-21T09:19:42") + "\n" + REAL_BUILD7_LOG)
    assert validate_log_is_clean(log) is False


def test_current_session_without_a_verdict_fails_closed():
    """A session that crashed before printing its summary must block, even
    though earlier sessions in the same file are clean."""
    log = (_multi_session_log(0, 0)
           + "\n" + _SESSION_HDR.format("2026-08-21T09:19:42")
           + "\n  [OK]   flask\n")   # no "Failed:" line — died mid-run
    assert validate_log_is_clean(log) is False
