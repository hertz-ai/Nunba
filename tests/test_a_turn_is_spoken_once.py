"""A turn the person hears is ONE clip under its request id.

The defect (22 Nov 2026, the rhyme agent's walk and the Tamil speech demo
it serves): HARTOS's own /chat, reached in this process (Tier-1), speaks
the turn from _chat_reply: every message the agent sent, then the reply,
as one clip under the turn's request id.  The chat route here ALSO spoke
the reply on its own whenever the turn's preferred_lang was not English.
The page plays the newest clip of a turn (ttsClipPlayer loads a new url
over the one playing), so the reply-only clip cut the turn's sends off: a
Tamil turn's rhyme was never heard to the end.

Nunba now speaks a non-English reply only when HARTOS's own /chat did not
answer it here.  Every turn where its clip is the only speech is kept:
HARTOS not ready (the first clause, as before), a reply from HARTOS over
HTTP (Tier-2), and the llama-local path further down the route (untouched).
A background turn never passes this route: HARTOS runs it in-process and
_chat_reply keeps it silent (HARTOS tests).

Real: the chat route (routes.chatbot_routes, registered on a Flask app) and
the adapter's chat() (routes.hartos_backend_adapter) with its Tier-1
test_client() transport and its Tier-2 session.  Stand-ins: HARTOS's
in-process app (a Flask app answering /chat that records the clip its
_chat_reply makes, every send then the reply, unless the turn is
text-mode), HARTOS's HTTP leg (a session that answers), the speech this
route makes (_fire_nunba_tts, recorded), LlamaConfig, the model gate and
the network (refused).

    python -m pytest tests/test_a_turn_is_spoken_once.py -q
"""
import os
import sys
from types import SimpleNamespace

import pytest
import requests
from flask import Flask, jsonify, request

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import routes.chatbot_routes as cr  # noqa: E402
import routes.hartos_backend_adapter as hba  # noqa: E402

pytestmark = pytest.mark.timeout(60)

RHYME_TA = 'நிலா நிலா ஓடி வா\nநில்லாமல் ஓடி வா'
PRAISE_TA = 'அருமை, அருண்!'
PRAISE_EN = 'Lovely singing, Arun!'


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
    monkeypatch.setenv('NUNBA_TEACH_AGENT_ID', '')
    with cr._sessions_lock:
        saved = dict(cr.sessions)
        cr.sessions.clear()
    yield
    with cr._sessions_lock:
        cr.sessions.clear()
        cr.sessions.update(saved)


@pytest.fixture
def node(monkeypatch, tmp_path):
    """HARTOS in this process, as the adapter reaches it, and every clip a
    turn makes: ('hartos', request_id, text) from its _chat_reply,
    ('nunba', request_id, text) from this route."""
    import core.platform_paths as pp

    import llama.llama_config as lc

    prompts = tmp_path / 'prompts'
    prompts.mkdir()
    monkeypatch.setattr(pp, 'get_prompts_dir', lambda: str(prompts))

    class FakeLlamaConfig:
        @classmethod
        def cached_intelligence_preference(cls):
            return 'auto'

        def __init__(self):
            pass

        def set_intelligence_preference(self, value):
            pass

    monkeypatch.setattr(lc, 'LlamaConfig', FakeLlamaConfig)
    monkeypatch.setattr(lc, 'check_llama_health', lambda: False)

    clips = []
    faces = {}  # request id -> the face arguments the route gave _fire_nunba_tts
    state = {'sends': [], 'reply': PRAISE_TA}
    hartos = Flask('hartos_stand_in')

    @hartos.route('/chat', methods=['POST'])
    def chat():
        body = request.get_json()
        # _chat_reply: one clip for the turn, its sends then its reply,
        # unless the turn asked for text only.
        if body.get('media_mode') != 'text':
            clips.append(('hartos', body['request_id'],
                          '\n\n'.join(state['sends'] + [state['reply']])))
        return jsonify({'response': state['reply']})

    assert cr.hevolve_chat is hba.chat
    monkeypatch.setattr(hba, '_hartos_initialized', True)
    monkeypatch.setattr(hba, '_hartos_backend_available', True)
    monkeypatch.setattr(hba, '_hevolve_app', hartos)
    monkeypatch.setattr(hba, '_hartos_init_thread_started', True)
    monkeypatch.setattr(hba, '_http_fail_count', 0)
    monkeypatch.setattr(cr, 'HEVOLVE_CHAT_AVAILABLE', True)
    monkeypatch.setattr(
        cr, '_fire_nunba_tts',
        # media_mode / avatar_id: a video turn's face (avatarforcing_tool)
        lambda text, user_id, request_id, language='en', **face:
        (faces.__setitem__(request_id, face), clips.append(('nunba', request_id, text))))
    monkeypatch.setitem(sys.modules, 'models.orchestrator', None)

    def no_network(*args, **kwargs):
        raise requests.exceptions.ConnectionError('no network in tests')

    monkeypatch.setattr(cr.requests, 'post', no_network)
    return SimpleNamespace(clips=clips, state=state, hartos=hartos, faces=faces)


