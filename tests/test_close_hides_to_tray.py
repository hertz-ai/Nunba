"""Closing the Nunba window hides it to the tray -- it does not destroy it.

Live 2026-09-16 11:28:38 (gui_app.log): the owner closed the window;
app.py logged "Window close button clicked, minimizing to system tray" and
"Window hidden successfully" -- and from 11:28:41 every resolve_hwnd call
raised "Cannot access a disposed object. Object name: 'Form'." until the
owner picked Quit from the tray at 11:29:04.  The form was gone: app.py
registered its hide on pywebview's `closed` event, which fires AFTER
WinForms has closed the form (winforms.py on_closed: instance removed,
`closed.set()`, then `_shutdown` when it was the last window); the handler's
`return True` is read by nobody.  pywebview's cancel point is the `closing`
event: a handler that returns False cancels the close (event.py Event.set
returns True when any handler returned False; winforms on_closing sets
args.Cancel).  So "minimize to tray on close" never worked -- the window was
destroyed, tray Restore had nothing to show, and the app served headless
until Quit.

These tests pin the closing-event contract in app.py without a display.
"""
from __future__ import annotations

import logging
import re
import types
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
APP_PY = REPO_ROOT / "app.py"


def _load(name, stop_marker, **ns_extra):
    src = APP_PY.read_text(encoding="utf-8")
    start = src.index(f"def {name}(")
    end = src.index(stop_marker, start)
    ns = {"logger": logging.getLogger("test_close"), "traceback": __import__("traceback")}
    ns.update(ns_extra)
    exec(compile(src[start:end], str(APP_PY), "exec"), ns)  # noqa: S102
    return ns


class ClosingHidesToTrayTests(unittest.TestCase):
    def test_on_closing_hides_the_window_and_cancels_the_close(self):
        hidden = []
        window = types.SimpleNamespace(hide=lambda: hidden.append(True))
        ns = _load("on_closing", "\n# on_minimized", _window=window)
        self.assertIs(ns["on_closing"](), False)  # False = cancel (pywebview Event.set)
        self.assertEqual(hidden, [True])

    def test_on_closing_survives_a_failing_hide(self):
        def boom():
            raise RuntimeError("no form")

        ns = _load("on_closing", "\n# on_minimized", _window=types.SimpleNamespace(hide=boom))
        self.assertIs(ns["on_closing"](), False)

    def test_every_registration_uses_the_closing_event(self):
        src = APP_PY.read_text(encoding="utf-8")
        self.assertGreaterEqual(len(re.findall(r"events\.closing \+= on_closing", src)), 2)
        self.assertEqual(re.findall(r"events\.closed \+= on_closed", src), [])

    def test_window_close_requests_a_close_and_names_the_policy(self):
        src = (REPO_ROOT / "desktop" / "native_api_window.py").read_text(encoding="utf-8")
        body = re.search(r"def window_close\(self\) -> bool:(.*?)\n    def ", src, re.S).group(1)
        self.assertIn("w.destroy()", body)
        self.assertIn("closing", body)


if __name__ == "__main__":
    unittest.main()
