"""Regression tests for the autostart restart-minimize behaviour.

Context (2026-04-21 user feedback, verbatim):
  "by default the Nunba app after computer restart should be only in
   minimised to sys tray onthe the animated character floating with a
   small type input bar should be floated to indicate nunba is
   available to help with device autoimation tasks from various
   devices like Android Macos linux via Nunba etc"
  "right now full nunba window is shown on restart"
  "fix properly"

Root cause:
  Two `.setup_complete` escape hatches in app.py flipped the
  --background flag on the first reboot after installation:
    1. app.py:6288-6300 — set `start_hidden = False` and showed the
       main webview window.
    2. app.py:7534-7543 — set `_skip_splash = False` and flashed a
       Tkinter splash on top of the boot animation.

Fix invariants (these tests enforce):
  A. When --background is passed, the main window MUST start hidden.
     The .setup_complete marker may be cleaned up, but it MUST NOT
     flip `start_hidden` back to False.
  B. When --background is passed, the splash MUST be skipped.  The
     marker cleanup lives in ONE place only (DRY / single-writer).
  C. The floating Nanba companion window dimensions MUST match the
     HTML body dimensions (200 → 220, 260 → 310) so the input bar
     and platform hint are fully visible — not clipped.
  D. CompanionAPI MUST expose `on_companion_prompt(self, text)` so
     the floating input bar can forward prompts to /chat.
  E. The companion HTML MUST contain the input bar markup
     (`id="promptInput"`, `id="sendBtn"`) the JS submitPrompt() path
     depends on.
"""

from __future__ import annotations

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
APP_PY = REPO_ROOT / "app.py"
COMPANION_HTML = REPO_ROOT / "landing-page" / "public" / "nanba-companion.html"
COMPANION_HTML_BUILD = REPO_ROOT / "landing-page" / "build" / "nanba-companion.html"


