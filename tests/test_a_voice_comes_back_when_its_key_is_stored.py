"""A voice set aside for want of a Hugging Face key comes back when the owner
stores the key; a start that failed for a reason that passes by itself does
not set a voice aside at all.

Two defects in the ladder's 7-day demotion (review rv_2ae3):

  - no way back.  A voice demoted because its repo refused the stored key,
    or because no key was stored, stayed demoted for 7 days after the owner
    stored a working key.  The gate blocked and asked, and had no recovery.
    The vault now says a key was stored where it stores it
    (hartos.ai_key_vault.on_credential_stored, the name only), and the
    ladder puts back the voices that were waiting for that key, and only
    those (TTSEngine.restore_voices_waiting_for).

  - later is not the next line.  Such a start is left alone for a while by
    HARTOS's worker (30 s doubling to 10 minutes), so 20 lines cost one
    start, not 20 (review rv_4625).

  - a passing failure read as a broken voice.  A network timeout, a full
    disk or the GPU out of memory while the worker STARTS all answered
    "worker startup failed", which the ladder demotes for 7 days after one
    start.  HARTOS now flags those ``transient`` (the flag a crash
    mid-request already carries); a start that is really broken (a missing
    package, a bad model file) is demoted after one start as before.

  - and the other way.  When a revoke takes a consent answer's key back
    (hartos.ai_key_vault.on_credential_removed), the voices that key
    brought back are set aside again with the demotion they had.

Real: HARTOS AIKeyVault.store_credential, take_back_answer, gated_weights_failure,
ToolWorker.call/synthesize; Nunba _SubprocessTTSBackend.synthesize,
_is_structural_error, _record_backend_failure, the saved state file and its
reload.  Faked: the worker's start (raises; nothing is spawned), the
secrets store behind the vault (a dict; no file, no real key), the key ask,
the audit log and the self-heal push.  Key values are made up.
"""
import json
import os
import sys
import types

import pytest

REPO = 'ai4bharat/indic-parler-tts'
PAGE = f'https://huggingface.co/{REPO}'
VOICE = 'indic_parler'
OTHER = 'chatterbox_turbo'
KEY = 'HEVOLVE_HF_TOKEN'
GATED_401 = (f'401 Client Error. Cannot access gated repo for url {PAGE}/'
             f'resolve/main/config.json.\nAccess to model {REPO} is restricted.')


class _Store:
    """The secrets store behind the vault: a dict."""

    def __init__(self):
        self._cache = {}

    def get_secret(self, name):
        return self._cache.get(name, '')

    def set_secret(self, name, value):
        self._cache[name] = value

    def set_secrets(self, changes):
        for name, value in changes.items():
            if value is None:
                self._cache.pop(name, None)
            else:
                self._cache[name] = value

    def delete_secret(self, name):
        self._cache.pop(name, None)


