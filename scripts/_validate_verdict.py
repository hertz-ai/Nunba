"""Canonical reader for the frozen exe's validate.log verdict.

ONE implementation shared by setup_freeze_nunba.py / _linux.py / _mac.py.
All three previously carried their own copy of

    _log_says_good = 'Failed: 0' in <whole log text>

which is a substring search, not a verdict.  validate.log emits one summary
line per validation group, so a log ending in "Failed: 8" still contains
"Failed: 0" from the earlier clean groups — and the gate passed a build its
own validator had just labelled "exe WILL break at runtime" (build7,
2026-08-04: numpy.linalg torn install knocked the backend adapter down to
Tier-3 llama.cpp fallback, and it shipped green).

Guarded by tests/test_validate_verdict.py.
"""

import re

_FAILED_RE = re.compile(r'Failed:\s*(\d+)')


def validate_log_is_clean(log_text) -> bool:
    """True only when EVERY reported summary has zero failures.

    Fail-closed by design: empty, unreadable or verdict-less input returns
    False.  A release gate that cannot find a verdict must block, never wave
    the build through — the whole point is that absence of evidence is not
    evidence of success.

    Order-independent: a later passing retry does not erase an earlier
    failure, because we cannot tell a retry from a second group of checks.
    """
    if not log_text:
        return False
    counts = _FAILED_RE.findall(log_text)
    if not counts:
        return False
    return all(int(c) == 0 for c in counts)
