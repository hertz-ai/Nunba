"""desktop/glass.py - one module, one ladder, and never a rung it did not reach.

These import the real code and mock only the OS boundary (ctypes' Win32
libraries, a fake tk window, a fake pywebview Window), then assert what the
code actually DID: which Win32 call went out with which arguments, and which
rung came back.

The rung is the promise this module makes, so most of what is pinned here is
the promise being kept when it would be easier to break it -- the DWM saying
yes without glass appearing, a macOS window created without the one kwarg
that matters, a tk window that takes the call and ignores the value.

    python -m pytest tests/test_glass.py -q
"""
import ast
import ctypes
import logging
import re
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from desktop import glass, platform_utils

WS_EX_LAYERED = 0x00080000
WS_EX_NOREDIRECTIONBITMAP = 0x00200000
LWA_COLORKEY = 0x00000001
LWA_ALPHA = 0x00000002


@pytest.fixture(autouse=True)
def no_composition_hosts_left_over():
    """The module OWNS its composition hosts, so they outlive a call by
    design.  A test that built one must not hand it to the next."""
    glass._WINDOWS_HOSTS.clear()
    yield
    glass._WINDOWS_HOSTS.clear()

_DESKTOP = Path(__file__).resolve().parent.parent / 'desktop'

#: A caller's intent.  glass.GlassIntent has no default opacity on purpose:
#: how see-through a surface should be is the surface's own look decision,
#: and the module holds no look values at all.
INTENT = glass.GlassIntent(opacity=0.8)


# ── fakes for the OS boundary ──────────────────────────────────────────

class FakeTkWindow:
    """A tk window that honours -alpha, the way Windows and macOS tk do."""

    def __init__(self, honours=True):
        self.opts = {}
        self._honours = honours

    def attributes(self, name, *value):
        if value:
            if self._honours:
                self.opts[name] = value[0]
            return None
        return self.opts.get(name)

    def winfo_id(self):
        return 4242


class FakeWebviewWindow:
    """A pywebview Window, as far as this module looks at one."""

    def __init__(self, vibrancy=False, transparent=False):
        self.vibrancy = vibrancy
        self.transparent = transparent


def layered_user32(style=WS_EX_LAYERED, accepts=True):
    """A user32 whose window already carries WS_EX_LAYERED."""
    user32 = MagicMock()
    user32.GetWindowLongW.return_value = style
    user32.SetLayeredWindowAttributes.return_value = 1 if accepts else 0
    user32.GetLastError.return_value = 87  # ERROR_INVALID_PARAMETER
    return user32


def composable_user32(exstyle=WS_EX_NOREDIRECTIONBITMAP, child=0):
    """A window BORN able to show a composed page, and hosting nothing yet.

    The opposite of `layered_user32` in the one way that matters: it carries
    WS_EX_NOREDIRECTIONBITMAP, which is a creation style, and GetWindow says
    it has no child, so nothing is already hosted inside it.
    """
    user32 = MagicMock()
    user32.GetWindowLongW.return_value = exstyle
    user32.GetWindow.return_value = child
    user32.SetWindowCompositionAttribute.return_value = 1
    user32.SetLayeredWindowAttributes.return_value = 0
    user32.GetLastError.return_value = 0
    return user32


def fake_com():
    """Three non-null interface pointers, as DirectComposition hands back.

    Real `c_void_p`s, not mocks, because `_com_release` reads `.value` to
    decide whether there is anything to release -- the exact behaviour the
    leak tests are about.
    """
    return (ctypes.c_void_p(0x1000), ctypes.c_void_p(0x2000),
            ctypes.c_void_p(0x3000))


def accepting_dwm():
    dwm = MagicMock()
    dwm.DwmSetWindowAttribute.return_value = 0
    dwm.DwmExtendFrameIntoClientArea.return_value = 0
    return dwm


def on_windows():
    return patch.multiple(platform_utils, IS_WINDOWS=True, IS_MACOS=False,
                          IS_LINUX=False)


def on_macos():
    return patch.multiple(platform_utils, IS_WINDOWS=False, IS_MACOS=True,
                          IS_LINUX=False)


def on_linux():
    return patch.multiple(platform_utils, IS_WINDOWS=False, IS_MACOS=False,
                          IS_LINUX=True)


# ── the intent ─────────────────────────────────────────────────────────

class TestGlassIntent:
    def test_the_house_opacity_becomes_the_byte_win32_takes(self):
        assert glass.GlassIntent(opacity=0.8).alpha_byte == 204  # 0.8 * 255

    @pytest.mark.parametrize('opacity,expected', [
        (0.0, 0), (1.0, 255), (0.5, 128), (0.6, 153), (0.85, 217)])
    def test_the_whole_range_maps(self, opacity, expected):
        assert glass.GlassIntent(opacity=opacity).alpha_byte == expected

    @pytest.mark.parametrize('opacity,expected', [(1.5, 255), (-0.2, 0)])
    def test_an_out_of_range_opacity_is_clamped_not_wrapped(self, opacity,
                                                            expected):
        """A BYTE wraps silently.  1.5 becoming 127 would leave a surface
        half-visible while the caller believed it had asked for solid."""
        assert glass.GlassIntent(opacity=opacity).alpha_byte == expected

    def test_opacity_has_no_default_so_the_caller_must_decide(self):
        """The look belongs to the surface, never to this module.  A default
        here would be the module quietly owning how see-through every
        floating window in the app is."""
        with pytest.raises(TypeError):
            glass.GlassIntent()

    def test_the_only_other_knob_picks_between_the_os_s_own_materials(self):
        """`dark` is a boolean, not a colour: it selects which of the two
        materials Windows offers, it does not describe one."""
        assert glass.GlassIntent(opacity=0.8).dark is True
        assert glass.GlassIntent(opacity=0.8, dark=False).dark is False


