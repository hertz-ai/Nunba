"""One failure does not silence a voice that works.

WHAT WENT WRONG (live, the owner's desktop, 25 Nov 2026)
  At 22:53:56 IST the mms_tts worker failed once at boot: AttributeError
  "module 'torch' has no attribute 'version'".  The same voice had spoken
  at 20:28 and 22:51.  Its answer read "worker startup failed", a structural
  signature, so the ladder demoted mms_tts after ONE start and saved that
  for 7 days in tts_state.json.  Every Tamil line after it was text only,
  restarts included: the auto-install's "already runnable, skipping
  install" branch returned before the heal.  And even without a demotion
  nothing rebuilt the voice on the same language: its instance was dropped,
  _initialized stayed True, and each line after found no instance.

THE RULES (owner, 25 Nov 2026: "Single failure is not reason for demoting a
working TTS if it worked earlier but why it failed could be OOM etc"; 23:40
IST: "if a model has statistically performed good, don't penalise hard ...
and if demoted without another model inference ready that's also bad")
  * After a failed start the next line builds the voice afresh (B1).
  * A voice that has spoken more lines here than it failed gets three
    starts even for a structural failure; a refused key still gets one.
  * The last voice ready for a language is never demoted.  It is started
    once per line, and the log says how long the failed start took.
  * The voice's record (last_ok_at, lines spoken and failed) is written on
    its first line in each run and inside writes that happen anyway, never
    once per line.
  * A demoted voice whose packages run is checked with one synthesis in the
    background, without install_backend_full or a setup card; a pass brings
    it back, a fail is not tried again this run.  A probe of one voice
    passes on that voice's audio only.
  * "TTS unavailable" names the demoted voice and the voices left out for
    GPU memory; "no capable backend fits on this hardware" only when that
    is the cause.  The page's event keeps its 'reason'.
  * One lock over the demotion state and its file: a key stored while a
    failure is being saved waits for the save; the self-heal report is made
    outside the lock.

Real: TTSEngine.synthesize, initialize, _select_backend_for_language,
_speak_with_active_engine, _synthesize_with_fallback, _record_backend_failure,
_record_backend_success, the state file, _try_auto_install_backend,
_check_and_heal, tts_handshake.retry / run_handshake,
verified_synth.verify_backend_synth, restore_voices_waiting_for.  Stand-ins
only at the edges: the voices (no worker process, no model; every start is
counted), the language ladders, the import probe, the installer (a mock that
must not be called), the self-heal reporter, the realtime publisher, the
lifecycle manager and local playback.  Nothing touches the GPU, the network
or the owner's files.

    python -m pytest tests/test_one_failure_does_not_silence_a_voice_that_works.py -q
"""
import json
import logging
import os
import re
import sys
import threading
import time
import types
import wave
from unittest.mock import MagicMock

import pytest

TAMIL = 'வணக்கம், இன்று எப்படி இருக்கிறீர்கள்?'
ENGLISH = 'And now a few words in English.'
TORCH = "AttributeError: module 'torch' has no attribute 'version'"
KEY = 'HEVOLVE_HF_TOKEN'
LOGGER = 'NunbaTTSEngine'


class _NoCache:
    def get(self, *_a, **_k):
        return None


def _write_wav(path, seconds=1.0):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b'\0\0' * int(16000 * seconds))
    return path


def _start_failure(voice, why=TORCH, *, key_refused=False, needs_key=''):
    """What the worker adapter raises for a start that failed
    (_SubprocessTTSBackend.synthesize): the worker's words and its fields."""
    err = RuntimeError(f'{voice}: {voice} worker startup failed: {why}')
    err.transient = False
    err.key_refused = key_refused
    err.needs_key = needs_key
    err.cause = why
    return err


def _passing_failure(voice):
    """A failure with no structural words and no transient flag."""
    err = RuntimeError(f'{voice}: CUDA error: an illegal memory access was encountered')
    err.transient = False
    return err


def _wait_for_threads(prefix, timeout=60):
    deadline = time.monotonic() + timeout
    for t in [t for t in threading.enumerate() if t.name.startswith(prefix)]:
        t.join(max(0.0, deadline - time.monotonic()))
        assert not t.is_alive(), f'{t.name} still running after {timeout}s'


