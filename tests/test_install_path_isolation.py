"""Regression tests for the install-location sys.path isolation.

Context (2026-04-21 watchdog dump):
  [WATCHDOG] phase='importing_main', total=52s, stuck=31s, threads=4
  ...
  File "C:\\Program Files (x86)\\HevolveAI\\Nunba\\integrations\\social\\models.py", line 16
    from sqlalchemy import (
  ...
  File "C:\\Users\\sathi\\...\\.venv\\Lib\\site-packages\\sqlalchemy\\__init__.py", line 13

The installed Nunba reached back into the developer's .venv for
sqlalchemy, which took 31s+ to cold-import and tripped the 20s stuck
watchdog. The freeze_core console launcher does NOT always set
``sys.frozen = True``, so ``_isolate_frozen_imports()`` short-circuited
and left ``.venv\\Lib\\site-packages`` ahead of bundled ``lib/`` on
sys.path.

These tests assert:
  1. ``_running_from_install_location()`` helper exists and returns True
     when __main__.__file__ points at the install dir, False otherwise.
  2. ``_isolate_frozen_imports()`` runs when install-location is
     detected (even if sys.frozen is False).
  3. The venv-stripping regex covers dev-tree .venv AND PycharmProjects
     paths, not just generic \\site-packages\\.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

APP_PY = Path(__file__).resolve().parent.parent / "app.py"


class InstallPathIsolationStaticTests(unittest.TestCase):
    """Source-level contract tests — no imports required."""

    def test_running_from_install_location_helper_exists(self):
        src = APP_PY.read_text(encoding="utf-8")
        self.assertIn(
            "def _running_from_install_location(",
            src,
            "app.py must define _running_from_install_location() — the "
            "install-dir detection that _isolate_frozen_imports() relies on"
        )

    def test_isolate_gate_accepts_non_frozen_installs(self):
        """The gate on _isolate_frozen_imports() must not short-circuit
        when sys.frozen is False but the process is in the install dir."""
        src = APP_PY.read_text(encoding="utf-8")
        # Find the function body
        start = src.find("def _isolate_frozen_imports(")
        self.assertGreater(start, 0, "_isolate_frozen_imports missing")
        # Slice to the next top-level `def ` or module-level call
        end = src.find("\ndef ", start + 1)
        body = src[start:end] if end > 0 else src[start:]
        # Must reference _running_from_install_location (the OR arm)
        self.assertIn(
            "_running_from_install_location",
            body,
            "_isolate_frozen_imports gate must also fire when running "
            "from the install dir — the freeze_core console launcher "
            "does not always set sys.frozen, so a bare sys.frozen guard "
            "lets .venv's sqlalchemy win sys.path precedence (see "
            "2026-04-21 watchdog dump, 31s stuck)."
        )

    def test_venv_path_pattern_stripped(self):
        """The bad-path regex must match dev-tree venv directories."""
        src = APP_PY.read_text(encoding="utf-8")
        start = src.find("def _isolate_frozen_imports(")
        end = src.find("\ndef ", start + 1)
        body = src[start:end] if end > 0 else src[start:]
        # Must strip \.venv\ paths explicitly
        self.assertIn(
            "\\\\.venv\\\\",
            body,
            "_isolate_frozen_imports must strip \\.venv\\ paths from "
            "sys.path — otherwise the dev venv wins over bundled lib/"
        )
        # Must also strip \pycharmprojects\ paths (dev-tree detector)
        self.assertIn(
            "pycharmprojects",
            body.lower(),
            "_isolate_frozen_imports must strip \\PycharmProjects\\ "
            "paths from sys.path — catches dev-tree source paths"
        )

    def test_virtual_env_env_stripped(self):
        """VIRTUAL_ENV must be popped so subprocesses don't inherit
        the developer's venv root."""
        src = APP_PY.read_text(encoding="utf-8")
        start = src.find("def _isolate_frozen_imports(")
        end = src.find("\ndef ", start + 1)
        body = src[start:end] if end > 0 else src[start:]
        self.assertIn(
            'os.environ.pop("VIRTUAL_ENV"',
            body,
            "_isolate_frozen_imports must pop VIRTUAL_ENV so spawned "
            "subprocesses (llama-server, piper, parler worker) do not "
            "re-add the developer's venv to their own sys.path"
        )

    def test_appdata_roaming_user_site_stripped(self):
        """Regression (2026-04-24): installed Nunba raised
        ``ModuleNotFoundError: No module named 'core.gpu_tier'`` because
        an ancient ``hevolve_backend-0.0.1.dev339`` wheel had dropped a
        partial ``core/`` package at
        ``%APPDATA%\\Roaming\\Python\\Python312\\site-packages\\core``.
        That user-site sits EARLIER on Python's default ``sys.path``
        than both the freeze-bundled ``core/`` and
        ``python-embed\\Lib\\site-packages\\core``, so ``import core``
        bound to the 7-submodule stale copy and every subsequent
        ``from core.gpu_tier import ...`` failed.

        The isolation function MUST strip any path containing
        ``\\appdata\\roaming\\python\\`` so a future user with a
        polluted user-site cannot re-introduce the collision. This is
        the durable fix — an installer cannot clean foreign user-site
        entries, so the frozen app must defend itself at boot."""
        src = APP_PY.read_text(encoding="utf-8")
        start = src.find("def _isolate_frozen_imports(")
        end = src.find("\ndef ", start + 1)
        body = src[start:end] if end > 0 else src[start:]
        self.assertIn(
            "\\\\appdata\\\\roaming\\\\python\\\\",
            body,
            "_isolate_frozen_imports must strip "
            "%APPDATA%\\Roaming\\Python\\<ver>\\site-packages from "
            "sys.path — the 2026-04-24 incident proved an old "
            "hevolve_backend wheel can drop a partial core/ there "
            "that shadows the freeze-bundled core/ and breaks every "
            "`from core.gpu_tier import ...` call in main.py."
        )

    def test_pythonnousersite_env_set(self):
        """PYTHONNOUSERSITE=1 must be set so any subprocess (llama-server,
        piper, TTS workers, pip installs) inherits the scrub — otherwise
        those children re-discover user-site at their own boot."""
        src = APP_PY.read_text(encoding="utf-8")
        start = src.find("def _isolate_frozen_imports(")
        end = src.find("\ndef ", start + 1)
        body = src[start:end] if end > 0 else src[start:]
        self.assertIn(
            'os.environ["PYTHONNOUSERSITE"] = "1"',
            body,
            "_isolate_frozen_imports must set PYTHONNOUSERSITE=1 so "
            "every subprocess inherits the user-site block"
        )

    def test_site_enable_user_site_patched(self):
        """``site.ENABLE_USER_SITE = False`` belt for in-process
        ``site.addsitedir()`` callers (e.g. Hevolve_Database) that
        would otherwise re-discover user-site after our strip."""
        src = APP_PY.read_text(encoding="utf-8")
        start = src.find("def _isolate_frozen_imports(")
        end = src.find("\ndef ", start + 1)
        body = src[start:end] if end > 0 else src[start:]
        self.assertIn(
            "site.ENABLE_USER_SITE = False",
            body,
            "_isolate_frozen_imports must patch "
            "site.ENABLE_USER_SITE=False so downstream code that "
            "calls site.addsitedir() cannot re-add user-site"
        )

    def test_pythonnousersite_set_at_module_top(self):
        """Belt layer (2026-04-25): PYTHONNOUSERSITE must be set at the
        VERY TOP of app.py — before any import that could pull in a
        user-site module. ``_isolate_frozen_imports()`` runs late (after
        torch pre-warm, pycparser preload), which is too late if a
        module imported earlier reaches into user-site.

        Setting ``os.environ['PYTHONNOUSERSITE']='1'`` at the module
        top has no effect on the CURRENT interpreter (site.py already
        ran), but it guarantees every subprocess spawned from ANY
        point in app.py inherits the scrub — including any that might
        be spawned before ``_isolate_frozen_imports()`` fires."""
        src = APP_PY.read_text(encoding="utf-8")
        # The setting must appear before the first `def ` in the file
        first_def = src.find("\ndef ")
        self.assertGreater(first_def, 0, "app.py must define functions")
        prologue = src[:first_def]
        self.assertIn(
            'PYTHONNOUSERSITE',
            prologue,
            "app.py module-top prologue (before first def) must set "
            "PYTHONNOUSERSITE so every subprocess inherits it, even "
            "if spawned before _isolate_frozen_imports() fires"
        )


