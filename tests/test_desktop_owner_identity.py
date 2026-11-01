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


# ── The page's placeholder never replaces a signed-in user ────────────────
#
# The page posts user_id 'guest' when it holds no identity of its own
# (Demopage effectiveUserId's last fallback).  Live 2026-11-01 11:06:57 a page
# that could not read its sign-in posted that over the owner's record:
# "desktop owner is now guest (was 10202)", every consent ask went to 'guest'
# and the owner's answers, made as 10202, never closed one.


@pytest.mark.parametrize('stored, posted, refused', [
    ('10202', 'guest', True),       # the 11:06:57 write
    (10202, 'guest', True),         # an id stored as a number
    (USER_ID, 'guest', True),
    (None, 'guest', False),         # nobody signed in yet: unchanged
    ('', 'guest', False),
    ('guest', 'guest', False),
    ('10202', USER_ID, False),      # a real sign-in replaces a real one
    ('10202', GUEST, False),        # a guest session is a real identity
    ('10202', '', False),           # '' is the clear sentinel, not this rule
])
def test_the_placeholder_never_replaces_a_signed_in_user(gi, stored, posted, refused):
    assert gi.is_placeholder_over_sign_in(stored, posted) is refused


def _post_to_set_storage(posted):
    """Run app.py's own set_storage body on one post.

    It is nested inside the serving-app builder, and importing app.py drags
    in the boot path, so its source is compiled on its own with the route
    decorator dropped and the request and jsonify it reads stood in for.
    """
    import logging
    from types import SimpleNamespace
    tree = ast.parse((REPO / 'app.py').read_text(encoding='utf-8'))
    fn = next(n for n in ast.walk(tree)
              if isinstance(n, ast.FunctionDef) and n.name == 'set_storage')
    fn.decorator_list = []
    ns = {'request': SimpleNamespace(method='POST', json=posted),
          'jsonify': lambda body: body, 'os': os, 'json': json,
          'logger': logging.getLogger('test_set_storage')}
    exec(compile(ast.Module(body=[fn], type_ignores=[]), 'app.py', 'exec'), ns)
    return ns['set_storage']()


def test_a_post_of_the_placeholder_keeps_the_owner(fake_home, gi, clean_owner_env):
    """RED before the fix: the record and the export both became 'guest'."""
    _write(fake_home, json.dumps({'user_id': '10202', 'access_token': 'old'}))
    gi.sync_owner_identity_env()
    reply = _post_to_set_storage({'user_id': 'guest', 'access_token': 'new'})
    assert reply['success'] is True
    record = json.loads(_record(fake_home).read_text(encoding='utf-8'))
    assert record == {'user_id': '10202', 'access_token': 'new'}
    assert os.environ[OWNER_ENV] == '10202'


def test_with_nobody_signed_in_the_placeholder_is_stored_as_before(
        fake_home, gi, clean_owner_env):
    _post_to_set_storage({'user_id': 'guest'})
    record = json.loads(_record(fake_home).read_text(encoding='utf-8'))
    assert record == {'user_id': 'guest'}


def test_sign_out_clears_the_owner_from_the_record(fake_home, gi, clean_owner_env):
    """Sign-out (landing-page clearAuth) posts '' for the identity keys.
    The record drops them and the desktop goes back to the guest; the
    refused placeholder is not a sign-out."""
    _write(fake_home, json.dumps({'user_id': '10202', 'access_token': 'tok',
                                  'email': 'x', 'hart_name': 'h'}))
    gi.sync_owner_identity_env()
    _post_to_set_storage({'user_id': '', 'access_token': '', 'email': ''})
    assert json.loads(_record(fake_home).read_text(encoding='utf-8')) == {'hart_name': 'h'}
    assert os.environ[OWNER_ENV] == GUEST


def test_a_real_sign_in_still_replaces_the_owner(fake_home, gi, clean_owner_env):
    _write(fake_home, json.dumps({'user_id': '10202'}))
    _post_to_set_storage({'user_id': USER_ID})
    assert json.loads(_record(fake_home).read_text(encoding='utf-8'))['user_id'] == USER_ID
    assert os.environ[OWNER_ENV] == USER_ID


def test_main_does_not_derive_its_own_record_path():
    """RED before the fix: main.py joined get_data_dir()/storage/user_data.json."""
    tree = ast.parse((REPO / 'main.py').read_text(encoding='utf-8'))
    own = [n.lineno for n in ast.walk(tree)
           if isinstance(n, ast.Constant) and n.value == 'user_data.json']
    assert own == [], (
        f'main.py names user_data.json itself at lines {own}; the path must '
        'come from desktop.guest_identity.get_user_data_file_path()')