@pytest.fixture
def world(monkeypatch, tmp_path):
    from tts import package_installer, piper_tts
    from tts import tts_engine as te
    from tts import tts_handshake as hs
    from tts import verified_synth as vs

    state = tmp_path / 'tts_state.json'
    monkeypatch.setenv('NUNBA_TTS_STATE_PATH', str(state))
    reports = []
    collector = types.ModuleType('hartos.exception_collector')
    collector.report_subsystem_failure = lambda **k: reports.append(k)
    monkeypatch.setitem(sys.modules, 'hartos.exception_collector', collector)
    advice = types.ModuleType('core.error_advice')
    advice.handle_exception = lambda *_a, **_k: None
    monkeypatch.setitem(sys.modules, 'core.error_advice', advice)
    published = []
    realtime = types.ModuleType('core.realtime')
    realtime.publish_async = (
        lambda topic, payload=None, **_k: published.append((topic, payload)))
    monkeypatch.setitem(sys.modules, 'core.realtime', realtime)
    lifecycle = types.ModuleType('integrations.service_tools.model_lifecycle')
    lifecycle.get_model_lifecycle_manager = lambda: MagicMock()
    monkeypatch.setitem(sys.modules, 'integrations.service_tools.model_lifecycle',
                        lifecycle)
    monkeypatch.setattr(te, '_clear_cuda_cache', lambda: None)
    monkeypatch.setattr(vs, '_backend_err_log_path',
                        lambda b: str(tmp_path / f'{b}.err'))
    monkeypatch.setattr(hs, '_cache', {})
    played, broadcasts = [], []
    monkeypatch.setattr(hs, '_play_locally', played.append)
    monkeypatch.setattr(hs, '_broadcast', broadcasts.append)
    monkeypatch.setattr(te, '_engine', None)
    monkeypatch.setattr(te, '_VRAM_SKIPS', {}, raising=False)
    monkeypatch.setattr(te, '_LADDER_FILTER_CACHE', {})
    monkeypatch.setattr(te.TTSEngine, '_auto_install_pending', set())
    monkeypatch.setattr(te.TTSEngine, '_auto_install_failed', set())
    monkeypatch.setattr(te.TTSEngine, '_import_check_cache', {})
    monkeypatch.setattr(te.TTSEngine, '_restored_for', {})

    # The languages' ladders.  Piper speaks English only.
    ladders = {'ta': [te.BACKEND_MMS_TTS, te.BACKEND_PIPER],
               'en': [te.BACKEND_PIPER]}
    monkeypatch.setattr(te, '_get_lang_preference', lambda lang: list(
        ladders.get(te._normalize_lang(lang), [te.BACKEND_PIPER])))
    monkeypatch.setattr(te, '_get_engine_capabilities', lambda b=None: (
        te._FALLBACK_ENGINE_CAPABILITIES if b is None
        else {'name': b, 'vram_gb': 0}))
    monkeypatch.setattr(te.TTSEngine, '_get_vram_tool_name',
                        classmethod(lambda cls, b: None))
    monkeypatch.setattr(te.TTSEngine, '_can_run_backend', lambda self, b: True)
    monkeypatch.setattr(te, '_is_venv_backend', lambda b: False)

    def _voice_for_lang(lang):
        if te._normalize_lang(lang) == 'en':
            return 'en_US-lessac-medium'
        raise piper_tts.PiperLangUnavailable(f'no Piper voice for {lang}')
    monkeypatch.setattr(piper_tts, 'voice_for_lang', _voice_for_lang)

    # The installer and the import probe: the packages run; installing is
    # recorded and must not happen for an installed voice.
    installs = MagicMock(return_value=(True, 'installed'))
    cards = MagicMock(return_value=None)
    monkeypatch.setattr(package_installer, 'install_backend_full', installs)
    monkeypatch.setattr(package_installer, 'make_chat_progress_callback', cards)
    monkeypatch.setattr(te, '_probe_backend_runnable', lambda backend, pkg: True)
    monkeypatch.setattr(te.TTSEngine, '_get_required_package',
                        classmethod(lambda cls, b: f'{b}_package'))
    monkeypatch.setattr(te, '_setup_failed_on_row', lambda b: False)
    monkeypatch.setattr(te, '_catalog_row', lambda b: (None, None))

    # The voices: no process, no model.  Each start is counted.
    starts = []   # (voice, language), one per start
    fails = {}    # voice -> errors, one per start, then it speaks
    broken = {}   # voice -> error raised on every start
    takes = {}    # voice -> seconds a start takes

    class _Voice:
        def __init__(self, name):
            self.name = name

        def synthesize(self, text, output_path=None, language=None, **_k):
            starts.append((self.name, te._normalize_lang(language)))
            if takes.get(self.name):
                time.sleep(takes[self.name])
            if self.name in broken:
                raise broken[self.name]
            if fails.get(self.name):
                raise fails[self.name].pop(0)
            if self.name == te.BACKEND_PIPER and te._normalize_lang(language) != 'en':
                raise piper_tts.PiperLangUnavailable(f'no Piper voice for {language}')
            return _write_wav(output_path or str(tmp_path / f'{self.name}_{len(starts)}.wav'))

        def unload_model(self):
            pass

    monkeypatch.setattr(te.TTSEngine, '_create_backend',
                        lambda self, b: _Voice(b) if te._is_engine_backend(b) else None)

    def write_state(demoted=None, voice_record=None, spoken=None):
        state.write_text(json.dumps({
            'schema': 1, 'updated_at': time.time(), 'demoted': demoted or {},
            'spoken_languages': spoken or [], 'voice_record': voice_record or {},
        }), encoding='utf-8')

    def on_file():
        return json.loads(state.read_text(encoding='utf-8')) if state.exists() else {}

    def boot(language='ta'):
        """A new engine as the next start of the app makes it (it reads the
        state file), the running one from then on."""
        engine = te.TTSEngine(auto_init=True)
        engine._hw_detected = True
        engine._language = language
        engine._presynth = _NoCache()
        monkeypatch.setattr(te, '_engine', engine)
        return engine

    lines = [0]

    def line(engine, text=TAMIL, language='ta'):
        lines[0] += 1
        out = str(tmp_path / f'line_{lines[0]}.wav')
        return engine.synthesize(text, output_path=out, language=language), out

    def runnable(voice, answer=True):
        """The runnable check's saved answer for ``voice`` (the cache
        _can_run_backend and the auto-install probe fill)."""
        key = (f'venv:{voice}' if te._is_venv_backend(voice)
               else te.TTSEngine._get_required_package(voice))
        te.TTSEngine._import_check_cache[key] = answer

    return types.SimpleNamespace(
        te=te, hs=hs, state=state, reports=reports, published=published,
        ladders=ladders, installs=installs, cards=cards, starts=starts,
        fails=fails, broken=broken, takes=takes, write_state=write_state,
        on_file=on_file, boot=boot, line=line, runnable=runnable,
        played=played, broadcasts=broadcasts)