@pytest.fixture
def world(monkeypatch, tmp_path):
    import hartos.ai_key_vault as akv
    from integrations.service_tools import gpu_worker as gw

    from tts import tts_engine as te

    monkeypatch.setenv('NUNBA_TTS_STATE_PATH', str(tmp_path / 'tts_state.json'))
    monkeypatch.delenv(KEY, raising=False)
    monkeypatch.delenv('HF_TOKEN', raising=False)
    monkeypatch.setitem(
        sys.modules, 'hartos.exception_collector',
        types.SimpleNamespace(report_subsystem_failure=lambda **k: None))
    monkeypatch.setitem(
        sys.modules, 'security.immutable_audit_log',
        types.SimpleNamespace(get_audit_log=lambda: types.SimpleNamespace(
            log_event=lambda *a, **k: None)))
    monkeypatch.setitem(
        sys.modules, 'security.audit_trail',
        types.SimpleNamespace(record=lambda *a, **k: None,
                              current_request_id=lambda: None))
    vault = akv.AIKeyVault()
    vault._sm = _Store()
    vault._granted_names = lambda: set()
    monkeypatch.setattr(akv, 'get_ai_key_vault', lambda: vault)
    # The key stays in the vault: a test never sets it in the environment.
    monkeypatch.setattr(akv, 'reads_from_env', lambda name: False)
    monkeypatch.setattr(akv, 'is_node_secret', lambda name: False)
    monkeypatch.setattr(akv, '_STORED_LISTENERS', [], raising=False)
    monkeypatch.setattr(akv, '_REMOVED_LISTENERS', [], raising=False)
    monkeypatch.setattr(te.TTSEngine, '_restored_for', {}, raising=False)
    asked = []
    monkeypatch.setattr(akv, 'request_credential',
                        lambda desc, agent_id=None, **kw: asked.append(desc))
    monkeypatch.setattr(te, '_engine', None)

    def backend(start_error, voice=VOICE):
        worker = gw.ToolWorker(tool_name=voice, tool_module='x',
                               vram_budget=f'tts_{voice}', output_subdir='t',
                               engine='t')

        def _start():
            raise start_error
        worker._get_or_start = _start
        adapter = te._SubprocessTTSBackend(voice)
        adapter._worker = worker
        adapter._synthesize_fn = lambda **kw: worker.synthesize(
            text=kw['text'], language=kw['language'], voice=kw['voice'],
            output_path=kw['output_path'])
        return adapter

    def start_error(adapter):
        with pytest.raises(RuntimeError) as caught:
            adapter.synthesize('vanakkam', output_path=str(tmp_path / 'a.wav'),
                               language='ta')
        return caught.value

    def boot():
        """A new engine, as the next start of the app makes it; it is the
        running engine from then on."""
        engine = te.TTSEngine(auto_init=False)
        monkeypatch.setattr(te, '_engine', engine)
        return engine

    return types.SimpleNamespace(akv=akv, gw=gw, te=te, vault=vault,
                                 backend=backend, start_error=start_error,
                                 boot=boot, asked=asked,
                                 state=str(tmp_path / 'tts_state.json'))


def _on_file(world):
    try:
        return json.load(open(world.state, encoding='utf-8')).get('demoted', {})
    except OSError:
        return {}


def _demote_for_refused_key(world, engine):
    world.vault.store_credential(KEY, 'made-up-first-key')
    gated = world.backend(world.gw.WorkerError(GATED_401))
    engine._record_backend_failure(VOICE, world.start_error(gated))
    assert engine._is_demoted(VOICE)


def _demote_for_another_reason(world, engine):
    broken = world.backend(
        world.gw.WorkerError("ModuleNotFoundError: No module named 'chatterbox'"),
        voice=OTHER)
    engine._record_backend_failure(OTHER, world.start_error(broken))
    assert engine._is_demoted(OTHER)


# ── the way back ────────────────────────────────────────────────────

def test_a_new_key_brings_back_the_voice_its_repo_refused(world):
    engine = world.boot()
    _demote_for_refused_key(world, engine)
    assert _on_file(world)[VOICE].get('needs_key') == KEY

    world.vault.store_credential(KEY, 'made-up-second-key')

    assert not engine._is_demoted(VOICE)
    assert engine._consecutive_failures.get(VOICE) == 0
    assert VOICE not in _on_file(world)
    assert not world.boot()._is_demoted(VOICE)


def test_it_comes_back_after_a_restart_too(world):
    """Demoted in one run, the key stored in the next: the engine that
    loaded the saved demotion is the one put right."""
    _demote_for_refused_key(world, world.boot())
    engine = world.boot()
    assert engine._is_demoted(VOICE)
    assert engine._demotion_meta[VOICE].get('needs_key') == KEY

    world.vault.store_credential(KEY, 'made-up-second-key')

    assert not engine._is_demoted(VOICE)
    assert VOICE not in _on_file(world)


