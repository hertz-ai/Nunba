"""FT unit tests for desktop.file_sync (U9, task #412): Nunba's HTTP door to
HARTOS's one upload service.

Owner ruling A10a (2026-10-14): one upload service.  desktop.file_sync keeps
no storage of its own: the bytes, their record, the size cap, the quota and
retention are core.user_file_store's (purpose 'chat_attachment'), the same
store her phone's clips, logo and song audio reach over the device link.
These tests drive the real module against a real store on a temp root (the
store's own limits made small), plus one test of the default wiring.

The public API keeps its shape -- store / fetch / list_since / delete / usage
-- and the hostile-input guards: path traversal, a page or a program,
quota exhaustion, an oversized file, an empty payload, cross-user isolation.
"""
from __future__ import annotations

import hashlib
import io
import os

import pytest

KB = 1024
PDF = b'%PDF-1.7\n'


@pytest.fixture
def store(tmp_path):
    """HARTOS's store on a temp root, with small chat-attachment limits."""
    from core.user_file_store import UserFileStore
    return UserFileStore(str(tmp_path / 'user_files'),
                         purposes={'chat_attachment': {'max_file': 256 * KB,
                                                       'quota': 1024 * KB}},
                         disk_free=lambda path: 1 << 40)


@pytest.fixture
def file_sync(store, monkeypatch):
    import desktop.file_sync as fs
    monkeypatch.setattr(fs, '_store', lambda: store)
    return fs


def _read(path):
    with open(path, 'rb') as f:
        return f.read()


def test_store_returns_metadata_with_sha256_file_id(file_sync):
    data = PDF + b'hello world'
    meta = file_sync.store('user_a', io.BytesIO(data), name='note.pdf', mime='application/pdf')
    assert meta['size'] == len(data)
    assert meta['sha256'] == hashlib.sha256(data).hexdigest()
    assert meta['file_id'] == meta['sha256']
    assert meta['name'] == 'note.pdf'
    assert meta['mime'] == 'application/pdf'
    assert isinstance(meta['created_at'], int)


def test_store_then_fetch_roundtrip(file_sync):
    data = b'\x89PNG\r\n\x1a\n binary-ish \xff\xfe'
    meta = file_sync.store('user_a', data, name='blob.png', mime='image/png')
    path, got_meta = file_sync.fetch('user_a', meta['file_id'])
    assert _read(path) == data
    assert got_meta['sha256'] == meta['sha256'] and got_meta['mime'] == 'image/png'


def test_the_bytes_live_in_the_one_store_and_nowhere_else(file_sync, store, tmp_path):
    data = PDF + b'plan'
    meta = file_sync.store('user_a', data, name='plan.pdf', mime='application/pdf')

    held = store.resolve('user_a', meta['file_id'])
    assert held.purpose == 'chat_attachment' and _read(held.path) == data
    # On disk: the file and the store's index of it, nothing of this module's.
    user_dir = os.path.dirname(os.path.dirname(held.path))
    stored = sorted(os.path.join(d, f) for d, _, fs in os.walk(str(tmp_path)) for f in fs)
    assert stored == sorted([held.path, os.path.join(user_dir, 'index.json')])


def test_the_default_store_is_hartos_user_file_store_under_the_data_dir(tmp_path,
                                                                         monkeypatch):
    import core.platform_paths as pp
    import core.user_file_store as ufs

    import desktop.file_sync as fs
    monkeypatch.setenv('NUNBA_DATA_DIR', str(tmp_path / 'data'))
    monkeypatch.setattr(pp, '_cached_data_dir', None)
    monkeypatch.setattr(ufs, '_STORE', None)

    meta = fs.store('user_a', PDF + b'default', name='d.pdf', mime='application/pdf')

    held = ufs.get_user_file_store().resolve('user_a', meta['file_id'])
    root = os.path.join(str(tmp_path / 'data'), 'user_files')
    assert os.path.commonpath([root, held.path]) == root
    assert not os.path.exists(tmp_path / 'data' / 'file_sync')


