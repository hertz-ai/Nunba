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
          * Windows — the WM_NCHITTEST subclass in `desktop.win32_chrome`
            already classifies the titlebar strip as HTCAPTION, so Windows
            itself runs the native move + Aero Snap loop.  This JS call is a
            harmless no-op fallback there (the OS started the drag on the
            non-client mouse-down BEFORE the WebView2 child saw it).
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

        Linux/GTK ONLY.  On Windows the WM_NCHITTEST subclass already owns
        8-way resize (the React edge grips are not rendered there — see
        NunbaTitleBar.js), so this is a no-op returning False if somehow
        called.  On GTK we map the edge to a `Gdk.WindowEdge` value and
        call `Gtk.Window.begin_resize_drag(...)` so the window manager runs
        the resize (correct cursors, monitor-edge constraints, snap).

        Returns True if a resize was dispatched.
        """
        if not sys.platform.startswith('linux'):
            return False
        w = self._window()
        if w is None:
            return False
        return self._gtk_begin_resize(w, edge)

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
