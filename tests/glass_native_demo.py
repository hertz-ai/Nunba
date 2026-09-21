"""Put the Windows composition host on screen and let the probe name it.

``desktop/glass.py`` can say it hosted the page on a DirectComposition
visual and that the DWM took its backdrop.  GL1 is binding about what that
is worth:

    a compositor claim is proven by SCREEN PIXELS over a bright backdrop,
    never by an API return code.

So this is the acceptance gate for the NATIVE_GLASS rung on Windows.  It
creates a real window, hands it to ``glass.apply_glass`` exactly as the app
would, navigates the page the module hosts, and then hands the whole thing
to ``tests/glass_probe.py`` -- which this file never touches, so it cannot
flatter the implementation.

    ACCEPTANCE IS ``GLASS``.

``ALPHA`` means the desktop came through SHARP: a blend, not a blur, which
is the exact failure GL1 recorded and is NOT the rung.  ``UNCERTAIN`` is not
it either.  Exit code is 0 only for GLASS.

It needs a display, so it is not a pytest case.

    python tests/glass_native_demo.py
    python tests/glass_native_demo.py --page card --save shot.png
    python tests/glass_native_demo.py --redirection   # the control below

WHY THE WINDOW IS BUILT HERE AND NOT BY pywebview
-------------------------------------------------
``WS_EX_NOREDIRECTIONBITMAP`` is a CREATION style -- it cannot be added to a
window that already exists -- and it is what removes the GDI surface that
would otherwise sit, opaque, between the composed page and the DWM's
material.  pywebview's ``create_window`` offers no way to ask for it.  So
the composition rung, like macOS's vibrancy, is decided when the window is
BORN, and this file shows what being born right looks like.  ``--redirection``
creates the window WITHOUT that style, as the control: same module, same
calls, one creation flag different.
"""
from __future__ import annotations

import argparse
import ctypes
import os
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from desktop import glass  # noqa: E402
from tests.glass_probe import ensure_dpi_aware, probe  # noqa: E402

#: Where the window goes, in PHYSICAL screen pixels -- the probe captures
#: this rectangle plus its own margin, so it must be clear of the edges.
REGION = (300, 240, 740, 600)

#: How see-through the caller wants the surface.  Used only if the
#: composition rung is not reached and the module falls back to the layered
#: blend, which is exactly the fallback this run exists to avoid.
FALLBACK_OPACITY = 0.8

LRESULT = ctypes.c_ssize_t
WNDPROC = ctypes.WINFUNCTYPE(LRESULT, ctypes.c_void_p, ctypes.c_uint,
                             ctypes.c_size_t, ctypes.c_ssize_t)

WS_POPUP = 0x80000000
WS_EX_TOPMOST = 0x00000008
WS_EX_TOOLWINDOW = 0x00000080
WS_EX_NOACTIVATE = 0x08000000
WS_EX_NOREDIRECTIONBITMAP = 0x00200000
SW_SHOWNOACTIVATE = 4

#: The two pages, so the same rig can measure the window's own glass and the
#: glass with the product's kind of card on it.  They live HERE, not in
#: desktop/glass.py, which holds no look values at all: the look is the
#: page's, and this file is a page.
PAGES = {
    'empty': '<html><body style="margin:0;background:transparent"></body>'
             '</html>',
    'card': '<html><body style="margin:0;background:transparent">'
            '<div style="position:absolute;inset:24px;border-radius:16px;'
            'background:rgba(18,19,28,0.35);'
            'border:1px solid rgba(255,255,255,0.10)"></div>'
            '</body></html>',
}


class WNDCLASSEXW(ctypes.Structure):
    _fields_ = [('cbSize', ctypes.c_uint),
                ('style', ctypes.c_uint),
                ('lpfnWndProc', WNDPROC),
                ('cbClsExtra', ctypes.c_int),
                ('cbWndExtra', ctypes.c_int),
                ('hInstance', ctypes.c_void_p),
                ('hIcon', ctypes.c_void_p),
                ('hCursor', ctypes.c_void_p),
                ('hbrBackground', ctypes.c_void_p),
                ('lpszMenuName', ctypes.c_wchar_p),
                ('lpszClassName', ctypes.c_wchar_p),
                ('hIconSm', ctypes.c_void_p)]


