"""
platform_utils.py - Cross-platform utilities for Nunba

Provides platform-specific functionality for:
- Screen dimensions
- Window management
- Protocol handler registration
- Autostart configuration
- Console window hiding
"""
import logging
import os
import subprocess
import sys

logger = logging.getLogger('NunbaPlatform')

# Platform detection
IS_MACOS = sys.platform == 'darwin'
IS_WINDOWS = sys.platform == 'win32'
IS_LINUX = sys.platform.startswith('linux')


def get_screen_dimensions():
    """Get screen dimensions (working area, excludes taskbar/dock)"""
    try:
        if IS_WINDOWS:
            return _get_screen_dimensions_windows()
        elif IS_MACOS:
            return _get_screen_dimensions_macos()
        else:
            return _get_screen_dimensions_linux()
    except Exception as e:
        logger.warning(f"Error getting screen dimensions: {e}, using fallback")
        return _get_screen_dimensions_fallback()


def _get_win32_dpi_scale():
    """Detect Windows DPI scale factor.

    Returns >1.0 when the process is DPI-aware and the display uses scaling
    (e.g. 1.5 for 150%).  Returns 1.0 when DPI-unaware (virtualised to 96 dpi)
    or when no scaling is active.
    """
    try:
        import ctypes
        hdc = ctypes.windll.user32.GetDC(0)
        if hdc:
            dpi = ctypes.windll.gdi32.GetDeviceCaps(hdc, 88)  # LOGPIXELSX
            ctypes.windll.user32.ReleaseDC(0, hdc)
            if dpi > 96:
                return dpi / 96.0
    except Exception:
        pass
    return 1.0


def _get_screen_dimensions_windows():
    """Get screen dimensions on Windows, normalised to logical pixels.

    SystemParametersInfoW(SPI_GETWORKAREA) returns physical pixels when the
    calling process is DPI-aware, but pywebview's move()/resize() always
    operates in logical (DPI-unaware) coordinates.  We detect the DPI scale
    and divide accordingly so the values are safe for window positioning.
    """
    import ctypes
    from ctypes import Structure, byref, windll
    from ctypes.wintypes import RECT

    class RECT(Structure):
        _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long),
                   ("right", ctypes.c_long), ("bottom", ctypes.c_long)]

    rect = RECT()
    windll.user32.SystemParametersInfoW(0x0030, 0, byref(rect), 0)  # SPI_GETWORKAREA
    raw_w = rect.right - rect.left
    raw_h = rect.bottom - rect.top

    scale = _get_win32_dpi_scale()
    if scale > 1.0:
        logical_w = round(raw_w / scale)
        logical_h = round(raw_h / scale)
        logger.info(f"DPI normalisation: raw={raw_w}x{raw_h}, scale={scale:.2f}, "
                    f"logical={logical_w}x{logical_h}")
        return logical_w, logical_h

    return raw_w, raw_h


def _get_screen_dimensions_macos():
    """Get screen dimensions on macOS"""
    try:
        # Try using AppKit
        from AppKit import NSScreen
        screen = NSScreen.mainScreen()
        frame = screen.visibleFrame()
        return int(frame.size.width), int(frame.size.height)
    except ImportError:
        pass

    # Fallback: use system_profiler
    try:
        result = subprocess.run(
            ['system_profiler', 'SPDisplaysDataType'],
            capture_output=True, text=True, timeout=5
        , **get_subprocess_flags())
        for line in result.stdout.split('\n'):
            if 'Resolution' in line:
                parts = line.split(':')[1].strip().split(' x ')
                if len(parts) >= 2:
                    width = int(parts[0].strip())
                    height = int(parts[1].split()[0].strip())
                    # Subtract dock/menu bar space (approximate)
                    return width, height - 100
    except Exception:
        pass

    return _get_screen_dimensions_fallback()


