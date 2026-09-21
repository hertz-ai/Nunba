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

The distinction is the whole point of GL2, so the probe is built around it.

HOW IT DECIDES
--------------
A backdrop of hard black/white stripes is drawn behind the region under
test.  Stripes are chosen because they are pure high-frequency signal: a
blur destroys them and nothing else does.

    presence  = how much of the backdrop's mean brightness survives.
                0 means opaque, 1 means a clear window.
    contrast  = the surviving stripe amplitude, as a fraction of the
                backdrop's own.  ALPHA keeps it (scaled by opacity).
                GLASS collapses it while KEEPING presence -- that gap is
                the signature no API return can fake.

    OPAQUE  presence < PRESENCE_FLOOR
    ALPHA   presence OK and contrast >= CONTRAST_SHARP
    GLASS   presence OK and contrast <= CONTRAST_BLURRED

Anything between the two contrast thresholds is reported UNCERTAIN rather
than rounded to the answer the caller wanted.

USE
---
    python tests/glass_probe.py --region 100,100,320,410

with the surface under test already on screen at that rectangle.  Returns
exit code 0 for GLASS, 1 for anything else, so a build step can gate on it.
Pass --save out.png to keep the captured pixels as evidence.

This module measures only.  It never creates, styles or touches the window
under test, so it cannot flatter an implementation by accident.
"""
from __future__ import annotations

import argparse
import statistics
import sys
from dataclasses import dataclass
from typing import List, Optional, Sequence, Tuple

#: Below this, the backdrop did not survive: the window is painting itself.
PRESENCE_FLOOR = 0.12

#: At or above this, the backdrop's edges came through intact -- a blend,
#: not a blur.
CONTRAST_SHARP = 0.35

#: At or below this, the backdrop is present but its detail is gone.
CONTRAST_BLURRED = 0.15

#: Stripe period in PHYSICAL pixels.  Wide enough to survive display
#: scaling, narrow enough that a real compositor blur radius erases it.
STRIPE_PX = 8

OPAQUE, ALPHA, GLASS, UNCERTAIN, NO_SIGNAL = (
    'OPAQUE', 'ALPHA', 'GLASS', 'UNCERTAIN', 'NO_SIGNAL')


@dataclass
class Verdict:
    """What the pixels say, and the numbers that say it."""
    kind: str
    presence: float
    contrast: float
    note: str = ''

    @property
    def is_glass(self) -> bool:
        return self.kind == GLASS

    def __str__(self) -> str:
        return (f'{self.kind}  presence={self.presence:.3f} '
                f'contrast={self.contrast:.3f}'
                + (f'  ({self.note})' if self.note else ''))


def classify(rows_under_test: Sequence[Sequence[float]],
             backdrop_amplitude: float,
             backdrop_mean: float) -> Verdict:
    """The decision, separated from every bit of screen and GUI plumbing.

    Pure: takes greyscale rows and the backdrop's own numbers, returns the
    verdict.  Kept pure so the thresholds can be tested without a display,
    which is also what lets this run in CI on a headless box.
    """
    if not rows_under_test or not rows_under_test[0]:
        return Verdict(NO_SIGNAL, 0.0, 0.0, 'empty capture')
    if backdrop_amplitude <= 0:
        return Verdict(NO_SIGNAL, 0.0, 0.0, 'backdrop had no stripe signal')

    # Presence: how much of the backdrop's brightness reaches the eye.
    observed_mean = statistics.fmean(
        v for row in rows_under_test for v in row)
    presence = observed_mean / backdrop_mean if backdrop_mean else 0.0

    # Contrast: the surviving stripe amplitude.  Measured per ROW and then
    # taken as the median, so one bright UI element crossing the region
    # (an icon, a text run) cannot masquerade as surviving stripes.
    amplitudes: List[float] = []
    for row in rows_under_test:
        if len(row) < STRIPE_PX * 2:
            continue
        lo, hi = min(row), max(row)
        amplitudes.append(hi - lo)
    if not amplitudes:
        return Verdict(NO_SIGNAL, presence, 0.0, 'region too narrow')
    contrast = statistics.median(amplitudes) / backdrop_amplitude

    if presence < PRESENCE_FLOOR:
        return Verdict(OPAQUE, presence, contrast,
                       'the backdrop did not survive')
    if contrast >= CONTRAST_SHARP:
        return Verdict(ALPHA, presence, contrast,
                       'backdrop came through with its edges intact')
    if contrast <= CONTRAST_BLURRED:
        return Verdict(GLASS, presence, contrast,
                       'backdrop present, detail gone')
    return Verdict(UNCERTAIN, presence, contrast,
                   f'contrast sits between {CONTRAST_BLURRED} and '
                   f'{CONTRAST_SHARP}; neither a blend nor a blur')


def _grey_rows(image, box: Tuple[int, int, int, int]) -> List[List[float]]:
    """Greyscale rows for a box, as plain floats -- no numpy dependency."""
    left, top, right, bottom = box
    px = image.convert('L').load()
    return [[float(px[x, y]) for x in range(left, right)]
            for y in range(top, bottom)]


def capture(region: Tuple[int, int, int, int], save: Optional[str] = None):
    """Grab the screen region.  Separated so classify() stays testable."""
    from PIL import ImageGrab
    shot = ImageGrab.grab(bbox=region, all_screens=True)
    if save:
        shot.save(save)
    return shot


def _stripe_backdrop(region: Tuple[int, int, int, int]):
    """A hard black/white stripe window behind the region under test.

    tkinter only: no extra dependency, and it is already how the ribbon
    draws.  Returns the window so the caller can destroy it.
    """
    import tkinter as tk
    left, top, right, bottom = region
    w, h = right - left, bottom - top
    win = tk.Tk()
    win.overrideredirect(True)
    win.geometry(f'{w}x{h}+{left}+{top}')
    win.lower()
    canvas = tk.Canvas(win, width=w, height=h, highlightthickness=0, bg='black')
    canvas.pack()
    for x in range(0, w, STRIPE_PX * 2):
        canvas.create_rectangle(x, 0, x + STRIPE_PX, h,
                                fill='white', outline='')
    win.update()
    return win


def probe(region: Tuple[int, int, int, int],
          save: Optional[str] = None) -> Verdict:
    """Measure the surface currently occupying `region`.

    The backdrop is drawn, measured on its own, then the region under the
    surface is measured.  Measuring the backdrop live rather than assuming
    255/0 is deliberate: display scaling, colour management and night-light
    all move the numbers, and a probe that assumed them would be reporting
    on a display it had not looked at.
    """
    backdrop = None
    try:
        backdrop = _stripe_backdrop(region)
        shot = capture(region, None)
        rows = _grey_rows(shot, (0, 0, shot.width, shot.height))
        amps = [max(r) - min(r) for r in rows if r]
        backdrop_amplitude = statistics.median(amps) if amps else 0.0
        backdrop_mean = statistics.fmean(v for r in rows for v in r) if rows else 0.0
    finally:
        if backdrop is not None:
            backdrop.destroy()

    shot = capture(region, save)
    rows = _grey_rows(shot, (0, 0, shot.width, shot.height))
    return classify(rows, backdrop_amplitude, backdrop_mean)


def main(argv: Optional[Sequence[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--region', required=True,
                    help='left,top,right,bottom in screen pixels')
    ap.add_argument('--save', help='write the captured pixels here')
    ns = ap.parse_args(argv)
    try:
        region = tuple(int(v) for v in ns.region.split(','))
        if len(region) != 4:
            raise ValueError
    except ValueError:
        print('--region needs four integers: left,top,right,bottom')
        return 2

    verdict = probe(region, ns.save)  # type: ignore[arg-type]
    print(verdict)
    return 0 if verdict.is_glass else 1


if __name__ == '__main__':
    sys.exit(main())