# ── the result ─────────────────────────────────────────────────────────

class TestGlassResult:
    def test_only_native_glass_is_native(self):
        for rung in glass.LADDER:
            assert glass.GlassResult(rung, 'x').is_native is (
                rung == glass.NATIVE_GLASS)

    def test_solid_is_the_only_rung_nothing_shows_through(self):
        for rung in glass.LADDER:
            assert glass.GlassResult(rung, 'x').sees_through is (
                rung != glass.SOLID)

    def test_it_says_what_it_did_when_logged(self):
        text = str(glass.GlassResult(glass.LAYERED_ALPHA, 'windows',
                                     note='why', steps=('a', 'b')))
        assert 'LAYERED_ALPHA' in text and 'windows' in text
        assert 'a+b' in text and 'why' in text


# ── Windows ────────────────────────────────────────────────────────────

class TestWindowsBackend:
    def test_it_blends_the_window_and_says_layered_alpha(self):
        user32 = layered_user32()
        with on_windows(), patch('ctypes.windll.user32', user32), \
                patch('ctypes.windll.dwmapi', accepting_dwm()):
            result = glass.apply_glass(1234, INTENT)

        assert result.rung == glass.LAYERED_ALPHA
        assert result.backend == glass.WINDOWS
        assert 'layered_alpha' in result.steps

    def test_it_asks_win32_for_uniform_alpha_and_never_a_colour_key(self):
        """The exact call.  LWA_COLORKEY is the trap GL1 measured: a keyed
        pixel is transparent to ALL hit-testing, so a keyed "glass" makes the
        surface click-through -- right in a screenshot, unusable in life."""
        user32 = layered_user32()
        with on_windows(), patch('ctypes.windll.user32', user32), \
                patch('ctypes.windll.dwmapi', accepting_dwm()):
            glass.apply_glass(1234, glass.GlassIntent(opacity=0.8))

        args = user32.SetLayeredWindowAttributes.call_args[0]
        assert args[0].value == 1234, 'the handle, pointer-sized'
        assert args[1] == 0, 'no colour key'
        assert args[2] == 204, 'the opacity as a byte'
        assert args[3] == LWA_ALPHA
        assert not args[3] & LWA_COLORKEY, 'a colour key would be click-through'

    def test_the_callers_opacity_reaches_win32(self):
        user32 = layered_user32()
        with on_windows(), patch('ctypes.windll.user32', user32), \
                patch('ctypes.windll.dwmapi', accepting_dwm()):
            glass.apply_glass(1234, glass.GlassIntent(opacity=0.6))
        assert user32.SetLayeredWindowAttributes.call_args[0][2] == 153

    def test_it_never_writes_the_extended_style_itself(self):
        """ONE writer of WS_EX_LAYERED: platform_utils.
        set_window_floating_presence.  A second writer here is exactly the
        parallel path this module was built to remove."""
        user32 = layered_user32()
        with on_windows(), patch('ctypes.windll.user32', user32), \
                patch('ctypes.windll.dwmapi', accepting_dwm()):
            glass.apply_glass(1234, INTENT)
        user32.SetWindowLongW.assert_not_called()

    def test_without_ws_ex_layered_it_refuses_and_says_which_call_is_missing(
            self, caplog):
        """Fail honestly and usefully: the window genuinely is a slab, and
        the log names the call the caller skipped."""
        user32 = layered_user32(style=0x00010088)  # the measured pre-fix style
        with on_windows(), patch('ctypes.windll.user32', user32), \
                patch('ctypes.windll.dwmapi', accepting_dwm()), \
                caplog.at_level(logging.WARNING, logger='NunbaGlass'):
            result = glass.apply_glass(1234, INTENT)

        assert result.rung == glass.SOLID
        user32.SetLayeredWindowAttributes.assert_not_called()
        assert 'WS_EX_LAYERED' in caplog.text
        assert 'set_window_floating_presence' in caplog.text

    def test_a_refused_alpha_is_solid_not_a_quiet_success(self, caplog):
        user32 = layered_user32(accepts=False)
        with on_windows(), patch('ctypes.windll.user32', user32), \
                patch('ctypes.windll.dwmapi', accepting_dwm()), \
                caplog.at_level(logging.WARNING, logger='NunbaGlass'):
            result = glass.apply_glass(1234, INTENT)

        assert result.rung == glass.SOLID
        assert 'SetLayeredWindowAttributes refused' in caplog.text

    def test_a_window_that_is_not_up_yet_is_solid_and_touches_nothing(self):
        """0 is exactly what platform_utils._resolve_handle returns for a
        pywebview Window whose native form does not exist yet."""
        user32 = layered_user32()
        with on_windows(), patch('ctypes.windll.user32', user32), \
                patch('ctypes.windll.dwmapi', accepting_dwm()):
            result = glass.apply_glass(0, INTENT)

        assert result.rung == glass.SOLID
        user32.SetLayeredWindowAttributes.assert_not_called()
        assert 'not up yet' in result.note

    def test_a_window_that_cannot_be_composed_never_claims_native_glass(self):
        """The rung Windows reaches is now NATIVE_GLASS -- but only for a
        window BORN able to show a composed page.

        `layered_user32` is the window the app actually has: it already
        hosts a browser of its own and was created without
        WS_EX_NOREDIRECTIONBITMAP.  Neither can be fixed afterwards, so the
        honest answer for it is still the blend, and every OS call here is
        made to succeed so the backend is given every chance to over-claim.
        """
        with on_windows(), patch('ctypes.windll.user32', layered_user32()), \
                patch('ctypes.windll.dwmapi', accepting_dwm()):
            result = glass.apply_glass(1234, INTENT)

        assert not result.is_native
        assert result.rung == glass.LAYERED_ALPHA
        assert 'dcomp_visual' not in result.steps

    def test_the_callers_material_choice_reaches_the_dwm(self):
        """A surface that wants the light material must get it, or the OS
        renders a dark flyout behind a light page."""
        dwm = accepting_dwm()
        with on_windows(), patch('ctypes.windll.user32', layered_user32()), \
                patch('ctypes.windll.dwmapi', dwm):
            glass.apply_glass(1234,
                              glass.GlassIntent(opacity=0.8, dark=False))

        DWMWA_USE_IMMERSIVE_DARK_MODE = 20
        dark_calls = [c for c in dwm.DwmSetWindowAttribute.call_args_list
                      if c[0][1] == DWMWA_USE_IMMERSIVE_DARK_MODE]
        assert dark_calls, 'the dark-mode attribute was never set'
        assert dark_calls[0][0][2]._obj.value == 0, 'dark=False asked dark'

    def test_the_blend_survives_a_dwm_that_refuses(self):
        """Degrade, never die: a pre-22H2 box, or transparency effects off,
        must still get the rung it can have."""
        refusing = MagicMock()
        refusing.DwmSetWindowAttribute.return_value = 1
        with on_windows(), patch('ctypes.windll.user32', layered_user32()), \
                patch('ctypes.windll.dwmapi', refusing):
            result = glass.apply_glass(1234, INTENT)

        assert result.rung == glass.LAYERED_ALPHA
        assert 'dwm_backdrop' not in result.steps


