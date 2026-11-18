"""A voice engine that never comes up hands the line to the next engine that
speaks the language; the hand-off asks only the venv layer before starting an
engine, and a handshake probe of an engine that cannot come up fails.

Live 13 Nov 2026 13:23 IST, Nunba build 75 on the owner's desktop: a Tamil
line ("அர்ஜுன், இங்கே பாரு!") was routed to omnivoice, which Nunba cannot build
(_create_backend returns None for it).  synthesize() logged "TTS backend not
initialized" and returned None: no audio, while mms_tts (installed, speaks
Tamil) was never tried.

Real TTSEngine.synthesize, _ensure_initialized, initialize, _create_backend,
_synthesize_with_fallback, the failure counters and verified_synth.  Stand-ins
only at the edges: the subprocess worker adapter (no worker process starts),
the venv layer, the catalog ladder and capability data, the selector's live
pick, and the self-heal reporters.

    python -m pytest tests/test_tts_failed_start_falls_back.py -q
"""
import os
import sys
import threading
import types

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import pytest  # noqa: E402

TAMIL = 'அர்ஜுன், இங்கே பாரு!'
OMNIVOICE = 'omnivoice'  # a catalog engine with no Nunba backend constant


class _NoCache:
    def get(self, *_a, **_k):
        return None


@pytest.fixture
def engine(monkeypatch, tmp_path):
    from tts import backend_venv
    from tts import tts_engine as mod
    monkeypatch.setenv('NUNBA_TTS_STATE_PATH', str(tmp_path / 'tts_state.json'))
    # Self-heal reporters are not this test's to reach.
    collector = types.ModuleType('hartos.exception_collector')
    collector.report_subsystem_failure = lambda **_k: None
    monkeypatch.setitem(sys.modules, 'hartos.exception_collector', collector)
    advice = types.ModuleType('core.error_advice')
    advice.handle_exception = lambda *_a, **_k: None
    monkeypatch.setitem(sys.modules, 'core.error_advice', advice)

    eng = mod.TTSEngine.__new__(mod.TTSEngine)
    eng.auto_init = True
    eng._init_lock = threading.Lock()
    eng._synth_lock = threading.Lock()
    eng._presynth = _NoCache()
    # As the live engine stood: the Tamil pick is active, was never built,
    # and the engine is not initialised.
    eng._language = 'ta'
    eng._active_backend = OMNIVOICE
    eng._backends = {OMNIVOICE: None}
    eng._initialized = False

    spoken, built = [], []

    class _Worker:
        """The subprocess adapter's place: no worker process starts."""

        def __init__(self, engine_id):
            built.append(engine_id)
            self.engine_id = engine_id

        def synthesize(self, text, output_path=None, language=None, **_k):
            spoken.append((self.engine_id, text, language))
            with open(output_path, 'wb') as fh:
                fh.write(b'\0' * 20000)
            return output_path

        def unload_model(self):
            pass

    monkeypatch.setattr(mod, '_SubprocessTTSBackend', _Worker)
    ladder = [OMNIVOICE, mod.BACKEND_INDIC_PARLER, mod.BACKEND_MMS_TTS]
    monkeypatch.setattr(mod, '_get_lang_preference', lambda lang: list(ladder))
    monkeypatch.setattr(
        mod, '_get_engine_capabilities',
        lambda b=None: (mod._FALLBACK_ENGINE_CAPABILITIES if b is None
                        else mod._FALLBACK_ENGINE_CAPABILITIES.get(b, {})))
    # The selector's live pick for Tamil; the real one stays reachable.
    eng.real_selector = mod.TTSEngine._select_backend_for_language
    monkeypatch.setattr(mod.TTSEngine, '_select_backend_for_language',
                        lambda self, language='en': OMNIVOICE)
    # indic_parler's venv was built by another interpreter.
    monkeypatch.setattr(backend_venv, 'is_venv_healthy',
                        lambda b, probe_module=None: b != mod.BACKEND_INDIC_PARLER)
    # This machine's state as the selector's predicate sees it: CUDA works,
    # mms_tts's package imports, VRAM fits.  No probe process starts.  The
    # class-wide probe cache is this test's own copy.
    monkeypatch.setattr(mod.TTSEngine, '_import_check_cache',
                        dict(mod.TTSEngine._import_check_cache))
    monkeypatch.setitem(mod.TTSEngine._import_check_cache, '_torch_cuda', True)
    pkg = mod.TTSEngine._get_required_package(mod.BACKEND_MMS_TTS)
    if pkg:
        monkeypatch.setitem(mod.TTSEngine._import_check_cache, pkg, True)
    monkeypatch.setattr(mod.TTSEngine, '_vram_allows', lambda self, b: True)
    monkeypatch.setattr(mod.TTSEngine, '_get_vram_tool_name',
                        classmethod(lambda cls, b: None))
    return mod, eng, spoken, built, str(tmp_path / 'line.wav')


