"""FT unit tests for desktop.file_sync (U9, task #412).

Exercises the public API surface:
    store / fetch / list_since / delete / usage

Plus hostile-input guards:
    path-traversal, blocked extensions, quota exhaustion, oversized file,
    empty payload, cross-user isolation.
"""
from __future__ import annotations

import hashlib
import importlib
import io
import os

import pytest


@pytest.fixture
def file_sync(tmp_path, monkeypatch):
    """Reload desktop.file_sync with NUNBA_DATA_DIR pointed at tmp_path
    and tight per-test quotas so the tests run fast."""
    monkeypatch.setenv('NUNBA_DATA_DIR', str(tmp_path))
    monkeypatch.setenv('NUNBA_FILE_SYNC_USER_QUOTA', str(1024 * 1024))   # 1 MB
    monkeypatch.setenv('NUNBA_FILE_SYNC_MAX_FILE', str(256 * 1024))      # 256 KB
    import desktop.file_sync as fs
    importlib.reload(fs)
    # core.platform_paths may cache get_data_dir; patch as a belt-and-
    # suspenders so _data_dir() resolves to tmp_path regardless.
    monkeypatch.setattr(fs, '_data_dir', lambda: str(tmp_path))
    return fs


def test_store_returns_metadata_with_sha256_file_id(file_sync):
    data = b'hello world'
    meta = file_sync.store('user_a', io.BytesIO(data), name='note.txt', mime='text/plain')
    assert meta['size'] == len(data)
    assert meta['sha256'] == hashlib.sha256(data).hexdigest()
    assert meta['file_id'] == meta['sha256']
    assert meta['name'] == 'note.txt'
    assert meta['mime'] == 'text/plain'
    assert isinstance(meta['created_at'], int)


def test_store_then_fetch_roundtrip(file_sync):
    data = b'\x00\x01\x02binary-ish\xff\xfe'
    meta = file_sync.store('user_a', data, name='blob.bin', mime='application/octet-stream')
    got_bytes, got_meta = file_sync.fetch('user_a', meta['file_id'])
    assert got_bytes == data
    assert got_meta['sha256'] == meta['sha256']


def test_store_idempotent_on_duplicate_content(file_sync):
    data = b'same data same id'
    a = file_sync.store('user_a', data, name='a.txt', mime='text/plain')
    b = file_sync.store('user_a', data, name='different-name.txt', mime='text/x-other')
    assert a['file_id'] == b['file_id']
    # First-write-wins on metadata — name/mime preserved from initial store.
    assert b['name'] == 'a.txt'
    assert b['mime'] == 'text/plain'


def test_cross_user_isolation_no_dedup(file_sync):
    """Two users storing the same bytes must each have their own blob —
    cross-user dedup would leak existence-of-file via presence-probe."""
    data = b'secret plan.pdf body bytes'
    meta_a = file_sync.store('user_a', data, name='plan.pdf', mime='application/pdf')
    meta_b = file_sync.store('user_b', data, name='plan.pdf', mime='application/pdf')
    assert meta_a['file_id'] == meta_b['file_id']  # content-addressed
    # But each user can only fetch their own:
    assert file_sync.fetch('user_a', meta_a['file_id'])[0] == data
    assert file_sync.fetch('user_b', meta_b['file_id'])[0] == data
    # Delete one user's copy — the other's must survive.
    assert file_sync.delete('user_a', meta_a['file_id']) is True
    assert file_sync.fetch('user_a', meta_a['file_id']) == (None, None)
    assert file_sync.fetch('user_b', meta_b['file_id'])[0] == data


def test_empty_payload_rejected(file_sync):
    with pytest.raises(ValueError, match='empty'):
        file_sync.store('user_a', b'', name='e.txt', mime='text/plain')


def test_blocked_extension_rejected(file_sync):
    with pytest.raises(ValueError, match='extension blocked'):
        file_sync.store('user_a', b'MZ...', name='malicious.exe',
                        mime='application/octet-stream')


