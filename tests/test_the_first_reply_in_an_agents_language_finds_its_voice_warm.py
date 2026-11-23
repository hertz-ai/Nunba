"""The first reply in the language an agent last spoke finds its voice
already started: the boot warm-up starts the voices of the languages lines
were last spoken in, not only the person's own.

WHAT WENT WRONG (live walk, 23 Nov 2026, installed Nunba, local 4B on :8082)
  The speech agent's first Tamil reply was heard 60 s after its text; the
  next ones took 180 ms.  The Tamil voice was on disk; its worker started
  cold at the reply.  The boot warm-up warmed only the person's UI language
  ('en'), waited 90 s for a llama-server on a fixed :8080 while the LLM ran
  on :8082, then skipped every pre-load ("only 1.4GB VRAM free") although
  mms_tts runs on the CPU.  It could not have warmed Tamil anyway: it spoke
  "." and the engine picks the voice by the text's script, so "." went to
  the English voice.  And nothing kept which language the agent spoke: its
  Tamil replies came in labelled 'en'.

THE RULE
  * Each line spoken puts its language (the one the voice spoke) newest in
    tts_state.json's spoken_languages, kept short; a line with no audio
    does not.  A demotion written later keeps the list.
  * The warm-up waits for the llama-server on the port this node's llama
    config names (llama_config.get_llama_endpoint), then warms the person's
    language and the languages last spoken, newest last, each with a line in
    its own script.  A voice the registry says runs on the CPU is warmed on
    a full GPU; one that needs the GPU is not.  Nothing is warmed while the
    person is chatting.

Real TTSEngine.synthesize / _synthesize_multilingual / _synth_speech_segment
/ set_language / the state file, and main.py's _warmup_tts as written (read
from main.py, never imported).  Stand-ins only at the edges: the voices, the
lifecycle and VRAM managers, the realtime publisher, the selector's picks,
the warm-up's engine, its health probe and its model-setup helpers.

    python -m pytest tests/test_the_first_reply_in_an_agents_language_finds_its_voice_warm.py -q
"""
import ast
import io
import json
import logging
import os
import sys
import threading
import time
import types
import urllib.request
import wave
from pathlib import Path
from unittest.mock import MagicMock

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest  # noqa: E402

TAMIL = 'அர்ஜுன், இங்கே பாரு!'
HINDI = 'अर्जुन, यहाँ देखो!'
TELUGU = 'అర్జున్, ఇక్కడ చూడు!'
ENGLISH = 'Arjun, look here!'


