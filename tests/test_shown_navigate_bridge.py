"""The first-show navigation must not re-load the URL the page already shows.

pywebview's ``Window.load_url`` clears the ``loaded`` and ``_pywebviewready``
events before it navigates, and only a completed navigation sets them again.
WebView2 does not navigate when told to load the URL it is already showing,
so ``load_url(<current url>)`` leaves both events cleared for the rest of the
session.  Every Python->page call (``evaluate_js``, including the return of
every ``window.pywebview.api.*`` call) then waits 20 s and raises
``WebViewException('Main window failed to start')``.

Measured 2026-10-19: the installed build logged
``[SHOWN] Forcing navigation to http://localhost:5000/local`` at boot, and the
Upload PDF picker's chosen path never reached the page.  A standalone
pywebview 6.1 window reproduced it: same-URL ``load_url`` -> 0 navigations,
``evaluate_js`` raised after 20.0 s; a different URL navigated and recovered.

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


class _FakeWindow:
    def __init__(self, current_url):
        self._current_url = current_url
        self.loaded_urls = []

    def get_current_url(self):
        return self._current_url

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


def test_page_already_at_initial_url_is_not_reloaded():
    window = _FakeWindow(INITIAL_URL)
    _shown_navigate_for(window)()
    assert window.loaded_urls == [], (
        'load_url() of the URL already shown navigates nowhere and leaves '
        "pywebview's ready events cleared — every Python->page call then "
        "raises 'Main window failed to start'")


@pytest.mark.parametrize('current', ['', None, 'about:blank'])
def test_blank_page_is_navigated_to_initial_url(current):
    window = _FakeWindow(current)
    _shown_navigate_for(window)()
    assert window.loaded_urls == [INITIAL_URL]


def test_runs_once():
    window = _FakeWindow('')
    navigate = _shown_navigate_for(window)
    navigate()
    navigate()
    assert window.loaded_urls == [INITIAL_URL]
