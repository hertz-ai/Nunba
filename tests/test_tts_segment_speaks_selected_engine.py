"""A speech segment is spoken by the engine selected for its language; the
fallback ladder is asked only when that engine never came up, raises, or
returns no audio, and each of those counts against the engine.  Switching to
an engine that needs no GPU memory (Piper) leaves the GPU engine loaded.

Live 13 Nov 2026, the owner's desktop, a Tamil reply with English fragments:
98 s to speak it.  Every segment went straight to the ladder, which skips the
active engine (37 "Fallback succeeded" lines, 0 "Synthesis failed"), so
omnivoice was never counted and kept being picked, and Piper never spoke an
English fragment.  An English fragment's switch to Piper shut down the mms_tts
worker serving Tamil, which then reloaded its Tamil weights (about 40 s).

The review of c326236f (14 Nov 2026) found two more: a switch to a GPU engine
freed only the active engine, which after an English fragment is Piper, so
mms_tts -> Piper -> Indic Parler kept both GPU engines loaded; and the segment
path carried its own copy of synthesize()'s speak block, which already
differed (a raising engine stayed loaded, no GPU-room check, no audio counted
on one path only).  A whole line and a segment now take one path, and the
cases marked 'line' and 'segment' pin that they behave the same.

Real TTSEngine.synthesize, _synthesize_multilingual, _synth_speech_segment,
set_language, _switch_backend, initialize, _create_backend,
_synthesize_with_fallback, verify_synth_via_backend and the failure counters.
Stand-ins only at the edges: the worker adapter and Piper (no process, no
model), the venv layer, the lifecycle manager, the VRAM manager, the CUDA
cache, the realtime publisher, the catalog ladder and capability data, the
selector's picks, and the self-heal reporters.

    python -m pytest tests/test_tts_segment_speaks_selected_engine.py -q
"""
import os
import sys
import threading
import types
import wave
from unittest.mock import MagicMock

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import pytest  # noqa: E402

TA1 = 'அர்ஜுன், இங்கே பாரு!'
EN = 'Look at this robot.'
TA2 = 'இது ரொம்ப அழகு!'
OMNIVOICE = 'omnivoice'  # a catalog engine with no Nunba backend constant


class _NoCache:
    def get(self, *_a, **_k):
        return None


def _write_wav(path):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b'\0\0' * 8000)
    return path


