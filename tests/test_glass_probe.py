"""The glass probe is validated against known signals before it judges code.

An instrument that has never been shown the positive case is not evidence.
GL1 exists because a compositor claim was believed from an API return code;
a probe believed from its own output would be the same mistake one level up.

So these feed the classifier synthetic captures whose true nature is known
by construction -- an opaque slab, a sharp alpha blend, a real blur -- and
require it to name each one. No screen, no GUI, no display needed, because
classify() was kept pure for exactly this.

    python -m pytest tests/test_glass_probe.py -q
"""
import math
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.glass_probe import (  # noqa: E402
    ALPHA, CONTRAST_BLURRED, CONTRAST_SHARP, GLASS, NO_SIGNAL, OPAQUE,
    PRESENCE_FLOOR, STRIPE_PX, UNCERTAIN, classify)

WIDTH = STRIPE_PX * 8
HEIGHT = 12

#: What a hard black/white stripe backdrop measures as on its own.
BACKDROP_AMPLITUDE = 255.0
BACKDROP_MEAN = 127.5


def stripes(amplitude, mean):
    """Rows carrying the backdrop's stripe pattern at a given amplitude."""
    rows = []
    for _ in range(HEIGHT):
        row = []
        for x in range(WIDTH):
            high = (x // STRIPE_PX) % 2 == 0
            row.append(mean + (amplitude / 2 if high else -amplitude / 2))
        rows.append(row)
    return rows


def flat(level):
    """Rows with no stripe signal at all."""
    return [[float(level)] * WIDTH for _ in range(HEIGHT)]


class TestItNamesEachKindCorrectly:
    def test_an_opaque_slab_is_opaque(self):
        """The window paints itself; the backdrop is gone. Presence near
        zero is the signature, whatever the contrast happens to be."""
        v = classify(flat(8), BACKDROP_AMPLITUDE, BACKDROP_MEAN)
        assert v.kind == OPAQUE
        assert not v.is_glass

    def test_a_sharp_blend_is_alpha_not_glass(self):
        """The case that matters most: a layered window at 80% looks
        see-through to a person and to a naive metric, but it is a MIRROR
        of the backdrop, edges intact. GL2 asks for blur, so this must not
        be allowed to pass as glass -- it is what the ribbon already
        ships."""
        v = classify(stripes(BACKDROP_AMPLITUDE * 0.8, BACKDROP_MEAN * 0.85),
                     BACKDROP_AMPLITUDE, BACKDROP_MEAN)
        assert v.kind == ALPHA
        assert not v.is_glass

    def test_real_blurred_glass_is_glass(self):
        """Presence kept, detail destroyed. Only a compositor blur does
        both at once, which is why the pair is the test."""
        v = classify(flat(BACKDROP_MEAN * 0.9), BACKDROP_AMPLITUDE,
                     BACKDROP_MEAN)
        assert v.kind == GLASS
        assert v.is_glass

    def test_a_clear_window_with_no_blur_is_alpha(self):
        """Nothing in front at all: full presence, full contrast. Clear is
        not glass."""
        v = classify(stripes(BACKDROP_AMPLITUDE, BACKDROP_MEAN),
                     BACKDROP_AMPLITUDE, BACKDROP_MEAN)
        assert v.kind == ALPHA


class TestItRefusesToGuess:
    def test_the_middle_ground_is_uncertain_not_rounded(self):
        """A partial blur is reported as what it is. Rounding it to GLASS
        would let a half-built backend claim the goal."""
        mid = (CONTRAST_SHARP + CONTRAST_BLURRED) / 2
        v = classify(stripes(BACKDROP_AMPLITUDE * mid, BACKDROP_MEAN * 0.9),
                     BACKDROP_AMPLITUDE, BACKDROP_MEAN)
        assert v.kind == UNCERTAIN
        assert not v.is_glass

    def test_an_empty_capture_is_no_signal(self):
        assert classify([], BACKDROP_AMPLITUDE, BACKDROP_MEAN).kind == NO_SIGNAL
        assert classify([[]], BACKDROP_AMPLITUDE, BACKDROP_MEAN).kind == NO_SIGNAL

    def test_a_backdrop_that_never_drew_is_no_signal(self):
        """If the stripe window failed to show, every later number is
        meaningless. Say so instead of dividing by it."""
        v = classify(flat(100), 0.0, BACKDROP_MEAN)
        assert v.kind == NO_SIGNAL
        assert not v.is_glass

    def test_no_kind_but_glass_ever_passes(self):
        for kind in (OPAQUE, ALPHA, UNCERTAIN, NO_SIGNAL):
            v = classify(flat(8), BACKDROP_AMPLITUDE, BACKDROP_MEAN)
            v.kind = kind
            assert v.is_glass is (kind == GLASS)


class TestOneBrightElementCannotFakeIt:
    def test_a_bright_run_across_a_few_rows_does_not_read_as_stripes(self):
        """A blurred surface with an icon or a text run crossing it has a
        few high-amplitude rows. Taking the MEDIAN row amplitude rather
        than the max keeps those from reading as surviving backdrop."""
        rows = flat(BACKDROP_MEAN * 0.9)
        for i in (0, 1, HEIGHT - 1):
            rows[i] = stripes(BACKDROP_AMPLITUDE, BACKDROP_MEAN)[0]
        v = classify(rows, BACKDROP_AMPLITUDE, BACKDROP_MEAN)
        assert v.kind == GLASS


class TestTheThresholdsAreOrdered:
    def test_blurred_is_below_sharp(self):
        """Inverting these would make every surface glass."""
        assert 0 < CONTRAST_BLURRED < CONTRAST_SHARP < 1

    def test_presence_floor_leaves_room_for_a_dark_tint(self):
        """Glass is usually tinted dark; the floor must not call a legibly
        tinted pane opaque."""
        assert 0 < PRESENCE_FLOOR < 0.5


class TestPresenceAndContrastAreIndependent:
    @pytest.mark.parametrize('presence_scale', [0.3, 0.6, 0.9])
    def test_a_blur_is_glass_at_any_tint_depth(self, presence_scale):
        """Darkening the tint must not flip the verdict: how much light
        passes and whether detail survives are different questions."""
        v = classify(flat(BACKDROP_MEAN * presence_scale),
                     BACKDROP_AMPLITUDE, BACKDROP_MEAN)
        assert v.kind == GLASS
        assert math.isclose(v.presence, presence_scale, rel_tol=0.02)
