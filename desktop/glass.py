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
  * Windows - NATIVE_GLASS, PROVEN IN PIXELS on 2026-09-21 (Windows 11 25H2,
    build 26200): ``tests/glass_native_demo.py`` measures transmittance
    0.831 with detail 0.047, retention 0.057 -- the light comes through and
    the detail does not, which is a blur and nothing else.  It takes two
    halves and neither works alone: the page hosted on a DirectComposition
    visual through ``CoreWebView2CompositionController`` (the type ships in
    the bundled WebView2 Core assembly; the WinForms control pywebview uses
    does not expose it, which is why GL1 measured the page's alpha never
    reaching the compositor), and the OS's own blur-behind over it.
    Like macOS, the rung is decided when the window is BORN:
    ``WS_EX_NOREDIRECTIONBITMAP`` is a creation style and without it the
    window's own GDI surface sits opaque behind the page -- measured, same
    window, same calls, one flag: 0.075 and sharp without it, 0.831 and
    blurred with it.  A window that cannot take it is told so and gets
    LAYERED_ALPHA, which is what the companion still gets today.
  * Linux   - an honest not-implemented seam; see ``_apply_linux``.

The NATIVE_GLASS rung is earned back by ``tests/glass_probe.py`` reading
pixels off the screen, never by editing this file.
"""
from __future__ import annotations

# ctypes at module scope, alone among the OS imports, because the COM
# structures below are CLASS definitions and a class cannot be declared
# inside the function that uses it without being rebuilt on every call.
# ctypes itself is stdlib and imports on every platform; only ``windll`` and
# ``wintypes`` are Windows-only, and those stay lazy, inside the functions
# that call Win32.
import ctypes
import logging
from dataclasses import dataclass, field
from typing import Callable, Optional

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


def hosted_page(surface):
    """The page this module is HOSTING for ``surface``, or None.

    A platform whose top rung needs the page rendered somewhere other than
    into the window itself -- Windows, onto a DirectComposition visual --
    has to create that browser here, because the hosting IS the capability.
    What goes IN it is not: the module hosts, the caller navigates.  That is
    the same boundary the rest of this file draws around the look.

    None on every platform that does not host, and on a window that never
    reached the hosted rung, so a caller can ask unconditionally.
    """
    host = _WINDOWS_HOSTS.get(platform_utils._resolve_handle(surface))
    return host.page if host is not None else None


def release_glass(surface) -> bool:
    """Give back whatever ``apply_glass`` built for ``surface``.

    The composition host owns a GPU device and a browser process for as long
    as it lives, so a window that closes without this leaks both for the
    life of the process.  Returns whether there was anything to release, so
    a caller can call it on every window without first asking which rung it
    got.
    """
    host = _WINDOWS_HOSTS.pop(platform_utils._resolve_handle(surface), None)
    if host is None:
        return False
    host.close()
    logger.info('glass: released the composition host for hwnd %s', host.hwnd)
    return True


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
    """What grants the capability at birth on Windows, as far as pywebview
    can grant it.

    ``transparent=True`` is all pywebview has: WinForms paints
    ``Color.Transparent`` and ``webview/platforms/edgechromium.py:107`` sets
    the WebView2's ``DefaultBackgroundColor`` to transparent, so the page's
    own alpha is not painted over by the host.

    It is NOT enough for the native rung, and the honest place to say so is
    here.  That rung needs ``WS_EX_NOREDIRECTIONBITMAP``, a CreateWindowEx
    flag with no pywebview kwarg behind it (``winforms.py`` builds a plain
    ``Form``), so a pywebview window can never reach it however it is
    styled -- exactly the shape of macOS's ``vibrancy`` problem, in the
    other direction.  ``tests/glass_native_demo.py`` builds a window that
    CAN, and measures it.  Returning a flag pywebview ignores would be
    noise pretending to be an effect, so nothing is invented here.

    No ``vibrancy``: it is a macOS-only kwarg (nothing in ``winforms.py`` or
    ``gtk.py`` reads it).
    """
    return {'transparent': True}


def _apply_windows(surface, hwnd, intent: GlassIntent) -> GlassResult:
    """Climb the ladder on Windows and report where it stopped.

    Three steps, best rung first:

    1. Host the page on a DirectComposition visual
       (``_windows_composition_host``).  This is what puts the page's alpha
       in front of the GPU compositor instead of under a WinForms form that
       paints over it.  It also decides WHICH material step 2 can ask for,
       which is why it goes first.
    2. Ask the OS for its own material (``_windows_dwm_material``).
       Best-effort and, critically, its success is NOT a rung.  Whether it
       took is recorded in ``steps`` only.
    3. Failing the host, uniform layered alpha
       (``_windows_layered_alpha``): the desktop shows through sharply,
       which is a mirror and not glass.

    NATIVE_GLASS is returned only when the page is hosted on a composition
    visual AND the OS took its material -- the two halves of one mechanism.
    A material with nothing transparent in front of it paints a slab (GL1
    measured exactly that), and a composition visual with no material behind
    it is a hole, not glass.
    """
    if not hwnd:
        return GlassResult(
            SOLID, WINDOWS,
            note='no window handle to work on (the window is not up yet)')

    steps = []
    host = _windows_composition_host(hwnd)
    if host is not None:
        steps.extend(host.steps)

    backdrop = _windows_dwm_material(hwnd, intent,
                                     composited=host is not None)
    if backdrop:
        # Named for the material that was actually asked for.  A composed
        # window does NOT get the DWM system backdrop -- measured, it paints
        # such a window opaque -- so calling its step 'dwm_backdrop' would
        # put a thing that did not happen in the diagnostic trail.
        steps.append('os_blur' if host is not None else 'dwm_backdrop')

    if host is not None:
        if backdrop:
            return GlassResult(
                NATIVE_GLASS, WINDOWS, steps=tuple(steps),
                note='the page is hosted on a DirectComposition visual, so '
                     "its alpha reaches the OS's own blur - GPU-composited "
                     'glass; proven in pixels by '
                     'tests/glass_native_demo.py')
        logger.warning(
            'glass: hwnd %s is hosted on a composition visual but the OS '
            'refused its blur, so there is nothing behind the page to blur; '
            'the window is a hole, not glass', hwnd)
        return GlassResult(
            LAYERED_ALPHA, WINDOWS, steps=tuple(steps),
            note='hosted on a composition visual, but the OS refused its '
                 'blur (transparency effects are off), so what shows '
                 'through is sharp')

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


class _ACCENT_POLICY(ctypes.Structure):
    """The OS's blur-behind policy, as ``SetWindowCompositionAttribute``
    takes one."""

    _fields_ = [('AccentState', ctypes.c_int),
                ('AccentFlags', ctypes.c_int),
                ('GradientColor', ctypes.c_uint32),
                ('AnimationId', ctypes.c_int)]


class _WINDOW_COMPOSITION_ATTRIBUTE_DATA(ctypes.Structure):
    """The envelope a composition attribute is passed in."""

    _fields_ = [('Attribute', ctypes.c_int),
                ('Data', ctypes.c_void_p),
                ('SizeOfData', ctypes.c_size_t)]


_WCA_ACCENT_POLICY = 19
_ACCENT_ENABLE_ACRYLICBLURBEHIND = 4

#: No accent flags at all.  MEASURED 2026-09-21: the flag value everyone
#: copies off the internet collapses the blur to a near-opaque slab
#: (transmittance 0.032); with no flags the same call passes 0.831 of the
#: light.  One integer, two completely different surfaces.
_ACCENT_NO_FLAGS = 0

#: The policy's tint, as Win32 spells one.  This is the ABSENCE of a look
#: value, not one: the colour is black and the alpha is ONE -- the smallest
#: the call accepts.  MEASURED 2026-09-21: alpha 0 makes the policy paint an
#: opaque slab (transmittance 0.000) while alpha 1 lets the light through.
#: The tint a person actually sees is the page's CSS, as it is on every
#: other platform.
_ACCENT_NO_TINT = 0x01000000


def _windows_dwm_material(hwnd, intent: GlassIntent,
                          composited: bool = False) -> bool:
    """Ask the OS to render its own material behind the window.

    ONE home for "the OS's own material", and it knows the two cases the OS
    really has, because MEASURED 2026-09-21 on Windows 11 25H2 (build 26200,
    transparency effects on, AC power, not a remote session) they are not
    interchangeable:

      * ``DWMWA_SYSTEMBACKDROP_TYPE`` -- Mica, Acrylic and Tabbed alike --
        paints a FLAT, fully opaque solid: one grey, zero variance, over a
        striped backdrop, transmittance 0.000, with and without the frame
        extension, on a window whose page is a perfect hole.  It is GL1's
        "flat grey panel" again, and composition hosting does not change it.
        Isolated to the attribute itself: the frame extension alone leaves
        the window transmitting 1.000.
      * The accent policy's acrylic blur-behind, asked for with NO flags,
        passes 0.831 of the light and keeps 0.059 of the detail.  That is
        the OS's real GPU blur.  The Win11 taskbar measures the same shape,
        which is what says this is the platform's own material and not a
        trick: its own pixels move between a black and a white backdrop
        while a striped one adds it no detail at all.

    The accent policy is asked for ONLY where it can be seen -- on a window
    whose page is composited, so the page's alpha reaches it.  GL1 measured
    that same policy painting an opaque white sheet behind a WinForms-hosted
    WebView2, and that is exactly the ``composited=False`` case, which keeps
    the system backdrop it has always had.

    Returns whether the OS ACCEPTED the material.  That is all it means: the
    bool feeds a diagnostic step name, never a rung.  Promoting it to a rung
    is the precise mistake that shipped as eedbb6c9 and was reverted.
    """
    if not platform_utils.IS_WINDOWS:
        return False
    try:
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

        if composited:
            return _windows_accent_blur(hwnd)

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


def _windows_accent_blur(hwnd) -> bool:
    """The composited half of ``_windows_dwm_material``; never called alone.

    ``SetWindowCompositionAttribute`` is undocumented and exported by
    user32; it is how the shell asks for its own acrylic, and the taskbar's
    measured optics say so.  Returns whether the OS took it -- and, as with
    everything else here, taking it is not a rung.
    """
    policy = _ACCENT_POLICY(_ACCENT_ENABLE_ACRYLICBLURBEHIND,
                            _ACCENT_NO_FLAGS, _ACCENT_NO_TINT, 0)
    data = _WINDOW_COMPOSITION_ATTRIBUTE_DATA(
        _WCA_ACCENT_POLICY,
        ctypes.cast(ctypes.byref(policy), ctypes.c_void_p),
        ctypes.sizeof(policy))
    if not ctypes.windll.user32.SetWindowCompositionAttribute(
            platform_utils._hwnd(hwnd), ctypes.byref(data)):
        logger.warning(
            'glass: the OS refused its blur-behind for hwnd %s (error %s); '
            'the composed page will show through sharp', hwnd,
            ctypes.windll.user32.GetLastError())
        return False
    return True


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


# ── Windows: the COM the compositor is reached through ─────────────────
#
# DirectComposition is Windows' own GPU compositor and it has no .NET
# projection, so reaching it means calling COM vtable slots by index.  Every
# vtable call in this module goes through ``_vcall`` and every release
# through ``_com_release``: a second hand-rolled vtable helper is exactly the
# parallel path that drifts, and a missed Release is a leaked GPU device.


class _GUID(ctypes.Structure):
    """A COM interface id, laid out as the Windows headers declare one."""

    _fields_ = [('Data1', ctypes.c_uint32),
                ('Data2', ctypes.c_uint16),
                ('Data3', ctypes.c_uint16),
                ('Data4', ctypes.c_ubyte * 8)]


def _guid(data1: int, data2: int, data3: int, *tail: int) -> _GUID:
    """A ``_GUID`` from the groups a GUID is written in, left to right."""
    value = _GUID()
    value.Data1, value.Data2, value.Data3 = data1, data2, data3
    for index, byte in enumerate(tail):
        value.Data4[index] = byte
    return value


#: ``IDCompositionDevice`` {C37EA93A-E7AA-450D-B16F-9746CB0407F3}, the root
#: object of DirectComposition.
_IID_IDCOMPOSITION_DEVICE = _guid(
    0xC37EA93A, 0xE7AA, 0x450D,
    0xB1, 0x6F, 0x97, 0x46, 0xCB, 0x04, 0x07, 0xF3)

#: Vtable slots, counted from each interface's declaration order in dcomp.h.
#: ``IUnknown`` occupies 0-2 on EVERY COM interface, so slot 2 is Release
#: whatever the object turns out to be.
_SLOT_RELEASE = 2
_SLOT_DEVICE_COMMIT = 3
_SLOT_DEVICE_CREATE_TARGET_FOR_HWND = 6
_SLOT_DEVICE_CREATE_VISUAL = 7
_SLOT_TARGET_SET_ROOT = 3

#: How long to pump this thread's message loop waiting for WebView2.  It
#: starts a browser process on first use, so this is a cold-start budget, not
#: a hot-path one.  An int, not a float: nothing UPPERCASE in this module may
#: be a float, or it would read as a look value.
_WEBVIEW2_TIMEOUT_SECONDS = 30

#: The composition hosts this module has built, by HWND.  A host has to
#: OUTLIVE the call that built it -- the instant its device is released the
#: window stops being composited -- so the module owns them and
#: ``release_glass`` is how a caller hands one back.  One registry, so a
#: window can never end up with two hosts fighting over it.
_WINDOWS_HOSTS = {}


def _vcall(interface, slot: int, restype, argtypes, *args):
    """Call slot ``slot`` of ``interface``'s COM vtable.

    ``interface`` is a ``c_void_p`` holding the interface pointer, which is
    also a pointer to its vtable pointer -- two dereferences to the function.

    ``restype`` is the caller's because ``Release`` returns a ULONG while
    every other method here returns an HRESULT, and an HRESULT restype makes
    ctypes RAISE on failure.  That is deliberate: a COM call that quietly
    returns E_FAIL and is never checked is how a "working" compositor host
    turns out to have composited nothing.
    """
    table = ctypes.cast(
        interface, ctypes.POINTER(ctypes.POINTER(ctypes.c_void_p))).contents
    method = ctypes.WINFUNCTYPE(restype, ctypes.c_void_p, *argtypes)(
        table[slot])
    return method(interface, *args)


def _com_release(interface, what: str) -> None:
    """Release one COM interface, from the teardown AND the failure path.

    Construction releases through this too: a later step failing must not
    strand the objects the earlier ones already made, and a GPU device is
    not something to leak on a path that runs whenever a window opens.
    """
    if interface is None or not getattr(interface, 'value', None):
        return
    try:
        _vcall(interface, _SLOT_RELEASE, ctypes.c_ulong, [])
    except Exception as e:
        logger.error('glass: releasing the %s failed: %s', what, e)


def _windows_pump(is_done, seconds: int) -> bool:
    """Run THIS thread's message loop until ``is_done()`` or time runs out.

    WebView2 creates its environment and its controller on the calling
    thread's message loop, so the Tasks they return never complete if
    nothing pumps -- blocking on ``.Result`` deadlocks instead of waiting.
    This is that pump, and it is the only one.

    The inner drain is capped rather than looping until PeekMessage says
    zero: an unbounded drain is a thread that never gets back to its own
    deadline.
    """
    import time
    from ctypes import wintypes

    PM_REMOVE = 0x0001
    user32 = ctypes.windll.user32
    message = wintypes.MSG()
    deadline = time.monotonic() + seconds

    while True:
        if is_done():
            return True
        if time.monotonic() >= deadline:
            return False
        drained = 0
        while drained < 256 and user32.PeekMessageW(
                ctypes.byref(message), None, 0, 0, PM_REMOVE):
            user32.TranslateMessage(ctypes.byref(message))
            user32.DispatchMessageW(ctypes.byref(message))
            drained += 1
        time.sleep(0.005)


def _windows_client_size(hwnd):
    """The window's client area in physical pixels, as WebView2 wants it."""
    from ctypes import wintypes

    rect = wintypes.RECT()
    ctypes.windll.user32.GetClientRect(
        platform_utils._hwnd(hwnd), ctypes.byref(rect))
    return rect.right - rect.left, rect.bottom - rect.top


