"""/custom_gpt, /chat/custom_gpt and /chat/teachme2 on this node.

Central serves these paths and the phone clients post there over a base URL
their local->LAN->cloud cascade picks, so this node answers them with the
SAME turn /chat runs (_chat_turn), in the ONE agent reply shape
(_agent_reply): /chat's body, plus dynamic_data (the flexible map any agent
extends and Liquid UI binds to), plus the fields a phone's native chat screen
needs.  The payloads below are the shapes each client actually sends:

  * Android (AbstractChatActivity + CustomBotsActivity.doAction):
    text as a one-item list (translated to English), raw_text the original,
    user_id, teacher_avatar_id, expression, file_id, conversation_id, and for a
    custom bot prompt_id, prompt_name, device_id, create_agent.
  * RN CustomBotChatScreen: user_id, conversation_id, bot_id, message, text.
  * RN kids calls: text = [full instruction], raw_text = short label, goals.

    python -m pytest tests/test_central_chat_paths.py -q
"""
import os
import sys
from unittest.mock import patch

import pytest
from flask import Flask, jsonify

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import routes.chatbot_routes as cr  # noqa: E402

pytestmark = pytest.mark.timeout(30)


@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    cr.register_routes(app)
    return app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def turns():
    """_chat_turn stand-in: records each turn, answers state['reply']."""
    seen = []
    state = {'reply': ('agent says hi', 200)}

    def fake_turn(data):
        seen.append(dict(data))
        reply, status = state['reply']
        if isinstance(reply, Exception):
            raise reply
        body = jsonify(reply if isinstance(reply, dict) else {'text': reply})
        return (body, status) if status != 200 else body

    with patch.object(cr, '_chat_turn', fake_turn):
        yield seen, state


@pytest.fixture(autouse=True)
def _fresh_sessions():
    with cr._sessions_lock:
        saved = dict(cr.sessions)
        cr.sessions.clear()
    yield
    with cr._sessions_lock:
        cr.sessions.clear()
        cr.sessions.update(saved)


ANDROID_CUSTOM_BOT = {
    'text': ['hello there'], 'raw_text': 'hola', 'user_id': '7',
    'teacher_avatar_id': 2933, 'expression': None, 'file_id': 0,
    'conversation_id': 'c-1', 'prompt_id': 123, 'prompt_name': 'Spider-Man',
    'device_id': 'dev-1', 'create_agent': False,
}


# ── /custom_gpt and /chat/custom_gpt ─────────────────────────────────

@pytest.mark.parametrize('path', ['/chat/custom_gpt', '/custom_gpt'])
def test_android_custom_bot_turn_runs_the_chat_turn(client, turns, path):
    seen, _ = turns
    resp = client.post(path, json=ANDROID_CUSTOM_BOT)
    assert resp.status_code == 200
    assert seen == [{
        'text': 'hello there', 'user_id': '7',
        'request_id': seen[0]['request_id'],
        'conversation_id': 'c-1', 'create_agent': False,
        'teacher_avatar_id': 2933, 'draft_first': False, 'prompt_id': 123,
    }]


def test_reply_is_the_one_agent_shape(client, turns):
    body = client.post('/chat/custom_gpt', json=ANDROID_CUSTOM_BOT).get_json()
    # Android draws the bubble from answerList and drops a priority-less one.
    assert body['answerList'] == ['agent says hi']
    assert body['priority'] == 99
    assert body['text'] == 'agent says hi'
    # the flexible map is always there, empty when the agent adds nothing
    assert body['dynamic_data'] == {} and body['optionLists'] == []
    # RN reads `message` first; the old stub put its placeholder there.
    assert 'message' not in body


def test_the_turns_own_fields_and_map_pass_through(client, turns):
    """Whatever the agent's /chat turn returns reaches the client unchanged:
    its routing fields, its Liquid UI layout, and its own dynamic_data."""
    _, state = turns
    state['reply'] = ({'text': 'here', 'served_by': 'local', 'prompt_id': 123,
                       'dynamic_layout': {'type': 'card', 'children': []},
                       'dynamic_data': {'score': 7, 'options': ['again']}}, 200)
    body = client.post('/chat/custom_gpt', json=ANDROID_CUSTOM_BOT).get_json()
    assert body['served_by'] == 'local' and body['prompt_id'] == 123
    assert body['dynamic_layout'] == {'type': 'card', 'children': []}
    assert body['dynamic_data'] == {'score': 7, 'options': ['again']}
    assert body['optionLists'] == ['again']


def test_kids_instruction_wins_over_its_label(client, turns):
    seen, _ = turns
    client.post('/chat/custom_gpt', json={
        'text': ['You are a kids educational game designer. Create ...'],
        'raw_text': 'dinosaur counting', 'user_id': '9',
        'goals': {'name': 'kids_game_creator', 'scope': 'game_generation'},
    })
    assert seen[0]['text'].startswith('You are a kids educational game designer')