def test_it_comes_back_with_no_engine_running(world):
    """The key is stored before the voice engine exists in this run."""
    _demote_for_refused_key(world, world.boot())
    world.te._engine = None

    world.vault.store_credential(KEY, 'made-up-second-key')

    assert VOICE not in _on_file(world)
    assert not world.boot()._is_demoted(VOICE)


def test_a_voice_that_waited_for_a_missing_key_comes_back(world):
    engine = world.boot()
    gated = world.backend(world.gw.WorkerError(GATED_401))
    for _ in range(3):
        engine._record_backend_failure(VOICE, world.start_error(gated))
    assert engine._is_demoted(VOICE)
    assert _on_file(world)[VOICE].get('needs_key') == KEY

    world.vault.store_credential(KEY, 'made-up-first-key')

    assert not engine._is_demoted(VOICE)
    assert VOICE not in _on_file(world)


def test_only_the_voices_that_waited_for_that_key_come_back(world):
    engine = world.boot()
    _demote_for_refused_key(world, engine)
    _demote_for_another_reason(world, engine)
    assert 'needs_key' not in _on_file(world)[OTHER]
    kept = dict(_on_file(world)[OTHER])

    world.vault.store_credential(KEY, 'made-up-second-key')

    assert not engine._is_demoted(VOICE)
    assert engine._is_demoted(OTHER)
    assert _on_file(world) == {OTHER: kept}
    assert world.boot()._is_demoted(OTHER)


def test_another_key_brings_nothing_back(world):
    engine = world.boot()
    _demote_for_refused_key(world, engine)
    before = _on_file(world)

    world.vault.store_credential('OPENAI_API_KEY', 'made-up-other-key')
    restore = getattr(world.te.TTSEngine, 'restore_voices_waiting_for', None)
    assert restore is not None and restore('') == []

    assert engine._is_demoted(VOICE)
    assert _on_file(world) == before


def test_a_new_key_the_repo_refuses_too_demotes_again(world):
    """Recovery is a fresh chance, not a pass."""
    engine = world.boot()
    _demote_for_refused_key(world, engine)
    world.vault.store_credential(KEY, 'made-up-second-key')
    assert not engine._is_demoted(VOICE)

    gated = world.backend(world.gw.WorkerError(GATED_401))
    engine._record_backend_failure(VOICE, world.start_error(gated))

    assert engine._is_demoted(VOICE)
    assert _on_file(world)[VOICE].get('needs_key') == KEY


def test_the_ladder_listens_once_however_many_engines_were_made(world):
    for _ in range(3):
        world.boot()
    assert len(world.akv._STORED_LISTENERS) == 1


def test_no_key_value_is_written_anywhere(world, caplog):
    engine = world.boot()
    with caplog.at_level(0):
        _demote_for_refused_key(world, engine)
        saved = open(world.state, encoding='utf-8').read()
        world.vault.store_credential(KEY, 'made-up-second-key')
    for value in ('made-up-first-key', 'made-up-second-key'):
        assert value not in saved
        assert value not in caplog.text
        assert value not in open(world.state, encoding='utf-8').read()


# ── a start that may pass, and one that is broken ───────────────────

@pytest.mark.parametrize('why', [
    'ReadTimeout: HTTPSConnectionPool(host=huggingface.co): Read timed out.',
    'OSError: [Errno 28] No space left on device',
    'torch.OutOfMemoryError: CUDA out of memory. Tried to allocate 2.00 GiB',
])
def test_a_start_that_may_pass_is_not_a_broken_voice(world, why):
    engine = world.boot()
    adapter = world.backend(world.gw.WorkerError(why))
    err = world.start_error(adapter)
    assert str(err) == f'{VOICE}: {VOICE} worker startup failed: {why}'
    assert getattr(err, 'transient', None) is True
    assert engine._is_structural_error(err) is False
    # Counted or not, one such start never demotes, and nothing is saved.
    engine._record_backend_failure(VOICE, err)
    assert not engine._is_demoted(VOICE)
    assert not os.path.exists(world.state)