def test_a_pushed_file_can_be_attached_to_a_chat_turn(file_sync, store, monkeypatch):
    from core import chat_attachments
    from integrations.reel_studio.contracts import validate_attachment
    monkeypatch.setattr(chat_attachments, 'get_user_file_store', lambda: store)
    meta = file_sync.store('user_a', PDF + b'quote', name='quote.pdf', mime='application/pdf')
    row = {k: meta[k] for k in ('file_id', 'sha256', 'name', 'mime', 'size')}

    assert validate_attachment(dict(row, purpose='chat_attachment')) == []
    bound = chat_attachments.bind_inbound('user_a', '77', 'req-1',
                                          chat_attachments.parse_inbound([row]))

    assert [b['xid'] for b in bound] == [meta['file_id']]


def test_the_same_content_stored_again_is_one_file(file_sync):
    data = PDF + b'same data same id'
    a = file_sync.store('user_a', data, name='a.pdf', mime='application/pdf')
    b = file_sync.store('user_a', data, name='different-name.pdf', mime='application/pdf')
    assert a['file_id'] == b['file_id']
    # The store's one rule: the same bytes sent again are recorded as sent.
    assert b['name'] == 'different-name.pdf'
    assert file_sync.usage('user_a')['files'] == 1
    assert file_sync.usage('user_a')['bytes'] == len(data)


def test_cross_user_isolation_no_dedup(file_sync):
    """Two users storing the same bytes must each have their own blob --
    cross-user dedup would leak existence-of-file via presence-probe."""
    data = PDF + b'secret plan body bytes'
    meta_a = file_sync.store('user_a', data, name='plan.pdf', mime='application/pdf')
    meta_b = file_sync.store('user_b', data, name='plan.pdf', mime='application/pdf')
    assert meta_a['file_id'] == meta_b['file_id']  # content-addressed
    path_a, _ = file_sync.fetch('user_a', meta_a['file_id'])
    path_b, _ = file_sync.fetch('user_b', meta_b['file_id'])
    assert path_a != path_b and _read(path_a) == _read(path_b) == data
    # Delete one user's copy -- the other's must survive.
    assert file_sync.delete('user_a', meta_a['file_id']) is True
    assert file_sync.fetch('user_a', meta_a['file_id']) == (None, None)
    assert _read(file_sync.fetch('user_b', meta_b['file_id'])[0]) == data


def test_empty_payload_rejected(file_sync):
    with pytest.raises(file_sync.FileRefused) as refused:
        file_sync.store('user_a', b'', name='e.pdf', mime='application/pdf')
    assert refused.value.reason == 'bad_offer'
    assert isinstance(refused.value, ValueError)


@pytest.mark.parametrize('name,mime', [
    ('malicious.exe', 'application/octet-stream'), ('page.html', 'text/html'),
    ('logo.svg', 'image/svg+xml'), ('run.js', 'application/javascript'),
])
def test_a_page_or_a_program_is_refused(file_sync, store, name, mime):
    with pytest.raises(file_sync.FileRefused) as refused:
        file_sync.store('user_a', b'MZ...', name=name, mime=mime)
    assert refused.value.reason == 'bad_mime'
    assert store.usage('user_a') == 0


def test_a_download_name_never_ends_in_a_program(file_sync):
    meta = file_sync.store('user_a', PDF + b'x', name='malicious.exe', mime='application/pdf')
    assert file_sync.fetch('user_a', meta['file_id'])[1]['download_name'] == 'malicious.exe.pdf'
    meta = file_sync.store('user_a', PDF + b'y', name='Plan.PDF', mime='application/pdf')
    assert file_sync.fetch('user_a', meta['file_id'])[1]['download_name'] == 'Plan.PDF'
    meta = file_sync.store('user_a', b'\xff\xd8\xff photo', name='photo.jpeg', mime='image/jpeg')
    assert file_sync.fetch('user_a', meta['file_id'])[1]['download_name'] == 'photo.jpeg'


def test_oversized_file_rejected(file_sync, store):
    # The store's chat-attachment cap is 256 KB in the fixture.  Push 512 KB.
    with pytest.raises(file_sync.FileRefused) as refused:
        file_sync.store('user_a', b'\x00' * (512 * KB), name='big.pdf', mime='application/pdf')
    assert refused.value.reason == 'too_large'
    assert store.usage('user_a') == 0


