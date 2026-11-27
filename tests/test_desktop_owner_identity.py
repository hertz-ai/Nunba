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


@pytest.fixture(autouse=True)
def users_table(tmp_path, monkeypatch):
    """HARTOS's users table, this test's own.  set_storage writes it at
    sign-in and, since rv_6546, drops the stored login from it at sign-out:
    no test here may reach the person's real one.  The module is the one
    sys.modules holds, which set_storage's own import finds.  Returns
    (store(user_id, login), login_of(user_id))."""
    import contextlib
    import importlib

    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    models = importlib.import_module('integrations.social.models')
    engine = create_engine(f"sqlite:///{tmp_path / 'users.db'}")
    models.User.__table__.create(engine)
    session = sessionmaker(bind=engine)

    @contextlib.contextmanager
    def db_session(commit=True):
        s = session()
        try:
            yield s
            if commit:
                s.commit()
        finally:
            s.close()

    monkeypatch.setattr(models, 'db_session', db_session)

    def store(user_id, login):
        with db_session() as s:
            s.add(models.User(id=user_id, username=f'u{user_id[:12]}',
                              display_name='Desk', user_type='human',
                              email=f'{user_id}@example.com', api_token=login))

    def login_of(user_id):
        with db_session(commit=False) as s:
            row = s.query(models.User).filter(models.User.id == user_id).first()
            return row.api_token if row else 'NO ROW'
    return store, login_of


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


# ── The page's placeholder is never the sign-in ───────────────────────────
#
# The page posts user_id 'guest' when it holds no identity of its own
# (Demopage effectiveUserId's last fallback).  Live 2026-11-01 11:06:57 a page
# that could not read its sign-in posted that over the owner's record:
# "desktop owner is now guest (was 10202)", every consent ask went to 'guest'
# and the owner's answers, made as 10202, never closed one.  On a record with
# nobody on it the placeholder is read back as an identity too: the next boot's
# useStorageSync makes 'guest' the page's own guest id, and HARTOS's shell
# (liquid_ui_service._desktop_owner_id) answers as 'guest'.


@pytest.mark.parametrize('posted, placeholder', [
    ('guest', True),
    ('10202', False),
    (10202, False),
    (USER_ID, False),
    (GUEST, False),                 # a guest session is a real identity
    ('', False),                    # '' is the clear sentinel, not this rule
    (None, False),
])
def test_only_the_placeholder_is_refused(gi, posted, placeholder):
    assert gi.is_placeholder_user_id(posted) is placeholder


PHONE_KEY = 'fake-device-public-key'
LOOPBACK = '127.0.0.1'
LAN_DEVICE = '192.168.0.50'
GUEST_JWT = 'fake-guest-jwt'
# What /api/social/auth/guest-register's token carries (HARTOS
# integrations/social/api.py: generate_jwt(id, username, 'guest')).
GUEST_CLAIMS = {'user_id': '99999', 'username': 'guest_lan_abc123',
                'role': 'guest', 'type': 'access', 'scope': 'local'}


def _as_caller(phone=None, guest=False):
    """One request's context, marked the way HARTOS's API gate marks it
    (security.middleware):

      - the desktop's own page (the default): from this machine, 127.0.0.1,
        the address the page's calls come from (landing-page apiBase.js:
        http://localhost:5000);
      - ``phone``: a phone the owner allowed as that account, from the LAN:
        g.auth_source 'device', g.device_public_key, the token's claims in
        g.jwt_payload;
      - ``guest``: a LAN device with a guest JWT from the exempt
        /api/social/auth/guest-register, which the bundled gate lets
        through as g.auth_source 'jwt' (review rv_aedb, measured).

    The routes read the marks and the address through routes.auth, the real
    one."""
    import contextlib

    from flask import Flask, g

    remote = LAN_DEVICE if (phone is not None or guest) else LOOPBACK
    headers = {'Authorization': f'Bearer {GUEST_JWT}'} if guest else {}

    @contextlib.contextmanager
    def context():
        with Flask(__name__).test_request_context(
                environ_base={'REMOTE_ADDR': remote}, headers=headers):
            if phone is not None:
                g.auth_source = 'device'
                g.device_public_key = PHONE_KEY
                g.jwt_payload = {'user_id': phone}
            if guest:
                g.auth_source = 'jwt'
                g.jwt_payload = dict(GUEST_CLAIMS)
            yield
    return context()


