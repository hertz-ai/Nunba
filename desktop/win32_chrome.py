"""Windows custom-titlebar support for the Nunba frameless window.

A `frameless=True` pywebview window on Windows is created with WS_POPUP
style, which (a) strips WS_THICKFRAME so the user can't grab the edges
to resize, and (b) maximizes to the full monitor rect — covering the
taskbar — instead of the work area.  This module restores both, WITHOUT
giving up the dark React-painted titlebar.

Mechanism — "preserve the native frame, reclaim only the caption" (the
pattern Windows Terminal's NonClientIslandWindow + Microsoft's official
custom title-bar sample use).  Philosophy B: let Windows keep owning the
hard parts; we only hide the caption pixels and paint React over them.

  1. Promote the pywebview WS_POPUP window to a proper OVERLAPPED window:
     clear WS_POPUP and add WS_CAPTION + WS_THICKFRAME + WS_SYSMENU + the
     min/max boxes.  WS_CAPTION is load-bearing — it's what makes Windows
     manage work-area maximize, Aero Snap, Win11 Snap Layouts,
     maximize/minimize animations and the DWM drop shadow.  A bare
     WS_POPUP+WS_THICKFRAME window gets none of those, which is exactly why
     the older re-implemented versions never behaved natively.

  2. Subclass the window proc; DefWindowProc keeps owning everything except
     the caption strip + a few overrides:

       WM_NCCALCSIZE    — let DefWindowProc inset the standard frame, then
                          move the client top back to the window top so the
                          React titlebar paints over the caption.  The
                          left/right/bottom resize borders stay non-client →
                          native resize.  (When maximized, add top padding so
                          the titlebar isn't clipped by the maximized
                          overhang.)

       WM_NCHITTEST     — defer to DefWindowProc (native resize borders +
                          corners); only when it returns HTCLIENT inside the
                          titlebar strip do we override: the maximize button
                          → HTMAXBUTTON (Win11 Snap-Layouts flyout), min/close
                          + chip slot → HTCLIENT, the rest → HTCAPTION (native
                          drag + Aero Snap).

       WM_NC*BUTTON/MOVE — we draw the maximize button in React, so we eat the
                          NC button messages for HTMAXBUTTON and drive
                          maximize/restore + hover ourselves (else DefWindowProc
                          paints its own glyph over the React button).

       WM_GETMINMAXINFO  — belt-and-suspenders clamp of ptMaxSize/Position to
                          the current monitor's work area (a captioned window
                          already does this natively).

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

WS_POPUP = 0x80000000
WS_CAPTION = 0x00C00000        # WS_BORDER | WS_DLGFRAME
WS_THICKFRAME = 0x00040000
WS_SYSMENU = 0x00080000
WS_MAXIMIZEBOX = 0x00010000
WS_MINIMIZEBOX = 0x00020000

WM_NCCALCSIZE = 0x0083
WM_NCHITTEST = 0x0084
WM_GETMINMAXINFO = 0x0024
WM_DESTROY = 0x0002
WM_NCLBUTTONDOWN = 0x00A1
WM_NCLBUTTONUP = 0x00A2
WM_NCMOUSEMOVE = 0x00A0
WM_NCMOUSELEAVE = 0x02A2

SWP_FRAMECHANGED = 0x0020
SWP_NOMOVE = 0x0002
SWP_NOSIZE = 0x0001
SWP_NOZORDER = 0x0004
SWP_NOACTIVATE = 0x0010
SWP_NOOWNERZORDER = 0x0200

HTCLIENT = 1
HTCAPTION = 2
HTMINBUTTON = 8
HTMAXBUTTON = 9   # Win11 Snap Layouts: the hover flyout anchors here
HTLEFT = 10
HTRIGHT = 11
HTTOP = 12
HTTOPLEFT = 13
HTTOPRIGHT = 14
HTBOTTOM = 15
HTBOTTOMLEFT = 16
HTBOTTOMRIGHT = 17
HTCLOSE = 20

MONITOR_DEFAULTTONEAREST = 0x00000002

SM_CXSIZEFRAME = 32
SM_CYSIZEFRAME = 33
SM_CXPADDEDBORDER = 92

SW_MAXIMIZE = 3
SW_RESTORE = 9

# TrackMouseEvent flags — needed so WM_NCMOUSELEAVE is delivered after a
# WM_NCMOUSEMOVE over the maximize button (so the hover highlight clears).
TME_LEAVE = 0x00000002
TME_NONCLIENT = 0x00000010


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


class NCCALCSIZE_PARAMS(ctypes.Structure):
    # rgrc[0] on entry (wParam=TRUE) = proposed new window rect; on exit it
    # must hold the new CLIENT rect.  We let DefWindowProc fill it, then move
    # the top back up to reclaim the caption strip for the React titlebar.
    _fields_ = [('rgrc', RECT * 3), ('lppos', ctypes.c_void_p)]


class TRACKMOUSEEVENT(ctypes.Structure):
    _fields_ = [('cbSize', wintypes.DWORD),
                ('dwFlags', wintypes.DWORD),
                ('hwndTrack', wintypes.HWND),
                ('dwHoverTime', wintypes.DWORD)]


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

    # For the JS-initiated native move (drag from the chip strip, which is
    # carved to HTCLIENT — see begin_window_drag).
    user32.ReleaseCapture.argtypes = []
    user32.ReleaseCapture.restype = wintypes.BOOL

    user32.SendMessageW.argtypes = [
        wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM]
    user32.SendMessageW.restype = ctypes.c_ssize_t

    # Native maximize/restore (we drive these ourselves for the React
    # maximize button so DefWindowProc doesn't paint its own glyph over it).
    user32.ShowWindow.argtypes = [wintypes.HWND, ctypes.c_int]
    user32.ShowWindow.restype = wintypes.BOOL

    user32.IsZoomed.argtypes = [wintypes.HWND]
    user32.IsZoomed.restype = wintypes.BOOL

    user32.TrackMouseEvent.argtypes = [ctypes.POINTER(TRACKMOUSEEVENT)]
    user32.TrackMouseEvent.restype = wintypes.BOOL

    # GetDpiForWindow is Win10 1607+.  Bind defensively — on older Windows
    # the attribute is absent and we fall back to the system DPI (96).
    try:
        user32.GetDpiForWindow.argtypes = [wintypes.HWND]
        user32.GetDpiForWindow.restype = wintypes.UINT
        _HAS_GETDPIFORWINDOW = True
    except AttributeError:
        _HAS_GETDPIFORWINDOW = False
else:
    _HAS_GETDPIFORWINDOW = False


# ── Per-HWND state ────────────────────────────────────────────────────

# Map HWND → (original_wndproc_addr, kept_wndproc_callback, titlebar_h, button_cluster_w, slot_w)
# The callback ref keeps the WNDPROC C function alive — without this it would be GC'd
# and the next message into the subclass would jump into freed memory.
_INSTALLED = {}


# ── Helpers ───────────────────────────────────────────────────────────


def _resize_border_px() -> int:
    """OS-configured resize hit-zone width.  DPI-correct because Nunba
    is per-monitor DPI aware before pywebview boots."""
    return (user32.GetSystemMetrics(SM_CXSIZEFRAME)
            + user32.GetSystemMetrics(SM_CXPADDEDBORDER))


def _dpi_scale(hwnd: int) -> float:
    """Per-monitor DPI scale for `hwnd` (1.0 at 96 DPI).  Falls back to
    1.0 when GetDpiForWindow is unavailable (pre-Win10 1607) or returns 0.

    WM_NCHITTEST coordinates are physical pixels, but NunbaTitleBar.js
    lays out its button cluster in CSS pixels.  We multiply the CSS width
    by this scale to get the physical exclusion zone."""
    if not _HAS_GETDPIFORWINDOW:
        return 1.0
    try:
        dpi = user32.GetDpiForWindow(hwnd)
        if dpi:
            return dpi / 96.0
    except Exception:
        pass
    return 1.0


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


# Snap-Layouts maximize-button hover, per HWND.  Set by the wndproc on NC
# mouse-move/leave over HTMAXBUTTON; read by WindowApi.window_max_hover so the
# React maximize button can mirror the highlight (CSS :hover can't fire over a
# non-client pixel).
_MAX_HOVER = {}


def _is_maximized(hwnd: int) -> bool:
    """True if the window is maximized (IsZoomed)."""
    try:
        return bool(user32.IsZoomed(hwnd))
    except Exception:
        return False


def _set_max_hover(hwnd: int, on: bool) -> None:
    """Record max-button hover + (on enter) request WM_NCMOUSELEAVE so we
    learn when the cursor leaves the non-client maximize button."""
    _MAX_HOVER[hwnd] = on
    if on:
        try:
            tme = TRACKMOUSEEVENT()
            tme.cbSize = ctypes.sizeof(TRACKMOUSEEVENT)
            tme.dwFlags = TME_LEAVE | TME_NONCLIENT
            tme.hwndTrack = hwnd
            tme.dwHoverTime = 0
            user32.TrackMouseEvent(ctypes.byref(tme))
        except Exception:
            pass


def get_max_button_hover(hwnd: int) -> bool:
    """Public: is the cursor over the (non-client) maximize button right now?
    WindowApi exposes this to the React titlebar for hover parity."""
    return bool(_MAX_HOVER.get(hwnd, False))


def _classify_hit(x, y, rc, native_hit, *, titlebar_h, button_w,
                  right_client_w):
    """Refine DefWindowProc's WM_NCHITTEST for the reclaimed caption strip.

    Approach B keeps the native frame, so DefWindowProc already returns the
    correct code for every parent-owned (non-client) pixel — the
    left/right/bottom resize borders + their corners — and HTCLIENT for the
    client area (incl. the caption strip we reclaimed for the React titlebar).
    Edge/corner resize is therefore left ENTIRELY to DefWindowProc (truly
    native — no hardcoded border math, no parallel path).

    We override ONLY when DefWindowProc says HTCLIENT *and* the point is in
    the titlebar strip:
      * maximize button (middle of the cluster) → HTMAXBUTTON (Snap Layouts)
      * min/close + chip slot                   → HTCLIENT (React owns click)
      * the rest of the strip                   → HTCAPTION (native drag/snap)

    The one child-covered edge (the reclaimed top) is resized via the React
    top grip → begin_window_resize, the same JS path the sides used to need.

    Pure (no Win32 calls): ``native_hit`` is computed by the wndproc via
    DefWindowProc and passed in, so this stays unit-testable.  ``rc`` is any
    object with .left/.top/.right/.bottom.  ``button_w`` is one window-button
    width (physical px); the maximize button is the MIDDLE of the min/max/close
    cluster (Windows order, left→right).  ``right_client_w`` = (button-cluster
    + chip-slot) width carved to HTCLIENT.
    """
    if native_hit != HTCLIENT:
        return native_hit  # native resize borders/corners — DefWindowProc owns it
    if y < rc.top + titlebar_h:
        max_left = rc.right - 2 * button_w
        max_right = rc.right - button_w
        if max_left <= x < max_right:
            return HTMAXBUTTON
        if right_client_w > 0 and x >= rc.right - right_client_w:
            return HTCLIENT
        return HTCAPTION
    return HTCLIENT


# ── The subclassed wndproc ────────────────────────────────────────────


def _make_wndproc(orig_wndproc_addr: int, titlebar_h_css: int,
                  right_cluster_w_css: int, slot_w_css: int = 0):
    """Build a closure-bound WNDPROC that defers to `orig_wndproc_addr`
    for everything except the three messages we intercept.

    `titlebar_h_css` is the height, in CSS pixels, of the React-painted
    titlebar drag region (32 — matches NunbaTitleBar.js).

    `right_cluster_w_css` is the width, in CSS pixels, of the right-hand
    window-button cluster (min/max/close — 3×46px ≈ 138px in
    NunbaTitleBar.js).  Points inside the top strip BUT within this
    distance of the right edge are returned as HTCLIENT, NOT HTCAPTION,
    so the React buttons receive their native mouse-down/click instead
    of Windows starting a caption drag.

    `slot_w_css` is the width, in CSS pixels, of the right SLOT that sits
    immediately to the LEFT of the button cluster — it hosts the Demopage
    intelligence-preference chip (Local / Hybrid / Hive) + the Audio mode
    dropdown (see NunbaTitleBar.js `nunba-titlebar-rightslot`).  Those
    pixels are ALSO carved to HTCLIENT so the WebView2 child receives the
    chip's mouse-down/click (a plain click toggles the preference).  The
    chip can't be both HTCAPTION (native drag eats the click) AND clickable
    on the same pixels, so we hand the pixels to the WebView and let JS do
    drag-vs-click disambiguation: a real move calls
    `WindowApi.window_start_drag()` → `begin_window_drag()` which kicks the
    native move loop; a plain click falls through to the chip's onClick.
    Total HTCLIENT right-zone width = right_cluster_w_css + slot_w_css.

    All three CSS values are multiplied by the window's per-monitor DPI
    scale at hit-test time (WM_NCHITTEST gives physical pixels, the React
    layout is in CSS pixels).  Scaling per-hit (not once at install) keeps
    the zones correct when the window is dragged between monitors of
    different DPI.

    Why the button + slot exclusion matters: when WM_NCHITTEST returns
    HTCAPTION for a point, Windows treats the subsequent WM_LBUTTONDOWN as
    the start of a window-move (it synthesizes WM_NCLBUTTONDOWN/HTCAPTION)
    and the hosted WebView2 child HWND never sees the click.  Relying on
    the React buttons/chip to "swallow the click first" is unreliable for a
    caption-classified region — the click is consumed by the move loop.
    Carving an HTCLIENT zone over the buttons (and now the chip slot) is
    the correct fix and is the same approach Teams/VSCode use for their
    caption-button strip.
    """

    # Maximize button = middle third of the min/max/close cluster.
    button_w_css = max(1, right_cluster_w_css // 3)

    def proc(hwnd, msg, wparam, lparam):
        try:
            if msg == WM_NCCALCSIZE and wparam:
                # Philosophy B: keep the native frame, reclaim ONLY the caption.
                # Let DefWindowProc inset the standard frame (caption + resize
                # borders), then move the client top back to the window top so
                # the React titlebar paints over the caption strip — while the
                # left/right/bottom resize borders stay native, so Windows owns
                # resize, work-area maximize, Aero Snap, animations + shadow.
                params = ctypes.cast(
                    lparam, ctypes.POINTER(NCCALCSIZE_PARAMS)).contents
                orig_top = params.rgrc[0].top
                ret = user32.DefWindowProcW(hwnd, msg, wparam, lparam)
                if ret != 0:
                    return ret
                params.rgrc[0].top = orig_top
                # A maximized window's rect overhangs the work area by the
                # frame border on every edge; without compensating, the top
                # `border` px of the titlebar would be clipped above the
                # screen.  Push the client top down so content starts at the
                # work-area top (the Windows-Terminal maximized-padding fix).
                if _is_maximized(hwnd):
                    params.rgrc[0].top += (
                        user32.GetSystemMetrics(SM_CYSIZEFRAME)
                        + user32.GetSystemMetrics(SM_CXPADDEDBORDER))
                return 0

            if msg == WM_NCHITTEST:
                # Let DefWindowProc do the REAL hit-test first — it owns the
                # native resize borders/corners (those pixels stay non-client
                # under our caption-only WM_NCCALCSIZE, so they reach the parent
                # and resize natively).  We only refine the client area.
                native = user32.DefWindowProcW(hwnd, msg, wparam, lparam)
                if native != HTCLIENT:
                    return native
                # Client hit (incl. the reclaimed caption strip).  lParam packs
                # (screen_y << 16) | screen_x; sign-extend for left/top monitors
                # at negative coordinates.  CSS→physical per-monitor scale keeps
                # the zones aligned with the React layout at any DPI.  Drag strip
                # → HTCAPTION (native drag + Aero Snap); maximize button (middle
                # of the cluster) → HTMAXBUTTON (Win11 Snap-Layouts flyout);
                # min/close + chip slot → HTCLIENT (the WebView2 child gets them).
                x = ctypes.c_short(lparam & 0xFFFF).value
                y = ctypes.c_short((lparam >> 16) & 0xFFFF).value
                rc = RECT()
                if not user32.GetWindowRect(hwnd, ctypes.byref(rc)):
                    return HTCLIENT
                scale = _dpi_scale(hwnd)
                return _classify_hit(
                    x, y, rc, native,
                    titlebar_h=int(round(titlebar_h_css * scale)),
                    button_w=int(round(button_w_css * scale)),
                    right_client_w=int(round(
                        (right_cluster_w_css + slot_w_css) * scale)),
                )

            # Snap Layouts: we draw the maximize button (React), so eat the NC
            # button messages for HTMAXBUTTON and drive maximize/restore + hover
            # ourselves.  The HTMAXBUTTON hit-test above is what makes Windows
            # show the flyout; eating these stops DefWindowProc from painting
            # its own maximize glyph over our React button.
            if msg == WM_NCMOUSEMOVE and wparam == HTMAXBUTTON:
                _set_max_hover(hwnd, True)
                return 0
            if msg == WM_NCMOUSELEAVE:
                _set_max_hover(hwnd, False)
                # fall through to default leave handling
            if msg == WM_NCLBUTTONDOWN and wparam == HTMAXBUTTON:
                return 0  # swallow the press; act on release
            if msg == WM_NCLBUTTONUP and wparam == HTMAXBUTTON:
                toggle_maximize(hwnd)  # native work-area clamp (single source)
                return 0

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
                _MAX_HOVER.pop(hwnd, None)
                # fall through to original

        except Exception:
            logger.exception('win32_chrome wndproc fault on msg=0x%x', msg)
            # Fall through to original so we never crash the host.

        return user32.CallWindowProcW(orig_wndproc_addr, hwnd, msg, wparam, lparam)

    return WNDPROC(proc)


# ── Public install ────────────────────────────────────────────────────


def install_custom_chrome(hwnd: int, titlebar_height: int = 32,
                          button_cluster_width: int = 138,
                          slot_width: int = 260) -> bool:
    """Apply the WS_THICKFRAME + subclass to `hwnd`.  Idempotent.

    `titlebar_height`, `button_cluster_width`, and `slot_width` are CSS
    pixels matching NunbaTitleBar.js (32px row; 3×46px = 138px min/max/close
    cluster; ~260px right slot hosting the intelligence-preference chip +
    Audio dropdown).  They are DPI-scaled to physical pixels inside the
    wndproc.

    `slot_width` defaults to a generous 260px so the chip + Audio dropdown
    are reliably covered without the SPA needing to report an exact width.
    The slot zone is carved to HTCLIENT (same as the button cluster) so the
    WebView receives the chip's mouse events; the SPA then disambiguates
    drag (→ window_start_drag) from click (→ chip toggle).  Set to 0 to
    restore the legacy behaviour (only the button cluster carved).

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
        # 1. Promote the pywebview WS_POPUP window to a proper OVERLAPPED
        #    window: clear WS_POPUP and add WS_CAPTION + WS_THICKFRAME +
        #    WS_SYSMENU + min/max boxes.  WS_CAPTION is the load-bearing bit —
        #    it's what gives Windows-managed work-area maximize, Aero Snap,
        #    Win11 Snap Layouts, maximize/minimize animations and the DWM drop
        #    shadow.  A bare WS_POPUP + WS_THICKFRAME window (the old approach)
        #    gets none of those, which is why the re-implemented versions never
        #    behaved natively.  The caption pixels never show because
        #    WM_NCCALCSIZE reclaims them for the React titlebar.
        style = user32.GetWindowLongPtrW(hwnd, GWL_STYLE)
        new_style = ((style & ~WS_POPUP) | WS_CAPTION | WS_THICKFRAME
                     | WS_SYSMENU | WS_MAXIMIZEBOX | WS_MINIMIZEBOX)
        user32.SetWindowLongPtrW(hwnd, GWL_STYLE, new_style)

        # 2. Subclass the wndproc.  SetWindowLongPtrW with GWLP_WNDPROC
        #    returns the previous wndproc address; we keep it so the
        #    subclass can CallWindowProcW into it for unhandled messages.
        orig_addr = user32.GetWindowLongPtrW(hwnd, GWLP_WNDPROC)
        new_proc = _make_wndproc(orig_addr, titlebar_height, button_cluster_width,
                                 slot_width)

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
        _INSTALLED[hwnd] = (orig_addr, new_proc, titlebar_height,
                            button_cluster_width, slot_width)
        logger.info(
            'install_custom_chrome: hwnd=%s titlebar_h=%s buttons_w=%s slot_w=%s '
            'border=%s installed',
            hwnd, titlebar_height, button_cluster_width, slot_width,
            _resize_border_px())
        return True

    except Exception:
        logger.exception('install_custom_chrome failed for hwnd=%s', hwnd)
        return False


