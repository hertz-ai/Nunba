"""A voice engine that never comes up hands the line to the next engine that
speaks the language, and the hand-off never starts an engine this interpreter
cannot run.

Live 13 Nov 2026 13:23 IST, Nunba build 75 on the owner's desktop: a Tamil line
("அர்ஜுன், இங்கே பாரு!") was routed to omnivoice, whose venv was built by another
Python (miniconda 3.11; the app runs 3.12).  The engine never initialised,
synthesize() logged "TTS backend not initialized" and returned None: no audio,
while mms_tts (installed, speaks Tamil) was never tried.  The fallback ladder
(_synthesize_with_fallback) already existed; this path did not use it.

Real TTSEngine.synthesize and _synthesize_with_fallback on a bare engine; the
engines themselves are stand-ins.

    python -m pytest tests/test_tts_failed_start_falls_back.py -q
"""
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import pytest  # noqa: E402

TAMIL = 'அர்ஜுன், இங்கே பாரு!'


class _Voice:
    def __init__(self, name, spoken):
        self.name, self.spoken = name, spoken

    def synthesize(self, text, output_path=None, language=None, **_k):
        self.spoken.append((self.name, text, language))
        return output_path


@pytest.fixture
def engine(monkeypatch, tmp_path):
    from tts import tts_engine as mod
    eng = mod.TTSEngine.__new__(mod.TTSEngine)
    # as the live engine stood: the Tamil pick is active but never came up
    eng._backends = {'omnivoice': None}
    eng._active_backend = 'omnivoice'
    eng._language = 'ta'
    eng._pending_backend = None
    eng._initialized = True
    eng._demoted_backends = set()
    eng._consecutive_failures = {}

    class _NoCache:
        def get(self, *_a, **_k):
            return None
    eng._presynth = _NoCache()

    ladder = ['omnivoice', mod.BACKEND_INDIC_PARLER, mod.BACKEND_MMS_TTS]
    monkeypatch.setattr(mod, '_get_lang_preference', lambda lang: list(ladder))
    monkeypatch.setattr(mod, '_capable_backends_for', lambda lang: set(ladder))
    # indic_parler's venv was built by another interpreter: not runnable here
    monkeypatch.setattr(mod.TTSEngine, '_can_run_backend',
                        lambda self, b: b == mod.BACKEND_MMS_TTS)
    monkeypatch.setattr(mod.TTSEngine, '_is_demoted', lambda self, b: False)
    monkeypatch.setattr(mod.TTSEngine, '_ensure_initialized', lambda self: None)
    monkeypatch.setattr(mod.TTSEngine, '_record_backend_success', lambda self, b: None)
    monkeypatch.setattr(mod.TTSEngine, '_record_backend_failure', lambda self, b, e=None: None)
    spoken, created = [], []

    def create(self, backend):
        created.append(backend)
        return _Voice(backend, spoken)
    monkeypatch.setattr(mod.TTSEngine, '_create_backend', create)
    return mod, eng, spoken, created, str(tmp_path / 'line.wav')


def test_an_engine_that_never_came_up_hands_the_line_to_the_next_tamil_voice(engine):
    mod, eng, spoken, _created, out = engine
    assert eng.synthesize(TAMIL, output_path=out, language='ta') == out
    assert spoken == [(mod.BACKEND_MMS_TTS, TAMIL, 'ta')]
    assert eng._active_backend == mod.BACKEND_MMS_TTS


def test_the_hand_off_does_not_start_an_engine_this_python_cannot_run(engine):
    mod, eng, _spoken, created, out = engine
    eng.synthesize(TAMIL, output_path=out, language='ta')
    assert mod.BACKEND_INDIC_PARLER not in created
    assert created == [mod.BACKEND_MMS_TTS]
