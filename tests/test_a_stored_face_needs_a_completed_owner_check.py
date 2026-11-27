"""A kept (stored) face is served only after the owner check COMPLETED (review rv_lowvram P1, 27 Nov).

The owner check sat in a try whose except only logged and set no port; the stored-face fallback then
served the kept file.  A phone of user 42, with the owner lookup raising and the sidecar down, got
user 43's kept face.  A check that does not complete now clears nothing: 404, as for a stream that
does not exist.  These are rv_lowvram's probes, kept as the regression tests.
"""
import os
import sys

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

PHONE = {'REMOTE_ADDR': '192.168.0.77'}


@pytest.fixture(scope='module')
def app_client():
    try:
        from main import app
    except Exception as e:
        pytest.skip(f"Flask app not available: {e}")
    app.config['TESTING'] = True
    with app.test_client() as c:
        yield c


@pytest.fixture
def phone_42(monkeypatch):
    import main
    from flask import g

    def _admitted_phone():
        g.auth_source = 'device'
        g.device_public_key = 'phone-key-under-test'
        g.jwt_payload = {'user_id': '42'}
    monkeypatch.setitem(main.app.before_request_funcs, None, [_admitted_phone])


@pytest.fixture
def kept_face(monkeypatch, tmp_path):
    import core.spoken_media as sm
    kept = tmp_path / 'abcdef012345.mp4'
    kept.write_bytes(b'user-43-kept-face')
    monkeypatch.setattr(sm, 'find_spoken_media',
                        lambda name, *, kind: kept if name == 'abcdef012345.mp4' else None)
    return kept


def test_an_owner_lookup_that_raises_never_serves_a_kept_face(app_client, monkeypatch, phone_42,
                                                              kept_face):
    from integrations.service_tools import avatarforcing_tool

    def boom(sid):
        raise RuntimeError('owner store unavailable')
    monkeypatch.setattr(avatarforcing_tool, 'stream_owner', boom)
    monkeypatch.setattr(avatarforcing_tool, 'sidecar_port', lambda: None)
    r = app_client.get('/avatar/live/abcdef012345.mp4', environ_base=PHONE)
    assert r.status_code == 404 and b'user-43' not in r.get_data()


def test_a_device_lookup_that_raises_never_serves_a_kept_face(app_client, monkeypatch, phone_42,
                                                              kept_face):
    from integrations.service_tools import avatarforcing_tool
    import routes.auth as auth

    def boom():
        raise RuntimeError('device table locked')
    monkeypatch.setattr(auth, 'admitted_device_user', boom)
    monkeypatch.setattr(avatarforcing_tool, 'stream_owner', lambda sid: '43')
    monkeypatch.setattr(avatarforcing_tool, 'sidecar_port', lambda: 4321)
    # The route's gate (require_local_token_or_device) asks the same lookup first, so the request
    # fails closed there: either it raises (the test app propagates) or it answers without the face.
    try:
        r = app_client.get('/avatar/live/abcdef012345.mp4', environ_base=PHONE)
    except RuntimeError:
        return
    assert r.status_code != 200 and b'user-43' not in r.get_data()


def test_a_completed_check_with_the_model_gone_still_replays_the_owners_face(app_client, monkeypatch,
                                                                            phone_42, kept_face):
    """The fix keeps the replay: the owner (user 42) gets their own kept face after the model left."""
    from integrations.service_tools import avatarforcing_tool
    monkeypatch.setattr(avatarforcing_tool, 'stream_owner', lambda sid: '42')
    monkeypatch.setattr(avatarforcing_tool, 'sidecar_port', lambda: None)
    r = app_client.get('/avatar/live/abcdef012345.mp4', environ_base=PHONE)
    assert r.status_code == 200 and r.get_data() == b'user-43-kept-face'