@pytest.fixture
def rig(monkeypatch, tmp_path):
    from tts import backend_venv
    from tts import tts_engine as mod
    monkeypatch.setenv('NUNBA_TTS_STATE_PATH', str(tmp_path / 'tts_state.json'))
    collector = types.ModuleType('hartos.exception_collector')
    collector.report_subsystem_failure = lambda **_k: None
    monkeypatch.setitem(sys.modules, 'hartos.exception_collector', collector)
    advice = types.ModuleType('core.error_advice')
    advice.handle_exception = lambda *_a, **_k: None
    monkeypatch.setitem(sys.modules, 'core.error_advice', advice)
    lifecycle = types.ModuleType('integrations.service_tools.model_lifecycle')
    lifecycle.get_model_lifecycle_manager = lambda: MagicMock()
    monkeypatch.setitem(sys.modules, 'integrations.service_tools.model_lifecycle', lifecycle)
    # GPU room as the VRAM manager reports it: room by default.
    room = {'mode': 'gpu'}
    vram = types.ModuleType('integrations.service_tools.vram_manager')
    vram.vram_manager = types.SimpleNamespace(
        get_free_vram=lambda: 6.0,
        suggest_offload_mode=lambda tool: room['mode'])
    monkeypatch.setitem(sys.modules, 'integrations.service_tools.vram_manager', vram)
    realtime = types.ModuleType('core.realtime')
    realtime.publish_async = lambda *_a, **_k: None
    monkeypatch.setitem(sys.modules, 'core.realtime', realtime)

    log = types.SimpleNamespace(spoken=[], built=[], unloaded=[], fail={},
                                released=[], allocated=[], cuda_cleared=0, speeds=[])

    def _cuda_cleared():
        log.cuda_cleared += 1
    monkeypatch.setattr(mod, '_clear_cuda_cache', _cuda_cleared)

    class _Voice:
        """A worker adapter's or Piper's place: no process, no model."""

        def __init__(self, engine_id):
            log.built.append(engine_id)
            self.engine_id = engine_id

        def synthesize(self, text, output_path=None, language=None, **_k):
            how = log.fail.get(self.engine_id)
            if how == 'raise':
                raise RuntimeError(f'{self.engine_id}: synth blew up')
            if how == 'transient':
                err = RuntimeError(f'{self.engine_id}: worker ran out of GPU memory')
                err.transient = True
                raise err
            log.speeds.append(_k.get('speed'))
            log.spoken.append((self.engine_id, text, language))
            if how == 'nothing':
                return None
            return _write_wav(output_path)

        def unload_model(self):
            log.unloaded.append(self.engine_id)

    monkeypatch.setattr(mod, '_SubprocessTTSBackend', _Voice)
    monkeypatch.setattr(mod, '_LazyPiper', lambda: _Voice(mod.BACKEND_PIPER))

    ladders = {
        'ta': [OMNIVOICE, mod.BACKEND_INDIC_PARLER, mod.BACKEND_MMS_TTS],
        'en': [mod.BACKEND_MMS_TTS, mod.BACKEND_PIPER],
    }
    monkeypatch.setattr(mod, '_get_lang_preference',
                        lambda lang: list(ladders[mod._normalize_lang(lang)]))
    monkeypatch.setattr(
        mod, '_get_engine_capabilities',
        lambda b=None: (mod._FALLBACK_ENGINE_CAPABILITIES if b is None
                        else mod._FALLBACK_ENGINE_CAPABILITIES.get(b, {})))
    picks = {'ta': mod.BACKEND_MMS_TTS, 'en': mod.BACKEND_PIPER}
    monkeypatch.setattr(mod.TTSEngine, '_select_backend_for_language',
                        lambda self, language='en': picks[mod._normalize_lang(language)])
    healthy = {mod.BACKEND_INDIC_PARLER: False}
    monkeypatch.setattr(backend_venv, 'is_venv_healthy',
                        lambda b, probe_module=None: healthy.get(b, True))
    # The registry's VRAM budgets: the GPU engines have one, Piper none.
    vram_tools = {mod.BACKEND_MMS_TTS: 'tts_mms_tts',
                  mod.BACKEND_INDIC_PARLER: 'tts_indic_parler'}
    monkeypatch.setattr(mod.TTSEngine, '_get_vram_tool_name',
                        classmethod(lambda cls, b: vram_tools.get(b)))

    eng = mod.TTSEngine.__new__(mod.TTSEngine)
    eng.auto_init = True
    eng._init_lock = threading.Lock()
    eng._synth_lock = threading.Lock()
    eng._presynth = _NoCache()
    eng._initialized = True
    eng._vram_manager = types.SimpleNamespace(allocate=log.allocated.append,
                                              release=log.released.append)

    def start(active, language, loaded=None):
        eng._active_backend = active
        eng._language = language
        names = [active] if loaded is None else loaded
        eng._backends = {n: (None if n == OMNIVOICE else _Voice(n)) for n in names}
        log.built.clear()
        return eng

    return types.SimpleNamespace(mod=mod, start=start, log=log, ladders=ladders,
                                 picks=picks, healthy=healthy, room=room,
                                 out=str(tmp_path / 'seg.wav'))


def _speak(rig, eng, entry, text, lang):
    """A whole line through synthesize(), or one speech segment."""
    if entry == 'line':
        return eng.synthesize(text, output_path=rig.out, language=lang)
    return eng._synth_speech_segment(text, lang, rig.out)


def test_a_tamil_segment_is_spoken_by_the_selected_engine(rig):
    mod = rig.mod
    eng = rig.start(mod.BACKEND_MMS_TTS, 'ta')
    assert eng._synth_speech_segment(TA1, 'ta', rig.out) == rig.out
    assert rig.log.spoken == [(mod.BACKEND_MMS_TTS, TA1, 'ta')]
    assert rig.log.built == []
    assert eng._active_backend == mod.BACKEND_MMS_TTS


def test_an_english_segment_is_spoken_by_piper_when_piper_is_selected(rig):
    mod = rig.mod
    eng = rig.start(mod.BACKEND_PIPER, 'en')
    assert eng._synth_speech_segment(EN, 'en', rig.out) == rig.out
    assert rig.log.spoken == [(mod.BACKEND_PIPER, EN, 'en')]
    assert rig.log.built == []


