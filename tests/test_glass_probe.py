"""The glass probe is validated against known signals before it judges code.

An instrument that has never been shown the positive case is not evidence.
GL1 exists because a compositor claim was believed from an API return code;
a probe believed from its own output would be the same mistake one level up.

So these feed the classifier numbers whose true nature is known by
construction -- an opaque slab, a sharp alpha blend, a real blur -- and
require it to name each one. No screen, no GUI, no display needed, because
classify() was kept pure for exactly this.

Two defects this suite now pins, both found by running the rig against
surfaces of known nature rather than by reading it:

  1. presence-by-brightness called a #1E1E1E opaque panel 23% see-through,
     because a dark panel is dark. Transmittance is now measured as the
     CHANGE between a black and a white backdrop, which a surface's own
     colour cannot fake.
  2. the discriminator is the RATIO of detail to transmittance, so neither
     quantity needs an absolute threshold and a dim blur is still a blur.

    python -m pytest tests/test_glass_probe.py -q
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.glass_probe import (  # noqa: E402
    ALPHA,
    GLASS,
    NO_SIGNAL,
    OPAQUE,
    RETENTION_BLURRED,
    RETENTION_SHARP,
    STRIPE_PX,
    TRANSMITTANCE_FLOOR,
    UNCERTAIN,
    classify,
)

#: What the backdrops measure as on their own.
BLACK, WHITE, STRIPE_AMP = 0.0, 255.0, 255.0


def seen(transmittance, retention, own_tint=0.0):
    """The six numbers a surface of a given nature would produce.

    own_tint is the surface's OWN brightness, added to both the black and
    white readings. A correct transmittance is blind to it; the first
    version of this probe was not.
    """
    over_black = own_tint + BLACK * transmittance
    over_white = own_tint + WHITE * transmittance
    stripe_seen = STRIPE_AMP * transmittance * retention
    return (over_black, over_white, BLACK, WHITE, stripe_seen, STRIPE_AMP)


class TestItNamesEachKindCorrectly:
    def test_an_opaque_slab_is_opaque(self):
        """The window paints itself; changing what is behind it changes
        nothing."""
        v = classify(*seen(transmittance=0.0, retention=0.0, own_tint=30.0))
        assert v.kind == OPAQUE
        assert not v.is_glass

    def test_a_dark_opaque_panel_is_not_mistaken_for_glass(self):
        """THE regression. The ribbon's #1E1E1E panel is grey 30, which an
        absolute-brightness metric read as 23% of a mid-grey backdrop and
        called GLASS. It is a slab."""
        v = classify(*seen(transmittance=0.0, retention=0.0, own_tint=30.0))
        assert v.kind == OPAQUE, (
            'a dark panel is dark, not see-through; transmittance must be '
            'measured as the CHANGE between backdrops')

    def test_a_sharp_blend_is_alpha_not_glass(self):
        """The case that matters most: a layered window at 80% looks
        see-through to a person and to a naive metric, but it is a MIRROR
        of the backdrop, edges intact. GL2 asks for blur, so this must not
        pass as glass -- it is what the ribbon already ships."""
        v = classify(*seen(transmittance=0.2, retention=1.0, own_tint=24.0))
        assert v.kind == ALPHA
        assert not v.is_glass

    def test_real_blurred_glass_is_glass(self):
        """Light through, detail destroyed. Only a compositor blur does
        both at once, which is why the pair is the test."""
        v = classify(*seen(transmittance=0.5, retention=0.02, own_tint=20.0))
        assert v.kind == GLASS
        assert v.is_glass

    def test_a_clear_window_is_alpha_not_glass(self):
        """Nothing in front at all: full transmittance, full detail. Clear
        is not glass."""
        v = classify(*seen(transmittance=1.0, retention=1.0))
        assert v.kind == ALPHA


class TestItRefusesToGuess:
    def test_the_middle_ground_is_uncertain_not_rounded(self):
        """A partial blur is reported as what it is. Rounding it to GLASS
        would let a half-built backend claim the goal."""
        mid = (RETENTION_SHARP + RETENTION_BLURRED) / 2
        v = classify(*seen(transmittance=0.4, retention=mid))
        assert v.kind == UNCERTAIN
        assert not v.is_glass

    def test_a_backdrop_that_never_drew_is_no_signal(self):
        """If the backdrops failed to show, every later number is
        meaningless. Say so instead of dividing by them."""
        assert classify(10.0, 10.0, 50.0, 50.0, 1.0, 255.0).kind == NO_SIGNAL
        assert classify(10.0, 20.0, 0.0, 255.0, 1.0, 0.0).kind == NO_SIGNAL

    def test_an_empty_capture_is_no_signal(self):
        assert classify(None, 20.0, BLACK, WHITE, 1.0,
                        STRIPE_AMP).kind == NO_SIGNAL
        assert classify(10.0, 20.0, BLACK, WHITE, None,
                        STRIPE_AMP).kind == NO_SIGNAL

    def test_no_kind_but_glass_ever_passes(self):
        v = classify(*seen(transmittance=0.5, retention=0.02))
        for kind in (OPAQUE, ALPHA, UNCERTAIN, NO_SIGNAL, GLASS):
            v.kind = kind
            assert v.is_glass is (kind == GLASS)


class TestTransmittanceIsBlindToTheSurfacesOwnColour:
    @pytest.mark.parametrize('tint', [0.0, 30.0, 120.0, 200.0])
    def test_a_blur_reads_the_same_under_any_tint(self, tint):
        """Glass is usually tinted. How much light passes and how dark the
        pane is are different questions, and conflating them is what broke
        the first version."""
        v = classify(*seen(transmittance=0.5, retention=0.02, own_tint=tint))
        assert v.kind == GLASS
        assert v.transmittance == pytest.approx(0.5, abs=0.01)

    @pytest.mark.parametrize('tint', [0.0, 30.0, 200.0])
    def test_an_opaque_slab_reads_opaque_under_any_tint(self, tint):
        v = classify(*seen(transmittance=0.0, retention=0.0, own_tint=tint))
        assert v.kind == OPAQUE


class TestADimBlurIsStillABlur:
    @pytest.mark.parametrize('t', [0.08, 0.2, 0.6, 0.95])
    def test_glass_at_any_transmittance(self, t):
        """The ratio is the discriminator, so a heavily tinted pane that
        passes little light is still glass if it keeps no detail."""
        v = classify(*seen(transmittance=t, retention=0.05))
        assert v.kind == GLASS

    @pytest.mark.parametrize('t', [0.08, 0.2, 0.6, 0.95])
    def test_alpha_at_any_transmittance(self, t):
        v = classify(*seen(transmittance=t, retention=1.0))
        assert v.kind == ALPHA


class TestTheThresholdsAreOrdered:
    def test_blurred_is_below_sharp(self):
        """Inverting these would make every surface glass."""
        assert 0 < RETENTION_BLURRED < RETENTION_SHARP <= 1

    def test_the_transmittance_floor_is_small(self):
        """It only has to reject 'changed nothing', not judge tint depth."""
        assert 0 < TRANSMITTANCE_FLOOR < 0.2

    def test_the_stripe_period_survives_scaling(self):
        assert STRIPE_PX >= 4
