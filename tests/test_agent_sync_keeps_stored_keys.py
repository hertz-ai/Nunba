"""POST /agents/sync never drops what the desktop's agent file holds (coordinator hevolve-66e6,
2026-11-26).

A phone syncs its copy of an agent.  When that copy is newer, agents_sync_post used to write the
client's dict over prompts/<id>.json whole, so every key the phone's copy lacks was lost: flows,
personas, personality, an avatar id -- whatever the desktop's CREATE wrote and the phone never
had (the speech agent 95568353503 is being created on the desktop while phones sync).

The rule pinned here: the client wins only on the keys it sends; nothing stored is dropped.  An
older client copy changes nothing and is answered with the stored one; a new agent is written
as sent.
"""
import json
import os
import sys

import pytest
from flask import Flask

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

cr = pytest.importorskip('routes.chatbot_routes')

STORED = {
    'prompt_id': 95568353503, 'name': 'Speech Therapy Companion', 'goal': 'speech practice',
    'flows': [{'flow_name': 'Name call response', 'persona': 'Child', 'actions': ['a1']}],
    'personas': ['Child', 'Parent', 'Therapist'], 'teacher_avatar_id': 63,
    'creator_user_id': '10202', 'updated_at': '2026-11-26T05:00:00',
}


@pytest.fixture
def prompts(tmp_path, monkeypatch):
    monkeypatch.setattr(cr, '_get_prompts_dir', lambda: str(tmp_path))
    monkeypatch.setattr(cr, '_get_user_id_from_auth', lambda: '10202')
    (tmp_path / '95568353503.json').write_text(json.dumps(STORED), encoding='utf-8')
    return tmp_path


def _sync(agents):
    app = Flask(__name__)
    with app.test_request_context('/agents/sync', method='POST', json={'agents': agents}):
        resp = cr.agents_sync_post()
    return resp.get_json()


def _stored(prompts, pid=95568353503):
    return json.loads((prompts / f'{pid}.json').read_text(encoding='utf-8'))


def test_a_newer_phone_copy_missing_keys_keeps_the_stored_ones(prompts):
    out = _sync([{'prompt_id': 95568353503, 'name': 'Speech Companion',
                  'updated_at': '2026-11-26T06:00:00'}])
    assert out['updated_count'] == 1
    saved = _stored(prompts)
    assert saved['name'] == 'Speech Companion', 'the client wins on a key it sends'
    assert saved['updated_at'] == '2026-11-26T06:00:00'
    for key in ('goal', 'flows', 'personas', 'teacher_avatar_id'):
        assert saved[key] == STORED[key], f'{key} was dropped by a sync that did not send it'
    assert saved['creator_user_id'] == '10202'


def test_an_older_phone_copy_changes_nothing(prompts):
    out = _sync([{'prompt_id': 95568353503, 'name': 'Old name',
                  'updated_at': '2026-11-25T00:00:00'}])
    assert out['updated_count'] == 0
    assert _stored(prompts) == STORED
    assert out['server_newer'] == [STORED]


def test_a_new_agent_is_written_as_sent(prompts):
    agent = {'prompt_id': 123, 'name': 'Fresh', 'updated_at': '2026-11-26T06:00:00'}
    _sync([agent])
    assert _stored(prompts, 123) == {**agent, 'creator_user_id': '10202'}
