"""Philosophy-B window chrome: pure hit-test refinement (`_classify_hit`).

Guards the 2026-06-24 native-frame-preserving rewrite of win32_chrome.py.
The window keeps its native frame, so DefWindowProc owns ALL resize
hit-testing; `_classify_hit` only *refines* a DefWindowProc result:

  * any non-HTCLIENT native hit (resize borders/corners) → passed through
    untouched (truly native — no hardcoded edge math),
  * HTCLIENT inside the titlebar strip is overridden:
      - maximize button (middle of min/max/close) → HTMAXBUTTON (Snap Layouts)
      - min/close + chip slot                     → HTCLIENT (React owns click)
      - the rest of the strip                     → HTCAPTION (native drag/snap)
  * HTCLIENT below the strip → HTCLIENT.

Pure logic — `native_hit` is passed in, no live HWND.  Runs on the Windows
dev/CI box where desktop.win32_chrome imports cleanly.
"""
import sys
import types

import pytest

# desktop.win32_chrome builds a ctypes.WINFUNCTYPE at import time, which exists
# only on Windows; importing it elsewhere is a COLLECTION error that aborts the
# whole pytest run (the ubuntu/macos CI legs, first run since 09-17).  Same
# module-level skip as tests/test_splash_ui.py; the Windows leg still runs it.
if sys.platform != 'win32':
    pytest.skip('Windows-only: desktop.win32_chrome needs ctypes.WINFUNCTYPE',
                allow_module_level=True)

from desktop import win32_chrome as wc  # noqa: E402


def _rc(left=0, top=0, right=1000, bottom=800):
    return types.SimpleNamespace(left=left, top=top, right=right, bottom=bottom)


# titlebar 32px; one window button 46px; right HTCLIENT zone (min/max/close
# cluster 138 + chip slot 260) = 398px.  With right=1000:
#   close=[954,1000)  max=[908,954)  min=[862,908)  chip-slot starts at 602.
_KW = dict(titlebar_h=32, button_w=46, right_client_w=398)


# ── native (non-client) hits pass through — DefWindowProc owns resize ──

def test_native_left_resize_passes_through():
    assert wc._classify_hit(2, 400, _rc(), wc.HTLEFT, **_KW) == wc.HTLEFT


def test_native_bottom_right_resize_passes_through():
    assert wc._classify_hit(998, 798, _rc(), wc.HTBOTTOMRIGHT, **_KW) == wc.HTBOTTOMRIGHT


def test_native_corner_wins_even_inside_titlebar():
    # Top-right corner is geometrically over the close button, but if Windows
    # says it's a resize corner, native resize MUST win (no override).
    assert wc._classify_hit(999, 1, _rc(), wc.HTTOPRIGHT, **_KW) == wc.HTTOPRIGHT


# ── HTCLIENT refinements inside the titlebar strip ──

def test_client_below_titlebar_stays_client():
    assert wc._classify_hit(500, 400, _rc(), wc.HTCLIENT, **_KW) == wc.HTCLIENT


def test_drag_strip_becomes_caption():
    assert wc._classify_hit(300, 16, _rc(), wc.HTCLIENT, **_KW) == wc.HTCAPTION


def test_maximize_button_becomes_htmaxbutton():
    # Middle of the cluster → Snap Layouts anchor.
    assert wc._classify_hit(930, 16, _rc(), wc.HTCLIENT, **_KW) == wc.HTMAXBUTTON


def test_close_button_zone_stays_client():
    assert wc._classify_hit(975, 16, _rc(), wc.HTCLIENT, **_KW) == wc.HTCLIENT


def test_min_button_zone_stays_client():
    assert wc._classify_hit(880, 16, _rc(), wc.HTCLIENT, **_KW) == wc.HTCLIENT


def test_chip_slot_stays_client():
    assert wc._classify_hit(650, 16, _rc(), wc.HTCLIENT, **_KW) == wc.HTCLIENT


def test_max_hover_getter_defaults_false():
    assert wc.get_max_button_hover(0xDEADBEEF) is False


# ── the module's ctypes bindings stay private to the module ──

def test_bindings_do_not_stamp_the_shared_user32():
    """Live 2026-09-15 14:43:42 (gui_app.log): "Error applying window
    positioning: argument 5: TypeError: 'NoneType' object cannot be
    interpreted as an integer".  pywebview's WinForms move() calls
    SetWindowPos(hwnd, None, x, y, None, None, flags) through
    ctypes.windll.user32 — the ONE function object ctypes caches per process.
    This module set argtypes (c_int for cx/cy) on that same object, so every
    pywebview move() in the process raised on its None size arguments; the
    default-dock snap path masked it until the snap's hwnd resolved to 0.
    The bindings belong on a WinDLL instance this module owns.
    """
    import ctypes
    import sys

    import pytest

    if sys.platform != 'win32':
        pytest.skip('user32 bindings exist only on Windows')
    assert wc.user32 is not ctypes.windll.user32
    assert ctypes.windll.user32.SetWindowPos.argtypes is None
    # The private handle still carries the typed signature the wndproc needs.
    assert wc.user32.GetWindowLongPtrW.restype is ctypes.c_ssize_t
