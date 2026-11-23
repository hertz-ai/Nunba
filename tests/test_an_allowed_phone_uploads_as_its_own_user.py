"""A phone the owner allowed uploads, and is heard, as its token's user.

/upload/file, /upload/image and /upload/audio read the user from the form's
user_id and fell back to '0'; /voice/transcribe and /voice/diarize fell back
to ''.  HARTOS's gate (security.middleware) holds any user a phone names to
its token, so a phone could not name another user, but a phone naming none
was filed under '0' or heard as nobody: its book parse, teacher picture,
voice sample and audio events belonged to no one (follow-up to the review of
HARTOS 1b04d59ec).

Now an admitted phone acts as its token's user in these five routes, named
or not, through the one reading of the gate's mark (routes.auth.
admitted_device_user, as /api/vision/frame).  Every caller that is not an
admitted phone is answered exactly as before.

In most tests a before_request hook stands in for the gate, setting what it
sets on a phone it admitted.  TestTheRealGateInFrontOfTheRoutes runs
HARTOS's own gate.

    python -m pytest tests/test_an_allowed_phone_uploads_as_its_own_user.py -q
"""
import io
import json
import os
import sys
import types
import wave

import pytest
from flask import Flask, g

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import routes.chatbot_routes as cr  # noqa: E402
from routes import db_routes, upload_routes  # noqa: E402

pytestmark = pytest.mark.timeout(30)

_PHONE_KEY = '3f9a1c0277deb4e1' + 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6' + 'e7f8091a2b3c4d5e'
_OWNER = '10202'
_OTHER = '20404'
_LAN_PHONE = {'REMOTE_ADDR': '192.168.0.50'}
_THIS_MACHINE = {'REMOTE_ADDR': '127.0.0.1'}


def _wav():
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b'\x00\x00' * 1600)
    return buf.getvalue()


@pytest.fixture
def seen(tmp_path, monkeypatch):
    """This node with its uploads in a temp dir and everything past the
    routes stood in for; returns what each route filed, and for whom."""
    monkeypatch.delenv('NUNBA_CI', raising=False)
    filed = []
    root = tmp_path / 'uploads'
    for attr, sub in (('AVATAR_DIR', 'avatars'), ('AUDIO_DIR', 'audio'),
                      ('FILE_DIR', 'files')):
        (root / sub).mkdir(parents=True)
        monkeypatch.setattr(upload_routes, attr, root / sub)
    monkeypatch.setattr(upload_routes, 'UPLOAD_DIR', root)
    monkeypatch.setattr(
        upload_routes, '_start_book_parse',
        lambda path, user_id, request_id: filed.append(('book', user_id)) or 'job-1')
    monkeypatch.setattr(
        db_routes, 'record_teacher_avatar',
        lambda name, url, user_id, request_id, name_param='':
        filed.append(('avatar', user_id)) or (7, None))
    monkeypatch.setattr(
        db_routes, 'record_voice_sample',
        lambda name, url, user_id, request_id: filed.append(('voice', user_id)) or 9)

    # the voice routes: the recogniser, the diarizer and the event bus
    import integrations.service_tools.whisper_tool as whisper_tool
    import core.platform.events as events
    monkeypatch.setattr(whisper_tool, '_faster_whisper_transcribe',
                        lambda path, language=None: json.dumps(
                            {'text': 'hello there', 'language': 'en'}))
    monkeypatch.setattr(
        events, 'emit_event',
        lambda topic, data, *a, **k: filed.append((topic, data.get('user_id'))))
    monkeypatch.setitem(sys.modules, 'hart_intelligence', types.SimpleNamespace(
        _evaluate_audio_watchers=lambda uid, text: filed.append(('watchers', uid))))

    def _diarized(coroutine):
        coroutine.close()
        return {'no_of_speaker': 2, 'stop_mic': False}
    import asyncio
    monkeypatch.setattr(asyncio, 'run', _diarized)

    def _no_catalog():
        raise RuntimeError('no model catalog in this test')
    monkeypatch.setitem(sys.modules, 'models.orchestrator',
                        types.SimpleNamespace(get_orchestrator=_no_catalog))
    return filed


def _routes(app):
    app.register_blueprint(upload_routes.upload_bp)
    app.route('/voice/transcribe', methods=['POST'])(cr.voice_transcribe)
    app.route('/voice/diarize', methods=['POST'])(cr.voice_diarize)


@pytest.fixture
def setup(seen):
    gate = {}
    app = Flask(__name__)
    app.config['TESTING'] = True

    @app.before_request
    def _hartos_gate_stand_in():
        # What security.middleware._admit_owner_allowed_device sets on a
        # phone it admitted; nothing for any other caller.
        if gate.get('admitted'):
            g.auth_source = 'device'
            g.device_public_key = _PHONE_KEY
            g.jwt_payload = gate.get('payload', {'user_id': _OWNER})

    _routes(app)
    return app.test_client(), gate, seen


