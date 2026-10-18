"""Reel Studio: the phone's custom-bot turn reaches HARTOS whole and bounded,
and the reel HARTOS hands back reaches the phone.

The phone posts every turn to its Reel Studio agent as

    POST chat/custom_gpt
      {text: [msg], raw_text, user_id, teacher_avatar_id, expression,
       file_id: 0, conversation_id, prompt_name, prompt_id, device_id,
       create_agent, request_id (minted by the phone, one per turn),
       goal_tags: ["reel_studio"] (while it is creating the agent),
       attachments: [{file_id: <store xid = sha256>, sha256, name, mime,
                      size, purpose, captured_at, duration_ms}],
       media_mode: "text"}

(the ONE /chat attachments shape, amendment A9 a: the chat mirror's U9 row
{file_id, sha256, name, mime, size} plus the optional purpose and meta)

over the PeerLink device link; HARTOS's mobile adapter runs this node's
route with that body unchanged.  This node must:

  * keep the phone's request_id when a client may name the turn
    (_turn_request_id: [A-Za-z0-9_-]{8,64}, without HARTOS's daemon_ tag),
    and replace any other; /chat and /chat/teachme2 judge their bodies' ids
    by the same rule;
  * forward attachments and goal_tags to HARTOS /chat, bounded here: an
    attachment only in the ONE shape, judged by HARTOS's one rule
    (core.chat_attachments.validate_attachment, which
    integrations.reel_studio.contracts.validate_attachment is, and which
    /chat's parse_inbound reads by: what this node drops HARTOS drops), at
    most core.chat_attachments.MAX_ATTACHMENTS (10; none when that cap
    cannot be read as a count) and 16 KB, the rule's fields only; a goal
    tag only when HARTOS's own filter keeps it
    (marketing_tools.user_assignable_goal_tags, in its order; none when
    that filter cannot be used).  HARTOS's chat() reads both: it binds the
    attachments to the turn (core.chat_attachments.parse_inbound, then
    bind_inbound) and reads the tags as the agent-creation hint for that
    turn alone (marketing_tools.user_assignable_goal_tags; nothing is held
    between turns, amendment A19);
  * put the `media` HARTOS's /chat reply carries into the reply the phone
    reads (the custom_gpt reply, and /chat's own), only in the reply-media
    shape (contracts.validate_media_item), with or without reply text;
  * never write the owner's intelligence_preference: the phone sends none.

Mocked boundaries only: HARTOS's in-process app (a stand-in Flask app
answering /chat, reached through the same test_client() transport
routes.hartos_backend_adapter.chat uses), the model gate
(models.orchestrator), LlamaConfig, server TTS, the local llama probes and
the cloud HTTP leg.  custom_gpt, teachme2, chat_route, _run_turn,
_chat_turn, _agent_reply and the adapter's chat() are the real code, and
the contract validators are HARTOS's own.

    python -m pytest tests/test_reel_attachments_passthrough.py -q
"""
import hashlib
import json
import logging
import os
import re
import sys
from types import SimpleNamespace
from unittest.mock import patch

import pytest
import requests
from flask import Flask, jsonify, request

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from integrations.reel_studio import contracts  # noqa: E402

import routes.chatbot_routes as cr  # noqa: E402
import routes.hartos_backend_adapter as hba  # noqa: E402

pytestmark = pytest.mark.timeout(60)


def _sha(label):
    return hashlib.sha256(label.encode('utf-8')).hexdigest()


#: A request id the phone mints for one turn (the bubble's local id).
PHONE_RID = 'rb_1760300000123_7f3a'
#: The ids the clients send today (audit 2026-10-13): Android's and Wear's
#: UUID.randomUUID(), the web page's chatRetry.makeMsgId().
UUID_RID = '3f1c2b7e-9a4d-4c1e-8f2a-0b6d5e4c3a21'
WEB_RID = 'msg_1760300000123_k3j9xq'

PROMPT_ID = 987654