def test_rn_custom_bot_screen(client, turns):
    seen, _ = turns
    body = client.post('/chat/custom_gpt', json={
        'user_id': '5', 'conversation_id': 'cv', 'bot_id': 55,
        'message': 'yo', 'text': 'yo'}).get_json()
    assert seen[0]['prompt_id'] == 55 and seen[0]['text'] == 'yo'
    assert body['text'] == 'agent says hi'   # RN shows res.message || res.text


def test_no_agent_id_means_no_prompt_id(client, turns):
    seen, _ = turns
    client.post('/chat/custom_gpt', json={'text': 'hi', 'user_id': '1',
                                          'prompt_id': 0})
    assert 'prompt_id' not in seen[0]


def test_blank_turn_is_refused_without_a_chat_turn(client, turns):
    seen, _ = turns
    resp = client.post('/chat/custom_gpt', json={'text': ['  '], 'user_id': '1'})
    assert resp.status_code == 400
    assert seen == []
    assert resp.get_json()['answerList'][0].startswith('Request cannot be blank')


@pytest.mark.parametrize('reply', [
    ({'error': 'Traceback: KeyError at C:\\secret\\path'}, 500),
    ('', 200),                                   # said nothing
    (RuntimeError('boom at C:\\secret\\path'), 200),
])
def test_a_failed_turn_is_non_2xx_and_never_leaks(client, turns, reply):
    _, state = turns
    state['reply'] = reply
    resp = client.post('/chat/custom_gpt', json=ANDROID_CUSTOM_BOT)
    assert resp.status_code >= 500
    assert 'secret' not in resp.get_data(as_text=True)
    assert resp.get_json()['answerList'] == [cr._TURN_FAILED_TEXT]


# ── /chat/teachme2 ───────────────────────────────────────────────────

def _teach(client, **body):
    body.setdefault('user_id', '11')
    return client.post('/chat/teachme2', json=body)


def test_picked_topic_opens_a_short_tutoring_turn(client, turns):
    seen, _ = turns
    body = _teach(client, text=['teach me'], goals={
        'name': 'Photosynthesis', 'scope': 'book', 'book_name': 'Biology',
        'pages': [3, 4]}).get_json()
    assert seen[0]['text'].startswith(
        'teach me\nYou are my patient tutor. Teach Photosynthesis '
        '(pages 3-4 of "Biology")')
    assert seen[0]['draft_first'] is False
    assert seen[0]['conversation_id'] == 'teachme_11'
    # the topic travels in the flexible map, like any agent's own fields...
    assert body['dynamic_data'] == {'topic': 'Photosynthesis',
                                    'options': ['continue'], 'teachme': True}
    # ...mirrored where Android's Revision_Response_Message reads them
    assert body['optionLists'] == ['continue'] and body['teachme'] is True
    assert body['answerList'] == ['agent says hi'] and body['priority'] == 99


def test_continue_keeps_teaching_the_topic(client, turns):
    seen, _ = turns
    _teach(client, text=['teach me'], goals={'name': 'Fractions', 'scope': 'topic'})
    _teach(client, text=['continue'])
    assert seen[1]['text'] == ('Continue teaching Fractions: the next step, '
                               'then one quick check question.')


@pytest.mark.parametrize('scope', ['kids_game', 'progress_report', 'batch_sync'])
def test_kids_transport_calls_get_a_non_2xx_and_no_turn(client, turns, scope):
    """iOS (and RN's committed kidsLearningApi) post adaptive-question,
    game-completion and batch-sync calls to chat/teachme2.  Central answers
    them with an error, which is what makes the client keep a result and
    retry; a 2xx here would drop it."""
    seen, _ = turns
    resp = _teach(client, text=['Game completed: {}'],
                  goals={'name': 'kids_learning_progress', 'scope': scope})
    assert resp.status_code >= 400
    assert seen == []


def test_any_other_scope_still_runs_the_turn_without_a_topic(client, turns):
    """Only the kids transport scopes are refused.  Any other scope a Teach
    Yourself client sends runs the turn; it just starts no topic."""
    seen, _ = turns
    body = _teach(client, text=['explain this'],
                  goals={'name': 'Chapter 2', 'scope': 'chapter'}).get_json()
    assert seen[0]['text'] == 'explain this'
    assert body['dynamic_data'] == {} and body['optionLists'] == []
    assert 'teachme' not in body


def test_topic_lives_in_the_bounded_sessions_store(client, turns):
    _teach(client, user_id='42', text=['go'], goals={'name': 'X', 'scope': 'goals'})
    assert isinstance(cr.sessions, cr._BoundedSessionDict)
    assert cr.sessions['42']['teach_topic']['name'] == 'X'
    for i in range(cr._MAX_SESSIONS + 1):
        _teach(client, user_id=f'u{i}', text=['hi'])
    assert '42' not in cr.sessions, 'the store must stay bounded'


# ── registration ─────────────────────────────────────────────────────

