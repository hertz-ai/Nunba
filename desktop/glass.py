"""glass.py - can this OS put the DESKTOP behind my window?

That one question, per platform, and nothing else.

WHAT THIS MODULE IS NOT
-----------------------
It does not own the glass LOOK.  Blur radius, tint, saturation, border,
radius and shadow are CSS in a webview: one code path that renders the same
on Windows, macOS and Linux, and it belongs to the page.  Nothing here holds
a colour, a blur radius or a corner radius, and nothing here should ever
grow one -- a look forked per platform is the bug, not the feature.

What IS irreducibly per-platform is narrower than it looks: whether the
window manager will let the desktop show THROUGH the window at all, so that
the page's blur has something to blur.  A page can style itself beautifully
over a window the OS is painting opaque, and the owner sees a slab.  That is
an OS capability question, and this module is the one place it is asked.

The tk AI-control ribbon is the single exception in the app: it has no page,
so its own colour and alpha live with it in ``indicator_window.py`` and are
handed here as an intent.  See ``_apply_tk``.

THE LADDER (GL2, docs/design/HOME_DESKTOP_DESIGN_CHECKLIST.md in HARTOS)

    NATIVE_GLASS   the platform's own GPU compositor puts the desktop behind
                   the window and blurs it.  The destination.
    LAYERED_ALPHA  the desktop shows through, SHARPLY -- a mirror of what is
                   behind, at some uniform opacity, detail intact.
    SOLID          nothing shows through.  The window is a slab.

TWO ENTRY POINTS, ONE CONCEPT

The capability is not always grantable after the fact: on macOS the whole
native rung is decided when the window is BORN.  pywebview builds the
``NSVisualEffectView`` only if ``vibrancy`` was passed to ``create_window``
(measured in the bundled pywebview 6.1: ``webview/window.py:108, 143`` stores
the flag, ``webview/platforms/cocoa.py:678-689`` reads it and inserts the
effect view below the webview with ``NSVisualEffectBlendingModeBehindWindow``
+ ``NSVisualEffectStateActive``; ``:668-676`` is the ``transparent`` half --
``setOpaque_(False)``, a clear background and ``drawsTransparentBackground``
on the webview).  There is no API to add it afterwards.  So:

    glass_window_kwargs()  what a floating window must be CREATED with.
    apply_glass(surface)   what can still be done to one that EXISTS.

Two moments of one decision, not two APIs: both read the same per-platform
``_Backend``, so they cannot disagree about what this platform can do.

THE PROOF RULE (GL1, binding)

    a compositor claim is proven by SCREEN PIXELS over a bright backdrop,
    never by an API return code.

GL1 was written after an attempt (Nunba eedbb6c9) read a Win32 success
return as glass, shipped, and was reverted (c003e069) once someone looked at
the screen.  So no backend here turns an HRESULT into ``NATIVE_GLASS``.

WHAT EACH PLATFORM REACHES TODAY

  * macOS   - NATIVE_GLASS, one kwarg away: pywebview already implements the
    mechanism GL2 names.  NEXT STEP, not done here: pass
    ``**glass_window_kwargs()`` to the companion's ``create_window`` in
    ``app.py``.  Left unwired on purpose -- it cannot be pixel-proven from a
    Windows box.
  * Windows - LAYERED_ALPHA is the honest ceiling.  The DWM backdrops ARE
    the OS's GPU glass, but GL1 measured them painting WHITE behind a
    WebView2 page, because the page's alpha never reaches the DWM under
    pywebview's WinForms hosting.  Climbing higher is a HOSTING change
    (``CoreWebView2CompositionController`` on a DirectComposition visual);
    the type ships in the bundled WebView2 Core assembly but the WinForms
    control does not expose it.  Out of scope here, by instruction.
  * Linux   - an honest not-implemented seam; see ``_apply_linux``.

The NATIVE_GLASS rung is earned back by ``tests/glass_probe.py`` reading
pixels off the screen, never by editing this file.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Callable

# The canonical home of platform detection and handle resolution.  Imported
# as a MODULE, not as names, on purpose: the flags are read at call time, so
# there is exactly one ``IS_WINDOWS`` in the process and a test that patches
# it patches it for everybody.  A second copy of "is this platform X" is the
# parallel path this module exists to prevent.
from desktop import platform_utils

logger = logging.getLogger('NunbaGlass')

# ── the ladder ─────────────────────────────────────────────────────────
#: The platform's compositor puts the desktop behind the window and blurs
#: it.  The destination (GL2).  Reachable on macOS today.
NATIVE_GLASS = 'NATIVE_GLASS'

#: The desktop shows through without being blurred.  What the ribbon has
#: shipped since GL1, and what the companion gains here on Windows.
LAYERED_ALPHA = 'LAYERED_ALPHA'

#: Nothing shows through.  The floor -- degrade, never die.
SOLID = 'SOLID'

#: Best first.  ``LADDER.index`` is how two rungs are compared, so "better
#: than" has one definition.
LADDER = (NATIVE_GLASS, LAYERED_ALPHA, SOLID)

# ── the backends' names, as they report themselves ─────────────────────
WINDOWS, MACOS, LINUX, TK = 'windows', 'macos', 'linux', 'tk'


@dataclass(frozen=True)
class GlassIntent:
    """The two things a caller must say that the OS cannot work out.

    Deliberately tiny, and deliberately NOT a style.  There is no tint, no
    blur radius and no corner radius here: those are the page's CSS, one
    code path across all three platforms, and a window-capability module
    that held them would be forking the look per OS.

    ``opacity`` has no default on purpose.  It is the uniform alpha used
    only when the platform's best rung is the layered degrade, and how
    see-through a surface should be is the surface's own decision -- so the
    caller states it, at the place its look lives.
    """

    opacity: float
    #: Which of the OS's two materials to ask for, where the OS offers a
    #: choice (Windows' immersive dark mode).  A boolean, not a colour: this
    #: picks between the platform's own materials, it does not describe one.
    dark: bool = True

    @property
    def alpha_byte(self) -> int:
        """``opacity`` as Win32 takes it: 0 (invisible) to 255 (opaque).

        Clamped rather than trusted.  ``SetLayeredWindowAttributes`` takes a
        BYTE, and an out-of-range value from a caller would wrap silently --
        1.5 becoming 127 would leave a surface half-visible while the caller
        believed it had asked for solid.
        """
        return max(0, min(255, int(round(float(self.opacity) * 255))))


@dataclass(frozen=True)
class GlassResult:
    """What was ACHIEVED.  The return of ``apply_glass``.

    ``rung`` is a promise: it is only ever the rung whose mechanism actually
    applied.  ``steps`` is diagnostic -- the individual things that took, in
    order -- and is deliberately NOT a rung claim, so "the DWM accepted the
    backdrop" can be recorded without becoming "the desktop is showing
    through".  GL1 exists because those two were once confused.
    """

    rung: str
    backend: str
    note: str = ''
    steps: tuple = field(default_factory=tuple)

    @property
    def is_native(self) -> bool:
        """True only for NATIVE_GLASS -- the compositor-drawn rung."""
        return self.rung == NATIVE_GLASS

    @property
    def sees_through(self) -> bool:
        """True when the desktop reaches the eye at all, blurred or not."""
        return self.rung in (NATIVE_GLASS, LAYERED_ALPHA)

    def __str__(self) -> str:
        bits = f'{self.rung} via {self.backend}'
        if self.steps:
            bits += f" [{'+'.join(self.steps)}]"
        return bits + (f' ({self.note})' if self.note else '')


@dataclass(frozen=True)
class _Backend:
    """One platform's answer to both moments of the capability question.

    ``creation_kwargs`` and ``apply`` are held together so the two public
    entry points cannot drift apart about what a platform can do: there is
    one selection (``_backend()``), and both entry points make it.

    ``ceiling`` is the best rung this platform can reach at all, declared
    once.  It is the per-platform truth a reader needs and the invariant the
    tests hold every backend to -- no ``apply`` may ever return a rung
    better than its own ceiling.
    """

    name: str
    ceiling: str
    creation_kwargs: Callable[[], dict]
    apply: Callable[[object, int, 'GlassIntent'], 'GlassResult']


# ── the two public entry points ────────────────────────────────────────

def glass_window_kwargs() -> dict:
    """The ``create_window`` kwargs that grant the capability at BIRTH.

    The caller merges these into its own ``webview.create_window(...)``.
    They exist because the best rung is not always grantable afterwards:
    macOS builds its ``NSVisualEffectView`` from the ``vibrancy`` flag at
    creation and offers no way to add one later, so a window created without
    it can never show the desktop however it is styled.

    Only capability flags come back -- never ``background_color``, a size, a
    position or anything else the surface owns.  This is not a window
    factory and not a stylesheet.
    """
    return _backend().creation_kwargs()


def apply_glass(surface, intent: GlassIntent) -> GlassResult:
    """Grant an EXISTING ``surface`` as much of the capability as it can get.

    ``surface`` is either a tk window (anything answering ``attributes`` and
    ``winfo_id``: the ribbon's panel) or a native window -- an int HWND, or a
    pywebview ``Window``.  The handle is resolved by the canonical
    ``platform_utils._resolve_handle``, so this module cannot disagree with
    the rest of the app about which window it is talking about; the surface
    object itself is passed through as well, because macOS reads its answer
    off the window's own creation flags rather than off a handle.

    Returns the rung achieved, never the rung hoped for.  One log line per
    call, because a silent appearance change is unfalsifiable: an absent
    line could mean "never ran" or "ran and did nothing".
    """
    if _is_tk_surface(surface):
        result = _apply_tk(surface, intent)
    else:
        backend = _backend()
        result = backend.apply(
            surface, platform_utils._resolve_handle(surface), intent)

    logger.info('glass: %s', result)
    return result


def _is_tk_surface(surface) -> bool:
    """True for a tk widget, by what it can DO rather than by its type.

    Duck-typed so this module never imports tkinter: the companion's process
    has no reason to pay for tk, and a hasattr pair is a cheaper, truer test
    than an isinstance against a class we would have to import to name.
    """
    return (callable(getattr(surface, 'attributes', None))
            and callable(getattr(surface, 'winfo_id', None)))


def _seam(backend: str, mechanism: str) -> GlassResult:
    """The honest result for a platform whose native rung is not built.

    ONE implementation of "not implemented here yet", so a seam can never
    quietly grow into a second half-backend.  It reports SOLID -- because
    that is what the window actually is -- and names the mechanism that will
    earn it a better rung.
    """
    logger.info('glass: no native backend on %s yet; the mechanism will be '
                '%s', backend, mechanism)
    return GlassResult(SOLID, backend,
                       note=f'native glass not implemented on {backend} yet: '
                            f'{mechanism}')


# ── Windows ────────────────────────────────────────────────────────────

def _windows_creation_kwargs() -> dict:
    """What grants the capability at birth on Windows.

    ``transparent=True`` is the whole of it: WinForms paints
    ``Color.Transparent`` and ``webview/platforms/edgechromium.py:107`` sets
    the WebView2's ``DefaultBackgroundColor`` to transparent, so the page's
    own alpha is not painted over by the host.

    No ``vibrancy``: it is a macOS-only kwarg (nothing in ``winforms.py`` or
    ``gtk.py`` reads it), so asking for it here would be noise pretending to
    be an effect.
    """
    return {'transparent': True}


def _apply_windows(surface, hwnd, intent: GlassIntent) -> GlassResult:
    """Climb the ladder on Windows and report where it stopped.

    Two steps, in order:

    1. Ask the DWM for its own material (``_windows_dwm_material``).  This
       is the logic that used to be ``platform_utils.enable_window_acrylic``.
       Best-effort and, critically, its success is NOT a rung: GL1 measured
       this exact backdrop painting white behind WebView2 and flat grey
       behind tk.  Whether it took is recorded in ``steps`` only.
    2. Apply uniform layered alpha (``_windows_layered_alpha``).  THIS is the
       rung Windows actually reaches today.

    NATIVE_GLASS is never returned here -- it is above this backend's
    declared ceiling.  Earning it is a window-hosting change, and it will be
    proven with ``tests/glass_probe.py``, not with a return code.
    """
    if not hwnd:
        return GlassResult(
            SOLID, WINDOWS,
            note='no window handle to work on (the window is not up yet)')

    steps = []
    if _windows_dwm_material(hwnd, intent):
        steps.append('dwm_backdrop')

    if _windows_layered_alpha(hwnd, intent):
        steps.append('layered_alpha')
        return GlassResult(
            LAYERED_ALPHA, WINDOWS, steps=tuple(steps),
            note=f'the desktop shows through at {intent.alpha_byte}/255, '
                 'sharp - no compositor blur until the page is hosted on a '
                 'DirectComposition visual')

    return GlassResult(
        SOLID, WINDOWS, steps=tuple(steps),
        note='nothing shows through; the window stays a slab')


def _windows_dwm_material(hwnd, intent: GlassIntent) -> bool:
    """Ask the DWM to render its own material behind the window.

    Absorbed in behaviour from the former
    ``platform_utils.enable_window_acrylic``: the immersive dark-mode flag,
    ``DWMWA_SYSTEMBACKDROP_TYPE`` = ``DWMSBT_TRANSIENTWINDOW`` (the material
    the OS uses for its own flyouts), and the frame extended over the whole
    client area so the backdrop has somewhere to render.

    Returns whether the DWM ACCEPTED the backdrop.  That is all it means.
    GL1 measured, in screen pixels, that acceptance does not put the desktop
    on the screen under this app's current window hosting -- so this bool
    feeds a diagnostic step name and NOTHING else.  Promoting it to a rung is
    the precise mistake that shipped as eedbb6c9 and was reverted.

    ``DWMWA_SYSTEMBACKDROP_TYPE`` landed in Windows 11 22H2; on anything
    older, or with transparency effects switched off in Settings, the call
    fails and the window simply stays as it was.
    """
    if not platform_utils.IS_WINDOWS:
        return False
    try:
        import ctypes
        from ctypes import wintypes

        DWMWA_USE_IMMERSIVE_DARK_MODE = 20
        DWMWA_SYSTEMBACKDROP_TYPE = 38
        DWMSBT_TRANSIENTWINDOW = 3

        class MARGINS(ctypes.Structure):
            _fields_ = [('cxLeftWidth', ctypes.c_int),
                        ('cxRightWidth', ctypes.c_int),
                        ('cyTopHeight', ctypes.c_int),
                        ('cyBottomHeight', ctypes.c_int)]

        dwm = ctypes.windll.dwmapi
        h = platform_utils._hwnd(hwnd)

        dark = wintypes.DWORD(1 if intent.dark else 0)
        dwm.DwmSetWindowAttribute(h, DWMWA_USE_IMMERSIVE_DARK_MODE,
                                  ctypes.byref(dark), ctypes.sizeof(dark))

        backdrop = wintypes.DWORD(DWMSBT_TRANSIENTWINDOW)
        hr = dwm.DwmSetWindowAttribute(h, DWMWA_SYSTEMBACKDROP_TYPE,
                                       ctypes.byref(backdrop),
                                       ctypes.sizeof(backdrop))
        if hr != 0:
            logger.debug('glass: the DWM refused its backdrop for hwnd %s '
                         '(hr %s) - pre-22H2, or transparency effects are '
                         'off', hwnd, hr)
            return False

        # -1 on every edge: the whole client area, so the backdrop is not
        # clipped to a title bar that a frameless window does not have.
        margins = MARGINS(-1, -1, -1, -1)
        dwm.DwmExtendFrameIntoClientArea(h, ctypes.byref(margins))
        return True
    except Exception as e:
        logger.debug('glass: DWM backdrop unavailable for hwnd %s: %s',
                     hwnd, e)
        return False


def _windows_layered_alpha(hwnd, intent: GlassIntent) -> bool:
    """Let the desktop through the whole window, at ``intent.opacity``.

    ``SetLayeredWindowAttributes`` with ``LWA_ALPHA``.  The repo had
    ``WS_EX_LAYERED`` set on the companion since 2026-09-20
    (``platform_utils.set_window_floating_presence``) but NEVER called this,
    so the bit bought nothing and the window stayed opaque.  This is the
    missing half.

    ``LWA_COLORKEY`` is deliberately NOT used, and never should be: GL1
    measured that a colour-keyed pixel is transparent to ALL hit-testing, so
    a keyed "glass" makes the surface click-through -- an unusable window
    that merely looks right in a screenshot.

    The extended style is READ, not written: ``set_window_floating_presence``
    is the one writer of ``WS_EX_LAYERED``, and a second writer here would be
    exactly the parallel path this module exists to remove.  Reading it means
    a caller who forgot gets a precise log line instead of a bare Win32
    error code.
    """
    if not platform_utils.IS_WINDOWS:
        return False
    try:
        import ctypes

        GWL_EXSTYLE = -20
        WS_EX_LAYERED = 0x00080000
        LWA_ALPHA = 0x00000002

        user32 = ctypes.windll.user32
        h = platform_utils._hwnd(hwnd)

        style = user32.GetWindowLongW(h, GWL_EXSTYLE)
        if not (style & WS_EX_LAYERED):
            logger.warning(
                'glass: hwnd %s has no WS_EX_LAYERED (exstyle 0x%X), so the '
                'desktop cannot show through; call platform_utils.'
                'set_window_floating_presence first', hwnd, style)
            return False

        if not user32.SetLayeredWindowAttributes(
                h, 0, intent.alpha_byte, LWA_ALPHA):
            logger.warning(
                'glass: SetLayeredWindowAttributes refused alpha %d for hwnd '
                '%s (error %s)', intent.alpha_byte, hwnd,
                user32.GetLastError())
            return False
        return True
    except Exception as e:
        logger.error('glass: layered alpha failed for hwnd %s: %s', hwnd, e)
        return False


# ── macOS ──────────────────────────────────────────────────────────────

def _macos_creation_kwargs() -> dict:
    """What grants the capability at birth on macOS -- the native rung.

    ``vibrancy=True`` is the whole of it, and it is not ours to emulate:
    pywebview 6.1 already does exactly what GL2 names.  Measured in the
    bundled copy, ``webview/platforms/cocoa.py:678-689``::

        if window.vibrancy:
            visualEffectView = AppKit.NSVisualEffectView.new()
            visualEffectView.setState_(AppKit.NSVisualEffectStateActive)
            visualEffectView.setBlendingMode_(
                AppKit.NSVisualEffectBlendingModeBehindWindow)
            self.webview.addSubview_positioned_relativeTo_(
                visualEffectView, AppKit.NSWindowBelow, self.webview)

    ``transparent=True`` is the other half (``:668-676``): ``setOpaque_(False)``,
    ``setHasShadow_(False)``, a background colour at alpha 0, and
    ``drawsTransparentBackground`` on the WKWebView, so the page does not
    paint over the effect view.  Both together put the desktop behind the
    page; either alone does not.

    Both flags are read back off the window by ``_apply_macos`` below, which
    is why they must be set HERE rather than half-set by a caller.
    """
    return {'transparent': True, 'vibrancy': True}


def _apply_macos(surface, hwnd, intent: GlassIntent) -> GlassResult:
    """Report what a macOS window already IS; nothing can be granted now.

    ``vibrancy`` is consumed once, while the window is being built, and
    AppKit offers no way to slide an ``NSVisualEffectView`` under a live
    WKWebView from here.  So this backend does not style -- it READS the two
    flags that select cocoa.py's effect-view path off the pywebview
    ``Window`` and reports accordingly.

    Honest about its evidence: this claims NATIVE_GLASS from the window's own
    creation flags, which is a far stronger thing than the API return code
    GL1 forbids (the flags are what the backend branches on), but it is still
    not pixels.  The pixel proof is owed: ``tests/glass_probe.py`` on a Mac,
    over a bright backdrop.  It cannot be run from the Windows box this was
    written on, and saying so is the point.

    A window created without the flags gets SOLID and a note naming the fix,
    not a consolation rung -- a fake success here would be believed by the
    caller and by the next reader.

    The ribbon does not come through here: tk windows are not created at all
    on macOS (``app.py`` guards the module, because Tk must own the main
    thread and pywebview already does).  A tk surface that did exist would
    take ``_apply_tk`` below, which works on macOS.
    """
    vibrancy = bool(getattr(surface, 'vibrancy', False))
    transparent = bool(getattr(surface, 'transparent', False))

    if vibrancy and transparent:
        return GlassResult(
            NATIVE_GLASS, MACOS, steps=('vibrancy', 'transparent'),
            note='NSVisualEffectView behindWindow under a transparent '
                 "WKWebView - claimed from the window's own creation flags; "
                 'owed a pixel proof from tests/glass_probe.py on a Mac')

    missing = ', '.join(n for n, v in (('vibrancy', vibrancy),
                                       ('transparent', transparent)) if not v)
    logger.warning('glass: this macOS window was created without %s, so it '
                   'has no NSVisualEffectView and cannot be given one now; '
                   'create it with **glass_window_kwargs()', missing)
    return GlassResult(
        SOLID, MACOS,
        note=f'created without {missing}; vibrancy is a CREATION kwarg and '
             'cannot be added afterwards - use glass_window_kwargs()')


# ── Linux ──────────────────────────────────────────────────────────────

#: What earning NATIVE_GLASS on Linux will take -- and the honest warning
#: that there is NO universal protocol for it.
LINUX_MECHANISM = (
    'org_kde_kwin_blur (Wayland) or _KDE_NET_WM_BLUR_BEHIND_REGION (X11) '
    'where the compositor offers it - GNOME/Mutter publishes neither - and '
    'hart-comp on HART OS; the layered rung would be _NET_WM_WINDOW_OPACITY')


def _linux_creation_kwargs() -> dict:
    """What grants the capability at birth on Linux.

    The transparent flag only.  No ``vibrancy``: ``webview/platforms/gtk.py``
    never reads it, so passing it would be a comforting no-op.
    """
    return {'transparent': True}


def _apply_linux(surface, hwnd, intent: GlassIntent) -> GlassResult:
    """SEAM.  Linux has no native backend here yet, and says so.

    There is no universal blur-behind protocol on Linux and that must not be
    hidden behind a helpful-looking default.  KWin offers
    ``org_kde_kwin_blur`` (Wayland) and ``_KDE_NET_WM_BLUR_BEHIND_REGION``
    (X11); wlroots compositors vary; GNOME/Mutter publishes neither, so on
    GNOME the NATIVE_GLASS rung is not reachable at all.  On HART OS we own
    the compositor (hart-comp), which is the one Linux desktop where this is
    fully in our hands.

    The LAYERED_ALPHA rung is separately reachable here and also unbuilt:
    ``_NET_WM_WINDOW_OPACITY`` on the toplevel, which a compositing WM
    honours.  A tk surface already gets that rung through ``_apply_tk``
    below, which is why the ribbon is not blocked on this seam.
    """
    return _seam(LINUX, LINUX_MECHANISM)


# ── tk (all platforms) ─────────────────────────────────────────────────

def _apply_tk(window, intent: GlassIntent) -> GlassResult:
    """Let the desktop through a tk window, via tk's own ``-alpha``.

    The AI-control ribbon is the ONE surface in this app with no page to
    style itself -- there is no CSS behind it, so its colour and its alpha
    live with it in ``indicator_window.py`` (``PANEL_BG``, ``PANEL_ALPHA``)
    and arrive here as an intent.  Every other floating surface is a webview
    and styles itself.

    This is the LAYERED_ALPHA rung, reached by asking tk instead of by
    calling Win32: on Windows tk's ``-alpha`` IS a layered window, and on
    macOS and Linux it is whatever that platform's toolkit does for window
    opacity.  Same rung, same module, one applier.

    It deliberately does NOT also ask for the DWM material.  GL1 measured
    that backdrop turning a tk panel flat grey with its text faded, i.e. a
    REGRESSION on this surface, so a tk window's best measured rung is this
    one and climbing past it here would make the ribbon worse.

    The value is read back and compared, because "the call did not raise" is
    not the same as "the window took it".  Two honest limits on that
    read-back: it proves tk accepted the value, and on X11 without a
    compositing window manager the WM can still ignore it -- only
    ``tests/glass_probe.py`` settles that, from pixels.
    """
    try:
        window.attributes('-alpha', intent.opacity)
        got = window.attributes('-alpha')
    except Exception as e:
        logger.warning('glass: tk refused -alpha %s: %s', intent.opacity, e)
        return GlassResult(SOLID, TK, note=f'tk refused -alpha: {e}')

    try:
        took = abs(float(got) - float(intent.opacity)) <= 0.01
    except (TypeError, ValueError) as e:
        logger.warning('glass: tk read -alpha back as %r, which is not a '
                       'number (%s)', got, e)
        took = False

    if not took:
        logger.warning('glass: tk kept -alpha at %r after being asked for '
                       '%s; the desktop is not showing through', got,
                       intent.opacity)
        return GlassResult(SOLID, TK, note=f'tk kept -alpha at {got!r}')

    return GlassResult(
        LAYERED_ALPHA, TK, steps=('tk_alpha',),
        note=f'the desktop shows through at {intent.opacity}, sharp - tk '
             'paints with the toolkit, so there is no compositor blur to be '
             'had on this surface')


# ── the one platform selection ─────────────────────────────────────────

_WINDOWS_BACKEND = _Backend(WINDOWS, LAYERED_ALPHA,
                            _windows_creation_kwargs, _apply_windows)
_MACOS_BACKEND = _Backend(MACOS, NATIVE_GLASS,
                          _macos_creation_kwargs, _apply_macos)
_LINUX_BACKEND = _Backend(LINUX, SOLID,
                          _linux_creation_kwargs, _apply_linux)


def _backend() -> _Backend:
    """This platform's backend -- the ONE place the platform question is
    asked, consulted by both public entry points.

    The flags come from ``platform_utils``, which is where platform
    detection lives for the whole app.  A platform that is none of the three
    takes the Linux backend, whose answer is an honest seam either way.
    """
    if platform_utils.IS_WINDOWS:
        return _WINDOWS_BACKEND
    if platform_utils.IS_MACOS:
        return _MACOS_BACKEND
    return _LINUX_BACKEND
