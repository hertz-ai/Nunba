"""A voice whose repo refuses the stored Hugging Face key is set aside after
ONE failed worker start, not three.

The defect (review rv_66ba of HARTOS 585586a04): the voice worker used to
answer a gated repo's 401 with "<voice> worker startup failed: 401 ...",
which the ladder reads as structural ('worker startup failed') and demotes
on the first start.  HARTOS now answers in plain words ("<repo> refused the
stored HEVOLVE_HF_TOKEN; ..."), and the ladder, which matched sentences,
read those words as a failure that may pass: three failed starts, each one
a worker spawn, before the same 7-day demotion.

The ladder now reads a field of the worker's answer, ``key_refused``
(hartos.ai_key_vault.gated_weights_failure), which the adapter puts on the
exception beside ``transient``.  No words of the answer are matched: text
that only carries the sentence is not read as that failure.

Real: HARTOS's ToolWorker.call/synthesize and gated_weights_answer, Nunba's
_SubprocessTTSBackend.synthesize, _is_structural_error and
_record_backend_failure.  Faked: the worker's start (raises the hub's 401,
nothing is spawned), the vault and the key ask (no card), the self-heal
push (no goal is filed by a test).
"""
import json
import os
import sys
import types

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REPO = 'ai4bharat/indic-parler-tts'
PAGE = f'https://huggingface.co/{REPO}'
VOICE = 'indic_parler'


@pytest.fixture
def ladder(monkeypatch, tmp_path):
    """(engine, start_error): a bare ladder and what one start of the gated
    voice raises through the real worker and adapter."""
    import hartos.ai_key_vault as akv
    from integrations.service_tools import gpu_worker as gw
    from tts import tts_engine as te

    monkeypatch.setenv('NUNBA_TTS_STATE_PATH', str(tmp_path / 'tts_state.json'))
    monkeypatch.delenv('HEVOLVE_HF_TOKEN', raising=False)
    monkeypatch.delenv('HF_TOKEN', raising=False)
    monkeypatch.setitem(
        sys.modules, 'hartos.exception_collector',
        types.SimpleNamespace(report_subsystem_failure=lambda **k: None))
    pending = set()
    vault = type('V', (), {
        'get_tool_key': lambda self, k: os.environ.get(k, ''),
        'has_pending': lambda self, k: k in pending,
    })()
    monkeypatch.setattr(akv, 'get_ai_key_vault', lambda: vault)
    monkeypatch.setattr(
        akv, 'request_credential',
        lambda desc, agent_id=None, **kw: pending.add('HEVOLVE_HF_TOKEN'))

    worker = gw.ToolWorker(tool_name=VOICE, tool_module='x',
                           vram_budget=f'tts_{VOICE}', output_subdir='t',
                           engine='t')
    starts = []

    def _start():
        starts.append(1)
        raise gw.WorkerError(
            f'401 Client Error. Cannot access gated repo for url {PAGE}/'
            f'resolve/main/config.json.\nAccess to model {REPO} is restricted.')
    worker._get_or_start = _start

    backend = te._SubprocessTTSBackend(VOICE)
    backend._worker = worker
    backend._synthesize_fn = lambda **kw: worker.synthesize(
        text=kw['text'], language=kw['language'], voice=kw['voice'],
        output_path=kw['output_path'])

    def start_error():
        with pytest.raises(RuntimeError) as caught:
            backend.synthesize('vanakkam', output_path=str(tmp_path / 'a.wav'),
                               language='ta')
        return caught.value

    engine = te.TTSEngine(auto_init=False)
    engine._demoted_backends.discard(VOICE)
    return engine, start_error, starts


def _starts_until_demoted(engine, start_error, limit=6):
    n = 0
    while VOICE not in engine._demoted_backends and n < limit:
        engine._record_backend_failure(VOICE, start_error())
        n += 1
    return n


def test_a_refused_stored_key_demotes_after_one_start(ladder, monkeypatch):
    engine, start_error, starts = ladder
    monkeypatch.setenv('HEVOLVE_HF_TOKEN', 'stored-key')
    err = start_error()
    assert str(err) == (f'{VOICE}: {REPO} refused the stored HEVOLVE_HF_TOKEN; '
                        f'accept its terms at {PAGE} with that account')
    assert getattr(err, 'key_refused', None) is True
    assert getattr(err, 'needs_key', None) == 'HEVOLVE_HF_TOKEN'
    assert engine._is_structural_error(err) is True
    del starts[:]
    assert _starts_until_demoted(engine, start_error) == 1
    assert len(starts) == 1


def test_the_field_is_read_not_the_words(ladder):
    """The same sentence with no field is a failure like any other; the
    field with other words is the refused key."""
    engine, _, _ = ladder
    words_only = RuntimeError(
        f'{VOICE}: {REPO} refused the stored HEVOLVE_HF_TOKEN; accept its '
        f'terms at {PAGE} with that account')
    assert engine._is_structural_error(words_only) is False
    field_only = RuntimeError(f'{VOICE}: said some other way')
    field_only.key_refused = True
    assert engine._is_structural_error(field_only) is True
    wrapped = RuntimeError('synthesis failed')
    wrapped.__cause__ = field_only
    assert engine._is_structural_error(wrapped) is True


def test_the_demotion_is_kept_for_the_next_boot(ladder, monkeypatch):
    """One start, then the same persisted demotion the raw 401 got."""
    engine, start_error, _ = ladder
    monkeypatch.setenv('HEVOLVE_HF_TOKEN', 'stored-key')
    engine._record_backend_failure(VOICE, start_error())
    path = os.environ['NUNBA_TTS_STATE_PATH']
    assert os.path.exists(path), 'one failed start did not demote the voice'
    assert VOICE in json.dumps(json.load(open(path, encoding='utf-8')))


def test_a_missing_key_is_still_given_three_starts(ladder):
    """No key stored: the owner is being asked, and the key may arrive.
    That answer was three starts before 585586a04 and stays three."""
    engine, start_error, _ = ladder
    err = start_error()
    assert str(err).startswith(f'{VOICE}: needs HEVOLVE_HF_TOKEN:')
    assert getattr(err, 'key_refused', None) is False
    assert getattr(err, 'needs_key', None) == 'HEVOLVE_HF_TOKEN'
    assert engine._is_structural_error(err) is False
    assert _starts_until_demoted(engine, start_error) == 3


def test_the_raw_401_and_a_passing_failure_are_read_as_before(ladder):
    engine, _, _ = ladder
    raw = RuntimeError(f'{VOICE}: {VOICE} worker startup failed: 401 Client '
                       f'Error. Cannot access gated repo for url {PAGE}')
    assert engine._is_structural_error(raw) is True
    assert engine._is_structural_error(RuntimeError('CUDA out of memory')) is False
    assert engine._is_structural_error(None) is False


def test_source_guard_the_ladder_matches_no_words_of_hartos():
    """Neither the sentence nor the mark it is built from: the field."""
    src = open(os.path.join(PROJECT_ROOT, 'tts', 'tts_engine.py'),
               encoding='utf-8').read()
    assert 'refused the stored' not in src
    assert 'GATED_REFUSED_MARK' not in src
    assert "result.get('key_refused')" in src