def _demotion(t0, failures=1):
    return {'first_demoted_at': t0, 'expires_at': t0 + 7 * 86400,
            'failures_at_demotion': failures}


# ── B1: the voice is built again on the next line ─────────────────────

@pytest.mark.parametrize('case', ['spoke_before_then_a_boot_crash',
                                  'new_voice_then_a_passing_error'])
def test_a_voice_whose_start_failed_once_speaks_on_the_next_line(world, case):
    mms = world.te.BACKEND_MMS_TTS
    if case == 'spoke_before_then_a_boot_crash':
        world.write_state(voice_record={mms: {
            'successes': 2, 'failures': 0, 'last_ok_at': time.time() - 300}})
        world.fails[mms] = [_start_failure(mms)]
    else:
        world.fails[mms] = [_passing_failure(mms)]
    engine = world.boot()

    said, _ = world.line(engine)
    assert said is None, 'no other voice speaks Tamil here'
    said, out = world.line(engine)

    assert said == out and os.path.getsize(out) > 0, (
        'the next line found no voice: nothing rebuilt mms_tts')
    assert world.starts == [(mms, 'ta'), (mms, 'ta')]
    assert not engine._is_demoted(mms)


# ── its record decides how hard one failure counts ────────────────────

def test_a_voice_with_a_good_record_gets_three_starts_for_a_structural_failure(world):
    te = world.te
    mms = te.BACKEND_MMS_TTS
    world.ladders['ta'] = [te.BACKEND_INDIC_PARLER, mms, te.BACKEND_PIPER]
    world.runnable(te.BACKEND_INDIC_PARLER)       # another voice is ready
    world.write_state(voice_record={mms: {
        'successes': 50, 'failures': 1, 'last_ok_at': time.time() - 60}})
    engine = world.boot()
    for n in (1, 2):
        engine._record_backend_failure(mms, _start_failure(mms))
        assert not engine._is_demoted(mms), (
            f'demoted after {n} start(s) on a voice that spoke 50 lines here')
    engine._record_backend_failure(mms, _start_failure(mms))
    assert engine._is_demoted(mms), 'the normal threshold still holds'