def _route_body(name, json_module=json):
    """app.py's own route function ``name``, compiled on its own, with the
    guards app.py puts on it.

    It is nested inside the serving-app builder, and importing app.py drags
    in the boot path, so its source is compiled with only the route
    registration (``@_serving_app.route``) dropped and the request and
    jsonify it reads stood in for.  Every other decorator stays: app.py
    imports its guards from routes.auth under its own names, and those names
    are bound here to the real routes.auth functions they import.
    """
    import logging

    import routes.auth
    tree = ast.parse((REPO / 'app.py').read_text(encoding='utf-8'))
    fn = next(n for n in ast.walk(tree)
              if isinstance(n, ast.FunctionDef) and n.name == name)
    fn.decorator_list = [
        d for d in fn.decorator_list
        if not (isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute)
                and d.func.attr == 'route')]
    guards = {a.asname or a.name: getattr(routes.auth, a.name)
              for n in ast.walk(tree)
              if isinstance(n, ast.ImportFrom) and n.module == 'routes.auth'
              for a in n.names}
    ns = {**guards, 'jsonify': lambda body: body, 'os': os,
          'json': json_module, 'logger': logging.getLogger(f'test_{name}')}
    exec(compile(ast.Module(body=[fn], type_ignores=[]), 'app.py', 'exec'), ns)
    return ns


def _set_storage_handler(json_module=json, phone=None, guest=False):
    """app.py's own set_storage body, as a function of one post."""
    from types import SimpleNamespace
    ns = _route_body('set_storage', json_module)

    def post(posted):
        with _as_caller(phone, guest):
            ns['request'] = SimpleNamespace(method='POST', json=posted)
            return ns['set_storage']()
    return post


def _post_to_set_storage(posted, phone=None, guest=False):
    return _set_storage_handler(phone=phone, guest=guest)(posted)


def _get_storage(key, phone=None, guest=False):
    """app.py's own get_storage body, for one read of ``key``."""
    from types import SimpleNamespace
    ns = _route_body('get_storage')
    with _as_caller(phone, guest):
        ns['request'] = SimpleNamespace(method='GET')
        return ns['get_storage'](key)


class _ReadsMidWrite:
    """json whose dump lets one get_storage read run while the record is
    being written, the way the page's unlocked reads race a sign-in write."""

    def __init__(self):
        self.seen = []

    def __getattr__(self, name):
        return getattr(json, name)

    def dump(self, obj, fh, **kw):
        self.seen.append(_get_storage('access_token'))
        return json.dump(obj, fh, **kw)


def test_a_read_during_a_write_gets_the_old_full_record(
        fake_home, gi, clean_owner_env, monkeypatch):
    """RED before the fix: set_storage opened the record with 'w', which
    empties it, then dumped, so a read in between got an error, and the page
    took the sign-in as missing (live 2026-11-25)."""
    _write(fake_home, json.dumps({'user_id': '10202', 'access_token': 'old'}))
    mid = _ReadsMidWrite()
    monkeypatch.setattr(gi, 'json', mid)  # the atomic writer's dump
    reply = _set_storage_handler(json_module=mid)({'access_token': 'new'})
    assert reply['success'] is True
    assert mid.seen and mid.seen[0] == {'success': True, 'data': 'old'}
    record = json.loads(_record(fake_home).read_text(encoding='utf-8'))
    assert record == {'user_id': '10202', 'access_token': 'new'}


def test_a_write_waits_out_a_reader_holding_the_record_open(
        fake_home, gi, clean_owner_env, monkeypatch):
    """On Windows the atomic replace fails with PermissionError while a
    reader has the record open; the write must go through, not be lost."""
    _write(fake_home, json.dumps({'user_id': '10202', 'access_token': 'old'}))
    real = gi._atomic_write
    calls = []

    def busy_once(path, payload):
        calls.append(path)
        if len(calls) == 1:
            raise PermissionError(13, 'Access is denied')
        return real(path, payload)

    monkeypatch.setattr(gi, '_atomic_write', busy_once)
    reply = _post_to_set_storage({'access_token': 'new'})
    assert reply['success'] is True
    assert len(calls) == 2
    record = json.loads(_record(fake_home).read_text(encoding='utf-8'))
    assert record == {'user_id': '10202', 'access_token': 'new'}


# The read side of the same race (rv_auth7's probe, 11-26: 1 of 420
# concurrent reads): on Windows a read that opens the record while the
# writer's os.replace swaps it in gets PermissionError for an instant.

def _read_with_open(key, fake_open):
    """app.py's own get_storage, reading through ``fake_open``."""
    from types import SimpleNamespace
    ns = _route_body('get_storage')
    ns['open'] = fake_open
    with _as_caller():
        ns['request'] = SimpleNamespace(method='GET')
        return ns['get_storage'](key)


