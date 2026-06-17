"""WindowApi — minimize / maximize / close / drag bindings for the frameless
custom titlebar (Teams-style chrome).

Exposed to the React SPA as `window.pywebview.api.window_*`.  Cross-platform:
pywebview's window API uniformly handles Win / Linux / macOS, but we only
enable frameless on Win+Linux — on macOS the native traffic-light buttons
remain via standard chrome (Apple HIG).

Threading: pywebview's window methods are safe to call from the JS-thread
without explicit synchronization; pywebview marshals them internally.
"""
import logging
import sys
from typing import Optional

logger = logging.getLogger('nunba.window_api')


class WindowApi:
    """JS-facing native window controls.  Bound to a single pywebview Window.

    Methods are deliberately named `window_*` so they don't collide with
    `NunbaNativeApi.native_mic_record` etc. when both APIs are composed via
    pywebview's `js_api` dict.
    """

    def __init__(self, get_window):
        """get_window: zero-arg callable returning the live pywebview Window.

        We accept a getter rather than the window itself because the window
        is created AFTER WindowApi is instantiated in app.py (chicken-and-egg
        on Windows where create_window's js_api kwarg must be supplied at
        creation time).
        """
        self._get_window = get_window

    def _window(self):
        try:
            return self._get_window()
        except Exception as exc:
            logger.debug('WindowApi: window getter failed: %s', exc)
            return None

    # ── Lifecycle (all return True on dispatched, False if no window) ──

    def window_minimize(self) -> bool:
        w = self._window()
        if w is None:
            return False
        try:
            w.minimize()
            return True
        except Exception as exc:
            logger.warning('window_minimize failed: %s', exc)
            return False

    def window_toggle_maximize(self) -> bool:
        w = self._window()
        if w is None:
            return False
        try:
            # pywebview exposes `maximize()` + `restore()`; track which by
            # checking the current window-state hint when available.
            state = getattr(w, '_maximized', False)
            if state:
                w.restore()
                try:
                    w._maximized = False
                except Exception:
                    pass
            else:
                w.maximize()
                try:
                    w._maximized = True
                except Exception:
                    pass
            return True
        except Exception as exc:
            logger.warning('window_toggle_maximize failed: %s', exc)
            return False

    def window_close(self) -> bool:
        w = self._window()
        if w is None:
            return False
        try:
            w.destroy()
            return True
        except Exception as exc:
            logger.warning('window_close failed: %s', exc)
            return False

    def window_start_drag(self) -> bool:
        """Begin a drag-move from a mouse-down on the titlebar drag region.

        Platform behaviour:
          * Windows — TWO cases:
              (a) The HTCAPTION strip (wordmark + center spacer): Windows
                  itself starts the native move + Aero Snap loop on the
                  non-client mouse-down, so this JS call is a harmless no-op
                  fallback (begin_window_drag returns True but the OS already
                  owns the drag).
              (b) The intelligence-chip slot: that zone is carved to
                  HTCLIENT (so the WebView receives the chip's clicks — see
                  desktop.win32_chrome._make_wndproc), which means Windows
                  will NOT auto-start a move there.  When the SPA's
                  drag-vs-click logic detects a real drag on the chip it
                  calls here, and `begin_window_drag` kicks the native move
                  loop via ReleaseCapture + WM_NCLBUTTONDOWN/HTCAPTION — the
                  standard Electron/CEF custom-titlebar trick, snap-aware.
          * Linux/GTK — there is NO native caption, so we kick off a real
            window-manager move via `Gtk.Window.begin_move_drag(...)`.  That
            gives the same WM-driven move + edge-tiling (the GTK/Mutter/KWin
            equivalent of Aero Snap) instead of pywebview's manual
            offset-follow drag.
          * macOS — frameless is OFF (native chrome), so this isn't reached.

        Returns True if a drag was dispatched.
        """
        w = self._window()
        if w is None:
            return False

        # Windows: kick the native move loop ourselves.  Required for the
        # HTCLIENT chip slot (the OS won't auto-start a move there); a no-op
        # but harmless on the HTCAPTION strip (the OS already started one).
        if sys.platform.startswith('win'):
            if self._win_begin_drag(w):
                return True
            # fall through to pywebview's generic path if HWND was unresolved

        # Linux/GTK: prefer the native WM move (snap-aware).
        if sys.platform.startswith('linux'):
            if self._gtk_begin_move(w):
                return True
            # fall through to pywebview's generic path if GTK wasn't reachable

        # pywebview ≥ 5.x exposes `move_start()` on the platform-specific
        # window; older builds support `move()` with deltas via JS-side
        # mousemove.  We try the easy path first and fall back silently.
        for method_name in ('move_start', 'start_drag', '_start_drag'):
            fn = getattr(w, method_name, None)
            if callable(fn):
                try:
                    fn()
                    return True
                except Exception as exc:
                    logger.debug('drag %s failed: %s', method_name, exc)
                    continue
        return False

    def window_begin_resize(self, edge: str) -> bool:
        """Begin a native edge/corner resize from a mouse-down on a grip.

        `edge` is one of: 'left', 'right', 'top', 'bottom',
        'top-left', 'top-right', 'bottom-left', 'bottom-right'.

        Both Windows and Linux/GTK.  The React edge grips (NunbaTitleBar.js)
        render on both because the hosted WebView child fills the client to
        the edge and eats the OS resize border, so the parent's hit-test never
        starts a resize on its own.  On Windows we kick the native resize loop
        via win32_chrome.begin_window_resize (SendMessage WM_NCLBUTTONDOWN with
        the matching HT<edge>); on GTK we map to a `Gdk.WindowEdge` and call
        `Gtk.Window.begin_resize_drag(...)`.  Either way the WM/OS runs the
        resize (correct cursors, monitor-edge constraints, snap).

        Returns True if a resize was dispatched.
        """
        w = self._window()
        if w is None:
            return False
        if sys.platform.startswith('win'):
            return self._win_begin_resize(w, edge)
        if sys.platform.startswith('linux'):
            return self._gtk_begin_resize(w, edge)
        return False

    def window_platform(self) -> str:
        """Report the host OS family so the SPA knows whether to render its
        own resize grips (Linux/GTK needs them; Windows handles resize in
        the native hit-test; macOS keeps native chrome).

        Returns 'win32', 'linux', 'darwin', or 'unknown'.
        """
        if sys.platform.startswith('win'):
            return 'win32'
        if sys.platform.startswith('linux'):
            return 'linux'
        if sys.platform == 'darwin':
            return 'darwin'
        return 'unknown'

    def window_is_maximized(self) -> bool:
        w = self._window()
        if w is None:
            return False
        return bool(getattr(w, '_maximized', False))

    # ── Windows native move (drag from HTCLIENT chip slot) ───────────────

    @staticmethod
    def _win_hwnd(w):
        """Resolve the top-level HWND for a pywebview window on Windows.

        Mirrors app.py's chrome-install HWND resolution: the winforms backend
        exposes the Form handle as `w.original_window.handle`; some builds put
        it directly on `w.handle`.  Returns an int HWND or None."""
        try:
            ow = getattr(w, 'original_window', None)
            if ow is not None and getattr(ow, 'handle', None):
                return int(ow.handle)
            if getattr(w, 'handle', None):
                return int(w.handle)
        except Exception as exc:
            logger.debug('win hwnd resolve failed: %s', exc)
        return None

    def _win_begin_drag(self, w) -> bool:
        """Start the native move loop via desktop.win32_chrome.begin_window_drag.

        Returns False (so the caller can fall through) if the HWND can't be
        resolved or the chrome helper isn't importable."""
        hwnd = self._win_hwnd(w)
        if not hwnd:
            return False
        try:
            from desktop.win32_chrome import begin_window_drag
        except Exception as exc:
            logger.debug('win32_chrome import failed: %s', exc)
            return False
        return begin_window_drag(hwnd)

    def _win_begin_resize(self, w, edge: str) -> bool:
        """Start the native resize loop via desktop.win32_chrome.begin_window_resize.

        The WebView2 child fills the client to the edge, so the OS never sees
        the cursor reach the parent's WM_NCHITTEST resize border — the React
        edge grip catches the mousedown and routes here.  Returns False (so the
        caller can fall through) if the HWND can't be resolved or the helper
        isn't importable."""
        hwnd = self._win_hwnd(w)
        if not hwnd:
            return False
        try:
            from desktop.win32_chrome import begin_window_resize
        except Exception as exc:
            logger.debug('win32_chrome import failed: %s', exc)
            return False
        return begin_window_resize(hwnd, edge)

    # ── GTK native move / resize (Linux only) ────────────────────────────
    #
    # pywebview's GTK backend sets `pywebview_window.native` to the
    # underlying `Gtk.ApplicationWindow` (gtk.py: `self.pywebview_window
    # .native = self.window`).  That `Gtk.Window` exposes begin_move_drag /
    # begin_resize_drag, which ask the window manager to run the operation —
    # giving us native snap/tiling, correct resize cursors, and monitor
    # constraints for free.  All of this is wrapped so it can NEVER raise
    # into pywebview's JS bridge: any failure returns False.

    # Gdk.WindowEdge enum (GTK3): NW=0, N=1, NE=2, W=3, E=4, SW=5, S=6, SE=7.
    _GTK_EDGE = {
        'top-left': 0, 'top': 1, 'top-right': 2,
        'left': 3, 'right': 4,
        'bottom-left': 5, 'bottom': 6, 'bottom-right': 7,
    }

    @staticmethod
    def _gtk_native_window(w):
        """Return the underlying Gtk.Window for a pywebview window, or None.

        pywebview 4-6 expose it as `.native`; some builds nest it under
        `.gui.BrowserView` — we only rely on the documented `.native`.
        """
        return getattr(w, 'native', None)

    def _gtk_pointer(self, gtk_win):
        """Current pointer position in ROOT (screen) coords + the pointer
        device, via the window's Gdk display.  Returns (root_x, root_y,
        device) or (None, None, None) on any failure.

        begin_move_drag/begin_resize_drag want root coords + a button +
        a timestamp; we use button 1 and CURRENT_TIME (0)."""
        try:
            gdk_win = gtk_win.get_window()
            if gdk_win is None:
                return (None, None, None)
            display = gdk_win.get_display()
            seat = display.get_default_seat()
            device = seat.get_pointer()
            # Gdk.Window.get_device_position → (window, x, y, mask) where
            # x/y are window-relative; convert to root via the window origin.
            _, px, py, _ = gdk_win.get_device_position(device)
            ox, oy = gdk_win.get_origin()[1:]  # (ok, x, y)
            return (ox + px, oy + py, device)
        except Exception as exc:
            logger.debug('gtk pointer query failed: %s', exc)
            return (None, None, None)

    def _gtk_begin_move(self, w) -> bool:
        gtk_win = self._gtk_native_window(w)
        if gtk_win is None or not hasattr(gtk_win, 'begin_move_drag'):
            return False
        rx, ry, _device = self._gtk_pointer(gtk_win)
        if rx is None:
            return False
        try:
            # begin_move_drag(button, root_x, root_y, timestamp)
            gtk_win.begin_move_drag(1, int(rx), int(ry), 0)
            return True
        except Exception as exc:
            logger.debug('gtk begin_move_drag failed: %s', exc)
            return False

    def _gtk_begin_resize(self, w, edge: str) -> bool:
        gtk_win = self._gtk_native_window(w)
        if gtk_win is None or not hasattr(gtk_win, 'begin_resize_drag'):
            return False
        edge_val = self._GTK_EDGE.get((edge or '').strip().lower())
        if edge_val is None:
            logger.debug('gtk resize: unknown edge %r', edge)
            return False
        rx, ry, _device = self._gtk_pointer(gtk_win)
        if rx is None:
            return False
        try:
            # begin_resize_drag(edge, button, root_x, root_y, timestamp).
            # `edge` is a Gdk.WindowEdge; GTK accepts the underlying int.
            gtk_win.begin_resize_drag(edge_val, 1, int(rx), int(ry), 0)
            return True
        except Exception as exc:
            logger.debug('gtk begin_resize_drag failed: %s', exc)
            return False


def use_frameless() -> bool:
    """Return True if this platform should run the custom titlebar.

    Windows + Linux: frameless ON.  macOS: native chrome (Apple HIG).
    """
    return sys.platform.startswith('win') or sys.platform.startswith('linux')
