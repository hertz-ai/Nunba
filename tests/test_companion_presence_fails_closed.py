"""The floating companion must not show when it cannot prove it should.

The owner's rule (2026-09-20): the floating window appears ONLY when an agent
needs to talk, or a ribbon indicator is up for a computer-use step.  Everything
else -- including "I could not work out what the main window is doing" -- means
no window.

``is_main_window_foreground`` cannot express that third answer.  It returns a
bool, so "could not read it" comes back as False, and False is the permissive
value for the companion: not-in-foreground means show.  During startup the two
windows are created back to back and ``win32_chrome.resolve_hwnd`` returns 0
until pywebview attaches the WinForms form ("the window's title is the last
resort, for a form that is not up yet" -- its own docstring), so there is a
real window in which the gate says show while Nunba owns the screen.  That is
the state the owner reported.

These tests pinned the two halves of that fix:
  1. ``main_window_state_readable`` tells unreadable apart from backgrounded.
  2. app.py consulted it at both decision sites.

2026-11-10 the owner retired the operating-system question: the floating
window follows the main page's own report of focus and visibility, on every
OS, with no 0.35 s poll ("are you a software developer or not"; "we shd know
whether its getting rendered or not, not the windows").  The fail-closed rule
stays: until the page has said "not in front", the companion stays hidden
(desktop/main_page_presence.py, tests/test_main_page_presence.py).  Section 2
now pins that app.py takes the page's answer and asks the OS nothing.

Section 2 is an AST/source assertion rather than a live window: the presence
handler is a closure inside main(), built only while a real pywebview app is
starting, so there is nothing importable to call.
"""
import ast
import os
import sys

import pytest

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)


# ── 1. the readability probe itself ────────────────────────────────

def test_a_none_handle_is_not_readable():
    from desktop.platform_utils import main_window_state_readable
    assert main_window_state_readable(None) is False


def test_a_zero_handle_is_not_readable():
    """0 is exactly what resolve_hwnd returns for a form that is not up."""
    from desktop.platform_utils import main_window_state_readable
    assert main_window_state_readable(0) is False


@pytest.mark.skipif(sys.platform != 'win32', reason='Win32 HWND semantics')
def test_a_window_whose_hwnd_cannot_be_resolved_is_not_readable(monkeypatch):
    """The startup race, reproduced: a pywebview Window whose native form does
    not exist yet.  resolve_hwnd returns 0; the probe must say unreadable, NOT
    fall through to some default that lets the companion show."""
    import desktop.win32_chrome as win32_chrome
    from desktop import platform_utils

    class _NotUpYet:
        """A pywebview Window before winforms sets .native."""
        native = None
        title = 'Nunba'

    monkeypatch.setattr(win32_chrome, 'resolve_hwnd', lambda w, title=None: 0)
    assert platform_utils.main_window_state_readable(_NotUpYet()) is False


@pytest.mark.skipif(sys.platform != 'win32', reason='Win32 HWND semantics')
def test_a_resolvable_live_hwnd_is_readable(monkeypatch):
    """The other side of the guard: once the form exists the probe must stop
    suppressing, or the companion could never show at all."""
    import ctypes

    import desktop.win32_chrome as win32_chrome
    from desktop import platform_utils

    # The desktop window is always a live HWND.
    real = ctypes.windll.user32.GetDesktopWindow()
    assert real, 'GetDesktopWindow returned 0 — cannot run this assertion'

    class _Up:
        native = object()
        title = 'Nunba'

    monkeypatch.setattr(win32_chrome, 'resolve_hwnd', lambda w, title=None: real)
    assert platform_utils.main_window_state_readable(_Up()) is True


# ── 2. app.py takes the main page's report, not the OS's ───────────

def _app_source():
    with open(os.path.join(_ROOT, 'app.py'), encoding='utf-8') as fh:
        return fh.read()


def _function(tree, name):
    found = [n for n in ast.walk(tree)
             if isinstance(n, ast.FunctionDef) and n.name == name]
    assert len(found) == 1, f'{name} defined {len(found)} times in app.py'
    return found[0]


def _source_of(node):
    return ast.get_source_segment(_app_source(), node)


def test_the_presence_gate_reads_the_main_pages_own_report():
    """Owner 2026-11-10: the floating window follows the main PAGE's report
    (focus, blur, visibility), not the operating system's foreground window.
    The handler's gate is the report's fail-closed answer: shown only after
    the page has said it is not in front (desktop/main_page_presence.py)."""
    handler = _source_of(_function(ast.parse(_app_source()),
                                   'on_companion_presence'))
    assert '_suppress = not _main_page.companion_may_show()' in handler


def test_no_companion_site_asks_the_operating_system():
    """Half a migration is the trap this repo keeps hitting: one site moved,
    the sibling left on the old answer.  No foreground or readability call is
    left in app.py, and no clock: the 0.35 s monitor thread is gone."""
    tree = ast.parse(_app_source())
    called = {
        n.func.id if isinstance(n.func, ast.Name) else getattr(n.func, 'attr', None)
        for n in ast.walk(tree) if isinstance(n, ast.Call)
    }
    assert 'is_main_window_foreground' not in called
    assert 'main_window_state_readable' not in called
    names = {n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)}
    assert '_companion_fg_monitor' not in names
    assert 'companion_fg_monitor' not in _app_source()


def test_a_main_page_report_reapplies_the_companions_last_request():
    """The owner alt-tabbing changes nothing on the COMPANION page, so the
    main page's change is what moves the window: hide when in front, else the
    companion page's last request again, through the handler and its gate."""
    tree = ast.parse(_app_source())
    listener = _source_of(_function(tree, '_on_main_page_presence'))
    assert '_companion_window.hide()' in listener
    assert '_companion_api.on_companion_presence(' in listener
    assert "_companion_desired['state']" in listener
    assert "_companion_desired['shape']" in listener
    assert '_main_page.on_change(_on_main_page_presence)' in _app_source()


def test_only_the_main_window_can_report():
    """The report is bound onto the main window's js_api; the companion's
    own api class has no such method, so the floating page cannot say the
    main page is in front or not."""
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