def is_installed(hwnd: int) -> bool:
    return hwnd in _INSTALLED


def toggle_maximize(hwnd: int) -> bool:
    """Toggle native maximize/restore for `hwnd`; return the NEW maximized
    state (True = now maximized).

    Uses raw ShowWindow(SW_MAXIMIZE / SW_RESTORE) — NOT pywebview's WinForms
    maximize() — so the WM_GETMINMAXINFO handler installed by
    install_custom_chrome clamps the maximized rect to the monitor WORK AREA:
    the window sits ABOVE the taskbar, like a normal framed app.  A
    FormBorderStyle.None form maximized via WinForms WindowState instead covers
    the FULL screen (hiding the taskbar) and re-applies its own frame style,
    fighting the custom chrome.

    Single source of truth for the native maximize toggle: both the caption
    maximize-button (WM_NCLBUTTONUP / HTMAXBUTTON in the wndproc) and the JS
    WindowApi.window_toggle_maximize call here.  Must run on the HWND's owning
    (pywebview GUI) thread; pywebview marshals js_api calls there.
    """
    if sys.platform != 'win32' or not hwnd:
        return False
    now_max = _is_maximized(hwnd)
    try:
        user32.ShowWindow(hwnd, SW_RESTORE if now_max else SW_MAXIMIZE)
    except Exception:
        logger.exception('toggle_maximize failed for hwnd=%s', hwnd)
        return now_max
    return not now_max