@pytest.mark.parametrize('record', [None, {'successes': 1, 'failures': 3}],
                         ids=['never_spoke', 'failed_more_than_it_spoke'])
def test_a_voice_without_a_good_record_is_demoted_after_one_structural_failure(
        world, record):
    te = world.te
    mms = te.BACKEND_MMS_TTS
    world.ladders['ta'] = [te.BACKEND_INDIC_PARLER, mms, te.BACKEND_PIPER]
    world.runnable(te.BACKEND_INDIC_PARLER)       # another voice is ready
    if record:
        world.write_state(voice_record={mms: record})
    engine = world.boot()
    engine._record_backend_failure(mms, _start_failure(mms))
    assert engine._is_demoted(mms)


def test_a_refused_key_demotes_a_voice_that_spoke_before_after_one_start(world):
    """Even the last Tamil voice, even with 50 lines behind it: the repo will
    refuse the same key again.  The demotion's save keeps the record."""
    mms = world.te.BACKEND_MMS_TTS
    world.write_state(voice_record={mms: {
        'successes': 50, 'failures': 0, 'last_ok_at': time.time() - 60}})
    engine = world.boot()
    engine._record_backend_failure(mms, _start_failure(
        mms, '401 Client Error', key_refused=True, needs_key=KEY))
    assert engine._is_demoted(mms)
    saved = world.on_file()
    assert saved['demoted'][mms]['needs_key'] == KEY
    assert saved.get('voice_record', {}).get(mms, {}).get('successes') == 50


# ── the record is written once per voice per run, never per line ──────

def test_the_record_is_written_on_a_voices_first_line_in_a_run_never_per_line(
        world, monkeypatch):
    te = world.te
    mms = te.BACKEND_MMS_TTS
    saves = []
    real_save = te.TTSEngine._save_persisted_demotions

    def _counting_save(self):
        saves.append(1)
        return real_save(self)
    monkeypatch.setattr(te.TTSEngine, '_save_persisted_demotions', _counting_save)

    engine = world.boot()
    assert world.line(engine)[0]
    after_first_line = len(saves)
    for _ in range(4):
        assert world.line(engine)[0]
    assert len(saves) == after_first_line, 'a spoken line wrote the state file'
    record = world.on_file().get('voice_record', {}).get(mms)
    assert record and record['successes'] >= 1 and record['last_ok_at'] > 0

    # The next run: five lines, one write (the voice's first line).
    del saves[:]
    engine = world.boot()
    for _ in range(5):
        assert world.line(engine)[0]
    assert len(saves) == 1
    again = world.on_file()['voice_record'][mms]
    assert again['last_ok_at'] >= record['last_ok_at']
    assert again['successes'] > record['successes']

    # The last Tamil voice failing on five lines writes nothing either.
    del saves[:]
    world.broken[mms] = _start_failure(mms)
    for _ in range(5):
        assert world.line(engine)[0] is None
    assert saves == []
    assert not engine._is_demoted(mms)


# ── the last voice ready for a language is not demoted ────────────────

def test_the_last_voice_ready_for_tamil_is_never_demoted(world, caplog):
    mms = world.te.BACKEND_MMS_TTS
    world.broken[mms] = _start_failure(mms)        # a new voice: no record
    engine = world.boot()
    with caplog.at_level(logging.WARNING, logger=LOGGER):
        for _ in range(4):
            assert world.line(engine)[0] is None
    assert not engine._is_demoted(mms)
    assert engine._consecutive_failures[mms] == 4
    assert world.starts == [(mms, 'ta')] * 4, 'started again on each line, once'
    kept = [r.getMessage() for r in caplog.records if 'KEPT' in r.getMessage()]
    assert kept and "no other voice for 'ta' is ready" in kept[0]
    assert mms not in world.on_file().get('demoted', {})


