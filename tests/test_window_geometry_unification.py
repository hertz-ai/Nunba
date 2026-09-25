"""One resize path, one DPI conversion, one recorded rect.

MEASURED against the bundled pywebview 6.1 (the .venv copy; its line numbers
are the ones in the installed .pyc):

  * ``BrowserForm.move(x, y)`` -- winforms.py:571-596 -- MULTIPLIES x and y by
    ``self.scale_factor``.  Logical in, physical out.
  * ``BrowserForm.resize(width, height, fix_point)`` -- winforms.py:559-569 --
    does NOT scale.  It hands width/height straight to SetWindowPos.

So the SAME logical pair is correct through ``move()`` and wrong through
``resize()`` on a scaled display.  This box reports 144 DPI (150%), so every
``_window.resize(w, h)`` sizes the window to 1/1.5 of what the caller asked
for.  Ten of those calls lived in app.py, each one handed LOGICAL px by
``calculate_perfect_right_dock`` / ``get_screen_dimensions`` (both of which
DIVIDE the work area by the DPI scale, see desktop/platform_utils.py:79).
None of them had fired on the live boot, so all ten were latent -- and all ten
would have been wrong the first time they did.

What this file pins:

  A. app.py has exactly ONE window-resize call site, ``_apply_window_size``.
     Any other ``<window>.resize(...)`` is a parallel path and fails here.
  B. That helper converts through Win32 with the window's own handle, and
     never applies a known-wrong size when it cannot.
  C. The conversion happens ONCE, in desktop.platform_utils.set_window_size,
     and it uses the DPI of the MONITOR THAT WINDOW IS ON (GetDpiForWindow),
     not the system/primary DPI (GetDC(0)) -- the two differ the moment a
     second display scales differently.
  D. Geometry is OBSERVABLE: the snap records the rect the window actually
     took (not just the one it asked for), and the restore path records the
     rect either side of ``restore()`` together with the iconic/maximized
     state.  Nothing here RE-ASSERTS geometry: the owner's own drags stay.

Why D exists: the owner's window drifted from 709x1368 at (1851,0) to
740x1313 at (1710,0) and no log line recorded when or how.
``snap_to_work_area`` is one-shot -- app.py hooks it on ``events.loaded``,
it unhooks itself (app.py:4379-4387) and never runs again -- so after boot
nothing in this process records the window's rect at all.
"""

from __future__ import annotations

import ast
import ctypes
import logging
import sys
import types
import unittest
from pathlib import Path
from unittest import mock

REPO_ROOT = Path(__file__).resolve().parent.parent
APP_PY = REPO_ROOT / "app.py"

if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

THE_ONE_HELPER = "_apply_window_size"


def _extract(func_name: str, ns: dict):
    """Compile ONE module-level function out of app.py into `ns`.

    app.py cannot be imported (importing it boots the app), so the same
    extraction tests/test_restart_minimize.py uses for ``_resolve_hwnd``
    is used here.
    """
    src = APP_PY.read_text(encoding="utf-8")
    start = src.index(f"def {func_name}(")
    end = src.index("\ndef ", start + 1)
    exec(compile(src[start:end], str(APP_PY), "exec"), ns)  # noqa: S102
    return ns[func_name]


class _WindowResizeCalls(ast.NodeVisitor):
    """Every ``<window>.resize(...)`` in app.py, with the function it is in.

    Only names that denote a WINDOW are collected -- ``_window``,
    ``_companion_window``, ``window_instance`` -- so PIL's
    ``icon_image.resize((64, 64))`` is not mistaken for a window resize.
    """

    def __init__(self):
        self.calls = []
        self._stack = []

    def visit_FunctionDef(self, node):
        self._stack.append(node.name)
        self.generic_visit(node)
        self._stack.pop()

    visit_AsyncFunctionDef = visit_FunctionDef

    @staticmethod
    def _is_window_name(name: str) -> bool:
        return (name == "_window" or name.endswith("_window")
                or name.startswith("window"))

    def visit_Call(self, node):
        fn = node.func
        if (isinstance(fn, ast.Attribute) and fn.attr == "resize"
                and isinstance(fn.value, ast.Name)
                and self._is_window_name(fn.value.id)):
            self.calls.append((fn.value.id, node.lineno, tuple(self._stack)))
        self.generic_visit(node)


