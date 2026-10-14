"""J233 · File-sync per-user quota enforcement (U9, task #412).

Scenario:
  Malicious or misconfigured client uploads many large files; quota
  must refuse the one that would exceed the cap and all prior stores
  remain intact.  The check is cheap enough to run on every store()
  so a disk-fill DoS cannot succeed on a single process.  The quota and
  the size cap are HARTOS's one upload store's (core.user_file_store,
  purpose 'chat_attachment'; owner ruling A10a); file_sync keeps none.

Invariants:
  1. store() refuses with FileRefused reason 'quota' when the incoming
     file would push the user past their cap.
  2. A refused upload leaves NO partial blob, NO record -- atomicity.
  3. Per-file max cap is enforced even when the user's quota has
     plenty of room -- prevents a single 10 GB file from OOMing.
  4. Quota is per-user: user A's usage doesn't consume user B's.

Regression patterns caught:
  * Someone caches usage in memory and forgets to invalidate -- next
    store lets the user slip over.
  * Someone checks quota AFTER keeping the file -- the blob stays on disk.
  * Someone shares a single global quota across all users -- fairness
    and privacy (usage is a side-channel signal) suffer.
"""

from __future__ import annotations

import os

import pytest

pytestmark = pytest.mark.journey


@pytest.fixture(autouse=True)
def _tight_quota(tmp_path, monkeypatch):
    # 512 KB quota, 128 KB per-file cap.
    from core.user_file_store import UserFileStore

    from desktop import file_sync
    store = UserFileStore(str(tmp_path / 'user_files'),
                          purposes={'chat_attachment': {'max_file': 128 * 1024,
                                                        'quota': 512 * 1024}},
                          disk_free=lambda path: 1 << 40)
    monkeypatch.setattr(file_sync, '_store', lambda: store)
    yield store


def _files(root):
    return sorted(os.path.join(d, f) for d, _, fs in os.walk(root) for f in fs)


@pytest.mark.timeout(15)
def test_j233_quota_blocks_overflow_store():
    from desktop import file_sync
    for i in range(4):
        file_sync.store('user_q', (b'\x01' * (100 * 1024)) + str(i).encode(),
                        name=f'a{i}.pdf', mime='application/pdf')
    with pytest.raises(file_sync.FileRefused) as refused:
        # 4 x 100KB = 400KB used; next 120KB would push to 520KB > 512KB.
        file_sync.store('user_q', b'\x02' * (120 * 1024), name='overflow.pdf',
                        mime='application/pdf')
    assert refused.value.reason == 'quota'


@pytest.mark.timeout(15)
def test_j233_refused_upload_leaves_no_trace(_tight_quota):
    from desktop import file_sync
    for i, fill in enumerate((b'\x01', b'\x02', b'\x03', b'\x04')):
        file_sync.store('user_q', fill * (100 * 1024), name=f'{i}.pdf', mime='application/pdf')
    usage_before = file_sync.usage('user_q')
    files_before = _files(_tight_quota.root)
    with pytest.raises(ValueError):
        file_sync.store('user_q', b'\x05' * (120 * 1024), name='reject.pdf',
                        mime='application/pdf')
    # Refused upload MUST NOT change on-disk state.
    assert file_sync.usage('user_q') == usage_before
    assert _files(_tight_quota.root) == files_before


@pytest.mark.timeout(15)
def test_j233_single_file_cap_independent_of_quota_free(_tight_quota):
    """Even on a pristine user (full quota available), a single file
    larger than the per-file cap is refused."""
    from desktop import file_sync
    big = b'\x00' * (256 * 1024)  # 256 KB > 128 KB cap
    with pytest.raises(file_sync.FileRefused) as refused:
        file_sync.store('user_q', big, name='huge.pdf', mime='application/pdf')
    assert refused.value.reason == 'too_large'
    assert _tight_quota.usage('user_q') == 0


@pytest.mark.timeout(15)
def test_j233_per_user_quota_isolation():
    """user A saturating their quota has zero effect on user B."""
    from desktop import file_sync
    for i in range(5):
        file_sync.store('user_a', (b'\x01' * (100 * 1024)) + str(i).encode(),
                        name=f'{i}.pdf', mime='application/pdf')
    # user_a near saturation; user_b must still accept uploads.
    r = file_sync.store('user_b', b'\x02' * (100 * 1024), name='fresh.pdf',
                        mime='application/pdf')
    assert r is not None and r['size'] == 100 * 1024


@pytest.mark.timeout(15)
def test_j233_usage_reports_quota_bytes():
    from desktop import file_sync
    file_sync.store('user_q', b'small', name='a.txt', mime='text/plain')
    u = file_sync.usage('user_q')
    assert u['quota_bytes'] == 512 * 1024  # fixture
    assert u['bytes'] == 5
    assert u['files'] == 1