def begin_window_drag(hwnd: int) -> bool:
    """Start the native window-move loop for `hwnd` from a JS-initiated
    mouse-down — used when the drag begins over an HTCLIENT region (the
    intelligence-chip slot) rather than a true HTCAPTION strip.

    The chip slot is carved to HTCLIENT (see `_make_wndproc`) so the WebView
    receives its clicks; the trade-off is that Windows will NOT auto-start a
    move there.  When the SPA's drag-vs-click logic detects a real drag it
    calls `WindowApi.window_start_drag()` → here, and we kick the OS move
    loop manually with the classic `ReleaseCapture()` +
    `SendMessage(WM_NCLBUTTONDOWN, HTCAPTION)` sequence.

    This is the same trick Electron/CEF custom-titlebars use for the
    "-webkit-app-region: drag isn't honoured" case.  Because the OS runs its
    own modal move loop, this DOES get Aero Snap + multi-monitor edge
    constraints for free (unlike a manual JS offset-follow drag).

    Must run on the thread that owns the HWND (pywebview's GUI thread).
    pywebview marshals js_api method calls onto that thread, so calling this
    from `WindowApi.window_start_drag` is safe.

    Returns True if the move message was dispatched.
    """
    if sys.platform != 'win32':
        return False
    if not hwnd:
        return False
    try:
        # ReleaseCapture so the pending WebView mouse-capture doesn't fight
        # the move loop, then tell the window a caption-button-down happened.
        user32.ReleaseCapture()
        user32.SendMessageW(hwnd, WM_NCLBUTTONDOWN, HTCAPTION, 0)
        return True
    except Exception:
        logger.exception('begin_window_drag failed for hwnd=%s', hwnd)
        return False


