"""Drift-guard: /api/focus must never touch pywebview's `on_top` off the UI thread.

Task #593.  Launching Nunba a second time makes the new process ping
/api/focus (single-instance guard in app.py) and exit.  The RUNNING instance
used to wedge permanently, with no error written anywhere.

py-spy on the hung process:

    set_on_top (webview/platforms/winforms.py)
    on_top     (webview/window.py)
    api_focus  (app.py)

plus two more /api/focus requests queued behind it.  MainThread was in its
ordinary ``create_window`` message-loop frame — byte-identical to a dump taken
from a HEALTHY process — so the UI thread was fine and "the message loop isn't
pumping" was the wrong diagnosis.

The actual cause: pywebview's WinForms backend implements ``on_top`` as a bare
``i.TopMost = on_top`` with NO Invoke marshalling.  Writing a WinForms property
from a Flask worker thread is an illegal cross-thread handle operation, and it
blocks forever instead of raising.

Win32 ``SetWindowPos`` is safe cross-thread, so the topmost nudge goes through
``desktop.platform_utils.set_window_always_on_top``.  These tests fail if
anyone reintroduces the unsafe write.

AST-only by design: importing app.py boots the desktop app.
"""
from __future__ import annotations

import ast
from pathlib import Path

import pytest

APP_PY = Path(__file__).resolve().parents[1] / "app.py"


def _find_function(tree: ast.AST, name: str) -> ast.FunctionDef:
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == name:
            return node
    raise AssertionError(f"{name}() not found in app.py — was it renamed?")


@pytest.fixture(scope="module")
def api_focus_fn() -> ast.FunctionDef:
    tree = ast.parse(APP_PY.read_text(encoding="utf-8"), filename=str(APP_PY))
    return _find_function(tree, "api_focus")


def test_api_focus_never_assigns_on_top(api_focus_fn):
    """`x.on_top = ...` anywhere under api_focus is the exact deadlock."""
    offenders = [
        node.lineno
        for node in ast.walk(api_focus_fn)
        if isinstance(node, ast.Assign)
        for target in node.targets
        if isinstance(target, ast.Attribute) and target.attr == "on_top"
    ]
    assert not offenders, (
        "api_focus assigns `.on_top` at app.py line(s) "
        f"{offenders}. pywebview maps that to a cross-thread WinForms "
        "TopMost write that blocks forever (task #593). Use "
        "desktop.platform_utils.set_window_always_on_top(hwnd, bool) instead."
    )


def test_api_focus_never_setattrs_on_top(api_focus_fn):
    """The original bug shipped the second write as setattr() in a lambda,
    which the attribute-assignment check above cannot see."""
    offenders = [
        node.lineno
        for node in ast.walk(api_focus_fn)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "setattr"
        and len(node.args) >= 2
        and isinstance(node.args[1], ast.Constant)
        and node.args[1].value == "on_top"
    ]
    assert not offenders, (
        "api_focus calls setattr(..., 'on_top', ...) at app.py line(s) "
        f"{offenders} — same cross-thread deadlock as a direct assignment "
        "(task #593)."
    )


def test_api_focus_uses_the_canonical_topmost_helper(api_focus_fn):
    """Positive assertion: the safe Win32 path is actually wired up.

    Without this, deleting the on_top nudge entirely would silently pass the
    two negative tests above while losing the bring-to-front behaviour.
    """
    src = ast.unparse(api_focus_fn)
    assert "set_window_always_on_top" in src, (
        "api_focus no longer calls set_window_always_on_top — the duplicate-"
        "instance ping would stop raising the window (task #593)."
    )


def test_api_focus_does_not_block_the_request_thread(api_focus_fn):
    """Window calls marshal to the UI thread; doing them inline ties up a
    Waitress worker for the duration.  They must run on a worker thread."""
    src = ast.unparse(api_focus_fn)
    assert "threading.Thread" in src, (
        "api_focus should hand the window work to a background thread so a "
        "blocking pywebview call degrades this endpoint instead of consuming "
        "Waitress workers (task #593)."
    )


def test_api_focus_coalesces_concurrent_requests(api_focus_fn):
    """Three stacked /api/focus requests turned one blocked call into a
    whole-app hang, so concurrent calls must coalesce, not queue."""
    src = ast.unparse(api_focus_fn)
    assert "acquire(blocking=False)" in src, (
        "api_focus should acquire its lock non-blocking and coalesce "
        "concurrent focus requests rather than stacking them (task #593)."
    )
