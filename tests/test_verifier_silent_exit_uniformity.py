"""#213 — audit + pin the silent-exit contract uniformly across all
6 verified_*.py modules.

The #212 fix added 3 synthetic-sidecar paths to verified_synth.py's
_probe_backend_for_error.  The audit question was: do the 5 sibling
verifiers (verified_llm / verified_stt / verified_vlm /
verified_audio_gen / verified_video_gen) have the same class of bug?

Audit verdict: NO.  The 5 siblings don't use _probe_backend_for_error
(it's TTS-specific because TTS has a per-engine ._backends dict with
multiple instances).  Each sibling instead calls the engine method
directly and surfaces errors via box['err'].  Each of them ALREADY
catches the canonical silent-exit failures:

  verified_llm.py:97-99      "empty content"
  verified_stt.py:83-90      "empty transcript"
  verified_vlm.py:66-69      "empty response"
  verified_audio_gen.py:48-54  "audio too small" / "no file"
  verified_video_gen.py:46-52  "video too small" / "no file"

This test PINS the contract uniformly: when given a broken engine
that returns None / empty / a tiny file, each verifier must:
  (a) return ok=False
  (b) populate err with a non-empty diagnostic string

A regression here means someone introduced a silent-exit path in
one of the siblings — same shape as the #212 TTS bug.
"""
import os
import sys
import tempfile
import unittest

# Add the tts/ dir to sys.path so the verified_*.py modules are importable.
_TTS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'tts'))
if _TTS_DIR not in sys.path:
    sys.path.insert(0, _TTS_DIR)


class _SilentBrokenEngine:
    """Engine that returns None from every probe method without raising."""

    def query(self, *_a, **_kw): return None
    def caption(self, *_a, **_kw): return None
    def transcribe(self, *_a, **_kw): return None
    def generate(self, *_a, **_kw): return None
    def synthesize(self, *_a, **_kw): return None


class _EmptyStringEngine:
    """Engine that returns empty strings (more subtle than None — a
    string is truthy as a return value but empty by content)."""

    def query(self, *_a, **_kw): return ""
    def caption(self, *_a, **_kw): return ""
    def transcribe(self, *_a, **_kw): return ""


class VerifierSilentExitTests(unittest.TestCase):

    def test_verified_llm_empty_content_fails_with_err(self):
        """verify_llm with unreachable endpoint → ok=False + non-empty err."""
        from verified_llm import verify_llm
        result = verify_llm(endpoint='http://127.0.0.1:1', timeout_s=2)
        self.assertFalse(result.ok)
        self.assertTrue(
            result.err,
            f"verify_llm with unreachable endpoint must populate err "
            f"(got {result.err!r})"
        )

    def test_verified_stt_empty_transcript_fails_with_err(self):
        """verify_stt with broken engine → ok=False + 'empty transcript' err."""
        from verified_stt import verify_stt
        result = verify_stt(_EmptyStringEngine(), timeout_s=5)
        self.assertFalse(result.ok)
        self.assertIn('empty transcript', result.err.lower())

    def test_verified_stt_none_transcript_fails_with_err(self):
        """verify_stt with engine returning None → ok=False + non-empty err."""
        from verified_stt import verify_stt
        result = verify_stt(_SilentBrokenEngine(), timeout_s=5)
        self.assertFalse(result.ok)
        self.assertTrue(result.err)

    def test_verified_vlm_empty_response_fails_with_err(self):
        """verify_vlm with broken engine → ok=False + 'empty response' err."""
        from verified_vlm import verify_vlm
        result = verify_vlm(_EmptyStringEngine(), timeout_s=5)
        self.assertFalse(result.ok)
        self.assertIn('empty response', result.err.lower())

    def test_verified_vlm_none_response_fails_with_err(self):
        from verified_vlm import verify_vlm
        result = verify_vlm(_SilentBrokenEngine(), timeout_s=5)
        self.assertFalse(result.ok)
        self.assertTrue(result.err)

    def test_verified_audio_gen_no_file_fails_with_err(self):
        """verify_audio_gen with engine that returns None and writes
        nothing → ok=False + 'audio too small' or 'no file' err.  The
        existing mkstemp pre-creates a 0-byte file, so the bytes-check
        path catches it as 'audio too small (0B < 5000B)'."""
        from verified_audio_gen import verify_audio_gen
        result = verify_audio_gen(_SilentBrokenEngine(), timeout_s=5)
        self.assertFalse(result.ok)
        self.assertTrue(result.err)
        # Either "too small" (mkstemp 0-byte) or "no file" path
        self.assertTrue(
            'too small' in result.err.lower()
            or 'no file' in result.err.lower(),
            f"unexpected err: {result.err!r}"
        )

    def test_verified_video_gen_no_file_fails_with_err(self):
        """Same shape for video_gen."""
        from verified_video_gen import verify_video_gen
        result = verify_video_gen(_SilentBrokenEngine(), timeout_s=5)
        self.assertFalse(result.ok)
        self.assertTrue(result.err)
        self.assertTrue(
            'too small' in result.err.lower()
            or 'no file' in result.err.lower(),
            f"unexpected err: {result.err!r}"
        )

    def test_all_verifiers_export_Result_with_ok_field(self):
        """Uniformity check: every verifier exports a Result dataclass
        with .ok attribute (and __bool__ should reflect it)."""
        for modname in ('verified_synth', 'verified_llm', 'verified_stt',
                        'verified_vlm', 'verified_audio_gen',
                        'verified_video_gen'):
            mod = __import__(modname)
            self.assertTrue(
                hasattr(mod, 'Result'),
                f"{modname}.Result is missing — uniformity violation."
            )
            r = mod.Result(ok=False, **{
                'verified_synth':     {'n_bytes': 0, 'err': 'e', 'elapsed_s': 0.0},
                'verified_llm':       {'content': '',  'err': 'e', 'elapsed_s': 0.0},
                'verified_stt':       {'transcript': '', 'err': 'e', 'elapsed_s': 0.0},
                'verified_vlm':       {'response': '', 'err': 'e', 'elapsed_s': 0.0},
                'verified_audio_gen': {'n_bytes': 0, 'err': 'e', 'elapsed_s': 0.0},
                'verified_video_gen': {'n_bytes': 0, 'err': 'e', 'elapsed_s': 0.0},
            }[modname])
            self.assertFalse(bool(r),
                             f"{modname}.Result.__bool__ should mirror .ok")


if __name__ == '__main__':
    unittest.main()