def _windows_rasterization_scale(hwnd) -> float:
    """The window's DPI as a scale factor: 1.0 at the unscaled 96 DPI.

    Not a look value -- it is the same physical size on every display, which
    is the whole point.  A composition-hosted WebView2 has no HWND of its
    own to read the DPI from, so unlike the WinForms control it will render
    at 1.0 and come out small on a scaled display unless it is told.
    """
    try:
        dpi = int(ctypes.windll.user32.GetDpiForWindow(
            platform_utils._hwnd(hwnd)))
    except Exception as e:
        logger.debug('glass: could not read the DPI of hwnd %s (%s); the '
                     'hosted page will render unscaled', hwnd, e)
        dpi = 0
    return (dpi / 96.0) if dpi else 1.0


def _windows_hosts_something_already(hwnd) -> bool:
    """Is a browser already hosted INSIDE this window?

    pywebview's WinForms form holds its WebView2 as a child HWND, and
    composition content is composited ABOVE the window's redirection
    surface -- so giving such a window a composition host would stack a
    second, blank browser on top of the page the owner is looking at.  That
    is a regression dressed as an upgrade, so the window is asked first.

    Read, never written: this decides nothing about the window, it only
    reports what is already in it.
    """
    GW_CHILD = 5
    try:
        return bool(ctypes.windll.user32.GetWindow(
            platform_utils._hwnd(hwnd), GW_CHILD))
    except Exception as e:
        logger.error('glass: could not ask hwnd %s what it already hosts '
                     '(%s); leaving it alone', hwnd, e)
        return True