@pytest.mark.parametrize('why', [
    "ModuleNotFoundError: No module named 'parler_tts'",
    'FileNotFoundError: model file not found: config.json',
    'RuntimeError: Error(s) in loading state_dict for ParlerTTS',
])
def test_a_start_that_is_broken_is_demoted_after_one_start(world, why):
    engine = world.boot()
    adapter = world.backend(world.gw.WorkerError(why))
    err = world.start_error(adapter)
    assert str(err) == f'{VOICE}: {VOICE} worker startup failed: {why}'
    assert err.transient is False
    assert engine._is_structural_error(err) is True
    engine._record_backend_failure(VOICE, err)
    assert engine._is_demoted(VOICE)
    assert VOICE in _on_file(world)
    assert 'needs_key' not in _on_file(world)[VOICE]


def test_the_workers_own_startup_deadline_is_a_broken_start(world):
    """A worker that never answers is not started again on every line."""
    engine = world.boot()
    err = world.start_error(world.backend(
        world.gw.WorkerTimeout(f'{VOICE}: startup timeout (120s)')))
    assert err.transient is False
    assert engine._is_structural_error(err) is True
    engine._record_backend_failure(VOICE, err)
    assert engine._is_demoted(VOICE)


def test_a_broken_start_whose_last_lines_mention_the_network_stays_broken(world):
    """The child's stderr tail is read too: a retry warning above the real
    cause does not turn a missing package into a passing failure."""
    engine = world.boot()
    crash = world.gw.WorkerCrash(f'{VOICE}: died during startup (exit=1)')
    crash.stderr_tail = ('warning: connection reset, retrying\n'
                         "ModuleNotFoundError: No module named 'parler_tts'")
    err = world.start_error(world.backend(crash))
    assert err.transient is False
    assert engine._is_structural_error(err) is True


def test_what_the_worker_died_of_goes_with_the_error(world):
    """Owner ruling 2026-11-22: "Real failure reasons should be available to
    the agent so that it can ask correct questions".  The error's own words
    are "died during startup (exit=1)"; the worker's answer names the cause
    beside them (HARTOS gpu_worker), and it was dropped here (review rv_vt
    of HARTOS befa0bc31)."""
    crash = world.gw.WorkerCrash(f'{VOICE}: died during startup (exit=1)')
    crash.stderr_tail = ('loading model...\n'
                         "ModuleNotFoundError: No module named 'parler_tts'")
    err = world.start_error(world.backend(crash))
    assert str(err) == (
        f'{VOICE}: {VOICE} worker startup failed: {VOICE}: died during '
        f"startup (exit=1) (cause: ModuleNotFoundError: No module named "
        f"'parler_tts')")
    assert getattr(err, 'cause', None) == \
        "ModuleNotFoundError: No module named 'parler_tts'"


def test_a_cause_the_error_already_says_is_not_said_twice(world):
    err = world.start_error(world.backend(
        world.gw.WorkerError('CUDA out of memory')))
    assert str(err) == f'{VOICE}: {VOICE} worker startup failed: CUDA out of memory'
    assert getattr(err, 'cause', None) == 'CUDA out of memory'


def test_a_death_at_startup_for_want_of_memory_may_pass(world):
    """The usual shape: the child dies and its stderr says why."""
    engine = world.boot()
    crash = world.gw.WorkerCrash(f'{VOICE}: died during startup (exit=1)')
    crash.stderr_tail = 'torch.OutOfMemoryError: CUDA out of memory.'
    err = world.start_error(world.backend(crash))
    assert err.transient is True
    assert engine._is_structural_error(err) is False


# ── later, not on the next line (review rv_4625) ────────────────────

class _Piper:
    """The last-resort voice: always speaks."""

    def synthesize(self, text, output_path=None, **kw):
        with open(output_path, 'wb') as f:
            f.write(b'RIFF' + b'\0' * 20000)
        return output_path


