"""Measure the window the OWNER actually sees, in screen pixels.

There were two acceptance gates for glass and neither covered this surface:

    tests/glass_probe_selfcheck.py   a tk panel -- the AI-control ribbon
    tests/glass_native_demo.py       a hand-built WS_EX_NOREDIRECTIONBITMAP
                                     window -- the rung pywebview cannot reach

The floating companion is neither.  It is a pywebview window, created with
``desktop.companion_surface.companion_window_kwargs()``, carrying a real
WebView2 that loads the real page -- and every layer in that stack can paint
over the one below it.  MEASURED 2026-09-22 in Chrome against the served
bundle, the topmost of them was not in ``desktop/`` or in ``app.py`` at all:

    landing-page/public/index.html   #pre-react-loader  background: black
                                     body               background: black
                                     #root              background: black

drawn at ``z-index: 9999`` over the full viewport before any script runs.
So a window can be granted every capability the OS has and still be a black
rectangle, and nothing in the existing gates could have told anyone that.
This file closes that gap: same creation kwargs, same post-handle calls,
same page, then the pixels.

    python tests/glass_companion_demo.py
    python tests/glass_companion_demo.py --serve build      # the real bundle
    python tests/glass_companion_demo.py --url http://localhost:5000/voice-orb?surface=floating

IT PUTS A WINDOW ON SCREEN, briefly, near the top-left, plus the probe's own
black / white / striped backdrops behind it.  It takes no input and moves
nothing of the owner's.

WHAT IT MEASURES BY DEFAULT
---------------------------
``--serve public`` serves ``landing-page/public`` and loads ``index.html``
from it.  That is deliberate and it is not a shortcut: CRA's ``public/
index.html`` is the TEMPLATE, it carries no bundle ``<script>`` tags, so
React never mounts and the page stays exactly in its first-paint state --
the splash.  That IS the black rectangle under test, with no build step in
the way.  ``--serve build`` loads the shipped bundle instead, for the state
after React mounts.

WHY THE PROBE RUNS IN A SUBPROCESS
----------------------------------
``glass_probe`` builds its backdrops with tkinter, and tk objects belong to
the thread that made them.  pywebview owns the main thread once
``webview.start()`` is called, so the probe would have to run on a worker --
a tk root on a non-main thread beside a WinForms message loop is a source of
silent misbehaviour, not a measurement.  Running ``tests/glass_probe.py`` as
its own process with ``--hwnd`` (the flag that exists for exactly this: a
surface the probe did not create) keeps both toolkits on their own main
thread, and keeps the probe a module this file never touches, so it cannot
flatter the implementation.

ACCEPTANCE
----------
``OPAQUE`` is a FAILURE: the owner is looking at a slab.  On Windows the
honest ceiling for a pywebview window is ``ALPHA`` -- the desktop shows
through sharply -- because ``WS_EX_NOREDIRECTIONBITMAP`` is a creation style
pywebview cannot ask for, and ``desktop/glass.py`` says so rather than
pretending.  ``GLASS`` would mean the compositor rung was reached, which
would be news.  Exit code is 0 for ALPHA or GLASS, 1 otherwise.
"""
from __future__ import annotations

import argparse
import functools
import http.server
import os
import socket
import socketserver
import subprocess
import sys
import tempfile
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from desktop.companion_surface import (  # noqa: E402
    FLOATING_QUERY,
    apply_floating_presence,
    companion_window_kwargs,
)
from tests.glass_probe import ensure_dpi_aware  # noqa: E402

#: Where the window goes, in PHYSICAL screen pixels.  Clear of the edges
#: because the probe captures this rectangle plus its own margin.  Same
#: shape as the real companion (220x310 css) scaled up enough that the
#: probe's stripes survive: a region too small measures mostly border.
REGION = (300, 240, 620, 690)

#: What the app asks for (app.py's GlassIntent(opacity=0.8)).  Restated here
#: rather than imported because it is a LOOK value that belongs to the
#: surface, and this file is standing in for the surface.
COMPANION_OPACITY = 0.8

#: How long to wait for the page before measuring.  A cold WebView2 takes
#: its first frame noticeably longer than a warm one, and measuring early
#: reads a window as barely see-through -- a flake that looks exactly like a
#: compositor failure (glass_native_demo.py records the same trap).
SETTLE_SECONDS = 6.0


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    """A static server that does not narrate every request to the console."""

    def log_message(self, fmt, *args):
        pass