def _windows_can_compose(hwnd) -> bool:
    """Was this window BORN able to show a composed page?

    ``WS_EX_NOREDIRECTIONBITMAP`` is the whole question, and it is a
    CREATION style -- Win32 offers no way to add it to a window that already
    exists.  Without it the window keeps a GDI redirection surface that DWM
    composites underneath the page, opaque, and the page's alpha reaches
    nothing.  MEASURED 2026-09-21, the same window and the same calls with
    only this flag different: without it the surface transmits 0.075 and
    stays sharp; with it, 0.831 and blurred.

    So Windows joins macOS: the top rung is decided when the window is BORN.
    Asked here rather than assumed, because a composition host on a window
    that cannot show it would return NATIVE_GLASS over a slab -- an API
    success standing in for pixels, which is the one thing GL1 forbids.
    """
    GWL_EXSTYLE = -20
    WS_EX_NOREDIRECTIONBITMAP = 0x00200000
    try:
        style = ctypes.windll.user32.GetWindowLongW(
            platform_utils._hwnd(hwnd), GWL_EXSTYLE)
    except Exception as e:
        logger.error('glass: could not read the extended style of hwnd %s '
                     '(%s); not composing it', hwnd, e)
        return False
    if not int(style) & WS_EX_NOREDIRECTIONBITMAP:
        logger.info(
            'glass: hwnd %s was created without WS_EX_NOREDIRECTIONBITMAP '
            '(exstyle 0x%X), so its own redirection surface would sit opaque '
            'behind the page; that flag cannot be added afterwards, so this '
            'window takes the rung below', hwnd, int(style))
        return False
    return True