def _speaking_engine(world, monkeypatch, tmp_path, why):
    """(engine, worker, speak): the ladder with the gated voice selected
    over a worker whose start dies of ``why``, and Piper behind it."""
    te, gw = world.te, world.gw
    monkeypatch.setattr(te.TTSEngine, '_get_vram_tool_name',
                        classmethod(lambda cls, backend: None))
    # no other voice is built for a fallback: nothing real is spawned
    monkeypatch.setattr(te.TTSEngine, '_create_backend',
                        lambda self, backend: None)
    crash = gw.WorkerCrash(f'{VOICE}: died during startup (exit=2)')
    crash.stderr_tail = why
    adapter = world.backend(crash)
    worker = adapter._worker
    starts = []
    fail = worker._get_or_start

    def _start():
        starts.append(1)
        return fail()
    worker._get_or_start = _start
    engine = world.boot()
    engine._backends[te.BACKEND_PIPER] = _Piper()

    def speak(lines):
        spoken = 0
        for _ in range(lines):
            if VOICE not in engine._backends and not engine._is_demoted(VOICE):
                engine._backends[VOICE] = adapter
            if not engine._is_demoted(VOICE):
                engine._active_backend = VOICE
            if engine._speak_with_active_engine(
                    'hello there friend', str(tmp_path / 'o.wav'), None, 'en'):
                spoken += 1
        return spoken
    return engine, starts, speak


@pytest.mark.parametrize('why', [
    'OSError: [Errno 28] No space left on device',
    'torch.OutOfMemoryError: CUDA out of memory. Tried to allocate 2.00 GiB',
    'MemoryError',
])
def test_twenty_lines_cost_one_start_while_the_cause_lasts(
        world, monkeypatch, tmp_path, why):
    """Was 20 starts for 20 lines: a failure that may pass was never
    counted here and never held back there.  HARTOS's worker now leaves
    the voice alone for a while (ToolWorker's start backoff); every line
    is still spoken, by the voice behind it."""
    engine, starts, speak = _speaking_engine(world, monkeypatch, tmp_path, why)
    assert speak(20) == 20
    assert len(starts) == 1
    assert not engine._is_demoted(VOICE)
    assert not os.path.exists(world.state)


def test_a_broken_voice_costs_one_start_and_is_set_aside(
        world, monkeypatch, tmp_path):
    engine, starts, speak = _speaking_engine(
        world, monkeypatch, tmp_path,
        "ModuleNotFoundError: No module named 'parler_tts'")
    assert speak(20) == 20
    assert len(starts) == 1
    assert engine._is_demoted(VOICE)


def test_a_model_file_that_will_not_load_is_broken_whatever_its_log_says(
        world, monkeypatch, tmp_path):
    """The hub's "Read timed out ... Retrying" above the real cause."""
    engine, starts, speak = _speaking_engine(
        world, monkeypatch, tmp_path,
        "ReadTimeoutError: Read timed out. (read timeout=10)\n"
        "Retrying in 1s [Retry 1/5].\n"
        "safetensors_rust.SafetensorError: Error while deserializing header: "
        "HeaderTooLarge")
    assert speak(6) == 6
    assert len(starts) == 1
    assert engine._is_demoted(VOICE)


def test_a_refused_key_costs_one_start_over_many_lines(
        world, monkeypatch, tmp_path):
    world.vault.store_credential(KEY, 'made-up-first-key')
    engine, starts, speak = _speaking_engine(
        world, monkeypatch, tmp_path, GATED_401)
    assert speak(20) == 20
    assert len(starts) == 1
    assert engine._is_demoted(VOICE)
    assert _on_file(world)[VOICE].get('needs_key') == KEY


# ── whose key it is ─────────────────────────────────────────────────

