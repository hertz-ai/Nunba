"""desktop/win32_com.py - one vtable helper, and an apartment it only ever
gives back if it took it.

The vtable test needs a real Windows calling convention (``WINFUNCTYPE``),
so it runs on Windows only; the apartment tests fake ole32 and run anywhere.

    python -m pytest tests/test_win32_com.py -q
"""
import ctypes
import sys
from unittest.mock import MagicMock

import pytest

from desktop import win32_com

S_OK, S_FALSE = 0, 1
RPC_E_CHANGED_MODE = -2147417850


class _FakeOle32:
    """ole32 as ``win32_com._ole32`` returns it: the three calls, recorded."""

    def __init__(self, init_result=S_OK, create_raises=None):
        self.init_result = init_result
        self.create_raises = create_raises
        self.calls = []

    def CoInitializeEx(self, reserved, coinit):
        self.calls.append(('CoInitializeEx', coinit))
        return self.init_result

    def CoCreateInstance(self, clsid, outer, clsctx, iid, out):
        self.calls.append(('CoCreateInstance', bytes(clsid._obj), clsctx,
                           bytes(iid._obj)))
        if self.create_raises:
            raise self.create_raises
        out._obj.value = 0xBEEF
        return S_OK

    def CoUninitialize(self):
        self.calls.append(('CoUninitialize',))


@pytest.fixture
def released(monkeypatch):
    seen = []
    monkeypatch.setattr(win32_com, 'release',
                        lambda iface: seen.append(getattr(iface, 'value', None)))
    return seen


def _guids():
    return (win32_com.guid(0x11111111, 0x2222, 0x3333, 1, 2, 3, 4, 5, 6, 7, 8),
            win32_com.guid(0x99999999, 0x8888, 0x7777, 8, 7, 6, 5, 4, 3, 2, 1))


# ── the vtable ─────────────────────────────────────────────────────────

@pytest.mark.skipif(sys.platform != 'win32', reason='needs WINFUNCTYPE')
def test_vcall_reaches_the_named_slot_with_this_and_the_arguments():
    """A hand-built COM object: an interface pointer to a vtable pointer to
    a table whose slot 3 is a real callback.  The helper must dereference
    twice, pass the interface pointer as ``this``, then the arguments."""
    seen = []
    proto = ctypes.WINFUNCTYPE(ctypes.c_long, ctypes.c_void_p, ctypes.c_int)

    def method(this, value):
        seen.append((this, value))
        return 42

    keep = proto(method)                      # must outlive the call
    table = (ctypes.c_void_p * 4)()
    table[3] = ctypes.cast(keep, ctypes.c_void_p).value
    vtable_pointer = ctypes.c_void_p(ctypes.addressof(table))
    interface = ctypes.c_void_p(ctypes.addressof(vtable_pointer))

    result = win32_com.vcall(interface, 3, ctypes.c_long, [ctypes.c_int], 7)

    assert result == 42
    assert seen == [(interface.value, 7)]


def test_release_is_a_no_op_on_a_null_pointer(monkeypatch):
    """A failed CoCreateInstance leaves a null out-pointer; releasing it
    must not dereference anything."""
    called = []
    monkeypatch.setattr(win32_com, 'vcall',
                        lambda *a, **k: called.append(a))
    win32_com.release(None)
    win32_com.release(ctypes.c_void_p())
    assert called == []


def test_release_calls_slot_two_of_a_live_pointer(monkeypatch):
    """IUnknown::Release is slot 2 on every interface."""
    called = []
    monkeypatch.setattr(win32_com, 'vcall',
                        lambda iface, slot, *a: called.append(slot))
    win32_com.release(ctypes.c_void_p(0x1234))
    assert called == [win32_com.SLOT_RELEASE] == [2]


# ── the apartment ──────────────────────────────────────────────────────

def test_it_creates_the_object_in_an_sta_and_releases_it_on_exit(
        monkeypatch, released):
    ole = _FakeOle32()
    monkeypatch.setattr(win32_com, '_ole32', lambda: ole)
    clsid, iid = _guids()

    with win32_com.com_instance(clsid, iid) as interface:
        assert interface.value == 0xBEEF
        assert released == [], 'released before the caller was done with it'

    assert released == [0xBEEF]
    kinds = [c[0] for c in ole.calls]
    assert kinds == ['CoInitializeEx', 'CoCreateInstance', 'CoUninitialize']
    assert ole.calls[0][1] == 0x2, 'not a single-threaded apartment'
    assert ole.calls[1][1] == bytes(clsid) and ole.calls[1][3] == bytes(iid)


def test_a_thread_someone_else_initialised_keeps_its_apartment(
        monkeypatch, released):
    """RPC_E_CHANGED_MODE: the thread is already in the other model.  The
    object can still be made, and uninitialising here would tear down an
    apartment that is not ours -- pywebview's UI thread, for instance."""
    ole = _FakeOle32(init_result=RPC_E_CHANGED_MODE)
    monkeypatch.setattr(win32_com, '_ole32', lambda: ole)

    with win32_com.com_instance(*_guids()) as interface:
        assert interface.value == 0xBEEF

    assert released == [0xBEEF]
    assert ('CoUninitialize',) not in ole.calls


def test_s_false_means_already_ours_and_is_balanced(monkeypatch, released):
    """S_FALSE: this thread was initialised in this model before.  COM
    counts initialisations, so this one is balanced with an uninitialise."""
    ole = _FakeOle32(init_result=S_FALSE)
    monkeypatch.setattr(win32_com, '_ole32', lambda: ole)

    with win32_com.com_instance(*_guids()):
        pass

    assert ('CoUninitialize',) in ole.calls


def test_a_refused_create_raises_and_still_balances_the_apartment(
        monkeypatch, released):
    ole = _FakeOle32(create_raises=OSError('[WinError -2147221164] Class not registered'))
    monkeypatch.setattr(win32_com, '_ole32', lambda: ole)

    with pytest.raises(OSError):
        with win32_com.com_instance(*_guids()):
            pytest.fail('the body must not run without an object')

    assert ('CoUninitialize',) in ole.calls
    assert released == [None], 'the null out-pointer went through release'


def test_the_private_ole32_handle_never_touches_the_shared_loader(monkeypatch):
    """``ctypes.windll`` is process-wide; prototypes stamped on it leak into
    every other caller (the c1a026f4 lesson).  The handle here must be a
    fresh ``WinDLL``."""
    made = []

    class _Dll:
        def __init__(self, name, use_last_error=False):
            made.append((name, use_last_error))
            self.CoInitializeEx = MagicMock()
            self.CoCreateInstance = MagicMock()
            self.CoUninitialize = MagicMock()

    monkeypatch.setattr(ctypes, 'WinDLL', _Dll, raising=False)
    shared = MagicMock()
    monkeypatch.setattr(ctypes, 'windll', shared, raising=False)

    win32_com._ole32()

    assert made == [('ole32', True)]
    assert not shared.mock_calls, 'the shared loader was touched'