@dataclass
class _CompositionHost:
    """The live objects that make one window's page GPU-composited.

    Held together because they die together: the visual is meaningless
    without the target that roots it, and releasing the device stops the
    window being composited at all.  ``steps`` is the diagnostic trail the
    result carries, never a rung.
    """

    hwnd: int
    device: object
    target: object
    visual: object
    controller: object
    steps: tuple = ()

    @property
    def page(self):
        """The ``CoreWebView2`` rendering into this window's visual.

        The module hosts; the CALLER navigates.  That is the same boundary
        the rest of this file draws -- the look, and now the content, belong
        to the page, and a capability module that chose either would be
        owning what it exists not to own.
        """
        return getattr(self.controller, 'CoreWebView2', None)

    def close(self) -> None:
        """Give every object back, innermost first.

        Each release is attempted even if an earlier one raised: half a
        teardown leaks a GPU device for the life of the process.
        """
        if self.controller is not None:
            try:
                self.controller.Close()
            except Exception as e:
                logger.error('glass: closing the composition controller for '
                             'hwnd %s failed: %s', self.hwnd, e)
            self.controller = None
        _com_release(self.visual, 'composition visual')
        _com_release(self.target, 'composition target')
        _com_release(self.device, 'composition device')
        self.visual = self.target = self.device = None


