"""The animated splash shows even when startup outlives the early splash.

The frozen app opens a static splash on an early Tk root (_eroot) and arms
`_eroot.after(45000, _eroot.destroy)` so an orphaned splash clears itself.
_show_splash later reuses that root.  On a cold start the 45 s timer fires
first, and _show_splash called deiconify() on a destroyed root:

    [SPLASH] Failed: can't invoke "wm" command: application has been destroyed
      File "app.py", line 9851, in _show_splash
        root.deiconify()

Measured over every installed boot in the gui_app.log / startup_trace.log
pairs of 2026-10-21..22: all four failures came 48-72 s after process start,
all four successes 18-37 s after it.  The user saw no splash on exactly the
slow boots, where one matters most.

These run the REAL _live_tk_root from app.py against a real Tk.
"""
import ast
import os

import pytest

_APP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    'app.py')


def _app_source():
    with open(_APP, encoding='utf-8') as fh:
        return fh.read()


def _real_helper():
    tree = ast.parse(_app_source())
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name == '_live_tk_root':
            ns = {}
            exec(compile(ast.Module(body=[node], type_ignores=[]), _APP, 'exec'),
                 ns)
            return ns['_live_tk_root']
    raise AssertionError('app.py defines no _live_tk_root')


@pytest.fixture
def tk_root():
    tk = pytest.importorskip('tkinter')
    try:
        root = tk.Tk()
    except tk.TclError as e:  # headless CI runner
        pytest.skip(f'no display for Tk: {e}')
    root.withdraw()
    yield root
    try:
        root.destroy()
    except tk.TclError:
        pass


def test_a_live_root_is_reused(tk_root):
    assert _real_helper()(tk_root) is tk_root


def test_a_destroyed_root_is_not_reused(tk_root):
    """What the 45 s auto-destroy leaves behind on a cold start."""
    tk_root.destroy()
    assert _real_helper()(tk_root) is None


def test_no_early_root_means_none():
    assert _real_helper()(None) is None


def test_show_splash_asks_the_helper_before_reusing_the_early_root():
    src = _app_source()
    start = src.index('def _show_splash():')
    body = src[start:src.index('\nif __name__ == "__main__":', start)]
    assert '_live_tk_root(_eroot)' in body
    assert 'root = _eroot\n' not in body, (
        'reusing _eroot unchecked is the 45 s cold-start splash crash')