@pytest.mark.parametrize('entry', ['line', 'segment'])
@pytest.mark.parametrize('how', ['raise', 'nothing'])
def test_a_selected_engine_that_fails_is_counted_and_the_ladder_speaks(rig, how, entry):
    """Both paths: the failure counts against mms_tts and Indic Parler speaks.
    A raise may leave the engine's CUDA state corrupted, so the engine is
    unloaded and the CUDA cache cleared; no audio leaves it loaded."""
    mod = rig.mod
    rig.healthy[mod.BACKEND_INDIC_PARLER] = True
    eng = rig.start(mod.BACKEND_MMS_TTS, 'ta')
    rig.log.fail[mod.BACKEND_MMS_TTS] = how
    assert _speak(rig, eng, entry, TA1, 'ta') == rig.out
    assert rig.log.spoken[-1] == (mod.BACKEND_INDIC_PARLER, TA1, 'ta')
    assert eng._consecutive_failures.get(mod.BACKEND_MMS_TTS) == 1
    if how == 'raise':
        assert rig.log.unloaded == [mod.BACKEND_MMS_TTS]
        assert mod.BACKEND_MMS_TTS not in eng._backends
        assert rig.log.cuda_cleared == 1
    else:
        assert rig.log.unloaded == []
        assert mod.BACKEND_MMS_TTS in eng._backends


@pytest.mark.parametrize('entry', ['line', 'segment'])
def test_a_transient_raise_is_not_counted_and_piper_speaks_this_line_only(rig, entry):
    """A worker that ran out of GPU memory once: Piper speaks this line, and
    mms_tts stays loaded, selected and uncounted for the next one."""
    mod = rig.mod
    eng = rig.start(mod.BACKEND_MMS_TTS, 'en')
    rig.log.fail[mod.BACKEND_MMS_TTS] = 'transient'
    assert _speak(rig, eng, entry, EN, 'en') == rig.out
    assert rig.log.spoken == [(mod.BACKEND_PIPER, EN, 'en')]
    assert not eng._consecutive_failures.get(mod.BACKEND_MMS_TTS)
    assert eng._active_backend == mod.BACKEND_MMS_TTS
    assert rig.log.unloaded == []


@pytest.mark.parametrize('entry', ['line', 'segment'])
def test_a_gpu_engine_without_room_hands_this_line_to_piper_only(rig, entry):
    """The laptop GPU is full (the LLM holds most of it): Piper speaks this
    line; mms_tts is not asked, not counted, and stays selected."""
    mod = rig.mod
    eng = rig.start(mod.BACKEND_MMS_TTS, 'en')
    rig.room['mode'] = 'cpu_only'
    assert _speak(rig, eng, entry, EN, 'en') == rig.out
    assert rig.log.spoken == [(mod.BACKEND_PIPER, EN, 'en')]
    assert eng._active_backend == mod.BACKEND_MMS_TTS
    assert mod.BACKEND_MMS_TTS in eng._backends
    assert not eng._consecutive_failures.get(mod.BACKEND_MMS_TTS)


def test_a_whole_line_reaches_the_engine_with_its_speed(rig):
    mod = rig.mod
    eng = rig.start(mod.BACKEND_PIPER, 'en')
    assert eng.synthesize(EN, output_path=rig.out, speed=0.8, language='en') == rig.out
    assert rig.log.spoken == [(mod.BACKEND_PIPER, EN, 'en')]
    assert rig.log.speeds == [0.8]


@pytest.mark.parametrize('entry', ['line', 'segment'])
def test_audio_clears_the_engines_failure_counter(rig, entry):
    mod = rig.mod
    eng = rig.start(mod.BACKEND_MMS_TTS, 'ta')
    eng._consecutive_failures[mod.BACKEND_MMS_TTS] = 2
    assert _speak(rig, eng, entry, TA1, 'ta') == rig.out
    assert rig.log.spoken == [(mod.BACKEND_MMS_TTS, TA1, 'ta')]
    assert eng._consecutive_failures.get(mod.BACKEND_MMS_TTS) == 0


def test_a_selected_engine_that_never_came_up_is_counted_until_demoted(rig):
    """Indic Parler is the pick but its instance never came up: each Tamil
    segment counts against it, and the third demotes it so the selector
    skips it."""
    mod = rig.mod
    for n in range(1, 4):
        eng = rig.start(mod.BACKEND_INDIC_PARLER, 'ta',
                        loaded=[mod.BACKEND_INDIC_PARLER, mod.BACKEND_MMS_TTS])
        eng._backends[mod.BACKEND_INDIC_PARLER] = None
        assert eng._synth_speech_segment(TA1, 'ta', rig.out) == rig.out
        assert rig.log.spoken[-1] == (mod.BACKEND_MMS_TTS, TA1, 'ta')
        assert eng._consecutive_failures.get(mod.BACKEND_INDIC_PARLER) == n
    assert eng._is_demoted(mod.BACKEND_INDIC_PARLER)