def _get_screen_dimensions_linux():
    """Get screen dimensions on Linux"""
    try:
        result = subprocess.run(
            ['xdpyinfo'],
            capture_output=True, text=True, timeout=5
        , **get_subprocess_flags())
        for line in result.stdout.split('\n'):
            if 'dimensions:' in line:
                dims = line.split(':')[1].strip().split()[0]
                width, height = dims.split('x')
                return int(width), int(height) - 50  # Subtract panel space
    except Exception:
        pass

    return _get_screen_dimensions_fallback()


def _get_screen_dimensions_fallback():
    """Fallback screen dimensions using tkinter"""
    try:
        import tkinter as tk
        root = tk.Tk()
        root.withdraw()
        width = root.winfo_screenwidth()
        height = root.winfo_screenheight()
        root.destroy()
        return width, height
    except Exception:
        return 1920, 1080


def hide_console_window():
    """Hide the console window (Windows only)"""
    if IS_WINDOWS:
        try:
            import ctypes
            ctypes.windll.user32.ShowWindow(
                ctypes.windll.kernel32.GetConsoleWindow(), 0
            )
        except Exception as e:
            logger.debug(f"Could not hide console: {e}")


def _hwnd(window_handle):
    """A window handle as Win32 takes it: pointer-sized.

    Without argtypes (none are set on the shared ctypes.windll.user32: the
    c1a026f4 lesson) ctypes marshals a bare int as a 32-bit C int, while an
    HWND is pointer-sized on x64.  int() first, so a handle that is still
    a pythonnet IntPtr fails here, at the boundary, not inside a call.
    """
    import ctypes
    return ctypes.c_void_p(int(window_handle))


def _resolve_handle(window_handle):
    """An HWND out of whatever the caller has: an int, or a pywebview Window.

    The one resolver for the companion-presence pair below
    (is_main_window_foreground and main_window_state_readable).  They have to
    agree on which window they are talking about or the gate and its
    readability check drift, which is the whole defect the pair exists to
    close -- so there is one of these, not one each.

    0 means "no window": either nothing was passed, or pywebview has not
    attached the WinForms form yet and resolve_hwnd said so.
    """
    if window_handle is None:
        return 0
    if isinstance(window_handle, (int, float)):
        return int(window_handle)
    if hasattr(window_handle, 'native'):
        from desktop.win32_chrome import resolve_hwnd
        return resolve_hwnd(window_handle) or 0
    return 0


def set_window_always_on_top(window_handle, on_top=True):
    """Set a window to be always on top"""
    if IS_WINDOWS:
        try:
            import ctypes
            HWND_TOPMOST = -1
            HWND_NOTOPMOST = -2
            SWP_NOMOVE = 0x0002
            SWP_NOSIZE = 0x0001

            flag = HWND_TOPMOST if on_top else HWND_NOTOPMOST
            ctypes.windll.user32.SetWindowPos(
                _hwnd(window_handle), flag, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE
            )
        except Exception as e:
            logger.error(f"Error setting window on top: {e}")


def set_window_tool_window(window_handle, tool=True):
    """Keep a window out of the taskbar and Alt-Tab (WS_EX_TOOLWINDOW).

    For a floating presence that comes and goes: the owner saw two Nunba
    entries on the taskbar (2026-09-15).  Takes effect on the next show,
    so call it while the window is hidden or before it is shown.
    """
    if IS_WINDOWS:
        try:
            import ctypes
            GWL_EXSTYLE = -20
            WS_EX_TOOLWINDOW = 0x00000080
            WS_EX_APPWINDOW = 0x00040000

            user32 = ctypes.windll.user32
            hwnd = _hwnd(window_handle)
            style = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
            if tool:
                style = (style | WS_EX_TOOLWINDOW) & ~WS_EX_APPWINDOW
            else:
                style = (style & ~WS_EX_TOOLWINDOW) | WS_EX_APPWINDOW
            user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style)
        except Exception as e:
            logger.error(f"Error setting tool-window style: {e}")