def _windows_composition_visual(hwnd):
    """The DirectComposition device, window target and visual, rooted.

    Half of the mechanism: a visual bound to the window's composition tree,
    with nothing in it yet.  ``_windows_composition_controller`` fills it.

    Releases what it made if a later call in it fails, so the caller only
    ever gets all three or none.
    """
    dcomp = ctypes.WinDLL('dcomp.dll')
    dcomp.DCompositionCreateDevice.restype = ctypes.HRESULT
    dcomp.DCompositionCreateDevice.argtypes = [
        ctypes.c_void_p, ctypes.POINTER(_GUID),
        ctypes.POINTER(ctypes.c_void_p)]

    device = ctypes.c_void_p()
    dcomp.DCompositionCreateDevice(
        None, ctypes.byref(_IID_IDCOMPOSITION_DEVICE), ctypes.byref(device))

    target, visual = ctypes.c_void_p(), ctypes.c_void_p()
    try:
        _vcall(device, _SLOT_DEVICE_CREATE_TARGET_FOR_HWND, ctypes.HRESULT,
               [ctypes.c_void_p, ctypes.c_int,
                ctypes.POINTER(ctypes.c_void_p)],
               platform_utils._hwnd(hwnd), 1, ctypes.byref(target))
        _vcall(device, _SLOT_DEVICE_CREATE_VISUAL, ctypes.HRESULT,
               [ctypes.POINTER(ctypes.c_void_p)], ctypes.byref(visual))
        _vcall(target, _SLOT_TARGET_SET_ROOT, ctypes.HRESULT,
               [ctypes.c_void_p], visual)
    except Exception:
        _com_release(visual, 'composition visual')
        _com_release(target, 'composition target')
        _com_release(device, 'composition device')
        raise
    return device, target, visual