class TestWindowsCompositionRung:
    """The NATIVE_GLASS rung: the page on a DirectComposition visual, under
    the OS's own blur.

    PROVEN IN PIXELS by tests/glass_native_demo.py -- transmittance 0.831,
    detail 0.047 -- which is what a rung claim rests on.  What is pinned
    HERE is everything the pixels cannot police: that the module refuses the
    rung on a window that cannot take it, asks for the material the
    measurement supports, and gives every COM object back.
    """

    def test_a_composable_window_reaches_native_glass(self):
        vcall = MagicMock()
        with on_windows(), patch('ctypes.windll.user32', composable_user32()), \
                patch('ctypes.windll.dwmapi', accepting_dwm()), \
                patch.object(glass, '_vcall', vcall), \
                patch.object(glass, '_windows_composition_visual',
                             return_value=fake_com()), \
                patch.object(glass, '_windows_composition_controller',
                             return_value=MagicMock()):
            result = glass.apply_glass(1234, INTENT)

        assert result.rung == glass.NATIVE_GLASS
        assert result.is_native
        assert 'dcomp_visual' in result.steps
        assert 'webview2_composition' in result.steps
        assert 'os_blur' in result.steps
        assert 'dwm_backdrop' not in result.steps, (
            'a composed window does not get the system backdrop, and the '
            'step trail must not say it did')

    def test_the_visual_tree_is_committed_or_nothing_is_on_screen(self):
        """DirectComposition batches: a tree that is never committed is a
        tree the compositor has not been told about."""
        vcall = MagicMock()
        with on_windows(), patch('ctypes.windll.user32', composable_user32()), \
                patch('ctypes.windll.dwmapi', accepting_dwm()), \
                patch.object(glass, '_vcall', vcall), \
                patch.object(glass, '_windows_composition_visual',
                             return_value=fake_com()), \
                patch.object(glass, '_windows_composition_controller',
                             return_value=MagicMock()):
            glass.apply_glass(1234, INTENT)

        slots = [call[0][1] for call in vcall.call_args_list]
        assert glass._SLOT_DEVICE_COMMIT in slots, 'the tree was never committed'

    def test_a_composed_window_gets_the_material_that_was_measured(self):
        """The two materials are NOT interchangeable and the wrong one is
        indistinguishable from failure.

        MEASURED 2026-09-21: DWMWA_SYSTEMBACKDROP_TYPE paints a flat opaque
        solid over a composed page (transmittance 0.000, every type); the
        accent policy's blur-behind passes 0.831 of the light and destroys
        the detail.  So a composed window must get the accent policy and
        must NOT get the system backdrop.
        """
        DWMWA_SYSTEMBACKDROP_TYPE = 38
        user32 = composable_user32()
        dwm = accepting_dwm()
        with on_windows(), patch('ctypes.windll.user32', user32), \
                patch('ctypes.windll.dwmapi', dwm), \
                patch.object(glass, '_vcall', MagicMock()), \
                patch.object(glass, '_windows_composition_visual',
                             return_value=fake_com()), \
                patch.object(glass, '_windows_composition_controller',
                             return_value=MagicMock()):
            glass.apply_glass(1234, INTENT)

        user32.SetWindowCompositionAttribute.assert_called_once()
        assert not [c for c in dwm.DwmSetWindowAttribute.call_args_list
                    if c[0][1] == DWMWA_SYSTEMBACKDROP_TYPE], (
            'the system backdrop paints a composed page opaque')

    def test_the_dwm_is_not_touched_off_windows(self):
        """The platform guard on the DWM step itself, not on its caller.

        `apply_glass` already routes macOS and Linux to their own backends,
        so this can only be reached by a direct call -- which is exactly
        what a future caller would do.  It moved here from
        tests/test_companion_ux.py on 2026-09-22: that file kept a partial
        mirror of these backdrop assertions, two of which had gone stale
        against the measurement below.  One home for them now.

        It asserts the DWM is never TOUCHED, not that the return is False.
        The return is the trap: since the system backdrop was withdrawn,
        this function returns False for a non-composited window on EVERY
        platform, so `assert not ...` would pass with the platform guard
        deleted -- a guard that cannot fail is not a guard.  The immersive
        dark-mode call is the first thing past the guard, so its absence is
        what actually proves the guard ran.
        """
        for platform in (on_macos, on_linux):
            dwm = accepting_dwm()
            with platform(), patch('ctypes.windll.dwmapi', dwm):
                assert not glass._windows_dwm_material(12345, INTENT)
            dwm.DwmSetWindowAttribute.assert_not_called()

    def test_an_uncomposable_window_has_its_system_backdrop_set_to_none(self):
        """The material DWM draws for a FRAME is not clipped by SetWindowRgn,
        and the host toolkit asks for one behind this module's back.

        This assertion has moved twice, each time on pixels.  It first
        required the backdrop ("keeps what it had before this rung existed"
        -- history, not what the owner sees).  Then, MEASURED 2026-09-22, it
        required the backdrop NOT be asked for: the live companion is cut to
        a 209x209 disc while it speaks and the whole 330x465 rectangle was
        tinted grey anyway; A/B, same window, same region, one variable:

            backdrop as before   grey outside the disc  +57.1/255
            backdrop suppressed                         +25.7/255

        The residual +25.7 was attributed later that day: pywebview's
        ``update_title_bar_theme`` writes Mica (type 2) on every form in a
        dark system theme, from ``BrowserForm.__init__`` and again on every
        theme change.  Read back live off the companion: type 2 while glass
        had written nothing.  A/B on the real window cut to the rounded
        card, over white, the four corner squares OUTSIDE the region:

            as pywebview left it (Mica)   77/255 in every corner
            set to NONE                   255, the backdrop untouched
            Mica put back                 77 again

        So "not asking" is not enough: the type must be WRITTEN as NONE, and
        this test fails if the write goes missing or asks for any material.

        Note for anyone re-measuring: transmittance alone does NOT show this.
        Suppressing the backdrop LOWERS transmittance (0.469 -> 0.200)
        because the material passes light; it also adds grey, and only the
        grey is the defect.  Measure the tint.
        """
        DWMWA_SYSTEMBACKDROP_TYPE = 38
        DWMSBT_NONE = 1
        user32 = layered_user32()
        dwm = accepting_dwm()
        with on_windows(), patch('ctypes.windll.user32', user32), \
                patch('ctypes.windll.dwmapi', dwm):
            result = glass.apply_glass(1234, INTENT)

        assert result.rung == glass.LAYERED_ALPHA
        backdrop = [c for c in dwm.DwmSetWindowAttribute.call_args_list
                    if c[0][1] == DWMWA_SYSTEMBACKDROP_TYPE]
        assert len(backdrop) == 1, (
            'the system backdrop type must be written exactly once, to '
            'undo the Mica pywebview asks for')
        assert backdrop[0][0][2]._obj.value == DWMSBT_NONE, (
            'any material here is rendered for the window FRAME, escapes '
            'SetWindowRgn, and paints grey around a shaped window')
        assert not dwm.DwmExtendFrameIntoClientArea.called, (
            'extending the frame into the client area is the other half of '
            'the same escape')
        user32.SetWindowCompositionAttribute.assert_not_called()

        # The rung must NOT be claimed from the backdrop being NONE: layered
        # alpha is what makes this window see-through, and it still has to
        # have been applied.
        user32.SetLayeredWindowAttributes.assert_called()
        assert 'dwm_backdrop' not in result.steps

    def test_a_window_born_without_the_creation_flag_is_never_composed(self):
        """WS_EX_NOREDIRECTIONBITMAP cannot be added afterwards, and without
        it the window's own GDI surface sits opaque behind the page.
        MEASURED: 0.075 and sharp without the flag, 0.831 and blurred with
        it.  So the module must not even try."""
        visual = MagicMock()
        with on_windows(), \
                patch('ctypes.windll.user32', composable_user32(exstyle=0)), \
                patch('ctypes.windll.dwmapi', accepting_dwm()), \
                patch.object(glass, '_windows_composition_visual', visual):
            result = glass.apply_glass(1234, INTENT)

        visual.assert_not_called()
        assert not result.is_native

    def test_a_window_that_already_hosts_a_browser_is_never_composed(self):
        """pywebview's form holds its WebView2 as a child HWND; composing
        over it would stack a second, blank browser on the owner's page."""
        visual = MagicMock()
        with on_windows(), \
                patch('ctypes.windll.user32', composable_user32(child=99)), \
                patch('ctypes.windll.dwmapi', accepting_dwm()), \
                patch.object(glass, '_windows_composition_visual', visual):
            result = glass.apply_glass(1234, INTENT)

        visual.assert_not_called()
        assert not result.is_native

    def test_a_browser_that_will_not_start_leaks_nothing(self):
        """The failure path is the one that leaks a GPU device for the life
        of the process, so it is the one that is pinned."""
        vcall = MagicMock()
        with on_windows(), patch('ctypes.windll.user32', composable_user32()), \
                patch('ctypes.windll.dwmapi', accepting_dwm()), \
                patch.object(glass, '_vcall', vcall), \
                patch.object(glass, '_windows_composition_visual',
                             return_value=fake_com()), \
                patch.object(glass, '_windows_composition_controller',
                             side_effect=RuntimeError('no runtime')):
            result = glass.apply_glass(1234, INTENT)

        released = [c[0][0].value for c in vcall.call_args_list
                    if c[0][1] == glass._SLOT_RELEASE]
        assert sorted(released) == [0x1000, 0x2000, 0x3000], (
            'the visual, the target and the device must all go back')
        assert not result.is_native
        assert glass.hosted_page(1234) is None

    def test_the_failure_is_logged_with_what_failed(self, caplog):
        with on_windows(), patch('ctypes.windll.user32', composable_user32()), \
                patch('ctypes.windll.dwmapi', accepting_dwm()), \
                patch.object(glass, '_vcall', MagicMock()), \
                patch.object(glass, '_windows_composition_visual',
                             return_value=fake_com()), \
                patch.object(glass, '_windows_composition_controller',
                             side_effect=RuntimeError('no runtime')), \
                caplog.at_level(logging.ERROR, logger='NunbaGlass'):
            glass.apply_glass(1234, INTENT)

        assert 'no runtime' in caplog.text and '1234' in caplog.text

    def test_the_caller_is_handed_the_page_to_navigate_not_the_hosting(self):
        """The module hosts; the caller navigates.  The same boundary this
        file draws around the look."""
        controller = MagicMock()
        with on_windows(), patch('ctypes.windll.user32', composable_user32()), \
                patch('ctypes.windll.dwmapi', accepting_dwm()), \
                patch.object(glass, '_vcall', MagicMock()), \
                patch.object(glass, '_windows_composition_visual',
                             return_value=fake_com()), \
                patch.object(glass, '_windows_composition_controller',
                             return_value=controller):
            glass.apply_glass(1234, INTENT)

        assert glass.hosted_page(1234) is controller.CoreWebView2

    def test_applying_twice_does_not_stack_a_second_browser(self):
        """apply_glass runs again whenever a window is re-shown or moved."""
        builder = MagicMock(return_value=fake_com())
        with on_windows(), patch('ctypes.windll.user32', composable_user32()), \
                patch('ctypes.windll.dwmapi', accepting_dwm()), \
                patch.object(glass, '_vcall', MagicMock()), \
                patch.object(glass, '_windows_composition_visual', builder), \
                patch.object(glass, '_windows_composition_controller',
                             return_value=MagicMock()):
            first = glass.apply_glass(1234, INTENT)
            second = glass.apply_glass(1234, INTENT)

        assert builder.call_count == 1
        assert first.rung == second.rung == glass.NATIVE_GLASS

    def test_releasing_closes_the_browser_and_gives_the_com_objects_back(self):
        controller = MagicMock()
        vcall = MagicMock()
        with on_windows(), patch('ctypes.windll.user32', composable_user32()), \
                patch('ctypes.windll.dwmapi', accepting_dwm()), \
                patch.object(glass, '_vcall', vcall), \
                patch.object(glass, '_windows_composition_visual',
                             return_value=fake_com()), \
                patch.object(glass, '_windows_composition_controller',
                             return_value=controller):
            glass.apply_glass(1234, INTENT)
            vcall.reset_mock()
            released = glass.release_glass(1234)

        assert released is True
        controller.Close.assert_called_once()
        assert sorted(c[0][0].value for c in vcall.call_args_list
                      if c[0][1] == glass._SLOT_RELEASE) == [
            0x1000, 0x2000, 0x3000]
        assert glass.release_glass(1234) is False, 'nothing left to release'
        assert glass.hosted_page(1234) is None

    def test_a_window_that_never_reached_the_rung_can_still_be_released(self):
        """A caller must be able to call it on every window without first
        asking which rung it got."""
        assert glass.release_glass(4321) is False
        assert glass.hosted_page(4321) is None