# ── The engine: a line spoken puts its language on file ─────────────────

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
def speech(monkeypatch, tmp_path):
    """A TTSEngine with Piper and mms_tts loaded, English active, as after
    boot on the owner's desktop.  The voices write a WAV, or nothing."""
    from tts import backend_venv
    from tts import tts_engine as mod
    state = tmp_path / 'tts_state.json'
    monkeypatch.setenv('NUNBA_TTS_STATE_PATH', str(state))
    collector = types.ModuleType('hartos.exception_collector')
    collector.report_subsystem_failure = lambda **_k: None
    monkeypatch.setitem(sys.modules, 'hartos.exception_collector', collector)
    advice = types.ModuleType('core.error_advice')
    advice.handle_exception = lambda *_a, **_k: None
    monkeypatch.setitem(sys.modules, 'core.error_advice', advice)
    lifecycle = types.ModuleType('integrations.service_tools.model_lifecycle')
    lifecycle.get_model_lifecycle_manager = lambda: MagicMock()
    monkeypatch.setitem(sys.modules, 'integrations.service_tools.model_lifecycle', lifecycle)
    vram = types.ModuleType('integrations.service_tools.vram_manager')
    vram.vram_manager = types.SimpleNamespace(
        get_free_vram=lambda: 6.0, suggest_offload_mode=lambda tool: 'gpu')
    monkeypatch.setitem(sys.modules, 'integrations.service_tools.vram_manager', vram)
    realtime = types.ModuleType('core.realtime')
    realtime.publish_async = lambda *_a, **_k: None
    monkeypatch.setitem(sys.modules, 'core.realtime', realtime)
    monkeypatch.setattr(mod, '_clear_cuda_cache', lambda: None)

    silent = set()
    said = []

    class _Voice:
        """A worker adapter's or Piper's place: no process, no model."""

        def __init__(self, engine_id):
            self.engine_id = engine_id

        def synthesize(self, text, output_path=None, language=None, **_k):
            said.append((self.engine_id, language))
            if self.engine_id in silent:
                return None
            return _write_wav(output_path)

        def unload_model(self):
            pass

    monkeypatch.setattr(mod, '_SubprocessTTSBackend', _Voice)
    monkeypatch.setattr(mod, '_LazyPiper', lambda: _Voice(mod.BACKEND_PIPER))
    picks = {'en': mod.BACKEND_PIPER, 'ta': mod.BACKEND_MMS_TTS,
             'hi': mod.BACKEND_MMS_TTS, 'te': mod.BACKEND_MMS_TTS}
    monkeypatch.setattr(mod.TTSEngine, '_select_backend_for_language',
                        lambda self, language='en': picks[mod._normalize_lang(language)])
    monkeypatch.setattr(mod, '_get_lang_preference',
                        lambda lang: [picks[mod._normalize_lang(lang)]])
    monkeypatch.setattr(
        mod, '_get_engine_capabilities',
        lambda b=None: (mod._FALLBACK_ENGINE_CAPABILITIES if b is None
                        else mod._FALLBACK_ENGINE_CAPABILITIES.get(b, {})))
    monkeypatch.setattr(backend_venv, 'is_venv_healthy', lambda b, probe_module=None: True)
    vram_tools = {mod.BACKEND_MMS_TTS: 'tts_mms_tts'}
    monkeypatch.setattr(mod.TTSEngine, '_get_vram_tool_name',
                        classmethod(lambda cls, b: vram_tools.get(b)))

    eng = mod.TTSEngine.__new__(mod.TTSEngine)
    eng.auto_init = True
    eng._init_lock = threading.Lock()
    eng._synth_lock = threading.Lock()
    eng._presynth = _NoCache()
    eng._initialized = True
    eng._vram_manager = types.SimpleNamespace(allocate=lambda t: None,
                                              release=lambda t: None)
    eng._active_backend = mod.BACKEND_PIPER
    eng._language = 'en'
    eng._backends = {mod.BACKEND_PIPER: _Voice(mod.BACKEND_PIPER),
                     mod.BACKEND_MMS_TTS: _Voice(mod.BACKEND_MMS_TTS)}

    def say(text, language='en'):
        # The chat path passes the person's UI language, whatever the
        # reply's script (hart_intelligence_entry -> synthesize(lang='en')).
        return eng.synthesize(text, output_path=str(tmp_path / 'line.wav'),
                              language=language)

    def next_boot():
        return mod.TTSEngine(auto_init=False)

    def on_file():
        if not state.exists():
            return None
        return json.loads(state.read_text(encoding='utf-8')).get('spoken_languages')

    return types.SimpleNamespace(mod=mod, eng=eng, say=say, next_boot=next_boot,
                                 on_file=on_file, silent=silent, said=said)


def test_a_tamil_reply_labelled_en_is_on_file_as_tamil_for_the_next_boot(speech):
    assert speech.say(TAMIL, language='en')
    assert speech.said == [(speech.mod.BACKEND_MMS_TTS, 'ta')]
    assert speech.on_file() == ['ta'], (
        f"tts_state.json spoken_languages is {speech.on_file()!r} after a Tamil reply")
    assert speech.next_boot().last_spoken_languages() == ['ta']


def test_the_language_spoken_last_is_newest_and_the_list_stays_short(speech):
    for text in (ENGLISH, TAMIL, ENGLISH, TAMIL):
        assert speech.say(text)
    # Each language once, the one spoken last newest.
    assert speech.eng.last_spoken_languages() == ['en', 'ta']
    for text in (HINDI, TELUGU, TELUGU):
        assert speech.say(text)
    kept = speech.mod._SPOKEN_LANGUAGES_KEPT
    expected = ['en', 'ta', 'hi', 'te'][-kept:]
    assert speech.eng.last_spoken_languages() == expected
    assert speech.on_file() == expected
    assert speech.next_boot().last_spoken_languages() == expected


