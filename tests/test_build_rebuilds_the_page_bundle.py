"""A build that freezes the app rebuilds the page bundle, --skip-deps or not.

scripts/build.py main() ran build_react_landing_page() only when
``not args.skip_deps and args.mode != 'installer'``, although that function
says the bundle is rebuilt on every build ("Stale landing-page/build/ has
shipped twice").  A --skip-deps build froze whatever landing-page/build
held: build/Nunba b36e2275 (built 2026-11-21) serves main.ce819cb7.js of
2026-11-12, which predates the camera fix 06c1e29e (2026-11-13).  On the
desktop the page then held the camera 83 minutes after its socket closed
(2026-11-19 20:28-21:52 IST, the camera service's own log), the LED on.

The installer mode packages build/Nunba as it is (Nunba_Installer.iss,
Source: build\\Nunba\\*), so it still builds no bundle.  --skip-deps skips
`npm install` only.  No Node.js, or a first `npm install` that fails, is a
failed bundle step, never a pass that leaves the old bundle to ship (review
of 9bdd47e0).  This replaces the harness's A4 check, which read build.py's
text and passed while the gate skipped the rebuild.

Review of 6b442c4ab: the failure cases run with an old bundle on disk
(landing-page/build/index.html), so "use the old one when it is there" fails
them; main() is run with a bundle step that fails, and must stop before the
venv, the pip phase and the freeze; a refusal for a missing tool names the
fix; Node.js without npm is that refusal, not a traceback; a failed npm
install over an existing node_modules warns and lets the build step decide.

main() runs here as written; everything around the bundle step is replaced:
the build lock, the disk/process/temp checks, the dependency install, the
version stamp, the freeze.  Nothing is built, installed or deleted.

NUNBA_BUILD_PY=<path> runs the same tests against another copy of build.py
(the parent commit) to show they fail there.
"""

import glob
import importlib.util
import os
import shutil
import sys
from collections import namedtuple

import pytest

_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_SCRIPTS = os.path.join(_REPO, 'scripts')
if _SCRIPTS not in sys.path:
    sys.path.insert(0, _SCRIPTS)  # build.py imports deps from here
_BUILD_PY = os.environ.get('NUNBA_BUILD_PY') or os.path.join(_SCRIPTS, 'build.py')


def _load_build():
    spec = importlib.util.spec_from_file_location('build_under_test', _BUILD_PY)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def build():
    return _load_build()


_Usage = namedtuple('_Usage', 'total used free')


def _main(build, monkeypatch, argv, bundle_ok=True):
    """main() with argv -> (exit code, bundle step calls, steps in order)."""
    calls = []
    steps = []

    def bundle(*args, **kwargs):
        steps.append('build_react_landing_page')
        calls.append((args, kwargs))
        return bundle_ok

    def step(name, result):
        def run(*args, **kwargs):
            steps.append(name)
            return result
        return run

    monkeypatch.setattr(sys, 'argv', ['build.py'] + argv)
    monkeypatch.setattr(os, 'chdir', lambda path: None)
    # Pre-flight: plenty of disk, nothing running from build/, and no temp
    # dir to clear (the real check deletes pip-build-env-* in %TEMP%).
    monkeypatch.setattr(shutil, 'disk_usage', lambda path: _Usage(1 << 40, 0, 1 << 40))
    monkeypatch.setattr(glob, 'glob', lambda pattern: [])
    try:
        import psutil
        monkeypatch.setattr(psutil, 'process_iter', lambda *a, **k: [])
    except ImportError:
        pass
    for name, value in {
        '_acquire_build_lock': lambda: None,
        'ensure_iscc': step('ensure_iscc', True),
        'activate_venv': step('activate_venv', sys.executable),
        'install_dependencies': step('install_dependencies', None),
        'stamp_version': step('stamp_version', None),
        'run_setup_wizard': lambda *a, **k: None,
        'build_windows': step('build_windows', True),
        'build_macos': step('build_macos', True),
        'build_linux': step('build_linux', True),
        'print_summary': lambda: None,
        'build_react_landing_page': bundle,
    }.items():
        monkeypatch.setattr(build, name, value)
    return build.main(), calls, steps


def _run_main(build, monkeypatch, argv):
    """main() with argv; returns the calls made to build_react_landing_page."""
    rc, calls, _steps = _main(build, monkeypatch, argv)
    assert rc == 0
    return calls


_FREEZES = {'build_windows', 'build_macos', 'build_linux'}


