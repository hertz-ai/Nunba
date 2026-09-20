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

These tests pin the two halves of the fix:
  1. ``main_window_state_readable`` tells unreadable apart from backgrounded.
  2. app.py consults it at BOTH decision sites (presence handler + the 0.35s
     monitor) and treats unreadable as suppress.

(2) is an AST/source assertion rather than a live window: the presence handler
is a closure inside main(), built only while a real pywebview app is starting,
so there is nothing importable to call.  The assertion is still not vacuous --
it fails on the pre-fix source, which called is_main_window_foreground alone.
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


# ── 2. both decision sites consult it ──────────────────────────────

def _app_source():
    with open(os.path.join(_ROOT, 'app.py'), encoding='utf-8') as fh:
        return fh.read()


def test_the_presence_gate_is_not_the_bool_alone():
    """RED on the pre-fix source.

    Pre-fix, every companion suppression test read:

        if is_main_window_foreground(_window, _companion_window):

    with nothing else in the condition.  Post-fix each one is OR'd with
    `not main_window_state_readable(...)`.  Walking the AST for a BoolOp that
    contains BOTH calls is what separates the two -- a plain substring search
    for the new name would pass on a file that merely imported it.
    """
    tree = ast.parse(_app_source())

    def _calls(node):
        return {
            n.func.id
            for n in ast.walk(node)
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
        }

    guarded = [
        n for n in ast.walk(tree)
        if isinstance(n, ast.BoolOp)
        and 'is_main_window_foreground' in _calls(n)
        and 'main_window_state_readable' in _calls(n)
    ]
    assert len(guarded) >= 2, (
        'Expected BOTH companion decision sites (the on_companion_presence '
        'handler and the _companion_fg_monitor tick) to pair the foreground '
        'bool with the readability probe, so an unreadable main window '
        f'suppresses instead of showing. Found {len(guarded)} such condition(s).'
    )


def test_no_companion_site_still_tests_foreground_alone():
    """A half-migration is the trap this repo keeps hitting: one site fixed,
    the sibling left permissive.  Every call to is_main_window_foreground must
    sit inside a BoolOp that also calls the readability probe."""
    tree = ast.parse(_app_source())

    paired = set()
    for node in ast.walk(tree):
        if not isinstance(node, ast.BoolOp):
            continue
        names = {
            n.func.id
            for n in ast.walk(node)
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
        }
        if {'is_main_window_foreground', 'main_window_state_readable'} <= names:
            for n in ast.walk(node):
                if (isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
                        and n.func.id == 'is_main_window_foreground'):
                    paired.add((n.lineno, n.col_offset))

    everywhere = {
        (n.lineno, n.col_offset)
        for n in ast.walk(tree)
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
        and n.func.id == 'is_main_window_foreground'
    }
    unpaired = sorted(everywhere - paired)
    assert not unpaired, (
        'is_main_window_foreground is used WITHOUT the readability probe at '
        f'app.py lines {[ln for ln, _ in unpaired]} — that site still reads '
        '"cannot tell" as "not in foreground", i.e. shows the companion.'
    )


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
