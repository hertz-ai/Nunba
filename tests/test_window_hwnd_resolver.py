"""ONE HWND resolver for pywebview windows: desktop.win32_chrome.resolve_hwnd.

Why (owner 2026-09-16, "nunba portrait view is not draggable like native
windows, the resize is also as native as possible"): the React titlebar's
drag and the top-edge resize grips run through WindowApi.window_start_drag /
window_begin_resize -> WindowApi._win_hwnd -> win32_chrome.begin_window_*.
_win_hwnd read `original_window.handle` / `handle`, attributes pywebview has
NEVER exposed (pywebview 6.1 in the dev venv and in the installed lib/webview:
Window has `native`, nothing else), so it returned None on every call and
both verbs silently did nothing.  The WebView2 child covers the whole client
area from y=0 (measured on hwnd 2950066: child rect 1851,0-2482,1262), so
the parent's HTCAPTION strip is never consulted for real mouse input -- the
JS bridge is the only way a drag or a top-edge resize starts.

app.py's _resolve_hwnd already knew the right walk (native.Handle via
ToInt64 -> original_window.handle -> handle -> FindWindowW by title) and
seven more inline copies in app.py knew parts of it.  This file guards the
collapse to ONE resolver that every caller shares.
"""
from __future__ import annotations

import ast
import re
import types
import unittest
from pathlib import Path

from desktop import native_api_window as naw
from desktop import win32_chrome as wc

REPO_ROOT = Path(__file__).resolve().parent.parent
APP_PY = REPO_ROOT / "app.py"


class _IntPtr:
    """System.IntPtr as pythonnet hands it over: truthy, no __int__/__index__,
    ToInt64()/ToInt32() return the value (measured on the install's own
    pythonnet 2026-09-15)."""

    def __init__(self, value):
        self._value = value

    def ToInt64(self):
        return self._value

    def ToInt32(self):
        return self._value


def _pywebview6_window(hwnd=1052598, title="Nunba"):
    """A window shaped like pywebview 6.1's: `native` is the WinForms form
    whose Handle is an IntPtr; no `original_window`, no `handle`."""
    return types.SimpleNamespace(native=types.SimpleNamespace(Handle=_IntPtr(hwnd)),
                                 title=title)


class ResolveHwndTests(unittest.TestCase):
    def test_pywebview6_intptr_handle_is_read_with_toint64(self):
        with self.assertRaises(TypeError):
            int(_IntPtr(1052598))  # the measured failure mode int() hits
        self.assertEqual(wc.resolve_hwnd(_pywebview6_window(1052598)), 1052598)

    def test_a_host_that_hands_over_an_int_keeps_working(self):
        w = types.SimpleNamespace(native=types.SimpleNamespace(Handle=594172))
        self.assertEqual(wc.resolve_hwnd(w), 594172)

    def test_older_attribute_spellings_still_resolve(self):
        self.assertEqual(wc.resolve_hwnd(types.SimpleNamespace(
            native=None, original_window=types.SimpleNamespace(handle=77))), 77)
        self.assertEqual(wc.resolve_hwnd(types.SimpleNamespace(native=None, handle=78)), 78)

    def test_title_lookup_is_the_last_resort(self):
        calls = []

        def FindWindowW(cls, title):
            calls.append((cls, title))
            return 4242

        fake_user32 = types.SimpleNamespace(FindWindowW=FindWindowW)
        saved = (wc.sys, getattr(wc, "user32", None))
        wc.sys = types.SimpleNamespace(platform="win32")
        wc.user32 = fake_user32
        try:
            w = types.SimpleNamespace(native=None, title="Nunba")
            self.assertEqual(wc.resolve_hwnd(w, "Nunba"), 4242)
            self.assertEqual(calls, [(None, "Nunba")])
            # No title, nothing to look up: 0, not an exception.
            self.assertEqual(wc.resolve_hwnd(w), 0)
        finally:
            wc.sys, wc.user32 = saved

    def test_none_window_is_zero(self):
        self.assertEqual(wc.resolve_hwnd(None, "Nunba"), 0)

    def test_a_failure_is_a_warning_naming_the_window(self):
        """Every hwnd-gated step (snap, drag, resize, tool-window, topmost) is
        skipped on 0; the dd34d410 break hid for an afternoon at DEBUG."""

        class _Broken:
            def ToInt64(self):
                raise TypeError("handle cannot be read")

        w = types.SimpleNamespace(native=types.SimpleNamespace(Handle=_Broken()),
                                  title="Nunba")
        with self.assertLogs("nunba.win32_chrome", level="WARNING") as logs:
            self.assertEqual(wc.resolve_hwnd(w, "Nunba"), 0)
        self.assertTrue(any("handle cannot be read" in line and "Nunba" in line
                            for line in logs.output), logs.output)

    def test_the_same_failure_on_the_same_window_warns_once(self):
        """Live 2026-09-16 11:28:41-11:29:04: after the form was disposed the
        taskbar watchdog's 0.5s poll turned this WARNING into 2 lines/s with a
        .NET stack each.  One WARNING per (window, failure); repeats at DEBUG."""

        class _Disposed:
            def ToInt64(self):
                raise RuntimeError("Cannot access a disposed object")

        w = types.SimpleNamespace(native=types.SimpleNamespace(Handle=_Disposed()), title="Nunba")
        with self.assertLogs("nunba.win32_chrome", level="DEBUG") as logs:
            for _ in range(5):
                self.assertEqual(wc.resolve_hwnd(w, "Nunba"), 0)
        warnings = [line for line in logs.output if line.startswith("WARNING")]
        self.assertEqual(len(warnings), 1, logs.output)


