"""A backend venv another interpreter built is never used, and the installed
app rebuilds it.

Measured 2026-09-25 on the installed build (gui_app.log.4 16:48:08-34): the
venvs for neutts_air, melotts and kokoro had been made by a source-mode run on
miniconda 3.11 (pyvenv.cfg home = C:\\Users\\sathi\\miniconda3, version =
3.11.4) in the store the installed 3.12 app shares.  ensure_venv
short-circuited on python.exe existing, is_venv_healthy said yes, the boot
wire pinned the worker to that python, and each worker died with "bad magic
number in 'encodings'".  core.venv_paths.venv_mismatch is the one rule; these
tests drive the real ensure_venv / is_venv_healthy, mocking only
``python -m venv`` (subprocess.run) and the import probe.

    python -m pytest tests/test_backend_venv_foreign_interpreter.py -q
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from core import venv_paths

from tts import backend_venv

BACKEND = "kokoro"


def _write_cfg(vpath: Path, home: str, version: str) -> None:
    vpath.mkdir(parents=True, exist_ok=True)
    (vpath / "pyvenv.cfg").write_text(
        f"home = {home}\ninclude-system-site-packages = false\n"
        f"version = {version}\n", encoding="utf-8")


def _lay_down_venv(vpath: Path, home: str, version: str) -> Path:
    py = backend_venv._python_exe_in(vpath)
    py.parent.mkdir(parents=True, exist_ok=True)
    py.write_text("", encoding="utf-8")
    (vpath / "Lib" / "site-packages").mkdir(parents=True, exist_ok=True)
    (vpath / "lib").mkdir(parents=True, exist_ok=True)
    _write_cfg(vpath, home, version)
    return py


@pytest.fixture
def root(tmp_path, monkeypatch):
    monkeypatch.setenv("NUNBA_VENV_ROOT_OVERRIDE", str(tmp_path / "venvs"))
    backend_venv._reset_cache_for_tests()
    backend_venv.invalidate_venv_probe_cache()
    yield tmp_path
    backend_venv._reset_cache_for_tests()
    backend_venv.invalidate_venv_probe_cache()


@pytest.fixture
def frozen(tmp_path, monkeypatch):
    """The installed build: Nunba.exe with python-embed beside it."""
    app = tmp_path / "Nunba"
    embed = app / "python-embed"
    embed.mkdir(parents=True)
    (app / "Nunba.exe").write_text("", encoding="utf-8")
    (embed / "python.exe").write_text("", encoding="utf-8")
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "executable", str(app / "Nunba.exe"))
    monkeypatch.setattr(sys, "platform", "win32")
    return embed


@pytest.fixture
def venv_module(monkeypatch):
    """Stand in for `<creator> -m venv <path>`: lay down what CPython leaves,
    with the pyvenv.cfg that creator would write."""
    calls = []

    def _run(cmd, **kwargs):
        calls.append(list(cmd))
        creator = cmd[0]
        # CPython records the creator's BASE install as home: for a creator
        # that is itself a venv (this test interpreter) that is not its dir.
        home = (_this_home() if creator == sys.executable
                else os.path.dirname(creator))
        _lay_down_venv(Path(cmd[-1]), home, "%d.%d.%d" % sys.version_info[:3])
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(backend_venv.subprocess, "run", _run)
    return calls


def _this_home():
    base = getattr(sys, "_base_executable", None) or sys.executable
    return os.path.dirname(os.path.abspath(base))


class TestIsVenvHealthy:
    def test_a_foreign_venv_is_not_healthy_and_is_never_probed(
            self, root, monkeypatch):
        _lay_down_venv(backend_venv.venv_path(BACKEND),
                       str(root / "miniconda3"), "3.11.4")
        probes = []
        monkeypatch.setattr(backend_venv, "invoke_in_venv",
                            lambda *a, **k: probes.append(a) or (0, "", ""))
        assert backend_venv.is_venv_healthy(BACKEND) is False
        assert backend_venv.is_venv_healthy(BACKEND, "kokoro") is False
        assert probes == []

    def test_an_own_venv_is_healthy(self, root, monkeypatch):
        _lay_down_venv(backend_venv.venv_path(BACKEND), _this_home(),
                       "%d.%d.%d" % sys.version_info[:3])
        monkeypatch.setattr(backend_venv, "invoke_in_venv",
                            lambda *a, **k: (0, "", ""))
        assert backend_venv.is_venv_healthy(BACKEND) is True
        assert backend_venv.is_venv_healthy(BACKEND, "kokoro") is True


class TestEnsureVenvInstalledApp:
    def test_a_foreign_venv_is_rebuilt_by_python_embed(
            self, root, frozen, venv_module):
        vpath = backend_venv.venv_path(BACKEND)
        _lay_down_venv(vpath, str(root / "miniconda3"), "3.11.4")
        stale = vpath / "Lib" / "site-packages" / "stale_cp311.pyd"
        stale.write_text("", encoding="utf-8")

        pyexe = backend_venv.ensure_venv(BACKEND)

        assert venv_module == [[str(frozen / "python.exe"), "-m", "venv",
                                str(vpath)]]
        assert not stale.exists(), "the foreign venv's packages must go"
        assert pyexe == backend_venv._python_exe_in(vpath) and pyexe.is_file()
        assert venv_paths.venv_mismatch(BACKEND) is None

    def test_an_own_venv_is_kept(self, root, frozen, venv_module):
        vpath = backend_venv.venv_path(BACKEND)
        _lay_down_venv(vpath, str(frozen), "%d.%d.%d" % sys.version_info[:3])
        keep = vpath / "Lib" / "site-packages" / "kept.pyd"
        keep.write_text("", encoding="utf-8")
        assert backend_venv.ensure_venv(BACKEND).is_file()
        assert venv_module == []
        assert keep.exists()

    def test_a_foreign_venv_that_cannot_be_removed_is_not_built_over(
            self, root, frozen, venv_module, monkeypatch):
        # A file in use on Windows: rmtree(ignore_errors=True) leaves it.
        vpath = backend_venv.venv_path(BACKEND)
        _lay_down_venv(vpath, str(root / "miniconda3"), "3.11.4")
        monkeypatch.setattr(backend_venv.shutil, "rmtree",
                            lambda *a, **k: None)
        with pytest.raises(RuntimeError, match="could not be removed"):
            backend_venv.ensure_venv(BACKEND)
        assert venv_module == []

    def test_without_python_embed_it_refuses_loudly(self, root, frozen,
                                                    venv_module):
        os.remove(frozen / "python.exe")
        with pytest.raises(RuntimeError, match="python-embed"):
            backend_venv.ensure_venv(BACKEND)
        assert venv_module == []


class TestEnsureVenvSourceRun:
    def test_a_foreign_venv_is_left_alone_and_the_reason_raised(
            self, root, venv_module):
        # A source run shares the store with the installed app on a dev box;
        # it must not delete the app's venvs (chatterbox_turbo is 246
        # packages), so it says why and stops.
        vpath = backend_venv.venv_path(BACKEND)
        embed_home = str(root / "Nunba" / "python-embed")
        _lay_down_venv(vpath, embed_home, "3.12.6")
        keep = vpath / "Lib" / "site-packages" / "kept.pyd"
        keep.write_text("", encoding="utf-8")
        with pytest.raises(RuntimeError) as err:
            backend_venv.ensure_venv(BACKEND)
        assert embed_home in str(err.value)
        assert "NUNBA_VENV_ROOT_OVERRIDE" in str(err.value)
        assert venv_module == []
        assert keep.exists()

    def test_a_missing_venv_is_created_by_this_interpreter(self, root,
                                                          venv_module):
        pyexe = backend_venv.ensure_venv(BACKEND)
        assert venv_module[0][0] == sys.executable
        assert pyexe.is_file()
        assert venv_paths.venv_mismatch(BACKEND) is None


class TestReviewFollowUps:
    """Review of ad9ce346 / 48d562f7."""

    def test_the_rebuild_drops_the_cached_probe_answers(
            self, root, frozen, venv_module):
        # A foreign venv's cached "importable" must not outlive the rebuild
        # that replaced it (is_venv_healthy would answer from the old venv).
        vpath = backend_venv.venv_path(BACKEND)
        _lay_down_venv(vpath, str(root / "miniconda3"), "3.11.4")
        import time
        now = time.monotonic()
        backend_venv._venv_probe_cache[(BACKEND, "kokoro")] = (now, True)
        backend_venv._venv_probe_cache[("other", "x")] = (now, True)

        backend_venv.ensure_venv(BACKEND)

        assert (BACKEND, "kokoro") not in backend_venv._venv_probe_cache
        assert ("other", "x") in backend_venv._venv_probe_cache

    def test_a_hartos_without_the_rule_adopts_the_venv_as_before(
            self, root, frozen, venv_module, monkeypatch, caplog):
        # An older HARTOS tree: none of the names added since
        # (venv_mismatch; the public validate_backend_name,
        # reset_venv_root_cache, python_embed_dir of 09c1df788).  Installs
        # ship one, and scripts/build.py clones whatever HARTOS is latest.
        # The venv is used as it was before the rule existed, the log says
        # the builder was not checked, and nothing raises ImportError
        # (tts.package_installer calls is_venv_healthy at import).
        vpath = backend_venv.venv_path(BACKEND)
        py = _lay_down_venv(vpath, str(root / "miniconda3"), "3.11.4")
        old = _old_hartos(monkeypatch)
        exposed = []
        monkeypatch.setattr(old, "ensure_parent_packages_visible",
                            lambda b: exposed.append(b))
        with caplog.at_level("WARNING", logger=backend_venv.logger.name):
            assert backend_venv.ensure_venv(BACKEND) == py
            assert backend_venv.is_venv_healthy(BACKEND) is True
            backend_venv._reset_cache_for_tests()
            with pytest.raises(ValueError):
                backend_venv._validate_backend_name("../evil")
        assert venv_module == [], "an old HARTOS must not trigger a rebuild"
        assert exposed == [BACKEND]
        assert any("venv_mismatch" in r.getMessage() and BACKEND in r.getMessage()
                   for r in caplog.records)

    def test_a_hartos_without_python_embed_dir_still_names_the_dir(
            self, root, frozen, venv_module, monkeypatch):
        os.remove(frozen / "python.exe")
        _old_hartos(monkeypatch)
        # Reached through a launcher symlink: the dir named is beside the
        # resolved binary, as HARTOS's python_embed_dir would say.
        link_dir = root / "launcher"
        link_dir.mkdir()
        try:
            os.symlink(Path(sys.executable), link_dir / "Nunba.exe")
        except (OSError, NotImplementedError) as exc:
            pytest.skip(f"no symlinks here: {exc}")
        monkeypatch.setattr(sys, "executable", str(link_dir / "Nunba.exe"))
        with pytest.raises(RuntimeError) as err:
            backend_venv.ensure_venv(BACKEND)
        assert str(Path(os.path.realpath(frozen))) in str(err.value)
        assert str(link_dir / "python-embed") not in str(err.value)
        assert venv_module == []


# Names core.venv_paths gained after the oldest HARTOS an install may carry.
OLD_HARTOS_LACKS = ("venv_mismatch", "validate_backend_name",
                    "reset_venv_root_cache", "python_embed_dir")


def _old_hartos(monkeypatch):
    """Stand an older core.venv_paths in for the real one: the same module
    minus OLD_HARTOS_LACKS, as `from core.venv_paths import X` sees it.
    (Deleting the names from the real module would also break the real
    functions that call them, which an old tree's functions do not.)"""
    import types
    old = types.ModuleType("core.venv_paths")
    for key, value in vars(venv_paths).items():
        if key not in OLD_HARTOS_LACKS:
            setattr(old, key, value)
    monkeypatch.setitem(sys.modules, "core.venv_paths", old)
    import core
    monkeypatch.setattr(core, "venv_paths", old, raising=False)
    for name in OLD_HARTOS_LACKS:
        with pytest.raises(ImportError):
            exec(f"from core.venv_paths import {name}", {})
    return old
