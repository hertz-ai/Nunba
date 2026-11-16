"""Whether the owner is looking at Nunba's main page, as the page reports it.

The floating companion window is for when the owner is somewhere else.  Over
Nunba's own window it is a second copy of the same conversation, so it hides
while the main page is in front.

Until 2026-11-10 app.py answered "is the main page in front?" by asking the
operating system which window was in the foreground, every 0.35 s, with a
Win32 / AppKit / X11 branch each.  The owner's rule that day: the floating
window follows events, not a clock, and the answer comes from our own page
("we shd know whether its getting rendered or not, not the windows"), on
Windows, macOS and Linux alike.

So the main page reports it (landing-page/src/hooks/useMainPagePresence.js):
on focus, blur, visibilitychange and pywebviewready it calls the main
window's js_api ``main_page_presence(in_front)``, only when the answer
changes.  pywebview carries that call the same way on WebView2, WKWebView and
WebKitGTK; nothing here knows which one is running.

Fail closed: until the page has said "not in front", the companion stays
hidden.  "No report yet" covers startup, a page that failed to load and an old
cached page that never reports; in each of them the owner may well be looking
at Nunba, and showing a duplicate over it is the defect this gate exists for.
A report belongs to the page that sent it: when the main window starts loading
a page again (reload, navigation, the REMOUNT watchdog) it is reset to "no
report" (MainPagePresence.reset), so a page that never mounts again cannot
leave an old "not in front" behind (review of c8968c3b).

CompanionPresenceApplier puts what the companion page asked for on screen
through that gate; app.py only wires the windows to it, so the decision is
tested with fake windows here rather than read out of app.py's text.
"""
import logging
import sys
import threading

logger = logging.getLogger(__name__)

# Where the floating companion has been measured.  Before c8968c3b the gate read
# the operating system's foreground window through Win32 only, so off Windows
# it always read "unreadable" and the companion never showed.  The page's
# report works on every OS, but on macOS pywebview's show() activates the app
# (cocoa BrowserView.show, read in pywebview 6.1, not run), taking focus from
# the owner's other application, and the orb clipping (set_window_shape) is
# Win32 only, so the whole card would show.  It stays on Windows until it is
# measured there (review of c8968c3b; design checklist c4, f5).
COMPANION_MEASURED_PLATFORMS = ('win32',)


def _tell(listeners, value):
    for listener in listeners:
        try:
            listener(value)
        except Exception as err:
            logger.warning("[COMPANION] main page presence listener "
                           "failed: %s", err, exc_info=True)


class MainPagePresence:
    """The main page's last report, and who to tell when it changes."""

    def __init__(self):
        self._lock = threading.Lock()
        self._in_front = None          # None: the page has not reported yet
        self._listeners = []

    @property
    def in_front(self):
        """True, False, or None when the page has not reported."""
        with self._lock:
            return self._in_front

    def companion_may_show(self):
        """Only after the page has said it is not in front."""
        return self.in_front is False

    def on_change(self, listener):
        """Call ``listener(in_front)`` on every change of the report."""
        with self._lock:
            self._listeners.append(listener)

    def report(self, in_front):
        """The page's report.  Anything but a real bool is refused: a
        JavaScript caller can send a string, and 'false' is truthy."""
        if not isinstance(in_front, bool):
            logger.warning("[COMPANION] main page presence refused: %r is not "
                           "true or false", in_front)
            return False
        with self._lock:
            if in_front is self._in_front:
                return True
            self._in_front = in_front
            listeners = list(self._listeners)
        logger.info("[COMPANION] main page %s",
                    'in front' if in_front else 'not in front')
        _tell(listeners, in_front)
        return True

    def reset(self):
        """The main window is loading a page again; the last report was the
        old page's.  Back to "no report", so the companion stays hidden until
        the new page says it is not in front.  Wired to the main window's
        ``events.before_load``."""
        with self._lock:
            if self._in_front is None:
                return
            self._in_front = None
            listeners = list(self._listeners)
        logger.info("[COMPANION] main page loading again; its report is "
                    "cleared until it reports")
        _tell(listeners, None)


class CompanionPresenceApplier:
    """What the companion page asked for, on screen, through the gate.

    The companion page asks for 'hidden', 'orb' (an agent is speaking: the
    window cut to the orb's rect, ``shape``) or 'shown' (the whole card).  A
    request and a change of the main page's report both re-apply the last
    request under ONE lock, so the window ends in the state the last request
    and the last report say, whichever thread arrives last (pywebview runs
    each js_api call on its own thread).

    ``window`` needs show() and hide(); ``apply_shape(shape)`` cuts the window
    to the orb and ``raise_window()`` puts it on top (Win32 helpers in app.py).
    """

    def __init__(self, presence, window, apply_shape, raise_window,
                 platform=None):
        self._presence = presence
        self._window = window
        self._apply_shape = apply_shape
        self._raise = raise_window
        self._platform = sys.platform if platform is None else platform
        self._lock = threading.Lock()
        self._state, self._shape = 'hidden', None
        presence.on_change(self._on_main_page)

    def request(self, state, shape=None):
        """The companion page's request."""
        with self._lock:
            self._state, self._shape = state, shape
            self._apply()

    def _on_main_page(self, _in_front):
        with self._lock:
            self._apply()

    def _why_hidden(self):
        """Why the companion may not show now, in words for the log, or None."""
        if self._platform not in COMPANION_MEASURED_PLATFORMS:
            return f'not measured on {self._platform} yet'
        if self._presence.companion_may_show():
            return None
        if self._presence.in_front is None:
            return 'the main page has not reported since it loaded'
        return 'the main page is in front'

    def _apply(self):
        try:
            if self._state == 'hidden':
                self._window.hide()
                return
            reason = self._why_hidden()
            # One line per decision, with the reason when it hides: an absent
            # line could mean "never ran" or "ran and allowed".
            logger.info("[COMPANION] presence %s -> %s", self._state,
                        f'hide ({reason})' if reason else 'show')
            if reason:
                self._window.hide()
                return
            if self._shape:
                self._apply_shape(self._shape)
            self._window.show()
            self._raise()
        except Exception as err:
            logger.warning("[COMPANION] presence %s failed: %s",
                           self._state, err)


class MainPagePresenceApi:
    """The js_api method the main page calls.  Bound onto the main window's
    js_api object (desktop.native_api_window.compose_js_api's result), so
    only the main window's page can reach it."""

    def __init__(self, presence):
        self._presence = presence

    def main_page_presence(self, in_front):
        return self._presence.report(in_front)
