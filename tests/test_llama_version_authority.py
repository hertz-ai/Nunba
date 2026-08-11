"""One authority for "which llama.cpp build is serving".

Regression pins for the split that made Nunba report a stale system binary
(trueflow b8200) while a Nunba-managed b10330 actually served:

  find_llama_server()              -> first-existing  (trueflow b8200)
  find_llama_server(min_build=...) -> version-aware   (nunba   b10330)

`get_version()` defaulted to the FIRST form, so every bare caller measured a
binary that was not running.  Two live consequences:

  * check_version_for_model() reported "too old", auto_setup set
    need_gpu_build, and llama.cpp was re-downloaded on EVERY boot while a
    satisfying build sat unused on disk.
  * update_llama_cpp() downloaded into install_dir then re-measured
    first-existing, so old and new both read b8200 — the upgrade could never
    observe its own success and re-queued forever.

The anti-suppression pin below is the important one: the serving record is a
REPORTING authority only.  It must never make a genuinely-needed upgrade look
unnecessary.
"""
import os

import pytest

from llama.llama_installer import LlamaInstaller

STALE = r'C:\stale\.trueflow\llama-server.exe'
SERVING = r'C:\serving\.nunba\llama-server.exe'
_MTIME = 1234.0


class _Preset:
    """Minimal stand-in for ModelPreset (only min_build/display_name used)."""

    def __init__(self, min_build):
        self.min_build = min_build
        self.display_name = 'Test Preset'


@pytest.fixture(autouse=True)
def _hermetic(monkeypatch):
    """Seed the mtime-keyed version cache so no subprocess is spawned.

    get_version() short-circuits on a cache hit keyed by (path, mtime), so
    seeding it exercises the real resolution logic without running
    `llama-server --version`.
    """
    monkeypatch.setattr(LlamaInstaller, '_version_cache',
                        {STALE: (_MTIME, 8200), SERVING: (_MTIME, 10330)},
                        raising=False)
    monkeypatch.setattr(os.path, 'getmtime', lambda _p: _MTIME)
    # The record is class-level; never leak it between tests.
    monkeypatch.setattr(LlamaInstaller, '_serving_binary', None, raising=False)
    yield


def _installer(monkeypatch, *, aware=SERVING, plain=STALE):
    """Installer whose resolver mimics the real two-vocabulary behaviour."""
    inst = LlamaInstaller()

    def _find(check_system_first=True, min_build=None):
        return aware if min_build is not None else plain

    monkeypatch.setattr(inst, 'find_llama_server', _find)
    return inst


def test_bare_get_version_reports_the_serving_binary(monkeypatch):
    """RED before the fix: returned 8200 (first-existing) even while b10330 served."""
    inst = _installer(monkeypatch)

    # No record yet (e.g. pre-spawn, at boot) -> unchanged legacy behaviour.
    assert inst.get_version() == 8200

    LlamaInstaller.note_serving_binary(SERVING)
    assert inst.get_version() == 10330


def test_explicit_path_still_wins_over_the_record(monkeypatch):
    """Candidate probing (find_llama_server's version-aware pass) must not be
    hijacked by the record — it asks about a specific path on purpose."""
    inst = _installer(monkeypatch)
    LlamaInstaller.note_serving_binary(SERVING)

    assert inst.get_version(STALE) == 8200


def test_satisfying_binary_is_measured_even_when_first_existing_is_stale(monkeypatch):
    """The false-positive that re-downloaded llama.cpp on every boot."""
    inst = _installer(monkeypatch)

    is_ok, cur, req = inst.check_version_for_model(_Preset(min_build=9180))

    assert (is_ok, cur, req) == (True, 10330, 9180)


def test_genuine_upgrade_is_not_suppressed(monkeypatch):
    """ANTI-SUPPRESSION PIN.

    When NO candidate meets the floor, the check must still report
    incompatible so auto_setup sets need_gpu_build and the existing download /
    queue path runs.  A serving record must never mask a real upgrade need.
    """
    inst = _installer(monkeypatch, aware=STALE, plain=STALE)
    LlamaInstaller.note_serving_binary(STALE)

    is_ok, cur, req = inst.check_version_for_model(_Preset(min_build=9180))

    assert is_ok is False
    assert (cur, req) == (8200, 9180)


def test_no_floor_means_always_compatible(monkeypatch):
    """Presets without a min_build must not be gated on any build number."""
    inst = _installer(monkeypatch)
    LlamaInstaller.note_serving_binary(STALE)

    assert inst.check_version_for_model(_Preset(min_build=None)) == (True, None, None)


def test_note_serving_binary_clears_and_stringifies(monkeypatch):
    from pathlib import Path

    LlamaInstaller.note_serving_binary(Path(SERVING))
    assert LlamaInstaller._serving_binary == SERVING

    LlamaInstaller.note_serving_binary(None)
    assert LlamaInstaller._serving_binary is None