@pytest.mark.parametrize('other', ['ready', 'handshake_failed', 'demoted'])
def test_a_voice_is_demoted_only_when_another_voice_for_the_language_is_ready(
        world, other):
    """Indic Parler's packages import (the runnable check said so).  A failed
    handshake saved for it this run, or its demotion, means it is not ready:
    mms_tts is kept.  The fallback itself still tries a voice whose saved
    handshake failed (that verdict can be stale), but never a demoted one."""
    te = world.te
    mms, parler = te.BACKEND_MMS_TTS, te.BACKEND_INDIC_PARLER
    world.ladders['ta'] = [mms, parler, te.BACKEND_PIPER]
    world.runnable(parler)
    world.broken[mms] = _start_failure(mms)
    engine = world.boot()
    if other == 'handshake_failed':
        world.hs._cache[(parler, 'ta')] = types.SimpleNamespace(ok=False)
    elif other == 'demoted':
        engine._demoted_backends.add(parler)

    said, out = world.line(engine)

    if other == 'ready':
        assert engine._is_demoted(mms)
        assert said == out and world.starts[-1] == (parler, 'ta')
    else:
        assert not engine._is_demoted(mms), f'demoted with no other voice ready ({other})'
    if other == 'handshake_failed':
        assert said == out and world.starts[-1] == (parler, 'ta'), (
            'the fallback left out a voice for a saved verdict')
    if other == 'demoted':
        assert said is None
        assert (parler, 'ta') not in world.starts


@pytest.mark.parametrize('other', [
    'venv_folder_without_its_packages', 'never_checked',
    'runnable_check_said_yes', 'handshake_passed_this_run',
    'spoke_a_line_this_run'])
def test_another_voice_counts_as_ready_only_when_it_can_speak_now(
        world, monkeypatch, other):
    """Ready means it spoke in this run or the runnable check's saved answer
    says its packages import.  A venv folder whose packages are missing, or a
    voice nobody checked (chatterbox_multilingual speaks Tamil and has no
    venv), is not ready: mms_tts is kept (owner, 23:40 IST: "if demoted
    without another model inference ready that's also bad")."""
    from tts import backend_venv
    te = world.te
    mms = te.BACKEND_MMS_TTS
    other_voice = (te.BACKEND_INDIC_PARLER if other == 'venv_folder_without_its_packages'
                   else te.BACKEND_CHATTERBOX_ML)
    world.ladders['ta'] = [mms, other_voice, te.BACKEND_PIPER]
    if other == 'venv_folder_without_its_packages':
        monkeypatch.setattr(te, '_is_venv_backend', lambda b: b == other_voice)
        # the folder is there: the venv layer's check without a probe says yes
        monkeypatch.setattr(backend_venv, 'is_venv_healthy',
                            lambda name, probe_module=None: True)
        world.runnable(other_voice, False)        # its import probe said no
    elif other == 'runnable_check_said_yes':
        world.runnable(other_voice)
    elif other == 'handshake_passed_this_run':
        world.hs._cache[(other_voice, 'ta')] = types.SimpleNamespace(ok=True)
    engine = world.boot()
    if other == 'spoke_a_line_this_run':
        engine._stamped_this_run.add(other_voice)

    # mms_tts (no record) fails a start once on a Tamil line
    engine._record_backend_failure(mms, _start_failure(mms), language='ta')

    ready = other in ('runnable_check_said_yes', 'handshake_passed_this_run',
                      'spoke_a_line_this_run')
    assert engine._is_demoted(mms) is ready, (
        f'{other}: mms_tts demoted={engine._is_demoted(mms)}, '
        f'{"ready" if ready else "not ready"} expected')


# ── a saved failed handshake does not take a voice off the fallback ───

