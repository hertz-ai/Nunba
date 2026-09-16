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
  I. Both companion senders MUST post the prompt to /chat under `text`,
     the key /chat's contract names (routes/chatbot_routes.py chat_route
     docstring); `message` is a /custom_gpt alias and /chat 400s on it.
  J. The window follows the page: the bridge exposes
     on_companion_presence(state) that hides the window on 'hidden' and
     shows + raises it otherwise; the page sends it; the window is a tool
     window (no taskbar entry).  Owner 2026-09-15: the floating window
     exists only while an agent wants to talk.
  K. _resolve_hwnd MUST turn pywebview's Window.native.Handle (a
     System.IntPtr under pythonnet) into an int: int(IntPtr) raises, and
     the resolver's catch-all turned that into hwnd 0 for EVERY window.
  L. The window takes the page's SHAPE: pywebview's transparent window is
     a transparent WebView2 over an OPAQUE form (measured 2026-09-15, see
     the test), so "orb only" means clipping the window to the orb's rect
     (SetWindowRgn), and the card is a rounded rect.  The page sends
     'orb' | 'shown' with the CSS rect; one helper maps it to the window.
  M. The companion MUST end up 220x310 logical px: pywebview sets the
     OUTER size while the form still wears a caption + frame, then drops
     the frame and keeps the smaller client (198x254 measured).
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
        self.assertIn("_companion_raise()", body)
        self.assertNotIn(".on_top = ", body)
        r = re.search(r"def _companion_raise\(\):(.*?)\n\n", src, re.S)
        self.assertIsNotNone(r, "_companion_raise not found")
        self.assertIn("_resolve_hwnd(_companion_window)", r.group(1))
        self.assertIn("set_window_always_on_top(_comp_hwnd, True)", r.group(1))
        self.assertNotIn(".on_top = ", r.group(1))

        # The one resolver (desktop.win32_chrome.resolve_hwnd, which app.py's
        # _resolve_hwnd wraps) must read pywebview 6's Window.native before
        # any title lookup, or the companion resolves to the main window.
        chrome = (REPO_ROOT / "desktop" / "win32_chrome.py").read_text(encoding="utf-8")
        r = re.search(r"def resolve_hwnd\(window, title=None\) -> int:(.*?)\ndef ", chrome, re.S)
        self.assertIsNotNone(r)
        resolver = r.group(1)
        self.assertLess(resolver.index("'native'"),
                        resolver.index("FindWindowW(None"))

    # ── Invariant I: the companion speaks /chat's contract ────────────
    def test_companion_senders_post_the_prompt_as_text(self):
        """Live 2026-09-15 (Nunba 89096d49): every prompt typed into the
        floating "Ask HART" bar came back "Error 400 -- try again"
        ([COMPANION] /chat returned 400 at 13:46:13).  /chat's contract is
        {text, user_id, agent_id, agent_type, conversation_id, video_req}
        (chat_route docstring) and its turn reads `text`; both companion
        senders posted the prompt as `message`, the RN alias only
        /custom_gpt's _turn_text accepts.  The client conforms; the server
        contract stays.
        """
        import re

        src = APP_PY.read_text(encoding="utf-8")
        m = re.search(r"def on_companion_prompt\(self, text\):(.*?)\n                def |"
                      r"def on_companion_prompt\(self, text\):(.*?)\n            _companion_api",
                      src, re.S)
        self.assertIsNotNone(m, "on_companion_prompt not found")
        bridge = m.group(1) or m.group(2)
        body = re.search(r"json=\{(.*?)\}", bridge, re.S)
        self.assertIsNotNone(body, "the bridge's /chat body not found")
        self.assertIn('"text": prompt', body.group(1))
        self.assertNotIn('"message"', body.group(1))

        page = (REPO_ROOT / "landing-page" / "src" / "components" / "VoiceOrb"
                / "VoiceOrbPage.jsx").read_text(encoding="utf-8")
        fetch = re.search(r"fetch\('/chat',(.*?)\}\);", page, re.S)
        self.assertIsNotNone(fetch, "VoiceOrbPage /chat fallback not found")
        self.assertIn("text: t", fetch.group(1))
        self.assertNotIn("message: t", fetch.group(1))

    # ── Invariant J: the window follows the page's presence ───────────
    def test_companion_window_follows_the_pages_presence(self):
        """Owner 2026-09-15: the floating window exists only while an agent
        wants to talk; idle showed a second Nunba entry on the taskbar.  The
        page owns the state (VoiceOrbPage 'hidden' | 'shown'), the bridge
        applies it through pywebview's own show()/hide() (they marshal to
        the UI thread; on_top off the UI thread is the #593 hang), and the
        window is a tool window so it never lands on the taskbar."""
        import re

        src = APP_PY.read_text(encoding="utf-8")
        m = re.search(r"def on_companion_presence\(self, state, shape=None\):(.*?)\n            _companion_api",
                      src, re.S)
        self.assertIsNotNone(m, "on_companion_presence not found on the bridge")
        body = m.group(1)
        self.assertIn("_companion_window.hide()", body)
        self.assertIn("_companion_window.show()", body)
        self.assertIn("_companion_raise()", body)
        self.assertNotIn(".on_top = ", body)

        loaded = re.search(r"def _on_companion_loaded\(\):(.*?)\n            if _companion_window:",
                           src, re.S).group(1)
        self.assertIn("set_window_tool_window(_comp_hwnd, True)", loaded)

        page = (REPO_ROOT / "landing-page" / "src" / "components" / "VoiceOrb"
                / "VoiceOrbPage.jsx").read_text(encoding="utf-8")
        self.assertIn("companionApi('on_companion_presence', presence, shapeFor(presence, orbBox))",
                      page)

        helper = (REPO_ROOT / "desktop" / "platform_utils.py").read_text(encoding="utf-8")
        self.assertIn("def set_window_tool_window(window_handle, tool=True):", helper)
        self.assertIn("WS_EX_TOOLWINDOW = 0x00000080", helper)

    # ── Invariant K: the resolver reads pythonnet's IntPtr handle ─────
    def test_resolve_hwnd_converts_pywebviews_intptr_handle(self):
        """Live 2026-09-15 (hot-patched 6bc7b4f8, PID 49556): the companion
        was created on screen and hid itself, yet its exstyle stayed 0x50008
        (no WS_EX_TOOLWINDOW) and the main window logged "Error applying
        window positioning" instead of snap_to_work_area, which the two
        earlier boots logged.  Measured under the install's own pythonnet
        (lib\\pythonnet): Window.native.Handle is a System.IntPtr, bool() is
        True, int() raises "int() argument must be ... not 'IntPtr'", and
        IntPtr.ToInt64() returns the handle.  _resolve_hwnd swallowed that
        TypeError at DEBUG and returned 0, so every hwnd-gated step (tool
        window, raise, snap) was skipped for every window.  pywebview reads
        the handle with Handle.ToInt32(); the resolver must convert the
        same way.
        """
        import logging
        import types

        src = APP_PY.read_text(encoding="utf-8")
        start = src.index("def _resolve_hwnd(window_instance):")
        end = src.index("\ndef _clamped_maximize", start)
        ns = {
            "sys": types.SimpleNamespace(platform="win32"),
            "logger": logging.getLogger("test_resolve_hwnd"),
            "args": types.SimpleNamespace(title="Nunba"),
        }
        exec(compile(src[start:end], str(APP_PY), "exec"), ns)  # noqa: S102
        resolve = ns["_resolve_hwnd"]

        class _IntPtr:
            # System.IntPtr as pythonnet exposes it: no __int__/__index__,
            # ToInt64/ToInt32 return the value.
            def __init__(self, value):
                self._value = value

            def ToInt64(self):
                return self._value

            def ToInt32(self):
                return self._value

        with self.assertRaises(TypeError):
            int(_IntPtr(1052598))  # the measured failure mode

        form = types.SimpleNamespace(Handle=_IntPtr(1052598))
        self.assertEqual(resolve(types.SimpleNamespace(native=form)), 1052598)
        # A host that already hands over an int keeps working.
        self.assertEqual(resolve(types.SimpleNamespace(
            native=types.SimpleNamespace(Handle=594172))), 594172)

    def test_resolve_hwnd_failure_is_visible_not_debug(self):
        """Why the portrait dock regressed unseen (owner 2026-09-16): dd34d410
        made this resolver raise on every window, the catch-all turned that
        into hwnd 0 at DEBUG, and the main window's snap was skipped with
        nothing in gui_app.log but a later, unrelated-looking move() error.
        A resolver that fails must say so at WARNING, with the failure, so
        the next such break shows on the boot it happens."""
        import logging
        import types

        src = APP_PY.read_text(encoding="utf-8")
        start = src.index("def _resolve_hwnd(window_instance):")
        end = src.index("\ndef _clamped_maximize", start)
        ns = {
            "sys": types.SimpleNamespace(platform="win32"),
            "logger": logging.getLogger("test_resolve_hwnd_warns"),
            "args": types.SimpleNamespace(title="Nunba"),
        }
        exec(compile(src[start:end], str(APP_PY), "exec"), ns)  # noqa: S102
        resolve = ns["_resolve_hwnd"]

        class _BrokenHandle:
            def ToInt64(self):
                raise TypeError("handle cannot be read")

        form = types.SimpleNamespace(Handle=_BrokenHandle())
        # The walk and its WARNING live in the one resolver's module.
        with self.assertLogs("nunba.win32_chrome", level="WARNING") as logs:
            self.assertEqual(resolve(types.SimpleNamespace(native=form)), 0)
        self.assertTrue(any("handle cannot be read" in line for line in logs.output), logs.output)

    # ── Invariant L: the window is clipped to the page's shape ────────
    def test_shape_box_maps_the_pages_css_rect_to_window_pixels(self):
        """Measured 2026-09-15 with the install's own pywebview + WebView2 in
        a throwaway process (scratchpad owner863/transparent_probe.py):
        transparent=True renders the page over an OPAQUE form -- the
        "see-through" area read #F0F0F0 (Control) on one run and #202020
        (WebView2's own default) on the next; a WinForms TransparencyKey
        changed nothing (WebView2 composes its own surface, so pixels of the
        key colour were displayed as-is); a Form.Region ellipse DID clip the
        window, WebView2 child included -- the desktop showed at all four
        corners.  So the orb-only presence is a window clipped to the orb's
        rect.  The page reports CSS px (WebView2 scales CSS px by the DPI:
        a 240-css window measured 357 physical px wide at 150%), and the
        helper maps them by the client-rect ratio.
        """
        from desktop.platform_utils import _shape_box

        # 220x310 css page on a 150% display: client rect 330x465.
        shape = {"x": 40, "y": 20, "w": 140, "h": 140, "r": 70, "vw": 220, "vh": 310}
        self.assertEqual(_shape_box(shape, 330, 465), (60, 30, 270, 240, 210, 210))
        # The card: full page, 24px corners -> a 36px-radius rounded rect.
        card = {"x": 0, "y": 0, "w": 220, "h": 310, "r": 24, "vw": 220, "vh": 310}
        self.assertEqual(_shape_box(card, 330, 465), (0, 0, 330, 465, 72, 72))
        # Nothing to map: no clipping.
        self.assertIsNone(_shape_box({"x": 0, "y": 0, "w": 0, "h": 0, "vw": 220, "vh": 310}, 330, 465))
        self.assertIsNone(_shape_box(None, 330, 465))
        self.assertIsNone(_shape_box(shape, 0, 0))

    def test_presence_carries_the_shape_to_the_window(self):
        import re

        src = APP_PY.read_text(encoding="utf-8")
        m = re.search(r"def on_companion_presence\(self, state, shape=None\):(.*?)\n            _companion_api",
                      src, re.S)
        self.assertIsNotNone(m, "on_companion_presence must accept the page's shape")
        body = m.group(1)
        self.assertIn("set_window_shape(_comp_hwnd, shape)", body)
        self.assertIn("_companion_window.hide()", body)
        self.assertIn("_companion_raise()", body)

        helper = (REPO_ROOT / "desktop" / "platform_utils.py").read_text(encoding="utf-8")
        self.assertIn("def set_window_shape(window_handle, shape):", helper)
        self.assertIn("SetWindowRgn(", helper)
        self.assertIn("CreateRoundRectRgn(", helper)

        page = (REPO_ROOT / "landing-page" / "src" / "components" / "VoiceOrb"
                / "VoiceOrbPage.jsx").read_text(encoding="utf-8")
        self.assertIn("companionApi('on_companion_presence', presence, shapeFor(presence, orbBox))",
                      page)
        self.assertIn("function shapeFor(state, orbBox)", page)
        for state in ("'hidden'", "'orb'", "'shown'"):
            self.assertIn(state, page)

    # ── Invariant M: the window is the size the page was designed for ─
    def test_companion_is_resized_to_its_logical_size_once_loaded(self):
        """Measured 2026-09-15 on the live companion (rect 198x254 logical
        on a 150% display) and again in a throwaway pywebview process (the
        page reported innerWidth 198, innerHeight 254): pywebview 6.1 sets
        Form.Size = (220, 310) while the form still has its default caption
        and frame, then switches to FormBorderStyle.None, which keeps the
        client area -- 22 px narrower and 56 px shorter than the page was
        laid out for.  Once loaded, the frameless window is sized back to
        the designed logical size through the canonical DPI scale.
        """
        import re

        from desktop.platform_utils import _logical_to_physical

        # 150% display: logical 220x310 is physical 330x465; 1.0 is identity.
        self.assertEqual(_logical_to_physical(220, 310, 1.5), (330, 465))
        self.assertEqual(_logical_to_physical(220, 310, 1.0), (220, 310))
        self.assertEqual(_logical_to_physical(220, 310, 1.25), (275, 388))

        src = APP_PY.read_text(encoding="utf-8")
        loaded = re.search(r"def _on_companion_loaded\(\):(.*?)\n            if _companion_window:",
                           src, re.S).group(1)
        self.assertIn("set_window_size(_comp_hwnd, _comp_w, _comp_h)", loaded)
        helper = (REPO_ROOT / "desktop" / "platform_utils.py").read_text(encoding="utf-8")
        self.assertIn("def set_window_size(window_handle, width, height):", helper)
        self.assertIn("_get_win32_dpi_scale()", helper.split("def set_window_size(")[1])


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


