"""Windows custom-titlebar support for the Nunba frameless window.

A `frameless=True` pywebview window on Windows is created with WS_POPUP
style, which (a) strips WS_THICKFRAME so the user can't grab the edges
to resize, and (b) maximizes to the full monitor rect — covering the
taskbar — instead of the work area.  This module restores both, WITHOUT
giving up the dark React-painted titlebar.

Mechanism (same pattern Teams / Discord / VSCode use):

  1. Add WS_THICKFRAME back to the window style — Windows then draws
     the invisible 8px resize border at all four edges.  Combined with
     `WS_SYSMENU`, Alt+Space → standard system menu also works again.

  2. Subclass the window proc to intercept three messages:

       WM_NCCALCSIZE   — eat the non-client area so DWM doesn't paint
                         the native titlebar over our React strip.
                         (Returning 0 with `wParam=TRUE` means "the
                         entire window rect is client area".)

       WM_NCHITTEST    — for points in the top `titlebar_height` pixels
                         (excluding the React window-button cluster on
                         the right), return HTCAPTION so the OS handles
                         drag-to-move natively.  For points within
                         `resize_border` of an edge, return the matching
                         HTLEFT/RIGHT/TOP/BOTTOM/etc. so OS resize works.
                         Everything else → HTCLIENT.

       WM_GETMINMAXINFO — clamp ptMaxSize / ptMaxPosition to the work
                          area of the monitor the window is currently
                          on, so maximize stops at the taskbar.

Cross-platform: this module is a no-op outside Windows.  Callers must
gate on `sys.platform == 'win32'` AND `use_frameless()` before invoking.

DPI: GetSystemMetrics returns values in the system's logical DPI for
this process.  Nunba is per-monitor DPI-aware (app.py:_set_dpi_aware),
so the values are correct for the active monitor.

Multi-window: install once per HWND; the wndproc-table is keyed by
HWND so a second window installs cleanly.
"""

import ctypes
import logging
import sys
from ctypes import wintypes

logger = logging.getLogger('nunba.win32_chrome')


# ── Win32 constants ───────────────────────────────────────────────────

GWL_STYLE = -16
GWLP_WNDPROC = -4

WS_THICKFRAME = 0x00040000
WS_SYSMENU = 0x00080000
WS_MAXIMIZEBOX = 0x00010000
WS_MINIMIZEBOX = 0x00020000

WM_NCCALCSIZE = 0x0083
WM_NCHITTEST = 0x0084
WM_GETMINMAXINFO = 0x0024
WM_DESTROY = 0x0002

SWP_FRAMECHANGED = 0x0020
SWP_NOMOVE = 0x0002
SWP_NOSIZE = 0x0001
SWP_NOZORDER = 0x0004
SWP_NOACTIVATE = 0x0010
SWP_NOOWNERZORDER = 0x0200

HTCLIENT = 1
HTCAPTION = 2
HTLEFT = 10
HTRIGHT = 11
HTTOP = 12
HTTOPLEFT = 13
HTTOPRIGHT = 14
HTBOTTOM = 15
HTBOTTOMLEFT = 16
HTBOTTOMRIGHT = 17

MONITOR_DEFAULTTONEAREST = 0x00000002

SM_CXSIZEFRAME = 32
SM_CXPADDEDBORDER = 92


# ── Structures ────────────────────────────────────────────────────────


class POINT(ctypes.Structure):
    _fields_ = [('x', ctypes.c_long), ('y', ctypes.c_long)]


class RECT(ctypes.Structure):
    _fields_ = [('left', ctypes.c_long), ('top', ctypes.c_long),
                ('right', ctypes.c_long), ('bottom', ctypes.c_long)]


class MINMAXINFO(ctypes.Structure):
    _fields_ = [('ptReserved', POINT),
                ('ptMaxSize', POINT),
                ('ptMaxPosition', POINT),
                ('ptMinTrackSize', POINT),
                ('ptMaxTrackSize', POINT)]


class MONITORINFO(ctypes.Structure):
    _fields_ = [('cbSize', wintypes.DWORD),
                ('rcMonitor', RECT),
                ('rcWork', RECT),
                ('dwFlags', wintypes.DWORD)]


WNDPROC = ctypes.WINFUNCTYPE(
    ctypes.c_ssize_t,
    wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM)


# ── ctypes bindings (Windows only) ────────────────────────────────────