def test_a_tamil_voice_with_an_old_failed_handshake_still_takes_the_lines(world):
    """mms_tts works, but a handshake of it failed earlier in this run and
    that verdict is still saved.  The selector passes over it (as before);
    the fallback must not: before, all three lines were silent."""
    mms = world.te.BACKEND_MMS_TTS
    world.hs._cache[(mms, 'ta')] = types.SimpleNamespace(ok=False)
    engine = world.boot()
    for n in (1, 2, 3):
        said, out = world.line(engine)
        assert said == out, f'Tamil line {n} silent with mms_tts working'
    assert world.starts == [(mms, 'ta')] * 3


def test_piper_with_an_old_failed_handshake_still_takes_an_english_line(world):
    """Piper is the last resort and is never set aside: a failed handshake
    of it saved earlier in this run does not take it off the fallback, so an
    English line whose voice fails still speaks."""
    te = world.te
    xtts, piper = te.BACKEND_XTTS_V2, te.BACKEND_PIPER
    world.ladders['en'] = [xtts, piper]
    world.hs._cache[(piper, 'en')] = types.SimpleNamespace(ok=False)
    world.broken[xtts] = _start_failure(xtts)
    engine = world.boot(language='en')
    said, out = world.line(engine, ENGLISH, language='en')
    assert said == out, 'the English line was silent: Piper was left out'
    assert world.starts == [(xtts, 'en'), (piper, 'en')]


def test_a_kept_voice_is_started_once_per_line_and_the_log_says_what_it_cost(
        world, caplog):
    te = world.te
    mms = te.BACKEND_MMS_TTS
    world.broken[mms] = _start_failure(mms)
    world.takes[mms] = 0.15
    engine = world.boot()
    with caplog.at_level(logging.WARNING, logger=LOGGER):
        assert world.line(engine)[0] is None
        # Tamil, English, Tamil: one line, one start of mms_tts.
        said, _ = world.line(engine, f'{TAMIL} {ENGLISH} {TAMIL}')
        assert said, 'the English part of the line was not spoken'
        assert world.line(engine)[0] is None
    assert [s for s in world.starts if s[0] == mms] == [(mms, 'ta')] * 3, (
        f'mms_tts must start once on each line: {world.starts}')
    assert (te.BACKEND_PIPER, 'en') in world.starts
    took = [float(s) for r in caplog.records for s in re.findall(
        r'mms_tts failed on this line after (\d+\.\d+) s', r.getMessage())]
    assert took and min(took) >= 0.1, 'the failed start was not timed in the log'
    assert not engine._is_demoted(mms)


# ── a demoted voice whose packages run: checked, not reinstalled ──────

def test_a_demoted_voice_whose_packages_run_is_checked_and_brought_back_without_an_install(
        world):
    mms = world.te.BACKEND_MMS_TTS
    t0 = time.time() - 3600
    world.write_state(demoted={mms: _demotion(t0)}, voice_record={mms: {
        'successes': 2, 'failures': 1, 'last_ok_at': t0 - 60}})
    engine = world.boot()
    assert engine._is_demoted(mms)

    engine._select_backend_for_language('ta')    # the ladder meets it (PASS 2)
    _wait_for_threads('tts-heal-')

    world.installs.assert_not_called()
    world.cards.assert_not_called()
    assert not engine._is_demoted(mms), 'the installed voice stayed demoted'
    assert mms not in world.on_file().get('demoted', {})
    assert mms not in world.te.TTSEngine._auto_install_failed
    said, out = world.line(engine)
    assert said == out and world.starts[-1] == (mms, 'ta')


def test_the_check_of_a_demoted_voice_is_quiet(world):
    """The heal runs during a conversation: its handshake is not broadcast
    (the page made it a "Voice engine ready" card) and its greeting is not
    played on the speakers."""
    mms = world.te.BACKEND_MMS_TTS
    world.write_state(demoted={mms: _demotion(time.time() - 3600)})
    engine = world.boot()
    engine._select_backend_for_language('ta')
    _wait_for_threads('tts-heal-')
    assert not engine._is_demoted(mms), 'the check did not pass'
    assert world.broadcasts == [], 'the heal broadcast its handshake to the page'
    assert world.played == [], 'the heal played its greeting on the speakers'


