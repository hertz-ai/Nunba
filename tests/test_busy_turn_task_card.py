"""A busy turn's "AI is working on..." card reaches the person who asked.

When both chat tiers fail on a llama-server that answers /health, _chat_turn
tells the user which ledger tasks hold the model, and pushes the same list as
a Liquid UI notification with "View" actions (task #521).  The push looked the
service up through core.platform.service_registry, a module HARTOS does not
have: the import raised, the except logged at DEBUG, and the card was shown on
no surface (measured 2026-10-22, ModuleNotFoundError).  The push also named no
user, so on a node with more than one person the SSE privacy guard refuses it
even once the service is found, and it has no owner's topic to reach the phone
on.

Behavioural: the real _chat_turn, driven to its busy branch, and the real
HARTOS service registry holding a recording stand-in for LiquidUIService.
Mocked at the boundaries only: Tier-1 (off), the llama-server (/health up,
completions refused), the model gate, the ledger walker.

    python -m pytest tests/test_busy_turn_task_card.py -q
"""
import os
import sys
import types

import pytest
from flask import Flask

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import routes.chatbot_routes as cr  # noqa: E402

pytestmark = pytest.mark.timeout(60)


class _Shell:
    """Records what reaches LiquidUIService.agent_ui_update."""

    def __init__(self):
        self.pushes = []

    def agent_ui_update(self, agent_id, component, user_id=None):
        self.pushes.append((agent_id, component, user_id))
        return True


class _Task:
    def __init__(self, task_id, description, status):
        self.task_id = task_id
        self.description = description
        self.status = status


class _Ledger:
    def __init__(self, tasks):
        self.tasks = {t.task_id: t for t in tasks}


@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    return app


def _busy_node(monkeypatch, tasks):
    """A node whose model is busy: no Tier-1, the 0.8B and 4B completions
    refused, /health up, ``tasks`` active in the ledger.  Returns the
    recording shell."""
    from core.platform.registry import get_registry, reset_registry
    reset_registry()
    shell = _Shell()
    get_registry().register('LiquidUIService', lambda: shell, singleton=True)

    monkeypatch.setattr(cr, 'HEVOLVE_CHAT_AVAILABLE', False)

    def _refused(*a, **k):
        raise ConnectionError('the model is busy with another turn')
    monkeypatch.setattr('requests.post', _refused)
    monkeypatch.setattr('llama.llama_config.check_llama_health',
                        lambda *a, **k: True)

    def _no_orchestrator():
        raise RuntimeError('no model gate in this test')
    monkeypatch.setitem(sys.modules, 'models.orchestrator',
                        types.SimpleNamespace(get_orchestrator=_no_orchestrator))

    def _iter_ledgers(_owner):
        yield 'agent-1', 'session-1', _Ledger(tasks)
    monkeypatch.setitem(sys.modules, 'integrations.agent_engine.api',
                        types.SimpleNamespace(_iter_ledgers=_iter_ledgers))
    return shell


TURN = {'text': 'hello there', 'user_id': 'u-9', 'preferred_lang': 'en',
        'media_mode': 'text'}


def test_a_busy_turn_shows_the_task_card_to_the_user_who_asked(app, monkeypatch):
    from agent_ledger import TaskStatus
    from core.platform.registry import reset_registry
    shell = _busy_node(monkeypatch, [
        _Task('task-abc12345', 'Summarise the inbox', TaskStatus.IN_PROGRESS)])
    try:
        with app.test_request_context('/chat', method='POST'):
            resp = cr._chat_turn(dict(TURN))
        body = resp.get_json()
    finally:
        reset_registry()

    # The busy branch answered, and named the task in words too.
    assert body['error'] == 'local_llm_starting'
    assert [t['task_id'] for t in body['active_tasks']] == ['task-abc12345']

    # ...and the card reached the service once, addressed to the asker.
    assert len(shell.pushes) == 1, shell.pushes
    _agent, card, owner = shell.pushes[0]
    assert owner == 'u-9'
    assert card['type'] == 'notification'
    assert card['title'] == 'AI is working on…'
    assert 'Summarise the inbox' in card['message']
    assert '/admin/task-ledger?task_id=task-abc12345' in [
        a['target'] for a in card['actions']]


def test_a_busy_turn_with_no_active_task_shows_no_card(app, monkeypatch):
    from agent_ledger import TaskStatus
    from core.platform.registry import reset_registry
    shell = _busy_node(monkeypatch, [
        _Task('task-done', 'Finished work', TaskStatus.COMPLETED)])
    try:
        with app.test_request_context('/chat', method='POST'):
            resp = cr._chat_turn(dict(TURN))
        body = resp.get_json()
    finally:
        reset_registry()
    assert body['error'] == 'local_llm_starting'
    assert body['active_tasks'] == []
    assert shell.pushes == []
