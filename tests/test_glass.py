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
import logging
import re
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from desktop import glass, platform_utils

WS_EX_LAYERED = 0x00080000
LWA_COLORKEY = 0x00000001
LWA_ALPHA = 0x00000002

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

    def test_it_never_claims_native_glass(self):
        """Windows' ceiling.  The DWM backdrops ARE the OS's GPU glass, but
        GL1 measured them painting WHITE behind a WebView2 page: the page's
        alpha never reaches the DWM under pywebview's WinForms hosting.
        Climbing higher is a hosting change, and it will be proven with
        pixels."""
        with on_windows(), patch('ctypes.windll.user32', layered_user32()), \
                patch('ctypes.windll.dwmapi', accepting_dwm()):
            assert not glass.apply_glass(1234, INTENT).is_native

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
        assert glass._MACOS_BACKEND.ceiling == glass.NATIVE_GLASS
        assert glass._WINDOWS_BACKEND.ceiling == glass.LAYERED_ALPHA
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
        assert 'apply_glass' in imported, (
            'the companion must reach the capability through the one module')
        assert 'enable_window_acrylic' not in app, (
            'the second implementation must not survive anywhere')
