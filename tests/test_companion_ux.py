"""test_companion_ux.py - Unit tests for companion window foreground detection,
the DWM backdrop, live commentary relay, and priority prompt steering.

The backdrop assertions moved with their code: making a floating window
see-through now lives in desktop/glass.py, and what used to be
platform_utils.enable_window_acrylic is one private step of its Windows
backend.  See TestWindowAcrylicBackdrop below.
"""
import sys
import unittest
from unittest.mock import patch, MagicMock
import pytest


class TestCompanionForegroundDetection(unittest.TestCase):
    """Verify is_main_window_foreground correctly distinguishes foreground vs background."""

    def test_non_windows_returns_false(self):
        with patch('desktop.platform_utils.IS_WINDOWS', False):
            from desktop.platform_utils import is_main_window_foreground
            self.assertFalse(is_main_window_foreground(12345))

    def test_invalid_or_none_handle_returns_false(self):
        from desktop.platform_utils import is_main_window_foreground
        self.assertFalse(is_main_window_foreground(None))
        self.assertFalse(is_main_window_foreground(0))

    @patch('desktop.platform_utils.IS_WINDOWS', True)
    def test_minimized_main_window_returns_false(self):
        from desktop.platform_utils import is_main_window_foreground
        mock_user32 = MagicMock()
        mock_user32.IsIconic.return_value = 1  # Minimized
        mock_user32.IsWindowVisible.return_value = 1
        with patch('ctypes.windll.user32', mock_user32):
            self.assertFalse(is_main_window_foreground(1001))

    @patch('desktop.platform_utils.IS_WINDOWS', True)
    def test_invisible_main_window_returns_false(self):
        from desktop.platform_utils import is_main_window_foreground
        mock_user32 = MagicMock()
        mock_user32.IsIconic.return_value = 0
        mock_user32.IsWindowVisible.return_value = 0  # Hidden
        with patch('ctypes.windll.user32', mock_user32):
            self.assertFalse(is_main_window_foreground(1001))

    @patch('desktop.platform_utils.IS_WINDOWS', True)
    def test_companion_in_foreground_does_not_classify_as_main_foreground(self):
        from desktop.platform_utils import is_main_window_foreground
        mock_user32 = MagicMock()
        mock_user32.IsIconic.return_value = 0
        mock_user32.IsWindowVisible.return_value = 1
        mock_user32.GetForegroundWindow.return_value = 2002  # companion hwnd
        mock_user32.GetAncestor.return_value = 2002
        with patch('ctypes.windll.user32', mock_user32):
            # Main is 1001, companion is 2002 -> returns False so companion is not closed while used
            self.assertFalse(is_main_window_foreground(1001, 2002))

    @patch('desktop.platform_utils.IS_WINDOWS', True)
    def test_main_in_foreground_returns_true(self):
        from desktop.platform_utils import is_main_window_foreground
        mock_user32 = MagicMock()
        mock_user32.IsIconic.return_value = 0
        mock_user32.IsWindowVisible.return_value = 1
        mock_user32.GetForegroundWindow.return_value = 1001  # main hwnd
        with patch('ctypes.windll.user32', mock_user32):
            self.assertTrue(is_main_window_foreground(1001, 2002))

    @patch('desktop.platform_utils.IS_WINDOWS', True)
    def test_other_app_in_foreground_returns_false(self):
        from desktop.platform_utils import is_main_window_foreground
        mock_user32 = MagicMock()
        mock_user32.IsIconic.return_value = 0
        mock_user32.IsWindowVisible.return_value = 1
        mock_user32.GetForegroundWindow.return_value = 9999  # Browser / IDE
        mock_user32.GetAncestor.return_value = 9999
        with patch('ctypes.windll.user32', mock_user32):
            self.assertFalse(is_main_window_foreground(1001, 2002))


