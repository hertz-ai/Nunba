"""The desktop owner is read from the file sign-in writes, through one resolver.

app.py's /api/storage/set writes the signed-in user to
~/Documents/HevolveAi Agent Companion/storage/user_data.json.  main.py read
the owner (and the Stop AI Control payload) from
get_data_dir()/storage/user_data.json, a file nothing writes.  Live
2026-09-14: HEVOLVE_OWNER_USER_ID fell back to the guest id, so the
screen_capture consent ask went to a user with no subscriber (targeted=0 of
2 clients, both signed in as the real user), and the indicator's Stop sent
{} and HARTOS answered 400 "user_id required" (gui_app.log 17:14, 17:15,
18:50).

Source-level for main.py/app.py for the same reason as
tests/test_storage_set_merge.py: importing either drags in the boot path.
"""
import ast
import json
import os
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parent.parent
USER_ID = 'd68c9dee-b324-4c04-86c4-1205a836957f'
GUEST = 'g_0123456789abcdef'
OWNER_ENV = 'HEVOLVE_OWNER_USER_ID'
SOURCE_ENV = 'HEVOLVE_OWNER_USER_ID_SOURCE'


@pytest.fixture
def fake_home(tmp_path, monkeypatch):
    monkeypatch.setenv('HOME', str(tmp_path))
    monkeypatch.setenv('USERPROFILE', str(tmp_path))
    return tmp_path


@pytest.fixture
def gi(monkeypatch):
    from desktop import guest_identity
    monkeypatch.setattr(guest_identity, 'get_guest_id', lambda: GUEST)
    return guest_identity


def _record(home):
    return home / 'Documents' / 'HevolveAi Agent Companion' / 'storage' / 'user_data.json'


def _write(home, text):
    path = _record(home)
    path.parent.mkdir(parents=True)
    path.write_text(text, encoding='utf-8')


def test_path_is_the_one_sign_in_writes(fake_home, gi):
    assert Path(gi.get_user_data_file_path()) == _record(fake_home)


def test_owner_is_the_signed_in_user(fake_home, gi):
    _write(fake_home, json.dumps({'user_id': USER_ID, 'email': 'x'}))
    assert gi.get_desktop_owner_id() == USER_ID


def test_sign_in_after_boot_is_seen(fake_home, gi):
    assert gi.get_desktop_owner_id() == GUEST
    _write(fake_home, json.dumps({'user_id': USER_ID}))
    assert gi.get_desktop_owner_id() == USER_ID


@pytest.mark.parametrize('text', [None, '{}', '{"user_id": ""}', 'not json', '[1]'])
def test_nobody_signed_in_means_the_guest(fake_home, gi, text):
    if text is not None:
        _write(fake_home, text)
    assert gi.get_desktop_owner_id() == GUEST


# ── The owner the consent gates read follows sign-in and sign-out ─────────
#
# ~10 HARTOS gates (middleware, vision, vlm safety, agent daemon, crossbar,
# whisper, capability setup) read HEVOLVE_OWNER_USER_ID at call time.  Until
# this fix its only writer was a setdefault at import (main.py), so a sign-in
# AFTER boot never reached them: consent asks were filed under the boot-time
# guest (no subscriber) while the grant landed under the real user id, so the
# check never passed and the ask repeated forever.


@pytest.fixture
def clean_owner_env(monkeypatch):
    monkeypatch.delenv(OWNER_ENV, raising=False)
    monkeypatch.delenv(SOURCE_ENV, raising=False)


def test_sync_exports_the_guest_before_anyone_signs_in(fake_home, gi, clean_owner_env):
    assert gi.sync_owner_identity_env() == GUEST
    assert os.environ[OWNER_ENV] == GUEST


def test_sign_in_after_boot_reaches_the_env_the_gates_read(fake_home, gi, clean_owner_env):
    """RED before the fix: the boot-time guest stayed in the env for good."""
    gi.sync_owner_identity_env()                        # boot, nobody signed in
    _write(fake_home, json.dumps({'user_id': USER_ID}))  # set_storage at sign-in
    gi.sync_owner_identity_env()
    assert os.environ[OWNER_ENV] == USER_ID


def test_sign_out_hands_the_desktop_back_to_the_guest(fake_home, gi, clean_owner_env):
    _write(fake_home, json.dumps({'user_id': USER_ID, 'email': 'x'}))
    gi.sync_owner_identity_env()
    _record(fake_home).write_text(json.dumps({'email': 'x'}), encoding='utf-8')
    gi.sync_owner_identity_env()
    assert os.environ[OWNER_ENV] == GUEST


def test_an_operator_pin_is_never_overwritten(fake_home, gi, clean_owner_env, monkeypatch):
    """A value set outside Nunba (no source marker) was honoured by the old
    setdefault; keep honouring it."""
    monkeypatch.setenv(OWNER_ENV, 'pinned-owner')
    _write(fake_home, json.dumps({'user_id': USER_ID}))
    assert gi.sync_owner_identity_env() == 'pinned-owner'
    assert os.environ[OWNER_ENV] == 'pinned-owner'