def set_window_floating_presence(window_handle, on=True):
    """Per-pixel alpha, and never steal the owner's focus.

    Two extended styles a floating presence needs and the companion did not
    have.  Measured live 2026-09-20 on the running install: the companion
    carried exstyle 0x10088 (TOPMOST|TOOLWINDOW|CONTROLPARENT) while its
    sibling the AI Control Tab carried 0x80088 -- the same minus/plus one bit,
    WS_EX_LAYERED.

    WS_EX_LAYERED is what lets the DWM composite per-pixel alpha out of the
    page.  Without it the window's backdrop is opaque however translucent the
    CSS is, which is why the card read as plain white instead of glass.

    WS_EX_NOACTIVATE stops the window taking focus when it is shown.  This
    surface exists to appear while the owner is working in ANOTHER
    application; pulling their keystrokes out of that application is the one
    thing it must never do.

    Like set_window_tool_window above, this takes effect on the next show --
    call it while the window is hidden.
    """
    if IS_WINDOWS:
        try:
            import ctypes
            GWL_EXSTYLE = -20
            WS_EX_LAYERED = 0x00080000
            WS_EX_NOACTIVATE = 0x08000000

            user32 = ctypes.windll.user32
            hwnd = _hwnd(window_handle)
            style = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
            if on:
                style |= (WS_EX_LAYERED | WS_EX_NOACTIVATE)
            else:
                style &= ~(WS_EX_LAYERED | WS_EX_NOACTIVATE)
            user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style)
        except Exception as e:
            logger.error(f"Error setting floating-presence style: {e}")


def main_window_state_readable(main_window_handle):
    """True iff the main window's foreground state could actually be READ.

    ``is_main_window_foreground`` answers a yes/no question with a bool, so it
    has nowhere to put "I could not tell".  It returns False for that case --
    and False means "the main window is NOT in front", which is the PERMISSIVE
    answer for the floating companion: it shows.

    That is not hypothetical.  ``win32_chrome.resolve_hwnd`` returns 0 for a
    form that is not up yet (its own docstring says so), and pywebview only
    sets ``Window.native`` once the WinForms form exists.  During startup the
    two windows come up concurrently, so there is a real window in which the
    main window object exists, its HWND does not, the gate reads False, and
    the companion appears beside a foreground Nunba -- exactly the state the
    owner reported 2026-09-20.

    Callers that must fail CLOSED (show nothing unless we can prove Nunba is
    backgrounded) pair this with is_main_window_foreground:

        if is_main_window_foreground(w, c) or not main_window_state_readable(w):
            hide()

    Same resolution order as the gate itself, so the two cannot drift.
    """
    if not IS_WINDOWS:
        return False
    try:
        import ctypes
        user32 = ctypes.windll.user32

        m_hwnd = _resolve_handle(main_window_handle)
        if not m_hwnd:
            return False
        return bool(user32.IsWindow(_hwnd(m_hwnd)))
    except Exception as e:
        logger.debug('main_window_state_readable failed: %s', e)
        return False


def _logical_to_physical(width, height, scale):
    """A logical (DPI-independent) size in physical pixels at `scale`."""
    return (round(width * scale), round(height * scale))


def set_window_size(window_handle, width, height):
    """Size a frameless window to width x height LOGICAL px.

    pywebview sizes a window by Form.Size while the form still wears its
    caption and frame, then drops the frame and keeps the smaller client
    (measured 2026-09-15: 220x310 asked, 198x254 on screen).  A frameless
    window's outer size is its client size, so SetWindowPos with the
    designed size, scaled by the same DPI factor get_screen_dimensions()
    normalises with, restores what the page was laid out for.  Returns
    True when the window took the size; a refusal is logged, not silent.
    """
    if not IS_WINDOWS:
        return False
    try:
        import ctypes
        SWP_NOMOVE = 0x0002
        SWP_NOZORDER = 0x0004
        SWP_NOACTIVATE = 0x0010

        user32 = ctypes.windll.user32
        phys_w, phys_h = _logical_to_physical(width, height, _get_win32_dpi_scale())
        if not user32.SetWindowPos(
            _hwnd(window_handle), 0, 0, 0, phys_w, phys_h,
            SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE,
        ):
            logger.warning("SetWindowPos refused %dx%d for hwnd %s (error %s)",
                           phys_w, phys_h, window_handle, user32.GetLastError())
            return False
        return True
    except Exception as e:
        logger.error(f"Error setting window size: {e}")
        return False