def test_one_rule_per_path_and_one_view_per_handler(app):
    rules = {}
    for rule in app.url_map.iter_rules():
        if rule.rule in ('/custom_gpt', '/chat/custom_gpt', '/chat/teachme2', '/chat'):
            rules.setdefault(rule.rule, []).append(rule)
    assert {k: len(v) for k, v in rules.items()} == {
        '/custom_gpt': 1, '/chat/custom_gpt': 1, '/chat/teachme2': 1, '/chat': 1}
    assert all('POST' in r.methods for v in rules.values() for r in v)
    gpt = {app.view_functions[rules[p][0].endpoint]
           for p in ('/custom_gpt', '/chat/custom_gpt')}
    assert len(gpt) == 1, 'both custom_gpt paths must be ONE view'
    gpt_view = gpt.pop()
    teach_view = app.view_functions[rules['/chat/teachme2'][0].endpoint]
    chat_view = app.view_functions[rules['/chat'][0].endpoint]
    assert getattr(gpt_view, '__wrapped__', gpt_view) is cr.custom_gpt
    assert getattr(teach_view, '__wrapped__', teach_view) is cr.teachme2
    # the same foreground rule as /chat: wrapped exactly when /chat is
    assert (hasattr(gpt_view, '__wrapped__') == hasattr(teach_view, '__wrapped__')
            == hasattr(chat_view, '__wrapped__'))


def test_chat_route_runs_the_same_turn(client):
    seen = []

    def fake_turn(data):
        seen.append(data)
        return jsonify({'text': 'ok'})

    with patch.object(cr, '_chat_turn', fake_turn):
        client.post('/chat', json={'text': 'hello', 'user_id': 'u'})
    assert seen == [{'text': 'hello', 'user_id': 'u'}]


def test_chat_turn_hands_hartos_the_avatar_and_draft_choice_and_keeps_its_map(client):
    """What custom_gpt and teachme2 put on the turn reaches HARTOS /chat:
    draft_first=False keeps a draft standby from being the whole answer, and
    teacher_avatar_id is the avatar the reply is spoken as.  The agent's own
    dynamic_data comes back through /chat's body to the client."""
    calls = []

    def fake_hevolve_chat(**kwargs):
        calls.append(kwargs)
        return {'text': 'real answer', 'dynamic_data': {'mood': 'happy'}}

    with patch.object(cr, 'HEVOLVE_CHAT_AVAILABLE', True), \
            patch.object(cr, 'hevolve_chat', fake_hevolve_chat, create=True), \
            patch.object(cr, '_fire_nunba_tts'), \
            patch.dict(sys.modules, {'models.orchestrator': None}):
        resp = client.post('/chat/custom_gpt',
                           json={**ANDROID_CUSTOM_BOT, 'prompt_id': None})
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['answerList'] == ['real answer']
    assert body['dynamic_data'] == {'mood': 'happy'}
    assert calls[0]['draft_first'] is False
    assert calls[0]['teacher_avatar_id'] == 2933


def test_a_non_numeric_agent_id_names_no_agent(client):
    """A prompt_id that is not a number names no agent: the turn runs as a
    casual chat (chat_route's _resolve_agent and the adapter coerce it) instead
    of crashing."""
    calls = []

    def fake_hevolve_chat(**kwargs):
        calls.append(kwargs)
        return {'text': 'ok'}

    with patch.object(cr, 'HEVOLVE_CHAT_AVAILABLE', True), \
            patch.object(cr, 'hevolve_chat', fake_hevolve_chat, create=True), \
            patch.object(cr, '_fire_nunba_tts'), \
            patch.dict(sys.modules, {'models.orchestrator': None}):
        resp = client.post('/chat/custom_gpt',
                           json={**ANDROID_CUSTOM_BOT, 'prompt_id': 'not-a-number'})
    assert resp.status_code == 200
    assert calls[0]['agent_id'] is None


# ── review items (hartos-3e) ─────────────────────────────────────────

def test_an_overlay_only_reply_is_a_reply_not_an_error(client, turns):
    """An agent can answer with Liquid UI alone, a layout and its data with no
    text.  That is the content, not a failed turn."""
    _, state = turns
    state['reply'] = ({'text': '',
                       'dynamic_layout': {'type': 'card', 'children': []},
                       'dynamic_data': {'title': 'Pick one', 'options': ['a', 'b']}},
                      200)
    resp = client.post('/chat/custom_gpt', json=ANDROID_CUSTOM_BOT)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['dynamic_layout'] == {'type': 'card', 'children': []}
    assert body['optionLists'] == ['a', 'b']
    assert body['answerList'] == ['']   # never [] (Android reads .get(0))


def test_a_message_in_the_turn_never_reaches_the_phone(client, turns):
    """RN shows `message` before `text`; only the reply may be shown."""
    _, state = turns
    state['reply'] = ({'text': 'the answer', 'message': 'internal note'}, 200)
    body = client.post('/chat/custom_gpt', json=ANDROID_CUSTOM_BOT).get_json()
    assert 'message' not in body
    assert body['text'] == 'the answer'


def test_a_multi_part_reply_keeps_every_part(client, turns):
    _, state = turns
    state['reply'] = ({'text': ['first', 'second']}, 200)
    body = client.post('/chat/custom_gpt', json=ANDROID_CUSTOM_BOT).get_json()
    assert body['answerList'] == ['first', 'second']
    assert body['text'] == 'first\nsecond'   # a string, as central sends
