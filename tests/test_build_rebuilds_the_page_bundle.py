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


def _run_main(build, monkeypatch, argv):
    """main() with argv; returns the calls made to build_react_landing_page."""
    calls = []

    def bundle(*args, **kwargs):
        calls.append((args, kwargs))
        return True

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
        'ensure_iscc': lambda: True,
        'activate_venv': lambda: sys.executable,
        'install_dependencies': lambda python_exe: None,
        'stamp_version': lambda: None,
        'run_setup_wizard': lambda *a, **k: None,
        'build_windows': lambda *a, **k: True,
        'build_macos': lambda *a, **k: True,
        'build_linux': lambda *a, **k: True,
        'print_summary': lambda: None,
        'build_react_landing_page': bundle,
    }.items():
        monkeypatch.setattr(build, name, value)
    assert build.main() == 0
    return calls


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


class _Done:
    def __init__(self, returncode=0):
        self.returncode = returncode


def _npm(build, monkeypatch, tmp_path, *, node_modules=True, build_rc=0,
         node=True, install_rc=0):
    """build_react_landing_page's commands, from a landing-page made here."""
    (tmp_path / 'landing-page').mkdir()
    if node_modules:
        (tmp_path / 'landing-page' / 'node_modules').mkdir()
    monkeypatch.chdir(tmp_path)
    ran = []

    def run(cmd, *args, **kwargs):
        ran.append(list(cmd))
        if cmd[:2] == ['node', '--version']:
            if not node:
                raise FileNotFoundError('node')
            return _Done(0)
        if 'build' in cmd:
            return _Done(build_rc)
        if 'install' in cmd:
            return _Done(install_rc)
        return _Done(0)

    monkeypatch.setattr(build.subprocess, 'run', run)
    return ran


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
        ran = _npm(build, monkeypatch, tmp_path, node=False)
        assert build.build_react_landing_page(install_deps=install_deps) is False
        assert not [c for c in ran if c[0] != 'node']

    def test_a_failed_first_npm_install_is_a_failed_bundle_not_the_old_one(
            self, build, monkeypatch, tmp_path):
        ran = _npm(build, monkeypatch, tmp_path, node_modules=False, install_rc=1)
        assert build.build_react_landing_page() is False
        assert not [c for c in ran if c[1:] == ['run', 'build']]
