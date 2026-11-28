"""A voice install that fails at pip leaves no half-built venv behind, and
never takes a working voice with it.

LIVE 2026-11-28 10:55:12-10:56:21 IST, installed build: the auto-install of
melotts created its venv, then "pip install 'melotts' failed after 3
attempts" (the PyPI sdist cannot build).  The venv folder stayed, with
python.exe and no ``melo``.  Two hours later a reply's fallback took the
folder for a voice, stopped Whisper to make room for it and spawned a worker
that died on "No module named 'melo'" (31 s for one line).

Owner, 2026-11-28: every failure reason has a way to recover, or to "clear
and install from scratch if there are half baked things interfering".

When the pip step fails, the venv is removed only when it is known to hold
no engine: this install created it, or its own interpreter says "No module
named <engine>".  Review of 35266de3: the first version asked "is it
healthy", and a probe that TIMED OUT read as "does not import", so a slow
probe after an offline failed repair would have wiped a voice that works.
A timeout, or any other failure, now keeps the venv.

The installer and the venv layer's wipe are the real ones; only the venv's
location, the pip run and the interpreter's answer are stood in for.

    python -m pytest tests/test_a_failed_voice_install_leaves_no_half_built_venv.py -q
"""
import pytest

ENGINE = 'melotts'
NO_MODULE = (1, '', "ModuleNotFoundError: No module named 'melo'")
TIMED_OUT = (124, '', 'probe timed out after 90s')
IMPORTS = (0, '', '')
OTHER_FAILURE = (1, '', 'OSError: [WinError 1455] The paging file is too small')


@pytest.fixture
def installer(tmp_path, monkeypatch):
    from tts import backend_venv, package_installer

    root = tmp_path / 'venvs'
    monkeypatch.setattr(backend_venv, 'venv_path', lambda b: root / b)
    monkeypatch.setattr(backend_venv, '_foreign_venv_reason', lambda b: None)
    monkeypatch.setattr(backend_venv, '_venv_probe_cache', {})

    def _ensure(backend):
        """What ensure_venv leaves: the folder and its interpreter."""
        pyexe = backend_venv._python_exe_in(root / backend)
        pyexe.parent.mkdir(parents=True, exist_ok=True)
        pyexe.write_bytes(b'')
        return pyexe

    monkeypatch.setattr(backend_venv, 'ensure_venv', _ensure)
    monkeypatch.setattr(
        backend_venv, 'install_into_venv',
        lambda backend, pkgs: (False, "pip install 'melotts' failed after 3 attempts"))
    monkeypatch.setitem(package_installer.BACKEND_VENV_PACKAGES, ENGINE,
                        ['melotts', 'soundfile'])
    probe = {'answer': NO_MODULE, 'asked': 0}

    def _invoke(backend, module, args, **k):
        probe['asked'] += 1
        return probe['answer']

    monkeypatch.setattr(backend_venv, 'invoke_in_venv', _invoke)
    return package_installer, root / ENGINE, probe, _ensure


def test_the_live_failure_leaves_no_folder(installer):
    """No venv before the install: what the failed pip step leaves is wiped,
    without asking any interpreter."""
    package_installer, venv, probe, _ensure = installer
    ok, message = package_installer.install_backend_full(ENGINE)
    assert not ok and 'venv install failed' in message, message
    assert not venv.exists(), f'half-built venv left at {venv}'
    assert probe['asked'] == 0


def test_an_older_half_built_venv_is_cleared_when_its_interpreter_says_so(installer):
    """The folder the 10:56 failure left is still there at the next attempt."""
    package_installer, venv, probe, _ensure = installer
    _ensure(ENGINE)
    probe['answer'] = NO_MODULE
    ok, _message = package_installer.install_backend_full(ENGINE)
    assert not ok
    assert not venv.exists()


SUBMODULE_MISSING = (1, '', "ModuleNotFoundError: No module named 'melo.api'")
ANOTHER_MISSING = (1, '', "ModuleNotFoundError: No module named 'soundfile'")


@pytest.mark.parametrize(
    'answer', [IMPORTS, TIMED_OUT, OTHER_FAILURE, SUBMODULE_MISSING, ANOTHER_MISSING],
    ids=['still_imports', 'probe_timed_out', 'fails_another_way',
         'engine_submodule_missing', 'another_package_missing'])
def test_a_failed_repair_keeps_a_venv_not_known_to_be_empty(installer, answer):
    """A venv that was there before the install is a voice that may work."""
    package_installer, venv, probe, _ensure = installer
    _ensure(ENGINE)
    probe['answer'] = answer
    ok, _message = package_installer.install_backend_full(ENGINE)
    assert not ok
    assert venv.is_dir(), f'a venv not known to be empty was deleted ({answer[2]!r})'


def test_a_venv_that_cannot_be_removed_whole_is_said_so(installer, monkeypatch, caplog):
    """wipe_venv ignores what it cannot delete (a file held open on Windows)."""
    from tts import backend_venv
    package_installer, venv, probe, _ensure = installer
    monkeypatch.setattr(backend_venv.shutil, 'rmtree', lambda *a, **k: None)
    with caplog.at_level('WARNING'):
        package_installer.install_backend_full(ENGINE)
    assert venv.exists()
    assert any('could not be removed whole' in r.getMessage() for r in caplog.records)