class OneResizePath(unittest.TestCase):
    """A. One window-resize call site in app.py."""

    def test_every_window_resize_goes_through_the_one_helper(self):
        tree = ast.parse(APP_PY.read_text(encoding="utf-8"), filename=str(APP_PY))
        visitor = _WindowResizeCalls()
        visitor.visit(tree)

        self.assertTrue(
            visitor.calls,
            f"No window resize call found at all -- {THE_ONE_HELPER} must "
            "still be the one that performs it.",
        )
        strays = [c for c in visitor.calls if THE_ONE_HELPER not in c[2]]
        self.assertEqual(
            strays, [],
            "A bare window resize outside the one helper is a second resize "
            "path.  pywebview 6.1's BrowserForm.resize does NOT apply "
            "self.scale_factor (winforms.py:559-569) while its move() does "
            "(winforms.py:571-596), so logical numbers passed here are 1/scale "
            f"too small on a scaled display.  Route it through {THE_ONE_HELPER}.  "
            f"Strays (name, line, enclosing defs): {strays}",
        )

    def test_the_helper_names_the_unit_it_takes(self):
        src = APP_PY.read_text(encoding="utf-8")
        body = src[src.index(f"def {THE_ONE_HELPER}("):]
        body = body[:body.index("\ndef ", 1)]
        self.assertIn("LOGICAL", body,
                      "The one resize helper must declare the unit it takes.")
        self.assertIn("set_window_size", body,
                      "The conversion belongs to platform_utils.set_window_size, "
                      "not to a second conversion in app.py.")


class TheOneHelperBehaviour(unittest.TestCase):
    """B. What the helper does on each platform / handle state."""

    HWND = 0x000A0B0C

    def _helper(self, platform, hwnd):
        calls = {"resized": [], "sized": []}
        ns = {
            "sys": types.SimpleNamespace(platform=platform),
            "logger": logging.getLogger("test_apply_window_size"),
            "_resolve_hwnd": lambda w: hwnd,
        }
        fn = _extract(THE_ONE_HELPER, ns)
        window = types.SimpleNamespace(
            resize=lambda w, h: calls["resized"].append((w, h)))
        return fn, window, calls

    def test_windows_sizes_through_win32_and_never_through_pywebview(self):
        from desktop import platform_utils

        fn, window, calls = self._helper("win32", self.HWND)
        with mock.patch.object(
                platform_utils, "set_window_size",
                lambda h, w, ht: calls["sized"].append((h, w, ht)) or True):
            ok = fn(window, 709, 1368)

        self.assertTrue(ok)
        self.assertEqual(calls["sized"], [(self.HWND, 709, 1368)])
        self.assertEqual(
            calls["resized"], [],
            "pywebview's resize must not run after the Win32 path took the "
            "size -- that would apply the unscaled numbers on top.")

    def test_non_windows_uses_pywebviews_own_resize(self):
        from desktop import platform_utils

        fn, window, calls = self._helper("darwin", 0)
        with mock.patch.object(
                platform_utils, "set_window_size",
                lambda *a: calls["sized"].append(a) or True):
            ok = fn(window, 709, 1368)

        self.assertTrue(ok)
        self.assertEqual(calls["resized"], [(709, 1368)])
        self.assertEqual(calls["sized"], [],
                         "set_window_size is a Win32 helper; it must not be "
                         "reached on macOS/Linux.")

    def test_windows_without_a_handle_refuses_instead_of_sizing_wrong(self):
        """No HWND means no DPI to convert by.  pywebview's resize would
        apply the logical numbers as physical ones -- the very defect this
        path exists to remove -- so the helper reports the refusal instead."""
        fn, window, calls = self._helper("win32", 0)
        with self.assertLogs("test_apply_window_size", level="WARNING"):
            ok = fn(window, 709, 1368)

        self.assertFalse(ok)
        self.assertEqual(calls["resized"], [],
                         "A known-wrong size must never be applied as a "
                         "fallback.")


