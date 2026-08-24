"""`/api/storage/set` must MERGE, never rebuild user_data.json from the post.

Until 2026-08-11 the handler did:

    user_data = {}
    for key in found_keys:
        user_data[key] = data[key]
    with open(user_data_file, 'w') as f:
        json.dump(user_data, f)          # <-- rebuilt from posted keys ONLY

so any caller that sent a subset silently deleted every key it did not
mention.  Two consequences:

  * The HART-identity reset was inexpressible.  SettingsPage could not clear
    hart_* without also destroying access_token/email/user_id, so it cleared
    localStorage only — and useStorageSync's top-up fires precisely WHEN
    hart_sealed is missing, so it re-hydrated hart_* out of this file and the
    naming ceremony never ran.
  * A Demopage identity POST landing before useStorageSync had hydrated would
    wipe the reinstall-recovery copy of hart_*, which is the whole reason
    those keys are persisted (app.py:5738-5743).

This is a source-level guard rather than an HTTP test because ``set_storage``
is nested inside app.py's serving-app builder and importing app.py drags in
the splash/webview boot path.  It pins the shape of the fix, which is what
regresses: someone "simplifying" the read-modify-write back into a single
dump.  Same mechanical-enforcement approach as tests/test_lang_constants.py.
"""
import ast
from pathlib import Path

import pytest

APP_PY = Path(__file__).resolve().parent.parent / 'app.py'


@pytest.fixture(scope='module')
def set_storage_fn():
    tree = ast.parse(APP_PY.read_text(encoding='utf-8'))
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == 'set_storage':
            return node
    pytest.fail('set_storage not found in app.py — endpoint renamed or removed')


def _dump_targets(fn):
    """First positional arg of every json.dump(...) call, as source names."""
    out = []
    for node in ast.walk(fn):
        if (isinstance(node, ast.Call)
                and isinstance(node.func, ast.Attribute)
                and node.func.attr == 'dump'
                and isinstance(node.func.value, ast.Name)
                and node.func.value.id == 'json'
                and node.args):
            arg = node.args[0]
            out.append(arg.id if isinstance(arg, ast.Name) else type(arg).__name__)
    return out


def test_persists_a_merged_dict_not_the_posted_one(set_storage_fn):
    """RED before the fix: json.dump(user_data, ...) — the clobber."""
    targets = _dump_targets(set_storage_fn)

    assert targets, 'set_storage no longer writes user_data.json via json.dump'
    assert 'user_data' not in targets, (
        "set_storage writes the POSTED-keys dict straight to user_data.json. "
        "That deletes every key the caller did not mention. Merge into the "
        "existing document and dump that instead.")


def test_reads_the_existing_document_before_writing(set_storage_fn):
    """A merge is only a merge if the prior contents are actually loaded."""
    loads = [
        node for node in ast.walk(set_storage_fn)
        if (isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr == 'load'
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == 'json')
    ]
    assert loads, (
        'set_storage never json.load()s the existing user_data.json, so it '
        'cannot be merging — any unposted key is lost.')


def test_empty_string_is_the_documented_clear_sentinel(set_storage_fn):
    """SettingsPage's HART reset posts '' to delete; keep that expressible.

    Without a delete sentinel a merging endpoint can never shed a key, which
    would leave hart_* immortal and break the reset the other way round.
    """
    src = ast.get_source_segment(APP_PY.read_text(encoding='utf-8'),
                                 set_storage_fn) or ''
    assert "== ''" in src or '== ""' in src, (
        "set_storage has no '' comparison — the explicit clear sentinel is "
        "gone, so SettingsPage's HART reset cannot delete hart_* and the "
        "naming ceremony will never re-run.")


def test_downstream_gate_still_sees_only_posted_keys(set_storage_fn):
    """The DB-upsert / URL-update blocks gate on `user_data`.

    They must keep seeing THIS request's assertions, not the merged document —
    merging into `user_data` would make them fire for requests that never
    carried a full cloud identity.
    """
    src = ast.get_source_segment(APP_PY.read_text(encoding='utf-8'),
                                 set_storage_fn) or ''
    assert 'all(k in user_data for k in required_keys)' in src, (
        'the required_keys gate no longer reads `user_data`; if it was '
        'repointed at the merged dict, cloud DB upserts now fire on partial '
        'posts that previously did not qualify.')
