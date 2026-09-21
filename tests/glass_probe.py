"""glass_probe — decide, from SCREEN PIXELS, what a floating window really is.

GL1 in HOME_DESKTOP_DESIGN_CHECKLIST.md was written after an attempt took an
API's success return as proof of glass; it shipped (Nunba eedbb6c9) and was
reverted (c003e069) once someone looked at the screen.  The rule it left
behind is binding:

    a compositor claim is proven by screen pixels over a bright backdrop,
    never by an API return code.

GL2 then raised the bar: the glass must be drawn by the platform's GPU
compositor.  That demands a probe which can tell apart three things an API
return code cannot:

    OPAQUE    the window paints its own colour; what is behind is gone.
    ALPHA     the window blends what is behind, but SHARPLY -- a layered
              window at 80% is still a mirror of the backdrop, edges and
              all.  This is what the AI-control ribbon ships today.
    GLASS     the window blends what is behind and BLURS it -- the backdrop
              is present but its detail is gone.

HOW IT DECIDES
--------------
Two quantities, from three captures of the same region with three different
backdrops behind the same surface:

    transmittance   black backdrop vs white backdrop.  How much the surface
                    CHANGES when what is behind it changes.  0 means opaque.
                    Measured as a DIFFERENCE, never as absolute brightness,
                    because a dark opaque panel is dark -- not see-through.
                    (The first version divided brightness by the backdrop's
                    and duly called a #1E1E1E slab 23% transparent.)

    detail          stripe backdrop.  The surviving stripe amplitude as a
                    fraction of the stripes' own.  Stripes are pure
                    high-frequency signal: a blur destroys them and nothing
                    else does.

The discriminator is the RATIO of the two.  A plain blend passes light and
detail in the same proportion, so detail/transmittance is near 1.  A blur
passes the light and keeps none of the detail, so the ratio collapses.  That
gap is the signature no API return can fake, and it needs no absolute
threshold on either quantity alone.

    OPAQUE  transmittance < TRANSMITTANCE_FLOOR
    ALPHA   detail_retention >= RETENTION_SHARP
    GLASS   detail_retention <= RETENTION_BLURRED

Anything between the two retention thresholds is reported UNCERTAIN rather
than rounded to the answer the caller wanted.

USE
---
    python tests/glass_probe.py --region 100,100,320,410 [--hwnd 12345]

with the surface under test already on screen at that rectangle.  --hwnd is
needed for a surface this probe did not create, so it can be raised back
above the backdrops.  Returns exit code 0 for GLASS, 1 for anything else,
so a build step can gate on it.  --save keeps the captured pixels.

This module measures only.  It never creates, styles or touches the window
under test, so it cannot flatter an implementation by accident.
"""
from __future__ import annotations

import argparse
import statistics
import sys
from dataclasses import dataclass
from typing import List, Optional, Sequence, Tuple

#: Below this, changing what is behind the surface changes nothing: opaque.
TRANSMITTANCE_FLOOR = 0.05

#: At or above this, detail came through in proportion to the light -- a
#: blend, not a blur.
RETENTION_SHARP = 0.50

#: At or below this, the light came through and the detail did not.
RETENTION_BLURRED = 0.25

#: Stripe period in PHYSICAL pixels.  Wide enough to survive display
#: scaling, narrow enough that a real compositor blur radius erases it.
STRIPE_PX = 8

OPAQUE, ALPHA, GLASS, UNCERTAIN, NO_SIGNAL = (
    'OPAQUE', 'ALPHA', 'GLASS', 'UNCERTAIN', 'NO_SIGNAL')


@dataclass
class Verdict:
    """What the pixels say, and the numbers that say it."""
    kind: str
    transmittance: float
    detail: float
    note: str = ''

    @property
    def detail_retention(self) -> float:
        if self.transmittance <= 0:
            return 0.0
        return self.detail / self.transmittance

    @property
    def is_glass(self) -> bool:
        return self.kind == GLASS

    def __str__(self) -> str:
        return (f'{self.kind}  transmittance={self.transmittance:.3f} '
                f'detail={self.detail:.3f} '
                f'retention={self.detail_retention:.3f}'
                + (f'  ({self.note})' if self.note else ''))


