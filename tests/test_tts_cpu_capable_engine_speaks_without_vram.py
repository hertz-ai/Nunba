"""A voice engine that also runs on the CPU is never refused for lack of free
GPU memory: it keeps its place in a language's ladder, the selector can pick
it, and it speaks the line.  A GPU-only engine keeps every VRAM check.

Live 14 Nov 2026 19:39 IST, build 75, the owner's desktop: the local LLMs held
all but 1021 MiB of the 8 GB GPU, and a Tamil reply got no audio at all:

    Active backend 'piper' cannot speak lang='ta'; routing through
    capability-gated fallback chain ...
    TTS unavailable for lang=ta: no capable backend fits on this hardware.
    Tried ['omnivoice', 'piper'], capable set ['chatterbox_multilingual',
    'indic_parler', 'mms_tts', ...]

The ladder filter dropped mms_tts (VRAM budget 1.0 GB minimum) and Indic
Parler (2.0 GB), the selector had refused mms_tts for the same reason and
picked Piper, and the speak path hands a line to Piper whenever the GPU has no
room, which for Tamil is no audio.  The HARTOS engine registry says mms_tts
runs on the CPU (device GPU_PREFERRED, "CPU works, GPU faster"); the day
before, the same agent spoke Tamil through mms_tts in 7 s.

Real TTSEngine.synthesize, _synth_speech_segment, _speak_with_active_engine,
_synthesize_with_fallback, _select_backend_for_language, _can_run_backend,
_vram_allows, _switch_backend, initialize, _create_backend, and the real
_get_lang_preference with its VRAM filter.  The device class comes from the
real HARTOS ENGINE_REGISTRY (the single source of truth).  Stand-ins only at
the edges: the worker adapter and Piper (no process, no model), the VRAM
manager (free memory as nvidia-smi showed it, the decisions HARTOS's
VRAMManager makes from it), the package probe, the handshake record, the venv
layer, the lifecycle manager, the auto-installer, the realtime publisher and
the self-heal reporters.  The catalog is not loaded; the ladders below are the
order it gave live (HARTOS LANG_ENGINE_PREFERENCE in Nunba backend names).

    python -m pytest tests/test_tts_cpu_capable_engine_speaks_without_vram.py -q
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

TA = 'அர்ஜுன், இங்கே பாரு!'
EN = 'Look at this robot.'
OMNIVOICE = 'omnivoice'  # a catalog engine with no Nunba backend constant
LIVE_FREE_GB = 1021 / 1024   # nvidia-smi, 14 Nov 19:39 IST
NO_ROOM_GB = 0.3             # below every engine's load and inference need

# VRAM_BUDGETS (min_vram_gb, model_gb) as HARTOS vram_manager declares them.
BUDGETS = {
    'tts_mms_tts': (1.0, 0.7),
    'tts_indic_parler': (2.0, 1.8),
    'tts_chatterbox_ml': (14.0, 12.0),
    'tts_chatterbox_turbo': (5.6, 4.5),
    'tts_xtts_v2': (2.5, 2.0),
    'tts_melotts': (1.5, 1.0),
    'tts_kokoro': (0.5, 0.2),
    'tts_cosyvoice3': (4.0, 3.5),
}


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


class _Vram:
    """Free memory as nvidia-smi showed it; can_fit and suggest_offload_mode
    decide from it as HARTOS VRAMManager does (full residency needs
    min_vram; 'gpu' needs the model size, 'cpu_offload' half of it)."""

    def __init__(self, log):
        self.free = LIVE_FREE_GB
        self.log = log

    def get_free_vram(self):
        return self.free

    def can_fit(self, tool):
        budget = BUDGETS.get(tool)
        return budget is None or self.free >= budget[0]

    def suggest_offload_mode(self, tool):
        budget = BUDGETS.get(tool)
        if budget is None or self.free >= budget[1]:
            return 'gpu'
        return 'cpu_offload' if self.free >= budget[1] * 0.5 else 'cpu_only'

    def allocate(self, tool):
        self.log.allocated.append(tool)
        return self.can_fit(tool)

    def release(self, tool):
        self.log.released.append(tool)


@pytest.fixture
def rig(monkeypatch, tmp_path):
    import tts as tts_pkg
    from tts import backend_venv
    from tts import tts_engine as mod

    # The registry is HARTOS's own: the device class is read from it.
    from integrations.channels.media.tts_router import ENGINE_REGISTRY, TTSDevice
    assert ENGINE_REGISTRY['mms_tts'].device == TTSDevice.GPU_PREFERRED
    assert ENGINE_REGISTRY['indic_parler'].device == TTSDevice.GPU_ONLY
    assert ENGINE_REGISTRY['chatterbox_ml'].device == TTSDevice.GPU_ONLY

    monkeypatch.setenv('NUNBA_TTS_STATE_PATH', str(tmp_path / 'tts_state.json'))
    collector = types.ModuleType('hartos.exception_collector')
    collector.report_subsystem_failure = lambda **_k: None
    monkeypatch.setitem(sys.modules, 'hartos.exception_collector', collector)
    advice = types.ModuleType('core.error_advice')
    advice.handle_exception = lambda *_a, **_k: None
    monkeypatch.setitem(sys.modules, 'core.error_advice', advice)
    lifecycle = types.ModuleType('integrations.service_tools.model_lifecycle')
    mlm = MagicMock()
    mlm.request_swap.return_value = None  # nothing idle to evict: the LLMs hold it
    lifecycle.get_model_lifecycle_manager = lambda: mlm
    monkeypatch.setitem(sys.modules, 'integrations.service_tools.model_lifecycle', lifecycle)
    realtime = types.ModuleType('core.realtime')
    realtime.publish_async = lambda *_a, **_k: None
    monkeypatch.setitem(sys.modules, 'core.realtime', realtime)

    log = types.SimpleNamespace(spoken=[], built=[], unloaded=[], allocated=[],
                                released=[], installs=[])
    vram = _Vram(log)
    vram_mod = types.ModuleType('integrations.service_tools.vram_manager')
    vram_mod.VRAM_BUDGETS = BUDGETS
    vram_mod.vram_manager = vram
    vram_mod.get_vram_manager = lambda: vram
    monkeypatch.setitem(sys.modules, 'integrations.service_tools.vram_manager', vram_mod)
    monkeypatch.setattr(mod, '_LADDER_FILTER_CACHE', {})
    monkeypatch.setattr(mod, '_clear_cuda_cache', lambda: None)

    # The catalog is not loaded; these are the ladders it gave live.
    monkeypatch.setitem(sys.modules, 'models.catalog', None)
    monkeypatch.setitem(mod._FALLBACK_LANG_ENGINE_PREFERENCE, 'ta', [
        OMNIVOICE, mod.BACKEND_INDIC_PARLER, mod.BACKEND_CHATTERBOX_ML,
        mod.BACKEND_MMS_TTS, mod.BACKEND_PIPER])
    monkeypatch.setitem(mod._FALLBACK_LANG_ENGINE_PREFERENCE, 'en', [
        mod.BACKEND_CHATTERBOX_TURBO, OMNIVOICE, mod.BACKEND_NEUTTS_AIR,
        mod.BACKEND_MELOTTS, mod.BACKEND_XTTS_V2, mod.BACKEND_F5,
        mod.BACKEND_KOKORO, mod.BACKEND_PIPER, mod.BACKEND_COSYVOICE3,
        mod.BACKEND_MMS_TTS])

    # What this desktop has installed and handshake-verified.
    installed = {mod.BACKEND_MMS_TTS, mod.BACKEND_INDIC_PARLER, mod.BACKEND_CHATTERBOX_ML}
    monkeypatch.setattr(mod, '_probe_backend_runnable', lambda b, _pkg: b in installed)
    monkeypatch.setattr(mod.TTSEngine, '_import_check_cache', {'_torch_cuda': True})
    handshake = types.ModuleType('tts.tts_handshake')
    handshake.is_verified_backend = lambda b: b in installed
    handshake.is_known_failed = lambda b: False
    monkeypatch.setitem(sys.modules, 'tts.tts_handshake', handshake)
    monkeypatch.setattr(tts_pkg, 'tts_handshake', handshake, raising=False)
    monkeypatch.setattr(backend_venv, 'is_venv_healthy', lambda b, probe_module=None: True)
    monkeypatch.setattr(mod.TTSEngine, '_try_auto_install_backend',
                        lambda self, b: log.installs.append(b) or False)

    class _Voice:
        """A worker adapter's or Piper's place: no process, no model."""

        def __init__(self, engine_id):
            log.built.append(engine_id)
            self.engine_id = engine_id
            self._device = None  # its worker has not started

        def synthesize(self, text, output_path=None, language=None, **_k):
            if self.engine_id == mod.BACKEND_PIPER and mod._normalize_lang(language) != 'en':
                raise RuntimeError(f'piper: no voice for {language}')
            log.spoken.append((self.engine_id, text, language))
            return _write_wav(output_path)

        def unload_model(self):
            log.unloaded.append(self.engine_id)

    monkeypatch.setattr(mod, '_SubprocessTTSBackend', _Voice)
    monkeypatch.setattr(mod, '_LazyPiper', lambda: _Voice(mod.BACKEND_PIPER))

    eng = mod.TTSEngine.__new__(mod.TTSEngine)
    eng.auto_init = True
    eng._init_lock = threading.Lock()
    eng._synth_lock = threading.Lock()
    eng._presynth = _NoCache()
    eng._initialized = True
    eng._hw_detected = True
    eng.has_gpu = True
    eng._vram_manager = vram

    def start(active, language, loaded=None, on_cuda=False):
        eng._active_backend = active
        eng._language = language
        names = [active] if loaded is None else loaded
        eng._backends = {n: _Voice(n) for n in names}
        for inst in eng._backends.values():
            inst._device = 'cuda' if on_cuda else None
        log.built.clear()
        return eng

    return types.SimpleNamespace(mod=mod, start=start, log=log, vram=vram,
                                 out=str(tmp_path / 'line.wav'))


def _speak(rig, eng, entry, text, lang):
    """A whole line through synthesize(), or one speech segment."""
    if entry == 'line':
        return eng.synthesize(text, output_path=rig.out, language=lang)
    return eng._synth_speech_segment(text, lang, rig.out)


@pytest.mark.parametrize('entry', ['line', 'segment'])
def test_a_tamil_line_reaches_mms_tts_when_the_gpu_is_busy(rig, entry):
    """The live replay: Piper selected, 1021 MiB free.  The Tamil line is
    spoken by mms_tts, not refused with 'no capable backend fits'."""
    mod = rig.mod
    eng = rig.start(mod.BACKEND_PIPER, 'ta')
    assert _speak(rig, eng, entry, TA, 'ta') == rig.out
    assert rig.log.spoken == [(mod.BACKEND_MMS_TTS, TA, 'ta')]
    assert rig.log.built == [mod.BACKEND_MMS_TTS]


def test_the_selector_picks_mms_tts_for_tamil_when_the_gpu_is_busy(rig):
    """At 1021 MiB free the selector picks mms_tts for Tamil (it picked Piper,
    which has no Tamil voice), and Indic Parler, GPU-only and 2 GB, stays out."""
    mod = rig.mod
    eng = rig.start(mod.BACKEND_PIPER, 'en')
    assert eng._select_backend_for_language('ta') == mod.BACKEND_MMS_TTS


def test_the_tamil_ladder_keeps_mms_tts_and_drops_the_gpu_only_engines(rig):
    mod = rig.mod
    ladder = mod._get_lang_preference('ta')
    assert mod.BACKEND_MMS_TTS in ladder
    assert mod.BACKEND_INDIC_PARLER not in ladder
    assert mod.BACKEND_CHATTERBOX_ML not in ladder


def test_with_room_on_the_gpu_the_tamil_ladder_is_whole(rig):
    mod = rig.mod
    rig.vram.free = 16.0
    assert mod._get_lang_preference('ta') == [
        OMNIVOICE, mod.BACKEND_INDIC_PARLER, mod.BACKEND_CHATTERBOX_ML,
        mod.BACKEND_MMS_TTS, mod.BACKEND_PIPER]


@pytest.mark.parametrize('entry', ['line', 'segment'])
@pytest.mark.parametrize('on_cuda', [False, True], ids=['not-started', 'running'])
def test_mms_tts_without_gpu_room_speaks_the_tamil_line_itself(rig, entry, on_cuda):
    """mms_tts is selected and the GPU has no room to load it or to run it:
    it speaks the line itself, uncounted, and stays selected.  Before,
    the line went to Piper only, and for Tamil that was no audio."""
    mod = rig.mod
    eng = rig.start(mod.BACKEND_MMS_TTS, 'ta', on_cuda=on_cuda)
    rig.vram.free = NO_ROOM_GB
    assert _speak(rig, eng, entry, TA, 'ta') == rig.out
    assert rig.log.spoken == [(mod.BACKEND_MMS_TTS, TA, 'ta')]
    assert eng._active_backend == mod.BACKEND_MMS_TTS
    assert not eng._consecutive_failures.get(mod.BACKEND_MMS_TTS)


@pytest.mark.parametrize('entry', ['line', 'segment'])
def test_a_gpu_only_engine_without_room_still_hands_this_line_to_piper(rig, entry):
    """Indic Parler is GPU-only: with no room, Piper speaks this English line;
    Indic Parler is not asked, not counted, and stays selected."""
    mod = rig.mod
    eng = rig.start(mod.BACKEND_INDIC_PARLER, 'en')
    rig.vram.free = NO_ROOM_GB
    assert _speak(rig, eng, entry, EN, 'en') == rig.out
    assert rig.log.spoken == [(mod.BACKEND_PIPER, EN, 'en')]
    assert eng._active_backend == mod.BACKEND_INDIC_PARLER
    assert not eng._consecutive_failures.get(mod.BACKEND_INDIC_PARLER)


def test_a_gpu_only_engine_that_does_not_fit_is_not_selected(rig):
    """Only Indic Parler and Chatterbox ML (both GPU-only) in the ladder: the
    selector refuses both at 1021 MiB free and falls back to Piper."""
    mod = rig.mod
    rig.mod._FALLBACK_LANG_ENGINE_PREFERENCE['ta'] = [
        mod.BACKEND_INDIC_PARLER, mod.BACKEND_CHATTERBOX_ML, mod.BACKEND_PIPER]
    eng = rig.start(mod.BACKEND_PIPER, 'en')
    assert not eng._vram_allows(mod.BACKEND_INDIC_PARLER)
    assert eng._select_backend_for_language('ta') == mod.BACKEND_PIPER


@pytest.mark.parametrize('entry', ['line', 'segment'])
def test_an_english_line_still_goes_to_piper(rig, entry):
    mod = rig.mod
    eng = rig.start(mod.BACKEND_PIPER, 'en')
    assert eng._select_backend_for_language('en') == mod.BACKEND_PIPER
    assert _speak(rig, eng, entry, EN, 'en') == rig.out
    assert rig.log.spoken == [(mod.BACKEND_PIPER, EN, 'en')]


def test_switching_to_mms_tts_still_unloads_the_other_gpu_engines(rig):
    """The rule of 3ebaee4f holds: a switch to an engine with a VRAM budget
    unloads the active engine and every other loaded engine with one."""
    mod = rig.mod
    eng = rig.start(mod.BACKEND_PIPER, 'en',
                    loaded=[mod.BACKEND_PIPER, mod.BACKEND_INDIC_PARLER])
    eng._switch_backend(mod.BACKEND_MMS_TTS)
    assert sorted(rig.log.unloaded) == sorted([mod.BACKEND_PIPER, mod.BACKEND_INDIC_PARLER])
    assert rig.log.released == ['tts_indic_parler']
    assert eng._active_backend == mod.BACKEND_MMS_TTS
    assert set(eng._backends) == {mod.BACKEND_MMS_TTS}