def _windows_composition_controller(hwnd, visual):
    """A WebView2 that renders INTO ``visual`` instead of into an HWND.

    The other half.  ``CoreWebView2CompositionController`` is the hosting
    mode pywebview does not use: its WinForms control has no such property,
    which is why GL1 measured the DWM's backdrop painting white behind a
    page that was itself transparent -- the form's own surface was in the
    way.  Rendering into a composition visual removes that surface, and the
    page's alpha reaches the compositor.

    THE HAND-OFF is ``Marshal.GetObjectForIUnknown``: the visual is a COM
    object made by ctypes and ``RootVisualTarget`` wants a managed one.  The
    runtime-callable wrapper round-trips to the same pointer, so the visual
    the DWM is compositing and the visual WebView2 renders into are one
    object.

    ``DefaultBackgroundColor = Color.Transparent`` is what makes the page's
    own alpha real.  It is not a look value: it is the ABSENCE of one -- the
    host declining to paint a colour under the page, so that whatever the
    page's CSS leaves clear stays clear.
    """
    import clr
    from webview.util import interop_dll_path

    # System.Drawing carries Color and Rectangle, which the controller's own
    # properties are typed with; pywebview gets it for free by referencing
    # System.Windows.Forms, and this host does not use WinForms at all.
    clr.AddReference('System.Drawing')
    clr.AddReference(interop_dll_path('Microsoft.Web.WebView2.Core.dll'))
    from Microsoft.Web.WebView2.Core import CoreWebView2Environment
    from System import IntPtr
    from System.Drawing import Color, Rectangle
    from System.Runtime.InteropServices import Marshal
    from System.Threading import ApartmentState, Thread

    # Asked before, not diagnosed after: WebView2 on a multi-threaded
    # apartment fails deep inside CreateAsync as an AggregateException
    # wrapping RPC_E_CHANGED_MODE, which names neither the thread nor the
    # fix.  pywebview runs its window on a thread it marks STA
    # (winforms.py:763), so a window that came from there is already right;
    # a caller that makes its own window has to do the same.
    apartment = Thread.CurrentThread.GetApartmentState()
    if apartment != ApartmentState.STA:
        raise RuntimeError(
            'WebView2 can only be created on a single-threaded apartment; '
            'this thread is %s. Initialise COM as STA before the CLR first '
            'touches it (pywebview does this for its own UI thread).'
            % apartment)

    environment_task = CoreWebView2Environment.CreateAsync(
        None, platform_utils.webview_user_data_dir(), None)
    if not _windows_pump(lambda: environment_task.IsCompleted,
                         _WEBVIEW2_TIMEOUT_SECONDS):
        raise TimeoutError(
            'the WebView2 environment never finished creating')
    environment = environment_task.Result

    controller_task = (
        environment.CreateCoreWebView2CompositionControllerAsync(
            IntPtr(int(hwnd))))
    if not _windows_pump(lambda: controller_task.IsCompleted,
                         _WEBVIEW2_TIMEOUT_SECONDS):
        raise TimeoutError(
            'the WebView2 composition controller never finished creating')
    controller = controller_task.Result

    controller.RootVisualTarget = Marshal.GetObjectForIUnknown(
        IntPtr(int(visual.value)))
    controller.DefaultBackgroundColor = Color.Transparent
    controller.RasterizationScale = _windows_rasterization_scale(hwnd)
    width, height = _windows_client_size(hwnd)
    controller.Bounds = Rectangle(0, 0, width, height)
    controller.IsVisible = True
    return controller