class WindowApiUsesTheOneResolverTests(unittest.TestCase):
    """The titlebar drag and the edge grips reach the OS only through
    _win_hwnd; on pywebview 6.1 it must resolve the form's handle."""

    def setUp(self):
        self._saved_sys = naw.sys
        naw.sys = types.SimpleNamespace(platform="win32")
        self.window = _pywebview6_window(1052598)
        self.api = naw.WindowApi(lambda: self.window)

    def tearDown(self):
        naw.sys = self._saved_sys

    def test_win_hwnd_resolves_a_pywebview6_window(self):
        self.assertEqual(naw.WindowApi._win_hwnd(self.window), 1052598)

    def test_window_start_drag_kicks_the_native_move_on_that_hwnd(self):
        seen = []
        saved = wc.begin_window_drag
        wc.begin_window_drag = lambda hwnd: seen.append(hwnd) or True
        try:
            self.assertTrue(self.api.window_start_drag())
        finally:
            wc.begin_window_drag = saved
        self.assertEqual(seen, [1052598])

    def test_window_begin_resize_kicks_the_native_resize_on_that_hwnd(self):
        seen = []
        saved = wc.begin_window_resize
        wc.begin_window_resize = lambda hwnd, edge: seen.append((hwnd, edge)) or True
        try:
            self.assertTrue(self.api.window_begin_resize("top"))
        finally:
            wc.begin_window_resize = saved
        self.assertEqual(seen, [(1052598, "top")])

    def test_window_toggle_maximize_drives_the_clamped_native_path(self):
        """With a resolved hwnd the maximize goes through win32_chrome's
        work-area-clamped toggle, not pywebview's taskbar-covering one."""
        seen = []
        saved = wc.toggle_maximize
        wc.toggle_maximize = lambda hwnd: seen.append(hwnd) or True
        pywebview_maximize = []
        self.window.maximize = lambda: pywebview_maximize.append(1)
        try:
            self.assertTrue(self.api.window_toggle_maximize())
        finally:
            wc.toggle_maximize = saved
        self.assertEqual(seen, [1052598])
        self.assertEqual(pywebview_maximize, [])


_HANDLE_WALK_ATTRS = {"original_window", "Handle", "FindWindowW"}


def _handle_walk_sites(path):
    """(line, attr) for every attribute access that is part of a handle walk
    -- code only, so a docstring may still tell the story."""
    tree = ast.parse(path.read_text(encoding="utf-8"), str(path))
    return sorted((node.lineno, node.attr) for node in ast.walk(tree)
                  if isinstance(node, ast.Attribute) and node.attr in _HANDLE_WALK_ATTRS)


class OneResolverDriftGuardTests(unittest.TestCase):
    """No second walk over pywebview's handle attributes anywhere: app.py and
    WindowApi call desktop.win32_chrome.resolve_hwnd.  app.py carried nine
    inline copies (one shadowing the module-level name inside the taskbar
    watchdog); two of them int()'d the IntPtr and fell through by accident."""

    def test_app_py_has_no_inline_handle_walk(self):
        self.assertEqual(_handle_walk_sites(APP_PY), [])
        src = APP_PY.read_text(encoding="utf-8")
        # exactly one definition, the thin wrapper over the one resolver
        self.assertEqual(len(re.findall(r"^\s*def _resolve_hwnd\(", src, re.M)), 1)
        body = re.search(r"def _resolve_hwnd\(window_instance\):(.*?)\ndef ", src, re.S).group(1)
        self.assertIn("resolve_hwnd(window_instance", body)

    def test_window_api_has_no_inline_handle_walk(self):
        path = REPO_ROOT / "desktop" / "native_api_window.py"
        self.assertEqual(_handle_walk_sites(path), [])
        self.assertIn("resolve_hwnd(", path.read_text(encoding="utf-8"))

    def test_the_walk_lives_in_win32_chrome_only(self):
        sites = _handle_walk_sites(REPO_ROOT / "desktop" / "win32_chrome.py")
        self.assertLessEqual({"Handle", "FindWindowW"}, {attr for _, attr in sites})


if __name__ == "__main__":
    unittest.main()