#: The window procedure must outlive the window, so the reference is kept
#: here rather than on a local that the GC would collect out from under
#: Win32 -- a crash that looks like a compositor bug.
_WNDPROC_REF = None

#: A window class cannot be registered twice under one name, and a caller
#: that measures more than one window in a process would otherwise fail on
#: the second with ERROR_CLASS_ALREADY_EXISTS.
_CLASS_SERIAL = 0


def _user32():
    """A PRIVATE user32 handle, so setting argtypes cannot affect the app.

    ``ctypes.windll.user32`` is process-wide and shared; the codebase's
    ``platform_utils._hwnd`` exists because argtypes were once set on it.
    A fresh ``WinDLL`` is a separate object with its own prototypes.
    """
    user32 = ctypes.WinDLL('user32', use_last_error=True)
    user32.CreateWindowExW.restype = ctypes.c_void_p
    user32.CreateWindowExW.argtypes = [
        ctypes.c_uint, ctypes.c_wchar_p, ctypes.c_wchar_p, ctypes.c_uint,
        ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
        ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p]
    user32.DefWindowProcW.restype = LRESULT
    user32.DefWindowProcW.argtypes = [
        ctypes.c_void_p, ctypes.c_uint, ctypes.c_size_t, ctypes.c_ssize_t]
    user32.RegisterClassExW.restype = ctypes.c_ushort
    user32.RegisterClassExW.argtypes = [ctypes.POINTER(WNDCLASSEXW)]
    user32.DestroyWindow.argtypes = [ctypes.c_void_p]
    user32.ShowWindow.argtypes = [ctypes.c_void_p, ctypes.c_int]
    return user32


def create_window(redirection: bool):
    """A bare top-level window with nothing painting in it.

    ``hbrBackground`` is NULL and the procedure is the default one, so the
    client area is never erased with a colour.  Everything the window shows
    is either the DWM's own material or what the composed page draws.
    """
    global _WNDPROC_REF, _CLASS_SERIAL
    user32 = _user32()
    _WNDPROC_REF = WNDPROC(user32.DefWindowProcW)
    _CLASS_SERIAL += 1

    cls = WNDCLASSEXW()
    cls.cbSize = ctypes.sizeof(WNDCLASSEXW)
    cls.lpfnWndProc = _WNDPROC_REF
    cls.hInstance = ctypes.windll.kernel32.GetModuleHandleW(None)
    cls.hbrBackground = None
    cls.lpszClassName = 'NunbaGlassDemo%d_%d' % (os.getpid(), _CLASS_SERIAL)
    if not user32.RegisterClassExW(ctypes.byref(cls)):
        raise OSError('RegisterClassExW failed: %s' % ctypes.get_last_error())

    ex_style = WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE
    if not redirection:
        ex_style |= WS_EX_NOREDIRECTIONBITMAP

    left, top, right, bottom = REGION
    hwnd = user32.CreateWindowExW(
        ex_style, cls.lpszClassName, 'Nunba glass demo', WS_POPUP,
        left, top, right - left, bottom - top,
        None, None, cls.hInstance, None)
    if not hwnd:
        raise OSError('CreateWindowExW failed: %s' % ctypes.get_last_error())

    user32.ShowWindow(hwnd, SW_SHOWNOACTIVATE)
    return user32, int(hwnd)


def pump(seconds: float) -> None:
    """Let the window and the browser breathe, so there is something to see."""
    from ctypes import wintypes

    PM_REMOVE = 0x0001
    user32 = ctypes.windll.user32
    message = wintypes.MSG()
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        drained = 0
        while drained < 256 and user32.PeekMessageW(
                ctypes.byref(message), None, 0, 0, PM_REMOVE):
            user32.TranslateMessage(ctypes.byref(message))
            user32.DispatchMessageW(ctypes.byref(message))
            drained += 1
        time.sleep(0.005)