def _windows_composition_host(hwnd) -> Optional[_CompositionHost]:
    """Host this window's page on the GPU compositor, or say why not.

    Returns the host on success and None on every failure, having released
    whatever it had already built.  None is not an error the caller has to
    handle: ``_apply_windows`` simply takes the rung below.

    Idempotent per window.  A second call returns the host the first one
    built rather than stacking a second browser -- ``apply_glass`` is called
    again whenever a window is re-shown or moved between monitors.
    """
    if not platform_utils.IS_WINDOWS:
        return None

    handle = int(hwnd)
    existing = _WINDOWS_HOSTS.get(handle)
    if existing is not None:
        return existing

    if _windows_hosts_something_already(handle):
        logger.info('glass: hwnd %s already hosts a browser of its own, so '
                    'it cannot take composition hosting; the rung below it '
                    'is the honest one for this window', handle)
        return None

    if not _windows_can_compose(handle):
        return None

    device = target = visual = controller = None
    try:
        device, target, visual = _windows_composition_visual(handle)
        controller = _windows_composition_controller(handle, visual)
        _vcall(device, _SLOT_DEVICE_COMMIT, ctypes.HRESULT, [])
    except Exception as e:
        logger.error('glass: composition hosting failed for hwnd %s (%s: '
                     '%s); falling back to the rung below', handle,
                     type(e).__name__, e)
        if controller is not None:
            try:
                controller.Close()
            except Exception as close_error:
                logger.error('glass: could not close the half-built '
                             'composition controller for hwnd %s: %s',
                             handle, close_error)
        _com_release(visual, 'composition visual')
        _com_release(target, 'composition target')
        _com_release(device, 'composition device')
        return None

    host = _CompositionHost(
        handle, device, target, visual, controller,
        steps=('dcomp_visual', 'webview2_composition'))
    _WINDOWS_HOSTS[handle] = host
    logger.info('glass: hwnd %s is now hosted on a DirectComposition visual',
                handle)
    return host


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

_WINDOWS_BACKEND = _Backend(WINDOWS, NATIVE_GLASS,
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