class _FakeUser32:
    """user32/gdi32 as these helpers call them, recording every call."""

    def __init__(self, *, window_dpi=192, system_dpi=144, rect=(1851, 0, 2560, 1368),
                 work_area=(1851, 0, 2560, 1368), set_pos_ok=True):
        self.calls = []
        self.window_dpi = window_dpi
        self.system_dpi = system_dpi
        self.rect = rect
        self.work_area = work_area
        self.set_pos_ok = set_pos_ok
        self.user32 = types.SimpleNamespace(
            GetDC=lambda h: 1,
            ReleaseDC=lambda h, dc: 1,
            GetDpiForWindow=self._get_dpi_for_window,
            GetWindowRect=self._get_window_rect,
            SetWindowPos=self._set_window_pos,
            MonitorFromWindow=lambda h, f: 0xBEEF,
            GetMonitorInfoW=self._get_monitor_info,
            GetLastError=lambda: 1400,
        )
        self.gdi32 = types.SimpleNamespace(
            GetDeviceCaps=lambda dc, idx: self.system_dpi)

    def _get_dpi_for_window(self, hwnd):
        self.calls.append(("GetDpiForWindow", hwnd))
        return self.window_dpi

    def _get_window_rect(self, hwnd, prc):
        self.calls.append(("GetWindowRect", hwnd))
        rc = prc._obj
        rc.left, rc.top, rc.right, rc.bottom = self.rect
        return 1

    def _get_monitor_info(self, mon, pinfo):
        info = pinfo._obj
        (info.rcWork.left, info.rcWork.top,
         info.rcWork.right, info.rcWork.bottom) = self.work_area
        return 1

    def _set_window_pos(self, hwnd, after, x, y, w, h, flags):
        self.calls.append(("SetWindowPos", hwnd, (x, y), (w, h)))
        return 1 if self.set_pos_ok else 0

    def named(self, name):
        return [c for c in self.calls if c[0] == name]


class OneDpiConversion(unittest.TestCase):
    """C. One conversion, by the WINDOW's DPI."""

    HWND = 0x000A0B0C

    def _fake_win32(self, fake):
        """win32_chrome binds its OWN WinDLL('user32') on purpose (see its
        line-174 comment), so a fake has to be injected there as well as at
        ctypes.windll, and GetDpiForWindow declared present — it is absent
        on the Linux/macOS legs of the CI matrix."""
        from desktop import win32_chrome

        return (
            mock.patch.object(ctypes, "windll", fake, create=True),
            mock.patch.object(win32_chrome, "user32", fake.user32, create=True),
            mock.patch.object(win32_chrome, "_HAS_GETDPIFORWINDOW", True),
        )

    def test_set_window_size_scales_by_the_windows_dpi_not_the_systems(self):
        """The hazard, concretely: the system (primary) display at 150% and
        the window living on a 200% display.  Sizing by the system factor
        would put 1064x2052 on a window that needs 1418x2736."""
        from desktop import platform_utils

        fake = _FakeUser32(window_dpi=192, system_dpi=144)  # 2.0 vs 1.5
        patches = self._fake_win32(fake)
        with patches[0], patches[1], patches[2], \
                mock.patch.object(platform_utils, "IS_WINDOWS", True):
            ok = platform_utils.set_window_size(self.HWND, 709, 1368)

        self.assertTrue(ok)
        self.assertEqual(fake.named("SetWindowPos")[0][3], (1418, 2736))
        self.assertTrue(fake.named("GetDpiForWindow"),
                        "The window's own DPI was never read -- GetDC(0) is "
                        "the system/primary DPI and is wrong for a window on "
                        "a differently scaled monitor.")

    def test_dpi_scale_with_a_handle_reads_that_window(self):
        from desktop import platform_utils

        fake = _FakeUser32(window_dpi=192, system_dpi=144)
        patches = self._fake_win32(fake)
        with patches[0], patches[1], patches[2]:
            self.assertEqual(
                platform_utils._get_win32_dpi_scale(self.HWND), 2.0)

    def test_dpi_scale_without_a_handle_still_answers_for_the_desktop(self):
        """get_screen_dimensions has no window to ask about: SPI_GETWORKAREA
        reports the PRIMARY work area, so the primary/system DPI is the right
        divisor there.  That caller must keep working."""
        from desktop import platform_utils

        fake = _FakeUser32(system_dpi=144)
        with mock.patch.object(ctypes, "windll", fake, create=True):
            self.assertEqual(platform_utils._get_win32_dpi_scale(), 1.5)
        self.assertEqual(fake.named("GetDpiForWindow"), [])

    def test_unreadable_window_dpi_falls_back_to_the_system(self):
        """Pre-Win10-1607 has no GetDpiForWindow.  'I cannot ask' must not
        read as 'this window is unscaled' -- that would silently reinstate
        the 1/scale bug on old Windows."""
        from desktop import platform_utils, win32_chrome

        fake = _FakeUser32(system_dpi=144)
        with mock.patch.object(ctypes, "windll", fake, create=True), \
                mock.patch.object(win32_chrome, "_HAS_GETDPIFORWINDOW", False):
            self.assertEqual(
                platform_utils._get_win32_dpi_scale(self.HWND), 1.5)

    def test_win32_chrome_dpi_scale_says_None_when_it_cannot_read(self):
        from desktop import win32_chrome

        with mock.patch.object(win32_chrome, "_HAS_GETDPIFORWINDOW", False):
            self.assertIsNone(win32_chrome.dpi_scale(0x1234))
        self.assertIsNone(win32_chrome.dpi_scale(0))


