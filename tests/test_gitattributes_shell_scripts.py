"""Every tracked shell script checks out with LF on every platform.

`.gitattributes` says `* text=auto`, which writes the platform's native line
ending on checkout. On Windows that is CRLF, and bash refuses a CRLF script
(`$'\r': command not found`, `set: -: invalid option`). Measured 2026-09-15:
a fresh clone on this box could not run landing-page/scripts/setup-env.sh,
the React prebuild hook, so no installer could be built from it. Only
*.js/*.jsx/*.ts/*.tsx were pinned to LF; *.sh was not.

This asks git itself (check-attr) what it would do for each tracked *.sh, so
it fails on any platform the moment the rule is dropped or shadowed.
"""
import os
import subprocess

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _git(*args):
    return subprocess.run(['git', '-C', _ROOT, *args], capture_output=True,
                          text=True, timeout=60, check=True).stdout


def test_every_tracked_shell_script_checks_out_with_lf():
    scripts = [p for p in _git('ls-files', '-z', '--', '*.sh').split('\0') if p]
    assert scripts, 'no tracked *.sh found; the glob or the repo layout changed'
    out = _git('check-attr', 'eol', '--', *scripts)
    got = {}
    for line in out.splitlines():
        path, _, value = line.rsplit(': eol: ', 1)[0], None, line.rsplit(': eol: ', 1)[-1]
        got[path] = value
    wrong = {p: v for p, v in got.items() if v != 'lf'}
    assert not wrong, f'these shell scripts are not pinned to LF: {wrong}'
    assert 'landing-page/scripts/setup-env.sh' in got