def test_each_language_of_a_mixed_reply_is_on_file_in_the_order_spoken(speech):
    assert speech.say(f'{ENGLISH} {TAMIL}')
    assert speech.on_file() == ['en', 'ta']


@pytest.mark.parametrize('label', ['en', 'ta'])
def test_a_line_with_no_audio_is_not_on_file(speech, label):
    """Labelled 'en' the line goes through the segment path; labelled 'ta'
    through the whole-line path."""
    speech.silent.update({speech.mod.BACKEND_MMS_TTS, speech.mod.BACKEND_PIPER})
    assert not speech.say(TAMIL, language=label)
    assert speech.eng.last_spoken_languages() == []
    assert not speech.on_file()


def test_a_demotion_written_later_keeps_the_spoken_languages(speech):
    mod = speech.mod
    assert speech.say(TAMIL)
    for _ in range(speech.eng._failure_threshold):
        speech.eng._record_backend_failure(mod.BACKEND_CHATTERBOX_TURBO)
    data = json.loads(Path(os.environ['NUNBA_TTS_STATE_PATH']).read_text(encoding='utf-8'))
    assert mod.BACKEND_CHATTERBOX_TURBO in data['demoted']
    assert data['spoken_languages'] == ['ta']
    eng2 = speech.next_boot()
    assert eng2.last_spoken_languages() == ['ta']
    assert mod.BACKEND_CHATTERBOX_TURBO in eng2._demoted_backends


# ── The boot warm-up: main.py's _warmup_tts, run as written ─────────────

def _warmup_source():
    tree = ast.parse((ROOT / 'main.py').read_text(encoding='utf-8'))
    fn = next(n for n in ast.walk(tree)
              if isinstance(n, ast.FunctionDef) and n.name == '_warmup_tts')
    return compile(ast.Module(body=[fn], type_ignores=[]), str(ROOT / 'main.py'), 'exec')


class _BootEngine:
    """The TTS engine as _warmup_tts sees it: the language set, the voice
    that selects, the languages last spoken, and what it is asked to say."""

    def __init__(self, spoken, voices):
        self._spoken = list(spoken)
        self._voices = voices
        self._pending_backend = None
        self.lang = 'en'
        self.set_to = []
        self.said = []

    def set_language(self, language):
        self.set_to.append(language)
        self.lang = language

    @property
    def backend(self):
        return self._voices[self.lang]

    def last_spoken_languages(self):
        return list(self._spoken)

    def synthesize(self, text, output_path=None, language=None, **_k):
        self.said.append((language, self.backend, text))
        return output_path

    def get_info(self):
        return {'backend': self.backend}


VOICES = {'en': 'piper', 'ta': 'mms_tts', 'hi': 'mms_tts', 'zh': 'cosyvoice3'}
ON_CPU = {'piper', 'mms_tts'}