def test_quota_exhaustion(file_sync):
    # Quota = 1 MB; max file = 256 KB -> 5 files saturate.
    for i in range(4):
        file_sync.store('user_a', (b'\x01' * (250 * KB)) + str(i).encode(),
                        name=f'f{i}.pdf', mime='application/pdf')
    # The 5th would push past 1 MB total.
    with pytest.raises(file_sync.FileRefused) as refused:
        file_sync.store('user_a', (b'\x02' * (200 * KB)) + b'extra', name='last.pdf',
                        mime='application/pdf')
    assert refused.value.reason == 'quota'


def test_path_traversal_file_id_rejected(file_sync):
    """Client-supplied file_ids must be a 64-hex sha256: anything else
    (slashes, dotdot, short strings) is refused."""
    for bad in ('..', '../../etc/passwd', 'short',
                'g' * 64,  # non-hex char
                'a' * 63,  # wrong length
                'A' * 64,  # upper case is not the store's xid
                '/absolute/path', None):
        assert file_sync.fetch('user_a', bad) == (None, None), bad
        assert file_sync.delete('user_a', bad) is False


def test_only_chat_attachments_are_served(file_sync, store):
    """Her clips sent over the device link are in the same store, but this
    door serves, lists and deletes only her chat attachments."""
    clip = b'\x00\x00\x00\x18ftypmp42 clip'
    xid = store.put_file('user_a', clip, name='VID.mp4', mime='video/mp4',
                         purpose='reel_source')['xid']
    assert file_sync.fetch('user_a', xid) == (None, None)
    assert file_sync.delete('user_a', xid) is False
    assert file_sync.list_since('user_a', 0) == []
    assert store.resolve('user_a', xid) is not None


def test_list_since_orders_ascending_and_filters(file_sync):
    meta_1 = file_sync.store('user_a', b'one', name='1.txt', mime='text/plain')
    meta_2 = file_sync.store('user_a', b'two', name='2.txt', mime='text/plain')
    meta_3 = file_sync.store('user_a', b'three', name='3.txt', mime='text/plain')

    listed = file_sync.list_since('user_a', 0)
    assert [m['file_id'] for m in listed] == [m['file_id'] for m in (meta_1, meta_2, meta_3)]

    # Cursor past everything returns empty.
    assert file_sync.list_since('user_a', 2 ** 62) == []
    assert len(file_sync.list_since('user_a', 0, limit=2)) == 2


def test_usage_reports_bytes_files_quota(file_sync):
    file_sync.store('user_a', b'abc', name='a.txt', mime='text/plain')
    file_sync.store('user_a', b'defgh', name='b.txt', mime='text/plain')
    u = file_sync.usage('user_a')
    assert u['files'] == 2
    assert u['bytes'] == 3 + 5
    assert u['quota_bytes'] == 1024 * KB  # the store's chat-attachment quota (fixture)


def test_invalid_user_id_refused(file_sync):
    """Empty and whitespace-only user_ids are refused (the store's rule)."""
    with pytest.raises(ValueError):
        file_sync.store('', b'x', name='y.txt', mime='text/plain')
    with pytest.raises(ValueError):
        file_sync.store('   ', b'x', name='y.txt', mime='text/plain')


@pytest.mark.parametrize('uid', ['../attack', '///', 'a\\..\\b'])
def test_a_user_id_never_becomes_a_path(file_sync, store, tmp_path, uid):
    """Any id is its own user, filed under a hash of it inside the root:
    '../attack' is not 'attack', and nothing is written outside the root."""
    meta = file_sync.store(uid, b'payload', name='z.txt', mime='text/plain')
    path, _ = file_sync.fetch(uid, meta['file_id'])
    assert _read(path) == b'payload'
    assert os.path.commonpath([store.root, path]) == store.root
    assert file_sync.fetch('attack', meta['file_id']) == (None, None)
    for root, _dirs, _files in os.walk(str(tmp_path)):
        assert os.path.realpath(root).startswith(os.path.realpath(str(tmp_path)))


def test_delete_absent_returns_false(file_sync):
    # Valid format but never stored.
    sha = hashlib.sha256(b'never').hexdigest()
    assert file_sync.delete('user_a', sha) is False
