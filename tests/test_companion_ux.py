"""test_companion_ux.py - Unit tests for companion window foreground
detection, window shape, live commentary relay and priority prompt steering.

The backdrop assertions are NOT here any more.  Making a floating window
see-through lives in desktop/glass.py, and so do its tests --
tests/test_glass.py.  This file kept a partial mirror of them until
2026-09-22 and the mirror went stale; the NOTE where it used to sit says
what moved where, and why a second copy was the wrong shape.
"""
import sys
import unittest
from unittest.mock import MagicMock, patch

import pytest


# NOTE: `TestWindowAcrylicBackdrop` used to live here, and it is GONE
# rather than moved aside.  It was a partial mirror of assertions that
# `tests/test_glass.py` already owns, and on 2026-09-22 the mirror went
# stale in the way a second copy always eventually does: two of its four
# tests still required the DWM system backdrop, which was WITHDRAWN from
# the app's own window after an A/B measured it painting a grey rectangle
# around a window the OS had been told was a 209x209 disc (+57.1/255 with
# it, +25.7/255 without).  A third had gone VACUOUS -- it asserted False
# for a refused backdrop and would now pass against a gutted function,
# because nothing asks any more.
#
# Where each assertion lives now, all in tests/test_glass.py:
#   the platform guard ...... test_the_dwm_is_not_touched_off_windows
#                             (moved here from this file, not deleted)
#   the withdrawal .......... test_an_uncomposable_window_is_never_given_
#                             the_system_backdrop
#   GL1's rung guard ........ test_a_window_that_cannot_be_composed_never_
#                             claims_native_glass
#
# What this file still owns is below: the companion's own UX -- foreground
# detection and window shape.


class TestSetWindowShapeBehavior(unittest.TestCase):
    """What `set_window_shape` does with a shape it cannot use.

    This class used to require that `shape=None` CLEARS the window region
    (SetWindowRgn(hwnd, 0)).  It does not, and has not since `_shape_box`
    became the one place a shape is interpreted: no box, no call, return
    False.  The test went stale rather than catching a defect, and it is
    corrected here to the contract the code actually has -- checked against
    the callers before changing sides, not after:

      * app.py:8217 is the ONLY production caller and it guards --
        `if _comp_hwnd and shape:` -- so it never passes None.
      * VoiceOrbPage's `shapeFor` never RETURNS null: 'shown' gets the
        full-viewport card rect and an unmeasurable orb box falls back to
        that same card.  So "clear the region" is expressed as "clip to the
        whole window", and the morph orb -> card re-shapes rather than
        unshaping.

    Which means no window is left wearing the orb's disc while the card is
    drawn -- the failure the old assertion would have been guarding, had
    anything ever called it that way.
    """

    @patch('desktop.platform_utils.IS_WINDOWS', True)
    def test_an_unusable_shape_touches_nothing_and_says_so(self):
        from desktop.platform_utils import set_window_shape
        mock_user32 = MagicMock()
        with patch('ctypes.windll.user32', mock_user32):
            self.assertFalse(set_window_shape(1001, None))
        mock_user32.SetWindowRgn.assert_not_called()

    @patch('desktop.platform_utils.IS_WINDOWS', True)
    def test_a_real_shape_clips_the_window_and_reports_it(self):
        """The other half, so the test above cannot pass by doing nothing.

        A function that always returned False and never called Win32 would
        satisfy the first test alone; this one fails unless a usable shape
        really does reach SetWindowRgn.
        """
        from desktop.platform_utils import set_window_shape
        mock_user32 = MagicMock()

        def client_rect(_hwnd, out):
            # GetClientRect writes THROUGH the pointer; a MagicMock that only
            # returns 1 leaves the RECT at 0x0, and a 0-sized client area is
            # exactly the "nothing to clip to" case the other test covers --
            # so the fixture has to fill it or this test passes for the wrong
            # reason (and it did fail that way first, 2026-09-22).
            out._obj.right, out._obj.bottom = 400, 600
            return 1

        mock_user32.GetClientRect.side_effect = client_rect
        mock_user32.SetWindowRgn.return_value = 1
        mock_gdi32 = MagicMock()
        mock_gdi32.CreateRoundRectRgn.return_value = 0xBEEF
        shape = {'x': 10, 'y': 20, 'w': 100, 'h': 100, 'r': 50,
                 'vw': 200, 'vh': 300}
        with patch('ctypes.windll.user32', mock_user32), \
                patch('ctypes.windll.gdi32', mock_gdi32):
            self.assertTrue(set_window_shape(1001, shape))
        self.assertTrue(mock_gdi32.CreateRoundRectRgn.called)
        self.assertEqual(0xBEEF, mock_user32.SetWindowRgn.call_args[0][1])


if __name__ == '__main__':
    unittest.main()
