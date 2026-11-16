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


# ── The applier: what the companion page asked for, through the gate ──
# app.py builds one CompanionPresenceApplier for the floating window; these
# drive the real class with a fake window (review of c8968c3b: app.py's
# wiring had only text-match tests, and all four behaviour mutants survived).

class _Window:
    """The two pywebview calls the applier makes, recorded in order."""

    def __init__(self):
        self.calls = []

    def show(self):
        self.calls.append('show')

    def hide(self):
        self.calls.append('hide')


def _applier(platform='win32'):
    # Imported here, not at the top: the applier is new in this rework, so on
    # a tree without it each applier test fails on its own while the report
    # tests above still run.
    from desktop.main_page_presence import CompanionPresenceApplier
    presence, window = MainPagePresence(), _Window()
    shapes, raised = [], []
    applier = CompanionPresenceApplier(
        presence, window, shapes.append, lambda: raised.append(True),
        platform=platform)
    return presence, window, applier, shapes, raised


def test_a_request_before_any_report_stays_hidden(caplog):
    presence, window, applier, shapes, raised = _applier()
    with caplog.at_level(logging.INFO):
        applier.request('orb', {'x': 1, 'y': 2, 'w': 3, 'h': 4})
    assert window.calls == ['hide'] and shapes == [] and raised == []
    assert 'the main page has not reported since it loaded' in caplog.text


def test_after_not_in_front_the_request_is_put_on_screen():
    presence, window, applier, shapes, raised = _applier()
    presence.report(False)
    applier.request('orb', {'x': 1, 'y': 2, 'w': 3, 'h': 4})
    assert shapes == [{'x': 1, 'y': 2, 'w': 3, 'h': 4}]
    assert window.calls[-1] == 'show' and raised == [True]


def test_alt_tab_to_nunba_hides_it_and_leaving_shows_the_last_request(caplog):
    """The owner switching windows changes nothing on the COMPANION page; the
    main page's report re-applies the companion page's last request."""
    presence, window, applier, shapes, raised = _applier()
    presence.report(False)
    applier.request('shown')
    with caplog.at_level(logging.INFO):
        presence.report(True)
    assert window.calls[-1] == 'hide'
    assert 'the main page is in front' in caplog.text
    presence.report(False)
    assert window.calls[-1] == 'show'


def test_a_hidden_request_hides_whatever_the_report():
    presence, window, applier, shapes, raised = _applier()
    presence.report(False)
    applier.request('shown')
    applier.request('hidden')
    assert window.calls[-1] == 'hide'
    after_hidden = len(window.calls)
    presence.report(True)
    presence.report(False)
    assert 'show' not in window.calls[after_hidden:]


def test_a_page_reload_clears_the_report_and_hides_the_companion():
    """Review of c8968c3b: a stale "not in front" kept the companion over
    Nunba after the page reloaded into a state that never reported."""
    presence, window, applier, shapes, raised = _applier()
    presence.report(False)
    applier.request('orb')
    assert window.calls[-1] == 'show'
    presence.reset()                      # the main window's before_load
    assert presence.in_front is None
    assert presence.companion_may_show() is False
    assert window.calls[-1] == 'hide'
    applier.request('shown')              # the agent speaks again
    assert window.calls[-1] == 'hide'
    presence.report(False)                # the new page reports
    assert window.calls[-1] == 'show'


def test_a_reset_with_no_report_tells_nobody():
    presence = MainPagePresence()
    heard = []
    presence.on_change(heard.append)
    presence.reset()
    assert heard == []
    presence.report(False)
    presence.reset()
    assert heard == [False, None]


def test_off_windows_the_companion_stays_hidden_until_it_is_measured(caplog):
    """Review of c8968c3b: on macOS pywebview's show() takes focus from the
    owner's other app and the orb clipping is Win32 only; it was never
    measured there."""
    for platform in ('darwin', 'linux'):
        presence, window, applier, shapes, raised = _applier(platform)
        presence.report(False)
        with caplog.at_level(logging.INFO):
            applier.request('orb', {'x': 1, 'y': 2, 'w': 3, 'h': 4})
        # The report re-applies the initial 'hidden' too, so two hides.
        assert set(window.calls) == {'hide'} and shapes == [] and raised == []
        assert f'not measured on {platform} yet' in caplog.text


def test_a_failing_window_call_is_logged_not_raised(caplog):
    presence, window, applier, shapes, raised = _applier()

    def boom():
        raise RuntimeError('form gone')

    window.show = boom
    presence.report(False)
    with caplog.at_level(logging.WARNING):
        applier.request('shown')
    assert 'presence shown failed' in caplog.text
