"""An engine installs under the name its plan, venv and worker are kept by.

Measured on build 75 (2026-11-17 audit): F5 never installed.  Nunba calls it
'f5'; its install plan, its venv and its ToolWorker are keyed by the HARTOS
engine id 'f5_tts'.  install_backend_full('f5') looked the venv plan up under
'f5', found none, took the main-interpreter path, and install_backend_packages
answered "No packages needed for f5", which reads as success.  Only the weights
were fetched; the package was never installed anywhere.

Pinned here:
  - a Nunba name resolves to the engine's venv plan, venv and worker;
  - a HARTOS id keeps working as it is;
  - the install lock goes by the venv being filled, so an install asked as
    'f5' and one asked as 'f5_tts' never pip into that venv at once;
  - an engine that installs into its own venv but has no plan found fails
    and says so, instead of "No packages needed";
  - an engine that truly needs nothing (bundled) still answers that.

Nothing real is installed, downloaded or locked: the venv builder, the pip
step, the weights step and the file lock are all fakes.
"""
import sys
from types import SimpleNamespace

import pytest

import tts.backend_venv as backend_venv
import tts.package_installer as pi

PLAN = ['f5-tts==1.1.7']


@pytest.fixture
def world(monkeypatch):
    """A registry with one venv engine, F5, and a recorder for every side effect."""
    seen = SimpleNamespace(venv_built=[], venv_installed=[], main_installed=[],
                           locks=[], held=set(),
                           worker=SimpleNamespace(python_exe='python-embed', stop=lambda: None))
    registry = {'f5_tts': SimpleNamespace(install_target='venv',
                                          tool_module='fake_f5_tool_for_test',
                                          tool_worker_attr='worker')}
    monkeypatch.setitem(sys.modules, 'fake_f5_tool_for_test',
                        SimpleNamespace(worker=seen.worker))
    monkeypatch.setattr(pi, '_hartos_engine_registry', lambda: registry)
    monkeypatch.setattr(pi, 'BACKEND_VENV_PACKAGES', {'f5_tts': list(PLAN)})
    monkeypatch.setattr(pi, 'BACKEND_PACKAGES', {'f5': [], 'f5_tts': [], 'piper': []})
    def acquire(name):
        if name in seen.held:
            seen.locks.append(('refused', name))
            return False
        seen.held.add(name)
        seen.locks.append(('take', name))
        return True

    def release(name):
        seen.held.discard(name)
        seen.locks.append(('release', name))

    monkeypatch.setattr(pi, '_acquire_file_lock', acquire)
    monkeypatch.setattr(pi, '_release_file_lock', release)
    monkeypatch.setattr(pi, '_apply_post_install_patches', lambda backend: None)
    monkeypatch.setattr(pi, '_download_model_weights',
                        lambda backend, progress_cb=None: (True, 'weights ok'))

    def ensure_venv(name):
        seen.venv_built.append(name)
        return f'C:/venvs/{name}/Scripts/python.exe'

    def install_into_venv(name, packages):
        seen.venv_installed.append((name, list(packages)))
        return True, f'installed {len(packages)}'

    real_main = pi.install_backend_packages

    def install_backend_packages(backend, progress_cb=None):
        seen.main_installed.append(backend)
        return real_main(backend, progress_cb)

    monkeypatch.setattr(backend_venv, 'ensure_venv', ensure_venv)
    monkeypatch.setattr(backend_venv, 'install_into_venv', install_into_venv)
    monkeypatch.setattr(pi, 'install_backend_packages', install_backend_packages)
    pi._installing.clear()
    yield seen
    pi._installing.clear()


def test_f5_by_its_nunba_name_installs_its_plan_into_its_own_venv(world):
    ok, msg = pi.install_backend_full('f5')
    assert world.venv_installed == [('f5_tts', PLAN)], (ok, msg, world.main_installed)
    assert world.venv_built == ['f5_tts']
    assert ok is True, msg


def test_f5_by_its_nunba_name_never_reaches_the_main_interpreter(world):
    pi.install_backend_full('f5')
    assert world.main_installed == []


def test_the_f5_worker_is_pointed_at_the_venv_it_was_installed_into(world):
    pi.install_backend_full('f5')
    assert world.worker.python_exe == 'C:/venvs/f5_tts/Scripts/python.exe'


def test_the_registry_name_keeps_installing_as_before(world):
    ok, msg = pi.install_backend_full('f5_tts')
    assert world.venv_installed == [('f5_tts', PLAN)]
    assert ok is True, msg


def test_an_install_asked_as_f5_holds_the_lock_of_the_venv_it_fills(world):
    pi.install_backend_full('f5')
    assert world.locks == [('take', 'install_f5_tts'), ('release', 'install_f5_tts')]


def test_while_the_f5_venv_is_being_filled_an_install_asked_as_f5_does_not_pip_beside_it(world):
    world.held.add('install_f5_tts')   # an install asked as 'f5_tts', or a background one
    ok, msg = pi.install_backend_full('f5')
    assert ok is False, msg
    assert world.venv_built == [] and world.venv_installed == []


def test_the_registry_name_keeps_its_own_lock(world):
    pi.install_backend_full('f5_tts')
    assert world.locks == [('take', 'install_f5_tts'), ('release', 'install_f5_tts')]


def test_a_venv_engine_whose_plan_is_missing_fails_instead_of_needing_nothing(world, monkeypatch):
    monkeypatch.setattr(pi, 'BACKEND_VENV_PACKAGES', {})
    ok, msg = pi.install_backend_packages('f5')
    assert ok is False
    assert 'No packages needed' not in msg
    assert 'f5' in msg


def test_an_engine_that_is_bundled_still_needs_nothing(world):
    ok, msg = pi.install_backend_packages('piper')
    assert ok is True
    assert 'No packages needed' in msg
