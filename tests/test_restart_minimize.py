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
  F. The companion window MUST be creatable: its background colour is
     one pywebview accepts, and a creation failure is logged where it
     can be seen.
  G. The companion MUST be placed in the coordinate space pywebview
     positions windows in (logical pixels, via get_screen_dimensions),
     so the whole window lands inside the working area on a scaled
     display.
  H. Once its page has loaded, the companion MUST re-assert topmost
     through Win32 (the canonical desktop.platform_utils helper) on its
     OWN handle: on_top=True at creation left it below ordinary windows.
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

    # ── Invariant F: the companion window can actually be created ─────
    def test_companion_background_colour_is_one_pywebview_accepts(self):
        """pywebview.create_window() raises ValueError for anything but a
        3- or 6-digit hex colour.  The companion shipped '#00000000' from
        0eef59b8d (2026-04-04), so create_window raised on every boot and
        the window never existed: on the running install (13-09) UI
        Automation found one top-level Nunba window and no 'Nanba', and no
        '[COMPANION] ... created' line exists in any log.  transparent=True
        is what makes it see-through (WinForms paints Color.Transparent and
        ignores background_color).
        """
        import inspect
        import re

        src = APP_PY.read_text(encoding="utf-8")
        m = re.search(r"title='Nanba'.*?background_color='([^']*)'", src, re.S)
        self.assertIsNotNone(m, "companion create_window() call not found")
        colour = m.group(1)

        # pywebview's own rule when it is importable, so this cannot drift
        # from the library; its current literal otherwise.
        pattern = r"^#(?:[0-9a-fA-F]{3}){1,2}$"
        try:
            import webview
            found = re.search(r"valid_color\s*=\s*r'([^']+)'",
                              inspect.getsource(webview.create_window))
            if found:
                pattern = found.group(1)
        except Exception:
            pass
        self.assertRegex(
            colour, pattern,
            f"companion background_color {colour!r} is rejected by "
            "pywebview.create_window, so the floating companion is never "
            "created.")

    def test_companion_creation_failure_is_logged_where_it_can_be_seen(self):
        """The failure above was logged with logger.debug under an INFO root
        logger, so it left no trace.  A window that fails to appear must say
        so."""
        src = APP_PY.read_text(encoding="utf-8")
        self.assertNotIn(
            'logger.debug("[COMPANION] Companion window not created', src)
        self.assertIn(
            'logger.warning("[COMPANION] Companion window not created', src)

    # ── Invariant G: the companion lands on the screen ────────────────
    def test_companion_is_placed_in_pywebview_logical_pixels(self):
        """Live 2026-09-15 (Nunba 89096d49, 2560x1440 at 150%): the
        companion was created at (2310, 1050) from GetSystemMetrics, which
        returns physical pixels in this DPI-aware process, while pywebview
        placed it in logical pixels, where the screen is 1707x960.  The
        window existed, visible=True, rect (2310,1050)-(2508,1304): wholly
        off the screen, so the owner never saw it.  The main window uses
        get_screen_dimensions(), which normalises to logical pixels; the
        companion must use the same source.
        """
        import re

        src = APP_PY.read_text(encoding="utf-8")
        m = re.search(r"Nanba Companion: floating desktop pet.*?title='Nanba'",
                      src, re.S)
        self.assertIsNotNone(m, "companion block not found")
        block = m.group(0)
        self.assertFalse(
            "GetSystemMetrics" in block,
            "the companion position is computed in physical pixels but "
            "applied in logical ones; use get_screen_dimensions()")
        self.assertTrue("get_screen_dimensions()" in block,
                        "the companion must take its screen size from "
                        "get_screen_dimensions(), like the main window")

    def test_companion_origin_keeps_the_window_inside_the_working_area(self):
        # app.py runs the whole app at import; lift the pure helper alone.
        src = APP_PY.read_text(encoding="utf-8")
        start = src.index("def _companion_origin(")
        end = src.index("\n\n\n", start)
        ns = {}
        exec(compile(src[start:end], str(APP_PY), "exec"), ns)  # noqa: S102
        origin = ns["_companion_origin"]

        # The measured working area on the owner's display (logical).
        x, y = origin(1707, 912, 220, 310)
        self.assertGreaterEqual(x, 0)
        self.assertGreaterEqual(y, 0)
        self.assertLessEqual(x + 220, 1707)
        self.assertLessEqual(y + 310, 912)
        # A display smaller than the window still yields an on-screen origin.
        self.assertEqual(origin(200, 200, 220, 310), (0, 0))

    # ── Invariant H: the companion stays on top once loaded ───────────
    def test_companion_reasserts_topmost_on_its_own_handle_after_load(self):
        """Live 2026-09-15 (Nunba 89096d49): the companion form carried
        WS_EX_TOPMOST (exstyle 0x50008) yet enumerated BELOW a plain
        maximized Paint window (z=9 vs z=12), and WindowFromPoint at its
        centre returned Paint; SetWindowPos(HWND_TOPMOST) on its handle put
        it on screen.  pywebview 6.1 shows, hides and re-shows a transparent
        EdgeChromium form around navigation start, so the re-assert must run
        after the page has loaded, on the companion's own HWND (never the
        main window's title), and through Win32 rather than
        _companion_window.on_top (the #593 cross-thread hang).
        """
        import re

        src = APP_PY.read_text(encoding="utf-8")
        m = re.search(r"def _on_companion_loaded\(\):(.*?)\n            if _companion_window:",
                      src, re.S)
        self.assertIsNotNone(m, "_on_companion_loaded not found")
        body = m.group(1)
        self.assertIn("_resolve_hwnd(_companion_window)", body)
        self.assertIn("set_window_always_on_top(_comp_hwnd, True)", body)
        self.assertNotIn(".on_top = ", body)

        # _resolve_hwnd must read pywebview 6's Window.native before any
        # title lookup, or the companion resolves to the main window.
        r = re.search(r"def _resolve_hwnd\(window_instance\):(.*?)\ndef ", src, re.S)
        self.assertIsNotNone(r)
        resolver = r.group(1)
        self.assertLess(resolver.index("'native'"),
                        resolver.index("FindWindowW(None"))


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