def _over_http(monkeypatch, node, reply):
    """HARTOS answers over HTTP (Tier-2): not in this process, so its
    _chat_reply did not speak here."""
    monkeypatch.setattr(hba, '_hevolve_app', None)

    class Answer:
        status_code = 200

        def raise_for_status(self):
            pass

        def json(self):
            return {'response': reply}

    class Session:
        def post(self, *args, **kwargs):
            return Answer()

    monkeypatch.setattr(hba, '_session', Session())


def _turn(client, request_id, lang, mode='audio', **extra):
    resp = client.post('/chat', json={
        'text': 'sing with me', 'user_id': 'd68c', 'media_mode': mode,
        'conversation_id': 'conv1', 'preferred_lang': lang,
        'request_id': request_id, **extra})
    assert resp.status_code == 200, resp.get_data(as_text=True)
    return resp.get_json()


def _of(clips, request_id):
    return [c for c in clips if c[1] == request_id]


def test_a_tamil_turn_is_one_clip_that_carries_its_sends(client, node):
    """The rhyme was sent, then the praise is the reply: the one clip is
    HARTOS's, rhyme and praise, and nothing replaces it."""
    node.state.update(sends=[RHYME_TA], reply=PRAISE_TA)
    body = _turn(client, 'turn-ta-sends-01', 'ta')
    assert body['text'] == PRAISE_TA
    assert _of(node.clips, 'turn-ta-sends-01') == [
        ('hartos', 'turn-ta-sends-01', f'{RHYME_TA}\n\n{PRAISE_TA}')]


def test_a_tamil_turn_without_sends_is_one_clip(client, node):
    node.state.update(sends=[], reply=PRAISE_TA)
    _turn(client, 'turn-ta-plain-01', 'ta')
    assert _of(node.clips, 'turn-ta-plain-01') == [
        ('hartos', 'turn-ta-plain-01', PRAISE_TA)]


def test_an_english_turn_is_one_clip(client, node):
    node.state.update(sends=['Twinkle, twinkle, little star'],
                      reply=PRAISE_EN)
    _turn(client, 'turn-en-sends-01', 'en')
    assert _of(node.clips, 'turn-en-sends-01') == [
        ('hartos', 'turn-en-sends-01',
         f'Twinkle, twinkle, little star\n\n{PRAISE_EN}')]


def test_a_text_mode_turn_is_silent(client, node):
    node.state.update(sends=[RHYME_TA], reply=PRAISE_TA)
    _turn(client, 'turn-ta-text-01', 'ta', mode='text')
    assert _of(node.clips, 'turn-ta-text-01') == []


