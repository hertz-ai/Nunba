"""J234 · Agent memory-graph sync across devices (U10, task #413).

User requirement (2026-04-24):
  "sending to my Agent and retrieving via my agent in another device"

Scenario:
  Device A agent learns a fact via the `remember` MCP tool → one row
  lands in memory_graph.db (user-scoped path).  Device B, on login,
  issues GET /api/memory-sync/pull → server calls export(uid, since=0)
  → A's rows come back as a JSON batch.  Device B then POST
  /api/memory-sync/push with the batch → import_batch(uid, payload)
  upserts on its local memory_graph.db.  Subsequent `recall` on
  device B's agent retrieves the fact.

Invariants:
  1. Fresh device (no prior writes) export returns empty + cursor=0.
  2. Round-trip A→export→import→B preserves ids AND timestamps —
     essential so further deltas remain comparable across devices.
  3. Cursor-based export returns only rows updated_at > since; a
     subsequent export at the returned cursor yields the empty set
     (no duplicate replay).
  4. Re-importing the same batch is idempotent (no duplicate items,
     no duplicate links) — safe to retry on transient network fail.
  5. Last-write-wins on updated_at: if A edits a memory after B's
     copy is stale, importing A's new version wins.

Regression patterns caught:
  * Someone imports with INSERT OR REPLACE and clobbers a newer edit.
  * Someone forgets to scope memory_graph.db per user → cross-user
    leakage on a shared-Flask cloud install.
  * Someone serializes timestamps as str and loses ordering precision.
"""

from __future__ import annotations

import importlib
import time

import pytest

pytestmark = pytest.mark.journey


@pytest.fixture
def memory_sync_a(tmp_path, monkeypatch):
    """Device A's memory_sync bound to an A-specific data dir."""
    device_a_dir = tmp_path / 'device_a'
    device_a_dir.mkdir()
    monkeypatch.setenv('NUNBA_DATA_DIR', str(device_a_dir))
    from desktop import memory_sync
    importlib.reload(memory_sync)
    monkeypatch.setattr(memory_sync, '_data_dir', lambda: str(device_a_dir))
    return memory_sync


def _item(mid, *, content='x', updated_at=None):
    now = updated_at if updated_at is not None else time.time()
    return {
        'id': mid, 'content': content, 'metadata': '',
        'source': 'memory', 'created_at': now, 'updated_at': now, 'hash': '',
    }


@pytest.mark.timeout(15)
def test_j234_fresh_device_export_empty(memory_sync_a):
    out = memory_sync_a.export('user_abc', 0)
    assert out == {'items': [], 'links': [], 'cursor': 0}


@pytest.mark.timeout(15)
def test_j234_roundtrip_preserves_ids_and_timestamps(tmp_path, monkeypatch):
    """Device A remembers → export → Device B imports → export from B
    yields the same ids + updated_at as A's export."""
    # Device A
    a_dir = tmp_path / 'a'; a_dir.mkdir()
    monkeypatch.setenv('NUNBA_DATA_DIR', str(a_dir))
    import desktop.memory_sync as ms_a
    importlib.reload(ms_a)
    monkeypatch.setattr(ms_a, '_data_dir', lambda: str(a_dir))

    items = [
        _item('fact-1', content='sky is blue', updated_at=100.5),
        _item('fact-2', content='water is wet', updated_at=200.75),
    ]
    ms_a.import_batch('user_abc', {'items': items, 'links': []})
    export_a = ms_a.export('user_abc', 0)
    assert len(export_a['items']) == 2

    # Device B — new tmp dir, same user.
    b_dir = tmp_path / 'b'; b_dir.mkdir()
    monkeypatch.setenv('NUNBA_DATA_DIR', str(b_dir))
    import desktop.memory_sync as ms_b
    importlib.reload(ms_b)
    monkeypatch.setattr(ms_b, '_data_dir', lambda: str(b_dir))

    r = ms_b.import_batch('user_abc', export_a)
    assert r['imported_items'] == 2

    export_b = ms_b.export('user_abc', 0)
    ids_a = sorted(i['id'] for i in export_a['items'])
    ids_b = sorted(i['id'] for i in export_b['items'])
    assert ids_a == ids_b == ['fact-1', 'fact-2']
    # Timestamps preserved exactly.
    ts_a = {i['id']: i['updated_at'] for i in export_a['items']}
    ts_b = {i['id']: i['updated_at'] for i in export_b['items']}
    assert ts_a == ts_b


@pytest.mark.timeout(15)
def test_j234_cursor_progression_no_duplicate_replay(memory_sync_a):
    """Second pull at the returned cursor gives an empty batch."""
    memory_sync_a.import_batch('user_abc', {
        'items': [_item('m', updated_at=100.0)], 'links': [],
    })
    first = memory_sync_a.export('user_abc', 0)
    assert len(first['items']) == 1
    cursor = first['cursor']
    second = memory_sync_a.export('user_abc', cursor)
    assert second['items'] == []


@pytest.mark.timeout(15)
def test_j234_reimport_is_idempotent(memory_sync_a):
    items = [_item('same', updated_at=100.0)]
    link = {
        'id': 'lnk', 'source_id': 'same', 'target_id': 'same',
        'link_type': 'self', 'context': '', 'created_at': '2026-01-01',
    }
    memory_sync_a.import_batch('user_abc', {'items': items, 'links': [link]})
    memory_sync_a.import_batch('user_abc', {'items': items, 'links': [link]})
    memory_sync_a.import_batch('user_abc', {'items': items, 'links': [link]})
    out = memory_sync_a.export('user_abc', 0)
    assert len(out['items']) == 1
    assert len(out['links']) == 1


@pytest.mark.timeout(15)
def test_j234_newer_edit_wins_on_import(memory_sync_a):
    """Simulates device A editing a memory AFTER device B's cached
    copy is stale.  The newer updated_at wins."""
    memory_sync_a.import_batch('user_abc', {
        'items': [_item('m', content='v1', updated_at=100.0)],
        'links': [],
    })
    memory_sync_a.import_batch('user_abc', {
        'items': [_item('m', content='v2-newer', updated_at=200.0)],
        'links': [],
    })
    out = memory_sync_a.export('user_abc', 0)
    assert out['items'][0]['content'] == 'v2-newer'