# ── macOS ──────────────────────────────────────────────────────────────

class TestMacOSBackend:
    def test_a_window_born_with_vibrancy_and_transparency_is_native_glass(self):
        """pywebview already builds the thing GL2 asks for: cocoa.py:678-689
        inserts an NSVisualEffectView with blendingMode behindWindow below
        the webview when `vibrancy` is set, and :668-676 makes the window
        and the WKWebView transparent so the page does not paint over it."""
        window = FakeWebviewWindow(vibrancy=True, transparent=True)
        with on_macos():
            result = glass.apply_glass(window, INTENT)

        assert result.rung == glass.NATIVE_GLASS
        assert result.backend == glass.MACOS
        assert result.is_native

    def test_the_native_claim_names_the_pixel_proof_it_still_owes(self):
        """GL1's rule is not satisfied by a flag either.  A creation flag
        selecting the effect-view code path is far stronger evidence than an
        API return code, and it is still not pixels -- so the result says
        so out loud rather than letting a reader assume it was measured."""
        with on_macos():
            note = glass.apply_glass(
                FakeWebviewWindow(vibrancy=True, transparent=True),
                INTENT).note
        assert 'glass_probe' in note

    @pytest.mark.parametrize('vibrancy,transparent,missing', [
        (False, True, 'vibrancy'),
        (True, False, 'transparent'),
        (False, False, 'vibrancy')])
    def test_a_window_born_without_them_is_solid_and_says_what_is_missing(
            self, vibrancy, transparent, missing):
        """No consolation rung.  vibrancy is consumed while the window is
        being built and AppKit offers no way to add an effect view later, so
        the honest answer is that this window is a slab and why."""
        with on_macos():
            result = glass.apply_glass(
                FakeWebviewWindow(vibrancy=vibrancy, transparent=transparent),
                INTENT)

        assert result.rung == glass.SOLID
        assert not result.is_native
        assert missing in result.note
        assert 'glass_window_kwargs' in result.note

    def test_the_creation_kwargs_carry_the_one_flag_that_matters(self):
        with on_macos():
            kwargs = glass.glass_window_kwargs()
        assert kwargs['vibrancy'] is True
        assert kwargs['transparent'] is True
        assert 'background_color' not in kwargs, (
            'background_color is a look value; it belongs to the surface')

    def test_creating_with_those_kwargs_then_applying_reaches_native_glass(
            self):
        """The two entry points are two moments of ONE decision: what
        glass_window_kwargs() asks for at birth is what apply_glass()
        recognises afterwards.  If they ever disagree, this fails."""
        with on_macos():
            window = FakeWebviewWindow(**{
                k: v for k, v in glass.glass_window_kwargs().items()
                if k in ('vibrancy', 'transparent')})
            assert glass.apply_glass(window, INTENT).rung == glass.NATIVE_GLASS


