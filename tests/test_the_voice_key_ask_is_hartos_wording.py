"""The key ask for a gated voice is worded by HARTOS, from the engine's
registry id, whether the voice's download (here) or its worker (HARTOS
gpu_worker) hit the gate.

Before: _download_model_weights built "the {backend} voice" from Nunba's own
engine name, so one engine was "the f5 voice" here and "the f5_tts voice" in
the worker's ask; and the answer for a stored token the repo refuses was a
string kept only in this repo.

Real _download_model_weights; faked: the hub download (no network) and
request_credential (recorded, no card).
"""
import json
import os
import re

import huggingface_hub
import pytest
import requests
from huggingface_hub.errors import GatedRepoError

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


@pytest.fixture
def hub(monkeypatch):
    import hartos.ai_key_vault as akv

    import tts.package_installer as pi
    monkeypatch.delenv('HEVOLVE_HF_TOKEN', raising=False)
    monkeypatch.delenv('HF_TOKEN', raising=False)
    monkeypatch.setattr(pi, '_is_hf_model_cached', lambda mid: False)
    asks = []
    pending = set()
    vault = type('V', (), {
        'get_tool_key': lambda self, k: os.environ.get(k, ''),
        'has_pending': lambda self, k: k in pending,
    })()
    monkeypatch.setattr(akv, 'get_ai_key_vault', lambda: vault)

    def fake(repo_id, **kw):
        resp = requests.Response()
        resp.url = f'https://huggingface.co/api/models/{repo_id}'
        resp.status_code = 401
        raise GatedRepoError(
            f'401 Client Error: Cannot access gated repo {repo_id}',
            response=resp)

    monkeypatch.setattr(huggingface_hub, 'snapshot_download', fake)

    def ask(desc, agent_id=None, **kw):
        asks.append(json.loads(desc))
        pending.add('HEVOLVE_HF_TOKEN')
        return 'asked'
    monkeypatch.setattr(akv, 'request_credential', ask)
    return pi, akv, asks


@pytest.mark.parametrize('asked_as, registry_id, repo', [
    ('f5', 'f5_tts', 'SWivid/F5-TTS'),
    ('f5_tts', 'f5_tts', 'SWivid/F5-TTS'),
    ('indic_parler', 'indic_parler', 'ai4bharat/indic-parler-tts'),
])
def test_the_ask_names_the_voice_by_its_registry_id(hub, asked_as,
                                                    registry_id, repo):
    pi, akv, asks = hub
    ok, answer = pi._download_model_weights(asked_as)
    assert ok is False
    assert [a['used_by'] for a in asks] == [f'the {registry_id} voice']
    # the same words HARTOS gives its own voice worker
    asks.clear()
    assert answer == f'needs HEVOLVE_HF_TOKEN: {repo} is gated; accept its ' \
                     f'terms at https://huggingface.co/{repo}'


def test_a_refused_stored_key_is_answered_in_hartos_words(hub, monkeypatch):
    pi, akv, asks = hub
    monkeypatch.setenv('HEVOLVE_HF_TOKEN', 'stored-key')
    ok, answer = pi._download_model_weights('indic_parler')
    assert ok is False
    assert answer == akv.gated_weights_answer(
        'ai4bharat/indic-parler-tts', voice='indic_parler')
    assert answer == ('ai4bharat/indic-parler-tts refused the stored '
                      'HEVOLVE_HF_TOKEN; accept its terms at '
                      'https://huggingface.co/ai4bharat/indic-parler-tts '
                      'with that account')
    assert asks == []


def test_a_caller_that_names_itself_still_can(hub):
    """_hub_snapshot_download(repo, used_by=...) keeps working."""
    pi, akv, asks = hub
    with pytest.raises(pi._WeightsRefused):
        pi._hub_snapshot_download('ai4bharat/indic-parler-tts')
    assert [a['used_by'] for a in asks] == ['voice setup']


def test_nunba_words_neither_answer():
    src = open(os.path.join(PROJECT_ROOT, 'tts', 'package_installer.py'),
               encoding='utf-8').read()
    assert not re.search(r'the \{[^}]+\} voice', src)
    assert 'refused the stored' not in src
