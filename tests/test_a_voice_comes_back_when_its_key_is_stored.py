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

  - a passing failure read as a broken voice.  A network timeout, a full
    disk or the GPU out of memory while the worker STARTS all answered
    "worker startup failed", which the ladder demotes for 7 days after one
    start.  HARTOS now flags those ``transient`` (the flag a crash
    mid-request already carries); a start that is really broken (a missing
    package, a bad model file) is demoted after one start as before.

Real: HARTOS AIKeyVault.store_credential, gated_weights_failure,
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
    vault = akv.AIKeyVault()
    vault._sm = _Store()
    monkeypatch.setattr(akv, 'get_ai_key_vault', lambda: vault)
    # The key stays in the vault: a test never sets it in the environment.
    monkeypatch.setattr(akv, 'reads_from_env', lambda name: False)
    monkeypatch.setattr(akv, 'is_node_secret', lambda name: False)
    monkeypatch.setattr(akv, '_STORED_LISTENERS', [], raising=False)
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
    'indic_parler: startup timeout (120s)',
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


def test_a_death_at_startup_for_want_of_memory_may_pass(world):
    """The usual shape: the child dies and its stderr says why."""
    engine = world.boot()
    crash = world.gw.WorkerCrash(f'{VOICE}: died during startup (exit=1)')
    crash.stderr_tail = 'torch.OutOfMemoryError: CUDA out of memory.'
    err = world.start_error(world.backend(crash))
    assert err.transient is True
    assert engine._is_structural_error(err) is False
