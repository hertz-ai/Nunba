"""The AI-control ribbon says what the AI is doing, not only that it is.

HARTOS's VLM loop sends each step's caption with its show request
(integrations/vlm/local_loop._notify_desktop_indicator, ``?text=``); the
/indicator/show route hands it to toggle_indicator, which puts it on the
ribbon's panel (RibbonIndicator.set_step).  A show request without text keeps
the last line, so the loop's bare re-arm shows never blank it.
"""
import ast
import types
from pathlib import Path

import pytest


@pytest.fixture
def iw(monkeypatch):
    mod = pytest.importorskip('desktop.indicator_window')
    steps = []
    stub = types.SimpleNamespace(show=lambda: None, hide=lambda: None,
                                 set_step=lambda text: steps.append(text),
                                 step_text='')
    monkeypatch.setattr(mod, '_indicator_window', stub)
    monkeypatch.setattr(mod, 'indicator_active', False)
    monkeypatch.setattr(mod, 'control_start_time', None)
    mod._steps = steps
    return mod


def test_a_show_with_text_puts_it_on_the_ribbon(iw):
    iw.toggle_indicator(True, text='Open Settings from the Start menu (left_click)')
    assert iw._steps == ['Open Settings from the Start menu (left_click)']


def test_a_bare_show_keeps_the_last_line(iw):
    iw.toggle_indicator(True, text='first step')
    iw.toggle_indicator(True)
    assert iw._steps == ['first step']


def test_hide_sends_no_text(iw):
    iw.toggle_indicator(True, text='step')
    iw.toggle_indicator(False, text='ignored')
    assert iw._steps == ['step']


def test_caption_is_one_line_and_bounded(iw):
    assert iw._one_line('  two\n words   here ') == 'two words here'
    cut = iw._one_line('x' * 500)
    # Read from the module, not a second copy of the number here.  The bound
    # is what the label can draw (measured against the 520 px panel), so it
    # moves when the panel does.
    assert len(cut) == iw.RIBBON_LINE_CHARS
    # The cut is marked, so a clipped caption reads as clipped rather than as
    # a sentence that just stops.  The unclipped text goes to the companion
    # window instead -- test_the_step_reaches_every_surface below.
    assert cut.endswith('…')


def test_status_reports_the_step(iw):
    iw._indicator_window.step_text = 'typing the address'
    assert iw.get_status()['step'] == 'typing the address'


def test_the_run_end_clears_the_line_and_rearms_the_first_open():
    """hide() (run end) forgets the last caption and lets the next run's
    first caption open the panel again; within a run only the FIRST caption
    opens it, so a collapse by the owner stands (the loop sends a captioned
    show before every action)."""
    mod = pytest.importorskip('desktop.indicator_window')
    ribbon = object.__new__(mod.RibbonIndicator)
    ribbon.ribbon_window = None
    ribbon.panel_window = None
    ribbon.step_label = None
    ribbon.expanded = False
    ribbon.is_animating = False
    ribbon.animation_cancelled = False
    ribbon.step_text = ''
    ribbon.step_opened_panel = False
    opened = []
    ribbon.expand_panel = lambda: opened.append(ribbon.step_text)

    ribbon.step_text = 'first'
    ribbon._apply_step()
    ribbon.expanded = False            # the owner collapsed it
    ribbon.step_text = 'second'
    ribbon._apply_step()
    assert opened == ['first']
    ribbon.hide()
    assert ribbon.step_text == '' and ribbon.step_opened_panel is False
    ribbon.step_text = 'next run'
    ribbon._apply_step()
    assert opened == ['first', 'next run']


# app.py boots the desktop app on import (tests/test_api_focus_thread_safety
# .py), so its route handlers are checked at the source, as that file does.

def _route_handler(name):
    src = (Path(__file__).resolve().parent.parent / 'app.py').read_text(
        encoding='utf-8')
    return next(n for n in ast.walk(ast.parse(src))
                if isinstance(n, ast.FunctionDef) and n.name == name)


def test_source_guard_the_show_route_passes_the_text_through():
    """/indicator/show reads ?text= and forwards it as toggle_indicator's text
    keyword; an empty query forwards None so the last line stays."""
    fn = _route_handler('show_indicator_endpoint')
    calls = [n for n in ast.walk(fn) if isinstance(n, ast.Call)
             and getattr(n.func, 'attr', None) == 'toggle_indicator']
    assert calls, 'the show route no longer calls toggle_indicator'
    assert any(kw.arg == 'text' for kw in calls[0].keywords), (
        'the show route drops ?text= instead of passing it to toggle_indicator')
    reads = [n for n in ast.walk(fn) if isinstance(n, ast.Constant) and n.value == 'text']
    assert reads, 'the show route never reads the text query parameter'


def test_source_guard_indicator_routes_are_loopback_or_token_only():
    """The ribbon is what the owner reads to know what the AI is doing, and
    HARTOS on this machine is its only caller: a LAN peer must not write its
    own words onto it or pop it open (#52), and neither may a web page the
    owner visits, whose <img src="http://127.0.0.1:5000/indicator/show?text=
    ..."> also arrives from loopback.  show and hide (they change what the
    owner sees) carry routes.auth.require_local_or_token_csrf_safe, the
    cross-origin-refusing rule; status (a read) carries the plain rule."""
    expected = {
        'show_indicator_endpoint': '_local_or_token_csrf_safe',
        'hide_indicator_endpoint': '_local_or_token_csrf_safe',
        'indicator_status_endpoint': '_local_or_token',
    }
    for name, rule in expected.items():
        fn = _route_handler(name)
        decorators = [getattr(d, 'id', None) for d in fn.decorator_list]
        assert rule in decorators, (
            f'{name} does not carry {rule}: reachable by a LAN peer or a web page')