def _shape_box(shape, client_w, client_h):
    """Map a page rect (CSS px) onto a window's client rect (physical px).

    `shape` is {x, y, w, h, r, vw, vh}: the rect to keep visible, its corner
    radius, and the page's viewport size, all in CSS px.  WebView2 scales CSS
    px by the display DPI, so the ratio client/viewport is the scale.  Returns
    (left, top, right, bottom, ellipse_w, ellipse_h) for CreateRoundRectRgn,
    or None when there is nothing to clip to.
    """
    if not shape or not client_w or not client_h:
        return None
    try:
        vw, vh = float(shape["vw"]), float(shape["vh"])
        x, y, w, h = (float(shape["x"]), float(shape["y"]),
                      float(shape["w"]), float(shape["h"]))
        r = float(shape.get("r", 0) or 0)
    except (KeyError, TypeError, ValueError):
        return None
    if vw <= 0 or vh <= 0 or w <= 0 or h <= 0:
        return None
    sx, sy = client_w / vw, client_h / vh
    left, top = round(x * sx), round(y * sy)
    right, bottom = round((x + w) * sx), round((y + h) * sy)
    # Corner ellipse: 2r each way, capped at the box so r >= w/2 is a circle.
    ew = min(right - left, round(2 * r * sx))
    eh = min(bottom - top, round(2 * r * sy))
    return (left, top, right, bottom, ew, eh)


def is_main_window_foreground(main_window_handle, companion_window_handle=None):
    """True when the Nunba main window is the one the owner is looking at.

    The floating companion exists to be present while the owner is in ANOTHER
    application.  When Nunba's own window is in front there is already a chat
    on screen, so a second copy of the same conversation floating over it is
    noise -- the companion hides.

    The companion's own handle is passed so it can be told apart: clicking the
    companion makes IT the foreground window, and that must not read as "the
    main window is in front" and hide the thing the owner just clicked.

    Returns a bool, so "I could not read the state" collapses into False --
    which here means "not in front", i.e. SHOW.  That is the permissive
    answer.  Callers that must fail closed pair this with
    ``main_window_state_readable`` above; the two resolve a handle the same
    way so they cannot disagree about which window they are talking about.
    """
    if IS_WINDOWS:
        try:
            import ctypes
            GA_ROOT = 2
            GA_ROOTOWNER = 3

            user32 = ctypes.windll.user32
            fg = user32.GetForegroundWindow()
            if not fg:
                return False

            def _root(h):
                hwnd = _hwnd(h)
                owner = user32.GetAncestor(hwnd, GA_ROOTOWNER)
                return owner or user32.GetAncestor(hwnd, GA_ROOT) or int(h)

            fg_root = _root(fg)

            if companion_window_handle:
                try:
                    c_hwnd = _resolve_handle(companion_window_handle)
                    if c_hwnd and _root(c_hwnd) == fg_root:
                        return False
                except Exception:
                    pass

            m_hwnd = _resolve_handle(main_window_handle)
            if not m_hwnd:
                return False
            return _root(m_hwnd) == fg_root
        except Exception as e:
            logger.debug('is_main_window_foreground failed on Windows: %s', e)
            return False

    if sys.platform == 'darwin':
        try:
            from AppKit import NSApplication, NSWorkspace
            front = NSWorkspace.sharedWorkspace().frontmostApplication()
            if front is None:
                return False
            own = NSApplication.sharedApplication()
            # Per-window resolution needs the Accessibility permission, which
            # this app does not ask for; app-level frontmost is what we have.
            return bool(front.processIdentifier() == os.getpid()
                        and own.isActive())
        except Exception as e:
            logger.debug('is_main_window_foreground failed on macOS: %s', e)
            return False

    try:
        import subprocess
        out = subprocess.run(['xdotool', 'getactivewindow'],
                             capture_output=True, text=True, timeout=2)
        active = (out.stdout or '').strip()
        if not active:
            return False
        if companion_window_handle and active == str(companion_window_handle):
            return False
        return active == str(main_window_handle)
    except Exception as e:
        logger.debug('is_main_window_foreground failed on Linux: %s', e)
        return False