@pytest.fixture
def boot(monkeypatch):
    """Run _warmup_tts with a given node: the person's language, the
    languages last spoken, free VRAM, the llama config's port, and whether
    the person is chatting.  Returns the engine and the URLs polled."""
    import tts.verified_synth  # noqa: F401  (the real greeting picker)
    monkeypatch.delenv('NUNBA_DISABLE_TTS', raising=False)
    code = _warmup_source()

    def run(*, preferred='en', spoken=(), free_gb=1.4, llm_port=8082, busy=False):
        engine = _BootEngine(spoken, VOICES)
        polled = []

        def _module(name, **attrs):
            mod = types.ModuleType(name)
            mod.__dict__.update(attrs)
            monkeypatch.setitem(sys.modules, name, mod)

        _module('tts._torch_probe', check_cuda_available=lambda: False)
        _module('core.user_lang', get_preferred_lang=lambda: preferred)
        _module('tts.tts_engine',
                TTSEngine=types.SimpleNamespace(_import_check_cache={}),
                get_tts_engine=lambda: engine,
                _runs_on_cpu=lambda backend: backend in ON_CPU)
        _module('tts.package_installer',
                should_install_gpu_ctranslate2=lambda: False,
                has_nvidia_gpu=lambda: False, is_cuda_torch=lambda: True,
                INSTALL_IN_PROGRESS='install in progress')
        _module('llama.llama_config',
                get_llama_endpoint=lambda: f'http://localhost:{llm_port}')
        _module('integrations.service_tools.vram_manager',
                vram_manager=types.SimpleNamespace(get_free_vram=lambda: free_gb))
        _module('integrations.agent_engine.dispatch',
                is_user_recently_active=lambda: busy)

        def _urlopen(url, timeout=None):
            polled.append(url)
            if f':{llm_port}/' not in url:
                raise OSError('connection refused')
            return io.BytesIO(b'{"status":"ok"}')

        monkeypatch.setattr(urllib.request, 'urlopen', _urlopen)
        clock = types.SimpleNamespace(sleep=lambda _s: None, time=time.time,
                                      monotonic=time.monotonic)
        ns = {'__name__': 'main_warmup_under_test', '_hb_register': lambda *a, **k: None,
              'os': os, 'logging': logging, 'time': clock}
        exec(code, ns)
        ns['_warmup_tts']()
        return engine, polled

    return run


def _no_warmup_failure(caplog):
    failed = [r.getMessage() for r in caplog.records if 'TTS warm-up failed' in r.getMessage()]
    assert not failed, failed


def _script_of(text):
    from tts.language_segmenter import segment
    return [s['lang'] for s in segment(text) if s.get('type') == 'speech']


def test_the_warm_up_waits_for_the_llm_on_the_port_its_config_names(boot, caplog):
    caplog.set_level(logging.INFO)
    _engine, polled = boot(llm_port=8082)
    _no_warmup_failure(caplog)
    assert polled == ['http://localhost:8082/health'], (
        f"the warm-up polled {polled[:3]}... ({len(polled)} polls), not the "
        f"configured :8082 once")


def test_the_warm_up_starts_the_voice_last_spoken_on_a_full_gpu(boot, caplog):
    """The owner's desktop: UI 'en', the speech agent last spoke Tamil,
    1.4 GB of VRAM free, mms_tts runs on the CPU."""
    caplog.set_level(logging.INFO)
    engine, _ = boot(preferred='en', spoken=['ta'], free_gb=1.4)
    _no_warmup_failure(caplog)
    assert [(lang, voice) for lang, voice, _t in engine.said] == [
        ('en', 'piper'), ('ta', 'mms_tts')], engine.said
    # Each line is in its own language's script, so the engine keeps that
    # language's voice (it picks the voice by the text's script).
    for lang, _voice, text in engine.said:
        assert _script_of(text) == [lang], (lang, text)
    # The voice spoken last stays the active one, the one set_language pins.
    assert engine.set_to[-1] == 'ta' and engine.backend == 'mms_tts'


def test_the_language_spoken_last_is_warmed_last_even_when_it_is_the_persons_own(boot):
    engine, _ = boot(preferred='en', spoken=['ta', 'en'], free_gb=1.4)
    assert [lang for lang, _v, _t in engine.said] == ['ta', 'en']
    assert engine.set_to[-1] == 'en'


def test_a_voice_that_needs_the_gpu_is_started_only_with_room_there(boot):
    engine, _ = boot(preferred='en', spoken=['zh', 'ta'], free_gb=1.4)
    assert [lang for lang, _v, _t in engine.said] == ['en', 'ta']
    engine, _ = boot(preferred='en', spoken=['zh', 'ta'], free_gb=6.0)
    assert [lang for lang, _v, _t in engine.said] == ['en', 'zh', 'ta']


def test_nothing_is_pre_loaded_while_the_person_is_chatting(boot):
    engine, _ = boot(preferred='en', spoken=['ta'], free_gb=6.0, busy=True)
    assert engine.said == []
