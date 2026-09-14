"""A teacher avatar and its voice on this node, kept the way central keeps them.

Android and the desktop's CreateAgentForm upload an avatar image and a voice
recording under ONE request_id: to MakeItTalk /upload_image/ + /upload_audio/
on central, to /upload/image + /upload/audio here.  Central records them in
Hevolve_Database's teacher_avatar and voice_sample tables and links the avatar
to the voice.  HARTOS core/teacher_avatar.lookup_avatar reads them back through
/get_image_by_id and /get_voice_sample_id on get_db_url(), which on the desktop
is this node.  So this node keeps the same two records, links them whichever
upload lands first, and answers the same two reads.

    python -m pytest tests/test_teacher_avatar_records.py -q
"""
import io
import os
import sys

import pytest
from flask import Flask

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from routes import db_routes, upload_routes  # noqa: E402

pytestmark = pytest.mark.timeout(30)


@pytest.fixture
def uploads(tmp_path, monkeypatch):
    """This node with its DB and its uploads in a temp dir; returns the
    uploads root."""
    monkeypatch.setattr(db_routes, 'DB_PATH', tmp_path / 'nunba_db.sqlite')
    db_routes._init_db()
    root = tmp_path / 'uploads'
    for attr, sub in (('AVATAR_DIR', 'avatars'), ('AUDIO_DIR', 'audio')):
        (root / sub).mkdir(parents=True)
        monkeypatch.setattr(upload_routes, attr, root / sub)
    monkeypatch.setattr(upload_routes, 'UPLOAD_DIR', root)
    return root


@pytest.fixture
def client(uploads):
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.register_blueprint(upload_routes.upload_bp)
    db_routes.register_db_routes(app)
    return app.test_client()


def _post_image(client, user_id='7', request_id='req-1'):
    return client.post('/upload/image', data={
        'image': (io.BytesIO(b'\x89PNG fake'), 'face.png'),
        'user_id': user_id, 'request_id': request_id, 'name': 'Spider-Man',
        'vtoonify': 'true'}, content_type='multipart/form-data')


def _upload_image(client, user_id='7', request_id='req-1'):
    resp = _post_image(client, user_id, request_id)
    assert resp.status_code == 200
    return resp.get_json()


def _upload_voice(client, user_id='7', request_id='req-1'):
    resp = client.post('/upload/audio', data={
        'audio': (io.BytesIO(b'RIFF fake wav'), 'voice.wav'),
        'user_id': user_id, 'request_id': request_id},
        content_type='multipart/form-data')
    assert resp.status_code == 200
    return resp.get_json()


def _avatar(client, avatar_id):
    return client.get(f'/get_image_by_id/{avatar_id}').get_json()


def _sql(*statements):
    conn = db_routes._get_db()
    try:
        rows = [conn.execute(s).fetchall() for s in statements]
        conn.commit()
        return rows
    finally:
        conn.close()


# ── the two records and their link ───────────────────────────────────

def test_image_then_voice_speaks_the_avatar_with_that_voice(client):
    """CreateAgentForm's and Android's order: the image first."""
    avatar = _upload_image(client)
    voice = _upload_voice(client)
    row = _avatar(client, avatar['teacher_avatar_id'])
    assert row['image_url'] == avatar['avatar_url']
    assert row['voice_id'] == voice['voice_id']
    sample = client.get(f"/get_voice_sample_id/{row['voice_id']}").get_json()
    assert sample['voice_sample_url'] == voice['audio_url']


def test_voice_then_image_links_too(client):
    """Central's order: its avatar row lands after toonifying."""
    voice = _upload_voice(client)
    avatar = _upload_image(client)
    assert avatar['voice_id'] == voice['voice_id']
    assert _avatar(client, avatar['teacher_avatar_id'])['voice_id'] == voice['voice_id']


def test_a_re_recorded_voice_replaces_the_first(client):
    avatar = _upload_image(client)
    _upload_voice(client)
    second = _upload_voice(client)
    assert _avatar(client, avatar['teacher_avatar_id'])['voice_id'] == second['voice_id']


@pytest.mark.parametrize('image, voice', [
    ({'request_id': ''}, {'request_id': ''}),             # nothing ties them
    ({'user_id': '7'}, {'user_id': '8'}),                 # someone else's upload
    ({'request_id': 'req-1'}, {'request_id': 'req-2'}),   # another upload
])
def test_only_the_same_upload_links(client, image, voice):
    avatar = _upload_image(client, **image)
    _upload_voice(client, **voice)
    assert _avatar(client, avatar['teacher_avatar_id'])['voice_id'] is None


def test_an_unknown_or_retired_avatar_or_voice_reads_null(client):
    assert _avatar(client, 1802) is None          # a central id: not here
    avatar = _upload_image(client)
    voice = _upload_voice(client)
    _sql('UPDATE teacher_avatar SET is_active = 0', 'UPDATE voice_sample SET in_use = 0')
    assert _avatar(client, avatar['teacher_avatar_id']) is None
    assert client.get(f"/get_voice_sample_id/{voice['voice_id']}").get_json() is None


