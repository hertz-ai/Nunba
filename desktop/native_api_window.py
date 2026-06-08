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

        pywebview ≥ 5.x exposes `move_start()` on the platform-specific
        window; older builds support `move()` with deltas via JS-side
        mousemove.  We try the easy path first and fall back silently.
        """
        w = self._window()
        if w is None:
            return False
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

    def window_is_maximized(self) -> bool:
        w = self._window()
        if w is None:
            return False
        return bool(getattr(w, '_maximized', False))


def use_frameless() -> bool:
    """Return True if this platform should run the custom titlebar.

    Windows + Linux: frameless ON.  macOS: native chrome (Apple HIG).
    """
    return sys.platform.startswith('win') or sys.platform.startswith('linux')