def classify(mean_over_black: Optional[float],
             mean_over_white: Optional[float],
             backdrop_black_mean: float,
             backdrop_white_mean: float,
             stripe_amplitude_seen: Optional[float],
             backdrop_stripe_amplitude: float) -> Verdict:
    """The decision, separated from every bit of screen and GUI plumbing.

    Pure: takes six numbers, returns the verdict.  Kept pure so the
    thresholds can be tested without a display, which is also what lets the
    guard run headless.
    """
    backdrop_swing = backdrop_white_mean - backdrop_black_mean
    if backdrop_swing <= 0 or backdrop_stripe_amplitude <= 0:
        return Verdict(NO_SIGNAL, 0.0, 0.0,
                       'the backdrops did not draw; every later number '
                       'would be meaningless')
    if mean_over_black is None or mean_over_white is None:
        return Verdict(NO_SIGNAL, 0.0, 0.0, 'empty capture')

    transmittance = (mean_over_white - mean_over_black) / backdrop_swing
    transmittance = max(0.0, transmittance)

    if stripe_amplitude_seen is None:
        return Verdict(NO_SIGNAL, transmittance, 0.0, 'empty stripe capture')
    detail = stripe_amplitude_seen / backdrop_stripe_amplitude

    if transmittance < TRANSMITTANCE_FLOOR:
        return Verdict(OPAQUE, transmittance, detail,
                       'changing what is behind it changed nothing')

    retention = detail / transmittance
    if retention >= RETENTION_SHARP:
        return Verdict(ALPHA, transmittance, detail,
                       'detail came through in proportion to the light')
    if retention <= RETENTION_BLURRED:
        return Verdict(GLASS, transmittance, detail,
                       'light came through, detail did not')
    return Verdict(UNCERTAIN, transmittance, detail,
                   f'retention sits between {RETENTION_BLURRED} and '
                   f'{RETENTION_SHARP}; neither a blend nor a blur')


# ── screen plumbing ─────────────────────────────────────────────────────

_dpi_ready = False


def ensure_dpi_aware() -> bool:
    """Make this process speak the same pixels the screen does.

    MEASURED on a 150% display (LOGPIXELSX=144): without this, a window
    placed at logical (140,140) and a capture of physical (140,140) are
    different parts of the screen, because Windows virtualises coordinates
    for a DPI-unaware process.  The first run of this rig read the same
    region three times over for three different screen states.  With
    per-monitor awareness set, tk's geometry and ImageGrab's bbox agree to
    within two pixels over a 320x280 rectangle, which is the basis of every
    number above.

    Idempotent and best-effort: a platform without the call keeps working,
    and says so rather than going quiet.
    """
    global _dpi_ready
    if _dpi_ready or sys.platform != 'win32':
        return _dpi_ready
    try:
        import ctypes
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(2)  # per-monitor
        except Exception:
            ctypes.windll.user32.SetProcessDPIAware()       # older fallback
        _dpi_ready = True
    except Exception as e:
        print('glass_probe: could not set DPI awareness (%s); coordinates '
              'and captured pixels may disagree on a scaled display' % e,
              file=sys.stderr)
    return _dpi_ready


def _grey_rows(image) -> List[List[float]]:
    """Greyscale rows, as plain floats -- no numpy dependency."""
    px = image.convert('L').load()
    return [[float(px[x, y]) for x in range(image.width)]
            for y in range(image.height)]


def _mean(rows: Sequence[Sequence[float]]) -> Optional[float]:
    flat = [v for row in rows for v in row]
    return statistics.fmean(flat) if flat else None


def _stripe_amplitude(rows: Sequence[Sequence[float]]) -> Optional[float]:
    """Median row amplitude.

    MEDIAN, not max: a blurred surface with an icon or a text run crossing
    it has a few high-amplitude rows, and taking the max would let those
    read as surviving backdrop.
    """
    amps = [max(r) - min(r) for r in rows if len(r) >= STRIPE_PX * 2]
    return statistics.median(amps) if amps else None


def capture(region: Tuple[int, int, int, int], save: Optional[str] = None):
    """Grab the screen region.  Separated so classify() stays testable."""
    ensure_dpi_aware()
    from PIL import ImageGrab
    shot = ImageGrab.grab(bbox=region, all_screens=True)
    if save:
        shot.save(save)
    return shot


def _backdrop(region: Tuple[int, int, int, int], kind: str):
    """A backdrop window behind the region under test: black, white, stripes.

    TOPMOST, never lowered.  An earlier version called ``lower()``, which
    sent it behind the entire desktop, so every reading was of whatever
    happened to be on screen.  The surface under test is put back above it
    by ``raise_above_backdrop``.

    Uses a Toplevel when a tk root already exists: a second ``Tk()`` in one
    process is its own source of silent misbehaviour.
    """
    import tkinter as tk
    ensure_dpi_aware()
    left, top, right, bottom = region
    w, h = right - left, bottom - top
    win = tk.Toplevel() if tk._default_root is not None else tk.Tk()
    win.overrideredirect(True)
    win.geometry(f'{w}x{h}+{left}+{top}')
    win.attributes('-topmost', True)
    bg = 'black' if kind == 'black' else 'white'
    canvas = tk.Canvas(win, width=w, height=h, highlightthickness=0,
                       bg='black' if kind != 'white' else 'white')
    canvas.pack()
    if kind == 'stripes':
        for x in range(0, w, STRIPE_PX * 2):
            canvas.create_rectangle(x, 0, x + STRIPE_PX, h,
                                    fill='white', outline='')
    else:
        canvas.configure(bg=bg)
    win.update()
    return win