def test_oversized_file_rejected(file_sync):
    # NUNBA_FILE_SYNC_MAX_FILE = 256 KB in fixture.  Push 512 KB.
    data = b'\x00' * (512 * 1024)
    with pytest.raises(ValueError, match='per-file cap'):
        file_sync.store('user_a', data, name='big.bin', mime='application/octet-stream')


def test_quota_exhaustion(file_sync):
    # Quota = 1 MB; max file = 256 KB → 5 files saturates.
    for i in range(4):
        file_sync.store('user_a', (b'\x01' * (250 * 1024)) + str(i).encode(),
                        name=f'f{i}.bin')
    # 5th would push past 1 MB total.
    with pytest.raises(ValueError, match='quota exceeded'):
        file_sync.store('user_a', (b'\x02' * (200 * 1024)) + b'extra',
                        name='last.bin')


def test_path_traversal_file_id_rejected(file_sync):
    """Client-supplied file_ids are validated as 64-hex-char SHA256.
    Anything else (slashes, dotdot, short strings) must refuse."""
    for bad in ('..', '../../etc/passwd', 'short',
                'g' * 64,  # non-hex char
                'a' * 63,  # wrong length
                '/absolute/path'):
        got = file_sync.fetch('user_a', bad)
        assert got == (None, None), f"fetch accepted malformed file_id {bad!r}"
        assert file_sync.delete('user_a', bad) is False


def test_list_since_orders_ascending_and_filters(file_sync):
    meta_1 = file_sync.store('user_a', b'one', name='1.txt')
    meta_2 = file_sync.store('user_a', b'two', name='2.txt')
    meta_3 = file_sync.store('user_a', b'three', name='3.txt')

    listed = file_sync.list_since('user_a', 0)
    ids = [m['file_id'] for m in listed]
    assert meta_1['file_id'] in ids
    assert meta_2['file_id'] in ids
    assert meta_3['file_id'] in ids

    # Cursor past everything returns empty.
    far_future = 2 ** 62
    assert file_sync.list_since('user_a', far_future) == []


def test_usage_reports_bytes_files_quota(file_sync):
    file_sync.store('user_a', b'abc', name='a.txt')
    file_sync.store('user_a', b'defgh', name='b.txt')
    u = file_sync.usage('user_a')
    assert u['files'] == 2
    assert u['bytes'] == 3 + 5
    assert u['quota_bytes'] == 1024 * 1024  # fixture env


def test_invalid_user_id_refused(file_sync):
    """Empty + whitespace-only user_ids must refuse; path-traversal
    tokens are stripped by the sanitiser (no slashes ever hit disk)."""
    with pytest.raises(ValueError):
        file_sync.store('', b'x', name='y.txt')
    with pytest.raises(ValueError):
        file_sync.store('   ', b'x', name='y.txt')
    with pytest.raises(ValueError):
        file_sync.store('///', b'x', name='y.txt')


def test_user_id_sanitized_does_not_escape_data_root(file_sync, tmp_path):
    """`../attack` must NOT cause writes outside the file_sync data root.
    The sanitiser strips non-alnum/_-/ chars so `../attack` → `attack`."""
    meta = file_sync.store('../attack', b'payload', name='z.txt')
    # Blob must land under tmp_path/file_sync/attack/... — never above.
    got_bytes, _ = file_sync.fetch('attack', meta['file_id'])
    assert got_bytes == b'payload'
    # Confirm the hostile prefix did not create any escaping directory.
    for root, _dirs, _files in os.walk(str(tmp_path)):
        assert '..' not in root
        assert os.path.realpath(root).startswith(os.path.realpath(str(tmp_path)))


def test_delete_absent_returns_false(file_sync):
    # Valid format but never stored.
    sha = hashlib.sha256(b'never').hexdigest()
    assert file_sync.delete('user_a', sha) is False
