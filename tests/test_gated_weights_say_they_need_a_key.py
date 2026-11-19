"""A gated weight download says it needs a key, asks for it once, and uses
the key once it is stored.

MEASURED 2026-11-18 (oneshot/runs/N2/gated_download.py on Nunba 06dcbb3c):
_download_model_weights('indic_parler') raised GatedRepoError out of setup,
nobody was asked for the key, and the stored key never reached the download:
the vault keeps it as HEVOLVE_HF_TOKEN, a name huggingface_hub does not read.

Real _download_model_weights and install_backend_full's answer; faked: the
hub download (no network) and request_credential (recorded, no card).
"""
import pytest
import requests

import huggingface_hub
from huggingface_hub.errors import GatedRepoError, RepositoryNotFoundError


@pytest.fixture
def hub(monkeypatch):
    import hartos.ai_key_vault as akv
    import tts.package_installer as pi
    monkeypatch.delenv('HEVOLVE_HF_TOKEN', raising=False)
    monkeypatch.delenv('HF_TOKEN', raising=False)
    monkeypatch.setattr(pi, '_is_hf_model_cached', lambda mid: False)
    monkeypatch.setattr(pi, '_hf_token', lambda: __import__('os').environ.get('HEVOLVE_HF_TOKEN', ''))
    state = {'calls': [], 'asks': [], 'raise': 'gated'}

    def fake(repo_id, **kw):
        state['calls'].append((repo_id, kw))
        resp = requests.Response()
        resp.url = f'https://huggingface.co/api/models/{repo_id}'
        if state['raise'] == 'gated':
            resp.status_code = 401
            raise GatedRepoError(f'401 Client Error: Cannot access gated repo {repo_id}', response=resp)
        if state['raise'] == 'missing':
            resp.status_code = 404
            raise RepositoryNotFoundError(f'404 Client Error: {repo_id}', response=resp)
        return '/tmp/x'

    monkeypatch.setattr(huggingface_hub, 'snapshot_download', fake)
    monkeypatch.setattr(akv, 'request_credential',
                        lambda desc, agent_id=None, **kw: state['asks'].append(desc) or 'asked')
    return pi, state


def test_a_gated_download_answers_that_it_needs_a_key(hub):
    pi, _ = hub
    ok, answer = pi._download_model_weights('indic_parler')
    assert ok is False
    assert answer.startswith('needs HEVOLVE_HF_TOKEN:')
    assert 'ai4bharat/indic-parler-tts' in answer


def test_the_owner_is_asked_for_the_key_once(hub):
    pi, state = hub
    pi._download_model_weights('indic_parler')
    assert len(state['asks']) == 1
    assert 'HEVOLVE_HF_TOKEN' in state['asks'][0]


def test_a_stored_key_reaches_the_download(hub, monkeypatch):
    pi, state = hub
    monkeypatch.setenv('HEVOLVE_HF_TOKEN', 'stored-key')
    state['raise'] = None
    assert pi._download_model_weights('indic_parler') == (True, 'Model downloaded')
    assert state['calls'][-1][1].get('token') == 'stored-key'


def test_a_stored_key_the_repo_still_refuses_does_not_ask_again(hub, monkeypatch):
    pi, state = hub
    monkeypatch.setenv('HEVOLVE_HF_TOKEN', 'stored-key')
    ok, answer = pi._download_model_weights('indic_parler')
    assert ok is False
    assert not answer.startswith('needs ')
    assert 'accept its terms' in answer
    assert state['asks'] == []


def test_neutts_gated_download_is_answered_the_same_way(hub):
    pi, state = hub
    ok, answer = pi._download_model_weights('neutts_air')
    assert ok is False
    assert answer.startswith('needs HEVOLVE_HF_TOKEN:')
    assert len(state['asks']) == 1


def test_a_missing_repo_says_so_and_asks_nobody(hub):
    pi, state = hub
    state['raise'] = 'missing'
    ok, answer = pi._download_model_weights('indic_parler')
    assert (ok, answer) == (False, 'repository does not exist: ai4bharat/indic-parler-tts')
    assert state['asks'] == []


def test_a_public_download_still_works_without_a_key(hub):
    pi, state = hub
    state['raise'] = None
    assert pi._download_model_weights('chatterbox_turbo') == (True, 'Model downloaded')
    assert 'token' not in state['calls'][-1][1]


def test_setup_passes_the_needs_a_key_answer_through_unwrapped(hub, monkeypatch):
    pi, _ = hub
    monkeypatch.setattr(pi, 'install_backend_packages', lambda b, progress_cb=None: (True, 'ok'))
    monkeypatch.setattr(pi, '_apply_post_install_patches', lambda b: None)
    monkeypatch.setattr(pi, '_acquire_file_lock', lambda name: True)
    monkeypatch.setattr(pi, '_release_file_lock', lambda name: None, raising=False)
    monkeypatch.setattr(pi, 'get_install_target', lambda b: 'main')
    ok, answer = pi.install_backend_full('indic_parler')
    assert ok is False
    assert answer.startswith('needs HEVOLVE_HF_TOKEN:')
