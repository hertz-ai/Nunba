"""GET /agents/sync lists agent records, not the files beside them.

Review of 38e6dd78 (hartos-d9's reviewer, 2026-11-11): /agents/sync applied
no file filter.  It read every .json in the prompts directory whose owner was
the caller, so the plan waiting on its creator's approval card
({pid}.proposed.json, which carries the real agent's prompt_id) came back as a
second copy of the agent, and the page (Demopage.js agent sync) added both to
the person's agent list.  The same went for the per-action, recipe and
personality files of the caller's own agents.

The route now keeps only what routes.db_routes._is_agent_record keeps, the one
predicate the database listings use, which takes the plan names from HARTOS's
core.prompt_files.is_proposed_plan_filename.
"""
import json
import os
import sys

import pytest
from flask import Flask

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import routes.chatbot_routes as cr  # noqa: E402

pytestmark = pytest.mark.timeout(30)

_ME = '7'

# file stem -> the record written there (all owned by the caller)
_AGENT = {'prompt_id': 1794031134533, 'user_id': 7, 'name': 'Syllable Coach'}
_FILES = {
    '1794031134533': _AGENT,
    # The plan held for its creator: HARTOS writes it under the agent's id.
    '1794031134533.proposed': dict(_AGENT, name='Syllable Coach (plan)'),
    '1794031134533.proposed.r0': dict(_AGENT, name='Syllable Coach (round 0)'),
    '1794031134533_0_1': {'prompt_id': 1794031134533, 'user_id': 7, 'name': 'action 1'},
    '1794031134533_0_recipe': {'user_id': 7, 'name': 'recipe'},
    '1794031134533_personality': {'user_id': 7, 'name': 'personality'},
    # Real agents whose names only look like the plan names.
    '12.proposedx': {'prompt_id': '12.proposedx', 'user_id': 7, 'name': 'near miss'},
    'hive_economics_d2f34440': {'prompt_id': 'hive_economics_d2f34440', 'user_id': 7,
                                'name': 'underscore agent'},
    # Another person's agent stays out, as before.
    '555': {'prompt_id': 555, 'user_id': 9, 'name': 'not mine'},
}


@pytest.fixture
def listed(tmp_path, monkeypatch):
    for stem, record in _FILES.items():
        (tmp_path / f'{stem}.json').write_text(json.dumps(record), encoding='utf-8')
    monkeypatch.setattr(cr, '_get_prompts_dir', lambda: str(tmp_path))
    monkeypatch.setattr(cr, '_get_user_id_from_auth', lambda: _ME)
    app = Flask(__name__)
    app.add_url_rule('/agents/sync', 'agents_sync_get', cr.agents_sync_get, methods=['GET'])
    resp = app.test_client().get('/agents/sync')
    assert resp.status_code == 200, resp.get_data(as_text=True)
    return sorted(a['name'] for a in resp.get_json()['agents'])


def test_the_waiting_plan_is_not_a_second_copy_of_the_agent(listed):
    assert listed.count('Syllable Coach') == 1
    assert 'Syllable Coach (plan)' not in listed
    assert 'Syllable Coach (round 0)' not in listed


def test_the_files_beside_an_agent_are_not_agents(listed):
    for name in ('action 1', 'recipe', 'personality'):
        assert name not in listed


def test_real_agents_are_all_listed_and_only_mine(listed):
    assert listed == ['Syllable Coach', 'near miss', 'underscore agent']
