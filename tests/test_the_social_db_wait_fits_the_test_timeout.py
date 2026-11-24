"""conftest's wait for HARTOS's social tables never outlasts the test it runs in.

MEASURED 2026-11-23 (review of the main merge f6514a7e on #72): the autouse
fixture _hartos_social_db_ready waited up to 180 s inside ONE test's setup,
but pytest.ini gives every test 60 s, setup included (timeout_func_only is
false), and timeout_method=thread ends the process with os._exit(1).  When
HARTOS took over 60 s to make the users table, the whole session died at
conftest.py's time.sleep(0.5) and every result was lost: 2 runs of 2 on the
merge, 1 of 5 on #72's head.

Now the 180 s is a budget for the session, and each setup takes only what
fits inside that test's own timeout, leaving the test the rest.  The time is
counted from when the test's timer started, not from when the fixture did:
in the first test that imports main, a module fixture's cold `import main`
(15.1 s measured) runs inside the same timed setup first (review of
76a696a6, which counted from the fixture and still ended the session).
"""
import os
import subprocess
import sys
import textwrap

import pytest

from tests.conftest import _UNKNOWN_TIMEOUT, _setup_wait_seconds

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.mark.parametrize('budget_left, timeout, func_only, spent, expected', [
    (180, 60, False, 0, 45),    # the repo's 60 s: 15 s are left to the test
    (180, 60, False, 15, 30),   # setup already spent 15 s (a cold import main)
    (180, 60, False, 50, 0),    # setup already past its share: no wait
    (20, 60, False, 0, 20),     # less budget than fits: all of what is left
    (180, 4, False, 0, 3),      # a short timeout keeps a quarter for the test
    (180, None, False, 30, 180),  # no timeout: nothing to fit inside
    (180, 0, False, 30, 180),   # timeout 0 is "off" in pytest-timeout
    (180, 60, True, 30, 180),   # func_only: setup is outside the timer
    (0, 60, False, 0, 0),       # budget spent: no wait
    (180, _UNKNOWN_TIMEOUT, False, 0, 0),  # timer unreadable: no wait
])
def test_a_setup_waits_only_what_fits_its_timeout(budget_left, timeout, func_only, spent, expected):
    assert _setup_wait_seconds(budget_left, timeout, func_only, spent) == expected


_INNER_TEST = textwrap.dedent('''
    import sys
    import threading
    import types

    # A HARTOS boot that never makes the users table and never ends.
    _forever = threading.Event()
    _boot = threading.Thread(target=_forever.wait, daemon=True)
    _boot.start()
    sys.modules['hartos.hartos_bootstrap'] = types.SimpleNamespace(
        get_bootstrap_thread=lambda: _boot)

    import tests.conftest as _c
    _c._hartos_social_api_ready = lambda: False


    def test_first():
        pass


    def test_second():
        pass
''')


_INNER_SLOW_IMPORT_TEST = textwrap.dedent('''
    import sys
    import threading
    import time
    import types

    import pytest

    import tests.conftest as _c
    _c._hartos_social_api_ready = lambda: False


    @pytest.fixture(scope='module')
    def app():
        """As tests/test_social_auth_flow.py's client(): `import main` in a
        module fixture, set up before the autouse wait in the same timed
        setup.  The import is slow and starts a boot that never makes the
        table and never ends."""
        time.sleep(2)
        forever = threading.Event()
        boot = threading.Thread(target=forever.wait, daemon=True)
        boot.start()
        sys.modules['hartos.hartos_bootstrap'] = types.SimpleNamespace(
            get_bootstrap_thread=lambda: boot)


    def test_first(app):
        pass


    def test_second(app):
        pass
''')


def _run_inner(tmp_path, source, timeout_s):
    (tmp_path / 'test_inner.py').write_text(source, encoding='utf-8')
    (tmp_path / 'pytest.ini').write_text(
        '[pytest]\naddopts = -p tests.conftest -p no:cacheprovider\n'
        f'timeout = {timeout_s}\ntimeout_method = thread\n', encoding='utf-8')
    env = dict(os.environ, PYTHONPATH=os.pathsep.join(
        p for p in (_ROOT, os.environ.get('PYTHONPATH', '')) if p))
    proc = subprocess.run(
        [sys.executable, '-m', 'pytest', '-q', '-c', str(tmp_path / 'pytest.ini'),
         '--rootdir', str(tmp_path), str(tmp_path / 'test_inner.py')],
        cwd=_ROOT, env=env, capture_output=True, text=True, timeout=50)
    return proc.returncode, proc.stdout + proc.stderr


def test_a_slow_hartos_boot_does_not_end_the_session(tmp_path):
    """The real conftest fixture, a boot slower than the per-test timeout:
    the session runs both tests to the end instead of dying in setup."""
    code, out = _run_inner(tmp_path, _INNER_TEST, 4)
    assert 'Timeout' not in out, out[-3000:]
    assert code == 0, out[-3000:]
    assert '2 passed' in out, out[-3000:]


def test_a_slow_import_before_the_wait_does_not_end_the_session(tmp_path):
    """A module fixture spends 2 s of the 6 s timer before the wait starts;
    the wait counts them, so setup still ends inside the timer."""
    code, out = _run_inner(tmp_path, _INNER_SLOW_IMPORT_TEST, 6)
    assert 'Timeout' not in out, out[-3000:]
    assert code == 0, out[-3000:]
    assert '2 passed' in out, out[-3000:]
