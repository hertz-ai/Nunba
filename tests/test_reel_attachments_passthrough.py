"""Reel Studio: the phone's custom-bot turn reaches HARTOS whole, and the reel
HARTOS hands back reaches the phone.

The phone posts every turn to its Reel Studio agent as

    POST chat/custom_gpt
      {text: [msg], raw_text, user_id, teacher_avatar_id, expression,
       file_id: 0, conversation_id, prompt_name, prompt_id, device_id,
       create_agent, request_id (minted by the phone, one per turn),
       goal_tags: ["reel_studio"] (while it is creating the agent),
       attachments: [{kind: "peerlink_file", ref: <sha256>, purpose, name,
                      mime, size, duration_ms}],
       media_mode: "text"}

over the PeerLink device link; HARTOS's mobile adapter runs this node's
route with that body unchanged.  This node must:

  * keep the phone's request_id when it is well formed, so a reply that
    arrives late (the push, file_list recovery) finds the phone's bubble,
    and replace one that is not;
  * hand attachments, goal_tags and media_mode to HARTOS /chat as sent:
    HARTOS parses them (core.chat_attachments, the user-assignable goal
    tags), so this node neither reads nor reshapes them;
  * put the `media` HARTOS's /chat reply carries into the reply the phone
    reads (the custom_gpt reply, and /chat's own);
  * never write the owner's intelligence_preference: the phone sends none.

Mocked boundaries only: HARTOS's in-process app (a stand-in Flask app
answering /chat, reached through the same test_client() transport
routes.hartos_backend_adapter.chat uses), the model gate
(models.orchestrator), LlamaConfig, server TTS and the cloud HTTP leg.
custom_gpt, _run_turn, _chat_turn, _agent_reply and the adapter's chat()
are the real code.

    python -m pytest tests/test_reel_attachments_passthrough.py -q
"""
import hashlib
import os
import re
import sys
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from flask import Flask, jsonify, request

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import routes.chatbot_routes as cr  # noqa: E402
import routes.hartos_backend_adapter as hba  # noqa: E402

pytestmark = pytest.mark.timeout(60)


def _sha(label):
    return hashlib.sha256(label.encode('utf-8')).hexdigest()


#: A request id the phone mints for one turn (the bubble's local id).
PHONE_RID = 'rb_1760300000123_7f3a'

PROMPT_ID = 987654

ATTACHMENTS = [
    {'kind': 'peerlink_file', 'ref': _sha('clip-1'), 'purpose': 'reel_source',
     'name': 'VID_20261012_101500.mp4', 'mime': 'video/mp4',
     'size': 123456789, 'duration_ms': 15000},
    {'kind': 'peerlink_file', 'ref': _sha('logo'), 'purpose': 'logo',
     'name': 'logo.png', 'mime': 'image/png', 'size': 48213},
]

#: The phone's CREATE turn for her Reel Studio agent: Android's custom-bot
#: body plus the Reel Studio fields.  No intelligence_preference.
PHONE_REEL_CREATE_TURN = {
    'text': ['You are my reel editor: open with the final look, 20s, '
             'Tamil songs, add my logo'],
    'raw_text': 'You are my reel editor', 'user_id': '10202',
    'teacher_avatar_id': 2933, 'expression': None, 'file_id': 0,
    'conversation_id': 'c-reel', 'prompt_name': 'Reel Studio',
    'prompt_id': PROMPT_ID, 'device_id': 'dev-phone', 'create_agent': True,
    'request_id': PHONE_RID,
    'goal_tags': ['reel_studio'],
    'attachments': ATTACHMENTS,
    'media_mode': 'text',
}

#: A later turn to the built agent: new clips, no creation hint.
PHONE_REEL_REUSE_TURN = {
    **{k: v for k, v in PHONE_REEL_CREATE_TURN.items() if k != 'goal_tags'},
    'text': ["make today's one"], 'raw_text': "make today's one",
    'create_agent': False, 'request_id': 'rb_1760390000999_c0de',
    'attachments': [ATTACHMENTS[0]],
}

#: An Android custom-bot turn from before Reel Studio: none of its fields.
PLAIN_CUSTOM_BOT_TURN = {
    'text': ['hello there'], 'raw_text': 'hola', 'user_id': '7',
    'teacher_avatar_id': 2933, 'expression': None, 'file_id': 0,
    'conversation_id': 'c-1', 'prompt_id': None, 'prompt_name': 'Spider-Man',
    'device_id': 'dev-1', 'create_agent': False,
}

