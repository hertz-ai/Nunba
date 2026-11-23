"""An agent's contact request and message say who asks in HARTOS's words.

The page worded "Agent <name>" with its own copy of HARTOS's rule
(constants/consentAsks.askerName beside consent_service.agent_as_asker), and
the two already disagree: for "AgentÜber" HARTOS says "Agent AgentÜber", the
page says "AgentÜber".  A consent ask carries the wording itself as
``agent_asker`` since HARTOS 08ffbc73a.  The two payloads this route sends
(an owned agent's message, an unowned agent's contact request) carried the
bare name only, which is what kept the page's copy alive.  They carry
``agent_asker`` now, from the one rule.

Real view function; the notification sender, the consent record and the agent
file lookup are the only stand-ins.  Nothing is written anywhere.

    python -m pytest tests/test_an_agent_contact_says_who_asks.py -q
"""
import contextlib
import json
import os
import re
import sys

import pytest
from flask import Flask

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import routes.chatbot_routes as cr  # noqa: E402
from integrations.social.consent_service import agent_as_asker  # noqa: E402

pytestmark = pytest.mark.timeout(30)

USER = '10202'


@pytest.fixture
def contact(monkeypatch, tmp_path):
    """POST /agents/contact; returns (post, sent, name_agent)."""
    import integrations.social.models as models
    import integrations.social.realtime as realtime
    from integrations.social.consent_service import ConsentService

    sent = []
    monkeypatch.setattr(realtime, 'on_notification',
                        lambda user_id, note, **kw: sent.append((user_id, note)))

    @contextlib.contextmanager
    def _no_db(*args, **kwargs):
        yield None
    monkeypatch.setattr(models, 'db_session', _no_db)
    monkeypatch.setattr(ConsentService, 'request_consent',
                        staticmethod(lambda *a, **k: None))
    # The route looks an agent up under ~/PycharmProjects/HARTOS/prompts.
    prompts = tmp_path / 'PycharmProjects' / 'HARTOS' / 'prompts'
    prompts.mkdir(parents=True)
    monkeypatch.setattr(os.path, 'expanduser',
                        lambda p: str(tmp_path) if p == '~' else p)
    cr._pending_contacts.clear()

    def name_agent(agent_id, name, owner=None):
        record = {'name': name}
        if owner:
            record['creator_user_id'] = owner
        (prompts / f'{agent_id}.json').write_text(json.dumps(record), encoding='utf-8')

    app = Flask(__name__)
    app.route('/agents/contact', methods=['POST'])(cr.agent_contact_request)
    client = app.test_client()

    def post(agent_id, **body):
        return client.post('/agents/contact',
                           json={'agent_id': agent_id, 'user_id': USER, **body})
    yield post, sent, name_agent
    cr._pending_contacts.clear()


NAMES = ['Vijai', 'Agent Smith', 'agent smith', 'Agentic', 'AgentÜber', 'Disk Watch Dan']


@pytest.mark.parametrize('name', NAMES)
def test_a_contact_request_says_who_asks_by_the_one_rule(contact, name):
    post, sent, name_agent = contact
    name_agent('zz9unowned', name)                       # not this user's agent
    resp = post('zz9unowned', reason='wants a word')
    assert resp.status_code == 200 and resp.get_json()['requires_consent'] is True
    (user, note), = sent
    assert user == USER
    assert note['type'] == 'agent_contact_request'
    assert note['agent_name'] == name                    # the bare name stays
    assert note['agent_asker'] == agent_as_asker(name)


@pytest.mark.parametrize('name', NAMES)
def test_an_owned_agents_message_says_who_asks_by_the_one_rule(contact, name):
    post, sent, name_agent = contact
    name_agent('zz9owned', name, owner=USER)
    resp = post('zz9owned', message='hello')
    assert resp.status_code == 200 and resp.get_json()['requires_consent'] is False
    (_, note), = sent
    assert note['type'] == 'agent_message'
    assert note['agent_name'] == name
    assert note['agent_asker'] == agent_as_asker(name)


def test_an_agent_with_no_file_is_named_by_its_id_once(contact):
    """The default name already says Agent; it is not said twice."""
    post, sent, _ = contact
    post('1a2b3c4d9999')
    note = sent[0][1]
    assert note['agent_name'] == 'Agent 1a2b3c4d'
    assert note['agent_asker'] == 'Agent 1a2b3c4d'


def test_nothing_else_about_the_two_payloads_moves(contact):
    """One key is added.  The rest is what the page and the cypress e2e read."""
    post, sent, name_agent = contact
    name_agent('zz9owned', 'Vijai', owner=USER)
    owned = post('zz9owned', message='hello', reason='because').get_json()
    asked = post('1a2b3c4d9999', reason='because').get_json()
    message, request = sent[0][1], sent[1][1]
    assert message == {
        'type': 'agent_message', 'agent_id': 'zz9owned', 'agent_name': 'Vijai',
        'agent_asker': 'Agent Vijai', 'message': 'hello', 'reason': 'because',
        'request_id': owned['request_id'], 'requires_consent': False}
    assert request == {
        'type': 'agent_contact_request', 'agent_id': '1a2b3c4d9999',
        'agent_name': 'Agent 1a2b3c4d', 'agent_asker': 'Agent 1a2b3c4d',
        'reason': 'because', 'request_id': asked['request_id'],
        'requires_consent': True}
    # the HTTP answers are as they were
    assert owned == {'request_id': owned['request_id'], 'requires_consent': False,
                     'delivered': True, 'agent_name': 'Vijai'}
    assert asked == {'request_id': asked['request_id'], 'requires_consent': True,
                     'delivered': False, 'agent_name': 'Agent 1a2b3c4d'}


def test_every_notification_this_app_sends_with_a_name_says_who_asks():
    """Over the source: an on_notification payload that carries agent_name
    carries agent_asker too.  A new one that forgets fails here, before the
    page's fallback copy of the rule words it."""
    forgot = []
    for folder in ('routes', 'desktop'):
        base = os.path.join(ROOT, folder)
        for dirpath, _, files in os.walk(base):
            for fname in files:
                if not fname.endswith('.py'):
                    continue
                path = os.path.join(dirpath, fname)
                text = open(path, encoding='utf-8').read()
                for m in re.finditer(r'on_notification\(', text):
                    depth, end = 0, m.end() - 1
                    while end < len(text):
                        depth += text[end] == '('
                        depth -= text[end] == ')'
                        end += 1
                        if depth == 0:
                            break
                    call = text[m.start():end]
                    if "'agent_name'" in call and "'agent_asker'" not in call:
                        line = text.count('\n', 0, m.start()) + 1
                        forgot.append(f'{os.path.relpath(path, ROOT)}:{line}')
    assert forgot == []