def test_an_install_still_announces_its_voice(world, monkeypatch):
    """An install shows its own setup card: its check still broadcasts and
    plays the greeting, as before."""
    te = world.te
    mms = te.BACKEND_MMS_TTS
    monkeypatch.setattr(te, '_probe_backend_runnable', lambda backend, pkg: False)
    world.cards.return_value = MagicMock()        # the setup card's progress
    world.write_state(demoted={mms: _demotion(time.time() - 3600)})
    engine = world.boot()
    engine._select_backend_for_language('ta')
    _wait_for_threads('tts-auto-install-')
    world.installs.assert_called_once()
    assert not engine._is_demoted(mms)
    assert len(world.broadcasts) == 1 and world.played


def test_a_heal_check_that_fails_keeps_the_voice_demoted_and_is_not_tried_again(world):
    """Another Tamil voice speaks, so a probe that fell back to it would have
    passed mms_tts on indic_parler's audio."""
    te = world.te
    mms, parler = te.BACKEND_MMS_TTS, te.BACKEND_INDIC_PARLER
    world.ladders['ta'] = [mms, parler, te.BACKEND_PIPER]
    world.broken[mms] = _start_failure(mms)       # still broken
    world.write_state(demoted={mms: _demotion(time.time() - 3600)})
    engine = world.boot()

    engine._select_backend_for_language('ta')
    _wait_for_threads('tts-heal-')

    world.installs.assert_not_called()
    assert engine._is_demoted(mms), "the check passed on another voice's audio"
    assert mms in te.TTSEngine._auto_install_failed
    before = list(world.starts)
    engine._select_backend_for_language('ta')
    assert not [t for t in threading.enumerate() if t.name.startswith('tts-heal-')]
    assert world.starts == before, 'checked again in the same run'


def test_a_handshake_of_a_voice_that_still_fails_does_not_pass_on_another_voices_audio(
        world):
    te = world.te
    mms, parler = te.BACKEND_MMS_TTS, te.BACKEND_INDIC_PARLER
    world.ladders['ta'] = [mms, parler, te.BACKEND_PIPER]
    world.broken[mms] = _start_failure(mms)
    engine = world.boot()
    result = world.hs.run_handshake(engine, mms, lang='ta', timeout_s=30,
                                    broadcast=False, play_audio=False)
    assert result.ok is False, "mms_tts's handshake passed on indic_parler's audio"


def test_only_the_running_engine_checks_a_demoted_voice(world, monkeypatch):
    """models/orchestrator.py asks with an engine of its own: its demotions
    are a copy, and a heal there would save that copy over the file."""
    te = world.te
    mms = te.BACKEND_MMS_TTS
    world.write_state(demoted={mms: _demotion(time.time() - 3600)})
    world.boot()
    own = te.TTSEngine(auto_init=False)
    assert own._try_auto_install_backend(mms) is True
    assert not [t for t in threading.enumerate() if t.name.startswith('tts-heal-')]
    assert own._is_demoted(mms)


# ── "TTS unavailable" says why ────────────────────────────────────────

def test_the_unavailable_line_names_the_demotion_not_the_hardware(
        world, caplog, monkeypatch):
    te = world.te
    mms = te.BACKEND_MMS_TTS
    monkeypatch.setattr(te.TTSEngine, '_try_auto_install_backend',
                        lambda self, b: False)
    t0 = time.time() - 3600
    world.write_state(demoted={mms: _demotion(t0)})
    engine = world.boot()
    with caplog.at_level(logging.ERROR, logger=LOGGER):
        assert world.line(engine)[0] is None
    said = ' '.join(r.getMessage() for r in caplog.records
                    if 'TTS unavailable' in r.getMessage())
    when = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(t0))
    assert f'mms_tts demoted since {when} after 1 failure' in said, said
    assert 'no capable backend fits on this hardware' not in said
    payload = [p for topic, p in world.published
               if topic.endswith('tts.lang_unsupported')][-1]
    assert payload['reason'] == 'no_capable_backend_fits_on_hardware'
    assert payload['set_aside'] == [
        {'backend': mms, 'why': 'demoted', 'failures': 1, 'since': t0}]


