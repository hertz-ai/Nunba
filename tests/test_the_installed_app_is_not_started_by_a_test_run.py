"""A test run never starts, stops or drives the installed Nunba.

tests/test_pywebview_background_start.py reproduces a black-screen bug on the
real thing: it force-stops every running Nunba (taskkill /F /IM Nunba.exe),
starts the INSTALLED Nunba.exe --background on :5000 and presses Win+N on the
desktop.  Its only condition was "Windows, and Nunba is installed", which is
every developer machine, so any run that included the file did all of that.
On 22 Nov 2026 such a run was killed by its 60 s timeout and the installed
app it had started stayed up for 85 minutes.

It now runs only when NUNBA_TEST_INSTALLED_APP=1 is set.  Here that file is
loaded fresh, on a pretend machine where Nunba IS installed, with every way
of starting a process replaced by a recorder, and run.
"""
import importlib.util
import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

_FILE = Path(__file__).with_name('test_pywebview_background_start.py')
_OPT_IN = 'NUNBA_TEST_INSTALLED_APP'


@pytest.fixture
def machine_with_nunba_installed(tmp_path, monkeypatch):
    """Load the file as it would load on a Windows machine with Nunba
    installed, and return (module, started): `started` records every process
    the file asks for.  Nothing real is started or stopped, and the home the
    file reads its logs from is a folder made here: two of its tests open
    ~/Documents/Nunba/logs/langchain.log, which on a real home is the
    person's own log (review of fc9f4e7f)."""
    exe = tmp_path / 'HevolveAI' / 'Nunba' / 'Nunba.exe'
    exe.parent.mkdir(parents=True)
    exe.write_bytes(b'')
    monkeypatch.setenv('ProgramFiles(x86)', str(tmp_path))
    home = tmp_path / 'home'
    home.mkdir()
    monkeypatch.setenv('USERPROFILE', str(home))
    monkeypatch.setenv('HOME', str(home))
    monkeypatch.setattr(sys, 'platform', 'win32')

    def load():
        spec = importlib.util.spec_from_file_location('_pywebview_bg_under_test', _FILE)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        started = []
        # The file's own names for these modules are swapped, not the modules:
        # the rest of the test process keeps the real ones.
        real = module.subprocess
        monkeypatch.setattr(module, 'subprocess', SimpleNamespace(
            run=lambda cmd, *a, **k: started.append(list(cmd)) or MagicMock(),
            Popen=lambda cmd, *a, **k: started.append(list(cmd)) or MagicMock(),
            DEVNULL=real.DEVNULL, PIPE=real.PIPE, TimeoutExpired=real.TimeoutExpired))
        # No waiting, and no talking to whatever is on :5000.
        monkeypatch.setattr(module, 'MAX_STARTUP_WAIT', 0)
        monkeypatch.setattr(module, 'SHOW_DELAY', 0)
        monkeypatch.setattr(module, 'time', SimpleNamespace(
            time=module.time.time, sleep=lambda seconds: None))
        monkeypatch.setattr(module, 'requests', SimpleNamespace(
            get=MagicMock(side_effect=ConnectionError('not asked')),
            post=MagicMock(side_effect=ConnectionError('not asked'))))
        if hasattr(module.TestBackgroundToForeground, '_send_win_n_hotkey'):
            monkeypatch.setattr(module.TestBackgroundToForeground, '_send_win_n_hotkey',
                                lambda self: started.append(['Win+N']))
        return module, started

    return load


def _cases(module):
    return [obj for obj in vars(module).values()
            if isinstance(obj, type) and issubclass(obj, unittest.TestCase)]


def _run(module):
    suite = unittest.TestSuite(
        unittest.defaultTestLoader.loadTestsFromTestCase(case) for case in _cases(module))
    result = unittest.TestResult()
    suite.run(result)
    return result


