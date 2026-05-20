"""#216 — verified_diarization.py contract tests."""
import os
import sys
import unittest

_TTS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'tts'))
if _TTS_DIR not in sys.path:
    sys.path.insert(0, _TTS_DIR)


class _GoodDiarizer:
    """Returns 4 turns across 2 speakers — passes the default floor."""
    def diarize(self, audio_bytes):
        return [
            {'speaker': 'A', 'start': 0.0, 'end': 1.0},
            {'speaker': 'B', 'start': 1.0, 'end': 2.0},
            {'speaker': 'A', 'start': 2.0, 'end': 3.0},
            {'speaker': 'B', 'start': 3.0, 'end': 4.0},
        ]


class _UnderSegmenter:
    """Emits 0 turns — the silent-failure case."""
    def diarize(self, audio_bytes):
        return []


class _SingleSpeakerCollapse:
    """4 turns but all the same speaker — speaker-count collapse."""
    def diarize(self, audio_bytes):
        return [
            {'speaker': 'A', 'start': 0.0, 'end': 1.0},
            {'speaker': 'A', 'start': 1.0, 'end': 2.0},
            {'speaker': 'A', 'start': 2.0, 'end': 3.0},
            {'speaker': 'A', 'start': 3.0, 'end': 4.0},
        ]


class _DictShape:
    """Engine returns {turns: [...]} dict shape."""
    def diarize(self, audio_bytes):
        return {
            'turns': [
                {'speaker': 'X'},
                {'speaker': 'Y'},
            ]
        }


class _PyannoteShape:
    """Pyannote-style: iterable of (segment, _, label) tuples."""
    def diarize(self, audio_bytes):
        return [
            ('seg1', None, 'SPEAKER_00'),
            ('seg2', None, 'SPEAKER_01'),
            ('seg3', None, 'SPEAKER_00'),
        ]


class _CallableEngine:
    """Engine exposed via __call__ (no .diarize attr)."""
    def __call__(self, audio_bytes):
        return [
            {'speaker': 'A'},
            {'speaker': 'B'},
        ]


class _CrashingDiarizer:
    def diarize(self, audio_bytes):
        raise RuntimeError("model crashed")


class VerifiedDiarizationTests(unittest.TestCase):
    def test_good_2speaker_4turn_passes(self):
        from verified_diarization import verify_diarization
        r = verify_diarization(_GoodDiarizer(), timeout_s=5)
        self.assertTrue(r.ok)
        self.assertEqual(r.n_turns, 4)
        self.assertEqual(r.n_speakers, 2)

    def test_under_segmentation_fails(self):
        from verified_diarization import verify_diarization
        r = verify_diarization(_UnderSegmenter(), timeout_s=5)
        self.assertFalse(r.ok)
        self.assertIn('under-segmentation', r.err.lower())

    def test_speaker_collapse_fails(self):
        from verified_diarization import verify_diarization
        r = verify_diarization(_SingleSpeakerCollapse(), timeout_s=5)
        self.assertFalse(r.ok)
        self.assertIn('collapse', r.err.lower())

    def test_dict_output_shape_supported(self):
        from verified_diarization import verify_diarization
        r = verify_diarization(_DictShape(), timeout_s=5)
        self.assertTrue(r.ok)
        self.assertEqual(r.n_turns, 2)
        self.assertEqual(r.n_speakers, 2)

    def test_pyannote_tuple_shape_supported(self):
        from verified_diarization import verify_diarization
        r = verify_diarization(_PyannoteShape(), timeout_s=5)
        self.assertTrue(r.ok)
        self.assertEqual(r.n_turns, 3)
        self.assertEqual(r.n_speakers, 2)

    def test_callable_engine_supported(self):
        from verified_diarization import verify_diarization
        r = verify_diarization(_CallableEngine(), timeout_s=5)
        self.assertTrue(r.ok)

    def test_engine_crash_caught(self):
        from verified_diarization import verify_diarization
        r = verify_diarization(_CrashingDiarizer(), timeout_s=5)
        self.assertFalse(r.ok)
        self.assertIn('RuntimeError', r.err)


if __name__ == '__main__':
    unittest.main()