def serve(directory: str):
    """Serve ``directory`` on a free loopback port; return (port, shutdown).

    A real HTTP origin rather than ``file://`` on purpose: the page under
    test is served over HTTP in the product, and file:// changes both the
    origin rules and how relative asset paths resolve.  Measuring a
    different loading mode than the one that ships would be measuring a
    different page.
    """
    with socket.socket() as probe_socket:
        probe_socket.bind(('127.0.0.1', 0))
        port = probe_socket.getsockname()[1]

    handler = functools.partial(_QuietHandler, directory=directory)
    httpd = socketserver.TCPServer(('127.0.0.1', port), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return port, httpd.shutdown


def run_probe(hwnd: int, save: str | None) -> str:
    """Hand the window to ``tests/glass_probe.py`` and return what it said."""
    here = os.path.dirname(os.path.abspath(__file__))
    cmd = [sys.executable, os.path.join(here, 'glass_probe.py'),
           '--region', ','.join(str(v) for v in REGION),
           '--hwnd', str(hwnd)]
    if save:
        cmd += ['--save', save]
    done = subprocess.run(cmd, capture_output=True, text=True,
                          timeout=180, cwd=os.path.dirname(here))
    if done.stderr.strip():
        print(done.stderr.strip(), file=sys.stderr)
    return done.stdout.strip()


def place_physically(hwnd) -> tuple:
    """Put the window on EXACTLY ``REGION``, in the pixels the probe reads.

    MEASURED 2026-09-22, and it voided the first run of this gate: asking
    ``webview.create_window`` for x/y/width/height put a 320x450 window on
    screen at roughly 213x300 physical pixels, offset right and down, so the
    probe's rectangle was mostly bare backdrop.  A mean taken over mostly
    backdrop changes enormously between the black and the white one, and the
    rig duly scored an opaque black page at transmittance 0.923 -- a
    confident number about the wrong pixels.  The saved capture is what
    showed it; no amount of reading the code would have.

    ``glass_probe.ensure_dpi_aware`` makes THIS process speak physical
    pixels, but pywebview's geometry goes through WinForms, which does not,
    so the two disagree on a scaled display.  ``SetWindowPos`` takes screen
    pixels directly and is the one call both sides can agree on.  Returns
    what the window actually ended up at, so a caller can still refuse to
    trust a mismatch rather than measure through it.
    """
    import ctypes
    from ctypes import wintypes

    SWP_NOZORDER, SWP_NOACTIVATE = 0x0004, 0x0010
    left, top, right, bottom = REGION
    user32 = ctypes.windll.user32
    user32.SetWindowPos(wintypes.HWND(hwnd), None, left, top,
                        right - left, bottom - top,
                        SWP_NOZORDER | SWP_NOACTIVATE)
    rect = wintypes.RECT()
    user32.GetWindowRect(wintypes.HWND(hwnd), ctypes.byref(rect))
    return (rect.left, rect.top, rect.right, rect.bottom)


def topmost_report(hwnd) -> str:
    """Does this window's TOPMOST *bit* agree with its actual z-BAND?

    Two different things that are easy to confuse, and confusing them is how
    a window ends up claiming to be always-on-top while sitting behind the
    owner's browser:

      * ``WS_EX_TOPMOST`` is a bit in the extended style.  ``SetWindowLongW``
        can write it, and ``set_window_tool_window`` /
        ``set_window_floating_presence`` both read-modify-write the whole
        extended style, so they carry it along.
      * the z-BAND is the DWM's own ordering.  Only ``SetWindowPos`` with
        ``HWND_TOPMOST`` moves a window into it.

    Windows enumerates top-level windows in z-order, topmost band first, so
    a window that is really in that band comes BEFORE ``Shell_TrayWnd`` (the
    taskbar, which is always topmost).  Comparing the two answers is the
    whole measurement: bit set + band wrong is the desync, and a plain
    re-assert of a bit that is already set can be a no-op.

    Read-only -- nothing here moves or restyles any window.
    """
    import ctypes
    import ctypes.wintypes as wintypes

    GWL_EXSTYLE, WS_EX_TOPMOST = -20, 0x00000008
    user32 = ctypes.windll.user32
    bit = bool(user32.GetWindowLongW(wintypes.HWND(hwnd), GWL_EXSTYLE)
               & WS_EX_TOPMOST)

    order = []

    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def _collect(h, _):
        if user32.IsWindowVisible(h):
            order.append(int(h))
        return True

    user32.EnumWindows(_collect, 0)
    tray = int(user32.FindWindowW('Shell_TrayWnd', None) or 0)
    try:
        mine, theirs = order.index(int(hwnd)), order.index(tray)
    except ValueError:
        return (f'exstyle TOPMOST={bit}; z-band unreadable (the window or the '
                'taskbar was not in the enumeration)')

    in_band = mine < theirs
    verdict = 'agree' if bit == in_band else 'DISAGREE'
    return (f'exstyle TOPMOST={bit}, actually above the taskbar={in_band} '
            f'-> {verdict} (z index {mine:d} vs taskbar {theirs:d} of '
            f'{len(order):d})')


def measure(window, save: str | None, settle: float) -> str:
    """Apply what the app applies, then measure.  Runs off the GUI thread."""
    from desktop.platform_utils import _resolve_handle

    time.sleep(settle)

    hwnd = _resolve_handle(window)
    if not hwnd:
        return 'NO_WINDOW  the pywebview window never produced a handle'

    placed = place_physically(hwnd)
    print(f'placed at               -> {placed} (asked for {REGION})')
    if placed != REGION:
        return (f'MISPLACED  the window is at {placed}, not {REGION}; every number from '
                'a region it does not fill would be about the backdrop')

    # Three readings around the one actuator, because the owner's window was
    # MEASURED 2026-09-22 carrying WS_EX_TOPMOST while sitting BELOW the
    # taskbar -- bit set, band wrong.  A single reading afterwards could not
    # say whether the styling caused it or the re-assert failed to fix it.
    print(f'z-order at birth        -> {topmost_report(hwnd)}')

    # `native` as app.py passes it, so the rig measures the form painted the
    # way the app paints it -- the grey-vs-dark run in
    # companion_surface._host_paints_nothing is decided by exactly this.
    result = apply_floating_presence(hwnd, COMPANION_OPACITY,
                                     native=getattr(window, 'native', None))
    print(f'apply_floating_presence -> {result}')
    print(f'hwnd                    -> {hwnd}')
    print(f'z-order after styling   -> {topmost_report(hwnd)}')

    # What app.py's _companion_raise does, and the question is whether it is
    # enough: SetWindowPos(HWND_TOPMOST) on a window whose TOPMOST bit is
    # already set may be taken as a no-op, leaving the band where it was.
    from desktop.platform_utils import set_window_always_on_top
    set_window_always_on_top(hwnd, True)
    print(f'z-order after re-assert -> {topmost_report(hwnd)}')

    # A beat for the styles to reach the compositor: SetLayeredWindow
    # Attributes returns before the DWM has redrawn the window with them.
    time.sleep(1.0)
    return run_probe(hwnd, save)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--serve', choices=('public', 'build'), default='public',
                    help="'public' = the CRA template, i.e. the splash the "
                         "owner sees at startup (no React); 'build' = the "
                         'shipped bundle')
    ap.add_argument('--url', help='load this URL instead of serving anything '
                                  '(e.g. a running Nunba)')
    ap.add_argument('--no-marker', action='store_true',
                    help='omit the floating marker from the URL -- the '
                         'CONTROL, i.e. what the window was before this fix')
    ap.add_argument('--save', help='write the captured pixels here')
    ap.add_argument('--settle', type=float, default=SETTLE_SECONDS,
                    help='seconds to let the page render before measuring')
    ns = ap.parse_args(argv)

    if sys.platform != 'win32':
        print('this gate measures the Windows rung; nothing to do here')
        return 2

    # BEFORE the window exists: an unaware process is placed at logical
    # coordinates while the probe captures physical ones, so every number
    # afterwards would describe a different part of the screen.
    ensure_dpi_aware()

    # This is a SECOND process and must not fight a running Nunba for the
    # browser profile -- glass_native_demo.py measured that collision
    # (ERROR_INVALID_STATE) and it reads like a compositor failure.
    os.environ.setdefault(
        'WEBVIEW2_USER_DATA_FOLDER',
        os.path.join(tempfile.gettempdir(), 'nunba_companion_gate_profile'))

    shutdown = None
    if ns.url:
        url = ns.url
    else:
        root = os.path.join(os.path.dirname(os.path.dirname(
            os.path.abspath(__file__))), 'landing-page', ns.serve)
        if not os.path.isdir(root):
            print(f'nothing to serve at {root}')
            return 2
        port, shutdown = serve(root)
        url = f'http://127.0.0.1:{port:d}/index.html'
        if not ns.no_marker:
            url += '?' + FLOATING_QUERY

    print(f'url    : {url}')
    print('serving: %s' % (root if not ns.url else '(external)'))
    print(f'region : {REGION}')
    print()

    import webview

    left, top, right, bottom = REGION
    window = webview.create_window(
        title='Nunba companion glass gate',
        url=url,
        x=left, y=top, width=right - left, height=bottom - top,
        # The window under test is built the way the app builds it -- one
        # function, so this gate cannot measure a window the product does
        # not ship.
        **companion_window_kwargs(),
    )

    verdict = {}

    def worker(w):
        try:
            verdict['text'] = measure(w, ns.save, ns.settle)
        except Exception as e:                       # noqa: BLE001
            verdict['text'] = f'PROBE_FAILED  {type(e).__name__}: {e}'
        finally:
            try:
                w.destroy()
            except Exception as e:                   # noqa: BLE001
                print(f'could not destroy the gate window: {e}')

    try:
        webview.start(worker, window)
    finally:
        if shutdown:
            shutdown()

    text = verdict.get('text', 'NO_VERDICT  the worker never reported')
    print()
    print(f'glass_probe -> {text}')
    kind = text.split()[0] if text else ''
    print()
    print('pixels say  : %s' % (kind or 'nothing'))
    if kind == 'OPAQUE':
        print('verdict     : FAIL - the owner is looking at a slab')
    elif kind in ('ALPHA', 'GLASS'):
        print('verdict     : PASS - the desktop reaches the eye'
              + (', and blurred' if kind == 'GLASS' else ', sharp (the '
                 'honest ceiling for a pywebview window)'))
    else:
        print('verdict     : INCONCLUSIVE - not a measurement of anything')
    return 0 if kind in ('ALPHA', 'GLASS') else 1


if __name__ == '__main__':
    sys.exit(main())
