"""The floating companion must not show when it cannot prove it should.

The owner's rule (2026-09-20): the floating window appears ONLY when an agent
needs to talk, or a ribbon indicator is up for a computer-use step.  Everything
else, including "I could not work out what the main window is doing", means
no window.

2026-11-10 the owner retired the operating-system question: the floating
window follows the main page's own report of focus and visibility, with no
0.35 s poll ("we shd know whether its getting rendered or not, not the
windows").  The fail-closed rule stays: until the page has said "not in
front", the companion stays hidden.  The decision itself lives in
desktop/main_page_presence.CompanionPresenceApplier and is tested there with
fake windows (tests/test_main_page_presence.py); the operating-system
foreground helpers it replaced are deleted (review of c8968c3b).

Section 2 holds source guards for app.py's wiring only (test_source_guard_*):
the handler and the page-load reset are closures inside main(), built only
while a real pywebview app starts.  They are never the only test of the
behaviour, which the applier's tests own.
"""
import ast
import os
import sys

import pytest

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)


# ── 2. app.py wires the windows to the applier ─────────────────────

def _app_source():
    with open(os.path.join(_ROOT, 'app.py'), encoding='utf-8') as fh:
        return fh.read()


def _function(tree, name):
    found = [n for n in ast.walk(tree)
             if isinstance(n, ast.FunctionDef) and n.name == name]
    assert len(found) == 1, f'{name} defined {len(found)} times in app.py'
    return found[0]


def test_source_guard_the_handler_asks_the_applier():
    """The companion page's request goes through the one applier, which
    decides under its lock (desktop/main_page_presence.py)."""
    src = _app_source()
    handler = ast.get_source_segment(
        src, _function(ast.parse(src), 'on_companion_presence'))
    assert '_companion_gate.request(state, shape)' in handler
    assert 'CompanionPresenceApplier(' in src


def test_source_guard_a_page_load_clears_the_report():
    """A report belongs to the page that sent it (review of c8968c3b)."""
    assert '_window.events.before_load += _main_page.reset' in _app_source()


def test_source_guard_no_site_asks_the_operating_system():
    """No foreground poll is left: the helpers are deleted, and no clock."""
    src = _app_source()
    assert 'is_main_window_foreground' not in src
    assert 'main_window_state_readable' not in src
    assert 'companion_fg_monitor' not in src
    import desktop.platform_utils as pu
    assert not hasattr(pu, 'is_main_window_foreground')
    assert not hasattr(pu, 'main_window_state_readable')


def test_source_guard_only_the_main_window_can_report():
    """The report is bound onto the main window's js_api; the companion's own
    api class has no such method."""
    src = _app_source()
    assert '_native_api.main_page_presence = (' in src
    cls = [n for n in ast.walk(ast.parse(src))
           if isinstance(n, ast.ClassDef) and n.name == 'CompanionAPI']
    assert len(cls) == 1
    methods = {n.name for n in cls[0].body if isinstance(n, ast.FunctionDef)}
    assert 'main_page_presence' not in methods


# ── 3. the window styles the owner asked for ───────────────────────

@pytest.mark.skipif(sys.platform != 'win32', reason='Win32 extended styles')
def test_floating_presence_sets_layered_and_noactivate(monkeypatch):
    """Translucent, and never steals focus.

    Measured 2026-09-20 on the running install: the companion carried
    exstyle 0x10088 (TOPMOST|TOOLWINDOW|CONTROLPARENT).  No WS_EX_LAYERED, so
    the DWM had no per-pixel alpha to composite and the card rendered opaque;
    no WS_EX_NOACTIVATE, so showing it took focus off whatever the owner was
    typing in.  Both bits must be set, without disturbing the ones already
    there.
    """
    from desktop import platform_utils

    WS_EX_LAYERED = 0x00080000
    WS_EX_NOACTIVATE = 0x08000000
    before = 0x00010088  # the exstyle actually measured on the live window
    written = {}

    class _User32:
        @staticmethod
        def GetWindowLongW(hwnd, idx):
            return before

        @staticmethod
        def SetWindowLongW(hwnd, idx, style):
            written['style'] = style
            return before

    class _Windll:
        user32 = _User32()

    monkeypatch.setattr(platform_utils, '_hwnd', lambda h: h)
    import ctypes
    monkeypatch.setattr(ctypes, 'windll', _Windll(), raising=False)

    platform_utils.set_window_floating_presence(1234, True)

    style = written.get('style')
    assert style is not None, 'the style was never written'
    assert style & WS_EX_LAYERED, 'WS_EX_LAYERED missing — backdrop stays opaque'
    assert style & WS_EX_NOACTIVATE, 'WS_EX_NOACTIVATE missing — it will steal focus'
    # Nothing already on the window may be dropped.
    assert style & before == before, 'an existing extended style was cleared'