def _record_held(home, times):
    """An open() that refuses the record ``times`` times, the way the
    replace does, then opens it; returns (open, list of record opens)."""
    import builtins
    record = os.path.normcase(os.path.abspath(_record(home)))
    opens = []

    def held_open(path, *args, **kwargs):
        if os.path.normcase(os.path.abspath(path)) == record:
            opens.append(path)
            if len(opens) <= times:
                raise PermissionError(13, 'Access is denied', str(path))
        return builtins.open(path, *args, **kwargs)
    return held_open, opens


def test_a_read_while_the_record_is_being_replaced_gets_the_value(
        fake_home, gi, clean_owner_env):
    """RED before the fix: the read answered an error, which the page took
    as the sign-in missing."""
    _write(fake_home, json.dumps({'user_id': '10202', 'access_token': 'kong-tok'}))
    held_open, opens = _record_held(fake_home, times=1)
    assert _read_with_open('access_token', held_open) == {
        'success': True, 'data': 'kong-tok'}
    assert len(opens) == 2


def test_a_read_waits_only_for_a_replace_and_not_forever(
        fake_home, gi, clean_owner_env):
    """Guard: a record that stays refused is answered with the error after
    a bounded wait, and any other error is answered at once, as before."""
    _write(fake_home, json.dumps({'user_id': '10202', 'access_token': 'kong-tok'}))
    held_open, opens = _record_held(fake_home, times=10 ** 6)
    reply = _read_with_open('access_token', held_open)
    assert reply['success'] is False and 'denied' in reply['error']
    assert 1 <= len(opens) <= 10

    _record(fake_home).write_text('{"user_id": "10202", "access_', encoding='utf-8')
    not_held, opens = _record_held(fake_home, times=0)
    reply = _read_with_open('access_token', not_held)
    assert reply['success'] is False
    assert len(opens) == 1


def test_a_post_of_the_placeholder_keeps_the_owner(fake_home, gi, clean_owner_env):
    """RED before the fix: the record and the export both became 'guest'."""
    _write(fake_home, json.dumps({'user_id': '10202', 'access_token': 'old'}))
    gi.sync_owner_identity_env()
    reply = _post_to_set_storage({'user_id': 'guest', 'access_token': 'new'})
    assert reply['success'] is True
    record = json.loads(_record(fake_home).read_text(encoding='utf-8'))
    assert record == {'user_id': '10202', 'access_token': 'new'}
    assert os.environ[OWNER_ENV] == '10202'


def test_with_nobody_signed_in_the_placeholder_is_not_stored(
        fake_home, gi, clean_owner_env):
    """RED before the fix: the record became {'user_id': 'guest'}."""
    _post_to_set_storage({'user_id': 'guest', 'hart_name': 'h'})
    record = json.loads(_record(fake_home).read_text(encoding='utf-8'))
    assert record == {'hart_name': 'h'}
    assert os.environ[OWNER_ENV] == GUEST


def test_after_sign_out_the_page_placeholder_leaves_the_desktop_to_the_guest(
        fake_home, gi, clean_owner_env):
    """Signing out on the chat page: clearAuth's clear, then the remounted
    page mirrors its state, now with no identity, as user_id 'guest'.  RED
    before the fix: the desktop owner became 'guest' (reviewer case S1),
    where signing out from the navbar leaves the hardware guest."""
    _write(fake_home, json.dumps({'user_id': '10202', 'access_token': 'tok',
                                  'email': 'x', 'hart_name': 'h'}))
    gi.sync_owner_identity_env()
    _post_to_set_storage({'user_id': '', 'access_token': '', 'email': ''})
    _post_to_set_storage({'agentname': 'Nunba', 'email': None, 'access_token': None,
                          'user_id': 'guest', 'hart_name': 'h'})
    record = json.loads(_record(fake_home).read_text(encoding='utf-8'))
    assert 'user_id' not in record
    assert os.environ[OWNER_ENV] == GUEST


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


def test_a_post_that_read_before_a_sign_out_cannot_write_the_owner_back(
        fake_home, gi, clean_owner_env):
    """Posts land on different server threads.  The page's mirror post reads
    the record, the sign-out's clear lands while it is still working, then the
    mirror writes back the record it read.  RED before the lock: 10202 and its
    token came back (reviewer case S4).

    The mirror waits after its read until the clear has answered.  With the
    lock the clear cannot answer first, so the mirror goes on after 1 s.
    """
    import threading
    _write(fake_home, json.dumps({'user_id': '10202', 'access_token': 'tok',
                                  'email': 'x', 'hart_name': 'h'}))
    gi.sync_owner_identity_env()
    read_done = threading.Event()
    clear_done = threading.Event()

    class ReadsThenWaits:
        @staticmethod
        def load(f):
            data = json.load(f)
            read_done.set()
            clear_done.wait(1)
            return data
        dump = staticmethod(json.dump)

    mirror_post = _set_storage_handler(ReadsThenWaits)
    clear_post = _set_storage_handler()
    mirror = threading.Thread(target=mirror_post, args=({'hart_emoji': 'E'},))
    mirror.start()
    assert read_done.wait(5)
    clear_post({'user_id': '', 'access_token': '', 'email': ''})
    clear_done.set()
    mirror.join(5)
    assert not mirror.is_alive()
    record = json.loads(_record(fake_home).read_text(encoding='utf-8'))
    assert record == {'hart_name': 'h', 'hart_emoji': 'E'}
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