def test_a_tamil_reply_from_hartos_over_http_is_spoken_here(
        client, node, monkeypatch):
    """Tier-2: HARTOS answered from another process, so this route's clip
    is the turn's only speech, as before."""
    _over_http(monkeypatch, node, PRAISE_TA)
    _turn(client, 'turn-ta-http-01', 'ta')
    assert _of(node.clips, 'turn-ta-http-01') == [
        ('nunba', 'turn-ta-http-01', PRAISE_TA)]


def test_a_reply_while_hartos_is_not_ready_is_spoken_here(
        client, node, monkeypatch):
    """HARTOS not available in this process (it is still loading): this
    route's clip is the only speech, in English too, as before."""
    monkeypatch.setattr(hba, '_hartos_backend_available', False)
    _over_http(monkeypatch, node, PRAISE_EN)
    _turn(client, 'turn-en-noready-01', 'en')
    assert _of(node.clips, 'turn-en-noready-01') == [
        ('nunba', 'turn-en-noready-01', PRAISE_EN)]


def test_a_reply_from_the_local_llama_is_spoken_here(
        client, node, monkeypatch):
    """No HARTOS chat on this node: the route asks the local llama itself,
    and its clip is the only speech, as before."""
    import llama.llama_config as lc
    monkeypatch.setattr(cr, 'HEVOLVE_CHAT_AVAILABLE', False)
    monkeypatch.setattr(lc, 'check_llama_health', lambda: True)
    monkeypatch.setattr(lc, 'get_llama_endpoint', lambda: 'http://127.0.0.1:1')

    class Completion:
        status_code = 200

        def json(self):
            return {'choices': [{'message': {'content': PRAISE_TA}}]}

    def post(url, *args, **kwargs):
        if ':8081/' in url:     # the draft model is not up
            raise requests.exceptions.ConnectionError('no draft model')
        return Completion()

    monkeypatch.setattr(cr.requests, 'post', post)
    _turn(client, 'turn-ta-llama-01', 'ta')
    assert _of(node.clips, 'turn-ta-llama-01') == [
        ('nunba', 'turn-ta-llama-01', PRAISE_TA)]


def test_an_english_reply_from_hartos_over_http_is_not_spoken_here(
        client, node, monkeypatch):
    """Unchanged: HARTOS ready, the reply over HTTP, English: this route
    does not speak it (its HARTOS speaks English itself)."""
    _over_http(monkeypatch, node, PRAISE_EN)
    _turn(client, 'turn-en-http-01', 'en')
    assert _of(node.clips, 'turn-en-http-01') == []


def _local_llama(monkeypatch):
    import llama.llama_config as lc
    monkeypatch.setattr(cr, 'HEVOLVE_CHAT_AVAILABLE', False)
    monkeypatch.setattr(lc, 'check_llama_health', lambda: True)
    monkeypatch.setattr(lc, 'get_llama_endpoint', lambda: 'http://127.0.0.1:1')

    class Completion:
        status_code = 200

        def json(self):
            return {'choices': [{'message': {'content': PRAISE_TA}}]}

    def post(url, *args, **kwargs):
        if ':8081/' in url:
            raise requests.exceptions.ConnectionError('no draft model')
        return Completion()
    monkeypatch.setattr(cr.requests, 'post', post)


def test_a_video_turn_gives_the_reply_its_avatar(client, node, monkeypatch):
    """The page names the agent's avatar on a video turn; the route hands the
    turn's mode and that avatar to the one publisher, which gives the reply
    its live face (HARTOS avatarforcing_tool.add_live_avatar)."""
    _local_llama(monkeypatch)
    _turn(client, 'turn-video-01', 'ta', mode='video', teacher_avatar_id='1000007')
    assert node.faces['turn-video-01'] == {'media_mode': 'video', 'avatar_id': 1000007}


def test_an_audio_turn_names_no_face(client, node, monkeypatch):
    _local_llama(monkeypatch)
    _turn(client, 'turn-audio-01', 'ta', mode='audio')
    assert node.faces['turn-audio-01'] == {'media_mode': 'audio', 'avatar_id': None}