class TestMainBuildsTheBundle:
    def test_app_build_with_skip_deps_builds_the_bundle_without_npm_install(
            self, build, monkeypatch):
        calls = _run_main(build, monkeypatch, ['app', '--skip-deps', '--skip-wizard'])
        assert calls == [((), {'install_deps': False})]

    def test_full_build_with_skip_deps_builds_the_bundle(self, build, monkeypatch):
        calls = _run_main(build, monkeypatch, ['full', '--skip-deps', '--skip-wizard'])
        assert len(calls) == 1

    def test_app_build_builds_the_bundle_with_npm_install(self, build, monkeypatch):
        calls = _run_main(build, monkeypatch, ['app', '--skip-wizard'])
        assert len(calls) == 1
        assert calls[0][1].get('install_deps', True) is True

    def test_installer_mode_packages_the_frozen_build_and_builds_no_bundle(
            self, build, monkeypatch):
        assert _run_main(build, monkeypatch, ['installer', '--skip-wizard']) == []

    # Review of 6b442c4ab: "Cannot proceed" was printed by a main() no test
    # ever ran with a failed bundle step.
    @pytest.mark.parametrize('argv', [
        ['full', '--skip-wizard'],
        ['app', '--skip-wizard'],
        ['app', '--skip-deps', '--skip-wizard'],
    ])
    def test_a_failed_bundle_stops_the_build_before_the_freeze(
            self, build, monkeypatch, argv):
        rc, calls, steps = _main(build, monkeypatch, argv, bundle_ok=False)
        assert rc == 1
        assert len(calls) == 1
        assert not _FREEZES & set(steps)

    @pytest.mark.parametrize('argv', [
        ['full', '--skip-wizard'],
        ['app', '--skip-wizard'],
    ])
    def test_the_bundle_step_runs_before_the_venv_and_the_pip_phase(
            self, build, monkeypatch, argv):
        rc, _calls, steps = _main(build, monkeypatch, argv)
        assert rc == 0
        assert 'install_dependencies' in steps and _FREEZES & set(steps)
        bundle_at = steps.index('build_react_landing_page')
        assert bundle_at < steps.index('activate_venv')
        assert bundle_at < steps.index('install_dependencies')

    def test_a_failed_bundle_stops_before_the_venv_and_the_pip_phase(
            self, build, monkeypatch):
        rc, _calls, steps = _main(build, monkeypatch, ['full', '--skip-wizard'],
                                  bundle_ok=False)
        assert rc == 1
        assert 'activate_venv' not in steps
        assert 'install_dependencies' not in steps


class _Done:
    def __init__(self, returncode=0, stdout='', stderr=''):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr


_OLD_BUNDLE = 'the bundle of an earlier build'


def _npm(build, monkeypatch, tmp_path, *, node_modules=True, build_rc=0,
         node=True, install_rc=0, npm=True, old_bundle=False,
         node_error=None, npm_error=None, node_done=None, seen=None):
    """build_react_landing_page's commands, from a landing-page made here.

    ``old_bundle`` leaves landing-page/build/index.html from an earlier
    build on disk: what a pass without a build would ship."""
    (tmp_path / 'landing-page').mkdir()
    if node_modules:
        (tmp_path / 'landing-page' / 'node_modules').mkdir()
    if old_bundle:
        (tmp_path / 'landing-page' / 'build').mkdir()
        (tmp_path / 'landing-page' / 'build' / 'index.html').write_text(_OLD_BUNDLE)
    monkeypatch.chdir(tmp_path)
    ran = []

    def run(cmd, *args, **kwargs):
        ran.append(list(cmd))
        if cmd[:2] == ['node', '--version']:
            if seen is not None:
                seen.append(kwargs)
            if node_error is not None:
                raise node_error
            if node_done is not None:
                return node_done
            if not node:
                raise FileNotFoundError('node')
            return _Done(0)
        if npm_error is not None:
            raise npm_error
        if not npm:
            raise FileNotFoundError(2, 'The system cannot find the file specified', cmd[0])
        if 'build' in cmd:
            return _Done(build_rc)
        if 'install' in cmd:
            return _Done(install_rc)
        return _Done(0)

    monkeypatch.setattr(build.subprocess, 'run', run)
    return ran


def _said(build, monkeypatch):
    """What the step prints as [ERROR] and [WARN], as (kind, text)."""
    said = []
    monkeypatch.setattr(build, 'print_error', lambda text: said.append(('error', text)))
    monkeypatch.setattr(build, 'print_warn', lambda text: said.append(('warn', text)))
    return said


def _bundle_step(build, **kwargs):
    """The step's answer; an exception it lets out is the answer too."""
    try:
        return build.build_react_landing_page(**kwargs)
    except Exception as exc:  # the assertion on the answer reports it
        return exc


def _old_bundle_is_untouched(tmp_path):
    index = tmp_path / 'landing-page' / 'build' / 'index.html'
    return index.read_text() == _OLD_BUNDLE


