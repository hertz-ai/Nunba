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
"""
import logging
import threading

logger = logging.getLogger(__name__)


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
        for listener in listeners:
            try:
                listener(in_front)
            except Exception as err:
                logger.warning("[COMPANION] main page presence listener "
                               "failed: %s", err, exc_info=True)
        return True


class MainPagePresenceApi:
    """The js_api method the main page calls.  Bound onto the main window's
    js_api object (desktop.native_api_window.compose_js_api's result), so
    only the main window's page can reach it."""

    def __init__(self, presence):
        self._presence = presence

    def main_page_presence(self, in_front):
        return self._presence.report(in_front)