# ── Linux ──────────────────────────────────────────────────────────────

class TestLinuxBackend:
    def test_it_is_an_honest_seam_not_a_fake_success(self):
        with on_linux():
            result = glass.apply_glass(1234, INTENT)
        assert result.rung == glass.SOLID
        assert not result.is_native

    def test_the_seam_names_the_mechanism_and_the_desktop_that_has_none(self):
        """There is NO universal blur-behind protocol on Linux and that must
        not be hidden behind a helpful-looking default."""
        with on_linux():
            note = glass.apply_glass(1234, INTENT).note
        assert 'org_kde_kwin_blur' in note
        assert 'GNOME' in note

    def test_no_vibrancy_in_its_creation_kwargs(self):
        """gtk.py never reads that flag; asking for it would be a comforting
        no-op dressed as an effect."""
        with on_linux():
            assert 'vibrancy' not in glass.glass_window_kwargs()


# ── tk, the ribbon's rung ──────────────────────────────────────────────

class TestTkBackend:
    def test_it_applies_the_alpha_and_reports_the_rung(self):
        window = FakeTkWindow()
        result = glass.apply_glass(window, glass.GlassIntent(opacity=0.8))

        assert window.opts['-alpha'] == 0.8
        assert result.rung == glass.LAYERED_ALPHA
        assert result.backend == glass.TK
        assert result.steps == ('tk_alpha',)

    def test_it_takes_the_tk_path_on_every_platform(self):
        """Same rung, same module, one applier: tk's -alpha IS a layered
        window on Windows and the toolkit's opacity elsewhere."""
        for platform in (on_windows, on_macos, on_linux):
            window = FakeTkWindow()
            with platform():
                assert glass.apply_glass(window, INTENT).backend == glass.TK
            assert window.opts['-alpha'] == INTENT.opacity

    def test_a_tk_that_refuses_alpha_is_solid_and_logs(self, caplog):
        class _NoAlpha(FakeTkWindow):
            def attributes(self, name, *value):
                raise RuntimeError('unknown option "-alpha"')

        with caplog.at_level(logging.WARNING, logger='NunbaGlass'):
            result = glass.apply_glass(_NoAlpha(), INTENT)

        assert result.rung == glass.SOLID
        assert 'tk refused -alpha' in caplog.text

    def test_a_tk_that_swallows_the_value_is_solid_not_translucent(
            self, caplog):
        """"The call did not raise" is not "the window took it".  The value
        is read back, so a toolkit that accepts and ignores cannot be
        reported as a rung it did not deliver."""
        with caplog.at_level(logging.WARNING, logger='NunbaGlass'):
            result = glass.apply_glass(FakeTkWindow(honours=False), INTENT)

        assert result.rung == glass.SOLID
        assert 'not showing through' in caplog.text

    def test_it_never_asks_the_dwm_for_a_tk_window(self):
        """GL1 measured the Win11 system backdrop turning a tk panel flat
        grey with its text faded -- a REGRESSION on this surface.  So the tk
        rung is the top of the ladder for tk, deliberately."""
        dwm = accepting_dwm()
        with on_windows(), patch('ctypes.windll.dwmapi', dwm):
            glass.apply_glass(FakeTkWindow(), INTENT)
        dwm.DwmSetWindowAttribute.assert_not_called()