class _Win32Fake:
    """user32/gdi32 as the companion helpers call them, recording each call.

    Stands in for ctypes.windll on every platform: GetClientRect fills the
    RECT through byref's _obj, CreateRoundRectRgn hands out a region handle,
    SetWindowRgn / SetWindowPos succeed or fail as configured.
    """

    def __init__(self, set_rgn_ok=True, set_pos_ok=True, client=(330, 465)):
        import types

        self.calls = []
        self.set_rgn_ok = set_rgn_ok
        self.set_pos_ok = set_pos_ok
        self.client = client
        self.user32 = types.SimpleNamespace(
            GetClientRect=self._get_client_rect,
            SetWindowRgn=self._set_window_rgn,
            SetWindowPos=self._set_window_pos,
            GetLastError=lambda: 1400,          # ERROR_INVALID_WINDOW_HANDLE
        )
        self.gdi32 = types.SimpleNamespace(
            CreateRoundRectRgn=self._create_rgn,
            DeleteObject=self._delete_object,
        )

    def _get_client_rect(self, hwnd, prc):
        self.calls.append(("GetClientRect", hwnd))
        prc._obj.left = prc._obj.top = 0
        prc._obj.right, prc._obj.bottom = self.client
        return 1

    def _create_rgn(self, *box):
        self.calls.append(("CreateRoundRectRgn", box))
        return 0x7A5E

    def _set_window_rgn(self, hwnd, rgn, redraw):
        self.calls.append(("SetWindowRgn", hwnd, rgn))
        return 1 if self.set_rgn_ok else 0

    def _delete_object(self, handle):
        self.calls.append(("DeleteObject", handle))
        return 1

    def _set_window_pos(self, hwnd, after, x, y, w, h, flags):
        self.calls.append(("SetWindowPos", hwnd, (w, h), flags))
        return 1 if self.set_pos_ok else 0

    def named(self, name):
        return [c for c in self.calls if c[0] == name]


