"""desktop/glass.py apply_image_alpha - the per-pixel alpha rung (GL4).

The rung is PROVEN in pixels by ``tests/splash_alpha_probe.py --selftest``
(2026-09-25, Windows 11 25H2: a half at alpha 128 measured transmittance
0.498, a solid half 0.000).  These pin the contract that proof rests on, with
only the OS boundary mocked: the bytes handed to the OS, the one writer of
WS_EX_LAYERED, never a uniform alpha or a colour key, every GDI object given
back, and never a rung that did not take.

    python -m pytest tests/test_glass_image_alpha.py -q
"""
import ctypes
import logging
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from PIL import Image

from desktop import glass, platform_utils

WS_EX_LAYERED = 0x00080000
ULW_ALPHA = 0x00000002
_DESKTOP = Path(__file__).resolve().parent.parent / 'desktop'


class FakeTk:
    """A tk window, as far as the module looks at one."""

    def attributes(self, *a):
        return None

    def winfo_id(self):
        return 4242


@pytest.fixture(autouse=True)
def fresh_rungs():
    glass._PER_PIXEL_RUNGS.clear()
    yield
    glass._PER_PIXEL_RUNGS.clear()


def fake_gdi(style=WS_EX_LAYERED, ulw_ok=True):
    """user32 + gdi32 whose CreateDIBSection hands back a real buffer, so the
    bytes the module writes into the DIB can be read back and checked."""
    user32, gdi32 = MagicMock(), MagicMock()
    user32.GetAncestor.return_value = 777
    user32.GetWindowLongW.return_value = style
    user32.GetDC.return_value = 11
    user32.UpdateLayeredWindow.return_value = 1 if ulw_ok else 0
    gdi32.CreateCompatibleDC.return_value = 22
    gdi32.SelectObject.return_value = 44
    state = {}

    def dib(dc, header, usage, ppbits, section, offset):
        hdr = header._obj
        size = hdr.biWidth * abs(hdr.biHeight) * 4
        state['buffer'] = ctypes.create_string_buffer(size)
        state['header'] = (hdr.biWidth, hdr.biHeight, hdr.biBitCount)
        ppbits._obj.value = ctypes.addressof(state['buffer'])
        return 33
    gdi32.CreateDIBSection.side_effect = dib
    return user32, gdi32, state


def on_windows():
    return patch.multiple(platform_utils, IS_WINDOWS=True, IS_MACOS=False,
                          IS_LINUX=False)


def run(image, gdi, presence=None):
    user32, gdi32, _ = gdi
    presence = presence or MagicMock()
    with on_windows(), patch.object(glass, '_gdi', return_value=(user32, gdi32)), \
            patch.object(platform_utils, 'set_window_floating_presence', presence):
        return glass.apply_image_alpha(FakeTk(), image)


class TestPremultipliedBgra:
    def test_channels_are_reordered_and_scaled_by_alpha(self):
        img = Image.new('RGBA', (3, 1))
        img.putdata([(255, 0, 0, 128), (10, 20, 30, 255), (200, 100, 50, 0)])
        assert glass.premultiplied_bgra(img) == bytes([
            0, 0, 128, 128,      # red at half alpha: R*a/255 = 128
            30, 20, 10, 255,     # opaque: unchanged, BGRA order
            0, 0, 0, 0,          # fully clear: no colour survives
        ])

    def test_an_rgb_image_is_treated_as_opaque(self):
        img = Image.new('RGB', (1, 1), (1, 2, 3))
        assert glass.premultiplied_bgra(img) == bytes([3, 2, 1, 255])