#: One reel, as HARTOS's /chat reply carries it (plan rev 2, 4.2(f)).
MEDIA = [{
    'kind': 'video', 'xid': _sha('reel'), 'sha256': _sha('reel'),
    'mime': 'video/mp4', 'size': 24567890, 'width': 1080, 'height': 1920,
    'duration_s': 20.0, 'has_audio': False,
    'reel_id': '5b2d6c1e-0f4a-4b8e-9c3d-2a1f0e9d8c7b',
    'prompt_id': str(PROMPT_ID), 'request_id': PHONE_RID,
    'caption': 'மணப்பெண் அலங்காரம் ✨', 'hashtags': ['#bridalmakeup', '#chennaimua'],
    'song': {'song_key': 'cluster:123', 'title': 'Song', 'artist': 'Artist',
             'lang': 'ta', 'start_ms': 38500, 'start_label': '0:38',
             'beats': 'synthetic'},
    'notes': [], 'qa': {'passed': True, 'failed': []},
}]

#: The shape any id this node uses for a turn must have (plan rev 2, WS-10).
WELL_FORMED_RID = re.compile(r'[A-Za-z0-9_-]{8,64}')


# ── fixtures ─────────────────────────────────────────────────────────

@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    cr.register_routes(app)
    return app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def _fresh_sessions():
    with cr._sessions_lock:
        saved = dict(cr.sessions)
        cr.sessions.clear()
    yield
    with cr._sessions_lock:
        cr.sessions.clear()
        cr.sessions.update(saved)


@pytest.fixture
def prompts_dir(tmp_path, monkeypatch):
    """The prompts dir _chat_turn's agent resolution reads, as a temp dir."""
    import core.platform_paths as pp
    d = tmp_path / 'prompts'
    d.mkdir()
    monkeypatch.setattr(pp, 'get_prompts_dir', lambda: str(d))
    return d


@pytest.fixture
def llama_config(monkeypatch):
    """LlamaConfig as _chat_turn reaches it: the stored choice is 'auto', and
    any construction or write is recorded instead of touching ~/.nunba."""
    import llama.llama_config as lc

    class FakeLlamaConfig:
        constructed = 0
        writes = []

        @classmethod
        def cached_intelligence_preference(cls):
            return 'auto'

        def __init__(self):
            type(self).constructed += 1

        def set_intelligence_preference(self, value):
            type(self).writes.append(value)

    monkeypatch.setattr(lc, 'LlamaConfig', FakeLlamaConfig)
    return FakeLlamaConfig


@pytest.fixture
def hartos(monkeypatch, prompts_dir, llama_config):
    """HARTOS's in-process app as the adapter reaches it (test_client): it
    answers /chat with state['reply'] and records every body it was sent."""
    stand_in = Flask('hartos_stand_in')
    seen = []
    state = {'reply': {'response': 'On it.'}}

    @stand_in.route('/chat', methods=['POST'])
    def chat():
        seen.append(request.get_json())
        return jsonify(state['reply'])

    # The real adapter is what custom_gpt's turn calls.
    assert cr.hevolve_chat is hba.chat
    monkeypatch.setattr(hba, '_hartos_initialized', True)
    monkeypatch.setattr(hba, '_hartos_backend_available', True)
    monkeypatch.setattr(hba, '_hevolve_app', stand_in)
    # _ensure_hartos() must not start the real HARTOS import thread.
    monkeypatch.setattr(hba, '_hartos_init_thread_started', True)
    monkeypatch.setattr(cr, 'HEVOLVE_CHAT_AVAILABLE', True)
    spoken = []
    monkeypatch.setattr(cr, '_fire_nunba_tts', lambda *a, **k: spoken.append(a))
    # The model gate fails closed to "nothing missing" without probing a server.
    monkeypatch.setitem(sys.modules, 'models.orchestrator', None)
    return SimpleNamespace(seen=seen, state=state, spoken=spoken,
                           prompts_dir=prompts_dir)


@pytest.fixture
def turns():
    """_chat_turn stand-in: records the turn custom_gpt builds."""
    seen = []

    def fake_turn(data):
        seen.append(dict(data))
        return jsonify({'text': 'ok'})

    with patch.object(cr, '_chat_turn', fake_turn):
        yield seen


def _built(prompts_dir, prompt_id=PROMPT_ID):
    """The agent exists on this node (its config is in the prompts dir)."""
    (prompts_dir / f'{prompt_id}.json').write_text('{}', encoding='utf-8')


# ── custom_gpt: the turn ─────────────────────────────────────────────

@pytest.mark.parametrize('path', ['/chat/custom_gpt', '/custom_gpt'])
def test_the_turn_keeps_the_phones_refs_tags_mode_and_request_id(client, turns, path):
    resp = client.post(path, json=PHONE_REEL_CREATE_TURN)
    assert resp.status_code == 200
    turn = turns[0]
    assert turn['attachments'] == ATTACHMENTS
    assert turn['goal_tags'] == ['reel_studio']
    assert turn['media_mode'] == 'text'
    assert turn['request_id'] == PHONE_RID
    assert resp.get_json()['request_id'] == PHONE_RID