# ── the promise itself ─────────────────────────────────────────────────

class TestItNeverReturnsARungItDidNotReach:
    def test_every_backend_declares_a_ceiling_on_the_ladder(self):
        for backend in (glass._WINDOWS_BACKEND, glass._MACOS_BACKEND,
                        glass._LINUX_BACKEND):
            assert backend.ceiling in glass.LADDER

    def test_the_declared_ceilings_are_the_measured_per_platform_truth(self):
        """Windows' ceiling moved on 2026-09-21, and it moved because it was
        MEASURED, not because the code grew a claim: tests/glass_native_demo
        .py puts a composed page on a DirectComposition visual under the
        OS's blur and tests/glass_probe.py reads transmittance 0.831 with
        detail 0.047 off the screen -- light through, detail gone."""
        assert glass._MACOS_BACKEND.ceiling == glass.NATIVE_GLASS
        assert glass._WINDOWS_BACKEND.ceiling == glass.NATIVE_GLASS
        assert glass._LINUX_BACKEND.ceiling == glass.SOLID

    @pytest.mark.parametrize('platform,backend', [
        (on_windows, 'windows'), (on_macos, 'macos'), (on_linux, 'linux')])
    def test_no_backend_ever_returns_better_than_its_ceiling(self, platform,
                                                             backend):
        """The invariant the whole module rests on.  Every OS call is made to
        succeed, so each backend is given every chance to over-claim."""
        chosen = {'windows': glass._WINDOWS_BACKEND,
                  'macos': glass._MACOS_BACKEND,
                  'linux': glass._LINUX_BACKEND}[backend]

        with platform(), patch('ctypes.windll.user32', layered_user32()), \
                patch('ctypes.windll.dwmapi', accepting_dwm()):
            for surface in (1234, FakeWebviewWindow(True, True)):
                result = glass.apply_glass(surface, INTENT)
                assert (glass.LADDER.index(result.rung)
                        >= glass.LADDER.index(chosen.ceiling)), (
                    f'{backend} claimed {result.rung}, better than its '
                    f'declared ceiling {chosen.ceiling}')

    def test_both_entry_points_read_the_same_backend(self):
        """One selection, so creation-time and after-the-fact can never
        disagree about what this platform can do."""
        for platform, name in ((on_windows, glass.WINDOWS),
                               (on_macos, glass.MACOS),
                               (on_linux, glass.LINUX)):
            with platform():
                assert glass._backend().name == name
                # glass_window_kwargs goes through the same _backend()
                assert ('vibrancy' in glass.glass_window_kwargs()) is (
                    name == glass.MACOS)