# NOTE: `enable_window_acrylic` used to live here.  It is GONE, not moved
# aside: making a floating window see-through now has exactly one home,
# `desktop/glass.py`, which both floating surfaces ask.  Its DWM logic
# survives there as `_windows_dwm_material`, private and demoted to one
# best-effort STEP of the Windows backend -- because GL1 measured that the
# DWM accepting that backdrop does not put glass on the screen under this
# app's window hosting, so its `True` was never the thing its name promised.
# A window handle is made glass with `desktop.glass.apply_glass(handle)`; a
# window is BORN glass with `**desktop.glass.glass_window_kwargs()`.


def set_window_shape(window_handle, shape):
    """Clip a window to the page's rect (SetWindowRgn).

    pywebview's transparent window is a transparent WebView2 over an opaque
    form (measured 2026-09-15: the "see-through" area painted the form's
    Control colour or WebView2's own #202020, and a colour key changed
    nothing), while a window region clips the WebView2 child with the form.
    So the floating presence that should be "just the orb" is the window cut
    to the orb's rect.  The system owns the region once SetWindowRgn ACCEPTS
    it; a refused region is still ours, and this runs on every change of
    presence while an agent talks, so it is deleted here rather than leaked
    toward the process's GDI-object ceiling (hartos-3e review, 2026-09-15).
    Returns True when the window took the shape.
    """
    if not IS_WINDOWS:
        return False
    try:
        import ctypes
        from ctypes import wintypes

        user32, gdi32 = ctypes.windll.user32, ctypes.windll.gdi32
        hwnd = _hwnd(window_handle)
        rc = wintypes.RECT()
        user32.GetClientRect(hwnd, ctypes.byref(rc))
        box = _shape_box(shape, rc.right - rc.left, rc.bottom - rc.top)
        if box is None:
            return False
        left, top, right, bottom, ew, eh = box
        rgn = gdi32.CreateRoundRectRgn(left, top, right, bottom, ew, eh)
        if not rgn:
            logger.warning("CreateRoundRectRgn failed for %s (error %s)",
                           box, user32.GetLastError())
            return False
        if not user32.SetWindowRgn(hwnd, rgn, True):
            gdi32.DeleteObject(rgn)
            logger.warning("SetWindowRgn refused %s for hwnd %s (error %s)",
                           box, window_handle, user32.GetLastError())
            return False
        return True
    except Exception as e:
        logger.error(f"Error setting window shape: {e}")
        return False


def register_protocol_handler(protocol="hevolveai", app_path=None):
    """Register one or more custom URL protocol handlers.

    `protocol` accepts a single string (back-compat) OR an iterable
    of strings.  Both `hevolveai://` (legacy) and `nunba://` (UNIF-G4)
    schemes register through the same OS path.  Callers needing the
    full canonical set may pass `protocol=('hevolveai', 'nunba')`.
    """
    if app_path is None:
        if getattr(sys, 'frozen', False):
            app_path = sys.executable
        else:
            app_path = os.path.abspath(__file__)

    if isinstance(protocol, (list, tuple, set)):
        schemes = [str(p) for p in protocol if p]
    else:
        schemes = [str(protocol)]

    for scheme in schemes:
        if IS_WINDOWS:
            _register_protocol_windows(scheme, app_path)
        elif IS_MACOS:
            _register_protocol_macos(scheme, app_path)
        elif IS_LINUX:
            _register_protocol_linux(scheme, app_path)


