"""The first-show navigation re-loads a page that failed, never one that loaded.

pywebview's ``Window.load_url`` clears the ``loaded`` and ``_pywebviewready``
events before it navigates, and only a completed navigation sets them again.

Measured 2026-10-19 with pywebview 6.1 + WebView2 on this machine:
  * page loaded fine at URL, then ``load_url(URL)``: 0 navigations, the events
    stay cleared, every ``evaluate_js`` (including the return of every
    ``window.pywebview.api.*`` call) waits 20 s and raises
    ``WebViewException('Main window failed to start')``.  The installed build
    did exactly this at boot ("[SHOWN] Forcing navigation to
    http://localhost:5000/local"), so the Upload PDF picker's path never
    reached the page.
  * first load failed (server not up yet): WebView2 shows its error page,
    ``location.href`` is ``chrome-error://chromewebdata/`` while the window
    still reports URL; ``load_url(URL)`` then navigates and the real page
    loads.  This is the case the reload was written for (6abacf95,
    "Page didn't load or is blank — force navigate").

The test runs the real ``_on_shown_navigate`` body from app.py against a fake
window, so it needs neither pywebview nor WebView2.
"""
from __future__ import annotations

import ast
import logging
import os
import sys

import pytest

APP_PY = os.path.abspath(
    os.path.join(os.path.dirname(__file__), os.pardir, 'app.py')
)
INITIAL_URL = 'http://localhost:5000/local'
ERROR_PAGE = 'chrome-error://chromewebdata/'


class _FakeWindow:
    def __init__(self, current_url, href=None):
        self._current_url = current_url
        self._href = href
        self.loaded_urls = []

    def get_current_url(self):
        return self._current_url

    def evaluate_js(self, script):
        assert script == 'location.href'
        if isinstance(self._href, Exception):
            raise self._href
        return self._href

    def load_url(self, url):
        self.loaded_urls.append(url)


def _shown_navigate_for(window):
    """Compile app.py's ``_on_shown_navigate`` with ``window`` as ``_window``."""
    with open(APP_PY, encoding='utf-8') as fh:
        tree = ast.parse(fh.read(), filename=APP_PY)
    defs = [n for n in ast.walk(tree)
            if isinstance(n, ast.FunctionDef) and n.name == '_on_shown_navigate']
    assert len(defs) == 1, f'expected one _on_shown_navigate, found {len(defs)}'
    module = ast.Module(body=[defs[0]], type_ignores=[])
    namespace = {
        '_shown_nav_done': [False],
        '_window': window,
        'initial_url': INITIAL_URL,
        'logger': logging.getLogger('test_shown_navigate_bridge'),
        'sys': sys,
        '_resolve_hwnd': lambda _w: 0,
    }
    exec(compile(module, APP_PY, 'exec'), namespace)
    return namespace['_on_shown_navigate']


def test_page_that_loaded_is_not_reloaded():
    window = _FakeWindow(INITIAL_URL, href=INITIAL_URL)
    _shown_navigate_for(window)()
    assert window.loaded_urls == [], (
        'load_url() of the URL already shown navigates nowhere and leaves '
        "pywebview's ready events cleared — every Python->page call then "
        "raises 'Main window failed to start'")


def test_failed_first_load_is_reloaded():
    window = _FakeWindow(INITIAL_URL, href=ERROR_PAGE)
    _shown_navigate_for(window)()
    assert window.loaded_urls == [INITIAL_URL], (
        'the WebView2 error page (server not up at first load) must be '
        're-navigated; that is what the reload exists for')


def test_unreadable_document_keeps_the_reload():
    window = _FakeWindow(INITIAL_URL, href=RuntimeError('bridge not ready'))
    _shown_navigate_for(window)()
    assert window.loaded_urls == [INITIAL_URL]


@pytest.mark.parametrize('current', ['', None, 'about:blank'])
def test_blank_page_is_navigated_to_initial_url(current):
    window = _FakeWindow(current)
    _shown_navigate_for(window)()
    assert window.loaded_urls == [INITIAL_URL]


def test_other_route_is_left_alone():
    window = _FakeWindow('http://localhost:5000/social', href='http://localhost:5000/social')
    _shown_navigate_for(window)()
    assert window.loaded_urls == []


def test_runs_once():
    window = _FakeWindow('')
    navigate = _shown_navigate_for(window)
    navigate()
    navigate()
    assert window.loaded_urls == [INITIAL_URL]
