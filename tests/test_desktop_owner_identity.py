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
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parent.parent
USER_ID = 'd68c9dee-b324-4c04-86c4-1205a836957f'
GUEST = 'g_0123456789abcdef'


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
    main = _functions_calling('main.py', {'_export_owner_identity',
                                          'call_stop_api'},
                              'get_desktop_owner_id')
    assert app == {'set_storage': True, 'get_storage': True,
                   'check_existing_user_data': True}, app
    assert main == {'_export_owner_identity': True, 'call_stop_api': True}, main


def test_main_does_not_derive_its_own_record_path():
    """RED before the fix: main.py joined get_data_dir()/storage/user_data.json."""
    tree = ast.parse((REPO / 'main.py').read_text(encoding='utf-8'))
    own = [n.lineno for n in ast.walk(tree)
           if isinstance(n, ast.Constant) and n.value == 'user_data.json']
    assert own == [], (
        f'main.py names user_data.json itself at lines {own}; the path must '
        'come from desktop.guest_identity.get_user_data_file_path()')