class TestWindowsPerPixelRung:
    def test_the_callers_pixels_reach_the_os_premultiplied_top_down(self):
        img = Image.new('RGBA', (2, 2), (255, 0, 0, 128))
        gdi = fake_gdi()
        result = run(img, gdi)

        assert result.rung == glass.LAYERED_ALPHA
        assert result.steps == ('per_pixel_alpha',)
        state = gdi[2]
        assert state['header'] == (2, -2, 32)     # negative height: top-down
        assert state['buffer'].raw == glass.premultiplied_bgra(img)

    def test_it_asks_for_per_pixel_alpha_not_a_uniform_one_or_a_key(self):
        gdi = fake_gdi()
        run(Image.new('RGBA', (1, 1)), gdi)
        user32 = gdi[0]
        args = user32.UpdateLayeredWindow.call_args.args
        blend = args[7]._obj
        assert args[8] == ULW_ALPHA
        assert (blend.AlphaFormat, blend.SourceConstantAlpha) == (1, 255)
        assert args[6] == 0                        # no colour key
        user32.SetLayeredWindowAttributes.assert_not_called()

    def test_the_layered_bit_comes_from_the_one_writer(self):
        presence = MagicMock()
        run(Image.new('RGBA', (1, 1)), fake_gdi(), presence)
        presence.assert_called_once_with(777, True)

    def test_a_window_that_did_not_take_the_bit_is_solid(self, caplog):
        gdi = fake_gdi(style=0)
        with caplog.at_level(logging.WARNING, logger='NunbaGlass'):
            result = run(Image.new('RGBA', (1, 1)), gdi)
        assert result.rung == glass.SOLID
        gdi[0].UpdateLayeredWindow.assert_not_called()
        assert 'WS_EX_LAYERED' in caplog.text

    def test_a_refused_bitmap_is_solid_and_every_gdi_object_is_given_back(
            self, caplog):
        gdi = fake_gdi(ulw_ok=False)
        with caplog.at_level(logging.WARNING, logger='NunbaGlass'):
            result = run(Image.new('RGBA', (1, 1)), gdi)
        user32, gdi32, _ = gdi
        assert result.rung == glass.SOLID
        assert 'refused' in caplog.text
        gdi32.DeleteObject.assert_called_once()
        gdi32.DeleteDC.assert_called_once()
        user32.ReleaseDC.assert_called_once()
        # the original bitmap is selected back before the DC is deleted
        assert gdi32.SelectObject.call_count == 2

    def test_success_also_gives_every_gdi_object_back(self):
        gdi = fake_gdi()
        run(Image.new('RGBA', (1, 1)), gdi)
        gdi[1].DeleteObject.assert_called_once()
        gdi[1].DeleteDC.assert_called_once()
        gdi[0].ReleaseDC.assert_called_once()

    def test_no_top_level_handle_touches_nothing(self):
        gdi = fake_gdi()
        gdi[0].GetAncestor.return_value = 0
        presence = MagicMock()
        result = run(Image.new('RGBA', (1, 1)), gdi, presence)
        assert result.rung == glass.SOLID
        presence.assert_not_called()
        gdi[0].UpdateLayeredWindow.assert_not_called()


class TestOtherSurfacesAndPlatforms:
    def test_a_non_tk_surface_is_solid(self):
        assert glass.apply_image_alpha(1234, Image.new('RGBA', (1, 1))).rung \
            == glass.SOLID

    @pytest.mark.parametrize('flags', [
        {'IS_WINDOWS': False, 'IS_MACOS': True, 'IS_LINUX': False},
        {'IS_WINDOWS': False, 'IS_MACOS': False, 'IS_LINUX': True}])
    def test_unbuilt_platforms_are_an_honest_seam(self, flags):
        with patch.multiple(platform_utils, **flags), \
                patch.object(glass, '_gdi') as gdi:
            result = glass.apply_image_alpha(FakeTk(), Image.new('RGBA', (1, 1)))
        assert result.rung == glass.SOLID
        assert 'not built on this platform' in result.note
        gdi.assert_not_called()


class TestFramesDoNotFloodTheLog:
    def test_one_line_per_rung_change_not_per_frame(self, caplog):
        gdi = fake_gdi()
        with caplog.at_level(logging.INFO, logger='NunbaGlass'):
            for _ in range(5):
                run(Image.new('RGBA', (1, 1)), gdi)
        assert caplog.text.count('per_pixel_alpha') == 1


class TestOneHome:
    def test_source_guard_update_layered_window_lives_in_glass_only(self):
        owners = sorted(p.name for p in _DESKTOP.glob('*.py')
                        if 'UpdateLayeredWindow' in p.read_text(encoding='utf-8'))
        assert owners == ['glass.py'], (
            f'a second per-pixel alpha applier appeared in {owners}')