if sys.platform == 'win32':
    user32 = ctypes.windll.user32

    user32.GetWindowLongPtrW.argtypes = [wintypes.HWND, ctypes.c_int]
    user32.GetWindowLongPtrW.restype = ctypes.c_ssize_t

    user32.SetWindowLongPtrW.argtypes = [wintypes.HWND, ctypes.c_int, ctypes.c_ssize_t]
    user32.SetWindowLongPtrW.restype = ctypes.c_ssize_t

    user32.CallWindowProcW.argtypes = [
        ctypes.c_ssize_t, wintypes.HWND, wintypes.UINT,
        wintypes.WPARAM, wintypes.LPARAM]
    user32.CallWindowProcW.restype = ctypes.c_ssize_t

    user32.DefWindowProcW.argtypes = [
        wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM]
    user32.DefWindowProcW.restype = ctypes.c_ssize_t

    user32.SetWindowPos.argtypes = [
        wintypes.HWND, wintypes.HWND, ctypes.c_int, ctypes.c_int,
        ctypes.c_int, ctypes.c_int, wintypes.UINT]
    user32.SetWindowPos.restype = wintypes.BOOL

    user32.MonitorFromWindow.argtypes = [wintypes.HWND, wintypes.DWORD]
    user32.MonitorFromWindow.restype = wintypes.HANDLE

    user32.GetMonitorInfoW.argtypes = [wintypes.HANDLE, ctypes.POINTER(MONITORINFO)]
    user32.GetMonitorInfoW.restype = wintypes.BOOL

    user32.GetSystemMetrics.argtypes = [ctypes.c_int]
    user32.GetSystemMetrics.restype = ctypes.c_int

    user32.GetWindowRect.argtypes = [wintypes.HWND, ctypes.POINTER(RECT)]
    user32.GetWindowRect.restype = wintypes.BOOL


# ── Per-HWND state ────────────────────────────────────────────────────

# Map HWND → (original_wndproc_addr, kept_wndproc_callback, titlebar_h, right_cluster_w)
# The callback ref keeps the WNDPROC C function alive — without this it would be GC'd
# and the next message into the subclass would jump into freed memory.
_INSTALLED = {}


# ── Helpers ───────────────────────────────────────────────────────────


def _resize_border_px() -> int:
    """OS-configured resize hit-zone width.  DPI-correct because Nunba
    is per-monitor DPI aware before pywebview boots."""
    return (user32.GetSystemMetrics(SM_CXSIZEFRAME)
            + user32.GetSystemMetrics(SM_CXPADDEDBORDER))


def _work_area(hwnd: int) -> 'RECT | None':
    """rcWork (monitor rect minus taskbar) for the monitor `hwnd` is on."""
    mon = user32.MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST)
    if not mon:
        return None
    info = MONITORINFO()
    info.cbSize = ctypes.sizeof(MONITORINFO)
    if not user32.GetMonitorInfoW(mon, ctypes.byref(info)):
        return None
    return info.rcWork


# ── The subclassed wndproc ────────────────────────────────────────────


def _make_wndproc(orig_wndproc_addr: int, titlebar_h: int):
    """Build a closure-bound WNDPROC that defers to `orig_wndproc_addr`
    for everything except the three messages we intercept.

    `titlebar_h` is the height in pixels of the React-painted titlebar
    drag region (currently 32 — matches NunbaTitleBar.js).
    """

    border = _resize_border_px()

    def proc(hwnd, msg, wparam, lparam):
        try:
            if msg == WM_NCCALCSIZE:
                # When wParam=TRUE, lParam is an NCCALCSIZE_PARAMS* whose
                # first RECT is the proposed window rect on entry and must
                # be updated to the client rect on exit.  Returning 0 with
                # rgrc unchanged means "client area = full window rect" —
                # i.e. zero non-client area, no native chrome.  This is
                # exactly the "extended client area" trick.
                if wparam:
                    return 0
                return 0

            if msg == WM_NCHITTEST:
                # lParam packs (screen_y << 16) | screen_x.  Sign-extend
                # because the cursor can be on a left/top monitor with
                # negative coordinates.
                x = ctypes.c_short(lparam & 0xFFFF).value
                y = ctypes.c_short((lparam >> 16) & 0xFFFF).value

                rc = RECT()
                if not user32.GetWindowRect(hwnd, ctypes.byref(rc)):
                    return HTCLIENT

                # Resize edges — only when NOT maximized (Windows convention).
                # We check by comparing window rect to work area: a maximized
                # frameless+thickframe window has window rect == work area.
                wa = _work_area(hwnd)
                maximized = (wa is not None
                             and rc.left == wa.left and rc.top == wa.top
                             and rc.right == wa.right and rc.bottom == wa.bottom)

                if not maximized:
                    on_left = x < rc.left + border
                    on_right = x >= rc.right - border
                    on_top = y < rc.top + border
                    on_bot = y >= rc.bottom - border
                    if on_top and on_left:
                        return HTTOPLEFT
                    if on_top and on_right:
                        return HTTOPRIGHT
                    if on_bot and on_left:
                        return HTBOTTOMLEFT
                    if on_bot and on_right:
                        return HTBOTTOMRIGHT
                    if on_left:
                        return HTLEFT
                    if on_right:
                        return HTRIGHT
                    if on_top:
                        return HTTOP
                    if on_bot:
                        return HTBOTTOM

                # Drag-region: top `titlebar_h` px of the window.  The React
                # NunbaTitleBar sets pointer-events:auto on its window-button
                # cluster, which will swallow clicks BEFORE the wndproc sees
                # them, so we don't need to carve out a button exclusion here
                # — the JS handlers fire first for clicks on the buttons.
                if y < rc.top + titlebar_h:
                    return HTCAPTION

                return HTCLIENT

            if msg == WM_GETMINMAXINFO:
                # Clamp maximize to the work area of the current monitor.
                wa = _work_area(hwnd)
                if wa is not None:
                    mmi = ctypes.cast(lparam, ctypes.POINTER(MINMAXINFO)).contents
                    mmi.ptMaxPosition.x = wa.left
                    mmi.ptMaxPosition.y = wa.top
                    mmi.ptMaxSize.x = wa.right - wa.left
                    mmi.ptMaxSize.y = wa.bottom - wa.top
                    # ptMaxTrackSize must be >= ptMaxSize, else the OS
                    # won't let the user resize past the original max.
                    mmi.ptMaxTrackSize.x = max(mmi.ptMaxTrackSize.x, mmi.ptMaxSize.x)
                    mmi.ptMaxTrackSize.y = max(mmi.ptMaxTrackSize.y, mmi.ptMaxSize.y)
                    return 0
                # fall through to default handling

            if msg == WM_DESTROY:
                _INSTALLED.pop(hwnd, None)
                # fall through to original

        except Exception:
            logger.exception('win32_chrome wndproc fault on msg=0x%x', msg)
            # Fall through to original so we never crash the host.

        return user32.CallWindowProcW(orig_wndproc_addr, hwnd, msg, wparam, lparam)

    return WNDPROC(proc)


