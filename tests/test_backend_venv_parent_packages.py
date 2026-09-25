"""ensure_venv leaves the venv able to import the HARTOS dispatcher.

Measured 2026-09-20 on the installed build: chatterbox_turbo's venv (made
2026-05-03 from python-embed) died on every spawn with "No module named
'integrations'".  A venv created from python-embed boots isolated (python-
embed's ._pth applies to it) and ignores PYTHONPATH, so the only route to
the app packages is a .pth in the venv's own site-packages.  The writer is
core.venv_paths.ensure_parent_packages_visible; ensure_venv must call it on
the create path AND on the short-circuit path, so a venv from before the
fix is repaired the next time anything asks for it.

    python -m pytest tests/test_backend_venv_parent_packages.py -q
"""
from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest
from core import venv_paths

from tts import backend_venv

BACKEND = "pth_backend"


@pytest.fixture
def venv_root(tmp_path, monkeypatch):
    monkeypatch.setenv("NUNBA_VENV_ROOT_OVERRIDE", str(tmp_path))
    backend_venv._reset_cache_for_tests()
    yield tmp_path
    backend_venv._reset_cache_for_tests()


@pytest.fixture
def fake_venv_module(monkeypatch):
    """Stand in for `python -m venv`: lay down the interpreter file and the
    site-packages dir, which is all the writer needs to see."""
    calls = []

    def _run(cmd, **kwargs):
        calls.append(list(cmd))
        target = Path(cmd[-1])
        py = backend_venv._python_exe_in(target)
        py.parent.mkdir(parents=True, exist_ok=True)
        py.write_text("", encoding="utf-8")
        Path(venv_paths.venv_site_packages(BACKEND)).mkdir(parents=True, exist_ok=True)
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(backend_venv.subprocess, "run", _run)
    return calls


def _pth(backend):
    return Path(venv_paths.venv_site_packages(backend)) / venv_paths.PARENT_PACKAGES_PTH


def _lines(backend):
    return _pth(backend).read_text(encoding=venv_paths._pth_encoding()).splitlines()


def test_a_new_venv_gets_the_parent_packages_pth(venv_root, fake_venv_module):
    pyexe = backend_venv.ensure_venv(BACKEND)
    assert pyexe.is_file()
    assert len(fake_venv_module) == 1
    assert _lines(BACKEND) == venv_paths.parent_package_roots()


def test_a_venv_from_before_the_fix_is_repaired_on_the_next_ensure(
        venv_root, fake_venv_module):
    pyexe = backend_venv.ensure_venv(BACKEND)
    _pth(BACKEND).unlink()                       # python.exe present, no .pth
    assert backend_venv.ensure_venv(BACKEND) == pyexe
    assert len(fake_venv_module) == 1, "the short-circuit path must not re-create"
    assert _lines(BACKEND) == venv_paths.parent_package_roots()


def test_a_hartos_tree_without_the_writer_never_breaks_ensure_venv(
        venv_root, fake_venv_module, monkeypatch, caplog):
    """Version skew on a dev box: this Nunba tree beside an older HARTOS
    tree whose core.venv_paths predates the writer.  The venv must still
    be created and returned; the gap is logged, not raised."""
    monkeypatch.delattr(venv_paths, "ensure_parent_packages_visible")
    with caplog.at_level("WARNING", logger=backend_venv.logger.name):
        pyexe = backend_venv.ensure_venv(BACKEND)
    assert pyexe.is_file()
    assert not _pth(BACKEND).exists()
    assert any("parent packages" in r.getMessage() for r in caplog.records)
