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

# app.py:2264 writes exactly one of these per validate run, and validate.log
# is APPEND-ONLY — so the file holds every build ever done on the machine.
_SESSION_RE = re.compile(r'^=+ validate\.log session .*$', re.M)


def validate_log_is_clean(log_text) -> bool:
    """True only when every summary in THIS RUN's session has zero failures.

    Fail-closed by design: empty, unreadable or verdict-less input returns
    False.  A release gate that cannot find a verdict must block, never wave
    the build through — the whole point is that absence of evidence is not
    evidence of success.

    Order-independent WITHIN a session: a later passing retry does not erase
    an earlier failure, because we cannot tell a retry from a second group of
    checks.  That is the build7 guard and it is unchanged.

    Scoped to the LAST session, because validate.log accumulates across
    builds.  Reading the whole file made this gate a LATCH: one failed run
    poisoned every later build forever, since the failure never leaves the
    log.  Measured 2026-08-21 — 32 sessions on one dev box, three historical
    failures (08-16 Failed:5, 08-19 Failed:2 twice); that day's own session
    reported "Passed: 62, Failed: 0 ... All modules bundled correctly. Build
    is good." and the gate still returned False and killed the build.

    Scoping also closes a fail-OPEN hole in the same function: a session that
    died before printing its summary used to inherit the zeros of earlier
    sessions and pass.  Now the last session must produce its own verdict.
    """
    if not log_text:
        return False
    _sessions = _SESSION_RE.split(log_text)
    # No header at all => single-session text (unit tests, older logs);
    # judge it whole, exactly as before.
    _segment = _sessions[-1] if len(_sessions) > 1 else log_text
    counts = _FAILED_RE.findall(_segment)
    if not counts:
        return False
    return all(int(c) == 0 for c in counts)