# ── sign-out drops the stored Hevolve login (review rv_6546) ──────────────
# Sign-out cleared user_data.json but never the users row's api_token, so a
# signed-out account's login kept being used: HARTOS's central_login_for
# reads that row for a phone's cloud-agent turn (Nunba 65462fb4) and for
# recipe sync.  Fake values only.

LOGIN_A, LOGIN_B = 'fake-hevolve-login-a', 'fake-hevolve-login-b'
CENTRAL_CHAT = 'https://azurekong.hertzai.com/chat/custom_gpt'


def _signed_in(home, user_id, login):
    _write(home, json.dumps({'user_id': user_id, 'access_token': login,
                             'email': 'x', 'hart_name': 'h'}))


def test_sign_out_drops_the_accounts_stored_login(
        fake_home, gi, clean_owner_env, users_table, monkeypatch):
    store, login_of = users_table
    store('20303', LOGIN_B)
    _signed_in(fake_home, '20303', LOGIN_B)
    _post_to_set_storage({'user_id': '', 'access_token': '', 'email': ''})
    assert login_of('20303') is None
    # So its turns no longer go to central on its login: the one rule the
    # phone's cloud-agent turn asks gives nothing for it now.
    import importlib
    sync_engine = importlib.import_module('integrations.social.sync_engine')
    monkeypatch.setattr(importlib.import_module('security.key_delegation'),
                        'get_node_tier', lambda: 'flat')
    assert sync_engine.central_login_for('20303', CENTRAL_CHAT) == ''


def test_sign_out_leaves_every_other_accounts_login(
        fake_home, gi, clean_owner_env, users_table):
    store, login_of = users_table
    store('10202', LOGIN_A)
    store('20303', LOGIN_B)
    _signed_in(fake_home, '20303', LOGIN_B)
    _post_to_set_storage({'user_id': '', 'access_token': '', 'email': ''})
    assert login_of('20303') is None and login_of('10202') == LOGIN_A


def test_the_row_the_sign_in_wrote_by_email_is_dropped_too(
        fake_home, gi, clean_owner_env, users_table):
    """The sign-in writes the login into a row found by email when no row
    has the cloud id (set_storage's upsert): that row holds it too."""
    store, login_of = users_table
    local = '6c2dc0fc-7c93-4fe0-973e-f7466ff63f29'
    store(local, LOGIN_B)
    _signed_in(fake_home, '20303', LOGIN_B)
    _post_to_set_storage({'user_id': '', 'access_token': '', 'email': ''})
    assert login_of(local) is None


@pytest.mark.parametrize('posted', [
    {'hart_name': ''},                          # a HART reset, no sign-out
    {'email': ''},
    {'user_id': 'guest', 'access_token': None},
])
def test_a_post_that_is_no_sign_out_keeps_the_login(
        fake_home, gi, clean_owner_env, users_table, posted):
    store, login_of = users_table
    store('20303', LOGIN_B)
    _signed_in(fake_home, '20303', LOGIN_B)
    _post_to_set_storage(posted)
    assert login_of('20303') == LOGIN_B


def test_the_sign_out_log_names_rows_never_the_login(
        fake_home, gi, clean_owner_env, users_table, caplog):
    import logging
    caplog.set_level(logging.DEBUG)
    store, _login_of = users_table
    store('20303', LOGIN_B)
    _signed_in(fake_home, '20303', LOGIN_B)
    _post_to_set_storage({'user_id': '', 'access_token': '', 'email': ''})
    assert '20303' in caplog.text and LOGIN_B not in caplog.text