def _register_protocol_windows(protocol, app_path):
    """Register protocol handler on Windows"""
    try:
        import winreg

        # Create protocol key
        key_path = f"{protocol}"
        with winreg.CreateKey(winreg.HKEY_CLASSES_ROOT, key_path) as key:
            winreg.SetValue(key, "", winreg.REG_SZ, f"URL:{protocol} Protocol")
            winreg.SetValueEx(key, "URL Protocol", 0, winreg.REG_SZ, "")

        # Set default icon
        with winreg.CreateKey(winreg.HKEY_CLASSES_ROOT, f"{protocol}\\DefaultIcon") as key:
            winreg.SetValue(key, "", winreg.REG_SZ, f'"{app_path}",0')

        # Set command
        with winreg.CreateKey(winreg.HKEY_CLASSES_ROOT, f"{protocol}\\shell\\open\\command") as key:
            winreg.SetValue(key, "", winreg.REG_SZ, f'"{app_path}" --protocol "%1"')

        logger.info(f"Registered {protocol}:// protocol handler")
    except Exception as e:
        logger.error(f"Failed to register protocol handler: {e}")


def _register_protocol_macos(protocol, app_path):
    """Register protocol handler on macOS (handled by Info.plist in app bundle)"""
    # On macOS, protocol handlers are defined in the app's Info.plist
    # This is handled during build time in setup_freeze_mac.py
    logger.info(f"Protocol handler {protocol}:// configured in Info.plist")


def _register_protocol_linux(protocol, app_path):
    """Register protocol handler on Linux"""
    try:
        desktop_entry = f"""[Desktop Entry]
Type=Application
Name=Nunba
Exec={app_path} --protocol %u
StartupNotify=false
MimeType=x-scheme-handler/{protocol};
"""
        desktop_file = os.path.expanduser(f"~/.local/share/applications/nunba-{protocol}.desktop")
        os.makedirs(os.path.dirname(desktop_file), exist_ok=True)

        with open(desktop_file, 'w') as f:
            f.write(desktop_entry)

        # Register with xdg-mime
        subprocess.run([
            'xdg-mime', 'default', f'nunba-{protocol}.desktop',
            f'x-scheme-handler/{protocol}'
        ], check=False, **get_subprocess_flags())

        logger.info(f"Registered {protocol}:// protocol handler")
    except Exception as e:
        logger.error(f"Failed to register protocol handler: {e}")


def register_autostart(enabled=True, background=True):
    """Register/unregister app to start at login"""
    if IS_WINDOWS:
        _register_autostart_windows(enabled, background)
    elif IS_MACOS:
        _register_autostart_macos(enabled, background)
    elif IS_LINUX:
        _register_autostart_linux(enabled, background)


def _register_autostart_windows(enabled, background):
    """Register autostart on Windows"""
    try:
        import winreg
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"

        if getattr(sys, 'frozen', False):
            app_path = sys.executable
        else:
            app_path = os.path.abspath(__file__)

        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE) as key:
            if enabled:
                cmd = f'"{app_path}"'
                if background:
                    cmd += ' --background'
                winreg.SetValueEx(key, "Nunba", 0, winreg.REG_SZ, cmd)
                logger.info("Registered autostart")
            else:
                try:
                    winreg.DeleteValue(key, "Nunba")
                    logger.info("Removed autostart")
                except FileNotFoundError:
                    pass
    except Exception as e:
        logger.error(f"Failed to configure autostart: {e}")