# (path, the file part, the file, what it files)
_UPLOADS = [
    ('/upload/file', 'file', (b'%PDF-1.4 a book', 'book.pdf'), 'book'),
    ('/upload/image', 'image', (b'\x89PNG fake', 'face.png'), 'avatar'),
    ('/upload/audio', 'audio', (b'RIFF fake wav', 'voice.wav'), 'voice'),
]
_VOICE = [
    ('/voice/transcribe', ['perception.audio.present', 'watchers']),
    ('/voice/diarize', ['perception.audio.speaker']),
]


def _upload(client, path, part, file, fields=None, environ=None, headers=None):
    body, name = file
    data = {part: (io.BytesIO(body), name), 'request_id': 'req-1', **(fields or {})}
    return client.post(path, data=data, content_type='multipart/form-data',
                       environ_base=environ or _LAN_PHONE, headers=headers or {})


def _speak(client, path, fields=None, environ=None, headers=None):
    return _upload(client, path, 'audio', (_wav(), 'call.wav'),
                   {'source': 'call_stt', **(fields or {})}, environ, headers)


class TestAnAllowedPhoneActsAsItsTokensUser:

    @pytest.mark.parametrize('path, part, file, kind', _UPLOADS)
    @pytest.mark.parametrize('fields', [{}, {'user_id': _OWNER}, {'user_id': ''}])
    def test_its_upload_is_filed_under_its_tokens_user_named_or_not(
            self, setup, path, part, file, kind, fields):
        client, gate, seen = setup
        gate['admitted'] = True
        resp = _upload(client, path, part, file, fields)
        assert resp.status_code == 200, resp.get_data(as_text=True)
        assert seen == [(kind, _OWNER)]

    @pytest.mark.parametrize('path, topics', _VOICE)
    @pytest.mark.parametrize('fields', [{}, {'user_id': _OWNER}, {'user_id': ''}])
    def test_its_audio_is_heard_as_its_tokens_user_named_or_not(
            self, setup, path, topics, fields):
        """The first row is the call audio Android sends (DesktopTranscriber:
        parts audio and source, no user_id)."""
        client, gate, seen = setup
        gate['admitted'] = True
        resp = _speak(client, path, fields)
        assert resp.status_code == 200, resp.get_data(as_text=True)
        assert resp.get_json()['success'] is True
        assert seen == [(topic, _OWNER) for topic in topics]

    def test_what_its_form_names_is_never_read(self, setup):
        """The gate refuses another user's name before any route runs; the
        routes do not lean on that.  Whatever reaches them, a phone's upload
        and audio are its token's user's."""
        client, gate, seen = setup
        gate['admitted'] = True
        for path, part, file, kind in _UPLOADS:
            del seen[:]
            assert _upload(client, path, part, file,
                           {'user_id': _OTHER}).status_code == 200
            assert seen == [(kind, _OWNER)]
        for path, topics in _VOICE:
            del seen[:]
            assert _speak(client, path, {'user_id': _OTHER},
                          headers={'X-User-Id': _OTHER}).status_code == 200
            assert seen == [(topic, _OWNER) for topic in topics]

    @pytest.mark.parametrize('path, part, file, kind', _UPLOADS)
    def test_a_numbered_token_user_is_filed_as_text_like_a_form_value(
            self, setup, path, part, file, kind):
        client, gate, seen = setup
        gate.update(admitted=True, payload={'user_id': 10202})
        assert _upload(client, path, part, file).status_code == 200
        assert seen == [(kind, '10202')]

    @pytest.mark.parametrize('path, part, file, kind', _UPLOADS)
    @pytest.mark.parametrize('payload', [{}, {'user_id': None}, {'user_id': ''}])
    def test_a_phone_whose_token_names_no_user_files_nothing(
            self, setup, path, part, file, kind, payload):
        client, gate, seen = setup
        gate.update(admitted=True, payload=payload)
        resp = _upload(client, path, part, file)
        assert resp.status_code == 401
        assert 'Sign in on the phone' in resp.get_json()['error']   # what to do
        assert seen == []

    @pytest.mark.parametrize('path, topics', _VOICE)
    def test_a_phone_whose_token_names_no_user_is_heard_as_nobody_as_before(
            self, setup, path, topics):
        client, gate, seen = setup
        gate.update(admitted=True, payload={})
        assert _speak(client, path).status_code == 200
        assert seen == [(topics[0], '')]        # no watcher runs for nobody