def test_a_fallback_voice_does_not_inherit_the_first_voices_key(world):
    """A fallback fails inside the ``except`` of the voice before it, so
    that voice's failure is its ``__context__``.  Review rv_4625: xtts_v2,
    which died of something else, was recorded as waiting for the key."""
    engine = world.boot()
    world.vault.store_credential(KEY, 'made-up-first-key')
    gated = world.backend(world.gw.WorkerError(GATED_401))
    broken = world.backend(
        world.gw.WorkerError('xtts_v2: died during startup (exit=2)'),
        voice='xtts_v2')
    try:
        gated.synthesize('vanakkam', output_path='a.wav', language='ta')
    except RuntimeError as first:
        engine._record_backend_failure(VOICE, first)
        try:
            broken.synthesize('vanakkam', output_path='a.wav', language='ta')
        except RuntimeError as second:
            assert second.__context__ is first
            assert engine._needed_key(second) == ''
            engine._record_backend_failure('xtts_v2', second)
    assert _on_file(world)[VOICE].get('needs_key') == KEY
    assert 'needs_key' not in _on_file(world)['xtts_v2']

    world.vault.store_credential(KEY, 'made-up-second-key')

    assert not engine._is_demoted(VOICE)
    assert engine._is_demoted('xtts_v2')


def test_a_passing_failure_under_a_refused_key_is_not_read_as_the_key(world):
    engine = world.boot()
    first = RuntimeError(f'{VOICE}: said some way')
    first.key_refused = True
    second = RuntimeError('piper: audio encode failed')
    second.__context__ = first
    assert engine._is_structural_error(first) is True
    assert engine._is_structural_error(second) is False


# ── the key typed on this computer's card ───────────────────────────

def test_a_key_typed_on_the_desktop_card_brings_the_voice_back(
        world, monkeypatch, tmp_path):
    """POST /api/vault/store keeps the value in the desktop vault and the
    environment; it never passes through HARTOS's store_credential.
    Review rv_4625: the voice stayed demoted."""
    import flask

    import desktop.ai_key_vault as dv
    import routes.chatbot_routes as routes
    engine = world.boot()
    gated = world.backend(world.gw.WorkerError(GATED_401))
    for _ in range(3):
        engine._record_backend_failure(VOICE, world.start_error(gated))
    _demote_for_another_reason(world, engine)
    assert engine._is_demoted(VOICE)

    home = tmp_path / 'nunba_home'
    monkeypatch.setattr(dv, '_NUNBA_DIR', home)
    monkeypatch.setattr(dv, '_VAULT_PATH', home / 'ai_keys.enc')
    monkeypatch.setattr(dv, '_SALT_PATH', home / 'vault.salt')
    monkeypatch.setattr(dv.AIKeyVault, '_instance', None)
    # the card's store sets the key in the environment: taken out again
    monkeypatch.setenv(KEY, 'placeholder')
    monkeypatch.delenv(KEY)
    monkeypatch.setattr(dv, 'reads_from_env', lambda name: name == KEY)
    monkeypatch.setattr(routes, '_is_owner_credential', lambda name: False)
    app = flask.Flask(__name__)
    with app.test_request_context(json={
            'key_type': 'tool_key', 'key_name': KEY,
            'value': 'made-up-card-key'}):
        answer = routes.vault_store()
    body = (answer[0] if isinstance(answer, tuple) else answer).get_json()
    assert body == {'success': True, 'key_name': KEY, 'stored': True}

    assert not engine._is_demoted(VOICE)
    assert VOICE not in _on_file(world)
    assert engine._is_demoted(OTHER)
    assert 'made-up-card-key' not in open(world.state, encoding='utf-8').read()


def test_two_keys_stored_together_lose_no_saved_demotion(world):
    """restore_voices_waiting_for reads the saved file and writes it back:
    one caller at a time."""
    import threading
    engine = world.boot()
    _demote_for_refused_key(world, engine)
    _demote_for_another_reason(world, engine)
    restore = world.te.TTSEngine.restore_voices_waiting_for
    lock = getattr(world.te.TTSEngine, '_restore_lock', None)
    assert lock is not None
    done = []
    with lock:
        t = threading.Thread(target=lambda: done.append(restore(KEY)))
        t.start()
        t.join(0.3)
        assert done == []           # it waits for whoever holds the file
    t.join(5)
    assert done == [[VOICE]]
    assert list(_on_file(world)) == [OTHER]