class GeometryIsObservable(unittest.TestCase):
    """D. The rect is recorded where geometry is decided and where it can
    change afterwards.  No re-assertion loop."""

    HWND = 0x000A0B0C

    def test_window_rect_is_the_one_reader(self):
        from desktop import win32_chrome

        fake = _FakeUser32(rect=(1710, 0, 2450, 1313))
        with mock.patch.object(win32_chrome, "user32", fake.user32, create=True), \
                mock.patch("sys.platform", "win32"):
            self.assertEqual(win32_chrome.window_rect(self.HWND),
                             (1710, 0, 740, 1313))
            self.assertIsNone(win32_chrome.window_rect(0))

    def test_snap_logs_the_rect_the_window_actually_took(self):
        """The existing line logged what the snap ASKED for.  The drift the
        owner saw is the difference between asked and taken, so the taken
        rect is what has to be in the log."""
        from desktop import win32_chrome

        fake = _FakeUser32(work_area=(0, 0, 2560, 1368),
                           rect=(1851, 0, 2560, 1368))
        with mock.patch.object(win32_chrome, "user32", fake.user32, create=True), \
                mock.patch("sys.platform", "win32"):
            with self.assertLogs("nunba.win32_chrome", level="INFO") as logs:
                self.assertTrue(win32_chrome.snap_to_work_area(
                    self.HWND, width_frac=709 / 2560, edge='right'))

        line = "\n".join(logs.output)
        self.assertIn("(1851, 0, 709, 1368)", line,
                      f"The applied rect is not in the snap's log: {line}")

    def test_the_restore_path_records_the_rect_around_restore(self):
        """The one place after boot where this process itself can change the
        geometry.  It must say what the rect was before and after, with the
        state it was in -- so a shrink on restore is attributable instead of
        being inferred."""
        src = APP_PY.read_text(encoding="utf-8")
        start = src.index("def _force_remount_and_paint(")
        body = src[start:src.index("# ── Wait for Flask to be ready", start)]

        self.assertIn("window_rect", body,
                      "The restore path must read the window's rect back.")
        self.assertIn("[GEOMETRY", body,
                      "The read-back needs its own log tag so the next drift "
                      "can be grepped for.")
        self.assertIn("IsIconic", body,
                      "The restore guard covers IsZoomed only.  Whether the "
                      "MINIMIZED case is also destructive is unproven, so the "
                      "iconic state must be RECORDED next to the rect rather "
                      "than assumed either way.")
        self.assertIn("_rect_before", body)

    def test_nothing_re_asserts_the_geometry_on_a_timer(self):
        """A watchdog that re-applied the rect would fight the owner's own
        drags.  Drift is made observable, never corrected."""
        src = APP_PY.read_text(encoding="utf-8")
        watchdog = src[src.index("def _taskbar_restore_watchdog("):]
        watchdog = watchdog[:watchdog.index("threading.Thread(", 1)]
        self.assertNotIn("snap_to_work_area", watchdog)
        self.assertNotIn(THE_ONE_HELPER, watchdog)


if __name__ == "__main__":
    unittest.main()