# edge name (matches NunbaTitleBar.js RESIZE_GRIPS) → Win32 resize hit-code
_EDGE_HT = {
    'left': HTLEFT, 'right': HTRIGHT, 'top': HTTOP, 'bottom': HTBOTTOM,
    'top-left': HTTOPLEFT, 'top-right': HTTOPRIGHT,
    'bottom-left': HTBOTTOMLEFT, 'bottom-right': HTBOTTOMRIGHT,
}


def begin_window_resize(hwnd: int, edge: str) -> bool:
    """Start the native window-RESIZE loop for `hwnd` from a JS-initiated
    mouse-down on a WebView edge grip.

    Same ReleaseCapture + SendMessage(WM_NCLBUTTONDOWN, HT<edge>) trick as
    begin_window_drag, but with a resize hit-code instead of HTCAPTION.

    Why it's needed even though _make_wndproc's WM_NCHITTEST already returns
    HTLEFT/HTRIGHT/etc. for the border: the hosted WebView2 child HWND fills
    the client area to the very edge, so the cursor at the window border is
    over the CHILD — the parent's WM_NCHITTEST is never consulted there and
    OS edge-resize never starts.  The React grips (NunbaTitleBar.js) are thin
    DOM strips at the viewport edges that DO receive the mousedown; they call
    WindowApi.window_begin_resize(edge) → here, and we kick the OS's own modal
    resize loop (correct cursors, Aero Snap, monitor-edge constraints).

    Must run on the HWND's owning (pywebview GUI) thread; pywebview marshals
    js_api calls there, so calling from WindowApi.window_begin_resize is safe.
    """
    if sys.platform != 'win32':
        return False
    if not hwnd:
        return False
    ht = _EDGE_HT.get((edge or '').strip().lower())
    if ht is None:
        logger.debug('begin_window_resize: unknown edge %r', edge)
        return False
    try:
        user32.ReleaseCapture()
        user32.SendMessageW(hwnd, WM_NCLBUTTONDOWN, ht, 0)
        return True
    except Exception:
        logger.exception('begin_window_resize failed for hwnd=%s edge=%s', hwnd, edge)
        return False
