"""Is a directory writable only by this user and the machine's own accounts?

The ONE answer for any directory Nunba puts on a worker's sys.path or DLL
search path from outside the user's profile.  python-embed's startup hook
(scripts/rebuild_python_embed.SITECUSTOMIZE_SOURCE) runs this module's
source in every worker, embedded verbatim (it has no import path of its own
yet); tts._torch_probe and tts.package_installer import it.

Why (review of efab9501, SECURITY): the hook put D:\\.nunba\\site-packages
at sys.path[0] and its nvidia\\*\\bin dirs on PATH for every worker.  The
default ACL of a non-system drive root lets every authenticated user create
a folder there and grants them Modify on what is inside (measured on this
box: D:\\.nunba owned by BUILTIN\\Administrators, NT AUTHORITY\\Authenticated
Users: Modify, inherited).  Anyone who can log on could then plant a module
or DLL that every worker loads.  The install writes there only when C: is
full (install_gpu_torch), so the fallback stays, but only for a directory
this check calls private, which make_private_dir creates.

Trusted: the current user, SYSTEM, Administrators, TrustedInstaller, and the
CREATOR OWNER / OWNER RIGHTS placeholders (they stand for whoever could
already create or owns the object).  Private means the owner is trusted and
no ALLOW entry grants a write right (including one only inherited by
children) to anyone else; a NULL DACL is not private.  Any failure to read
the security information is "not private".  Standard library only (os, sys,
ctypes, subprocess).
"""
import os
import sys

_TRUSTED_SIDS = frozenset({
    'S-1-5-18',                       # SYSTEM
    'S-1-5-32-544',                   # BUILTIN\Administrators
    'S-1-3-0',                        # CREATOR OWNER
    'S-1-3-4',                        # OWNER RIGHTS
    'S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464',  # TrustedInstaller
})

# Rights that let a holder add, replace or re-permission what the directory
# holds: add file / add subdirectory, delete child, delete, write DAC,
# write owner, generic write, generic all.
_WRITE_MASK = (0x2 | 0x4 | 0x40 | 0x10000 | 0x40000 | 0x80000
               | 0x40000000 | 0x10000000)
_ALLOW_ACE_TYPES = (0, 9)             # ACCESS_ALLOWED, ACCESS_ALLOWED_CALLBACK


_API = {}


def _api():
    """advapi32 / kernel32 with every signature declared (64-bit handles and
    pointers must not be squeezed through ctypes' default int)."""
    if _API:
        return _API
    import ctypes
    from ctypes import wintypes
    a = ctypes.WinDLL('advapi32', use_last_error=True)
    k = ctypes.WinDLL('kernel32', use_last_error=True)
    PV = ctypes.c_void_p
    k.GetCurrentProcess.restype = wintypes.HANDLE
    k.GetCurrentProcess.argtypes = []
    k.CloseHandle.argtypes = [wintypes.HANDLE]
    k.LocalFree.restype = PV
    k.LocalFree.argtypes = [PV]
    a.OpenProcessToken.argtypes = [wintypes.HANDLE, wintypes.DWORD,
                                   ctypes.POINTER(wintypes.HANDLE)]
    a.GetTokenInformation.argtypes = [wintypes.HANDLE, ctypes.c_int, PV,
                                      wintypes.DWORD,
                                      ctypes.POINTER(wintypes.DWORD)]
    a.ConvertSidToStringSidW.argtypes = [PV, ctypes.POINTER(wintypes.LPWSTR)]
    a.GetNamedSecurityInfoW.restype = wintypes.DWORD
    a.GetNamedSecurityInfoW.argtypes = [
        wintypes.LPCWSTR, ctypes.c_int, wintypes.DWORD,
        ctypes.POINTER(PV), ctypes.POINTER(PV), ctypes.POINTER(PV),
        ctypes.POINTER(PV), ctypes.POINTER(PV)]
    a.GetAclInformation.argtypes = [PV, PV, wintypes.DWORD, ctypes.c_int]
    a.GetAce.argtypes = [PV, wintypes.DWORD, ctypes.POINTER(PV)]
    _API.update(ctypes=ctypes, wintypes=wintypes, a=a, k=k)
    return _API