# ── Public install ────────────────────────────────────────────────────


def install_custom_chrome(hwnd: int, titlebar_height: int = 32) -> bool:
    """Apply the WS_THICKFRAME + subclass to `hwnd`.  Idempotent.

    Returns True on success.  Safe to call from any thread, but
    Windows requires the subclass run on the thread that owns the
    HWND — which is pywebview's GUI thread for pywebview windows.
    Since callers typically invoke this from pywebview's `on_loaded`
    callback (already on the GUI thread), that's fine.
    """
    if sys.platform != 'win32':
        return False
    if not hwnd:
        logger.warning('install_custom_chrome: hwnd=0, skipping')
        return False
    if hwnd in _INSTALLED:
        logger.debug('install_custom_chrome: hwnd=%s already installed', hwnd)
        return True

    try:
        # 1. Add WS_THICKFRAME + WS_SYSMENU + min/max boxes back.  This
        #    is what gives us OS-managed resize hit-testing AND a working
        #    Alt+Space system menu without showing native titlebar pixels
        #    (because WM_NCCALCSIZE will eat them).
        style = user32.GetWindowLongPtrW(hwnd, GWL_STYLE)
        new_style = style | WS_THICKFRAME | WS_SYSMENU | WS_MAXIMIZEBOX | WS_MINIMIZEBOX
        user32.SetWindowLongPtrW(hwnd, GWL_STYLE, new_style)

        # 2. Subclass the wndproc.  SetWindowLongPtrW with GWLP_WNDPROC
        #    returns the previous wndproc address; we keep it so the
        #    subclass can CallWindowProcW into it for unhandled messages.
        orig_addr = user32.GetWindowLongPtrW(hwnd, GWLP_WNDPROC)
        new_proc = _make_wndproc(orig_addr, titlebar_height)

        # WNDPROC is a Python callable wrapped by ctypes; cast it to
        # LONG_PTR for SetWindowLongPtrW.
        new_proc_addr = ctypes.cast(new_proc, ctypes.c_void_p).value
        user32.SetWindowLongPtrW(hwnd, GWLP_WNDPROC, new_proc_addr)

        # 3. Notify Windows that the frame changed so it recalculates
        #    the non-client area immediately (otherwise the resize edges
        #    don't activate until the user drags the window).
        user32.SetWindowPos(
            hwnd, 0, 0, 0, 0, 0,
            SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE
            | SWP_NOZORDER | SWP_NOACTIVATE | SWP_NOOWNERZORDER)

        # Pin the callback + orig addr so they survive past this stack frame.
        _INSTALLED[hwnd] = (orig_addr, new_proc, titlebar_height)
        logger.info(
            'install_custom_chrome: hwnd=%s titlebar_h=%s border=%s installed',
            hwnd, titlebar_height, _resize_border_px())
        return True

    except Exception:
        logger.exception('install_custom_chrome failed for hwnd=%s', hwnd)
        return False


def is_installed(hwnd: int) -> bool:
    return hwnd in _INSTALLED
