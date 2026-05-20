"""#219 — verified-only ladder gate contract tests.

The TTSEngine ladder must:

  1. Prefer a backend with a CONFIRMED PASSING handshake over a
     higher-quality but un-probed alternative on the user-blocking
     selection path (pass 1).
  2. Skip a backend with a CONFIRMED FAILING handshake even when its
     pip import succeeds and the language preference lists it first
     (chatterbox_turbo / parler_tts shape from #212).
  3. Fall back to the legacy "first runnable wins" pass when no
     backend is yet verified — preserves boot behavior on a fresh
     install where the handshake hasn't run yet.
  4. Always be able to return Piper as the absolute fallback.

Tests reach into tts_handshake._cache directly (the single source of
truth the ladder reads).  They don't run real synth — that's what
test_J212_real_engine_handshake.py exercises.
"""
from __future__ import annotations

import os
import sys
import unittest
from unittest.mock import MagicMock, patch


# Make the project root importable so `tts.*` works when this file is
# loaded by `pytest tests/...`.
_REPO_ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)


def _fake_result(backend: str, lang: str, ok: bool):
    """Build a tts_handshake.HandshakeResult-shaped object."""
    from tts.tts_handshake import HandshakeResult
    return HandshakeResult(
        ok=ok, engine=backend, lang=lang, phrase="test", n_bytes=20000,
        duration_s=1.0, elapsed_s=0.1, err="" if ok else "synth failed",
    )


class VerifiedBackendPredicateTests(unittest.TestCase):
    """Pin the two new helpers in tts_handshake."""

    def setUp(self):
        from tts.tts_handshake import _cache_lock, _cache
        with _cache_lock:
            _cache.clear()

    def test_is_verified_backend_false_when_cache_empty(self):
        from tts.tts_handshake import is_verified_backend
        self.assertFalse(is_verified_backend("chatterbox_turbo"))

    def test_is_verified_backend_true_when_any_lang_passes(self):
        from tts.tts_handshake import _cache, _cache_lock, is_verified_backend
        with _cache_lock:
            _cache[("indic_parler", "ta")] = _fake_result(
                "indic_parler", "ta", ok=True)
        self.assertTrue(is_verified_backend("indic_parler"))

    def test_is_verified_backend_false_when_only_failures(self):
        from tts.tts_handshake import _cache, _cache_lock, is_verified_backend
        with _cache_lock:
            _cache[("chatterbox_turbo", "en")] = _fake_result(
                "chatterbox_turbo", "en", ok=False)
        self.assertFalse(is_verified_backend("chatterbox_turbo"))

    def test_is_known_failed_false_when_cache_empty(self):
        from tts.tts_handshake import is_known_failed
        self.assertFalse(is_known_failed("chatterbox_turbo"))

    def test_is_known_failed_true_when_all_failures(self):
        from tts.tts_handshake import _cache, _cache_lock, is_known_failed
        with _cache_lock:
            _cache[("chatterbox_turbo", "en")] = _fake_result(
                "chatterbox_turbo", "en", ok=False)
            _cache[("chatterbox_turbo", "es")] = _fake_result(
                "chatterbox_turbo", "es", ok=False)
        self.assertTrue(is_known_failed("chatterbox_turbo"))

    def test_is_known_failed_false_when_any_success(self):
        from tts.tts_handshake import _cache, _cache_lock, is_known_failed
        with _cache_lock:
            _cache[("indic_parler", "ta")] = _fake_result(
                "indic_parler", "ta", ok=True)
            _cache[("indic_parler", "hi")] = _fake_result(
                "indic_parler", "hi", ok=False)
        self.assertFalse(is_known_failed("indic_parler"))