def test_a_turn_without_reel_fields_puts_none_on_the_turn(client, turns):
    client.post('/chat/custom_gpt', json=PLAIN_CUSTOM_BOT_TURN)
    assert 'attachments' not in turns[0]
    assert 'goal_tags' not in turns[0]


# ── custom_gpt -> _chat_turn -> adapter -> HARTOS /chat ──────────────

@pytest.mark.parametrize('path', ['/chat/custom_gpt', '/custom_gpt'])
def test_a_create_turn_reaches_hartos_with_its_refs_tags_mode_and_id(
        client, hartos, path):
    resp = client.post(path, json=PHONE_REEL_CREATE_TURN)
    assert resp.status_code == 200
    assert len(hartos.seen) == 1
    body = hartos.seen[0]
    assert body['attachments'] == ATTACHMENTS
    assert body['goal_tags'] == ['reel_studio']
    assert body['media_mode'] == 'text'
    assert body['request_id'] == PHONE_RID
    assert body['prompt_id'] == PROMPT_ID and body['create_agent'] is True
    assert resp.get_json()['request_id'] == PHONE_RID


def test_a_reuse_turn_carries_its_new_clips_and_no_creation_hint(client, hartos):
    _built(hartos.prompts_dir)
    resp = client.post('/chat/custom_gpt', json=PHONE_REEL_REUSE_TURN)
    assert resp.status_code == 200
    body = hartos.seen[0]
    assert body['attachments'] == [ATTACHMENTS[0]]
    assert 'goal_tags' not in body
    assert body['request_id'] == 'rb_1760390000999_c0de'
    assert body['create_agent'] is False and body['prompt_id'] == PROMPT_ID


def test_the_chat_route_hands_hartos_the_same_fields(client, hartos):
    _built(hartos.prompts_dir)
    client.post('/chat', json={
        'text': 'make a reel from these', 'user_id': '10202',
        'prompt_id': PROMPT_ID, 'request_id': PHONE_RID,
        'attachments': ATTACHMENTS, 'goal_tags': ['reel_studio'],
        'media_mode': 'text'})
    body = hartos.seen[0]
    assert body['attachments'] == ATTACHMENTS
    assert body['goal_tags'] == ['reel_studio']


def test_a_turn_without_reel_fields_sends_hartos_no_new_keys(client, hartos):
    """Every other caller's /chat body is what it was."""
    client.post('/chat/custom_gpt', json=PLAIN_CUSTOM_BOT_TURN)
    client.post('/chat/custom_gpt', json={**PLAIN_CUSTOM_BOT_TURN,
                                          'attachments': [], 'goal_tags': []})
    for body in hartos.seen:
        assert 'attachments' not in body
        assert 'goal_tags' not in body


# ── HARTOS reply media -> the phone ──────────────────────────────────

def test_hartos_media_reaches_the_phones_reply(client, hartos):
    _built(hartos.prompts_dir)
    hartos.state['reply'] = {'response': 'Your reel is ready.', 'media': MEDIA,
                             'prompt_id': PROMPT_ID}
    resp = client.post('/chat/custom_gpt', json=PHONE_REEL_REUSE_TURN)
    assert resp.status_code == 200
    reply = resp.get_json()
    assert reply['media'] == MEDIA
    # the bubble the phone draws, and the turn the reel belongs to
    assert reply['answerList'] == ['Your reel is ready.']
    assert reply['request_id'] == 'rb_1760390000999_c0de'


def test_hartos_media_reaches_the_chat_reply(client, hartos):
    _built(hartos.prompts_dir)
    hartos.state['reply'] = {'response': 'Your reel is ready.', 'media': MEDIA}
    resp = client.post('/chat', json={
        'text': "make today's one", 'user_id': '10202',
        'prompt_id': PROMPT_ID, 'request_id': PHONE_RID, 'media_mode': 'text'})
    assert resp.status_code == 200
    assert resp.get_json()['media'] == MEDIA


def test_a_reply_without_media_has_no_media_key(client, hartos):
    _built(hartos.prompts_dir)
    hartos.state['reply'] = {'response': 'Which clips should I use?'}
    reply = client.post('/chat/custom_gpt', json=PHONE_REEL_REUSE_TURN).get_json()
    assert 'media' not in reply
    assert reply['answerList'] == ['Which clips should I use?']


# ── request_id: the phone's, when it is well formed ──────────────────

@pytest.mark.parametrize('sent', [
    PHONE_RID,
    1760300000123,                                  # a Java long
    '3f1c2b7e-9a4d-4c1e-8f2a-0b6d5e4c3a21',         # a UUID
    'abcdefgh',                                     # shortest allowed
    'A' * 64,                                       # longest allowed
])
def test_a_well_formed_phone_id_names_the_turn_everywhere(client, hartos, sent):
    reply = client.post('/chat/custom_gpt', json={
        **PHONE_REEL_CREATE_TURN, 'request_id': sent}).get_json()
    assert hartos.seen[0]['request_id'] == str(sent)
    assert reply['request_id'] == str(sent)


