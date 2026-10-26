"""The /api/chat-sync/files/* routes delegate to HARTOS's one upload store.

Owner ruling A10a (2026-10-14): one upload service.  main.py's four
file-sync routes reach core.user_file_store (purpose 'chat_attachment')
through desktop.file_sync and keep no storage of their own.  These drive the
real routes through Flask's test client, with the two boundaries mocked: the
cloud-sync toggle (desktop.chat_settings) and the token resolver
(integrations.social.auth.user_id_for_token).  The store is HARTOS's real
one on a temp root.
"""
import io
import os
import sys
from types import SimpleNamespace
from unittest.mock import patch

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

TOKEN = 't' * 32
USER = '10202'
AUTH = {'Authorization': 'Bearer ' + TOKEN}
PDF = b'%PDF-1.7\n' + b'quote for the bridal package' * 10


@pytest.fixture(scope='module')
def main_mod():
    try:
        import main
    except Exception as e:  # pragma: no cover - import env issue
        pytest.skip(f"Could not import main.py: {e}")
    return main


@pytest.fixture
def store(tmp_path, monkeypatch):
    from core.user_file_store import UserFileStore

    import desktop.file_sync as fs
    store = UserFileStore(str(tmp_path / 'user_files'),
                          purposes={'chat_attachment': {'max_file': 64 * 1024}},
                          disk_free=lambda path: 1 << 40)
    monkeypatch.setattr(fs, '_store', lambda: store)
    return store


@pytest.fixture
def client(main_mod, store):
    settings = SimpleNamespace(cloud_sync_enabled=True)
    with patch('integrations.social.auth.user_id_for_token',
               side_effect=lambda token: USER if token == TOKEN else None), \
            patch('desktop.chat_settings.get_chat_settings', return_value=settings):
        yield main_mod.app.test_client()


def _push(client, data=PDF, name='quote.pdf', mime='application/pdf'):
    return client.post('/api/chat-sync/files/push', headers=AUTH,
                       data={'file': (io.BytesIO(data), name, mime)},
                       content_type='multipart/form-data')


def test_a_pushed_document_is_in_the_one_store_and_comes_back(client, store):
    pushed = _push(client)
    assert pushed.status_code == 200, pushed.get_json()
    meta = pushed.get_json()
    held = store.resolve(USER, meta['file_id'])
    assert held is not None and held.purpose == 'chat_attachment'
    assert (meta['name'], meta['mime'], meta['size']) == ('quote.pdf', 'application/pdf',
                                                          len(PDF))

    pulled = client.get('/api/chat-sync/files/pull?file_id=' + meta['file_id'], headers=AUTH)
    assert pulled.status_code == 200
    assert pulled.data == PDF
    assert pulled.mimetype == 'application/pdf'
    assert pulled.headers.get('X-Content-Type-Options') == 'nosniff'
    pulled.close()

    listed = client.get('/api/chat-sync/files/pull?since=0', headers=AUTH).get_json()
    assert [f['file_id'] for f in listed['files']] == [meta['file_id']]
    usage = client.get('/api/chat-sync/files/usage', headers=AUTH).get_json()
    assert (usage['bytes'], usage['files']) == (len(PDF), 1)

    deleted = client.delete('/api/chat-sync/files/' + meta['file_id'], headers=AUTH)
    assert deleted.get_json() == {'deleted': True}
    assert store.resolve(USER, meta['file_id']) is None
    gone = client.get('/api/chat-sync/files/pull?file_id=' + meta['file_id'], headers=AUTH)
    assert gone.status_code == 404


@pytest.mark.parametrize('data,name,mime,status,reason', [
    (b'<script>alert(1)</script>', 'page.html', 'text/html', 400, 'bad_mime'),
    (b'MZ...', 'setup.exe', 'application/octet-stream', 400, 'bad_mime'),
    (b'', 'empty.pdf', 'application/pdf', 400, 'bad_offer'),
    (b'%PDF' + b'\x00' * (64 * 1024), 'big.pdf', 'application/pdf', 413, 'too_large'),
], ids=['a_page', 'a_program', 'empty', 'past_the_cap'])
def test_a_refused_push_says_why_and_keeps_nothing(client, store, data, name, mime, status,
                                                  reason):
    refused = _push(client, data, name, mime)

    assert refused.status_code == status
    assert refused.get_json()['error'] == reason
    assert store.usage(USER) == 0