def test_a_voice_left_out_for_gpu_memory_is_named_with_free_and_needed_gb(
        world, caplog, monkeypatch):
    """The real VRAM filter over a stand-in VRAM manager: 1.0 GB free, Indic
    Parler (GPU only) needs 2.0 GB."""
    te = world.te
    vram = types.ModuleType('integrations.service_tools.vram_manager')
    vram.VRAM_BUDGETS = {'tts_indic_parler': (2.0, 1.8)}
    vram.vram_manager = types.SimpleNamespace(get_free_vram=lambda: 1.0)
    monkeypatch.setitem(sys.modules, 'integrations.service_tools.vram_manager', vram)
    monkeypatch.setattr(te, '_runs_on_cpu', lambda b: False)
    monkeypatch.setattr(te, '_get_lang_preference', lambda lang: (
        te._filter_ladder_by_vram_budget([te.BACKEND_INDIC_PARLER, te.BACKEND_PIPER])))
    engine = world.boot()
    with caplog.at_level(logging.ERROR, logger=LOGGER):
        assert world.line(engine)[0] is None
    said = ' '.join(r.getMessage() for r in caplog.records
                    if 'TTS unavailable' in r.getMessage())
    assert ('no capable backend fits on this hardware (indic_parler skipped for '
            'VRAM (1.0 GB free, 2.0 GB needed))') in said, said


# ── one lock over the demotion state and its file ─────────────────────

class _SaveHook(dict):
    """_demotion_meta, which the save walks while it builds the file: the
    first look inside the save calls ``during_save``."""

    def __init__(self, data, during_save):
        super().__init__(data)
        self.during_save = during_save
        self.fired = False

    def setdefault(self, key, default=None):
        if not self.fired:
            self.fired = True
            self.during_save()
        return super().setdefault(key, default)


def test_a_failure_recorded_while_a_key_is_stored_waits_for_the_save(world):
    """Thread A demotes xtts_v2 and saves; while A's save walks the demoted
    voices, thread B stores the key indic_parler waits for
    (restore_voices_waiting_for).  B must wait for the save: without one lock
    B changed the set under the save ("Set changed size during iteration")
    and xtts_v2's demotion never reached the file.  Both threads finish (the
    joins have timeouts), so a reversed lock order would fail here too, and
    the self-heal report is made with the lock free."""
    te = world.te
    xtts, parler = te.BACKEND_XTTS_V2, te.BACKEND_INDIC_PARLER
    world.ladders['en'] = [xtts, te.BACKEND_PIPER]     # Piper is ready for English
    engine = world.boot(language='en')
    now = time.time()
    engine._demoted_backends.add(parler)
    engine._demotion_meta[parler] = {'first_demoted_at': now,
                                     'expires_at': now + 86400, 'needs_key': KEY}
    engine._save_persisted_demotions()

    restore = {'thread': None, 'done_inside_the_save': None}
    lock_free_during_report = []

    def _store_the_key():
        t = threading.Thread(
            target=te.TTSEngine.restore_voices_waiting_for, args=(KEY,),
            daemon=True, name='test-key-stored')
        restore['thread'] = t
        t.start()
        t.join(0.5)
        restore['done_inside_the_save'] = not t.is_alive()

    def _report(**_k):
        got = []

        def _try():
            lock = te.TTSEngine._state_lock
            ok = lock.acquire(timeout=1)
            got.append(ok)
            if ok:
                lock.release()
        probe = threading.Thread(target=_try, daemon=True)
        probe.start()
        probe.join(5)
        lock_free_during_report.append(bool(got and got[0]))
    sys.modules['hartos.exception_collector'].report_subsystem_failure = _report

    engine._demotion_meta = _SaveHook(engine._demotion_meta, _store_the_key)
    a = threading.Thread(target=engine._record_backend_failure,
                         args=(xtts, _start_failure(xtts)), daemon=True,
                         name='test-failure-recorded')
    a.start()
    a.join(10)
    assert not a.is_alive(), 'the failure never finished: deadlock'
    assert engine._demotion_meta.fired, 'the save never ran'
    restore['thread'].join(10)
    assert not restore['thread'].is_alive(), 'the key restore never finished: deadlock'

    saved = world.on_file()['demoted']
    assert xtts in saved, "the failure's demotion was lost from the file"
    assert parler not in saved
    assert engine._is_demoted(xtts) and not engine._is_demoted(parler)
    assert restore['done_inside_the_save'] is False, 'the restore ran inside the save'
    assert lock_free_during_report == [True], 'the self-heal report ran under the lock'
