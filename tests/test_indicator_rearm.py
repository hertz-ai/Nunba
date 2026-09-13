"""A show request while the AI-control ribbon is already up re-arms its
auto-hide clock.

The ribbon hides itself 15 s after control_start_time (auto_hide_after_timeout).
HARTOS's VLM loop asks for the ribbon once per iteration; a run longer than
15 s -- the 20:31 run on 2026-09-13 took 20-28 s per call -- would otherwise
lose its "AI is in control" ribbon half way through the run.
The ribbon's on-screen timer reads its own start_time, not control_start_time,
so re-arming does not reset what the user sees.
"""
import types

import pytest


@pytest.fixture
def iw(monkeypatch):
    mod = pytest.importorskip('desktop.indicator_window')
    shown = []
    stub = types.SimpleNamespace(show=lambda: shown.append('show'),
                                 hide=lambda: shown.append('hide'))
    monkeypatch.setattr(mod, '_indicator_window', stub)
    monkeypatch.setattr(mod, 'indicator_active', False)
    monkeypatch.setattr(mod, 'control_start_time', None)
    mod._shown = shown
    return mod


def test_a_repeat_show_rearms_the_auto_hide_clock(iw):
    iw.toggle_indicator(True)
    first = iw.control_start_time
    assert first is not None
    iw.control_start_time = first - 14.0  # 14 s of loop later
    iw.toggle_indicator(True)
    assert iw.control_start_time >= first, (
        "a show request while the ribbon was up did not re-arm the 15 s "
        "auto-hide, so a long VLM run loses its ribbon mid-run")


def test_a_repeat_show_does_not_redraw_the_ribbon(iw):
    iw.toggle_indicator(True)
    iw.toggle_indicator(True)
    assert iw._shown == ['show']


def test_hide_still_hides(iw):
    iw.toggle_indicator(True)
    iw.toggle_indicator(False)
    assert iw._shown == ['show', 'hide']
    assert iw.indicator_active is False


def test_app_indicator_routes_load_the_module_before_checking_it():
    """app.py's /indicator/show|hide|status read INDICATOR_AVAILABLE, which
    only app.py's lazy _load_indicator() sets -- and nothing called it.  On
    the running install (13-09 21:0x) GET /indicator/status answered
    {"error": "Indicator module not available"} while the ribbon itself had
    been created at 17:20:29 by main.py.  Every route that answers for the
    ribbon has to load the module it is about to report on."""
    import ast
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / 'app.py').read_text(
        encoding='utf-8')
    routes = {'show_indicator_endpoint', 'hide_indicator_endpoint',
              'indicator_status_endpoint'}
    found = set()
    for node in ast.walk(ast.parse(src)):
        if not (isinstance(node, ast.FunctionDef) and node.name in routes):
            continue
        found.add(node.name)
        calls = [n for n in ast.walk(node) if isinstance(n, ast.Call)
                 and getattr(n.func, 'id', None) == '_load_indicator']
        reads = [n for n in ast.walk(node) if isinstance(n, ast.Name)
                 and n.id == 'INDICATOR_AVAILABLE']
        assert calls, f'{node.name} never loads the indicator module'
        assert min(c.lineno for c in calls) < min(r.lineno for r in reads), (
            f'{node.name} checks INDICATOR_AVAILABLE before loading the module')
    assert found == routes, f'route handlers not found: {routes - found}'
