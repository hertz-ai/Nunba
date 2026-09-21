"""The AI-control ribbon's panel is translucent, and by the ONE mechanism
that is measured to work here -- asked for, not hand-rolled.

Owner 2026-09-15: "the floatinf window shd have transparent glass like bg".
Blurred glass is not reachable for a tk window on this desktop (Windows 11
25H2): the legacy accent policy paints its tint solid and the Win11 system
backdrop flattens the panel, both measured by screen pixels; a colour-keyed
"glass" also made the panel click-through.  tk's -alpha is the mechanism the
pixels confirmed (a white window behind the panel reads 75/75/75 at 0.8), it
keeps full hit-testing, and it needs no Win32 call.

WHAT CHANGED (and why these assertions moved rather than went away): the
panel used to write `-alpha` itself while the companion window asked the DWM
for a backdrop in app.py -- two mechanisms for one capability.  They are now
one module, `desktop/glass.py`, which asks each OS a single question (will it
let the desktop show through this window) and holds no look values at all.
So the shape this file pins is no longer "create_panel sets -alpha" but
"create_panel ASKS, and the glass module sets -alpha", with the panel's own
colour and alpha staying here -- the ribbon is the app's one floating
surface with no page to style it.  Dropping the assertion instead of moving
it would have left the ribbon's translucency unguarded at exactly the moment
it was rewired.
"""
import ast
from pathlib import Path

import pytest

_DESKTOP = Path(__file__).resolve().parent.parent / 'desktop'
RIBBON = _DESKTOP / 'indicator_window.py'
GLASS = _DESKTOP / 'glass.py'


def _function(path, name):
    """The AST of one top-level-or-nested function in a source file."""
    tree = ast.parse(path.read_text(encoding='utf-8'))
    return next(n for n in ast.walk(tree)
                if isinstance(n, ast.FunctionDef) and n.name == name)


def _attribute_calls(fn):
    """Every `<something>.attributes(...)` call inside a function."""
    return [n for n in ast.walk(fn) if isinstance(n, ast.Call)
            and getattr(n.func, 'attr', None) == 'attributes']


def _attribute_keys(fn):
    """The tk option names passed to `.attributes(...)` inside a function."""
    return [c.args[0].value for c in _attribute_calls(fn)
            if c.args and isinstance(c.args[0], ast.Constant)]


def test_the_panel_is_translucent_but_readable():
    mod = pytest.importorskip('desktop.indicator_window')
    assert 0.6 <= mod.PANEL_ALPHA <= 0.85, (
        'below 0.6 the white text loses contrast over a bright window; '
        'above 0.85 nothing of the desktop shows through')


def test_the_ribbon_owns_its_own_look_because_it_has_no_page():
    """The AI-control ribbon is the app's ONE floating surface with no page
    behind it, so its colour and its alpha live with it.  desktop/glass.py
    answers only whether the OS will let the desktop through and must hold
    no look values -- a look forked per platform is the bug."""
    ribbon = pytest.importorskip('desktop.indicator_window')
    glass = pytest.importorskip('desktop.glass')
    assert isinstance(ribbon.PANEL_ALPHA, float)
    assert ribbon.PANEL_BG.startswith('#')
    assert not hasattr(glass, 'FLOATING_OPACITY')
    assert not hasattr(glass, 'FLOATING_TINT')


def test_the_panel_asks_the_glass_module_and_gets_a_real_rung():
    """Behavioural: build a fake tk panel, hand it to the real code path the
    ribbon now uses, and assert what reached the window.

    create_panel itself cannot be called without a live Tk, so the assertion
    is on the collaboration it delegates to -- the same call with the same
    intent -- which is the part that was rewired.
    """
    glass = pytest.importorskip('desktop.glass')
    ribbon = pytest.importorskip('desktop.indicator_window')

    class _FakePanel:
        """A tk window that honours -alpha, as Windows/macOS tk does."""

        def __init__(self):
            self.opts = {}

        def attributes(self, name, *value):
            if value:
                self.opts[name] = value[0]
                return None
            return self.opts.get(name)

        def winfo_id(self):
            return 4242

    panel = _FakePanel()
    result = glass.apply_glass(
        panel, glass.GlassIntent(opacity=ribbon.PANEL_ALPHA))

    assert panel.opts['-alpha'] == ribbon.PANEL_ALPHA, (
        'the panel must actually end up translucent, not merely be asked')
    assert result.rung == glass.LAYERED_ALPHA
    assert result.backend == glass.TK
    assert result.sees_through
    # No colour key, ever: GL1 measured a keyed pixel is transparent to all
    # hit-testing, so a keyed "glass" makes the panel click-through.
    assert '-transparentcolor' not in panel.opts


def test_source_guard_every_panel_widget_shares_the_one_colour():
    """One colour for the panel's widgets (PANEL_BG): a widget painted
    another dark shade would show as a solid block against the rest."""
    src = RIBBON.read_text(encoding='utf-8')
    assert "bg='#1E1E1E'" not in src
    assert src.count('bg=PANEL_BG') >= 10


def test_source_guard_the_panel_asks_for_glass_and_sets_no_alpha_itself():
    """The canonical shape, pinned where a behavioural test cannot reach.

    `create_panel` needs a live Tk to run, so the ONE thing a behavioural
    test cannot prove is that create_panel is the function doing the asking.
    Everything else about the collaboration is proven above.
    """
    fn = _function(RIBBON, 'create_panel')

    called = {n.func.id for n in ast.walk(fn)
              if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)}
    assert 'apply_glass' in called, (
        'create_panel must ask desktop/glass.py for its translucency')

    keys = _attribute_keys(fn)
    assert '-alpha' not in keys, (
        'the -alpha call belongs to desktop/glass.py now; a second one here '
        'is the parallel path this rewiring removed')
    assert '-transparentcolor' not in keys, (
        'a colour key makes the panel click-through (GL1, measured)')

    # no Win32 compositing call in the CODE (the comment naming what was
    # measured is allowed): strip comments, then look
    code = ' '.join(line.split('#', 1)[0]
                    for line in RIBBON.read_text(encoding='utf-8').splitlines())
    assert 'SetWindowCompositionAttribute' not in code
    assert 'DWMWA_SYSTEMBACKDROP_TYPE' not in code


def test_source_guard_the_tk_alpha_call_lives_in_the_glass_module():
    """The other half of the move: the mechanism really is in glass.py.

    Without this, `create_panel` could satisfy the guard above by asking a
    module that does nothing.
    """
    fn = _function(GLASS, '_apply_tk')
    assert '-alpha' in _attribute_keys(fn), (
        "desktop/glass.py's tk backend must be the one writing -alpha")
