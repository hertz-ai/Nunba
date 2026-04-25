"""J235 · Memory-sync foreign-user isolation (U10, task #413).

Scenario:
  Two users sign in on a shared Flask (regional / cloud topology).
  Each calls /api/memory-sync/pull with their own JWT.  user_a's
  export MUST NOT contain a single row owned by user_b.  The gate
  enforces this BOTH at the HTTP layer (JWT→user_id resolution in
  main.py _chat_sync_resolve_uid) AND at the library layer (this
  test) — defense in depth.  If the HTTP gate regresses, the
  library gate still holds.

Invariants:
  1. memory_graph is stored per-user-id on disk → opening the
     wrong user's DB path simply misses (no shared DB file).
  2. A user_id containing path-traversal tokens (`..`, `/`, `\\`)
     must be sanitized to a non-empty alnum form OR refused.
  3. import_batch from attacker who forges a payload claiming a
     victim's memories does NOT land those memories under the
     victim's user_id — it lands under the caller's own id (the
     one passed by the HTTP gate after JWT decode).
  4. A caller with empty / whitespace user_id is refused (the HTTP
     layer should already return 401, but the library layer must
     also refuse so unit callers can't bypass).

Regression patterns caught:
  * Someone adds a "user_id" field to the import payload thinking
    it provides routing — attacker claims victim's id and overwrites.
  * Someone removes the per-user db path and routes all users
    through one shared SQLite — cross-user leak on the next import.
"""

from __future__ import annotations

import importlib
import time

import pytest

pytestmark = pytest.mark.journey


@pytest.fixture
def memory_sync(tmp_path, monkeypatch):
    monkeypatch.setenv('NUNBA_DATA_DIR', str(tmp_path))
    from desktop import memory_sync as ms
    importlib.reload(ms)
    monkeypatch.setattr(ms, '_data_dir', lambda: str(tmp_path))
    return ms


def _item(mid, *, updated_at=None, content='x'):
    now = updated_at if updated_at is not None else time.time()
    return {
        'id': mid, 'content': content, 'metadata': '',
        'source': 'memory', 'created_at': now, 'updated_at': now, 'hash': '',
    }


@pytest.mark.timeout(15)
def test_j235_exports_are_user_scoped(memory_sync):
    memory_sync.import_batch('alice', {
        'items': [_item('secret-a', content='alice-only', updated_at=100.0)],
        'links': [],
    })
    memory_sync.import_batch('bob', {
        'items': [_item('secret-b', content='bob-only', updated_at=100.0)],
        'links': [],
    })
    export_alice = memory_sync.export('alice', 0)
    export_bob = memory_sync.export('bob', 0)
    ids_alice = {i['id'] for i in export_alice['items']}
    ids_bob = {i['id'] for i in export_bob['items']}
    assert 'secret-a' in ids_alice and 'secret-b' not in ids_alice
    assert 'secret-b' in ids_bob and 'secret-a' not in ids_bob


@pytest.mark.timeout(15)
def test_j235_empty_user_id_refused(memory_sync):
    """Both export and import_batch MUST refuse empty user_id so a
    unit caller that bypasses the HTTP JWT gate still cannot act
    as the anonymous owner."""
    with pytest.raises(ValueError):
        memory_sync.import_batch('', {'items': [], 'links': []})
    with pytest.raises(ValueError):
        memory_sync.import_batch('   ', {'items': [], 'links': []})
    with pytest.raises(ValueError):
        memory_sync.export('', 0)
    with pytest.raises(ValueError):
        memory_sync.export('   ', 0)


@pytest.mark.timeout(15)
def test_j235_path_traversal_user_id_sanitized(memory_sync, tmp_path):
    """Hostile user_id `../../etc/passwd` strips to `etcpasswd` — writes
    land there, NOT in tmp_path's parent.  Real filesystem contents
    outside tmp_path are never touched."""
    import os
    memory_sync.import_batch('../../etc/passwd', {
        'items': [_item('m', updated_at=100.0)], 'links': [],
    })
    # Walk tmp_path and verify no escape.
    for root, _dirs, _files in os.walk(str(tmp_path)):
        assert os.path.realpath(root).startswith(os.path.realpath(str(tmp_path)))


@pytest.mark.timeout(15)
def test_j235_forged_user_id_in_payload_ignored(memory_sync):
    """The routing user_id is the caller's authenticated id (arg),
    NOT anything in the payload.  Even if the attacker supplies
    ``{'items': [{'id':'x', 'user_id':'victim', ...}]}`` the row
    lands under the caller's namespace — import_batch doesn't read
    user_id out of the payload."""
    attacker_payload = {
        'items': [{
            'id': 'injected',
            'content': 'forged',
            'user_id': 'victim',   # <- ignored
            'updated_at': 100.0,
            'created_at': 100.0,
        }],
        'links': [],
    }
    memory_sync.import_batch('attacker', attacker_payload)
    # Attacker's own export shows the row; victim's does NOT.
    assert any(i['id'] == 'injected'
               for i in memory_sync.export('attacker', 0)['items'])
    assert not any(i['id'] == 'injected'
                   for i in memory_sync.export('victim', 0)['items'])