@pytest.mark.parametrize('sent', [
    'short1',                     # under 8
    'a' * 65,                     # over 64
    '../../prompts/x',            # a path
    'rid with space',
    'abcdefgh\n',                 # a trailing newline
    'tamil_தமிழ்_id',             # outside the id alphabet
    'daemon_4242abcd',            # HARTOS's background-turn tag
    True,
    ['abcdefghij'],
    {'id': 'abcdefghij'},
])
def test_a_malformed_or_reserved_id_is_replaced_by_a_fresh_one(client, hartos, sent):
    reply = client.post('/chat/custom_gpt', json={
        **PHONE_REEL_CREATE_TURN, 'request_id': sent}).get_json()
    used = hartos.seen[0]['request_id']
    assert used != sent and used != str(sent)
    assert isinstance(used, str) and WELL_FORMED_RID.fullmatch(used)
    assert not used.startswith('daemon_')
    # one id for the turn: what HARTOS ran is what the phone is told
    assert reply['request_id'] == used


@pytest.mark.parametrize('sent', [None, '', 0])
def test_a_turn_with_no_id_gets_a_fresh_one(client, hartos, sent):
    body = {**PHONE_REEL_CREATE_TURN, 'request_id': sent}
    reply = client.post('/chat/custom_gpt', json=body).get_json()
    used = hartos.seen[0]['request_id']
    assert isinstance(used, str) and WELL_FORMED_RID.fullmatch(used)
    assert reply['request_id'] == used


def test_a_daemon_tag_is_refused_by_the_one_spelling_hartos_reads():
    """The reserved prefix is HARTOS's own constant, not a copy here."""
    from core.chat_client import DAEMON_PREFIX
    with patch('core.chat_client.DAEMON_PREFIX', 'bgjob_'):
        assert cr._turn_request_id({'request_id': 'bgjob_12345678'}) != 'bgjob_12345678'
        assert cr._turn_request_id(
            {'request_id': f'{DAEMON_PREFIX}12345678'}) == f'{DAEMON_PREFIX}12345678'


# ── the owner's settings ─────────────────────────────────────────────

def test_the_phone_body_never_writes_the_owners_intelligence_preference(
        client, hartos, llama_config):
    """The phone sends no intelligence_preference; a turn that wrote one
    would change the owner's stored choice for every later turn."""
    _built(hartos.prompts_dir)
    client.post('/chat/custom_gpt', json=PHONE_REEL_CREATE_TURN)
    client.post('/chat/custom_gpt', json=PHONE_REEL_REUSE_TURN)
    assert len(hartos.seen) == 2
    assert llama_config.writes == []
    assert llama_config.constructed == 0
    assert all('intelligence_preference' not in b for b in hartos.seen)


# ── the cloud leg ────────────────────────────────────────────────────

def test_refs_and_tags_never_ride_the_cloud_leg(client, hartos, monkeypatch):
    """A turn for an agent this node does not have goes to the cloud; the
    desktop store's refs and the creation hint stay here."""
    sent = []

    class _Resp:
        status_code = 200

        @staticmethod
        def json():
            return {'text': 'cloud agent here'}

    def fake_post(url, json=None, **kwargs):
        sent.append({'url': url, 'json': json, 'timeout': kwargs.get('timeout')})
        return _Resp()

    monkeypatch.setattr(cr, 'check_internet_connection', lambda: True)
    monkeypatch.setattr(cr.requests, 'post', fake_post)
    resp = client.post('/chat/custom_gpt', json={**PHONE_REEL_REUSE_TURN,
                                                 'goal_tags': ['reel_studio']},
                       headers={'Authorization': 'Bearer t'})
    assert resp.get_json()['answerList'] == ['cloud agent here']
    assert hartos.seen == []
    assert len(sent) == 1 and sent[0]['timeout']
    assert 'attachments' not in sent[0]['json']
    assert 'goal_tags' not in sent[0]['json']


# ── the adapter's /chat body ─────────────────────────────────────────

def test_the_adapter_forwards_refs_and_tags_as_given_and_only_when_given(hartos):
    hba.chat(text='hi', user_id='u')
    hba.chat(text='hi', user_id='u', attachments=[], goal_tags=[])
    hba.chat(text='make it', user_id='u', agent_id=PROMPT_ID,
             attachments=ATTACHMENTS, goal_tags=['reel_studio'])
    plain, empty, reel = hartos.seen
    for body in (plain, empty):
        assert 'attachments' not in body and 'goal_tags' not in body
    assert reel['attachments'] == ATTACHMENTS
    assert reel['goal_tags'] == ['reel_studio']