# ── the collapsed parallel path ────────────────────────────────────────

class TestThereIsOnlyOneOfThese:
    def test_enable_window_acrylic_is_gone(self):
        """It was the second way to make a floating window see-through, and
        its True meant only "the DWM accepted a backdrop" -- which GL1 proved
        is not glass.  Keeping the name alive would keep that false promise
        callable."""
        assert not hasattr(platform_utils, 'enable_window_acrylic')

    def test_source_guard_one_layered_alpha_applier_in_the_repo(self):
        """DRY, across files, where no single behavioural test can see it:
        SetLayeredWindowAttributes may be called from exactly one module."""
        callers = sorted(
            p.name for p in _DESKTOP.glob('*.py')
            if 'SetLayeredWindowAttributes' in p.read_text(encoding='utf-8'))
        assert callers == ['glass.py'], (
            f'a second layered-alpha applier appeared in {callers}')

    def test_source_guard_the_dwm_backdrop_lives_in_one_module(self):
        owners = sorted(
            p.name for p in _DESKTOP.glob('*.py')
            if 'DWMWA_SYSTEMBACKDROP_TYPE' in p.read_text(encoding='utf-8'))
        assert owners == ['glass.py'], (
            f'the DWM backdrop grew a second home in {owners}')

    def test_source_guard_one_com_vtable_helper_in_the_package(self):
        """The vtable dereference lives in desktop/win32_com.py and nowhere
        else.  glass.py used to carry it; when the taskbar-list call in
        platform_utils needed the same thing, it moved out rather than
        being copied -- a second hand-rolled vtable helper is the parallel
        path that drifts."""
        marker = 'POINTER(ctypes.POINTER(ctypes.c_void_p))'
        owners = sorted(
            p.name for p in _DESKTOP.glob('*.py')
            if marker in p.read_text(encoding='utf-8'))
        assert owners == ['win32_com.py'], (
            f'a COM vtable dereference appeared in {owners}')
        assert glass._vcall is __import__(
            'desktop.win32_com', fromlist=['vcall']).vcall, (
            'glass must call the shared helper, not a copy')

    def test_source_guard_glass_owns_the_platform_question_by_reusing_it(self):
        """No second "is this platform X": the flags are read off
        platform_utils at call time, never redefined here."""
        src = (_DESKTOP / 'glass.py').read_text(encoding='utf-8')
        tree = ast.parse(src)
        assigned = {t.id for n in ast.walk(tree)
                    if isinstance(n, ast.Assign) for t in n.targets
                    if isinstance(t, ast.Name)}
        assert not {'IS_WINDOWS', 'IS_MACOS', 'IS_LINUX'} & assigned
        assert 'platform_utils.IS_WINDOWS' in src

    def test_source_guard_the_module_holds_no_look_values(self):
        """The boundary the owner drew: the LOOK is CSS, one code path for
        all three platforms, and it belongs to the page.  This module answers
        one OS-capability question -- will the desktop show through -- so a
        hex colour, a blur radius or a corner radius appearing here would be
        the look forking per platform, which is the bug."""
        src = (_DESKTOP / 'glass.py').read_text(encoding='utf-8')
        code = '\n'.join(line.split('#', 1)[0] for line in src.splitlines())
        # strip docstrings: prose may DISCUSS colours it must not define
        tree = ast.parse(src)
        for node in ast.walk(tree):
            doc = (ast.get_docstring(node, clean=False)
                   if isinstance(node, (ast.Module, ast.ClassDef,
                                        ast.FunctionDef)) else None)
            if doc:
                code = code.replace(doc, '')

        assert not re.search(r"['\"]#[0-9A-Fa-f]{3,8}['\"]", code), (
            'a colour literal appeared in desktop/glass.py')
        assert not re.search(r'\b\d+(\.\d+)?(px|rem|em|%)\b', code), (
            'a CSS length appeared in desktop/glass.py')
        assert not re.search(r'\brgba?\s*\(', code), (
            'a colour appeared in desktop/glass.py')

    def test_it_exposes_no_look_constants(self):
        """Nothing importable from here may be a colour or an opacity: a
        caller reaching for `glass.SOME_ALPHA` would be taking a look
        decision from a capability module."""
        for name in dir(glass):
            if name.isupper():
                value = getattr(glass, name)
                assert not isinstance(value, float), (
                    f'glass.{name} is a number that looks like a look value')
                assert not (isinstance(value, str)
                            and value.startswith('#')), (
                    f'glass.{name} is a colour')

    def test_the_companion_asks_the_same_module_the_ribbon_does(self):
        """Both floating surfaces, one module.  app.py's companion styling
        lives inside main(), so there is nothing importable to call -- this
        is the one assertion that has to read the source."""
        app = (_DESKTOP.parent / 'app.py').read_text(encoding='utf-8')
        imported = {
            alias.name
            for node in ast.walk(ast.parse(app))
            if isinstance(node, ast.ImportFrom) and node.module == 'desktop.glass'
            for alias in node.names
        }
        surface = (_DESKTOP / 'companion_surface.py').read_text(
            encoding='utf-8')
        hop = {
            alias.name
            for node in ast.walk(ast.parse(app))
            if isinstance(node, ast.ImportFrom)
            and node.module == 'desktop.companion_surface'
            for alias in node.names
        }
        # ONE HOP, followed rather than relaxed.  app.py used to import
        # apply_glass directly; it now goes through
        # companion_surface.apply_floating_presence, which owns the ORDER of
        # the three post-handle calls so app.py and
        # tests/glass_companion_demo.py cannot drift about it.  Both legs of
        # the hop are asserted, so the capability still has exactly one home.
        assert 'apply_glass' in imported or 'apply_floating_presence' in hop, (
            'the companion must reach the capability through the one module, '
            'directly or through companion_surface')
        if 'apply_glass' not in imported:
            assert 'from desktop.glass import' in surface, (
                'companion_surface must reach the capability through '
                'desktop.glass, not reimplement it')
            assert 'apply_glass' in surface, (
                'companion_surface names the hop but does not take it')
        assert 'enable_window_acrylic' not in app, (
            'the second implementation must not survive anywhere')

    def test_apply_glass_has_exactly_the_importers_we_named(self):
        """A THIRD route to the capability is the parallel path, not a hop.

        The companion_surface hop above is legitimate and deliberate.  This
        pins the set so the next one is noticed: an unexpected importer means
        someone found a second way to make a window see-through, which is the
        thing glass.py exists to prevent.
        """
        allowed = {'companion_surface.py', 'indicator_window.py'}
        importers = {
            p.name for p in _DESKTOP.glob('*.py')
            if p.name != 'glass.py'
            and 'from desktop.glass import' in p.read_text(encoding='utf-8')
        }
        unexpected = importers - allowed
        assert not unexpected, (
            f'a new route to the capability appeared in {sorted(unexpected)}; '
            'if that is deliberate, name it in `allowed` and say why')