# ── local avatar ids can never be central's ──────────────────────────
# Clients send central avatar ids to this node too, and Android carries the
# id as a Java Integer.

def test_local_avatar_ids_start_at_the_base_and_fit_an_int32(client):
    first = _upload_image(client)['teacher_avatar_id']
    second = _upload_image(client)['teacher_avatar_id']
    assert first == db_routes.LOCAL_AVATAR_ID_BASE
    assert second == first + 1
    assert second < 2 ** 31


def test_the_seed_commits_with_the_table_and_init_restores_a_lost_one(client):
    """_init_db creates the table and seeds its id sequence in ONE
    transaction; run again, it keeps the seed, or puts back a lost one."""
    seed = "SELECT seq FROM sqlite_sequence WHERE name = 'teacher_avatar'"
    assert _sql(seed)[0][0][0] == db_routes.LOCAL_AVATAR_ID_BASE - 1
    db_routes._init_db()
    assert _sql(seed)[0][0][0] == db_routes.LOCAL_AVATAR_ID_BASE - 1
    _sql("DELETE FROM sqlite_sequence WHERE name = 'teacher_avatar'")
    db_routes._init_db()
    assert _upload_image(client)['teacher_avatar_id'] == db_routes.LOCAL_AVATAR_ID_BASE


def test_an_id_below_the_base_is_refused_not_issued(client):
    """Should the sequence lose its seed with no init to restore it, the next
    avatar would get a small id, which can be central's.  The upload fails
    instead, and no row is kept."""
    _sql("DELETE FROM sqlite_sequence WHERE name = 'teacher_avatar'")
    assert _post_image(client).status_code == 500
    assert _sql('SELECT COUNT(*) FROM teacher_avatar')[0][0][0] == 0


# ── the upload replies ───────────────────────────────────────────────

def test_the_replies_keep_their_keys_and_add_the_ids(client):
    avatar = _upload_image(client)
    assert {'response', 'avatar_url', 'file_name', 'request_id',
            'teacher_avatar_id', 'voice_id'} <= set(avatar)
    voice = _upload_voice(client)
    assert {'response', 'audio_url', 'file_name', 'request_id',
            'voice_sample_url', 'voice_id'} <= set(voice)
    # Android's AudioResponse counts an upload without it as failed
    assert voice['voice_sample_url'].startswith('/uploads/audio/')
    assert voice['voice_sample_url'] == voice['audio_url']


@pytest.mark.parametrize('path, field, filename, record', [
    ('/upload/image', 'image', 'f.png', 'record_teacher_avatar'),
    ('/upload/audio', 'audio', 'f.wav', 'record_voice_sample'),
])
def test_an_upload_that_cannot_be_recorded_fails(client, monkeypatch, path, field,
                                                  filename, record):
    """As MakeItTalk does: a 200 would hand back something no chat can name."""
    def broken(*args, **kwargs):
        raise RuntimeError('database is locked: C:\\secret\\nunba_db.sqlite')

    monkeypatch.setattr(db_routes, record, broken)
    resp = client.post(path, data={field: (io.BytesIO(b'x'), filename),
                                   'user_id': '7', 'request_id': 'r'},
                       content_type='multipart/form-data')
    assert resp.status_code == 500
    assert 'secret' not in resp.get_data(as_text=True)


# ── what HARTOS reads ────────────────────────────────────────────────

def test_hartos_speaks_the_avatar_with_its_uploaded_recording(client, uploads, monkeypatch):
    """core/teacher_avatar.lookup_avatar reads /get_image_by_id and
    /get_voice_sample_id on get_db_url() (this node on the desktop), and
    voice_reference turns the recording's /uploads/ URL into the saved file a
    cloning TTS engine is handed."""
    teacher_avatar = pytest.importorskip('core.teacher_avatar')
    book_pipeline = pytest.importorskip('integrations.learning.book_pipeline')
    import core.config_cache as config_cache

    avatar = _upload_image(client)
    voice = _upload_voice(client)

    class _Reply:
        def __init__(self, resp):
            self._resp = resp

        def json(self):
            return self._resp.get_json()

    node = 'http://node.test'
    monkeypatch.setattr(teacher_avatar, 'pooled_get',
                        lambda url, *a, **kw: _Reply(client.get(url[len(node):])))
    monkeypatch.setattr(config_cache, 'get_db_url', lambda: node)
    monkeypatch.setattr(book_pipeline, 'uploads_dir', lambda: uploads)

    found = teacher_avatar.lookup_avatar(avatar['teacher_avatar_id'])
    assert found['image_url'] == avatar['avatar_url']
    assert found['voice_id'] == voice['voice_id']
    assert found['audio_sample_url'] == voice['audio_url']
    assert teacher_avatar.voice_reference(avatar['teacher_avatar_id']) == str(
        (uploads / 'audio' / voice['file_name']).resolve())