def raise_above_backdrop(hwnd: int) -> bool:
    """Put an EXISTING window back on top of the backdrop.

    Needed when probing a surface this module did not create -- the ribbon,
    the companion -- because the backdrop is topmost and would otherwise
    cover the very thing being measured.
    """
    ensure_dpi_aware()
    if sys.platform != 'win32' or not hwnd:
        return False
    try:
        import ctypes
        HWND_TOPMOST, SWP_NOMOVE, SWP_NOSIZE, SWP_NOACTIVATE = -1, 2, 1, 16
        return bool(ctypes.windll.user32.SetWindowPos(
            int(hwnd), HWND_TOPMOST, 0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE))
    except Exception as e:
        print('glass_probe: could not raise %s above the backdrop (%s)'
              % (hwnd, e), file=sys.stderr)
        return False


#: How far the backdrop extends beyond the surface on every side.  The ring
#: it leaves visible is the backdrop's own reading.
MARGIN_PX = 40


def _place_below(backdrop_win, hwnd: int) -> bool:
    """Put the backdrop DIRECTLY BELOW the surface under test.

    Both windows are topmost, so ordering them by raising one above the
    other is a fight: an earlier version raised the surface and measured
    transmittance 1.000 for an opaque panel, i.e. the surface was never in
    front at all.  ``SetWindowPos(backdrop, hWndInsertAfter=target)`` says
    exactly where the backdrop goes and is not a race.
    """
    ensure_dpi_aware()
    if sys.platform != 'win32' or not hwnd:
        return False
    try:
        import ctypes
        SWP_NOMOVE, SWP_NOSIZE, SWP_NOACTIVATE = 2, 1, 16
        back_hwnd = ctypes.windll.user32.GetAncestor(
            backdrop_win.winfo_id(), 2)  # GA_ROOT
        return bool(ctypes.windll.user32.SetWindowPos(
            back_hwnd, int(hwnd), 0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE))
    except Exception as e:
        print('glass_probe: could not place the backdrop below %s (%s)'
              % (hwnd, e), file=sys.stderr)
        return False


def _ring_and_centre(rows: List[List[float]], margin: int):
    """Split a capture into the backdrop's own ring and the surface's area.

    One capture, two readings.  This is what removes the timing and z-order
    guesswork: the backdrop is wider than the surface, so its untouched
    margin is visible in the SAME frame as the part behind the surface.
    """
    h, w = len(rows), len(rows[0]) if rows else 0
    if h <= margin * 2 or w <= margin * 2:
        return None, None
    ring = ([r[:] for r in rows[:margin]] +
            [r[:] for r in rows[h - margin:]] +
            [r[:margin] + r[w - margin:] for r in rows[margin:h - margin]])
    centre = [r[margin:w - margin] for r in rows[margin:h - margin]]
    return ring, centre


def _read(region, kind, hwnd, save=None):
    """One backdrop, one capture, both readings out of it."""
    import time
    left, top, right, bottom = region
    wide = (left - MARGIN_PX, top - MARGIN_PX,
            right + MARGIN_PX, bottom + MARGIN_PX)
    back = _backdrop(wide, kind)
    try:
        if hwnd:
            _place_below(back, hwnd)
        time.sleep(0.4)
        rows = _grey_rows(capture(wide, save))
        return _ring_and_centre(rows, MARGIN_PX)
    finally:
        back.destroy()


def probe(region: Tuple[int, int, int, int],
          save: Optional[str] = None,
          hwnd: Optional[int] = None) -> Verdict:
    """Measure the surface currently occupying `region`.

    Three backdrops, because transmittance needs a black/white pair and
    detail needs stripes.  Each backdrop is measured on its own as well as
    through the surface, so the numbers are relative to what this display
    actually showed rather than to an assumed 255/0 -- scaling, colour
    management and night-light all move them.
    """
    black_alone, black_through = _read(region, 'black', hwnd)
    white_alone, white_through = _read(region, 'white', hwnd)
    stripe_alone, stripe_through = _read(region, 'stripes', hwnd, save)

    return classify(
        _mean(black_through), _mean(white_through),
        _mean(black_alone) or 0.0, _mean(white_alone) or 0.0,
        _stripe_amplitude(stripe_through),
        _stripe_amplitude(stripe_alone) or 0.0)


def main(argv: Optional[Sequence[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--region', required=True,
                    help='left,top,right,bottom in screen pixels')
    ap.add_argument('--save', help='write the captured pixels here')
    ap.add_argument('--hwnd', type=int, default=None,
                    help='window to raise above the backdrop (needed for a '
                         'surface this probe did not create)')
    ns = ap.parse_args(argv)
    try:
        region = tuple(int(v) for v in ns.region.split(','))
        if len(region) != 4:
            raise ValueError
    except ValueError:
        print('--region needs four integers: left,top,right,bottom')
        return 2

    verdict = probe(region, ns.save, ns.hwnd)  # type: ignore[arg-type]
    print(verdict)
    return 0 if verdict.is_glass else 1


if __name__ == '__main__':
    sys.exit(main())