class InstallPathIsolationBehaviouralTests(unittest.TestCase):
    """Runtime: actually exercise ``_isolate_frozen_imports`` against a
    polluted ``sys.path`` and assert the rogue AppData\\Roaming entry
    is gone."""

    def _load_isolate_fn(self):
        """Compile just the helper + isolate function into a scratch
        namespace — app.py's module top is too heavy to exec().

        Extract each function body by locating the ``def`` line and
        scanning forward until the first unindented non-blank line.
        That bounds the fragment exactly to the function definition
        regardless of what follows it in app.py."""
        import os as _os

        def _extract(src: str, name: str) -> str:
            marker = f"def {name}("
            start = src.find(marker)
            if start < 0:
                raise RuntimeError(f"{name} not found in app.py")
            # Walk line-by-line from the def to the first unindented
            # non-blank line (end of the function body).
            lines = src[start:].splitlines(keepends=True)
            out = [lines[0]]  # the def line itself
            for line in lines[1:]:
                stripped = line.lstrip()
                if not stripped or stripped.startswith("#"):
                    out.append(line)
                    continue
                # First character of a non-blank line is non-whitespace
                # → we've left the function body.
                if line[0] not in (" ", "\t"):
                    break
                out.append(line)
            return "".join(out)

        src = APP_PY.read_text(encoding="utf-8")
        helper = _extract(src, "_running_from_install_location")
        isolate = _extract(src, "_isolate_frozen_imports")
        fragment = helper + "\n" + isolate
        ns = {"os": _os, "sys": sys}
        exec(compile(fragment, str(APP_PY), "exec"), ns)
        return ns["_isolate_frozen_imports"], ns["_running_from_install_location"]

    def test_runtime_strip_appdata_roaming_even_when_not_frozen(self):
        """Polluted user-site must be scrubbed when the process is
        detected as running from the install directory, even if
        ``sys.frozen`` is False (freeze_core console launcher case)."""
        fn, _ = self._load_isolate_fn()

        fake_rogue = r"C:\Users\test\AppData\Roaming\Python\Python312\site-packages"
        saved_path = list(sys.path)
        saved_argv = list(sys.argv)
        saved_frozen = getattr(sys, "frozen", None)
        try:
            # Force the install-location detector to fire without
            # actually needing sys.frozen=True.
            sys.argv = [r"C:\Program Files (x86)\HevolveAI\Nunba\main.py"]
            if hasattr(sys, "frozen"):
                del sys.frozen
            sys.path.insert(0, fake_rogue)
            fn()
            self.assertNotIn(
                fake_rogue, sys.path,
                "_isolate_frozen_imports must remove the fake "
                "AppData\\Roaming user-site entry — without this, the "
                "2026-04-24 core.gpu_tier collision reappears on any "
                "machine with a stale hevolve_backend wheel"
            )
        finally:
            sys.path[:] = saved_path
            sys.argv[:] = saved_argv
            if saved_frozen is not None:
                sys.frozen = saved_frozen