def test_an_engine_that_cannot_speak_the_language_is_not_asked(rig):
    """Kokoro speaks English only: a Tamil segment goes to the ladder without
    Kokoro being asked or counted."""
    mod = rig.mod
    eng = rig.start(mod.BACKEND_KOKORO, 'ta', loaded=[mod.BACKEND_KOKORO, mod.BACKEND_MMS_TTS])
    assert eng._synth_speech_segment(TA1, 'ta', rig.out) == rig.out
    assert rig.log.spoken == [(mod.BACKEND_MMS_TTS, TA1, 'ta')]
    assert eng._consecutive_failures.get(mod.BACKEND_KOKORO) is None


def test_switching_to_piper_keeps_the_gpu_engine_loaded(rig):
    mod = rig.mod
    eng = rig.start(mod.BACKEND_MMS_TTS, 'ta')
    eng._switch_backend(mod.BACKEND_PIPER)
    assert eng._active_backend == mod.BACKEND_PIPER
    assert rig.log.unloaded == []
    assert mod.BACKEND_MMS_TTS in eng._backends


def test_switching_to_a_gpu_engine_unloads_the_previous_one(rig):
    mod = rig.mod
    eng = rig.start(mod.BACKEND_MMS_TTS, 'ta')
    eng._switch_backend(mod.BACKEND_INDIC_PARLER)
    assert rig.log.unloaded == [mod.BACKEND_MMS_TTS]
    assert mod.BACKEND_MMS_TTS not in eng._backends


def test_a_gpu_engine_frees_the_idle_gpu_engine_too(rig):
    """mms_tts, then Piper for an English line, then Indic Parler: the active
    engine at the last switch is Piper, yet the GPU room Indic Parler needs is
    held by mms_tts.  mms_tts is unloaded and its VRAM released, as is the
    active engine (Piper), so only Indic Parler stays loaded."""
    mod = rig.mod
    eng = rig.start(mod.BACKEND_MMS_TTS, 'ta')
    eng._switch_backend(mod.BACKEND_PIPER)
    eng._switch_backend(mod.BACKEND_INDIC_PARLER)
    assert list(eng._backends) == [mod.BACKEND_INDIC_PARLER]
    assert sorted(rig.log.unloaded) == sorted([mod.BACKEND_MMS_TTS, mod.BACKEND_PIPER])
    assert rig.log.released == ['tts_mms_tts']
    assert rig.log.allocated == ['tts_indic_parler']


def test_a_probe_of_another_engine_puts_the_selected_engine_back(rig):
    """The handshake probes Indic Parler while mms_tts serves Tamil: Indic
    Parler speaks the probe, and mms_tts is the selected engine again after."""
    mod = rig.mod
    eng = rig.start(mod.BACKEND_MMS_TTS, 'ta')
    assert eng.verify_synth_via_backend(
        mod.BACKEND_INDIC_PARLER, TA1, rig.out, language='ta') == rig.out
    assert rig.log.spoken == [(mod.BACKEND_INDIC_PARLER, TA1, 'ta')]
    assert eng._active_backend == mod.BACKEND_MMS_TTS


def test_a_tamil_reply_with_an_english_fragment_keeps_one_tamil_worker(rig):
    """The live reply's shape: Tamil, English, Tamil.  mms_tts speaks both
    Tamil segments from one load, Piper speaks the English one, and nothing
    is unloaded or reloaded."""
    mod = rig.mod
    eng = rig.start(mod.BACKEND_MMS_TTS, 'ta')
    out = eng.synthesize(f'{TA1} {EN} {TA2}', output_path=rig.out)
    assert out == rig.out
    assert rig.log.spoken == [(mod.BACKEND_MMS_TTS, TA1, 'ta'),
                              (mod.BACKEND_PIPER, EN, 'en'),
                              (mod.BACKEND_MMS_TTS, TA2, 'ta')]
    assert rig.log.built == [mod.BACKEND_PIPER]
    assert rig.log.unloaded == []