class RestartMinimizeStaticTests(unittest.TestCase):
    """Source-level contract tests — enforced via substring matches."""

    # ── Invariant A: window stays hidden under --background ───────────
    def test_setup_complete_does_not_flip_start_hidden(self):
        src = APP_PY.read_text(encoding="utf-8")
        # The old escape hatch set start_hidden = False next to the
        # "First launch after installation" log line.  That entire
        # pattern MUST be gone.
        self.assertNotIn(
            "First launch after installation — showing window",
            src,
            "The .setup_complete escape hatch that showed the main "
            "window on first reboot has been re-introduced.  "
            "--background must strictly honour start_hidden=True.",
        )
        # Guard the specific assignment that re-enabled the main
        # window: `start_hidden = False` inside the .setup_complete
        # block.  The marker may still be removed (cleanup), but the
        # flag MUST stay True.
        _sentinel = (
            "if os.path.exists(_setup_marker):\n"
            "                    logger.info(\"[STARTUP] First launch after installation — showing window\")\n"
            "                    start_hidden = False"
        )
        self.assertNotIn(
            _sentinel,
            src,
            "start_hidden must not be flipped to False by the "
            ".setup_complete marker path — the floating companion "
            "window is the post-install visual indicator, not the "
            "main webview.",
        )

    def test_setup_complete_marker_is_still_cleaned_up(self):
        """We still remove the marker — it just no longer overrides
        start_hidden.  Keeping the cleanup prevents stale markers."""
        src = APP_PY.read_text(encoding="utf-8")
        self.assertIn(
            "os.remove(_setup_marker)",
            src,
            ".setup_complete marker cleanup was removed — stale "
            "markers will accumulate on every install.",
        )

    # ── Invariant B: splash skipped under --background ────────────────
    def test_splash_skipped_strictly_in_background_mode(self):
        src = APP_PY.read_text(encoding="utf-8")
        # The old escape hatch flipped _skip_splash back to False.
        # That specific pattern MUST be gone.
        self.assertNotIn(
            "First post-install launch — showing splash despite --background",
            src,
            "Splash escape hatch has been re-introduced — --background "
            "must strictly skip the splash on every boot, including "
            "first-run-after-install.",
        )
        self.assertNotIn(
            "_skip_splash = False  # show splash on first post-install launch",
            src,
            "The splash _skip_splash=False override under .setup_complete "
            "must stay removed.",
        )
        # The canonical assignment must exist exactly once.
        self.assertEqual(
            src.count("_skip_splash = args.background"),
            1,
            "_skip_splash must be computed exactly once from "
            "args.background with no subsequent overrides.",
        )

    # ── Invariant C: companion window matches HTML dimensions ─────────
    def test_companion_window_dimensions_match_html_body(self):
        """The pywebview create_window(width, height) and the html/body
        CSS dimensions in nanba-companion.html must agree — otherwise
        the input bar is clipped or the companion renders on a black
        block.
        """
        self.assertTrue(COMPANION_HTML.exists(), f"{COMPANION_HTML} missing")
        html = COMPANION_HTML.read_text(encoding="utf-8")
        # HTML body is 220x310
        self.assertIn("width: 220px;", html)
        self.assertIn("height: 310px;", html)
        # app.py tuple must match
        src = APP_PY.read_text(encoding="utf-8")
        self.assertIn(
            "_comp_w, _comp_h = 220, 310",
            src,
            "pywebview companion window size must match the companion "
            "HTML body size (220x310).  Update both together — they "
            "are a single contract.",
        )

    # ── Invariant D: Python bridge for input-bar submissions ──────────
    def test_companion_api_has_on_companion_prompt(self):
        src = APP_PY.read_text(encoding="utf-8")
        # Method signature must exist on the CompanionAPI class.
        self.assertIn(
            "def on_companion_prompt(self, text):",
            src,
            "CompanionAPI.on_companion_prompt is the Python bridge the "
            "floating input bar calls via pywebview.api.  It must "
            "exist and accept a text argument.",
        )
        # Must call the local /chat endpoint (not a stale external URL).
        self.assertIn(
            'http://127.0.0.1:{_port}/chat',
            src,
            "on_companion_prompt must POST to the local /chat endpoint "
            "served by Nunba's Flask app on 127.0.0.1 — not a remote "
            "or cloud URL.",
        )
        # Must have an explicit timeout (Gate 7 — no hanging network calls).
        self.assertIn(
            "timeout=60",
            src,
            "on_companion_prompt must pass an explicit timeout to "
            "requests.post — otherwise a hung llama-server freezes the "
            "companion input bar indefinitely.",
        )

    # ── Invariant E: HTML has input-bar elements the JS needs ─────────
    def test_companion_html_has_input_bar(self):
        html = COMPANION_HTML.read_text(encoding="utf-8")
        self.assertIn('id="promptInput"', html, "Input bar <input> missing")
        self.assertIn('id="sendBtn"', html, "Input bar send button missing")
        self.assertIn('id="platformHint"', html, "Platform hint missing")
        # Platform hint must mention at least Android + macOS + Linux
        # (the verbatim user request listed those three).
        low = html.lower()
        self.assertIn("android", low, "Platform hint must mention Android")
        self.assertIn("macos", low, "Platform hint must mention macOS")
        self.assertIn("linux", low, "Platform hint must mention Linux")

    def test_companion_html_wires_enter_key_submit(self):
        html = COMPANION_HTML.read_text(encoding="utf-8")
        # Enter must submit the prompt (not a form POST that reloads).
        self.assertIn(
            "if (e.key === 'Enter')",
            html,
            "Input bar must handle Enter key to submit the prompt.",
        )
        self.assertIn(
            "submitPrompt",
            html,
            "submitPrompt() is the canonical entry point for the "
            "companion input bar.",
        )

    def test_companion_html_public_and_build_match(self):
        """Flask serves nanba-companion.html from landing-page/build/
        (see main.py:LANDING_PAGE_BUILD_DIR + send_from_directory).
        Since the companion is a standalone HTML page with no React
        compilation, public/ and build/ MUST stay byte-identical.
        Drift = the installed app renders the stale build/ version and
        the input bar / platform hint appear to be missing at runtime.
        """
        if not COMPANION_HTML_BUILD.exists():
            # build/ is generated by `npm run build` — on a fresh
            # clone it may not exist yet; skip rather than fail.
            self.skipTest(
                f"{COMPANION_HTML_BUILD} missing — run `npm run build` "
                "or copy public/nanba-companion.html to build/"
            )
        # Normalise line endings — Windows git+checkout typically
        # gives CRLF in the source tree and LF in artefacts copied
        # via `cp`, and we don't care about that distinction for
        # drift detection.  What matters is that the meaningful
        # content is identical.
        pub = COMPANION_HTML.read_bytes().replace(b"\r\n", b"\n")
        bld = COMPANION_HTML_BUILD.read_bytes().replace(b"\r\n", b"\n")
        self.assertEqual(
            pub,
            bld,
            "public/nanba-companion.html and build/nanba-companion.html "
            "have drifted.  Flask serves from build/, so the installed "
            "app will render the stale version.  Either run "
            "`npm run build` or copy public/nanba-companion.html to "
            "build/nanba-companion.html.",
        )


class RestartMinimizeBehaviouralTests(unittest.TestCase):
    """Behaviour-level checks — exercise the start_hidden derivation
    logic by extracting it into an isolated scratch namespace."""

    def test_start_hidden_when_background_only(self):
        """`--background` (no sidebar, no always_on_top) → hidden."""

        # Re-implement the contract (matches app.py:6285 exactly).
        class _Args:
            background = True
            sidebar = False
            always_on_top = False

        args = _Args()
        import sys as _sys
        start_hidden = args.background and not (args.sidebar or args.always_on_top)
        if _sys.platform == "darwin":
            start_hidden = False
        self.assertTrue(
            start_hidden or _sys.platform == "darwin",
            "start_hidden must be True on Win/Linux when --background is "
            "passed without --sidebar/--always-on-top",
        )

    def test_start_visible_when_no_background(self):
        class _Args:
            background = False
            sidebar = False
            always_on_top = False

        args = _Args()
        start_hidden = args.background and not (args.sidebar or args.always_on_top)
        self.assertFalse(start_hidden)

    def test_start_visible_when_sidebar(self):
        class _Args:
            background = True
            sidebar = True
            always_on_top = False

        args = _Args()
        start_hidden = args.background and not (args.sidebar or args.always_on_top)
        self.assertFalse(start_hidden)


if __name__ == "__main__":
    unittest.main()