def _current_user_sid():
    """This process's user SID as a string (Windows), or None."""
    api = _api()
    ctypes, wintypes, a, k = api['ctypes'], api['wintypes'], api['a'], api['k']
    token = wintypes.HANDLE()
    if not a.OpenProcessToken(k.GetCurrentProcess(), 0x8, ctypes.byref(token)):
        return None
    try:
        size = wintypes.DWORD()
        a.GetTokenInformation(token, 1, None, 0, ctypes.byref(size))
        buf = ctypes.create_string_buffer(size.value)
        if not a.GetTokenInformation(token, 1, buf, size, ctypes.byref(size)):
            return None
        sid = ctypes.cast(buf, ctypes.POINTER(ctypes.c_void_p))[0]
        return _sid_string(sid)
    finally:
        k.CloseHandle(token)


def _sid_string(psid):
    api = _api()
    ctypes, wintypes, a, k = api['ctypes'], api['wintypes'], api['a'], api['k']
    out = wintypes.LPWSTR()
    if not a.ConvertSidToStringSidW(psid, ctypes.byref(out)):
        return None
    try:
        return out.value
    finally:
        k.LocalFree(ctypes.cast(out, ctypes.c_void_p))


def _windows_is_private(path):
    api = _api()
    ctypes, wintypes, a, k = api['ctypes'], api['wintypes'], api['a'], api['k']
    me = _current_user_sid()
    if not me:
        return False
    trusted = _TRUSTED_SIDS | {me}
    owner = ctypes.c_void_p()
    dacl = ctypes.c_void_p()
    sd = ctypes.c_void_p()
    # SE_FILE_OBJECT, OWNER_SECURITY_INFORMATION | DACL_SECURITY_INFORMATION
    rc = a.GetNamedSecurityInfoW(path, 1, 0x1 | 0x4, ctypes.byref(owner),
                                 None, ctypes.byref(dacl), None,
                                 ctypes.byref(sd))
    if rc != 0:
        return False
    try:
        if not owner.value or _sid_string(owner.value) not in trusted:
            return False
        if not dacl.value:                       # NULL DACL: everyone, full
            return False

        class _AclSize(ctypes.Structure):
            _fields_ = [('AceCount', wintypes.DWORD),
                        ('AclBytesInUse', wintypes.DWORD),
                        ('AclBytesFree', wintypes.DWORD)]

        info = _AclSize()
        if not a.GetAclInformation(dacl.value, ctypes.byref(info),
                                   ctypes.sizeof(info), 2):
            return False
        for i in range(info.AceCount):
            ace = ctypes.c_void_p()
            if not a.GetAce(dacl.value, i, ctypes.byref(ace)):
                return False
            ace_type = ctypes.cast(ace, ctypes.POINTER(ctypes.c_ubyte))[0]
            if ace_type not in _ALLOW_ACE_TYPES:
                continue                         # a DENY entry only removes
            mask = ctypes.cast(ace.value + 4,
                               ctypes.POINTER(wintypes.DWORD))[0]
            if not mask & _WRITE_MASK:
                continue
            if _sid_string(ace.value + 8) not in trusted:
                return False
        return True
    finally:
        k.LocalFree(sd)


def is_private_dir(path):
    """True when ``path`` is a directory that only this user and the
    machine's own accounts can write into (see the module docstring).
    Never raises: anything it cannot establish is False."""
    try:
        if not os.path.isdir(path):
            return False
        if sys.platform == 'win32':
            return _windows_is_private(path)
        st = os.stat(path)
        return st.st_uid == os.getuid() and not st.st_mode & 0o022
    except Exception:
        return False


def make_private_dir(path):
    """Create ``path`` (and its parents) and make the top directory Nunba
    creates private: on Windows, inheritance removed and full control for
    this user, SYSTEM and Administrators only (icacls, by SID so it does not
    depend on the language of account names).  Returns is_private_dir(path)
    afterwards, so a directory that could not be secured reads False and is
    not used.  Never raises."""
    try:
        os.makedirs(path, exist_ok=True)
        if sys.platform != 'win32':
            os.chmod(path, 0o700)
            return is_private_dir(path)
        me = _current_user_sid()
        if not me:
            return False
        import subprocess
        flags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
        subprocess.run(
            ['icacls', path, '/inheritance:r',
             '/grant:r', f'*{me}:(OI)(CI)F',
             '/grant:r', '*S-1-5-18:(OI)(CI)F',
             '/grant:r', '*S-1-5-32-544:(OI)(CI)F'],
            capture_output=True, text=True, timeout=30, creationflags=flags)
        return is_private_dir(path)
    except Exception:
        return False