# ── a phone the owner allowed never reaches this desktop's sign-in ────────
# Review rv_6546, measured through HARTOS's real gate: a phone allowed as
# account B (20303) posted /api/storage/set {user_id: '20303',
# access_token: ''} from the LAN and got 200.  The gate holds a phone to its
# own account by the body's user_id, and that body names it, so the post
# went on: the record then named 20303 beside owner A's email, and the
# sign-out drop took A's stored login off A's row (10202).  The read half
# was older: the same phone could GET /api/storage/get/access_token and be
# answered with A's login.  user_data.json is the desktop's own sign-in.
# Only the desktop's own page calls these routes (useAuthSession,
# useStorageSync, SettingsPage, Demopage); the phone app calls neither
# (Hevolve_React_Native, source and history), and HARTOS's mobile_paths
# route neither to a desktop.  Fake values only.

LOGIN_C = 'fake-hevolve-login-c'


def _owner_a_signed_in(home, users_table):
    store, _login_of = users_table
    store('10202', LOGIN_A)
    _write(home, json.dumps({'user_id': '10202', 'access_token': LOGIN_A,
                             'email': 'a@example.com', 'agentname': 'Nunba'}))


def _refusal(reply, status):
    """The body of a refusal with ``status``: the route's own jsonify is
    stood in for (a dict), a guard's is Flask's (a Response)."""
    assert isinstance(reply, tuple) and reply[1] == status, \
        f'the caller was answered ({reply!r}), not refused with {status}'
    body = reply[0]
    return body.get_json() if hasattr(body, 'get_json') else body


def _refused_as_desktop_only(reply):
    body = _refusal(reply, 403)
    assert body['success'] is False
    assert "This desktop's sign-in is managed on the desktop" in body['error']
    return body


@pytest.mark.parametrize('posted', [
    {'user_id': '20303', 'access_token': ''},           # the measured post
    {'user_id': '20303', 'access_token': LOGIN_B,       # a sign-in as itself
     'email': 'b@example.com', 'agentname': 'Nunba'},
])
def test_a_phone_cannot_write_this_desktops_sign_in(
        fake_home, gi, clean_owner_env, users_table, posted):
    _owner_a_signed_in(fake_home, users_table)
    gi.sync_owner_identity_env()
    before = _record(fake_home).read_text(encoding='utf-8')
    _refused_as_desktop_only(_post_to_set_storage(posted, phone='20303'))
    assert _record(fake_home).read_text(encoding='utf-8') == before
    _store, login_of = users_table
    assert login_of('10202') == LOGIN_A, "the owner's stored login was dropped"
    assert login_of('20303') == 'NO ROW'
    assert os.environ[OWNER_ENV] == '10202'


@pytest.mark.parametrize('key', ['access_token', 'user_id', 'email'])
def test_a_phone_cannot_read_this_desktops_sign_in(
        fake_home, gi, clean_owner_env, users_table, key):
    _owner_a_signed_in(fake_home, users_table)
    body = _refused_as_desktop_only(_get_storage(key, phone='20303'))
    assert 'data' not in body and LOGIN_A not in json.dumps(body)


def test_the_desktops_own_page_still_signs_in_reads_and_signs_out(
        fake_home, gi, clean_owner_env, users_table):
    """What the page itself needs from these routes, from this machine
    (git history: d700eaa7 reads each key back on mount, 0f9151da merges,
    f2e8fe71 signs out with the '' sentinel)."""
    _store, login_of = users_table
    reply = _post_to_set_storage({'user_id': '10202', 'access_token': LOGIN_A,
                                  'email': 'a@example.com', 'agentname': 'Nunba'})
    assert reply['success'] is True and login_of('10202') == LOGIN_A
    assert _get_storage('access_token') == {'success': True, 'data': LOGIN_A}
    assert _get_storage('user_id') == {'success': True, 'data': '10202'}
    _post_to_set_storage({'user_id': '', 'access_token': '', 'email': ''})
    assert _get_storage('access_token') == {'success': False,
                                            'error': 'Key not found'}
    assert login_of('10202') is None


# ── a sign-in that replaces the account drops the replaced one's login ────
# Signing in as C while A was signed in, with no sign-out between, left A's
# row holding A's Hevolve login, so a phone allowed as A kept spending on it
# (review rv_6546, minor).  The switch drops it as sign-out does.

def test_signing_in_as_another_account_drops_the_replaced_accounts_login(
        fake_home, gi, clean_owner_env, users_table):
    _owner_a_signed_in(fake_home, users_table)
    _store, login_of = users_table
    _post_to_set_storage({'user_id': '30404', 'access_token': LOGIN_C,
                          'email': 'c@example.com', 'agentname': 'Nunba'})
    assert login_of('10202') is None, "the replaced account kept its login"
    assert login_of('30404') == LOGIN_C
    record = json.loads(_record(fake_home).read_text(encoding='utf-8'))
    assert record['user_id'] == '30404'


