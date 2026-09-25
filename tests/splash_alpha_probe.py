"""splash_alpha_probe - prove, from SCREEN PIXELS, which PARTS of a window
let the desktop through (GL1 proof rule, GL4 in HOME_DESKTOP_DESIGN_CHECKLIST).

``glass_probe.probe`` measures a window as ONE surface: its margin ring is
taken to be bare backdrop, so it cannot be pointed at a patch INSIDE a window
(the ring would be the window, not the backdrop).  A per-pixel-alpha surface
is exactly the case where two patches of one window must read differently:
the splash's background must pass light and its artwork must not.

So this reuses glass_probe's own pieces unchanged -- its backdrops, its
z-ordering (``_place_below``), its capture, its greyscale rows, its stripe
amplitude and its ``classify`` -- and changes only WHERE the numbers are
read: the backdrop's own reading comes from the margin OUTSIDE the whole
window, and each named patch is read inside it.

    python tests/splash_alpha_probe.py --selftest
        builds a window from a KNOWN image (left half black at alpha 128,
        right half solid) through desktop.glass.apply_image_alpha and checks
        the instrument reads what the image says: left ALPHA near 0.5,
        right OPAQUE.
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import glass_probe as gp  # noqa: E402


def read_patches(window_rect, patches, hwnd):
    """Classify each named patch of a window from three backdrops.

    ``window_rect`` is the whole window (left, top, right, bottom) in screen
    pixels; ``patches`` maps a name to a rect in the same coordinates, inside
    the window.  Returns {name: glass_probe.Verdict}.
    """
    left, top, right, bottom = window_rect
    m = gp.MARGIN_PX
    wide = (left - m, top - m, right + m, bottom + m)

    def shot(kind):
        back = gp._backdrop(wide, kind)
        try:
            gp._place_below(back, hwnd)
            time.sleep(0.5)
            return gp._grey_rows(gp.capture(wide))
        finally:
            back.destroy()

    rows = {kind: shot(kind) for kind in ('black', 'white', 'stripes')}

    def ring(kind):
        r, _ = gp._ring_and_centre(rows[kind], m)
        return r

    def patch(kind, rect):
        pl, pt, pr, pb = rect
        x0, y0 = pl - wide[0], pt - wide[1]
        x1, y1 = pr - wide[0], pb - wide[1]
        return [r[x0:x1] for r in rows[kind][y0:y1]]

    out = {}
    for name, rect in patches.items():
        out[name] = gp.classify(
            gp._mean(patch('black', rect)), gp._mean(patch('white', rect)),
            gp._mean(ring('black')) or 0.0, gp._mean(ring('white')) or 0.0,
            gp._stripe_amplitude(patch('stripes', rect)),
            gp._stripe_amplitude(ring('stripes')) or 0.0)
    return out


def _selftest() -> int:
    import tkinter as tk
    from PIL import Image, ImageDraw
    from desktop import glass

    gp.ensure_dpi_aware()
    W, H, X, Y = 400, 240, 300, 300
    root = tk.Tk()
    root.withdraw()
    top = tk.Toplevel(root)
    top.overrideredirect(True)
    top.attributes('-topmost', True)
    top.geometry(f'{W}x{H}+{X}+{Y}')
    tk.Canvas(top, width=W, height=H, highlightthickness=0).pack()
    top.update()

    image = Image.new('RGBA', (W, H), (0, 0, 0, 128))
    ImageDraw.Draw(image).rectangle([W // 2, 0, W, H], fill=(230, 60, 90, 255))
    result = glass.apply_image_alpha(top, image)
    print('apply_image_alpha ->', result)
    top.update()

    import ctypes
    hwnd = ctypes.windll.user32.GetAncestor(top.winfo_id(), 2)
    pad = 20
    verdicts = read_patches(
        (X, Y, X + W, Y + H),
        {'clear_half': (X + pad, Y + pad, X + W // 2 - pad, Y + H - pad),
         'solid_half': (X + W // 2 + pad, Y + pad, X + W - pad, Y + H - pad)},
        hwnd)
    for name, v in verdicts.items():
        print(f'{name:11s} {v}')
    root.destroy()

    ok = (result.rung == glass.LAYERED_ALPHA
          and verdicts['clear_half'].kind == gp.ALPHA
          and abs(verdicts['clear_half'].transmittance - 0.5) <= 0.08
          and verdicts['solid_half'].kind == gp.OPAQUE)
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


def _load_splash_builder():
    """The REAL static-splash builder out of app.py, without booting app.py.

    Importing app.py runs the whole desktop boot (and would start a second
    Nunba beside a live one), so the three module-level definitions the
    builder needs are lifted out by AST and executed on their own: the same
    source that ships, nothing re-typed.
    """
    import ast
    import os
    app = Path(__file__).resolve().parent.parent / 'app.py'
    tree = ast.parse(app.read_text(encoding='utf-8'))
    wanted = {'_proportional_splash', '_open_static_splash',
              '_SPLASH_PAGE_RGB'}
    nodes = [n for n in tree.body
             if (isinstance(n, ast.FunctionDef) and n.name in wanted)
             or (isinstance(n, ast.Assign) and any(
                 getattr(t, 'id', None) in wanted for t in n.targets))]
    found = {getattr(n, 'name', None) or n.targets[0].id for n in nodes}
    assert found == wanted, f'app.py no longer defines {wanted - found}'
    ns = {'os': os, 'sys': sys}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(app), 'exec'),
         ns)
    return ns['_open_static_splash']


def _static() -> int:
    """GL4 proof on the shipping builder and the shipping splash.png."""
    import ctypes
    import tkinter as tk
    from PIL import Image

    gp.ensure_dpi_aware()
    build = _load_splash_builder()
    splash = Path(__file__).resolve().parent.parent / 'splash.png'
    root = tk.Tk()
    root.withdraw()
    top, _canvas, status, _keep = build(root, str(splash))
    for _ in range(10):
        root.update()
        time.sleep(0.05)
    hwnd = ctypes.windll.user32.GetAncestor(top.winfo_id(), 2)
    left, top_y = top.winfo_rootx(), top.winfo_rooty()
    w, h = top.winfo_width(), top.winfo_height()
    rect = (left, top_y, left + w, top_y + h)
    print('window', rect)

    # Expected transmittance per pixel is (1 - alpha) of the art as shown.
    art = Image.open(splash).convert('RGBA').resize((w, h), Image.LANCZOS)
    alpha = art.getchannel('A')

    def box_where(pred, bw=120, bh=60):
        for y in range(10, h - bh - 10, 10):
            for x in range(10, w - bw - 10, 10):
                lo, hi = alpha.crop((x, y, x + bw, y + bh)).getextrema()
                if pred(lo, hi):
                    return (left + x, top_y + y, left + x + bw, top_y + y + bh)
        return None

    background = box_where(lambda lo, hi: 150 <= lo and hi <= 166)
    print('background patch', background)
    verdicts = read_patches(rect, {'background': background}, hwnd)

    # Whole-window map: measured transmittance vs 1 - alpha, pixel by pixel.
    m = gp.MARGIN_PX
    wide = (rect[0] - m, rect[1] - m, rect[2] + m, rect[3] + m)
    shots = {}
    for kind in ('black', 'white'):
        back = gp._backdrop(wide, kind)
        try:
            gp._place_below(back, hwnd)
            for _ in range(8):
                root.update()
                time.sleep(0.05)
            shots[kind] = gp._grey_rows(gp.capture(wide))
        finally:
            back.destroy()
    swing = ((gp._mean(gp._ring_and_centre(shots['white'], m)[0]) or 0)
             - (gp._mean(gp._ring_and_centre(shots['black'], m)[0]) or 0))
    errors = []
    a = alpha.load()
    for yy in range(0, h, 4):
        for xx in range(0, w, 4):
            measured = (shots['white'][yy + m][xx + m]
                        - shots['black'][yy + m][xx + m]) / swing
            errors.append(abs(max(0.0, min(1.0, measured))
                              - (1 - a[xx, yy] / 255)))
    errors.sort()
    mae = sum(errors) / len(errors)
    p95 = errors[int(len(errors) * 0.95)]
    print(f"background  {verdicts['background']}")
    print(f'per-pixel |measured - (1-alpha)|: mean {mae:.3f}  p95 {p95:.3f}  '
          f'over {len(errors)} samples')
    status.set('Probe status line')
    root.update()
    root.destroy()

    bg = verdicts['background']
    ok = (bg.kind == gp.ALPHA and abs(bg.transmittance - (1 - 158 / 255)) <= 0.06
          and mae <= 0.05)
    print('STATIC', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


def _animated() -> int:
    """GL4 proof on the shipping ANIMATED splash (``_show_splash``).

    Lifted out of app.py the same way as the static builder, with the
    module-level names it reads supplied: a logger, ``_eroot = None`` (the
    dev path, where it makes its own root) and the helpers it calls.  The
    whole window should let the desktop through uniformly at
    1 - _ANIMATED_SPLASH_OPACITY, the rung glass.py gives a tk surface.
    """
    import ast
    import ctypes
    import logging
    import os
    import traceback
    app = Path(__file__).resolve().parent.parent / 'app.py'
    tree = ast.parse(app.read_text(encoding='utf-8'))
    wanted = {'_proportional_splash', '_show_splash', '_safe_tk_update',
              '_ANIMATED_SPLASH_OPACITY'}
    nodes = [n for n in tree.body
             if (isinstance(n, ast.FunctionDef) and n.name in wanted)
             or (isinstance(n, ast.Assign) and any(
                 getattr(t, 'id', None) in wanted for t in n.targets))]
    ns = {'os': os, 'sys': sys, 'traceback': traceback, '_eroot': None,
          '_startup_phase': None,
          'logger': logging.getLogger('splash_alpha_probe')}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(app), 'exec'),
         ns)
    expected = 1 - ns['_ANIMATED_SPLASH_OPACITY']

    gp.ensure_dpi_aware()
    root, _status, close = ns['_show_splash']()
    for _ in range(40):          # let the greeting animation get going
        root.update()
        time.sleep(0.05)
    hwnd = ctypes.windll.user32.GetAncestor(root.winfo_id(), 2)
    left, top_y = root.winfo_rootx(), root.winfo_rooty()
    w, h = root.winfo_width(), root.winfo_height()
    rect = (left, top_y, left + w, top_y + h)
    pad = 30
    verdicts = read_patches(rect, {
        'left_zone': (left + pad, top_y + pad, left + w // 3, top_y + h - pad),
        'right_zone': (left + 2 * w // 3, top_y + pad, left + w - pad,
                       top_y + h - pad)}, hwnd)
    for name, v in verdicts.items():
        print(f'{name:10s} {v}')
    close()
    ok = all(v.kind == gp.ALPHA and abs(v.transmittance - expected) <= 0.04
             for v in verdicts.values())
    print(f'expected transmittance {expected:.3f}')
    print('ANIMATED', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--static', action='store_true',
                    help='prove the shipping static splash (GL4)')
    ap.add_argument('--animated', action='store_true',
                    help='prove the shipping animated splash (GL4)')
    ns = ap.parse_args()
    sys.exit(_selftest() if ns.selftest else _static() if ns.static
             else _animated() if ns.animated else 2)