ATTACHMENTS = [
    {'file_id': _sha('clip-1'), 'sha256': _sha('clip-1'), 'purpose': 'reel_source',
     'name': 'VID_20261012_101500.mp4', 'mime': 'video/mp4',
     'size': 123456789, 'duration_ms': 15000, 'captured_at': 1760250000123},
    {'file_id': _sha('logo'), 'sha256': _sha('logo'), 'purpose': 'logo',
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

#: Goal tags no client may assign: the reviewer's probe of 80f561d2.
HOSTILE_TAGS = ['self_build', 'finance', 'revenue', 'daemon', 'admin']

#: The three routes whose body names its turn's id.
ID_ROUTES = ('/chat/custom_gpt', '/chat/teachme2', '/chat')


def _attachment(**change):
    return {**ATTACHMENTS[0], **change}


def _clip(label, **change):
    """A valid clip row for the stored file ``label`` (file_id == sha256)."""
    return _attachment(file_id=_sha(label), sha256=_sha(label), **change)


def _log(caplog, logger=None):
    return '\n'.join(r.getMessage() for r in caplog.records
                     if logger is None or r.name == logger)


#: The adapter's logger: where the reel field bounds log what they dropped.
ADAPTER_LOG = 'routes.hartos_backend_adapter'


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
def _fresh_sessions(monkeypatch):
    # teachme2 names no agent (its agent lookup reads no recipe dir).
    monkeypatch.setenv('NUNBA_TEACH_AGENT_ID', '')
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
    # The legs below Tier-1 never reach a real server: the 0.8B draft probe
    # and the 4B completion are requests.post, the health probe is this.
    monkeypatch.setattr(lc, 'check_llama_health', lambda: False)
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

    # The real adapter is what the turn calls.
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

    def no_network(*args, **kwargs):
        raise requests.exceptions.ConnectionError('no network in tests')

    monkeypatch.setattr(cr.requests, 'post', no_network)
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


def _post_turn(client, path, request_id=..., **fields):
    """One turn on `path` with the body that route's clients send."""
    if path == '/chat/teachme2':
        body = {'user_id': '7', 'text': ['teach me fractions'],
                'teacher_avatar_id': 2933, **fields}
    elif path == '/chat':
        body = {'text': 'hello', 'user_id': 'd68c', 'media_mode': 'text',
                'conversation_id': 'conv1', **fields}
    else:
        body = {**PHONE_REEL_CREATE_TURN, **fields}
        body.pop('request_id')
    if request_id is not ...:
        body['request_id'] = request_id
    return client.post(path, json=body)


# ── the fixtures are the contract's shapes ───────────────────────────

def test_the_fixture_attachments_and_media_are_what_the_contract_accepts():
    """Every attachment and media item these tests call valid is valid by
    HARTOS's own validators, so a change to the contract fails here first."""
    for item in ATTACHMENTS:
        assert contracts.validate_attachment(item) == []
    for item in MEDIA:
        assert contracts.validate_media_item(item) == []


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
    assert body['request_id'] == PHONE_RID


def test_a_turn_without_reel_fields_sends_hartos_no_new_keys(client, hartos):
    """Every other caller's /chat body is what it was."""
    client.post('/chat/custom_gpt', json=PLAIN_CUSTOM_BOT_TURN)
    client.post('/chat/custom_gpt', json={**PLAIN_CUSTOM_BOT_TURN,
                                          'attachments': [], 'goal_tags': []})
    for body in hartos.seen:
        assert 'attachments' not in body
        assert 'goal_tags' not in body


# ── attachments: only the contract's shape crosses ───────────────────

_WIN_PATH = 'C:\\Users\\sathi\\Documents\\secret.txt'

BAD_ATTACHMENTS = [
    _attachment(file_id=_WIN_PATH, sha256=_WIN_PATH),              # a path, not a store id
    _attachment(file_id=_sha('x').upper(), sha256=_sha('x').upper()),  # not lowercase hex
    _attachment(sha256=_sha('another file')),                      # sha256 is not the file_id
    _attachment(name='../../prompts/x.mp4'),                       # not a bare name
    _attachment(name='C:\\Users\\sathi\\Videos\\secret.mp4'),
    _attachment(mime='application/x-msdownload'),                  # not for this purpose
    _attachment(purpose='reel'),                                   # an outbound purpose
    _attachment(size=-1),
    _attachment(captured_at=0),
    {k: v for k, v in ATTACHMENTS[0].items() if k != 'sha256'},
    # The pre-A9 row (amendment A9 a): not an attachment.
    {'kind': 'peerlink_file', 'ref': _sha('clip-1'), 'purpose': 'reel_source',
     'name': 'VID_20261012_101500.mp4', 'mime': 'video/mp4', 'size': 123456789},
    'C:/Windows/win.ini',
    ['file_id'],
    None,
]


@pytest.mark.parametrize('bad', BAD_ATTACHMENTS)
def test_an_attachment_outside_the_contract_never_reaches_hartos(client, hartos, bad):
    client.post('/chat/custom_gpt', json={
        **PHONE_REEL_CREATE_TURN, 'attachments': [bad, ATTACHMENTS[1]]})
    assert hartos.seen[0]['attachments'] == [ATTACHMENTS[1]]


def test_dropped_attachments_are_logged_by_count_never_by_value(client, hartos, caplog):
    sent = [BAD_ATTACHMENTS[0], ATTACHMENTS[0], *BAD_ATTACHMENTS[3:5],
            *BAD_ATTACHMENTS[11:], ATTACHMENTS[1]]
    caplog.set_level(logging.INFO)
    client.post('/chat/custom_gpt', json={**PHONE_REEL_CREATE_TURN,
                                          'attachments': sent})
    assert hartos.seen[0]['attachments'] == ATTACHMENTS
    log = _log(caplog)
    assert 'secret' not in log and 'win.ini' not in log and 'prompts' not in log
    assert f'{len(sent) - 2} of {len(sent)} attachments' in log


def test_an_attachment_carries_only_the_contracts_fields(client, hartos):
    """A row crosses as an opaque store id with its contract fields: a key
    the contract does not name (a path, a blob, the pre-A9 kind) stays on
    this node."""
    extra = _attachment(path='C:\\Users\\sathi\\Videos\\VID.mp4',
                        blob='x' * 4000, uri='content://media/external/1',
                        kind='peerlink_file')
    client.post('/chat/custom_gpt', json={**PHONE_REEL_CREATE_TURN,
                                          'attachments': [extra]})
    assert hartos.seen[0]['attachments'] == [ATTACHMENTS[0]]


def test_a_mirror_row_without_a_purpose_crosses_as_it_is(client, hartos):
    """A9 a: one shape in and out.  The chat mirror's U9 row (no purpose,
    no meta) is an attachment as it stands."""
    row = {'file_id': _sha('diagram'), 'sha256': _sha('diagram'),
           'name': 'diagram.png', 'mime': 'image/png', 'size': 2048}
    client.post('/chat/custom_gpt', json={**PHONE_REEL_CREATE_TURN,
                                          'attachments': [row]})
    assert hartos.seen[0]['attachments'] == [row]


def test_the_reviewers_ten_megabyte_probe_forwards_nothing(client, hartos, caplog):
    big = [{'kind': 'peerlink_file', 'ref': _WIN_PATH, 'file_id': _WIN_PATH,
            'blob': 'x' * 200000} for _ in range(50)]
    caplog.set_level(logging.INFO)
    resp = client.post('/chat/custom_gpt', json={
        **PHONE_REEL_CREATE_TURN, 'attachments': big, 'goal_tags': HOSTILE_TAGS})
    assert resp.status_code == 200
    body = hartos.seen[0]
    assert 'attachments' not in body and 'goal_tags' not in body
    log = _log(caplog)
    assert 'secret.txt' not in log and 'xxxxxxxxxx' not in log


def test_at_most_ten_attachments_cross(client, hartos):
    many = [_clip(f'clip-{i}') for i in range(12)]
    client.post('/chat/custom_gpt', json={**PHONE_REEL_CREATE_TURN,
                                          'attachments': many})
    assert hartos.seen[0]['attachments'] == many[:10]


def test_the_cap_is_hartos_own(client, hartos, monkeypatch):
    """core.chat_attachments.MAX_ATTACHMENTS decides how many cross."""
    monkeypatch.setitem(sys.modules, 'core.chat_attachments', SimpleNamespace(
        validate_attachment=contracts.validate_attachment, MAX_ATTACHMENTS=3))
    many = [_clip(f'clip-{i}') for i in range(12)]
    client.post('/chat/custom_gpt', json={**PHONE_REEL_CREATE_TURN,
                                          'attachments': many})
    assert hartos.seen[0]['attachments'] == many[:3]


@pytest.mark.parametrize('cap', [
    '3',                                           # not a count
    True,                                          # a bool is not a count
    -1,
    ...,                                           # not there
])
def test_without_hartos_cap_no_attachment_crosses(
        client, hartos, monkeypatch, caplog, cap):
    """Fail closed (inventory D28): HARTOS's MAX_ATTACHMENTS is the one cap.
    A node that loads the attachments rule but cannot read that cap as a
    count forwards no attachment and keeps no number of its own (it used to
    let ten cross), and says which name it could not read."""
    module = SimpleNamespace(validate_attachment=contracts.validate_attachment)
    if cap is not ...:
        module.MAX_ATTACHMENTS = cap
    monkeypatch.setitem(sys.modules, 'core.chat_attachments', module)
    caplog.set_level(logging.INFO)
    many = [_clip(f'clip-{i}') for i in range(12)]
    resp = client.post('/chat/custom_gpt', json={**PHONE_REEL_CREATE_TURN,
                                                 'attachments': many})
    assert resp.status_code == 200
    body = hartos.seen[0]
    assert 'attachments' not in body
    assert body['goal_tags'] == ['reel_studio']        # tags do not need it
    log = _log(caplog, ADAPTER_LOG)
    assert 'MAX_ATTACHMENTS' in log and '12' in log


def test_a_row_wider_than_any_attachment_is_not_checked(client, hartos):
    wide = _attachment(**{f'k{i}': i for i in range(40)})
    client.post('/chat/custom_gpt', json={**PHONE_REEL_CREATE_TURN,
                                          'attachments': [wide, ATTACHMENTS[1]]})
    assert hartos.seen[0]['attachments'] == [ATTACHMENTS[1]]


def test_the_attachments_a_turn_forwards_stay_under_16_kb(client, hartos):
    """Each entry is contract-valid, yet ten of them with 1,500-digit sizes
    would be 17 KB: the forwarded list stops at the byte budget."""
    huge = [_clip(f'clip-{i}', size=10 ** 1500) for i in range(10)]
    assert all(contracts.validate_attachment(a) == [] for a in huge)
    client.post('/chat/custom_gpt', json={**PHONE_REEL_CREATE_TURN,
                                          'attachments': huge})
    sent = hartos.seen[0]['attachments']
    assert 0 < len(sent) < 10
    assert sent == huge[:len(sent)]
    assert len(json.dumps(sent)) <= 16 * 1024


def test_attachments_that_are_not_a_list_are_dropped(client, hartos, caplog):
    caplog.set_level(logging.INFO)
    client.post('/chat/custom_gpt', json={
        **PHONE_REEL_CREATE_TURN, 'attachments': 'C:/Windows/win.ini',
        'goal_tags': 'reel_studio'})
    body = hartos.seen[0]
    assert 'attachments' not in body and 'goal_tags' not in body
    assert 'win.ini' not in _log(caplog)


def test_without_hartos_attachment_rule_no_attachment_crosses(
        client, hartos, monkeypatch, caplog):
    """Fail closed: a node that cannot load HARTOS's attachments rule
    (core.chat_attachments) forwards none, and says which module."""
    monkeypatch.setitem(sys.modules, 'core.chat_attachments', None)
    caplog.set_level(logging.INFO)
    resp = client.post('/chat/custom_gpt', json=PHONE_REEL_CREATE_TURN)
    assert resp.status_code == 200
    body = hartos.seen[0]
    assert 'attachments' not in body
    assert body['goal_tags'] == ['reel_studio']        # tags do not need it
    assert 'core.chat_attachments' in _log(caplog)


def test_a_node_without_reel_studio_still_forwards_her_attachments(
        client, hartos, monkeypatch):
    """A chat attachment (a PDF, a picture) is a chat thing, not a Reel
    Studio one (owner ruling A10a: one upload service for every purpose):
    its rule is core.chat_attachments', so it crosses without the Reel
    Studio package."""
    monkeypatch.setitem(sys.modules, 'integrations.reel_studio.contracts', None)
    pdf = {'file_id': _sha('menu.pdf'), 'sha256': _sha('menu.pdf'), 'name': 'menu.pdf',
           'mime': 'application/pdf', 'size': 2048, 'purpose': 'chat_attachment'}
    client.post('/chat/custom_gpt', json={**PHONE_REEL_CREATE_TURN,
                                          'attachments': [*ATTACHMENTS, pdf]})
    assert hartos.seen[0]['attachments'] == [*ATTACHMENTS, pdf]


def test_the_attachment_rule_is_hartos_own(client, hartos, monkeypatch):
    """HARTOS's one rule (core.chat_attachments.validate_attachment) decides
    which rows cross, not a copy here and not a second reader."""
    import core.chat_attachments as chat_attachments
    rule = chat_attachments.validate_attachment

    def no_logo_today(item):
        return rule(item) or (['no logo today'] if item.get('purpose') == 'logo' else [])

    monkeypatch.setattr(chat_attachments, 'validate_attachment', no_logo_today)
    client.post('/chat/custom_gpt', json=PHONE_REEL_CREATE_TURN)
    assert hartos.seen[0]['attachments'] == [ATTACHMENTS[0]]


def test_a_validator_that_raises_drops_the_entry(client, hartos, monkeypatch):
    import core.chat_attachments as chat_attachments

    def boom(item):
        raise RuntimeError('validator bug')

    monkeypatch.setattr(chat_attachments, 'validate_attachment', boom)
    client.post('/chat/custom_gpt', json=PHONE_REEL_CREATE_TURN)
    assert 'attachments' not in hartos.seen[0]


# ── goal_tags: only what a user may assign ───────────────────────────

def test_only_user_assignable_goal_tags_reach_hartos(client, hartos, caplog):
    caplog.set_level(logging.INFO)
    client.post('/chat/custom_gpt', json={
        **PHONE_REEL_CREATE_TURN,
        'goal_tags': [*HOSTILE_TAGS, 'reel_studio', 'reel_studio', 7, None]})
    assert hartos.seen[0]['goal_tags'] == ['reel_studio']
    log = _log(caplog, ADAPTER_LOG)
    assert '8 of 9 goal_tags' in log
    assert not any(t in log for t in HOSTILE_TAGS)


def test_no_assignable_tag_sends_no_goal_tags(client, hartos):
    client.post('/chat/custom_gpt', json={**PHONE_REEL_CREATE_TURN,
                                          'goal_tags': HOSTILE_TAGS})
    assert 'goal_tags' not in hartos.seen[0]


def test_hartos_filter_decides_and_its_order_crosses(client, hartos, monkeypatch):
    """HARTOS's user_assignable_goal_tags (marketing_tools) is the one
    filter (inventory D23k): its answer crosses as it is, sorted and each
    once, the order HARTOS's own chat() reads it in.  The copy this
    node used to run kept the order sent ('reel_studio' before 'news')."""
    from integrations.agent_engine import marketing_tools
    monkeypatch.setattr(marketing_tools, 'USER_ASSIGNABLE_GOAL_TAGS',
                        frozenset({'reel_studio', 'news'}))
    client.post('/chat/custom_gpt', json={
        **PHONE_REEL_CREATE_TURN,
        'goal_tags': ['reel_studio', 'finance', 'news', 'reel_studio']})
    assert hartos.seen[0]['goal_tags'] == ['news', 'reel_studio']


def test_hartos_filter_is_the_one_called(client, hartos, monkeypatch):
    """What HARTOS's filter refuses does not cross, even a tag in
    USER_ASSIGNABLE_GOAL_TAGS: this node asks the filter, not the set."""
    from integrations.agent_engine import marketing_tools
    asked = []

    def refuses_all(raw):
        asked.append(list(raw))
        return []

    monkeypatch.setattr(marketing_tools, 'user_assignable_goal_tags', refuses_all)
    client.post('/chat/custom_gpt', json=PHONE_REEL_CREATE_TURN)
    assert asked == [['reel_studio']]
    assert 'goal_tags' not in hartos.seen[0]


def _raises(raw):
    raise RuntimeError('filter bug')


@pytest.mark.parametrize('marketing_tools', [
    None,                                                     # cannot be imported
    SimpleNamespace(),                                        # defines no filter
    # The set alone is not the rule: this node no longer filters by it.
    SimpleNamespace(USER_ASSIGNABLE_GOAL_TAGS=frozenset({'reel_studio'})),
    SimpleNamespace(user_assignable_goal_tags='reel_studio'),          # not callable
    SimpleNamespace(user_assignable_goal_tags=_raises),                # raises
    SimpleNamespace(user_assignable_goal_tags=lambda raw: 'reel_studio'),  # not a list
    SimpleNamespace(user_assignable_goal_tags=lambda raw: [7]),        # not names
])
def test_without_hartos_filter_no_goal_tag_crosses(
        client, hartos, monkeypatch, caplog, marketing_tools):
    """Fail closed (amendment A9 e, inventory D23k): HARTOS's
    user_assignable_goal_tags is the one filter.  A node that cannot load it,
    whose filter raises, or that answers with anything but a list of names,
    forwards no tag, keeps no list or filter of its own, and says so by
    count, never by value."""
    monkeypatch.setitem(sys.modules, 'integrations.agent_engine.marketing_tools',
                        marketing_tools)
    caplog.set_level(logging.INFO)
    resp = client.post('/chat/custom_gpt', json={
        **PHONE_REEL_CREATE_TURN, 'goal_tags': ['finance', 'reel_studio', 'studio']})
    assert resp.status_code == 200
    body = hartos.seen[0]
    assert 'goal_tags' not in body
    assert body['attachments'] == ATTACHMENTS          # attachments do not need it
    log = _log(caplog, ADAPTER_LOG)
    assert 'user_assignable_goal_tags' in log and '3 goal_tags' in log
    assert 'finance' not in log


def test_hartos_reads_every_ref_and_tag_this_node_forwards(client, hartos):
    """What crosses is what HARTOS's chat() reads: every forwarded attachment
    row survives core.chat_attachments.parse_inbound (the read before
    bind_inbound) and every forwarded tag survives
    marketing_tools.user_assignable_goal_tags (the read HARTOS's chat()
    makes of the turn's hint).  HARTOS's own readers, not copies."""
    from core.chat_attachments import parse_inbound
    from integrations.agent_engine.marketing_tools import user_assignable_goal_tags
    client.post('/chat/custom_gpt', json={
        **PHONE_REEL_CREATE_TURN,
        'attachments': [ATTACHMENTS[0], BAD_ATTACHMENTS[0], ATTACHMENTS[1]],
        'goal_tags': ['reel_studio', *HOSTILE_TAGS]})
    body = hartos.seen[0]
    assert body['attachments'] == ATTACHMENTS
    assert parse_inbound(body['attachments']) == [
        {'file_id': a['file_id'], 'purpose': a['purpose']} for a in ATTACHMENTS]
    assert body['goal_tags'] == ['reel_studio']
    assert user_assignable_goal_tags(body['goal_tags']) == body['goal_tags']


@pytest.mark.parametrize('bad', [b for b in BAD_ATTACHMENTS if isinstance(b, dict)])
def test_hartos_drops_every_row_this_node_drops(bad):
    """Inbound == outbound across the boundary (amendment A9 a): a row this
    node keeps back is one HARTOS's /chat would not read either
    (core.chat_attachments.parse_inbound), so a client that reaches HARTOS
    some other way gets no more bound than through here."""
    from core.chat_attachments import parse_inbound
    assert hba.turn_attachments([bad]) == []
    assert parse_inbound([bad]) == []


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


def test_a_media_only_reply_keeps_its_media_on_the_phone(client, hartos):
    """A reply with the reel and no words is an answer, not a failed turn."""
    _built(hartos.prompts_dir)
    hartos.state['reply'] = {'response': '', 'media': MEDIA}
    resp = client.post('/chat/custom_gpt', json=PHONE_REEL_REUSE_TURN)
    assert resp.status_code == 200
    reply = resp.get_json()
    assert reply['media'] == MEDIA
    assert reply['answerList'] == ['']          # Android reads answerList.get(0)
    assert 'Starting the local AI engine' not in json.dumps(reply)


def test_a_media_only_reply_keeps_its_media_on_chat(client, hartos):
    _built(hartos.prompts_dir)
    hartos.state['reply'] = {'response': '', 'media': MEDIA}
    resp = client.post('/chat', json={
        'text': "make today's one", 'user_id': '10202',
        'prompt_id': PROMPT_ID, 'request_id': PHONE_RID, 'media_mode': 'text'})
    reply = resp.get_json()
    assert reply['media'] == MEDIA
    assert reply['success'] is True and not reply.get('llm_starting')
    assert reply['text'] == ''


def test_a_reply_without_media_has_no_media_key(client, hartos):
    _built(hartos.prompts_dir)
    hartos.state['reply'] = {'response': 'Which clips should I use?'}
    reply = client.post('/chat/custom_gpt', json=PHONE_REEL_REUSE_TURN).get_json()
    assert 'media' not in reply
    assert reply['answerList'] == ['Which clips should I use?']


@pytest.mark.parametrize('media', [
    'not-a-list',
    {'kind': 'video'},
    [{'kind': 'video', 'xid': 'b' * 64}],                          # half an item
    [{**MEDIA[0], 'qa': {'passed': False, 'failed': ['fps']}}],   # failed QA
    [{**MEDIA[0], 'xid': 'C:\\reels\\r.mp4'}],
    ['C:/reels/r.mp4'],
])
def test_media_not_in_the_reply_media_shape_is_dropped(client, hartos, media, caplog):
    _built(hartos.prompts_dir)
    hartos.state['reply'] = {'response': 'Your reel is ready.', 'media': media}
    caplog.set_level(logging.INFO)
    reply = client.post('/chat/custom_gpt', json=PHONE_REEL_REUSE_TURN).get_json()
    assert 'media' not in reply
    assert reply['answerList'] == ['Your reel is ready.']
    assert 'r.mp4' not in _log(caplog)


def test_only_the_valid_media_items_are_kept(client, hartos):
    _built(hartos.prompts_dir)
    broken = {**MEDIA[0], 'width': 1920, 'height': 1080}
    hartos.state['reply'] = {'response': 'Two reels.', 'media': [broken, *MEDIA]}
    reply = client.post('/chat/custom_gpt', json=PHONE_REEL_REUSE_TURN).get_json()
    assert reply['media'] == MEDIA


def test_without_hartos_contract_no_media_crosses(client, hartos, monkeypatch):
    _built(hartos.prompts_dir)
    monkeypatch.setitem(sys.modules, 'integrations.reel_studio.contracts', None)
    hartos.state['reply'] = {'response': 'Your reel is ready.', 'media': MEDIA}
    reply = client.post('/chat/custom_gpt', json=PHONE_REEL_REUSE_TURN).get_json()
    assert 'media' not in reply
    assert reply['answerList'] == ['Your reel is ready.']


# ── request_id: a client's, when a client may name the turn ──────────

@pytest.mark.parametrize('sent', [
    PHONE_RID,
    1760300000123,                                  # a Java long
    UUID_RID,                                       # Android / Wear
    WEB_RID,                                        # the web page
    'abcdefgh',                                     # shortest allowed
    'A' * 64,                                       # longest allowed
    'DAEMON_4242abcd',                              # HARTOS's tag is lower case:
    'Daemon_4242abcd',                              # these are user turns there
])
def test_a_well_formed_phone_id_names_the_turn_everywhere(client, hartos, sent):
    reply = client.post('/chat/custom_gpt', json={
        **PHONE_REEL_CREATE_TURN, 'request_id': sent}).get_json()
    assert hartos.seen[0]['request_id'] == str(sent)
    assert reply['request_id'] == str(sent)


@pytest.mark.parametrize('path', ID_ROUTES)
@pytest.mark.parametrize('sent', [UUID_RID, WEB_RID, 'DAEMON_4242abcd', 'Daemon_4242abcd'])
def test_every_route_keeps_a_clients_well_formed_id(client, hartos, path, sent):
    resp = _post_turn(client, path, request_id=sent)
    assert resp.status_code == 200
    assert hartos.seen[0]['request_id'] == sent
    if path != '/chat':                       # /chat's reply names no id
        assert resp.get_json()['request_id'] == sent


MALFORMED_IDS = [
    'short1',                     # under 8
    'a' * 65,                     # over 64
    '../../prompts/x',            # a path
    'rid with space',
    'abcdefgh\n',                 # a trailing newline
    'abcdefgh\r\nFAKE LOG LINE',  # a forged log line
    'tamil_தமிழ்_id',             # outside the id alphabet
    'daemon_4242abcd',            # HARTOS's background-turn tag
    'daemon_',
    True,
    ['abcdefghij'],
    {'id': 'abcdefghij'},
]


@pytest.mark.parametrize('sent', MALFORMED_IDS)
def test_a_malformed_or_reserved_id_is_replaced_by_a_fresh_one(client, hartos, sent):
    reply = client.post('/chat/custom_gpt', json={
        **PHONE_REEL_CREATE_TURN, 'request_id': sent}).get_json()
    used = hartos.seen[0]['request_id']
    assert used != sent and used != str(sent)
    assert isinstance(used, str) and WELL_FORMED_RID.fullmatch(used)
    assert not used.startswith('daemon_')
    # one id for the turn: what HARTOS ran is what the phone is told
    assert reply['request_id'] == used


@pytest.mark.parametrize('path', ['/chat/teachme2', '/chat'])
@pytest.mark.parametrize('sent', ['daemon_4242abcd', 'daemon_goal-7', '../../prompts/x',
                                  'abcdefgh\r\nFAKE LOG LINE', ['abcdefghij']])
def test_teachme2_and_chat_never_run_a_turn_under_a_reserved_or_malformed_id(
        client, hartos, path, sent, caplog):
    """B2: a client's daemon_<goal> id would make HARTOS keep that goal's
    lane, skip marking user activity and book escalations to the goal."""
    caplog.set_level(logging.INFO)
    resp = _post_turn(client, path, request_id=sent)
    assert resp.status_code == 200
    used = hartos.seen[0]['request_id']
    assert isinstance(used, str) and WELL_FORMED_RID.fullmatch(used)
    assert not used.startswith('daemon_') and used != sent
    if path != '/chat':
        assert resp.get_json()['request_id'] == used
    assert 'FAKE LOG LINE' not in _log(caplog)


@pytest.mark.parametrize('sent', [None, '', 0])
def test_a_turn_with_no_id_gets_a_fresh_one(client, hartos, sent):
    body = {**PHONE_REEL_CREATE_TURN, 'request_id': sent}
    reply = client.post('/chat/custom_gpt', json=body).get_json()
    used = hartos.seen[0]['request_id']
    assert isinstance(used, str) and WELL_FORMED_RID.fullmatch(used)
    assert reply['request_id'] == used


@pytest.mark.parametrize('path, minted', [
    ('/chat/custom_gpt', '1760000000500'),    # central's paths: milliseconds
    ('/chat/teachme2', '1760000000500'),
    ('/chat', '1760000000'),                  # /chat: seconds, the rule
])                                            # core.chat_client.mint_request_id mirrors
def test_a_turn_without_an_id_is_minted_as_before(client, hartos, monkeypatch, path, minted):
    monkeypatch.setattr(cr.time, 'time', lambda: 1760000000.5)
    _post_turn(client, path)
    assert hartos.seen[0]['request_id'] == minted


def test_a_daemon_tag_is_refused_by_the_one_spelling_hartos_reads():
    """The reserved prefix is HARTOS's own constant, not a copy here."""
    from core.chat_client import DAEMON_PREFIX
    with patch('core.chat_client.DAEMON_PREFIX', 'bgjob_'):
        assert cr._turn_request_id({'request_id': 'bgjob_12345678'}) != 'bgjob_12345678'
        assert cr._turn_request_id(
            {'request_id': f'{DAEMON_PREFIX}12345678'}) == f'{DAEMON_PREFIX}12345678'


@pytest.mark.parametrize('path', ID_ROUTES)
def test_without_hartos_daemon_tag_no_client_id_is_taken(
        client, hartos, monkeypatch, caplog, path):
    """Fail closed: when core.chat_client cannot be imported, a person's turn
    cannot be told from the daemon's, so no client names the turn.  The log
    says that, and does not call the well-formed id malformed."""
    monkeypatch.setitem(sys.modules, 'core.chat_client', None)
    caplog.set_level(logging.INFO)
    resp = _post_turn(client, path, request_id=UUID_RID)
    assert resp.status_code == 200
    used = hartos.seen[0]['request_id']
    assert used != UUID_RID and WELL_FORMED_RID.fullmatch(used)
    if path != '/chat':
        assert resp.get_json()['request_id'] == used     # one id for the turn
    log = _log(caplog)
    assert 'core.chat_client' in log
    assert 'unusable' not in log and 'not a request id' not in log


def test_a_malformed_id_is_logged_by_shape_never_by_value(client, hartos, caplog):
    caplog.set_level(logging.INFO)
    client.post('/chat/custom_gpt', json={**PHONE_REEL_CREATE_TURN,
                                          'request_id': 'SECRETVALUE-xyz/0123'})
    log = _log(caplog)
    assert 'SECRETVALUE' not in log
    assert 'not a request id' in log


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

def _cloud(monkeypatch):
    """The cloud leg as a recorder: every body posted there, and one answer."""
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
    return sent


def test_refs_never_ride_the_cloud_leg(client, hartos, monkeypatch):
    """A turn for an agent this node does not have, with no creation hint
    that keeps it here, goes to the cloud; the desktop store's refs stay
    here."""
    sent = _cloud(monkeypatch)
    resp = client.post('/chat/custom_gpt', json=PHONE_REEL_REUSE_TURN,
                       headers={'Authorization': 'Bearer t'})
    assert resp.get_json()['answerList'] == ['cloud agent here']
    assert hartos.seen == []
    assert len(sent) == 1 and sent[0]['timeout']
    assert 'attachments' not in sent[0]['json']
    assert 'goal_tags' not in sent[0]['json']


def test_tags_never_ride_the_cloud_leg(client, hartos, monkeypatch):
    """On the central node reel_studio keeps nothing local (amendment A8 d:
    marketing_tools._reel_studio_inert), so the same turn goes to the cloud
    there; its creation hint and refs still stay here."""
    import security.key_delegation as key_delegation
    monkeypatch.setattr(key_delegation, 'get_node_tier', lambda: 'central')
    sent = _cloud(monkeypatch)
    resp = client.post('/chat/custom_gpt', json={**PHONE_REEL_REUSE_TURN,
                                                 'goal_tags': ['reel_studio']},
                       headers={'Authorization': 'Bearer t'})
    assert resp.get_json()['answerList'] == ['cloud agent here']
    assert hartos.seen == []
    assert len(sent) == 1 and sent[0]['timeout']
    assert 'attachments' not in sent[0]['json']
    assert 'goal_tags' not in sent[0]['json']


def test_a_reel_studio_turn_for_an_unmade_agent_never_goes_to_the_cloud(
        client, hartos, monkeypatch):
    """Her second turn: create_agent False (ReelInbox.createMode after the
    first reply), goal_tags reel_studio, no record here yet because HARTOS
    saves it only when its gather completes.  It stays here with its refs
    and hint, and nothing is posted to the cloud (measured live 2026-10-18,
    HARTOS task #136: it was forwarded, 401, and a generic assistant
    answered)."""
    import core.cache_loaders as cache_loaders
    monkeypatch.setattr(cache_loaders, 'load_agent_config', lambda *a, **k: None)
    sent = _cloud(monkeypatch)
    resp = client.post('/chat/custom_gpt', json={**PHONE_REEL_REUSE_TURN,
                                                 'goal_tags': ['reel_studio']},
                       headers={'Authorization': 'Bearer t'})
    assert resp.get_json()['answerList'] == ['On it.']
    assert sent == []
    assert len(hartos.seen) == 1
    body = hartos.seen[0]
    assert body['prompt_id'] == PROMPT_ID and body['create_agent'] is False
    assert body['goal_tags'] == ['reel_studio']
    assert body['attachments'] == [ATTACHMENTS[0]]


# ── the adapter's /chat body ─────────────────────────────────────────

def test_the_adapter_forwards_bounded_refs_and_tags_only_when_given(hartos):
    hba.chat(text='hi', user_id='u')
    hba.chat(text='hi', user_id='u', attachments=[], goal_tags=[])
    hba.chat(text='make it', user_id='u', agent_id=PROMPT_ID,
             attachments=ATTACHMENTS, goal_tags=['reel_studio'])
    hba.chat(text='make it', user_id='u', agent_id=PROMPT_ID,
             attachments=[_attachment(file_id='../x')], goal_tags=['finance'])
    plain, empty, reel, hostile = hartos.seen
    for body in (plain, empty, hostile):
        assert 'attachments' not in body and 'goal_tags' not in body
    assert reel['attachments'] == ATTACHMENTS
    assert reel['goal_tags'] == ['reel_studio']
