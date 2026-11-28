"""A voice install that fails at pip leaves no half-built venv behind.

LIVE 2026-11-28 10:55:12-10:56:21 IST, installed build: the auto-install of
melotts created its venv, then "pip install 'melotts' failed after 3
attempts" (the PyPI sdist cannot build).  The venv folder stayed, with
python.exe and no ``melo``.  Two hours later a reply's fallback took the
folder for a voice, stopped Whisper to make room for it and spawned a worker
that died on "No module named 'melo'" (31 s for one line).

Owner, 2026-11-28: every failure reason has a way to recover, or to "clear
and install from scratch if there are half baked things interfering".

Now, when the pip step fails, the venv is removed unless its engine still
imports (a failed repair of a voice that works does not delete the voice).
The next attempt starts from nothing.

The installer, the venv layer's wipe and its health check are the real
ones; only the venv's location, the pip run and the import probe are stood
in for.

    python -m pytest tests/test_a_failed_voice_install_leaves_no_half_built_venv.py -q
"""
import pytest

ENGINE = 'melotts'


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
    imports = {'ok': False}
    monkeypatch.setattr(
        backend_venv, 'invoke_in_venv',
        lambda backend, module, args, **k: (0 if imports['ok'] else 1, '', ''))
    return package_installer, root / ENGINE, imports


def test_the_live_failure_leaves_no_folder(installer):
    package_installer, venv, _imports = installer
    ok, message = package_installer.install_backend_full(ENGINE)
    assert not ok and 'venv install failed' in message, message
    assert not venv.exists(), f'half-built venv left at {venv}'


def test_a_failed_repair_keeps_a_voice_that_still_imports(installer):
    package_installer, venv, imports = installer
    imports['ok'] = True
    ok, _message = package_installer.install_backend_full(ENGINE)
    assert not ok
    assert venv.is_dir(), 'a working voice was deleted by a failed repair'
