"""Skip markers for tests that exercise code which exists only on Windows.

desktop.win32_chrome builds ctypes.WINFUNCTYPE at import time, and that name
exists only on Windows.  A whole file of such tests skips itself at module
level (tests/test_win32_chrome_hittest.py, test_window_hwnd_resolver.py,
test_splash_ui.py); a file that ALSO holds tests that run everywhere marks just
the tests that import it, with this.  The Windows leg of CI still runs them.
"""
import sys
import unittest

needs_win32_chrome = unittest.skipUnless(
    sys.platform == 'win32',
    'Windows-only: desktop.win32_chrome needs ctypes.WINFUNCTYPE')