class TestWindowAcrylicBackdrop(unittest.TestCase):
    """The DWM backdrop, at its new canonical home.

    `platform_utils.enable_window_acrylic` is GONE.  Making a floating
    window see-through has one home now, `desktop/glass.py`, and the DWM
    logic survives there as `_windows_dwm_material` -- demoted from a public
    helper whose `True` read like "this window is glass" to one best-effort
    STEP of the Windows backend.

    These assertions moved with it rather than being deleted, and one was
    ADDED that the old shape could not express: the DWM saying yes must NOT
    become a NATIVE_GLASS claim.  GL1 exists because an attempt read a Win32
    success return as glass, shipped (eedbb6c9), and was reverted (c003e069)
    once someone looked at the screen.
    """

    def _accepting_dwm(self):
        mock_dwmapi = MagicMock()
        mock_dwmapi.DwmSetWindowAttribute.return_value = 0
        mock_dwmapi.DwmExtendFrameIntoClientArea.return_value = 0
        return mock_dwmapi

    def test_non_windows_does_not_touch_the_dwm(self):
        from desktop.glass import GlassIntent, _windows_dwm_material
        with patch('desktop.platform_utils.IS_WINDOWS', False):
            self.assertFalse(_windows_dwm_material(12345, GlassIntent(opacity=0.8)))

    @patch('desktop.platform_utils.IS_WINDOWS', True)
    def test_the_dwm_backdrop_is_still_asked_for(self):
        from desktop.glass import GlassIntent, _windows_dwm_material
        with patch('ctypes.windll.dwmapi', self._accepting_dwm()):
            self.assertTrue(_windows_dwm_material(12345, GlassIntent(opacity=0.8)))

    @patch('desktop.platform_utils.IS_WINDOWS', True)
    def test_a_refused_backdrop_reports_false(self):
        from desktop.glass import GlassIntent, _windows_dwm_material
        refusing = MagicMock()
        refusing.DwmSetWindowAttribute.return_value = 1  # non-zero HRESULT
        with patch('ctypes.windll.dwmapi', refusing):
            self.assertFalse(_windows_dwm_material(12345, GlassIntent(opacity=0.8)))

    @patch('desktop.platform_utils.IS_WINDOWS', True)
    def test_the_dwm_saying_yes_is_not_a_glass_claim(self):
        """THE regression guard for GL1's reverted mistake.

        Everything the DWM could possibly accept, accepted -- and the window
        still must not be called NATIVE_GLASS, because GL1 measured this
        exact backdrop painting white behind WebView2.  It may appear in the
        diagnostic `steps`; it may never set the rung.
        """
        from desktop import glass
        applied_alpha = MagicMock()
        applied_alpha.GetWindowLongW.return_value = 0x00080000  # WS_EX_LAYERED
        applied_alpha.SetLayeredWindowAttributes.return_value = 1

        with patch('ctypes.windll.dwmapi', self._accepting_dwm()), \
                patch('ctypes.windll.user32', applied_alpha):
            result = glass.apply_glass(12345, glass.GlassIntent(opacity=0.8))

        self.assertIn('dwm_backdrop', result.steps)
        self.assertEqual(glass.LAYERED_ALPHA, result.rung)
        self.assertFalse(result.is_native)


class TestSetWindowShapeBehavior(unittest.TestCase):
    """Verify set_window_shape clears region for card/shown and sets region for orb."""

    @patch('desktop.platform_utils.IS_WINDOWS', True)
    def test_clears_region_when_shape_is_none(self):
        from desktop.platform_utils import set_window_shape
        mock_user32 = MagicMock()
        mock_user32.SetWindowRgn.return_value = 1
        with patch('ctypes.windll.user32', mock_user32):
            result = set_window_shape(1001, None)
            self.assertTrue(result)
            mock_user32.SetWindowRgn.assert_called_with(mock_user32.SetWindowRgn.call_args[0][0], 0, True)


if __name__ == '__main__':
    unittest.main()