class InstallPathIsolationRuntimeTests(unittest.TestCase):
    """Behavioural tests — exercise the helper in-process."""

    def test_helper_returns_false_on_dev_tree(self):
        """Running from the dev worktree must NOT be flagged as installed."""
        # Import the helper.  app.py is large but the helper is at module
        # top before any heavy imports fire.
        sys.path.insert(0, str(APP_PY.parent))
        try:
            import importlib.util
            spec = importlib.util.spec_from_file_location("app_under_test", APP_PY)
            # We can't fully exec app.py here (it triggers heavy imports,
            # tray, etc.).  Instead, compile just the helper definition
            # into a scratch namespace.
            src = APP_PY.read_text(encoding="utf-8")
            start = src.find("def _running_from_install_location(")
            end = src.find("\ndef ", start + 1)
            helper_src = src[start:end]
            ns = {"os": __import__("os"), "sys": sys}
            exec(compile(helper_src, str(APP_PY), "exec"), ns)
            _fn = ns["_running_from_install_location"]
            # Current pytest process is running from the dev worktree
            # (no \HevolveAI\Nunba\ in any path), so must return False.
            self.assertFalse(
                _fn(),
                "_running_from_install_location must return False when "
                "pytest runs from the dev worktree"
            )
        finally:
            if str(APP_PY.parent) in sys.path:
                sys.path.remove(str(APP_PY.parent))


if __name__ == "__main__":
    unittest.main()
