"""GET /avatar/live/<sid>.mp4 -- the node serves a reply's live talking-avatar stream.

HARTOS's add_live_avatar puts this path in a reply's TTS bundle (the page's
generated_video_url, a phone's video_link.video).  The model's sidecar listens on
loopback only, so main.py relays it.  Pinned here: the stream is relayed chunk by
chunk as the sidecar sends it, only a session id reaches the sidecar, a stopped
model answers 503 (the page then plays the reply's audio), the upstream
connection is closed once the relay ends, and DELETE (the page leaving a reply)
is what stops the generation -- a relayed viewer that disconnects is not always
seen here (Hypercorn keeps accepting writes), so the page says it.
"""
import os
import sys

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


@pytest.fixture(scope='module')
def app_client():
    try:
        from main import app
    except Exception as e:
        pytest.skip(f"Flask app not available: {e}")
    app.config['TESTING'] = True
    with app.test_client() as c:
        yield c


class _Upstream:
    def __init__(self, status=200, chunks=(b'moov', b'frag1', b'frag2')):
        self.status_code, self.chunks, self.closed = status, list(chunks), False

    def iter_content(self, chunk_size=None):
        yield from self.chunks

    def close(self):
        self.closed = True


@pytest.fixture
def sidecar(monkeypatch):
    from integrations.service_tools import avatarforcing_tool

    import main
    seen = {}

    def get(url, params=None, stream=False, timeout=None):
        seen.update(url=url, params=params, stream=stream)
        return seen.setdefault('upstream', _Upstream())
    monkeypatch.setattr(avatarforcing_tool, 'sidecar_port', lambda: 4321)
    monkeypatch.setattr(main.requests, 'get', get)
    return seen


def test_relays_the_sidecars_stream(app_client, sidecar):
    r = app_client.get('/avatar/live/abcdef012345.mp4')
    assert r.status_code == 200
    assert r.mimetype == 'video/mp4'
    assert r.headers['Cache-Control'] == 'no-cache, no-store'
    assert r.data == b'moovfrag1frag2'
    assert sidecar['url'] == 'http://127.0.0.1:4321/live.mp4'
    assert sidecar['params'] == {'sid': 'abcdef012345'}
    assert sidecar['stream'] is True
    assert sidecar['upstream'].closed  # the relay let go of the sidecar's stream


@pytest.mark.parametrize('sid', ['ABCDEF012345', 'abc', 'abcdef0123456', 'abcdef01234g'])
def test_only_a_session_id_reaches_the_sidecar(app_client, sidecar, sid):
    r = app_client.get(f'/avatar/live/{sid}.mp4')
    assert r.status_code == 404
    assert 'url' not in sidecar


def test_a_path_climbing_out_never_reaches_the_sidecar(app_client, sidecar):
    # the encoded slashes are normalized away before routing, so this is some
    # other page (the SPA's catch-all), never a stream
    r = app_client.get('/avatar/live/..%2f..%2fx.mp4')
    assert r.mimetype != 'video/mp4'
    assert 'url' not in sidecar


def test_model_not_running_is_503(app_client, monkeypatch):
    from integrations.service_tools import avatarforcing_tool
    monkeypatch.setattr(avatarforcing_tool, 'sidecar_port', lambda: None)
    r = app_client.get('/avatar/live/abcdef012345.mp4')
    assert r.status_code == 503


def test_unknown_session_passes_the_sidecars_404(app_client, monkeypatch):
    from integrations.service_tools import avatarforcing_tool

    import main
    up = _Upstream(status=404)
    monkeypatch.setattr(avatarforcing_tool, 'sidecar_port', lambda: 4321)
    monkeypatch.setattr(main.requests, 'get', lambda *a, **k: up)
    r = app_client.get('/avatar/live/abcdef012345.mp4')
    assert r.status_code == 404
    assert up.closed