def test_a_push_of_her_bound_reel_clip_leaves_her_reel_turn_its_clip(client, store,
                                                                     monkeypatch):
    """Her clip came over the device link and is bound to her reel turn
    (prompt 55).  Pushing the same bytes through the door, then deleting the
    attachment, never takes the clip from that turn."""
    from core import chat_attachments
    monkeypatch.setattr(chat_attachments, 'get_user_file_store', lambda: store)
    clip = b'\x00\x00\x00\x18ftypmp42' + b'her bridal clip' * 20
    xid = store.put_file(USER, clip, name='VID_1.mp4', mime='video/mp4',
                         purpose='reel_source')['xid']
    store.bind(USER, [xid], prompt_id='55', request_id='r1')

    def reel_turn_clips():
        return [f['xid'] for f in chat_attachments.latest_inbound(USER, '55')]

    pushed = _push(client, clip, 'clip.mp4', 'video/mp4')
    assert pushed.status_code == 200, pushed.get_json()
    assert pushed.get_json()['file_id'] == xid
    assert reel_turn_clips() == [xid]

    deleted = client.delete('/api/chat-sync/files/' + xid, headers=AUTH)
    assert deleted.get_json() == {'deleted': True}
    assert reel_turn_clips() == [xid]
    gone = client.get('/api/chat-sync/files/pull?file_id=' + xid, headers=AUTH)
    assert gone.status_code == 404
    assert client.get('/api/chat-sync/files/pull?since=0', headers=AUTH).get_json() == \
        {'files': []}


def test_a_push_names_the_purpose_a_chat_row_echoes(client, store):
    pushed = _push(client)
    assert pushed.status_code == 200, pushed.get_json()
    assert pushed.get_json()['purpose'] == 'chat_attachment'
    listed = client.get('/api/chat-sync/files/pull?since=0', headers=AUTH).get_json()
    assert [f['purpose'] for f in listed['files']] == ['chat_attachment']


def test_a_push_whose_file_went_meanwhile_is_a_conflict(client, store, monkeypatch):
    """A delete raced the push (the record is gone when the door reads it):
    409 with the store's reason, in words, rather than a bare 400."""
    monkeypatch.setattr(store, 'resolve', lambda *a, **k: None)

    refused = _push(client)

    assert refused.status_code == 409
    body = refused.get_json()
    assert body['error'] == 'not_found' and body['message'] != 'not_found'


def test_without_a_token_nothing_is_stored(client, store):
    refused = client.post('/api/chat-sync/files/push',
                          data={'file': (io.BytesIO(PDF), 'quote.pdf', 'application/pdf')},
                          content_type='multipart/form-data')
    assert refused.status_code == 401
    assert store.usage(USER) == 0


MP4 = b'\x00\x00\x00\x18ftypmp42' + b'her look, filmed' * 64


def test_a_push_names_the_purpose_an_ask_asked_for(client, store):
    """The desktop page answering an agent's file_request sends each pick
    with the ask's purpose (HARTOS person_ask), so the clip lands as her reel
    clip, the claim the asking agent reads."""
    pushed = client.post('/api/chat-sync/files/push', headers=AUTH,
                         data={'file': (io.BytesIO(MP4), 'look.mp4', 'video/mp4'),
                               'purpose': 'reel_source'},
                         content_type='multipart/form-data')
    assert pushed.status_code == 200, pushed.get_json()
    meta = pushed.get_json()
    assert meta['purpose'] == 'reel_source'
    assert store.resolve(USER, meta['file_id'], purpose='reel_source') is not None
    assert store.resolve(USER, meta['file_id'], purpose='chat_attachment') is None


def test_a_push_naming_no_store_purpose_is_refused(client, store):
    refused = client.post('/api/chat-sync/files/push', headers=AUTH,
                          data={'file': (io.BytesIO(MP4), 'look.mp4', 'video/mp4'),
                                'purpose': 'reel'},          # the OUTBOX purpose, never sent in
                          content_type='multipart/form-data')
    assert refused.status_code == 400
    assert refused.get_json()['error'] == 'bad_purpose'
    assert store.usage(USER) == 0


@pytest.fixture
def sync_off_client(main_mod, store):
    settings = SimpleNamespace(cloud_sync_enabled=False)
    with patch('integrations.social.auth.user_id_for_token',
               side_effect=lambda token: USER if token == TOKEN else None), \
            patch('desktop.chat_settings.get_chat_settings', return_value=settings):
        yield main_mod.app.test_client()


def test_with_cloud_sync_off_a_chat_attachment_is_still_refused(sync_off_client, store):
    refused = _push(sync_off_client)
    assert refused.status_code == 403 and refused.get_json()['error'] == 'sync_disabled'
    assert store.usage(USER) == 0


def test_with_cloud_sync_off_a_file_for_an_ask_still_reaches_her_agent(sync_off_client, store):
    """Cloud sync is about her chat attachments travelling between devices.
    A file she picks on this desktop for her own agent's ask is stored here,
    for that agent: the switch does not decide it.  Who she is still does."""
    form = lambda: {'file': (io.BytesIO(MP4), 'look.mp4', 'video/mp4'), 'purpose': 'reel_source'}
    pushed = sync_off_client.post('/api/chat-sync/files/push', headers=AUTH, data=form(),
                                  content_type='multipart/form-data')
    assert pushed.status_code == 200, pushed.get_json()
    assert store.resolve(USER, pushed.get_json()['file_id'], purpose='reel_source') is not None
    anonymous = sync_off_client.post('/api/chat-sync/files/push', data=form(),
                                     content_type='multipart/form-data')
    assert anonymous.status_code == 401
