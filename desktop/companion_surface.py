"""companion_surface.py - what the FLOATING companion window IS, in one place.

Three things have to agree about this window and until now they agreed by
coincidence: ``app.py`` (which creates it), ``landing-page/public/index.html``
(which paints its first frame) and ``VoiceOrbPage.jsx`` (which renders it).
This module is the one fact they all read.

WHY THE MARKER IS IN THE URL
----------------------------
The page must know it is the floating presence BEFORE it paints anything.
Two measured reasons the obvious signals cannot do that job:

  * ``window.pywebview`` is injected ASYNCHRONOUSLY and announced with
    'pywebviewready'.  VoiceOrbPage's own comment records what believing
    otherwise cost: a render that happens first reads it as absent.
  * ``index.html``'s splash (``#pre-react-loader``) paints before ANY script
    on the page has run, so it cannot consult a JavaScript value at all.
    Measured in Chrome 2026-09-22 against the served bundle: that loader is
    a full-viewport ``background: black`` at ``z-index: 9999`` with
    ``#root`` still empty -- the black rectangle the owner sees at startup,
    drawn before React exists.

A query parameter is carried by the navigation itself, so it is readable at
the first line of ``<head>`` and by every later consumer.  That makes it the
only signal that is true at the moment the first pixel is decided.

The cost is honest and bounded: the literal is written in two languages --
here, and the inline reader in ``index.html`` -- because a static HTML file
cannot import Python.  ``tests/test_companion_surface.py`` pins them
together so they cannot drift.

WHAT THIS MODULE IS NOT
-----------------------
Not a window factory.  It holds no size, no position and no colour: those
belong to ``app.py``, which is the thing that knows the screen.  It holds no
glass look either -- see ``desktop/glass.py``, which owns the OS capability
question, and ``landing-page/src/theme/hartGlass.js``, which owns the look.
"""
from __future__ import annotations

import logging

logger = logging.getLogger('NunbaCompanionSurface')

#: The route the floating window loads.  The React SPA's catch-all serves
#: index.html for it, which is why index.html has to know about the marker
#: below at all.
COMPANION_PATH = '/voice-orb'

#: The marker, split into its two halves so neither a consumer nor a test
#: has to re-parse the query string to talk about it.
FLOATING_PARAM = 'surface'
FLOATING_VALUE = 'floating'

#: The query string as it appears in the URL.  ONE spelling: app.py builds
#: the URL from this and index.html's reader matches against these same two
#: halves, so "did the marker arrive" has a single answer.
FLOATING_QUERY = f'{FLOATING_PARAM}={FLOATING_VALUE}'

#: The attribute index.html sets on <html> when the marker is present, and
#: the value its CSS matches.  Named here so the Python side can assert the
#: contract the stylesheet depends on.
SURFACE_ATTRIBUTE = 'data-hart-surface'


def companion_url(port: int, host: str = 'localhost') -> str:
    """The URL the floating companion window loads.

    Always carries the marker: this function exists precisely so that a
    caller cannot build the companion's URL without it and get a black
    rectangle whose cause is three files away.
    """
    return f'http://{host}:{port}{COMPANION_PATH}?{FLOATING_QUERY}'


def is_floating_url(url: str) -> bool:
    """Does this URL claim to be the floating presence?

    The reader half of ``companion_url``, so tests and any future consumer
    ask the question the same way the page does.
    """
    return FLOATING_QUERY in (url or '')