# ── a key that is taken back ────────────────────────────────────────

def _phone_answer_brings_the_voice_back(world, engine):
    """Demoted for a missing key, then the phone's answer: stored, and
    announced once its grant has committed (consent_api.grant_consent)."""
    gated = world.backend(world.gw.WorkerError(GATED_401))
    for _ in range(3):
        engine._record_backend_failure(VOICE, world.start_error(gated))
    assert engine._is_demoted(VOICE)
    kept = dict(_on_file(world)[VOICE])
    world.vault.store_credential(KEY, 'made-up-phone-key', granted_only=True)
    assert engine._is_demoted(VOICE), 'brought back before the grant stood'
    world.akv.announce_credential_stored(KEY)
    assert not engine._is_demoted(VOICE)
    return kept


def test_a_key_that_is_taken_back_sets_its_voice_aside_again(world):
    """HARTOS says when a revoke takes a consent answer's value back
    (on_credential_removed).  A voice brought back for that key would be
    started once more for nothing."""
    engine = world.boot()
    _demote_for_another_reason(world, engine)
    kept = _phone_answer_brings_the_voice_back(world, engine)
    assert VOICE not in _on_file(world)

    assert world.vault.take_back_answer(KEY, revoked=True) == 1

    assert not world.vault.get_tool_key(KEY)
    assert engine._is_demoted(VOICE)
    # the demotion it had, with its own clock
    assert _on_file(world).get(VOICE) == kept
    assert engine._is_demoted(OTHER)
    assert world.boot()._is_demoted(VOICE)

    # and a key that arrives again brings it back again
    world.vault.store_credential(KEY, 'made-up-second-key')
    assert not world.te._engine._is_demoted(VOICE)
    assert VOICE not in _on_file(world)


def test_it_is_set_aside_again_with_no_engine_running(world):
    engine = world.boot()
    kept = _phone_answer_brings_the_voice_back(world, engine)
    world.te._engine = None

    world.vault.take_back_answer(KEY, revoked=True)

    assert _on_file(world).get(VOICE) == kept
    assert world.boot()._is_demoted(VOICE)


def test_a_voice_restored_from_the_saved_file_alone_is_set_aside_again(world):
    """Demoted in an earlier run; the key arrives and is taken back before
    the voice engine exists in this one."""
    engine = world.boot()
    gated = world.backend(world.gw.WorkerError(GATED_401))
    for _ in range(3):
        engine._record_backend_failure(VOICE, world.start_error(gated))
    kept = dict(_on_file(world)[VOICE])
    world.te._engine = None
    world.vault.store_credential(KEY, 'made-up-phone-key', granted_only=True)
    world.akv.announce_credential_stored(KEY)
    assert VOICE not in _on_file(world)

    world.vault.take_back_answer(KEY, revoked=True)

    assert _on_file(world).get(VOICE) == kept


def test_a_key_taken_back_sets_aside_only_what_it_brought_back(world):
    """A voice nobody restored, and a key nobody was waiting for."""
    engine = world.boot()
    _demote_for_another_reason(world, engine)
    before = _on_file(world)
    set_aside = getattr(world.te.TTSEngine, 'set_aside_voices_restored_for',
                        None)
    assert set_aside is not None
    assert set_aside(KEY) == []
    assert set_aside('') == []
    assert _on_file(world) == before
    assert not engine._is_demoted(VOICE)
    # taken back twice: the second finds nothing left to do
    _phone_answer_brings_the_voice_back(world, engine)
    assert set_aside(KEY) == [VOICE]
    assert set_aside(KEY) == []


def test_the_ladder_listens_for_a_key_taken_back_once(world):
    for _ in range(3):
        world.boot()
    assert len(world.akv._REMOVED_LISTENERS) == 1
