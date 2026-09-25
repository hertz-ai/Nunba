"""set_window_tool_window keeps a window OFF the taskbar -- both halves.

THE LIVE FAILURE THIS ENCODES (2026-09-22, installed build, PID 47824):

    the companion window 0x35092A: hidden, exstyle 0x8090088
                                   (TOOLWINDOW|LAYERED|NOACTIVATE|TOPMOST)
    the shell's own taskbar button: "Nunba - 2 running windows"

The bit was set and the window was hidden, and the shell still held a tab
for it.  The tab was registered at pywebview's first show (``hidden=True``
shows the form once at opacity 0 before any caller can touch it, and
MEASURED on a never-shown form: WinForms rewrites the WHOLE extended style
on that Opacity change, so a tool-window bit set beforehand is gone by the
time the shell looks).  Hiding the window afterwards did not take the tab
away.  ``ITaskbarList::DeleteTab`` on that hidden window did, live:
"2 running windows" -> "1 running window".

So the helper sets the bit for every future show AND asks the shell to drop
the tab it already holds.  These tests pin both, in that order, and pin
that a shell which refuses leaves the style change standing.

    python -m pytest tests/test_taskbar_tab.py -q
"""
import contextlib
import ctypes
import logging

import pytest

from desktop import platform_utils, win32_com

GWL_EXSTYLE = -20
WS_EX_TOOLWINDOW = 0x00000080
WS_EX_APPWINDOW = 0x00040000
WS_EX_TOPMOST = 0x00000008

#: The extended style pywebview's form actually carries after its first
#: show: WinForms' own APPWINDOW, plus TOPMOST from on_top=True.
PYWEBVIEW_FORM_STYLE = WS_EX_APPWINDOW | WS_EX_TOPMOST

SLOT_HR_INIT, SLOT_DELETE_TAB = 3, 5
CLSID_TASKBAR_LIST_DATA1 = 0x56FDF344
IID_ITASKBAR_LIST_DATA1 = 0x56FDF342


class _User32:
    def __init__(self):
        self.style = PYWEBVIEW_FORM_STYLE
        self.written = []

    def GetWindowLongW(self, hwnd, idx):
        return self.style

    def SetWindowLongW(self, hwnd, idx, style):
        self.written.append(style)
        self.style = style
        return PYWEBVIEW_FORM_STYLE


@pytest.fixture
def user32(monkeypatch):
    """Win32 at the boundary, on every platform: the helper's own platform
    flag is forced on so the Linux and macOS CI legs test the same code."""
    fake = _User32()

    class _Windll:
        user32 = fake

    monkeypatch.setattr(platform_utils, 'IS_WINDOWS', True)
    monkeypatch.setattr(ctypes, 'windll', _Windll(), raising=False)
    return fake


@pytest.fixture
def shell(monkeypatch):
    """The shell's taskbar list, recorded: creation, each vtable call, and
    the release, in the order they happened."""
    log = []

    @contextlib.contextmanager
    def com_instance(clsid, iid):
        log.append(('create', clsid.Data1, iid.Data1))
        yield ctypes.c_void_p(0xC0FFEE)
        log.append(('release',))

    def vcall(interface, slot, restype, argtypes, *args):
        log.append(('call', slot, tuple(getattr(a, 'value', a) for a in args)))
        return 0

    monkeypatch.setattr(win32_com, 'com_instance', com_instance)
    monkeypatch.setattr(win32_com, 'vcall', vcall)
    return log


def test_tool_true_sets_the_bit_and_drops_the_tab_the_shell_holds(user32, shell):
    platform_utils.set_window_tool_window(1234, True)

    style = user32.written[-1]
    assert style & WS_EX_TOOLWINDOW, 'WS_EX_TOOLWINDOW missing'
    assert not style & WS_EX_APPWINDOW, 'WS_EX_APPWINDOW left set forces a tab'
    assert style & WS_EX_TOPMOST, 'an unrelated bit was cleared'

    assert [e[0] for e in shell] == ['create', 'call', 'call', 'release'], (
        'the shell must be asked exactly once: init, delete, release')
    assert shell[0][1:] == (CLSID_TASKBAR_LIST_DATA1, IID_ITASKBAR_LIST_DATA1)
    assert shell[1][1] == SLOT_HR_INIT, 'ITaskbarList::HrInit comes first'
    assert shell[2][1] == SLOT_DELETE_TAB
    assert shell[2][2] == (1234,), 'DeleteTab must name THIS window'


def test_the_style_is_written_before_the_shell_is_asked(user32, shell):
    """Order: the bit first, so the tab the shell drops is not immediately
    recreated by a show that races the call."""
    order = []
    original = user32.SetWindowLongW

    def set_style(hwnd, idx, style):
        order.append('style')
        return original(hwnd, idx, style)

    user32.SetWindowLongW = set_style
    real_vcall = win32_com.vcall

    def vcall(*a, **k):
        order.append('shell')
        return real_vcall(*a, **k)

    win32_com.vcall = vcall
    try:
        platform_utils.set_window_tool_window(1234, True)
    finally:
        win32_com.vcall = real_vcall

    assert order == ['style', 'shell', 'shell']


def test_tool_false_restores_the_app_window_and_leaves_the_shell_alone(user32, shell):
    user32.style = WS_EX_TOOLWINDOW | WS_EX_TOPMOST

    platform_utils.set_window_tool_window(1234, False)

    style = user32.written[-1]
    assert style & WS_EX_APPWINDOW and not style & WS_EX_TOOLWINDOW
    assert shell == [], 'a window going BACK on the taskbar needs no DeleteTab'


def test_a_shell_that_refuses_leaves_the_style_change_standing(
        user32, monkeypatch, caplog):
    """The bit is what stops the NEXT show creating a tab; a shell that
    will not drop the current one must not undo that, and must be named."""
    @contextlib.contextmanager
    def refusing(clsid, iid):
        raise OSError('[WinError -2147221008] CoInitialize has not been called')
        yield  # noqa: unreachable, keeps it a generator

    monkeypatch.setattr(win32_com, 'com_instance', refusing)

    with caplog.at_level(logging.WARNING, logger='NunbaPlatform'):
        platform_utils.set_window_tool_window(1234, True)

    assert user32.written and user32.written[-1] & WS_EX_TOOLWINDOW
    assert 'taskbar tab' in caplog.text


def test_off_windows_nothing_is_touched(monkeypatch, shell):
    monkeypatch.setattr(platform_utils, 'IS_WINDOWS', False)
    platform_utils.set_window_tool_window(1234, True)
    assert shell == []


def test_source_guard_the_tool_window_helper_is_the_only_taskbar_list_caller():
    """DeleteTab has ONE caller.  A second would be a second answer to
    "how does a window leave the taskbar", the parallel path this file's
    docstring is a warning about."""
    import pathlib
    desktop = pathlib.Path(platform_utils.__file__).parent
    owners = sorted(p.name for p in desktop.glob('*.py')
                    if '0x56FDF344' in p.read_text(encoding='utf-8'))
    assert owners == ['platform_utils.py'], (
        f'CLSID_TaskbarList appeared in {owners}')
