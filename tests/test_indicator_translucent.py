"""The AI-control ribbon's panel is translucent, and by the one mechanism that
is measured to work here.

Owner 2026-09-15: "the floatinf window shd have transparent glass like bg".
Blurred glass is not reachable for a tk window on this desktop (Windows 11
25H2): the legacy accent policy paints its tint solid and the Win11 system
backdrop flattens the panel, both measured by screen pixels; a colour-keyed
"glass" also made the panel click-through.  tk's -alpha is the mechanism the
pixels confirmed (a white window behind the panel reads 75/75/75 at 0.8), it
keeps full hit-testing, and it needs no Win32 call.
"""
import ast
from pathlib import Path

import pytest

RIBBON = Path(__file__).resolve().parent.parent / 'desktop' / 'indicator_window.py'


def test_the_panel_is_translucent_but_readable():
    mod = pytest.importorskip('desktop.indicator_window')
    assert 0.6 <= mod.PANEL_ALPHA <= 0.85, (
        'below 0.6 the white text loses contrast over a bright window; '
        'above 0.85 nothing of the desktop shows through')


def test_source_guard_every_panel_widget_shares_the_one_colour():
    """One colour for the panel's widgets (PANEL_BG): a widget painted
    another dark shade would show as a solid block against the rest."""
    src = RIBBON.read_text(encoding='utf-8')
    assert "bg='#1E1E1E'" not in src
    assert src.count('bg=PANEL_BG') >= 10


def test_source_guard_the_panel_uses_alpha_and_no_colour_key():
    """A colour key would make keyed pixels click-through (and gave no glass
    here anyway); the accent policy and the system backdrop paint solid.
    The panel sets -alpha PANEL_ALPHA and nothing else."""
    src = RIBBON.read_text(encoding='utf-8')
    tree = ast.parse(src)
    fn = next(n for n in ast.walk(tree)
              if isinstance(n, ast.FunctionDef) and n.name == 'create_panel')
    attrs = [n for n in ast.walk(fn) if isinstance(n, ast.Call)
             and getattr(n.func, 'attr', None) == 'attributes']
    keys = [c.args[0].value for c in attrs if c.args and isinstance(c.args[0], ast.Constant)]
    assert '-alpha' in keys
    assert '-transparentcolor' not in keys
    alpha = next(c for c in attrs if c.args and c.args[0].value == '-alpha')
    assert isinstance(alpha.args[1], ast.Name) and alpha.args[1].id == 'PANEL_ALPHA'
    # no Win32 compositing call in the CODE (the comment naming what was
    # measured is allowed): strip comments, then look
    code = ' '.join(line.split('#', 1)[0] for line in src.splitlines())
    assert 'SetWindowCompositionAttribute' not in code
    assert 'DWMWA_SYSTEMBACKDROP_TYPE' not in code