def test_an_engine_that_never_came_up_hands_the_line_to_the_next_tamil_voice(engine):
    mod, eng, spoken, _built, out = engine
    assert eng.synthesize(TAMIL, output_path=out, language='ta') == out
    assert spoken == [(mod.BACKEND_MMS_TTS, TAMIL, 'ta')]
    assert eng._active_backend == mod.BACKEND_MMS_TTS
    # The engine that never came up is counted, so the selector can drop it.
    assert eng._consecutive_failures.get(OMNIVOICE) == 1


def test_an_engine_still_loading_in_a_background_switch_is_not_counted(engine):
    _mod, eng, _spoken, _built, _out = engine
    eng._pending_backend = OMNIVOICE
    eng._record_never_came_up(OMNIVOICE)
    assert eng._consecutive_failures.get(OMNIVOICE) is None
    eng._pending_backend = None
    eng._record_never_came_up(OMNIVOICE)
    assert eng._consecutive_failures.get(OMNIVOICE) == 1


def test_the_hand_off_does_not_start_an_engine_whose_venv_this_python_refuses(engine):
    mod, eng, _spoken, built, out = engine
    eng.synthesize(TAMIL, output_path=out, language='ta')
    assert built == [mod.BACKEND_MMS_TTS]


@pytest.mark.parametrize('machine', ['no_cuda', 'vram_tight'])
def test_without_cuda_or_free_vram_mms_tts_still_speaks_tamil(engine, monkeypatch, machine):
    """mms_tts runs on CPU; a machine without CUDA (a Mac, a PC without
    NVIDIA) or with VRAM taken still gets Tamil audio from the hand-off."""
    mod, eng, spoken, _built, out = engine
    if machine == 'no_cuda':
        monkeypatch.setitem(mod.TTSEngine._import_check_cache, '_torch_cuda', False)
    else:
        monkeypatch.setattr(mod.TTSEngine, '_vram_allows', lambda self, b: False)
    assert eng.synthesize(TAMIL, output_path=out, language='ta') == out
    assert spoken == [(mod.BACKEND_MMS_TTS, TAMIL, 'ta')]


def test_a_handshake_of_an_engine_that_cannot_come_up_fails(engine, monkeypatch, tmp_path):
    """verified_synth must not pass omnivoice on mms_tts's audio."""
    from tts import verified_synth
    _mod, eng, spoken, _built, _out = engine
    monkeypatch.setattr(verified_synth, '_backend_err_log_path',
                        lambda b: str(tmp_path / f'{b}.err'))
    result = verified_synth.verify_backend_synth(eng, OMNIVOICE, lang='ta', timeout_s=10)
    assert result.ok is False
    assert spoken == []
    assert eng._active_backend == OMNIVOICE


def test_a_handshake_of_an_engine_that_comes_up_passes_on_its_own_audio(engine, monkeypatch,
                                                                         tmp_path):
    from tts import verified_synth
    mod, eng, spoken, _built, _out = engine
    monkeypatch.setattr(verified_synth, '_backend_err_log_path',
                        lambda b: str(tmp_path / f'{b}.err'))
    result = verified_synth.verify_backend_synth(eng, mod.BACKEND_MMS_TTS, lang='ta',
                                                 timeout_s=10)
    assert result.ok is True
    assert [s[0] for s in spoken] == [mod.BACKEND_MMS_TTS]


@pytest.mark.parametrize('demoted', [False, True])
def test_the_selector_never_picks_or_installs_an_engine_nunba_cannot_build(
        engine, monkeypatch, demoted):
    """omnivoice heads the catalog's Tamil ladder, with catalog data that
    passes the selector's predicate, but Nunba has no backend for it.  The
    real selector passes over it: it is never the pick, and a demoted
    omnivoice is never handed to the auto-installer (a venv rebuild that
    could not make it buildable)."""
    mod, eng, *_ = engine
    monkeypatch.setattr(mod.TTSEngine, '_select_backend_for_language', eng.real_selector)
    caps = dict(mod._FALLBACK_ENGINE_CAPABILITIES)
    caps[OMNIVOICE] = {'name': 'omnivoice', 'vram_gb': 3.5, 'languages': {'ta', 'en'}}
    monkeypatch.setattr(mod, '_get_engine_capabilities',
                        lambda b=None: caps if b is None else caps.get(b, {}))
    installs = []
    monkeypatch.setattr(mod.TTSEngine, '_try_auto_install_backend',
                        lambda self, b: installs.append(b) or False)
    eng._hw_detected, eng.has_gpu = True, True
    if demoted:
        eng._demoted_backends.add(OMNIVOICE)
    assert eng._select_backend_for_language('ta') == mod.BACKEND_MMS_TTS
    assert OMNIVOICE not in installs