class TestEveryOtherCallerIsAnsweredAsBefore:
    """Not an admitted phone: the form's user_id, and the old fallbacks."""

    @pytest.mark.parametrize('path, part, file, kind', _UPLOADS)
    @pytest.mark.parametrize('fields, user', [
        ({'user_id': '7'}, '7'), ({}, '0'), ({'user_id': ''}, ''),
        ({'user_id': _OTHER}, _OTHER)])
    def test_this_machines_upload_is_filed_under_the_user_its_form_names(
            self, setup, path, part, file, kind, fields, user):
        client, gate, seen = setup
        resp = _upload(client, path, part, file, fields, environ=_THIS_MACHINE)
        assert resp.status_code == 200, resp.get_data(as_text=True)
        assert seen == [(kind, user)]

    @pytest.mark.parametrize('path, topics', _VOICE)
    def test_this_machines_audio_is_heard_as_the_user_it_names(self, setup, path, topics):
        client, gate, seen = setup
        assert _speak(client, path, {'user_id': '7'}, _THIS_MACHINE).status_code == 200
        assert seen == [(topic, '7') for topic in topics]
        del seen[:]
        assert _speak(client, path, environ=_THIS_MACHINE,
                      headers={'X-User-Id': '8'}).status_code == 200
        assert seen == [(topic, '8') for topic in topics]
        del seen[:]
        assert _speak(client, path, environ=_THIS_MACHINE).status_code == 200
        assert seen == [(topics[0], '')]

    @pytest.mark.parametrize('path, part, file, kind', _UPLOADS)
    def test_a_token_payload_that_is_not_a_phones_changes_nothing(
            self, setup, path, part, file, kind):
        """Only the gate's phone mark counts: a signed-in page's own token
        payload on the request does not make its uploads another user's."""
        client, gate, seen = setup

        @client.application.before_request
        def _a_signed_in_page():
            g.auth_source = 'hevolve'
            g.jwt_payload = {'user_id': _OWNER}
        assert _upload(client, path, part, file, {'user_id': '7'},
                       environ=_THIS_MACHINE).status_code == 200
        assert seen == [(kind, '7')]

    @pytest.mark.parametrize('path, part', [(u[0], u[1]) for u in _UPLOADS])
    def test_an_upload_with_no_file_is_still_its_own_400(self, setup, path, part):
        client, gate, seen = setup
        for admitted in (False, True):
            gate['admitted'] = admitted
            resp = client.post(path, data={'user_id': _OWNER},
                               content_type='multipart/form-data',
                               environ_base=_LAN_PHONE)
            assert resp.status_code == 400 and seen == []


class TestTheRealGateInFrontOfTheRoutes:
    """HARTOS's own gate (security.middleware) before the routes, as on a
    desktop.  Only the token check is stood in for (it needs the owner's
    grant on file): it answers what verify_device_jwt answers for a phone
    the owner allowed."""

    @pytest.fixture
    def gated(self, seen, monkeypatch):
        import contextlib
        from unittest.mock import patch
        import integrations.social.auth as social_auth
        import integrations.social.models as models
        from security.middleware import _apply_api_auth

        monkeypatch.setenv('NUNBA_BUNDLED', '1')
        monkeypatch.setenv('HEVOLVE_NODE_TIER', 'flat')
        monkeypatch.setenv('HEVOLVE_OWNER_USER_ID', _OWNER)
        for name in ('HEVOLVE_API_KEY', 'TRUSTED_PROXY', 'NUNBA_CI'):
            monkeypatch.delenv(name, raising=False)
        monkeypatch.setattr(
            social_auth, 'verify_device_jwt',
            lambda db, token, owner: {'status': 'ok', 'public_key': _PHONE_KEY,
                                      'payload': {'user_id': _OWNER}})

        @contextlib.contextmanager
        def _no_db(*args, **kwargs):
            yield None
        monkeypatch.setattr(models, 'db_session', _no_db)
        app = Flask('gated')
        app.config['TESTING'] = True
        _apply_api_auth(app)
        _routes(app)
        secrets = {'security.secrets_manager': types.SimpleNamespace(
            get_secret=lambda name: '')}
        with patch.dict(sys.modules, secrets):
            yield app.test_client(), seen

    _TOKEN = {'Authorization': 'Bearer a.phone.token'}

    @pytest.mark.parametrize('path, part, file, kind', _UPLOADS)
    def test_the_phones_upload_is_filed_under_its_tokens_user(
            self, gated, path, part, file, kind):
        client, seen = gated
        for fields in ({}, {'user_id': _OWNER}):
            del seen[:]
            resp = _upload(client, path, part, file, fields, headers=self._TOKEN)
            assert resp.status_code == 200, resp.get_data(as_text=True)
            assert seen == [(kind, _OWNER)]

    @pytest.mark.parametrize('path, topics', _VOICE)
    def test_the_phones_call_audio_is_heard_as_its_tokens_user(self, gated, path, topics):
        client, seen = gated
        resp = _speak(client, path, headers=self._TOKEN)
        assert resp.status_code == 200, resp.get_data(as_text=True)
        assert seen == [(topic, _OWNER) for topic in topics]

    @pytest.mark.parametrize('path, part, file, kind', _UPLOADS)
    def test_naming_another_user_is_refused_by_the_gate_and_nothing_is_filed(
            self, gated, path, part, file, kind):
        client, seen = gated
        resp = _upload(client, path, part, file, {'user_id': _OTHER}, headers=self._TOKEN)
        assert resp.status_code == 403
        assert seen == []

    def test_a_caller_the_gate_does_not_know_is_refused_as_before(self, gated):
        client, seen = gated
        path, part, file, _ = _UPLOADS[0]
        assert _upload(client, path, part, file).status_code == 401
        assert seen == []
