"""The main page's own report decides whether the floating companion may show.

Owner, 2026-11-10: the floating window follows events, not a 0.35 s poll of
the operating system's foreground window, and the answer comes from our own
page, on Windows, macOS and Linux alike.  The page reports through the main
window's js_api (landing-page/src/hooks/useMainPagePresence.js); this is the
host side that keeps the report (desktop/main_page_presence.py).

    python -m pytest tests/test_main_page_presence.py -q
"""
import logging
import os
import sys

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from desktop.main_page_presence import (  # noqa: E402
    MainPagePresence,
    MainPagePresenceApi,
)


def test_before_any_report_the_companion_stays_hidden():
    """Fail closed: startup, a page that failed to load, an old cached page
    that never reports.  The owner may be looking at Nunba in all three."""
    presence = MainPagePresence()
    assert presence.in_front is None
    assert presence.companion_may_show() is False


def test_the_companion_may_show_only_after_the_page_says_not_in_front():
    presence = MainPagePresence()
    presence.report(False)
    assert presence.companion_may_show() is True
    presence.report(True)
    assert presence.companion_may_show() is False


def test_listeners_hear_each_change_once():
    presence = MainPagePresence()
    heard = []
    presence.on_change(heard.append)
    for value in (True, True, False, False, True):
        presence.report(value)
    assert heard == [True, False, True]


def test_a_value_that_is_not_true_or_false_is_refused(caplog):
    """A JavaScript caller can send a string, and 'false' is truthy in
    Python; a refused report changes nothing and nobody hears it."""
    presence = MainPagePresence()
    heard = []
    presence.on_change(heard.append)
    presence.report(False)
    with caplog.at_level(logging.WARNING):
        for bad in ('false', 'true', 0, 1, None, {}):
            assert presence.report(bad) is False
    assert presence.in_front is False
    assert heard == [False]
    assert sum('refused' in r.getMessage() for r in caplog.records) == 6


def test_a_failing_listener_does_not_stop_the_others(caplog):
    presence = MainPagePresence()
    heard = []

    def broken(_):
        raise RuntimeError('window gone')

    presence.on_change(broken)
    presence.on_change(heard.append)
    with caplog.at_level(logging.WARNING):
        presence.report(False)
    assert heard == [False]
    assert presence.in_front is False
    assert any('listener failed' in r.getMessage() for r in caplog.records)


def test_the_js_api_method_is_the_report():
    presence = MainPagePresence()
    api = MainPagePresenceApi(presence)
    assert api.main_page_presence(False) is True
    assert presence.companion_may_show() is True
    assert api.main_page_presence('yes') is False
    assert presence.companion_may_show() is True


def test_the_js_api_method_survives_compose_js_api():
    """pywebview exposes the bound methods it finds on the js_api object;
    app.py binds the report onto compose_js_api's result the same way
    compose_js_api binds the window controls."""
    from desktop.native_api_window import FilePickerApi, WindowApi, compose_js_api
    api = compose_js_api(WindowApi(lambda: None), FilePickerApi(lambda: None))
    presence = MainPagePresence()
    api.main_page_presence = MainPagePresenceApi(presence).main_page_presence
    assert callable(getattr(api, 'main_page_presence'))
    api.main_page_presence(False)
    assert presence.companion_may_show() is True
