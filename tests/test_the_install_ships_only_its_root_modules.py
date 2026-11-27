"""The install ships only the root modules the app loads (review rv_sweep of c3ba0850).

The freeze takes every git-TRACKED root *.py (scripts/setup_freeze_nunba.py, through
scripts/deps.tracked_files, the 10-21 fix that stopped untracked scratch scripts shipping).  The
owner-ordered sweep of 2026-11-26 tracked check_python.py, check_version.py and run_python.py,
so the next build would have put all three in every install.  This runs the real selection on
this work tree and holds it to the modules app.py loads.
"""
import glob
import os
from pathlib import Path

from scripts.deps import tracked_files

ROOT = Path(__file__).resolve().parents[1]

#: The root modules an install needs: app.py (the entry, frozen itself) loads these by path.
SHIPPED_ROOT_MODULES = ['main.py', 'wamp_router.py']


def _shipped(paths):
    """setup_freeze_nunba.py's include_files rule for root *.py, on tracked paths."""
    return sorted(f for f in tracked_files(paths)
                  if f not in ("app.py", "setup.py") and not f.startswith(("test_", "_test_")))


def test_only_the_app_modules_at_the_root_ship(monkeypatch):
    monkeypatch.chdir(ROOT)
    assert _shipped(glob.glob("*.py")) == SHIPPED_ROOT_MODULES


def test_the_swept_scratch_and_caches_are_not_tracked(monkeypatch):
    monkeypatch.chdir(ROOT)
    for scratch in ('check_python.py', 'check_version.py', 'run_python.py'):
        assert tracked_files([scratch]) == [] or not os.path.exists(scratch), scratch
    swept = [p for p in glob.glob('.aider*/**', recursive=True) + glob.glob('llm/**', recursive=True)
             if os.path.isfile(p)]
    assert tracked_files(swept) == []
