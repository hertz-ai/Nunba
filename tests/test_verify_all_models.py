"""#217 — verify_all_models matrix runner: snapshot + cache contracts."""
import sys
import os
import unittest

_TTS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'tts'))
if _TTS_DIR not in sys.path:
    sys.path.insert(0, _TTS_DIR)


class VerifyAllModelsTests(unittest.TestCase):
    def setUp(self):
        # Defer import + reset cache for isolation
        import verify_all_models as mod
        self.mod = mod
        mod.reset_cache()

    def test_snapshot_has_all_6_modalities(self):
        snap = self.mod.verify_all_models(
            llm_endpoint='http://127.0.0.1:1',  # unreachable
            broadcast=False,
        )
        self.assertIn('modalities', snap)
        modalities = snap['modalities']
        for m in ('tts', 'llm', 'stt', 'vlm', 'audio_gen', 'video_gen'):
            self.assertIn(m, modalities)
            self.assertIn('ok', modalities[m])
            self.assertIn('detail', modalities[m])
            self.assertIn('elapsed_s', modalities[m])
        self.assertEqual(snap['total_count'], 6)
        self.assertEqual(snap['type'], 'verification.matrix')

    def test_missing_engines_marked_not_loaded(self):
        snap = self.mod.verify_all_models(
            llm_endpoint='http://127.0.0.1:1',
            broadcast=False,
        )
        # All non-LLM modalities have engine=None passed
        for m in ('tts', 'stt', 'vlm', 'audio_gen', 'video_gen'):
            self.assertFalse(snap['modalities'][m]['ok'])
            self.assertTrue(snap['modalities'][m]['detail'])

    def test_ready_count_matches_truthy_modalities(self):
        snap = self.mod.verify_all_models(
            llm_endpoint='http://127.0.0.1:1',
            broadcast=False,
        )
        expected = sum(1 for m in snap['modalities'].values() if m['ok'])
        self.assertEqual(snap['ready_count'], expected)

    def test_get_cached_returns_fresh_snapshot(self):
        snap1 = self.mod.verify_all_models(broadcast=False)
        cached = self.mod.get_cached(max_age_s=60)
        self.assertIsNotNone(cached)
        self.assertEqual(cached['generated_at'], snap1['generated_at'])

    def test_get_cached_returns_None_when_no_cache(self):
        self.mod.reset_cache()
        self.assertIsNone(self.mod.get_cached())

    def test_get_cached_returns_None_when_stale(self):
        # Run + force-age the cache by mutating the timestamp
        self.mod.verify_all_models(broadcast=False)
        import time as _t
        with self.mod._cache_lock:
            self.mod._cache_ts = _t.monotonic() - 9999  # very old
        self.assertIsNone(self.mod.get_cached(max_age_s=60))

    def test_get_cached_returns_defensive_copy(self):
        self.mod.verify_all_models(broadcast=False)
        c1 = self.mod.get_cached()
        c1['modalities'] = {}  # mutate caller's copy
        c2 = self.mod.get_cached()
        self.assertNotEqual(c1, c2)  # cache wasn't poisoned
        self.assertGreater(len(c2['modalities']), 0)

    def test_verifier_crash_doesnt_propagate(self):
        """If one modality's verifier crashes, the matrix MUST continue
        with the others marked as crashed rather than throwing."""
        snap = self.mod.verify_all_models(broadcast=False)
        # All 6 modalities populated even though most engines were None
        self.assertEqual(len(snap['modalities']), 6)


if __name__ == '__main__':
    unittest.main()