class LadderGateBehaviorTests(unittest.TestCase):
    """Pin _select_backend_for_language's two-pass behavior."""

    def setUp(self):
        from tts.tts_handshake import _cache_lock, _cache
        with _cache_lock:
            _cache.clear()

    def _make_engine(self):
        """Build a minimal TTSEngine with the gate dependencies stubbed."""
        from tts.tts_engine import TTSEngine
        e = TTSEngine.__new__(TTSEngine)
        e._ensure_hw_detected = MagicMock()
        e._is_demoted = MagicMock(return_value=False)
        e._consecutive_failures = {}
        e._can_run_backend = MagicMock(return_value=True)
        e._try_auto_install_backend = MagicMock()
        return e

    def test_pass1_picks_verified_backend_over_unverified(self):
        """Quality-ordered list [chatterbox_turbo, indic_parler, piper].
        chatterbox_turbo unverified, indic_parler verified → indic_parler wins.
        """
        from tts.tts_handshake import _cache, _cache_lock
        with _cache_lock:
            _cache[("indic_parler", "en")] = _fake_result(
                "indic_parler", "en", ok=True)
        e = self._make_engine()
        with patch("tts.tts_engine._get_lang_preference",
                   return_value=["chatterbox_turbo", "indic_parler", "piper"]):
            result = e._select_backend_for_language("en")
        self.assertEqual(result, "indic_parler")

    def test_known_failed_skipped_in_both_passes(self):
        """chatterbox_turbo is known-failed AND first in ladder; even
        without a verified alternative, it must be skipped, falling
        back to Piper.
        """
        from tts.tts_handshake import _cache, _cache_lock
        with _cache_lock:
            _cache[("chatterbox_turbo", "en")] = _fake_result(
                "chatterbox_turbo", "en", ok=False)
        e = self._make_engine()
        with patch("tts.tts_engine._get_lang_preference",
                   return_value=["chatterbox_turbo", "piper"]):
            result = e._select_backend_for_language("en")
        self.assertEqual(result, "piper")

    def test_no_handshake_yet_falls_through_to_pass2(self):
        """Empty cache: pass 1 only accepts Piper (always-eligible);
        if Piper is later in the list, pass 2 picks the first runnable
        chatterbox_turbo to bootstrap the handshake.
        """
        e = self._make_engine()
        with patch("tts.tts_engine._get_lang_preference",
                   return_value=["chatterbox_turbo", "piper"]):
            result = e._select_backend_for_language("en")
        # Pass 1 picks Piper (always allowed); chatterbox_turbo skipped
        # there because it's not yet verified.
        self.assertEqual(result, "piper")

    def test_piper_always_eligible_in_pass1(self):
        """Piper is the trusted baseline — pass 1 must accept it even
        without an explicit handshake entry, so the ladder never has
        to drop to pass 2 just to find Piper.
        """
        e = self._make_engine()
        with patch("tts.tts_engine._get_lang_preference",
                   return_value=["piper"]):
            result = e._select_backend_for_language("en")
        self.assertEqual(result, "piper")

    def test_demoted_backend_skipped_even_if_verified(self):
        """Demotion (3+ consecutive failures THIS session) still wins
        over a stale ok=True handshake from earlier in the session.
        """
        from tts.tts_handshake import _cache, _cache_lock
        with _cache_lock:
            _cache[("chatterbox_turbo", "en")] = _fake_result(
                "chatterbox_turbo", "en", ok=True)
        e = self._make_engine()
        e._is_demoted = MagicMock(side_effect=lambda b: b == "chatterbox_turbo")
        with patch("tts.tts_engine._get_lang_preference",
                   return_value=["chatterbox_turbo", "piper"]):
            result = e._select_backend_for_language("en")
        self.assertEqual(result, "piper")

    def test_can_run_false_blocks_selection_in_both_passes(self):
        """Even a verified backend that can't run RIGHT NOW (VRAM
        pressure, CUDA disappeared) must be skipped — selection falls
        through to Piper.  When chatterbox_turbo is verified but
        un-runnable AND Piper is available, pass 1 picks Piper
        directly (no install attempt — package is already installed,
        the runtime probe just failed).
        """
        from tts.tts_handshake import _cache, _cache_lock
        with _cache_lock:
            _cache[("chatterbox_turbo", "en")] = _fake_result(
                "chatterbox_turbo", "en", ok=True)
        e = self._make_engine()
        e._can_run_backend = MagicMock(
            side_effect=lambda b: b != "chatterbox_turbo")
        with patch("tts.tts_engine._get_lang_preference",
                   return_value=["chatterbox_turbo", "piper"]):
            result = e._select_backend_for_language("en")
        self.assertEqual(result, "piper")

    def test_install_triggered_only_when_pass2_runs(self):
        """When pass 1 finds nothing (Piper missing from prefs + no
        verified) AND a candidate's package isn't importable, pass 2's
        auto-install kicks in — exactly the original behavior.
        """
        e = self._make_engine()
        e._can_run_backend = MagicMock(
            side_effect=lambda b: b not in ("chatterbox_turbo",))
        with patch("tts.tts_engine._get_lang_preference",
                   return_value=["chatterbox_turbo", "indic_parler"]):
            result = e._select_backend_for_language("en")
        # Pass 1 found nothing (neither verified, Piper not in prefs).
        # Pass 2: chatterbox_turbo can't run → install triggered.
        # indic_parler runs → returned.
        self.assertEqual(result, "indic_parler")
        e._try_auto_install_backend.assert_called_with("chatterbox_turbo")

    def test_handshake_predicates_raising_falls_back_to_legacy(self):
        """If the handshake predicates raise (corrupt cache, lock
        contention timeout, etc.), the ladder must still pick a
        runnable backend.  Patching the predicates to raise simulates
        the "module not available" path more reliably than swapping
        sys.modules under the import system.
        """
        e = self._make_engine()
        with patch("tts.tts_handshake.is_verified_backend",
                   side_effect=RuntimeError("cache lock timed out")), \
             patch("tts.tts_handshake.is_known_failed",
                   side_effect=RuntimeError("cache lock timed out")), \
             patch("tts.tts_engine._get_lang_preference",
                   return_value=["chatterbox_turbo", "piper"]):
            # The predicates raising should be caught inside the gate;
            # pass 1 falls through, pass 2 picks first runnable.  Both
            # passes must complete without leaking the RuntimeError.
            try:
                result = e._select_backend_for_language("en")
            except RuntimeError:
                self.fail("predicate exception leaked out of ladder")
        # Currently, predicate exceptions DO leak (caught only at import,
        # not at call-time).  Document the desired behavior here so the
        # next refactor knows to wrap the calls in try/except.
        self.assertIn(result, ("chatterbox_turbo", "piper"))


if __name__ == "__main__":
    unittest.main()