@pytest.mark.parametrize('posted_id', ['10202', 10202])
def test_the_same_account_signing_in_again_keeps_its_new_login(
        fake_home, gi, clean_owner_env, users_table, posted_id):
    """A refreshed login, or the page's mirror naming the account again (as
    a number or a string), is no switch."""
    _owner_a_signed_in(fake_home, users_table)
    _store, login_of = users_table
    _post_to_set_storage({'user_id': posted_id,
                          'access_token': 'fake-hevolve-login-a2',
                          'email': 'a@example.com', 'agentname': 'Nunba'})
    assert login_of('10202') == 'fake-hevolve-login-a2'


def test_a_switch_from_an_account_that_is_no_cloud_id_leaves_its_row(
        fake_home, gi, clean_owner_env, users_table):
    """An account this node numbers itself (a uuid, not a cloud id) holds no
    Hevolve login (central_login_for reads cloud ids only): its row's
    api_token is this node's own token, and it stays."""
    store, login_of = users_table
    store(USER_ID, 'fake-node-own-token')
    _write(fake_home, json.dumps({'user_id': USER_ID,
                                  'access_token': 'fake-node-own-token'}))
    _post_to_set_storage({'user_id': '30404', 'access_token': LOGIN_C,
                          'email': 'c@example.com', 'agentname': 'Nunba'})
    assert login_of(USER_ID) == 'fake-node-own-token'
    assert login_of('30404') == LOGIN_C


# ── a LAN device with a guest JWT never reaches this desktop's sign-in ────
# Review rv_aedb, measured through HARTOS's real gate on aedb1fb7 and on its
# parent: a device on the LAN registers as a guest on the exempt
# /api/social/auth/guest-register, and the bundled gate lets that JWT
# through as 'jwt'.  GET /api/storage/get/access_token answered 200 with the
# owner's login, and POST /api/storage/set {user_id: 99999} made 99999 the
# desktop owner.  Both routes take require_local_or_token now: the page on
# this machine (127.0.0.1) or the local token, and nobody else; a phone the
# owner allowed still hears why (above).  Fake values only.

@pytest.fixture
def plain_address_rule(monkeypatch):
    """The loopback rule as an installed desktop has it: no staging trust
    (NUNBA_CI) and no trusted proxy."""
    for name in ('NUNBA_CI', 'TRUSTED_PROXY'):
        monkeypatch.delenv(name, raising=False)


def _refused_as_not_local(reply):
    body = _refusal(reply, 401)
    assert body['error'] == 'Unauthorized'
    return body


@pytest.mark.parametrize('posted', [
    {'user_id': '99999'},                                 # the measured post
    {'user_id': '99999', 'access_token': GUEST_JWT,       # a whole sign-in
     'email': 'guest@example.com', 'agentname': 'Nunba'},
    {'user_id': '', 'access_token': '', 'email': ''},     # a sign-out
])
def test_a_lan_guest_jwt_cannot_write_this_desktops_sign_in(
        fake_home, gi, clean_owner_env, users_table, plain_address_rule,
        posted):
    _owner_a_signed_in(fake_home, users_table)
    gi.sync_owner_identity_env()
    before = _record(fake_home).read_text(encoding='utf-8')
    _refused_as_not_local(_post_to_set_storage(posted, guest=True))
    assert _record(fake_home).read_text(encoding='utf-8') == before
    _store, login_of = users_table
    assert login_of('10202') == LOGIN_A, "the owner's stored login was dropped"
    assert login_of('99999') == 'NO ROW'
    assert os.environ[OWNER_ENV] == '10202'


@pytest.mark.parametrize('key', ['access_token', 'user_id', 'email'])
def test_a_lan_guest_jwt_cannot_read_this_desktops_sign_in(
        fake_home, gi, clean_owner_env, users_table, plain_address_rule, key):
    _owner_a_signed_in(fake_home, users_table)
    body = _refused_as_not_local(_get_storage(key, guest=True))
    assert 'data' not in body and LOGIN_A not in json.dumps(body)


def test_the_desktops_own_page_keeps_its_hart_reset_and_account_switch(
        fake_home, gi, clean_owner_env, users_table, plain_address_rule):
    """The rest of what the page does here, from 127.0.0.1 through the
    guard: SettingsPage's HART reset (hart_* cleared with '', the sign-in
    kept) and a sign-in as another account over the one on file."""
    _owner_a_signed_in(fake_home, users_table)
    assert _post_to_set_storage({'hart_sealed': True, 'hart_name': 'Ava',
                                 'hart_emoji': 'x', 'hart_language': 'en'}
                                )['success'] is True
    reset = _post_to_set_storage({'hart_sealed': '', 'hart_name': '',
                                  'hart_emoji': '', 'hart_language': ''})
    assert reset['success'] is True
    record = json.loads(_record(fake_home).read_text(encoding='utf-8'))
    assert not [k for k in record if k.startswith('hart_')]
    assert _get_storage('access_token') == {'success': True, 'data': LOGIN_A}
    switch = _post_to_set_storage({'user_id': '30404', 'access_token': LOGIN_C,
                                   'email': 'c@example.com',
                                   'agentname': 'Nunba'})
    assert switch['success'] is True
    assert _get_storage('user_id') == {'success': True, 'data': '30404'}
    assert _get_storage('access_token') == {'success': True, 'data': LOGIN_C}


