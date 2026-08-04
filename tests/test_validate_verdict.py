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
