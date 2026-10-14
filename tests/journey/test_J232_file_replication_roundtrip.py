"""J232 · File replication roundtrip across devices (U9, task #412).

User requirement (2026-04-24):
  "Documents can be sent and downloaded like whatsapp? sending to my
  Agent and retrieving via my agent in another device"

Scenario:
  Device A uploads `diagram.png` through the agent chat flow ->
  file_sync.store() puts it in HARTOS's one upload store
  (core.user_file_store, purpose 'chat_attachment'; owner ruling A10a,
  2026-10-14: Nunba keeps no storage of its own).  The
  ChatMessage.attachments row carries `{file_id, sha256, name, mime, size}`.
  Device B, subscribed via chat.new WAMP, sees the message and pulls the
  attachment through file_sync.fetch(<uid>, <file_id>), which answers the
  stored file the route sends.

Invariants:
  1. fetch() before any store returns (None, None) -- no phantom files.
  2. store() then fetch() on the SAME user gives the identical bytes.
  3. file_id == SHA256(bytes) -- content-addressed so clients never
     trust a server-provided id.
  4. Same user re-storing the same content is one file (dedup).
  5. Two users storing identical bytes must NOT share the blob --
     cross-user dedup would leak existence via presence probe.
  6. list_since() gives each device a way to enumerate its backlog
     on first sync, ordered by created_at ASC for cursor progression.

Regression patterns caught:
  * Someone makes store() trust a client-supplied file_id -- attacker
    can overwrite another file by guessing the id.
  * Someone switches to cross-user dedup to save disk -- privacy leak.
  * Someone drops the SHA256 verification -- tampered bytes flow.
"""

from __future__ import annotations

import hashlib
import os

import pytest

pytestmark = pytest.mark.journey


class _Clock:
    """The store's clock: each upload one second after the last."""

    def __init__(self):
        self.now = 1_760_000_000.0

    def __call__(self):
        self.now += 1.0
        return self.now


@pytest.fixture(autouse=True)
def _isolate(tmp_path, monkeypatch):
    """Point file_sync at HARTOS's store on an isolated tmp root."""
    from core.user_file_store import UserFileStore

    from desktop import file_sync
    store = UserFileStore(str(tmp_path / 'user_files'), disk_free=lambda path: 1 << 40,
                          clock=_Clock())
    monkeypatch.setattr(file_sync, '_store', lambda: store)
    yield store


def _read(path):
    with open(path, 'rb') as f:
        return f.read()


@pytest.mark.timeout(15)
def test_j232_fetch_before_store_returns_none():
    from desktop import file_sync
    sha = hashlib.sha256(b'never stored').hexdigest()
    assert file_sync.fetch('user_abc', sha) == (None, None)


@pytest.mark.timeout(15)
def test_j232_roundtrip_same_user_identical_bytes():
    """Device A stores; Device B (same uid, same desktop) fetches."""
    from desktop import file_sync
    data = b'\x89PNG\r\n\x1a\n' + b'fake-image-body' * 32

    meta = file_sync.store('user_abc', data, name='diagram.png', mime='image/png')
    path, got_meta = file_sync.fetch('user_abc', meta['file_id'])
    assert _read(path) == data
    assert got_meta['sha256'] == hashlib.sha256(data).hexdigest()
    assert got_meta['mime'] == 'image/png'
    assert got_meta['name'] == 'diagram.png'


@pytest.mark.timeout(15)
def test_j232_file_id_equals_sha256():
    """Content-addressed: client verifies by independently hashing."""
    from desktop import file_sync
    data = b'content-addressed integrity'
    meta = file_sync.store('user_abc', data, name='x.txt', mime='text/plain')
    assert meta['file_id'] == hashlib.sha256(data).hexdigest()
    assert meta['sha256'] == meta['file_id']


@pytest.mark.timeout(15)
def test_j232_store_idempotent_same_user_same_content():
    from desktop import file_sync
    data = b'the same 42 bytes written twice..............'
    a = file_sync.store('user_abc', data, name='1.txt', mime='text/plain')
    b = file_sync.store('user_abc', data, name='renamed.txt', mime='text/plain')
    assert a['file_id'] == b['file_id']
    # Usage is counted once, not twice.
    u = file_sync.usage('user_abc')
    assert u['files'] == 1
    assert u['bytes'] == len(data)


@pytest.mark.timeout(15)
def test_j232_cross_user_no_dedup_no_leak():
    """user A's copy and user B's copy must be independent."""
    from desktop import file_sync
    data = b'%PDF-1.7 secret plan bytes'
    file_sync.store('user_abc', data, name='plan.pdf', mime='application/pdf')
    file_sync.store('user_xyz', data, name='plan.pdf', mime='application/pdf')
    file_sync.delete('user_abc', hashlib.sha256(data).hexdigest())
    # user_xyz's copy must survive.
    path, b_meta = file_sync.fetch('user_xyz', hashlib.sha256(data).hexdigest())
    assert _read(path) == data
    assert b_meta is not None


@pytest.mark.timeout(15)
def test_j232_list_since_cursor_progression():
    """Device B enumerates its backlog via list_since(cursor)."""
    from desktop import file_sync
    for i in range(4):
        file_sync.store('user_abc', f'payload-{i}'.encode(),
                        name=f'f{i}.txt', mime='text/plain')
    full = file_sync.list_since('user_abc', 0)
    assert len(full) == 4
    assert [m['name'] for m in full] == ['f0.txt', 'f1.txt', 'f2.txt', 'f3.txt']
    # Cursor past the most recent returns empty.
    last_cursor = max(int(m['created_at']) for m in full)
    assert file_sync.list_since('user_abc', last_cursor) == []
    assert [m['name'] for m in file_sync.list_since('user_abc', full[1]['created_at'])] == [
        'f2.txt', 'f3.txt']


@pytest.mark.timeout(15)
def test_j232_delete_cleans_up_the_file_and_its_record(_isolate):
    """After delete, neither the bytes nor the store's record remain."""
    from desktop import file_sync
    meta = file_sync.store('user_abc', b'ephemeral', name='e.txt', mime='text/plain')
    path, _ = file_sync.fetch('user_abc', meta['file_id'])
    assert file_sync.delete('user_abc', meta['file_id']) is True

    assert not os.path.exists(path)
    assert _isolate.resolve('user_abc', meta['file_id']) is None
    assert file_sync.list_since('user_abc', 0) == []