def companion_window_kwargs() -> dict:
    """The ``create_window`` kwargs that make a window a floating presence.

    Two groups, and the split matters:

      * The CAPABILITY flags come from ``desktop.glass`` -- whether the OS
        will let the desktop show through at all, decided at birth (macOS's
        ``vibrancy`` cannot be added later, and on Windows ``transparent``
        is what stops the host painting over the page's alpha).  They are
        not restated here; a second copy would be a second answer to a
        question that module exists to answer once.
      * The SHAPE flags are this surface's own: no frame, drag by the body,
        above other windows, fixed size.  They describe what a floating
        presence is, not what the OS can do, so they live here.

    Deliberately absent: ``background_color``.  MEASURED in the bundled
    pywebview 6.1 (``webview/platforms/winforms.py:268-274``), that kwarg is
    read ONLY on the ``else`` of ``if window.transparent and self.browser``
    -- so on every platform this module supports it is dead, because
    ``glass_window_kwargs()`` returns ``transparent=True`` on all three.
    Passing '#000000' there therefore did nothing, while reading like the
    app had chosen to paint the floating window black.  A kwarg that is
    inert and misleading is worse than no kwarg; the window's real backing
    is decided by ``apply_floating_presence`` and by the page's CSS.
    """
    from desktop.glass import glass_window_kwargs

    kwargs = dict(glass_window_kwargs())
    kwargs.update(
        resizable=False,
        frameless=True,
        easy_drag=True,
        on_top=True,
        # BORN HIDDEN, and this is load-bearing rather than cosmetic.
        #
        # MEASURED 2026-09-22, both halves:
        #   pywebview winforms.py:736 -- a transparent chromium window takes
        #     `browser.Show(); browser.Hide()` and is then SHOWN AGAIN on the
        #     Navigating event, all before `events.loaded` fires.
        #   platform_utils.set_window_tool_window:222 -- "Takes effect on the
        #     NEXT show, so call it while the window is hidden or before it is
        #     shown."
        #
        # app.py applies the tool-window style on `events.loaded`, i.e. AFTER
        # those shows.  Windows creates the taskbar button and the Alt-Tab
        # entry at the first show and does not retract them when the bit
        # arrives late -- which is why the owner saw the companion clubbed
        # with the main window and minimising with it, while a live read of
        # its extended style showed WS_EX_TOOLWINDOW correctly set.  The bit
        # was set; it was just set too late to matter.
        #
        # `hidden=True` takes pywebview's `if window.hidden` branch instead,
        # which shows at opacity 0 and hides immediately, and skips the
        # Navigating-show hack entirely.  The page still loads (WebView2
        # navigates regardless of visibility), so `events.loaded` still fires
        # and the styles still land -- now while the window is hidden.
        #
        # What this does NOT do, measured the same day once the build with it
        # was live: it does not keep the window off the taskbar.  That
        # opacity-0 show is still a show of a window WITHOUT the tool-window
        # bit (WinForms rewrites the extended style on each Opacity change,
        # so nothing set before it survives), the shell registers a tab at
        # that moment, and hiding the window does not take the tab back --
        # the shell's own button read "Nunba - 2 running windows" for hours
        # while the companion was hidden and carrying WS_EX_TOOLWINDOW.
        # `platform_utils.set_window_tool_window` now asks the shell to drop
        # the tab as well; `hidden=True` stays for what it does do: no
        # companion on screen at boot.
        #
        # It also matches what the page already believes: VoiceOrbPage starts
        # at presence 'hidden' inside the companion ("born away: no window
        # until an agent speaks or the owner acts").  The window appearing at
        # boot was the two disagreeing.
        hidden=True,
    )
    return kwargs


def apply_floating_presence(hwnd, opacity: float):
    """Everything that must be done to the window once its handle exists.

    Ordered, and the order is load-bearing:

    1. ``set_window_tool_window`` -- no taskbar entry, no Alt-Tab.
    2. ``set_window_floating_presence`` -- ``WS_EX_LAYERED`` (without which
       nothing below can make the desktop show through) and
       ``WS_EX_NOACTIVATE`` (so appearing never steals the owner's
       keystrokes).
    3. ``apply_glass`` -- the half that was missing until 2026-09-21: the
       layered bit had been set since 2026-09-20 and nothing ever gave the
       window an alpha through it, so the bit bought nothing.  The Win32
       call that does is named in ``desktop/glass.py`` and nowhere else, on
       purpose: ``tests/test_glass.py`` greps the whole ``desktop`` package
       to keep exactly one applier, and naming it here -- even in prose --
       would read to that guard as a second one.

    ``opacity`` is a LOOK value and stays the caller's, which is why it is a
    parameter and not a constant here -- the same reason ``glass.py`` has no
    default for it.

    Returns the ``GlassResult``: the rung ACHIEVED, never the rung hoped
    for.  Callers log it; nobody promotes it to a claim.
    """
    from desktop.glass import GlassIntent, apply_glass
    from desktop.platform_utils import (
        set_window_floating_presence,
        set_window_tool_window,
    )

    set_window_tool_window(hwnd, True)
    set_window_floating_presence(hwnd, True)
    return apply_glass(hwnd, GlassIntent(opacity=opacity))
