"""#214 — verified_embedding.py contract tests."""
import math
import os
import sys
import unittest

_TTS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'tts'))
if _TTS_DIR not in sys.path:
    sys.path.insert(0, _TTS_DIR)


class _GoodEmbedder:
    """Returns vectors with cosine ~0.95 — the known-similar pair test passes."""
    def embed(self, text):
        if 'hello' in text or 'hi' in text:
            return [0.9, 0.1, 0.4, 0.5]
        return [0.0, 0.1, 0.4, 0.5]


class _CollapsedEmbedder:
    """All-zero vectors — the bug class verified_embedding exists to catch."""
    def embed(self, text):
        return [0.0, 0.0, 0.0, 0.0]


class _DimMismatchEmbedder:
    def embed(self, text):
        if text == 'hello world':
            return [0.1, 0.2, 0.3]
        return [0.1, 0.2, 0.3, 0.4, 0.5]


class _OrthogonalEmbedder:
    """Returns orthogonal vectors — cosine = 0, fails similarity floor."""
    def embed(self, text):
        if text == 'hello world':
            return [1.0, 0.0]
        return [0.0, 1.0]


class _CrashingEmbedder:
    def embed(self, text):
        raise RuntimeError("model crashed")


class _SentenceTransformersAlias:
    """Uses .encode() instead of .embed() — common pattern."""
    def encode(self, text):
        return [0.9, 0.1, 0.4, 0.5] if 'hello' in text or 'hi' in text else [0.1, 0.0, 0.0, 0.0]


class VerifiedEmbeddingTests(unittest.TestCase):
    def test_high_similarity_pair_passes(self):
        from verified_embedding import verify_embedding
        r = verify_embedding(_GoodEmbedder(), timeout_s=5)
        self.assertTrue(r.ok, f"err={r.err}, sim={r.similarity}")
        self.assertEqual(r.dim, 4)
        self.assertGreaterEqual(r.similarity, 0.5)

    def test_orthogonal_pair_fails(self):
        from verified_embedding import verify_embedding
        r = verify_embedding(_OrthogonalEmbedder(), timeout_s=5)
        self.assertFalse(r.ok)
        self.assertIn('cosine', r.err.lower())

    def test_collapsed_vectors_fail(self):
        """All-zero vectors → similarity 0 (clamped) → fails floor."""
        from verified_embedding import verify_embedding
        r = verify_embedding(_CollapsedEmbedder(), timeout_s=5)
        self.assertFalse(r.ok)
        self.assertTrue(r.err)

    def test_dim_mismatch_caught(self):
        from verified_embedding import verify_embedding
        r = verify_embedding(_DimMismatchEmbedder(), timeout_s=5)
        self.assertFalse(r.ok)
        self.assertIn('dimension mismatch', r.err.lower())

    def test_engine_crash_caught(self):
        from verified_embedding import verify_embedding
        r = verify_embedding(_CrashingEmbedder(), timeout_s=5)
        self.assertFalse(r.ok)
        self.assertIn('RuntimeError', r.err)

    def test_sentence_transformers_alias(self):
        """Engines exposing .encode() instead of .embed() are supported."""
        from verified_embedding import verify_embedding
        r = verify_embedding(_SentenceTransformersAlias(), timeout_s=5)
        self.assertTrue(r.ok)


if __name__ == '__main__':
    unittest.main()