def test_sidecar_unreachable_is_502(app_client, monkeypatch):
    import requests
    from integrations.service_tools import avatarforcing_tool

    import main

    def refuse(*a, **k):
        raise requests.ConnectionError('refused')
    monkeypatch.setattr(avatarforcing_tool, 'sidecar_port', lambda: 4321)
    monkeypatch.setattr(main.requests, 'get', refuse)
    assert app_client.get('/avatar/live/abcdef012345.mp4').status_code == 502


def test_another_machine_without_a_credential_is_refused(app_client, sidecar):
    r = app_client.get('/avatar/live/abcdef012345.mp4',
                       environ_base={'REMOTE_ADDR': '192.168.0.77'})
    assert r.status_code in (401, 403)
    assert 'url' not in sidecar


def test_delete_tells_the_sidecar_to_stop(app_client, monkeypatch):
    """The page leaving a reply stops its generation: Hypercorn never reports a relayed
    viewer that left, so the page says it (liveAvatar.stop -> DELETE)."""
    from integrations.service_tools import avatarforcing_tool

    import main
    sent = {}

    class _Ok:
        status_code = 200

    def delete(url, params=None, json=None, timeout=None):
        sent.update(url=url, params=params, json=json)
        return _Ok()
    monkeypatch.setattr(avatarforcing_tool, 'sidecar_port', lambda: 4321)
    monkeypatch.setattr(main.requests, 'delete', delete)
    r = app_client.delete('/avatar/live/abcdef012345.mp4')
    assert r.status_code == 200 and r.get_json() == {'stopped': True}
    assert sent == {'url': 'http://127.0.0.1:4321/live.mp4', 'params': {'sid': 'abcdef012345'}, 'json': {}}


def test_delete_of_a_bad_sid_never_reaches_the_sidecar(app_client, monkeypatch):
    import main
    monkeypatch.setattr(main.requests, 'delete', lambda *a, **k: pytest.fail('reached the sidecar'))
    assert app_client.delete('/avatar/live/ABC.mp4').status_code == 404


# ── whose stream it is: an allowed phone watches or stops only its user's streams ──

PHONE = {'REMOTE_ADDR': '192.168.0.77'}


@pytest.fixture
def phone_of(monkeypatch):
    """The request is a phone the owner allowed, whose token names this user: marked the way
    HARTOS's API gate (security.middleware._admit_owner_allowed_device) marks one -- the same
    mark tests/test_a_large_phone_frame_is_shrunk.py sets -- in place of main's before-request
    handlers for this test, so the route's own check (routes.auth.admitted_device_user) runs
    unpatched."""
    from flask import g

    import main

    def as_user(user):
        def _admitted_phone():
            g.auth_source = 'device'
            g.device_public_key = 'phone-key-under-test'
            g.jwt_payload = {'user_id': user}
        monkeypatch.setitem(main.app.before_request_funcs, None, [_admitted_phone])
    return as_user


@pytest.fixture
def owned_by(monkeypatch):
    from integrations.service_tools import avatarforcing_tool

    def owner(user):
        monkeypatch.setattr(avatarforcing_tool, 'stream_owner', lambda sid: user)
    return owner


def test_a_phone_watches_its_own_users_stream(app_client, sidecar, phone_of, owned_by):
    phone_of('42')
    owned_by('42')
    r = app_client.get('/avatar/live/abcdef012345.mp4', environ_base=PHONE)
    assert r.status_code == 200 and r.data == b'moovfrag1frag2'


@pytest.mark.parametrize('owner', ['43', None])
def test_another_users_stream_is_answered_like_none(app_client, sidecar, phone_of, owned_by, owner):
    """A shared node's other user (or a stream whose user is unknown): 404, as for a sid that
    does not exist, and the sidecar is never asked."""
    phone_of('42')
    owned_by(owner)
    r = app_client.get('/avatar/live/abcdef012345.mp4', environ_base=PHONE)
    r.get_data()  # a relayed stream holds its request context until read
    assert r.status_code == 404
    assert 'url' not in sidecar


