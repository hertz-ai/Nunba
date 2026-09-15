"""The AI-control ribbon's panel is glass, not a solid slab.

Owner 2026-09-15: "the floating window should have a transparent glass-like
bg".  On Windows the panel's own colour (PANEL_BG) becomes the transparent
key and DWM paints a blurred, tinted acrylic behind it
(desktop.platform_utils.set_window_glass), so the timer, the step text and
Stop float on glass.  Where that is not available the panel keeps its solid,
slightly translucent look (-alpha 0.95), exactly as before.
"""
import types

import pytest


def _bare_ribbon(mod, glass_ok):
    ribbon = object.__new__(mod.RibbonIndicator)
    calls = []
    ribbon.panel_window = types.SimpleNamespace(
        update_idletasks=lambda: None,
        wm_frame=lambda: '0x1234',
        attributes=lambda *a: calls.append(a),
    )
    ribbon._glass_calls = calls
    return ribbon


def test_on_glass_the_panel_colour_is_the_transparent_key(monkeypatch):
    mod = pytest.importorskip('desktop.indicator_window')
    from desktop import platform_utils
    seen = {}
    monkeypatch.setattr(platform_utils, 'set_window_glass',
                        lambda hwnd, tint, opacity: seen.update(
                            hwnd=hwnd, tint=tint, opacity=opacity) or True)
    ribbon = _bare_ribbon(mod, True)
    ribbon._apply_glass()
    assert seen == {'hwnd': 0x1234, 'tint': mod.PANEL_BG, 'opacity': 0.6}
    assert ribbon._glass_calls == [('-transparentcolor', mod.PANEL_BG)]


def test_without_glass_the_panel_stays_solid_and_translucent(monkeypatch):
    mod = pytest.importorskip('desktop.indicator_window')
    from desktop import platform_utils
    monkeypatch.setattr(platform_utils, 'set_window_glass', lambda *a, **k: False)
    ribbon = _bare_ribbon(mod, False)
    ribbon._apply_glass()
    assert ribbon._glass_calls == [('-alpha', 0.95)]


def _ribbon_source():
    from pathlib import Path
    return (Path(__file__).resolve().parent.parent / 'desktop' / 'indicator_window.py'
            ).read_text(encoding='utf-8')


def test_every_passive_panel_widget_shares_the_key_colour():
    """One colour for the panel's frames and labels and the transparent key: a
    widget painted another dark shade would show as a solid block on the
    glass."""
    src = _ribbon_source()
    assert "bg='#1E1E1E'" not in src
    assert src.count('bg=PANEL_BG') >= 10


def test_no_clickable_control_is_painted_the_transparent_key():
    """A colour-keyed pixel is transparent to hit-testing as well as to the
    eye: a button painted PANEL_BG would pass clicks to the window behind
    the ribbon, while the AI is driving the machine.  Every tk.Button keeps
    a background that is not the key (CONTROL_BG, one step off it)."""
    import ast
    mod = pytest.importorskip('desktop.indicator_window')
    assert mod.CONTROL_BG != mod.PANEL_BG
    buttons = [n for n in ast.walk(ast.parse(_ribbon_source()))
               if isinstance(n, ast.Call) and getattr(n.func, 'attr', None) == 'Button']
    assert buttons, 'no tk.Button found; the ribbon layout changed'
    for call in buttons:
        bg = next((kw.value for kw in call.keywords if kw.arg == 'bg'), None)
        assert bg is not None, 'a button without an explicit bg would take the key'
        assert not (isinstance(bg, ast.Name) and bg.id == 'PANEL_BG'), (
            f'line {call.lineno}: a clickable control is painted the transparent key')


def _bare_open_ribbon(mod, pointer, rect=(100, 50, 520, 60)):
    """An expanded panel at ``rect`` (x, y, w, h) with the pointer at
    ``pointer``, no tk: the re-arm is observed on the instance."""
    ribbon = object.__new__(mod.RibbonIndicator)
    x, y, w, h = rect
    ribbon.panel_window = types.SimpleNamespace(
        winfo_pointerxy=lambda: pointer, winfo_rootx=lambda: x,
        winfo_rooty=lambda: y, winfo_width=lambda: w, winfo_height=lambda: h,
        winfo_exists=lambda: True)
    ribbon.expanded = True
    ribbon.step_opened_panel = True
    ribbon.step_label = None
    ribbon.step_text = ''
    ribbon.rearmed = 0
    ribbon.reset_auto_collapse_timer = lambda: setattr(ribbon, 'rearmed', ribbon.rearmed + 1)
    ribbon.expand_panel = lambda: None
    return ribbon


def test_a_pointer_resting_on_the_glass_keeps_the_panel_open(monkeypatch):
    """Keyed pixels get no hover events, so the auto-collapse is re-armed
    from the pointer's POSITION, not from <Enter>/<Motion>."""
    mod = pytest.importorskip('desktop.indicator_window')
    inside = _bare_open_ribbon(mod, pointer=(300, 80))
    assert inside._pointer_over_panel() is True
    outside = _bare_open_ribbon(mod, pointer=(300, 400))
    assert outside._pointer_over_panel() is False
    edge = _bare_open_ribbon(mod, pointer=(620, 80))   # x == right edge: outside
    assert edge._pointer_over_panel() is False


def test_a_new_step_keeps_the_panel_open():
    mod = pytest.importorskip('desktop.indicator_window')
    ribbon = _bare_open_ribbon(mod, pointer=(0, 0))
    ribbon.step_text = 'typing the address'
    ribbon._apply_step()
    assert ribbon.rearmed == 1
    ribbon.step_text = ''
    ribbon._apply_step()
    assert ribbon.rearmed == 1


def test_source_guard_the_timer_tick_asks_the_pointer_position():
    """update_timer, the one thing that runs every second while the panel
    is open, is where the position is asked; a hover binding alone would
    be dead on the glass."""
    src = _ribbon_source()
    start = src.index('    def update_timer(self):')
    body = src[start:src.index('\n    def ', start + 10)]
    assert '_pointer_over_panel()' in body and 'reset_auto_collapse_timer()' in body


def test_set_window_glass_is_a_no_op_off_windows(monkeypatch):
    from desktop import platform_utils
    monkeypatch.setattr(platform_utils, 'IS_WINDOWS', False)
    assert platform_utils.set_window_glass(0x1234) is False


@pytest.mark.skipif(not __import__('sys').platform.startswith('win'), reason='DWM only')
def test_set_window_glass_never_raises_on_a_bad_handle():
    from desktop import platform_utils
    assert platform_utils.set_window_glass(0) is False
    assert platform_utils.set_window_glass(0x7FFFFFFF) in (True, False)
