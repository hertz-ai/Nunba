"""Prove the ruler on real screen pixels before it measures anyone's work.

``test_glass_probe.py`` validates the CLASSIFIER on synthetic numbers and
runs headless.  This drives the REAL ``probe()`` entry point against
surfaces whose nature is known by construction, and requires it to name
each:

    an opaque tk panel (#1E1E1E) -> OPAQUE
    the same at -alpha 0.8       -> ALPHA   (what the ribbon ships)

It needs a display, so it is NOT part of the pytest suite.  Run it by hand
whenever the probe changes, or on a machine whose scaling or compositor
differs, BEFORE trusting a verdict from it:

    python tests/glass_probe_selfcheck.py

Three real defects were caught by running this rather than reading the
probe, each of which would have silently produced confident nonsense:

  1. DPI.  On a 150% display an unaware process places a window at logical
     (140,140) while the capture reads physical (140,140) -- different
     parts of the screen.  The rig read the same region for three different
     states and scored an OPAQUE window ALPHA.
  2. LIFETIME.  The backdrop was destroyed before the reading that needed
     it, so the "surface over the backdrop" shot was the surface over the
     desktop.
  3. PHYSICS.  Presence measured as absolute brightness called a #1E1E1E
     slab 23% see-through, because a dark panel is dark.  Transmittance is
     now the CHANGE between a black and a white backdrop.

Expect two small windows near the top-left for a few seconds.
"""
import ctypes
import os
import sys
import time
import tkinter as tk

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.glass_probe import ALPHA, OPAQUE, ensure_dpi_aware, probe  # noqa: E402

REGION = (140, 140, 460, 420)

#: Taken from desktop/indicator_window.py so this checks the ribbon's real
#: look, not an invented one.  If those drift, this file should follow.
PANEL_BG = '#1E1E1E'
PANEL_ALPHA = 0.8


def _root_hwnd(widget) -> int:
    """The top-level HWND for a tk widget (winfo_id gives the child)."""
    GA_ROOT = 2
    return ctypes.windll.user32.GetAncestor(widget.winfo_id(), GA_ROOT)


def _surface(alpha=None):
    w = tk.Toplevel()
    w.overrideredirect(True)
    left, top, right, bottom = REGION
    w.geometry(f'{right - left:d}x{bottom - top:d}+{left:d}+{top:d}')
    w.configure(bg=PANEL_BG)
    w.attributes('-topmost', True)
    if alpha is not None:
        w.attributes('-alpha', alpha)
    w.update()
    time.sleep(0.4)
    return w


def run() -> int:
    ensure_dpi_aware()
    results = {}
    for label, alpha, expect in (('opaque', None, OPAQUE),
                                 ('alpha-0.8', PANEL_ALPHA, ALPHA)):
        s = _surface(alpha)
        try:
            v = probe(REGION, hwnd=_root_hwnd(s))
            ok = 'OK' if v.kind == expect else 'MISREAD'
            print(f'{label:<10s} expected {expect:<6s} -> {v}   [{ok}]')
            results[label] = (v.kind == expect)
        finally:
            s.destroy()
            time.sleep(0.2)

    print()
    if len(results) == 2 and all(results.values()):
        print('RIG VALIDATED END TO END on this display')
        return 0
    print('RIG CANNOT BE TRUSTED: it misread a surface of known nature')
    return 1


if __name__ == '__main__':
    root = tk.Tk()
    root.withdraw()
    code = run()
    root.destroy()
    sys.exit(code)