def test_a_value_nunba_wrote_is_not_mistaken_for_a_pin(fake_home, gi, clean_owner_env, monkeypatch):
    """A restarted or child process inherits Nunba's own export.  Treating
    that as an operator pin would re-freeze the owner, the same bug again."""
    monkeypatch.setenv(OWNER_ENV, GUEST)
    monkeypatch.setenv(SOURCE_ENV, 'nunba-desktop')
    _write(fake_home, json.dumps({'user_id': USER_ID}))
    assert gi.sync_owner_identity_env() == USER_ID
    assert os.environ[OWNER_ENV] == USER_ID


def test_no_owner_at_all_clears_a_stale_export(fake_home, gi, clean_owner_env, monkeypatch):
    def no_guest():
        raise OSError('machine id unreadable')
    monkeypatch.setattr(gi, 'get_guest_id', no_guest)
    monkeypatch.setenv(OWNER_ENV, 'stale-user')
    monkeypatch.setenv(SOURCE_ENV, 'nunba-desktop')
    assert gi.sync_owner_identity_env() is None
    assert OWNER_ENV not in os.environ


def _joins_of_the_record_path(tree):
    """os.path.join(...) calls naming 'HevolveAi Agent Companion' and 'storage'."""
    hits = []
    for node in ast.walk(tree):
        if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                and node.func.attr == 'join'):
            continue
        consts = {a.value for a in node.args if isinstance(a, ast.Constant)}
        if {'HevolveAi Agent Companion', 'storage'} <= consts:
            hits.append(node.lineno)
    return hits


@pytest.mark.parametrize('name', ['app.py', 'main.py'])
def test_no_second_definition_of_the_record_path(name):
    """RED before the fix: app.py built it inline at 1867/4499/4833/5949/6107."""
    tree = ast.parse((REPO / name).read_text(encoding='utf-8'))
    assert _joins_of_the_record_path(tree) == [], (
        f'{name} builds the user_data.json path itself; use '
        'desktop.guest_identity.get_user_data_file_path()')


def _functions_calling(path, fn_names, callee):
    """{fn_name: calls `callee`?} for each named function defined in path."""
    tree = ast.parse((REPO / path).read_text(encoding='utf-8'))
    found = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name in fn_names:
            found[node.name] = any(
                isinstance(c, ast.Call) and (
                    (isinstance(c.func, ast.Name) and c.func.id == callee)
                    or (isinstance(c.func, ast.Attribute) and c.func.attr == callee))
                for c in ast.walk(node))
    return found


def test_the_writer_and_every_reader_go_through_the_resolver():
    """One writer, one path: sign-in writes where the owner and Stop read.

    RED before the fix: app.py's writer and readers built the path inline,
    and main.py's two readers used their own constant.
    """
    app = _functions_calling('app.py', {'set_storage', 'get_storage',
                                        'check_existing_user_data'},
                             'get_user_data_file_path')
    main = _functions_calling('main.py', {'call_stop_api'},
                              'get_desktop_owner_id')
    assert app == {'set_storage': True, 'get_storage': True,
                   'check_existing_user_data': True}, app
    assert main == {'call_stop_api': True}, main


def test_source_guard_boot_and_sign_in_both_export_through_the_one_writer():
    """Source-shape guard (behaviour is pinned by the sync tests above).

    main.py's boot export and app.py's /api/storage/set must both go through
    guest_identity.sync_owner_identity_env, so there is one writer of
    HEVOLVE_OWNER_USER_ID.  RED before the fix: set_storage never touched it
    and main.py used its own setdefault.
    """
    assert _functions_calling('main.py', {'_export_owner_identity'},
                              'sync_owner_identity_env') == {'_export_owner_identity': True}
    assert _functions_calling('app.py', {'set_storage'},
                              'sync_owner_identity_env') == {'set_storage': True}
    tree = ast.parse((REPO / 'main.py').read_text(encoding='utf-8'))
    setdefaults = [n.lineno for n in ast.walk(tree)
                   if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
                   and n.func.attr == 'setdefault'
                   and any(isinstance(a, ast.Constant) and a.value == OWNER_ENV for a in n.args)]
    assert setdefaults == [], f'main.py still setdefaults {OWNER_ENV} at {setdefaults}'


def test_main_does_not_derive_its_own_record_path():
    """RED before the fix: main.py joined get_data_dir()/storage/user_data.json."""
    tree = ast.parse((REPO / 'main.py').read_text(encoding='utf-8'))
    own = [n.lineno for n in ast.walk(tree)
           if isinstance(n, ast.Constant) and n.value == 'user_data.json']
    assert own == [], (
        f'main.py names user_data.json itself at lines {own}; the path must '
        'come from desktop.guest_identity.get_user_data_file_path()')
