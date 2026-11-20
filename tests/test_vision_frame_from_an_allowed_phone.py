"""A phone the owner allowed can send its camera frames to the desktop.

MEASURED 2026-11-10: a phone posting a frame to the desktop's
/api/vision/frame got 401.  HARTOS's API gate (security.middleware) had
admitted it (the owner's device_access grant, #111) and marked the request
g.auth_source == 'device'; the route's own guard, require_local_or_token,
then refused it because a phone is neither this machine nor the local token.
So the agent on the desktop never saw the child the phone was pointed at.

The fix lets that phone in at the route too, and only as its token's user:
the gate holds a JSON body's user_id to the token (#51), and this body is a
JPEG, so the route holds the query's user_id to it.  Every other caller is
judged exactly as before.

The gate itself is HARTOS's and has its own tests; here a before_request
hook stands in for it, setting what it sets on an admitted phone.
"""
import os
import sys

import pytest
from flask import Flask, g

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import routes.chatbot_routes as cr  # noqa: E402

pytestmark = pytest.mark.timeout(30)

# A phone's Ed25519 public key as the gate sets it (64 hex), and how the
# owner's trusted-phones list shows it (HARTOS consent_service.device_fingerprint).
_PHONE_KEY = '3f9a1c0277deb4e1' + 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6' + 'e7f8091a2b3c4d5e'
_PHONE_PRINT = '3f9a 1c02 77de b4e1'
_OWNER = '10202'
_OTHER = '20404'
_JPEG = b'\xff\xd8\xff\xe0' + b'frame' * 40 + b'\xff\xd9'
_LAN_PHONE = {'REMOTE_ADDR': '192.168.0.50'}
_RELAYED_PHONE = {'REMOTE_ADDR': 'peerlink-device/peer-abc'}
_THIS_MACHINE = {'REMOTE_ADDR': '127.0.0.1'}


class _Store:
    def __init__(self):
        self.frames = []

    def put_frame(self, user_id, frame, source=None):
        self.frames.append(('camera', user_id, frame, source))

    def put_screen_frame(self, user_id, frame, source=None):
        self.frames.append(('screen', user_id, frame, source))


class _Service:
    def __init__(self):
        self.store = _Store()


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.delenv('NUNBA_CI', raising=False)
    svc = _Service()
    monkeypatch.setattr(cr, '_get_vision_service', lambda: svc)
    gate = {}
    app = Flask(__name__)
    app.config['TESTING'] = True

    @app.before_request
    def _hartos_gate_stand_in():
        # What security.middleware._admit_owner_allowed_device sets on a
        # phone it admitted; nothing for any other caller.
        if gate.get('admitted'):
            g.auth_source = gate.get('auth_source', 'device')
            g.device_public_key = gate.get('key', _PHONE_KEY)
            g.jwt_payload = gate.get('payload', {'user_id': _OWNER})

    cr.register_routes(app)
    return app.test_client(), gate, svc.store


def _post(client, query='', environ=None, headers=None):
    return client.post(f'/api/vision/frame{query}', data=_JPEG,
                       content_type='image/jpeg', headers=headers or {},
                       environ_base=environ or _LAN_PHONE)


class TestAnAllowedPhoneIsLetIn:

    def test_its_frame_is_kept_under_its_tokens_user(self, setup):
        client, gate, store = setup
        gate['admitted'] = True
        resp = _post(client, '?channel=camera')
        assert resp.status_code == 204, resp.get_data(as_text=True)
        assert [f[:3] for f in store.frames] == [('camera', _OWNER, _JPEG)]

    def test_the_frame_says_which_phone_sent_it(self, setup):
        client, gate, store = setup
        gate['admitted'] = True
        _post(client)
        assert store.frames[0][3] == f'device:{_PHONE_PRINT}'

    def test_naming_its_own_user_is_fine(self, setup):
        client, gate, store = setup
        gate['admitted'] = True
        resp = _post(client, f'?user_id={_OWNER}&channel=camera')
        assert resp.status_code == 204
        assert store.frames[0][1] == _OWNER

    def test_over_the_relay_too(self, setup):
        client, gate, store = setup
        gate['admitted'] = True
        resp = _post(client, environ=_RELAYED_PHONE)
        assert resp.status_code == 204
        assert store.frames[0][1] == _OWNER

    def test_a_screen_frame_goes_to_the_screen_store(self, setup):
        client, gate, store = setup
        gate['admitted'] = True
        resp = _post(client, '?channel=screen')
        assert resp.status_code == 204
        assert [f[:2] for f in store.frames] == [('screen', _OWNER)]


