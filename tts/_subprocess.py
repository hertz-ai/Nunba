"""Shared subprocess helpers for TTS modules."""
import subprocess
import sys


def hidden_startupinfo():
    """Return (startupinfo, creationflags) to suppress console windows on Windows.

    Usage:
        si, cf = hidden_startupinfo()
        subprocess.run(cmd, startupinfo=si, creationflags=cf, ...)
    """
    if sys.platform == 'win32':
        si = subprocess.STARTUPINFO()
        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        si.wShowWindow = 0
        return si, subprocess.CREATE_NO_WINDOW
    return None, 0