def navigate_and_wait(page, html, seconds: float) -> bool:
    """Put the page up and wait until it is REALLY there.

    A fixed sleep was not enough and the flake it caused looked exactly like
    a compositor failure: a cold WebView2 takes its first frame longer than
    a warm one, and measuring before that frame reads the window as barely
    see-through.  Waiting on the browser's own completion event instead of
    on a clock is what makes the verdict repeatable.
    """
    done = []
    handler = lambda sender, args: done.append(True)  # noqa: E731
    page.NavigationCompleted += handler
    try:
        page.NavigateToString(html)
        deadline = time.monotonic() + seconds
        while not done and time.monotonic() < deadline:
            pump(0.05)
    finally:
        try:
            page.NavigationCompleted -= handler
        except Exception as e:
            print('could not unhook NavigationCompleted: %s' % e)
    if not done:
        print('WARNING: the page never reported navigation complete in %ss; '
              'what follows may be measuring an unrendered window' % seconds)
    return bool(done)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--page', choices=sorted(PAGES), default='empty',
                    help="'empty' measures the window's own glass; 'card' "
                         'puts a translucent panel on it')
    ap.add_argument('--save', help='write the captured pixels here')
    ap.add_argument('--redirection', action='store_true',
                    help='create the window WITHOUT '
                         'WS_EX_NOREDIRECTIONBITMAP (the control)')
    ap.add_argument('--settle', type=float, default=20.0,
                    help='seconds to wait for the page to finish navigating '
                         '(a budget, not a sleep - it returns as soon as the '
                         'browser says the page is up)')
    ns = ap.parse_args(argv)

    if sys.platform != 'win32':
        print('this demo measures the Windows rung; nothing to do here')
        return 2

    # BEFORE the CLR first touches COM.  WebView2 can only be created on a
    # single-threaded apartment, and .NET puts an unmarked thread in the
    # multi-threaded one, where CreateAsync fails with RPC_E_CHANGED_MODE.
    # The app does not need this line: pywebview runs its window on a thread
    # it marks STA (winforms.py:763).  This file makes its own window, so it
    # owns the same decision -- and it is a PROCESS decision, which is why
    # it lives with the entry point and not in desktop/glass.py.
    COINIT_APARTMENTTHREADED = 0x2
    ctypes.windll.ole32.CoInitializeEx(None, COINIT_APARTMENTTHREADED)

    # This rig is a SECOND process, and it must not fight a running Nunba
    # for the browser profile.  MEASURED 2026-09-21: with the app live on
    # the canonical folder, this process asking for a composition controller
    # on the same folder is refused with ERROR_INVALID_STATE (0x8007139F) --
    # the environment is created happily and the controller is not, which
    # reads like a compositor failure and is not one.  WEBVIEW2_USER_DATA_
    # FOLDER is WebView2's own override, honoured by
    # platform_utils.webview_user_data_dir.
    os.environ.setdefault(
        'WEBVIEW2_USER_DATA_FOLDER',
        os.path.join(tempfile.gettempdir(), 'nunba_glass_demo_profile'))

    # BEFORE the window is created: an unaware process is placed at logical
    # coordinates while the probe captures physical ones, and every number
    # afterwards is of a different part of the screen.
    ensure_dpi_aware()

    user32, hwnd = create_window(redirection=ns.redirection)
    try:
        pump(0.3)
        result = glass.apply_glass(hwnd, glass.GlassIntent(
            opacity=FALLBACK_OPACITY))
        print('glass.apply_glass -> %s' % result)

        page = glass.hosted_page(hwnd)
        if page is None:
            print('NO HOSTED PAGE: the module did not reach the composition '
                  'rung, so what follows measures the bare window')
        else:
            navigate_and_wait(page, PAGES[ns.page], ns.settle)
            # and then a moment for the first COMPOSITED frame: navigation
            # completing is the page being ready, not the compositor having
            # shown it.
            pump(1.0)

        verdict = probe(REGION, ns.save, hwnd)
        print('glass_probe -> %s' % verdict)
        print()
        print('rung returned : %s' % result.rung)
        print('steps         : %s' % ('+'.join(result.steps) or 'none'))
        print('pixels say    : %s' % verdict.kind)
        agreed = (result.rung == glass.NATIVE_GLASS) == verdict.is_glass
        print('agreement     : %s' % (
            'the rung and the pixels say the same thing' if agreed else
            'DISAGREE - the rung is a claim the screen does not support'))
        return 0 if verdict.is_glass and agreed else 1
    finally:
        glass.release_glass(hwnd)
        user32.DestroyWindow(hwnd)


if __name__ == '__main__':
    sys.exit(main())