def _register_autostart_macos(enabled, background):
    """Register autostart on macOS using Login Items"""
    try:
        if getattr(sys, 'frozen', False):
            app_path = os.path.dirname(os.path.dirname(os.path.dirname(sys.executable)))
            if not app_path.endswith('.app'):
                # Find the .app bundle
                parts = sys.executable.split('/')
                for i, part in enumerate(parts):
                    if part.endswith('.app'):
                        app_path = '/'.join(parts[:i+1])
                        break
        else:
            logger.warning("Autostart only works with bundled .app")
            return

        if enabled:
            # Add to Login Items using osascript
            # Escape path to prevent AppleScript injection
            _safe_path = app_path.replace('\\', '\\\\').replace('"', '\\"')
            script = f'''
            tell application "System Events"
                make login item at end with properties {{path:"{_safe_path}", hidden:{str(background).lower()}}}
            end tell
            '''
            subprocess.run(['osascript', '-e', script], check=False, timeout=10, **get_subprocess_flags())
            logger.info("Registered autostart")
        else:
            # Remove from Login Items
            script = '''
            tell application "System Events"
                delete login item "Nunba"
            end tell
            '''
            subprocess.run(['osascript', '-e', script], check=False, **get_subprocess_flags())
            logger.info("Removed autostart")
    except Exception as e:
        logger.error(f"Failed to configure autostart: {e}")


def _register_autostart_linux(enabled, background):
    """Register autostart on Linux"""
    try:
        if getattr(sys, 'frozen', False):
            app_path = sys.executable
        else:
            app_path = os.path.abspath(__file__)

        autostart_dir = os.path.expanduser("~/.config/autostart")
        autostart_file = os.path.join(autostart_dir, "nunba.desktop")

        if enabled:
            os.makedirs(autostart_dir, exist_ok=True)
            cmd = app_path
            if background:
                cmd += ' --background'

            desktop_entry = f"""[Desktop Entry]
Type=Application
Name=Nunba
Exec={cmd}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
"""
            with open(autostart_file, 'w') as f:
                f.write(desktop_entry)
            logger.info("Registered autostart")
        else:
            if os.path.exists(autostart_file):
                os.remove(autostart_file)
            logger.info("Removed autostart")
    except Exception as e:
        logger.error(f"Failed to configure autostart: {e}")


def get_app_data_dir():
    """Get the appropriate application data directory for the current platform"""
    if IS_WINDOWS:
        base = os.environ.get('APPDATA', os.path.expanduser('~'))
        return os.path.join(base, 'Nunba')
    elif IS_MACOS:
        return os.path.expanduser('~/Library/Application Support/Nunba')
    else:
        return os.path.expanduser('~/.nunba')


def get_log_dir():
    """Get the appropriate log directory for the current platform"""
    try:
        from core.platform_paths import get_log_dir as _platform_log_dir
        return _platform_log_dir()
    except ImportError:
        pass
    if IS_WINDOWS:
        return os.path.join(os.path.expanduser('~'), 'Documents', 'Nunba', 'logs')
    elif IS_MACOS:
        return os.path.expanduser('~/Library/Logs/Nunba')
    else:
        return os.path.expanduser('~/.nunba/logs')


def open_file_browser(path):
    """Open file browser at the given path"""
    try:
        if IS_WINDOWS:
            os.startfile(path)
        elif IS_MACOS:
            subprocess.run(['open', path], check=False, **get_subprocess_flags())
        else:
            subprocess.run(['xdg-open', path], check=False, **get_subprocess_flags())
    except Exception as e:
        logger.error(f"Failed to open file browser: {e}")


def get_subprocess_flags():
    """Get subprocess creation flags for the current platform (hides console windows)"""
    if IS_WINDOWS:
        si = subprocess.STARTUPINFO()
        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        si.wShowWindow = 0  # SW_HIDE
        return {'startupinfo': si, 'creationflags': subprocess.CREATE_NO_WINDOW}
    else:
        return {}
