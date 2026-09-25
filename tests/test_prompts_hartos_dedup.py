"""
GET /prompts must list EVERY HARTOS agent, not just the first one.

WHY THIS EXISTS

Measured live 2026-09-26 (Nunba 8e151d10): GET /prompts returned exactly one
HARTOS agent ('12345') for a user who owned 17.  `get_prompts_route` skipped a
HARTOS row when ANY row already listed had an equal `id` or an equal `name`.
HARTOS /prompts rows carry `prompt_id` and no `id`, and many have name ''.  So
once the first HARTOS row was appended, every later one matched it on
None == None (or '' == '') and was dropped as a "duplicate".

The dedup exists to keep a HARTOS row from shadowing a LOCAL_AGENTS / CLOUD_AGENTS
entry that is the same agent.  A missing key is not evidence of sameness, so
these tests drive the real route with a stubbed HARTOS backend and assert on
the JSON the user receives.
"""
import importlib

import pytest
from flask import Flask


@pytest.fixture(scope='module')
def routes_mod():
    return importlib.import_module('routes.chatbot_routes')


def _call_route(routes_mod, monkeypatch, hartos_rows, online=False):
    monkeypatch.setattr(routes_mod, 'HEVOLVE_PROMPTS_AVAILABLE', True)
    monkeypatch.setattr(routes_mod, 'get_prompts',
                        lambda user_id: {'prompts': [dict(r) for r in hartos_rows]},
                        raising=False)
    monkeypatch.setattr(routes_mod, 'check_internet_connection', lambda: online)
    app = Flask('livetest_prompts_dedup')
    with app.test_request_context('/prompts?user_id=livetest_create_recipe'):
        resp = routes_mod.get_prompts_route()
    return resp.get_json()['prompts']


def _hartos_ids(prompts):
    return [p['prompt_id'] for p in prompts if 'prompt_id' in p]


def test_every_hartos_agent_without_id_or_name_is_listed(routes_mod, monkeypatch):
    """The live repro: three HARTOS rows, no 'id', empty names -> all three."""
    rows = [
        {'prompt_id': '12345', 'name': ''},
        {'prompt_id': '17080873274', 'name': ''},
        {'prompt_id': '90349889671', 'name': ''},
    ]
    prompts = _call_route(routes_mod, monkeypatch, rows)
    assert _hartos_ids(prompts) == ['12345', '17080873274', '90349889671']


def test_named_hartos_agents_without_id_are_all_listed(routes_mod, monkeypatch):
    """Distinct names, no 'id' (the 'Weather Brief' case) -> none dropped."""
    rows = [
        {'prompt_id': '12345', 'name': ''},
        {'prompt_id': '7700000011', 'name': 'livetest_Weather Brief'},
        {'prompt_id': '7700000012', 'name': 'livetest_Other'},
    ]
    prompts = _call_route(routes_mod, monkeypatch, rows)
    assert _hartos_ids(prompts) == ['12345', '7700000011', '7700000012']


def test_hartos_row_matching_a_local_agent_is_still_skipped(routes_mod, monkeypatch):
    """The dedup's purpose survives: a HARTOS row that IS a local agent
    (same non-empty id, or same non-empty name) is not listed twice."""
    local = routes_mod.LOCAL_AGENTS[0]
    rows = [
        {'id': local['id'], 'prompt_id': '1', 'name': ''},
        {'prompt_id': '2', 'name': local['name']},
        {'prompt_id': '3', 'name': ''},
    ]
    prompts = _call_route(routes_mod, monkeypatch, rows)
    assert _hartos_ids(prompts) == ['3']
    assert sum(1 for p in prompts if p.get('id') == local['id']) == 1


def test_same_prompt_id_twice_is_listed_once(routes_mod, monkeypatch):
    rows = [
        {'prompt_id': '555', 'name': ''},
        {'prompt_id': 555, 'name': ''},
    ]
    prompts = _call_route(routes_mod, monkeypatch, rows)
    assert _hartos_ids(prompts) == ['555']


def test_cloud_agents_survive_nameless_hartos_rows(routes_mod, monkeypatch):
    """Online: every CLOUD_AGENTS entry still appears after id-less HARTOS rows."""
    rows = [{'prompt_id': '12345', 'name': ''}, {'prompt_id': '6', 'name': ''}]
    prompts = _call_route(routes_mod, monkeypatch, rows, online=True)
    listed = {p.get('id') for p in prompts}
    for cloud in routes_mod.CLOUD_AGENTS:
        assert cloud['id'] in listed
    assert _hartos_ids(prompts) == ['12345', '6']