def test_through_hartos_gate_a_lan_guest_jwt_is_refused_and_the_page_is_not(
        fake_home, gi, clean_owner_env, users_table, plain_address_rule,
        monkeypatch):
    """The hop the reviewer measured: HARTOS's real API gate
    (security.middleware.install_api_gate, as on a bundled desktop) in front
    of app.py's two routes with the guards app.py puts on them.  The gate's
    JWT check (integrations.social.auth.decode_jwt) answers the fake guest
    token with guest-register's claims, so the gate lets it through as
    'jwt' as it did the real one, and what refuses it is the route's guard
    (its 401, not the gate's).  The page, from 127.0.0.1 with no
    credential, reads back, signs out and signs in."""
    import sys
    from types import SimpleNamespace

    import flask
    middleware = pytest.importorskip('security.middleware')
    if not hasattr(middleware, 'install_api_gate'):
        pytest.skip('this HARTOS predates install_api_gate')
    monkeypatch.setenv('NUNBA_BUNDLED', '1')
    monkeypatch.delenv('HEVOLVE_API_KEY', raising=False)
    monkeypatch.setitem(sys.modules, 'security.secrets_manager',
                        SimpleNamespace(get_secret=lambda name: ''))
    admitted = []

    def decode_jwt(token):
        claims = dict(GUEST_CLAIMS) if token == GUEST_JWT else {}
        admitted.append(bool(claims))
        return claims
    monkeypatch.setitem(sys.modules, 'integrations.social.auth',
                        SimpleNamespace(decode_jwt=decode_jwt,
                                        log_refused_credential=lambda **kw: None))
    app = flask.Flask('desktop')
    for name, rule, methods in (
            ('set_storage', '/api/storage/set', ['POST']),
            ('get_storage', '/api/storage/get/<key>', ['GET'])):
        ns = _route_body(name)
        ns.update(request=flask.request, jsonify=flask.jsonify)
        app.add_url_rule(rule, name, ns[name], methods=methods)
    assert middleware.install_api_gate(app) is True
    client = app.test_client()
    _owner_a_signed_in(fake_home, users_table)
    gi.sync_owner_identity_env()
    before = _record(fake_home).read_text(encoding='utf-8')

    lan = {'REMOTE_ADDR': LAN_DEVICE}
    guest = {'Authorization': f'Bearer {GUEST_JWT}'}
    read = client.get('/api/storage/get/access_token',
                      environ_base=lan, headers=guest)
    write = client.post('/api/storage/set', json={'user_id': '99999'},
                        environ_base=lan, headers=guest)
    assert admitted == [True, True], 'the gate did not let the guest JWT by'
    for reply in (read, write):
        assert reply.status_code == 401, reply.get_data(as_text=True)
        assert reply.get_json()['error'] == 'Unauthorized'
        assert LOGIN_A not in reply.get_data(as_text=True)
    assert _record(fake_home).read_text(encoding='utf-8') == before
    assert os.environ[OWNER_ENV] == '10202'

    page = {'REMOTE_ADDR': LOOPBACK}
    assert client.get('/api/storage/get/access_token',
                      environ_base=page).get_json() == {'success': True,
                                                        'data': LOGIN_A}
    signed_out = client.post('/api/storage/set', environ_base=page, json={
        'user_id': '', 'access_token': '', 'email': ''})
    assert signed_out.status_code == 200
    assert signed_out.get_json()['success'] is True
    signed_in = client.post('/api/storage/set', environ_base=page, json={
        'user_id': '10202', 'access_token': LOGIN_A,
        'email': 'a@example.com', 'agentname': 'Nunba'})
    assert signed_in.status_code == 200
    assert signed_in.get_json()['success'] is True
    assert client.get('/api/storage/get/user_id',
                      environ_base=page).get_json() == {'success': True,
                                                        'data': '10202'}