_NAMES_THE_FIX = ('Node.js 20', 'PATH')


class TestTheBundleStep:
    def test_skip_deps_builds_without_npm_install(self, build, monkeypatch, tmp_path):
        ran = _npm(build, monkeypatch, tmp_path)
        assert build.build_react_landing_page(install_deps=False) is True
        assert not [c for c in ran if 'install' in c]
        assert [c for c in ran if c[1:] == ['run', 'build']]

    def test_skip_deps_without_node_modules_fails_rather_than_ship_the_old_bundle(
            self, build, monkeypatch, tmp_path):
        ran = _npm(build, monkeypatch, tmp_path, node_modules=False, build_rc=1)
        assert build.build_react_landing_page(install_deps=False) is False
        assert not [c for c in ran if 'install' in c]

    def test_by_default_npm_install_runs_before_the_build(self, build, monkeypatch, tmp_path):
        ran = _npm(build, monkeypatch, tmp_path)
        assert build.build_react_landing_page() is True
        steps = [c[1] for c in ran if c[0] != 'node']
        assert steps == ['install', 'run']

    # Review of 9bdd47e0: "Using existing landing-page/build" was a pass.
    @pytest.mark.parametrize('install_deps', [True, False])
    def test_no_node_is_a_failed_bundle_not_the_old_one(
            self, build, monkeypatch, tmp_path, install_deps):
        ran = _npm(build, monkeypatch, tmp_path, node=False, old_bundle=True)
        assert build.build_react_landing_page(install_deps=install_deps) is False
        assert not [c for c in ran if c[0] != 'node']
        assert _old_bundle_is_untouched(tmp_path)

    def test_no_node_names_the_fix(self, build, monkeypatch, tmp_path):
        _npm(build, monkeypatch, tmp_path, node=False, old_bundle=True)
        said = _said(build, monkeypatch)
        assert build.build_react_landing_page() is False
        errors = [text for kind, text in said if kind == 'error']
        assert len(errors) == 1
        assert all(word in errors[0] for word in _NAMES_THE_FIX)

    def test_a_failed_first_npm_install_is_a_failed_bundle_not_the_old_one(
            self, build, monkeypatch, tmp_path):
        ran = _npm(build, monkeypatch, tmp_path, node_modules=False, install_rc=1,
                   old_bundle=True)
        assert build.build_react_landing_page() is False
        assert not [c for c in ran if c[1:] == ['run', 'build']]
        assert _old_bundle_is_untouched(tmp_path)

    # Review of 6b442c4ab: Node.js without npm ended in an uncaught
    # FileNotFoundError; a failed refresh install said nothing of its own.
    @pytest.mark.parametrize('install_deps', [True, False])
    def test_node_without_npm_is_the_named_refusal_not_a_traceback(
            self, build, monkeypatch, tmp_path, install_deps):
        ran = _npm(build, monkeypatch, tmp_path, npm=False, old_bundle=True)
        said = _said(build, monkeypatch)
        assert _bundle_step(build, install_deps=install_deps) is False
        errors = [text for kind, text in said if kind == 'error']
        assert len(errors) == 1
        assert 'npm' in errors[0]
        assert all(word in errors[0] for word in _NAMES_THE_FIX)
        assert len([c for c in ran if c[0] != 'node']) == 1
        assert _old_bundle_is_untouched(tmp_path)

    # Review of 7e58a9a0c: any OSError from starting npm was reported as
    # "npm.cmd not found ... Install Node.js 20", also when npm was there and
    # Windows would not start it.  Only a missing file is "not found".
    _NOT_A_MISSING_TOOL = [
        PermissionError(13, 'Access is denied', 'npm.cmd'),
        OSError(22, 'The paging file is too small for this operation to complete'),
        OSError(8, 'Exec format error'),
    ]

    @pytest.mark.parametrize('error', _NOT_A_MISSING_TOOL, ids=lambda e: type(e).__name__ + str(e.errno))
    @pytest.mark.parametrize('install_deps', [True, False])
    def test_npm_that_is_there_and_will_not_start_is_not_called_missing(
            self, build, monkeypatch, tmp_path, install_deps, error):
        ran = _npm(build, monkeypatch, tmp_path, npm_error=error, old_bundle=True)
        said = _said(build, monkeypatch)
        assert _bundle_step(build, install_deps=install_deps) is False
        errors = [text for kind, text in said if kind == 'error']
        assert len(errors) == 1
        assert 'not found' not in errors[0]
        assert 'Install Node.js' not in errors[0]
        assert type(error).__name__ in errors[0] and str(error) in errors[0]
        assert 'npm' in errors[0] and 'could not be started' in errors[0]
        assert 'Check' in errors[0] and 'build again' in errors[0]
        assert len([c for c in ran if c[0] != 'node']) == 1
        assert _old_bundle_is_untouched(tmp_path)

    @pytest.mark.parametrize('error', _NOT_A_MISSING_TOOL, ids=lambda e: type(e).__name__ + str(e.errno))
    def test_node_that_is_there_and_will_not_start_is_not_called_missing(
            self, build, monkeypatch, tmp_path, error):
        ran = _npm(build, monkeypatch, tmp_path, node_error=error, old_bundle=True)
        said = _said(build, monkeypatch)
        assert _bundle_step(build) is False
        errors = [text for kind, text in said if kind == 'error']
        assert len(errors) == 1
        assert 'not found' not in errors[0]
        assert 'Install Node.js' not in errors[0]
        assert type(error).__name__ in errors[0] and str(error) in errors[0]
        assert 'node could not be started' in errors[0]
        assert ran == [['node', '--version']]
        assert _old_bundle_is_untouched(tmp_path)

    # Review of 4482af66: a node that starts and exits non-zero was turned
    # into FileNotFoundError and reported as "Node.js not found".
    @pytest.mark.parametrize('done, shown', [
        (_Done(1, stderr='node: bad option\nnode: error while loading icudt.dll\n'),
         'node: error while loading icudt.dll'),
        (_Done(3221225781, stdout=''), ''),
        (_Done(127, stdout='v20 is broken\n'), 'v20 is broken'),
    ], ids=['stderr', 'silent', 'stdout'])
    def test_node_that_runs_and_fails_is_not_called_missing(
            self, build, monkeypatch, tmp_path, done, shown):
        ran = _npm(build, monkeypatch, tmp_path, node_done=done, old_bundle=True)
        said = _said(build, monkeypatch)
        assert _bundle_step(build) is False
        errors = [text for kind, text in said if kind == 'error']
        assert len(errors) == 1
        assert 'not found' not in errors[0]
        assert 'Install Node.js' not in errors[0]
        assert f'exit code {done.returncode}' in errors[0]
        assert shown in errors[0]
        assert ('(' in errors[0]) == bool(shown)
        assert 'Check' in errors[0] and 'build again' in errors[0]
        assert ran == [['node', '--version']]
        assert _old_bundle_is_untouched(tmp_path)

    def test_the_node_check_is_given_a_time_limit(self, build, monkeypatch, tmp_path):
        seen = []
        _npm(build, monkeypatch, tmp_path, seen=seen)
        assert build.build_react_landing_page() is True
        assert len(seen) == 1
        assert isinstance(seen[0].get('timeout'), (int, float)) and 0 < seen[0]['timeout'] <= 120

    def test_a_node_that_never_answers_stops_the_build_and_says_so(
            self, build, monkeypatch, tmp_path):
        hang = build.subprocess.TimeoutExpired(['node', '--version'], 60)
        ran = _npm(build, monkeypatch, tmp_path, node_error=hang, old_bundle=True)
        said = _said(build, monkeypatch)
        assert _bundle_step(build) is False
        errors = [text for kind, text in said if kind == 'error']
        assert len(errors) == 1
        assert 'no answer' in errors[0] and 'seconds' in errors[0]
        assert 'not found' not in errors[0] and 'Install Node.js' not in errors[0]
        assert 'Check' in errors[0] and 'build again' in errors[0]
        assert ran == [['node', '--version']]
        assert _old_bundle_is_untouched(tmp_path)

    def test_a_failed_refresh_install_warns_and_the_build_step_decides(
            self, build, monkeypatch, tmp_path):
        ran = _npm(build, monkeypatch, tmp_path, install_rc=1)
        said = _said(build, monkeypatch)
        assert build.build_react_landing_page() is True
        assert [c[1] for c in ran if c[0] != 'node'] == ['install', 'run']
        assert [kind for kind, _text in said] == ['warn']
        assert 'npm install failed' in said[0][1]

    def test_a_failed_refresh_install_then_a_failed_build_is_a_failed_bundle(
            self, build, monkeypatch, tmp_path):
        _npm(build, monkeypatch, tmp_path, install_rc=1, build_rc=1, old_bundle=True)
        said = _said(build, monkeypatch)
        assert build.build_react_landing_page() is False
        assert [kind for kind, _text in said][0] == 'warn'
        assert _old_bundle_is_untouched(tmp_path)

    def test_a_good_install_says_nothing_is_wrong(self, build, monkeypatch, tmp_path):
        _npm(build, monkeypatch, tmp_path)
        said = _said(build, monkeypatch)
        assert build.build_react_landing_page() is True
        assert said == []