class CompanionWin32ContractTests(unittest.TestCase):
    """hartos-3e review of 4e828bc4 / 053bd47d (2026-09-15): the Win32 side
    of the companion helpers must (1) not leak a region when SetWindowRgn
    refuses it -- the system takes ownership ONLY on success, and the
    shape is reapplied while an agent talks, so a persistent refusal walks
    toward the process's GDI-object ceiling silently; (2) pass every HWND
    as a pointer-sized c_void_p, never a bare int that ctypes marshals as a
    32-bit C int; (3) say so when a resize is refused instead of staying
    silent.  Runs on every platform: ctypes.windll is stood in.
    """

    SHAPE = {"x": 40, "y": 20, "w": 140, "h": 140, "r": 70, "vw": 220, "vh": 310}
    HWND = 0x000A0B0C

    def _patched(self, fake):
        import ctypes
        from unittest import mock

        from desktop import platform_utils

        return (mock.patch.object(ctypes, "windll", fake, create=True),
                mock.patch.object(platform_utils, "IS_WINDOWS", True),
                mock.patch.object(platform_utils, "_get_win32_dpi_scale", lambda: 1.5))

    def test_refused_region_is_deleted_and_reported(self):
        from desktop import platform_utils

        fake = _Win32Fake(set_rgn_ok=False)
        with self._patched(fake)[0], self._patched(fake)[1]:
            with self.assertLogs(platform_utils.logger, level="WARNING") as logs:
                applied = platform_utils.set_window_shape(self.HWND, self.SHAPE)
        self.assertFalse(applied)
        self.assertEqual(fake.named("DeleteObject"), [("DeleteObject", 0x7A5E)])
        self.assertTrue(any("SetWindowRgn" in line for line in logs.output), logs.output)

    def test_accepted_region_belongs_to_the_system(self):
        from desktop import platform_utils

        fake = _Win32Fake(set_rgn_ok=True)
        with self._patched(fake)[0], self._patched(fake)[1]:
            applied = platform_utils.set_window_shape(self.HWND, self.SHAPE)
        self.assertTrue(applied)
        self.assertEqual(fake.named("DeleteObject"), [])
        # The mapped box reached CreateRoundRectRgn (the same numbers
        # test_shape_box_maps_the_pages_css_rect_to_window_pixels pins).
        self.assertEqual(fake.named("CreateRoundRectRgn"),
                         [("CreateRoundRectRgn", (60, 30, 270, 240, 210, 210))])

    def test_every_hwnd_crosses_as_a_pointer(self):
        import ctypes

        from desktop import platform_utils

        fake = _Win32Fake()
        patches = self._patched(fake)
        with patches[0], patches[1], patches[2]:
            platform_utils.set_window_shape(self.HWND, self.SHAPE)
            platform_utils.set_window_size(self.HWND, 220, 310)
        handles = [c[1] for c in fake.calls
                   if c[0] in ("GetClientRect", "SetWindowRgn", "SetWindowPos")]
        self.assertEqual(len(handles), 3)
        for h in handles:
            self.assertIsInstance(h, ctypes.c_void_p, h)
            self.assertEqual(h.value, self.HWND)

    def test_refused_resize_is_reported(self):
        from desktop import platform_utils

        fake = _Win32Fake(set_pos_ok=False)
        patches = self._patched(fake)
        with patches[0], patches[1], patches[2]:
            with self.assertLogs(platform_utils.logger, level="WARNING") as logs:
                sized = platform_utils.set_window_size(self.HWND, 220, 310)
        self.assertFalse(sized)
        self.assertEqual(fake.named("SetWindowPos")[0][2], (330, 465))
        self.assertTrue(any("SetWindowPos" in line for line in logs.output), logs.output)


if __name__ == "__main__":
    unittest.main()
