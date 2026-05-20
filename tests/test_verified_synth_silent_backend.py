"""#212 — verified_synth.py deep-probe must NOT silently exit when the
backend returns None instead of raising.

Three under-diagnosed exit paths previously left the .err sidecar stale,
making "synthesize returned no path" un-triageable:

  (a) engine._backends has no entry AND _create_backend returns None
  (b) engine has no _create_backend method
  (c) inst.synthesize() returns None / produces no audio without raising

Each path now writes a synthetic sidecar entry naming the failure mode.
This test pins that behaviour.
"""
import os
import tempfile
import unittest

from tts import verified_synth


class _StubBackend:
    """Backend that silently returns None from synthesize() — the
    post-#86 chatterbox-turbo failure mode: worker boots, accepts the
    call, but the impl has an internal try/except swallowing the real
    error and returning None instead of raising.
    """

    def synthesize(self, text, output_path, language=None, **kwargs):
        # Don't even create the file — pure silent failure.
        return None


class _StubEngine:
    def __init__(self, backends=None, can_create=True, create_returns=None):
        self._backends = backends or {}
        self._can_create = can_create
        self._create_returns = create_returns

    def _create_backend(self, name):
        if not self._can_create:
            raise AttributeError("_create_backend should not be called")
        return self._create_returns


# A bare object with no _backends and no _create_backend.
class _BareEngine:
    pass


class DeepProbeSilentExitTests(unittest.TestCase):
    def setUp(self):
        self.backend = 'chatterbox_turbo_test'
        self.sidecar = verified_synth._backend_err_log_path(self.backend)
        try:
            if os.path.exists(self.sidecar):
                os.unlink(self.sidecar)
        except OSError:
            pass

    def tearDown(self):
        try:
            if os.path.exists(self.sidecar):
                os.unlink(self.sidecar)
        except OSError:
            pass

    def _read_sidecar(self):
        if not os.path.exists(self.sidecar):
            return ''
        with open(self.sidecar, 'r', encoding='utf-8') as fp:
            return fp.read()

    def test_silent_synthesize_None_writes_sidecar_entry(self):
        """Path (c): inst.synthesize returns None — sidecar MUST get an entry."""
        engine = _StubEngine(backends={self.backend: _StubBackend()})
        verified_synth._probe_backend_for_error(
            engine, self.backend, "hello", "en")

        text = self._read_sidecar()
        self.assertIn(self.backend, text)
        self.assertIn("returned silently", text)
        self.assertIn("swallowing", text)

    def test_create_backend_returns_None_writes_sidecar_entry(self):
        """Path (a): _create_backend returns None — sidecar MUST get an entry."""
        engine = _StubEngine(backends={}, create_returns=None)
        verified_synth._probe_backend_for_error(
            engine, self.backend, "hello", "en")

        text = self._read_sidecar()
        self.assertIn(self.backend, text)
        self.assertIn("unreachable", text)
        self.assertIn("returned None", text)

    def test_no_create_backend_method_writes_sidecar_entry(self):
        """Path (b): engine has neither _backends entry nor
        _create_backend — sidecar MUST get an entry."""
        engine = _BareEngine()
        verified_synth._probe_backend_for_error(
            engine, self.backend, "hello", "en")

        text = self._read_sidecar()
        self.assertIn(self.backend, text)
        self.assertIn("unreachable", text)
        self.assertIn("method absent", text)


if __name__ == '__main__':
    unittest.main()
