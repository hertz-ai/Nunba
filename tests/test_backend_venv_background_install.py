"""tts.backend_venv.install_in_background / background_install: the venv
install a caller that must not block hands off.

HARTOS's trending-songs job (integrations/trends/daily_job.py, owner ruling
A10d: trending songs are made on her desktop) runs inside the agent daemon's
tick, which starts no thread of its own.  Its worker's interpreter is a
per-backend venv under the data dir (core.venv_paths), the one place a
dependency with conflicting pins lives (instagrapi pins pydantic and
requests above the bundled python-embed's), and install_into_venv is the one
way a backend venv gets its packages.  These tests drive the real
install_in_background with install_into_venv faked (no pip, no network):
one install per backend at a time, its outcome readable afterwards, and a
failure (a False result or a raise) reported, never lost.

    python -m pytest tests/test_backend_venv_background_install.py -q
"""
from __future__ import annotations

import threading
import time

import pytest

from tts import backend_venv

BACKEND = "ig_trends"
PACKAGES = ["pydantic==2.12.5", "instagrapi==3.0.24"]


def _wait_until_done(backend: str, timeout: float = 10.0) -> dict:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        status = backend_venv.background_install(backend)
        if status and not status["running"]:
            return status
        time.sleep(0.01)
    raise AssertionError(f"the background install of {backend!r} never finished")


@pytest.fixture
def fake_install(monkeypatch):
    """install_into_venv replaced: each call blocks until released, then
    answers what the test set (a (ok, msg) pair, or an exception)."""
    state = {"calls": [], "release": threading.Event(), "answer": (True, "installed")}

    def _install(backend, packages, timeout_per_package=1800):
        state["calls"].append((backend, list(packages), threading.current_thread().name))
        state["release"].wait(10)
        if isinstance(state["answer"], BaseException):
            raise state["answer"]
        return state["answer"]
    monkeypatch.setattr(backend_venv, "install_into_venv", _install)
    monkeypatch.setattr(backend_venv, "_background_installs", {})
    yield state
    state["release"].set()


def test_it_returns_at_once_and_installs_on_its_own_thread(fake_install):
    assert backend_venv.install_in_background(BACKEND, PACKAGES) == "started"
    status = backend_venv.background_install(BACKEND)
    assert status["running"] is True and status["ok"] is None
    fake_install["release"].set()
    status = _wait_until_done(BACKEND)
    assert status["ok"] is True and status["message"] == "installed"
    assert status["finished_at"] >= status["started_at"]
    (backend, packages, thread_name), = fake_install["calls"]
    assert (backend, packages) == (BACKEND, PACKAGES)
    assert thread_name != threading.current_thread().name


def test_a_second_ask_while_it_runs_starts_nothing(fake_install):
    assert backend_venv.install_in_background(BACKEND, PACKAGES) == "started"
    assert backend_venv.install_in_background(BACKEND, PACKAGES) == "running"
    fake_install["release"].set()
    _wait_until_done(BACKEND)
    assert len(fake_install["calls"]) == 1


def test_a_failed_install_is_reported_and_can_be_asked_again(fake_install):
    fake_install["answer"] = (False, "pip install 'instagrapi==3.0.24' failed")
    fake_install["release"].set()
    assert backend_venv.install_in_background(BACKEND, PACKAGES) == "started"
    status = _wait_until_done(BACKEND)
    assert status["ok"] is False and "instagrapi" in status["message"]
    fake_install["answer"] = (True, "installed")
    assert backend_venv.install_in_background(BACKEND, PACKAGES) == "started"
    assert _wait_until_done(BACKEND)["ok"] is True
    assert len(fake_install["calls"]) == 2


def test_an_installer_that_raises_is_a_failed_install_not_a_lost_one(fake_install):
    fake_install["answer"] = RuntimeError("venv creation for 'ig_trends' timed out after 180s")
    fake_install["release"].set()
    assert backend_venv.install_in_background(BACKEND, PACKAGES) == "started"
    status = _wait_until_done(BACKEND)
    assert status["ok"] is False and "timed out" in status["message"]


def test_backends_install_independently(fake_install):
    assert backend_venv.install_in_background(BACKEND, PACKAGES) == "started"
    assert backend_venv.install_in_background("indic_parler", ["parler-tts==0.2.2"]) == "started"
    assert backend_venv.background_install("indic_parler")["running"] is True
    fake_install["release"].set()
    _wait_until_done(BACKEND)
    _wait_until_done("indic_parler")
    assert {c[0] for c in fake_install["calls"]} == {BACKEND, "indic_parler"}


@pytest.mark.parametrize("name", ["../escape", "", "a b", ".hidden"])
def test_an_unsafe_backend_name_is_refused_before_anything_starts(fake_install, name):
    with pytest.raises(ValueError):
        backend_venv.install_in_background(name, PACKAGES)
    assert backend_venv.background_install(name) is None
    assert fake_install["calls"] == []


def test_an_empty_package_list_is_refused(fake_install):
    with pytest.raises(ValueError):
        backend_venv.install_in_background(BACKEND, [])
    assert fake_install["calls"] == []


def test_nothing_asked_reads_as_none(fake_install):
    assert backend_venv.background_install(BACKEND) is None


def test_the_status_is_a_copy(fake_install):
    fake_install["release"].set()
    backend_venv.install_in_background(BACKEND, PACKAGES)
    status = _wait_until_done(BACKEND)
    status["ok"] = "tampered"
    assert backend_venv.background_install(BACKEND)["ok"] is True