def test_a_plain_run_starts_and_stops_nothing(machine_with_nunba_installed, monkeypatch):
    monkeypatch.delenv(_OPT_IN, raising=False)
    module, started = machine_with_nunba_installed()

    result = _run(module)

    assert started == [], f'a plain test run asked for {started}'
    assert result.testsRun == 0 or len(result.skipped) == result.testsRun
    assert not result.errors and not result.failures


def test_every_test_in_the_file_is_skipped_and_says_how_to_run_it(
        machine_with_nunba_installed, monkeypatch):
    monkeypatch.delenv(_OPT_IN, raising=False)
    module, _started = machine_with_nunba_installed()

    cases = _cases(module)

    assert len(cases) >= 2
    for case in cases:
        assert getattr(case, '__unittest_skip__', False), case.__name__
        why = case.__unittest_skip_why__
        assert f'{_OPT_IN}=1' in why and 'INSTALLED' in why, why


@pytest.mark.parametrize('value', ['0', '', 'true', 'yes', ' '])
def test_only_the_exact_opt_in_runs_it(value, machine_with_nunba_installed, monkeypatch):
    monkeypatch.setenv(_OPT_IN, value)
    module, started = machine_with_nunba_installed()

    _run(module)

    assert started == []
    assert all(getattr(case, '__unittest_skip__', False) for case in _cases(module))


def test_asked_for_on_a_machine_with_it_installed_the_file_does_run(
        machine_with_nunba_installed, monkeypatch):
    """The opt-in is a way in, not a second lock: with it set, the classes
    are live and the first thing they do is what the file always did."""
    monkeypatch.setenv(_OPT_IN, '1')
    module, started = machine_with_nunba_installed()

    assert not any(getattr(case, '__unittest_skip__', False) for case in _cases(module))
    _run(module)

    assert ['taskkill', '/F', '/IM', 'Nunba.exe'] in started
    assert [str(Path(os.environ['ProgramFiles(x86)']) / 'HevolveAI' / 'Nunba' / 'Nunba.exe'),
            '--background'] in started


def _outcome(result, test_name):
    for kind in ('skipped', 'failures', 'errors'):
        for case, _text in getattr(result, kind):
            if case.id().endswith('.' + test_name):
                return kind
    return 'passed'


def test_the_log_the_file_reads_is_the_test_homes_not_the_persons(
        tmp_path, machine_with_nunba_installed, monkeypatch):
    """With the file opted in, its log test passes on a log written in the
    test home and is skipped when that home has none.  Either way it never
    depended on, or opened, the real ~/Documents/Nunba/logs/langchain.log."""
    monkeypatch.setenv(_OPT_IN, '1')
    logs = tmp_path / 'home' / 'Documents' / 'Nunba' / 'logs'

    def run_with_the_app_up():
        module, _started = machine_with_nunba_installed()
        # the (recorded, never started) app answers at once, so the class
        # gets past its start-up wait and its tests run
        monkeypatch.setattr(module, 'MAX_STARTUP_WAIT', 5)
        monkeypatch.setattr(module, '_is_flask_ready', lambda: True)
        return _run(module)

    without = run_with_the_app_up()
    logs.mkdir(parents=True)
    (logs / 'langchain.log').write_text('boot\n[BACKGROUND] repaint\n', encoding='utf-8')
    with_log = run_with_the_app_up()

    assert _outcome(without, 'TestBackgroundStart.test_webview_recovery_log_exists') == 'skipped'
    assert _outcome(with_log, 'TestBackgroundStart.test_webview_recovery_log_exists') == 'passed'


def test_asked_for_without_nunba_installed_it_is_still_skipped(
        tmp_path, machine_with_nunba_installed, monkeypatch):
    monkeypatch.setenv(_OPT_IN, '1')
    (tmp_path / 'HevolveAI' / 'Nunba' / 'Nunba.exe').unlink()
    module, started = machine_with_nunba_installed()

    _run(module)

    assert started == []
    for case in _cases(module):
        assert 'Nunba installed required' in case.__unittest_skip_why__