class TestAnAllowedPhoneActsOnlyAsItsUser:

    def test_naming_another_user_in_the_query_is_refused(self, setup):
        client, gate, store = setup
        gate['admitted'] = True
        resp = _post(client, f'?user_id={_OTHER}')
        assert resp.status_code == 403
        assert 'drop user_id' in resp.get_json()['error']      # says what to do
        assert store.frames == []

    def test_naming_another_user_in_the_header_is_refused(self, setup):
        client, gate, store = setup
        gate['admitted'] = True
        resp = _post(client, headers={'X-User-Id': _OTHER})
        assert resp.status_code == 403
        assert store.frames == []

    def test_a_token_naming_no_user_is_not_let_in(self, setup):
        client, gate, store = setup
        gate.update(admitted=True, payload={})
        resp = _post(client)
        assert resp.status_code == 401
        assert 'names no user' in resp.get_json()['message']  # not "invalid token"
        assert store.frames == []

    def test_a_device_mark_without_the_phones_key_is_not_let_in(self, setup):
        client, gate, store = setup
        gate.update(admitted=True, key='')
        resp = _post(client, f'?user_id={_OWNER}')
        assert resp.status_code == 401
        assert store.frames == []

    def test_another_kind_of_admission_is_not_a_phone(self, setup):
        client, gate, store = setup
        gate.update(admitted=True, auth_source='jwt')
        resp = _post(client, f'?user_id={_OWNER}')
        assert resp.status_code == 401
        assert store.frames == []


class TestEveryOtherCallerAsBefore:

    def test_a_caller_from_the_network_the_gate_did_not_admit_is_refused(self, setup):
        client, _, store = setup
        resp = _post(client, f'?user_id={_OWNER}')
        assert resp.status_code == 401
        assert store.frames == []

    def test_this_machines_page_keeps_its_user_and_address(self, setup):
        client, _, store = setup
        resp = _post(client, f'?user_id={_OTHER}&channel=camera', environ=_THIS_MACHINE)
        assert resp.status_code == 204
        assert store.frames == [('camera', _OTHER, _JPEG, 'http:127.0.0.1')]

    def test_this_machines_page_may_name_its_user_in_the_header(self, setup):
        client, _, store = setup
        resp = _post(client, headers={'X-User-Id': _OTHER}, environ=_THIS_MACHINE)
        assert resp.status_code == 204
        assert store.frames[0][1] == _OTHER

    def test_this_machine_with_no_user_is_anon_as_before(self, setup):
        client, _, store = setup
        resp = _post(client, environ=_THIS_MACHINE)
        assert resp.status_code == 204
        assert store.frames[0][1] == 'anon'


class TestTheRealStoreAndTheDispatcher:
    """Review of 14394fa1: the stand-in store took any signature, so it could
    not catch HARTOS's put_frame lacking ``source`` (every frame 500ed against
    a HARTOS without a7d79664d); and the in-process dispatcher kept its own
    reading of the phone admission."""

    def test_the_real_frame_store_keeps_the_phones_frame_and_who_sent_it(self, setup, monkeypatch):
        import core.ai_sensing as ai_sensing
        from integrations.vision.frame_store import FrameStore
        monkeypatch.setattr(ai_sensing, 'allowed', lambda sensor: True)
        client, gate, _ = setup
        real = FrameStore()
        monkeypatch.setattr(cr, '_get_vision_service',
                            lambda: type('Svc', (), {'store': real})())
        gate['admitted'] = True
        resp = _post(client, '?channel=camera')
        assert resp.status_code == 204, resp.get_data(as_text=True)
        assert real.latest(_OWNER, 'camera') == (_JPEG, f'device:{_PHONE_PRINT}')

    def test_the_dispatcher_admits_the_phone_by_the_same_reading_without_a_user(
            self, monkeypatch):
        """The dispatcher forwards the token and HARTOS binds the user, so a
        phone whose token names no user reaches it (here: HARTOS is not
        loaded, 503); the frame route, which acts for a person, says the
        token names no user; a caller the gate did not admit gets neither."""
        import routes.hartos_backend_adapter as hba
        monkeypatch.delenv('NUNBA_CI', raising=False)
        monkeypatch.setattr(hba, '_hartos_backend_available', False)
        monkeypatch.setattr(cr, '_get_vision_service', lambda: _Service())
        gate = {}
        app = Flask('dispatch')
        app.config['TESTING'] = True

        @app.before_request
        def _hartos_gate_stand_in():
            if gate.get('admitted'):
                g.auth_source = 'device'
                g.device_public_key = _PHONE_KEY
                g.jwt_payload = {}

        app.register_blueprint(hba.create_inprocess_dispatch_blueprint())
        cr.register_routes(app)
        client = app.test_client()
        gate['admitted'] = True
        reached = client.post('/time_agent', json={}, environ_base=_LAN_PHONE)
        assert reached.status_code == 503
        assert reached.get_json()['status'] == 'backend_unavailable'
        frame = _post(client)
        assert frame.status_code == 401 and 'names no user' in frame.get_json()['message']
        gate['admitted'] = False
        refused = client.post('/time_agent', json={}, environ_base=_LAN_PHONE)
        assert refused.status_code in (401, 403)
