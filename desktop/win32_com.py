"""win32_com.py - the little COM this package needs, in one place.

Two callers reach a COM vtable by hand: ``desktop/glass.py`` (DirectComposition,
which has no .NET projection) and ``desktop/platform_utils.py`` (the shell's
``ITaskbarList``, to drop a taskbar tab the shell will not drop on its own).
Neither is a reason to depend on a COM library the frozen build does not
carry, and two hand-rolled vtable helpers are exactly the parallel path that
drifts -- so this is the one.

Everything here is Windows-only at CALL time and importable everywhere:
``ctypes.WinDLL`` is touched inside the functions, never at import.

The DLL handles are PRIVATE ``WinDLL`` objects, never ``ctypes.windll.*``:
argtypes stamped on the shared loader leak into every other caller in the
process (the c1a026f4 lesson, recorded in ``platform_utils._hwnd``).
"""
from __future__ import annotations

import contextlib
import ctypes
import logging

logger = logging.getLogger('NunbaWin32Com')

#: ``IUnknown`` occupies slots 0-2 of EVERY COM interface, so slot 2 is
#: Release whatever the object turns out to be.
SLOT_RELEASE = 2

#: CoInitializeEx: this thread joins a single-threaded apartment.  The
#: shell's objects and WebView2 both want one.
_COINIT_APARTMENTTHREADED = 0x2
#: CoCreateInstance: an in-process server, the only kind used here.
_CLSCTX_INPROC_SERVER = 0x1
#: CoInitializeEx's two success codes.  Anything else means the thread was
#: already initialised by someone else (RPC_E_CHANGED_MODE for the other
#: threading model), and then it is theirs to uninitialise, not ours.
_COINIT_OWNED = (0, 1)   # S_OK, S_FALSE


class GUID(ctypes.Structure):
    """A COM class or interface id, laid out as the Windows headers declare
    one."""

    _fields_ = [('Data1', ctypes.c_uint32),
                ('Data2', ctypes.c_uint16),
                ('Data3', ctypes.c_uint16),
                ('Data4', ctypes.c_ubyte * 8)]


def guid(data1: int, data2: int, data3: int, *tail: int) -> GUID:
    """A ``GUID`` from the groups a GUID is written in, left to right."""
    value = GUID()
    value.Data1, value.Data2, value.Data3 = data1, data2, data3
    for index, byte in enumerate(tail):
        value.Data4[index] = byte
    return value


def vcall(interface, slot: int, restype, argtypes, *args):
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


def release(interface) -> None:
    """``IUnknown::Release`` on ``interface``; a null pointer is a no-op."""
    if interface is None or not getattr(interface, 'value', None):
        return
    vcall(interface, SLOT_RELEASE, ctypes.c_ulong, [])


def _ole32():
    """A private ole32 handle with the two prototypes this module uses."""
    ole32 = ctypes.WinDLL('ole32', use_last_error=True)
    ole32.CoInitializeEx.restype = ctypes.c_long
    ole32.CoInitializeEx.argtypes = [ctypes.c_void_p, ctypes.c_uint]
    ole32.CoCreateInstance.restype = ctypes.HRESULT
    ole32.CoCreateInstance.argtypes = [
        ctypes.POINTER(GUID), ctypes.c_void_p, ctypes.c_uint,
        ctypes.POINTER(GUID), ctypes.POINTER(ctypes.c_void_p)]
    ole32.CoUninitialize.restype = None
    ole32.CoUninitialize.argtypes = []
    return ole32


@contextlib.contextmanager
def com_instance(clsid: GUID, iid: GUID):
    """An instance of ``clsid`` seen as ``iid``, on THIS thread, released on
    exit.

    The thread's apartment is initialised here when nothing has done so.
    That is not hypothetical: a pywebview event handler runs on a thread
    pywebview never initialised, and MEASURED 2026-09-22 CoCreateInstance
    from such a thread fails with CO_E_NOTINITIALIZED, while the same call
    after CoInitializeEx succeeds.  The apartment is uninitialised on exit
    ONLY if this call initialised it -- a thread someone else set up keeps
    what they gave it.

    Raises ``OSError`` (from the HRESULT restype) when the object cannot be
    made; the caller decides whether that is fatal.
    """
    ole32 = _ole32()
    owns_apartment = ole32.CoInitializeEx(None, _COINIT_APARTMENTTHREADED) in _COINIT_OWNED
    interface = ctypes.c_void_p()
    try:
        ole32.CoCreateInstance(ctypes.byref(clsid), None, _CLSCTX_INPROC_SERVER,
                               ctypes.byref(iid), ctypes.byref(interface))
        yield interface
    finally:
        try:
            release(interface)
        except Exception as e:
            logger.error('win32_com: releasing the instance failed: %s', e)
        if owns_apartment:
            ole32.CoUninitialize()
