"""FT unit tests for desktop.memory_sync (U10, task #413).

Verifies export/import of memory_items + memory_links across two
simulated devices (tmp_path NUNBA_DATA_DIR).  Exercises:
    - Fresh import on empty DB creates schema lazily
    - Export cursor progression
    - UPSERT with last-write-wins on updated_at
    - Cross-user isolation (separate DB files)
    - Hostile-input rejection (oversized, non-dict, missing ids)
    - Links dedup on repeat import
"""
from __future__ import annotations

import importlib
import time

import pytest


@pytest.fixture
def memory_sync(tmp_path, monkeypatch):
    monkeypatch.setenv('NUNBA_DATA_DIR', str(tmp_path))
    import desktop.memory_sync as ms
    importlib.reload(ms)
    monkeypatch.setattr(ms, '_data_dir', lambda: str(tmp_path))
    return ms


def _make_item(mid: str, *, content='c', updated_at=None,
               metadata='', source='memory'):
    now = time.time() if updated_at is None else updated_at
    return {
        'id': mid,
        'content': content,
        'metadata': metadata,
        'source': source,
        'created_at': now,
        'updated_at': now,
        'hash': '',
    }


def test_export_empty_user_returns_zero_cursor(memory_sync):
    out = memory_sync.export('ghost', 0)
    assert out == {'items': [], 'links': [], 'cursor': 0}


def test_import_then_export_roundtrip(memory_sync):
    items = [
        _make_item('m1', content='alpha', updated_at=100.0),
        _make_item('m2', content='beta',  updated_at=200.0),
    ]
    result = memory_sync.import_batch('user_a', {'items': items, 'links': []})
    assert result['imported_items'] == 2

    out = memory_sync.export('user_a', 0)
    ids = sorted(i['id'] for i in out['items'])
    assert ids == ['m1', 'm2']
    # Cursor = max updated_at_ms across returned rows.
    assert out['cursor'] == 200 * 1000


def test_export_cursor_filters_unchanged_rows(memory_sync):
    items = [
        _make_item('m1', updated_at=100.0),
        _make_item('m2', updated_at=200.0),
        _make_item('m3', updated_at=300.0),
    ]
    memory_sync.import_batch('user_a', {'items': items, 'links': []})
    # since > 200s = 200000 ms → returns only m3.
    out = memory_sync.export('user_a', since_ms=200_000)
    ids = [i['id'] for i in out['items']]
    assert ids == ['m3']
    assert out['cursor'] == 300_000


def test_upsert_last_write_wins_on_newer_updated_at(memory_sync):
    older = _make_item('m1', content='v1', updated_at=100.0)
    newer = _make_item('m1', content='v2', updated_at=200.0)
    memory_sync.import_batch('user_a', {'items': [older], 'links': []})
    memory_sync.import_batch('user_a', {'items': [newer], 'links': []})
    out = memory_sync.export('user_a', 0)
    assert len(out['items']) == 1
    assert out['items'][0]['content'] == 'v2'


def test_upsert_rejects_older_update(memory_sync):
    newer = _make_item('m1', content='fresh', updated_at=500.0)
    older = _make_item('m1', content='stale', updated_at=200.0)
    memory_sync.import_batch('user_a', {'items': [newer], 'links': []})
    memory_sync.import_batch('user_a', {'items': [older], 'links': []})
    out = memory_sync.export('user_a', 0)
    assert out['items'][0]['content'] == 'fresh'


def test_cross_user_isolation(memory_sync):
    items_a = [_make_item('shared', content='user-a-wrote-this', updated_at=100.0)]
    items_b = [_make_item('shared', content='user-b-wrote-this', updated_at=100.0)]
    memory_sync.import_batch('user_a', {'items': items_a, 'links': []})
    memory_sync.import_batch('user_b', {'items': items_b, 'links': []})
    out_a = memory_sync.export('user_a', 0)
    out_b = memory_sync.export('user_b', 0)
    assert out_a['items'][0]['content'] == 'user-a-wrote-this'
    assert out_b['items'][0]['content'] == 'user-b-wrote-this'


def test_links_exported_when_endpoints_in_returned_items(memory_sync):
    items = [
        _make_item('parent', updated_at=100.0),
        _make_item('child',  updated_at=200.0),
    ]
    links = [{
        'id': 'l1',
        'source_id': 'parent',
        'target_id': 'child',
        'link_type': 'derived',
        'context': 'test',
        'created_at': '2026-01-01',
    }]
    memory_sync.import_batch('user_a', {'items': items, 'links': links})
    out = memory_sync.export('user_a', 0)
    assert len(out['links']) == 1
    assert out['links'][0]['id'] == 'l1'
    assert out['links'][0]['source_id'] == 'parent'


def test_links_dedup_on_repeat_import(memory_sync):
    items = [_make_item('a', updated_at=100.0), _make_item('b', updated_at=200.0)]
    link = {
        'id': 'l-dup',
        'source_id': 'a',
        'target_id': 'b',
        'link_type': 'derived',
        'context': '',
        'created_at': '2026-01-01',
    }
    memory_sync.import_batch('user_a', {'items': items, 'links': [link]})
    memory_sync.import_batch('user_a', {'items': items, 'links': [link]})
    out = memory_sync.export('user_a', 0)
    assert len(out['links']) == 1  # INSERT OR IGNORE


def test_invalid_payload_raises(memory_sync):
    with pytest.raises(ValueError):
        memory_sync.import_batch('user_a', 'not a dict')  # type: ignore[arg-type]
    with pytest.raises(ValueError):
        memory_sync.import_batch('user_a', {'items': 'nope', 'links': []})
    with pytest.raises(ValueError):
        memory_sync.import_batch('user_a', {'items': [], 'links': 'nope'})


def test_import_cap_enforced(memory_sync):
    items = [_make_item(f'm{i}', updated_at=float(i)) for i in range(1001)]
    with pytest.raises(ValueError, match='batch cap'):
        memory_sync.import_batch('user_a', {'items': items, 'links': []})


def test_import_skips_oversized_content(memory_sync):
    big = 'x' * (128 * 1024)  # 128 KB > 64 KB cap
    items = [_make_item('big', content=big)]
    r = memory_sync.import_batch('user_a', {'items': items, 'links': []})
    assert r['imported_items'] == 0
    assert r['skipped_items'] == 1


def test_import_skips_item_missing_id_or_content(memory_sync):
    items = [
        {'id': 'ok', 'content': 'c', 'updated_at': time.time()},
        {'id': '', 'content': 'c'},          # missing id
        {'id': 'only-id', 'content': ''},    # empty content
        'not a dict',                         # wrong type
    ]
    r = memory_sync.import_batch('user_a', {'items': items, 'links': []})
    assert r['imported_items'] == 1
    assert r['skipped_items'] == 3