def test_a_phone_cannot_stop_another_users_stream(app_client, monkeypatch, phone_of, owned_by):
    from integrations.service_tools import avatarforcing_tool

    import main
    monkeypatch.setattr(avatarforcing_tool, 'sidecar_port', lambda: 4321)
    reached = []

    class _Ok:
        status_code = 200
    monkeypatch.setattr(main.requests, 'delete', lambda *a, **k: reached.append(a) or _Ok())
    phone_of('42')
    owned_by('43')
    assert app_client.delete('/avatar/live/abcdef012345.mp4', environ_base=PHONE).status_code == 404
    assert reached == [], 'another user\'s stop reached the sidecar'


def test_this_machine_watches_any_stream(app_client, sidecar, owned_by):
    owned_by('43')
    r = app_client.get('/avatar/live/abcdef012345.mp4')
    assert r.get_data() == b'moovfrag1frag2' and r.status_code == 200


# ── a reply's face kept after its live session: its replay (owner 2026-11-26) ────────────────

@pytest.fixture
def stored(monkeypatch, tmp_path):
    """HARTOS's one spoken-media reader finds this reply's kept face (core.spoken_media)."""
    import core.spoken_media as sm
    kept = tmp_path / 'abcdef012345.mp4'
    kept.write_bytes(b'kept-face')
    asked = []

    def find(name, *, kind):
        asked.append((name, kind))
        return kept if name == 'abcdef012345.mp4' else None
    monkeypatch.setattr(sm, 'find_spoken_media', find)
    return asked


def test_a_gone_session_replays_its_kept_face(app_client, monkeypatch, stored):
    from integrations.service_tools import avatarforcing_tool

    import main
    up = _Upstream(status=404)
    monkeypatch.setattr(avatarforcing_tool, 'sidecar_port', lambda: 4321)
    monkeypatch.setattr(main.requests, 'get', lambda *a, **k: up)
    r = app_client.get('/avatar/live/abcdef012345.mp4')
    assert r.status_code == 200 and r.mimetype == 'video/mp4'
    assert r.get_data() == b'kept-face'
    assert up.closed and stored == [('abcdef012345.mp4', 'video')]


def test_a_stopped_model_still_replays_a_kept_face(app_client, monkeypatch, stored):
    from integrations.service_tools import avatarforcing_tool
    monkeypatch.setattr(avatarforcing_tool, 'sidecar_port', lambda: None)
    r = app_client.get('/avatar/live/abcdef012345.mp4')
    assert r.status_code == 200 and r.get_data() == b'kept-face'


def test_with_nothing_kept_the_answers_are_as_before(app_client, monkeypatch):
    import core.spoken_media as sm
    from integrations.service_tools import avatarforcing_tool
    monkeypatch.setattr(sm, 'find_spoken_media', lambda name, *, kind: None)
    monkeypatch.setattr(avatarforcing_tool, 'sidecar_port', lambda: None)
    assert app_client.get('/avatar/live/abcdef012345.mp4').status_code == 503


def test_a_kept_face_is_never_replayed_by_delete(app_client, monkeypatch, stored):
    from integrations.service_tools import avatarforcing_tool

    import main
    monkeypatch.setattr(avatarforcing_tool, 'sidecar_port', lambda: None)
    monkeypatch.setattr(main.requests, 'delete', lambda *a, **k: pytest.fail('reached the sidecar'))
    assert app_client.delete('/avatar/live/abcdef012345.mp4').status_code == 503
    assert stored == []


@pytest.mark.parametrize('owner', ['43', None])
def test_another_users_kept_face_is_answered_like_none(app_client, monkeypatch, stored, phone_of,
                                                       owned_by, owner):
    from integrations.service_tools import avatarforcing_tool
    monkeypatch.setattr(avatarforcing_tool, 'sidecar_port', lambda: None)
    phone_of('42')
    owned_by(owner)
    r = app_client.get('/avatar/live/abcdef012345.mp4', environ_base=PHONE)
    r.get_data()
    assert r.status_code == 404 and stored == []