def test_one_guard_is_the_home_of_the_phone_refusal():
    """set_storage and get_storage carry the same one guard from
    routes.auth, and app.py holds no copy of its phone check or its
    sentence (review rv_aedb: aedb1fb7 had both inline, once per route)."""
    source = (REPO / 'app.py').read_text(encoding='utf-8')
    fns = {n.name: n for n in ast.walk(ast.parse(source))
           if isinstance(n, ast.FunctionDef)
           and n.name in ('set_storage', 'get_storage')}

    def guards(fn):
        return [ast.unparse(d) for d in fn.decorator_list
                if not (isinstance(d, ast.Call)
                        and isinstance(d.func, ast.Attribute)
                        and d.func.attr == 'route')]
    assert len(guards(fns['set_storage'])) == 1
    assert guards(fns['set_storage']) == guards(fns['get_storage'])
    for fn in fns.values():
        assert 'is_admitted_device' not in ast.unparse(fn), fn.name
    assert "This desktop's sign-in is managed" not in source


# 2026-11-24: an OTP sign-in posts {user_id, access_token, email} with no
# agentname (the page has not loaded the agent's name yet).  The sync to the
# users table needed all four keys, so that post bound nothing; the page's
# first calls with the new token got 401 from the social API and the page
# deleted the token (twice that day).  agentname is the username of a NEW
# row and nothing else; since the review of 82e62c0e (below) the email is
# not needed either.

def test_the_sign_in_post_binds_the_new_token_to_the_existing_row(
        fake_home, gi, clean_owner_env, users_table):
    """RED before the fix: the row kept the old login."""
    store, login_of = users_table
    store('10202', 'old-login')
    _post_to_set_storage({'user_id': '10202', 'access_token': 'kong-new',
                          'email': '10202@example.com'})
    assert login_of('10202') == 'kong-new'
    # The very lookup the social API makes for an opaque cloud token
    # (HARTOS integrations/social/auth.py, User.api_token == token).
    import importlib
    models = importlib.import_module('integrations.social.models')
    with models.db_session(commit=False) as s:
        row = s.query(models.User).filter(models.User.api_token == 'kong-new').first()
        assert row is not None and row.id == '10202'


# Review of 82e62c0e (hartos-17, 11-25): the sign-in post binds the token by
# user_id alone.  A phone-only account's sign-in answer has no email, so its
# post carries none; a first sign-in on this desktop finds no users row, and
# its post has no agentname.  Both posts bound nothing, the page's first
# calls with the new token got 401, and the page deleted the token.

def _found_by_token(token):
    """(id, email) of the account the social API finds for an opaque cloud
    token (HARTOS integrations/social/auth.py, User.api_token == token)."""
    import importlib
    models = importlib.import_module('integrations.social.models')
    with models.db_session(commit=False) as s:
        row = s.query(models.User).filter(models.User.api_token == token).first()
        return (row.id, row.email) if row else None


def test_a_sign_in_post_with_no_email_binds_the_token_by_user_id(
        fake_home, gi, clean_owner_env, users_table):
    """A phone-only account.  RED before the fix: the row kept the old login."""
    store, login_of = users_table
    store('10202', 'old-login')
    _post_to_set_storage({'user_id': '10202', 'access_token': 'kong-new'})
    assert login_of('10202') == 'kong-new'
    # Found by the new token, and the email on file stays.
    assert _found_by_token('kong-new') == ('10202', '10202@example.com')


def test_the_first_sign_in_on_this_desktop_makes_the_row_without_agentname(
        fake_home, gi, clean_owner_env, users_table):
    """No row yet and no agentname in the post.  RED before the fix: no row."""
    _store, login_of = users_table
    _post_to_set_storage({'user_id': '777', 'access_token': 'kong-new',
                          'email': '777@example.com'})
    assert login_of('777') == 'kong-new'
    assert _found_by_token('kong-new') == ('777', '777@example.com')
    # The page's mirror posts agentname later; the row stays bound.
    _post_to_set_storage({'agentname': 'Nunba', 'user_id': '777',
                          'access_token': 'kong-new', 'email': '777@example.com'})
    assert login_of('777') == 'kong-new'


def test_phone_only_first_sign_ins_bind_each_account_to_its_own_row(
        fake_home, gi, clean_owner_env, users_table):
    """Two phone-only accounts sign in here for the first time, one after
    the other.  With no email posted nothing is looked up by email
    (`email == None` is IS NULL and finds the first account's row), and
    each new row gets a username of its own.  RED before the fix: no row."""
    _store, login_of = users_table
    _post_to_set_storage({'user_id': '555', 'access_token': 'kong-555'})
    _post_to_set_storage({'user_id': '10202', 'access_token': 'kong-new'})
    assert login_of('10202') == 'kong-new'
    assert _found_by_token('kong-new') == ('10202', None)
