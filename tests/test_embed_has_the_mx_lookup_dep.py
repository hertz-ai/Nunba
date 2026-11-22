"""python-embed must carry dnspython, the MX lookup HARTOS's mailbox code uses.

HARTOS d072f8ea6 declares dnspython==2.7.0 in its requirements.txt:
integrations/channels/mailing_list._mx_host does `import dns.resolver` to find
a domain's mail host, and falls back to `dig`, which Windows does not have.
HARTOS is installed into the bundle with --no-deps and cx_Freeze never traces
its modules, so a HARTOS dependency reaches the frozen app only when
scripts/deps.py names it.  Without this entry the installed app has no MX
lookup at all.

The distribution is "dnspython" and the folder it installs is "dns", so the
folder name is listed too: build.py's presence check
(deps.missing_embed_packages) would otherwise look for a "dnspython" folder,
never find it, and fail every build.
"""
import ast
import os
import re
import sys

import pytest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_ROOT, 'scripts'))

import deps  # noqa: E402

_GUARD_WITH_THE_RESOLVER = os.path.join(
    _ROOT, 'tests', 'test_source_guard_one_ctx_size_authority.py')


def _hartos_root():
    """Where HARTOS lives, or None: HARTOS_REPO, the sibling checkout, then
    whatever provides `core` to this interpreter.  The rule is the one in
    test_source_guard_one_ctx_size_authority.py and is taken from there, not
    written again; that module cannot be imported for it (importing it runs
    the guard), so its one function is read out of its source."""
    with open(_GUARD_WITH_THE_RESOLVER, encoding='utf-8') as fh:
        tree = ast.parse(fh.read())
    wanted = [node for node in tree.body
              if isinstance(node, ast.FunctionDef) and node.name == '_hartos_root']
    assert len(wanted) == 1, 'the HARTOS resolver moved out of ' + _GUARD_WITH_THE_RESOLVER
    scope = {'os': os, '__file__': _GUARD_WITH_THE_RESOLVER}
    exec(compile(ast.Module(body=wanted, type_ignores=[]),  # noqa: S102
                 _GUARD_WITH_THE_RESOLVER, 'exec'), scope)
    return scope['_hartos_root']()


def _searched():
    """The places that rule looks, for a skip text that says where it looked."""
    return (f"HARTOS_REPO={os.environ.get('HARTOS_REPO') or '(unset)'}, "
            f"{os.path.join(os.path.dirname(_ROOT), 'HARTOS')}, "
            f"and the `core` package on this interpreter's path")


def _hartos_requirements():
    """(path, why not): HARTOS's own requirements.txt, or None and the reason."""
    root = _hartos_root()
    if root is None:
        return None, f'HARTOS was not found (looked at {_searched()})'
    path = os.path.join(root, 'requirements.txt')
    if not os.path.isfile(path):
        return None, (f'HARTOS is at {root} but has no requirements.txt there '
                      f'(an installed wheel ships none)')
    return path, ''


def _pin_in(path, name):
    with open(path, encoding='utf-8') as fh:
        found = re.findall(rf'(?im)^{re.escape(name)}==(\S+)\s*$', fh.read())
    return found[0] if len(found) == 1 else None


def test_the_frozen_dependency_set_carries_dnspython():
    pin = deps.EMBED_DEPS.get('dnspython')
    assert pin, 'EMBED_DEPS has no pinned dnspython'
    assert f'dnspython=={pin}' in deps.get_embed_install_list()
    assert deps.get_all_deps().get('dnspython') == pin


def test_the_pin_is_the_one_hartos_declares():
    """One pin, HARTOS's: read from its requirements.txt, not typed again."""
    declared, why_not = _hartos_requirements()
    if declared is None:
        pytest.skip(f'{why_not}: its dnspython pin cannot be read')
    hartos_pin = _pin_in(declared, 'dnspython')
    assert hartos_pin, f'{declared} declares no single dnspython pin'
    assert deps.EMBED_DEPS.get('dnspython') == hartos_pin


def test_requirements_txt_is_what_deps_py_generates(tmp_path):
    """requirements.txt is generated (python scripts/deps.py requirements) and
    is what macOS and Linux CI and a developer install read; e0957cfc added
    the entry and left the file as it was."""
    fresh = tmp_path / 'requirements.txt'
    deps.generate_requirements(str(fresh))
    with open(os.path.join(_ROOT, 'requirements.txt'), encoding='utf-8') as fh:
        committed = fh.read().splitlines()

    assert committed == fresh.read_text(encoding='utf-8').splitlines()
    assert f"dnspython=={deps.EMBED_DEPS.get('dnspython')}" in committed


def test_it_is_looked_for_in_the_folder_it_installs():
    assert deps.embed_package_dir_name('dnspython') == 'dns'


def test_an_embed_with_the_dns_folder_is_complete(tmp_path):
    (tmp_path / 'dns').mkdir()
    for name in deps.EMBED_DEPS:
        if name != 'dnspython':
            os.makedirs(tmp_path / deps.embed_package_dir_name(name), exist_ok=True)

    assert deps.missing_embed_packages(str(tmp_path)) == []


def test_an_embed_without_the_dns_folder_is_reported(tmp_path):
    for name in deps.EMBED_DEPS:
        if name != 'dnspython':
            os.makedirs(tmp_path / deps.embed_package_dir_name(name), exist_ok=True)
    # a folder under the distribution's name is not the package
    (tmp_path / 'dnspython').mkdir(exist_ok=True)

    assert 'dnspython' in deps.missing_embed_packages(str(tmp_path))


def test_hartos_is_found_by_the_one_rule_including_hartos_repo(tmp_path, monkeypatch):
    """HARTOS_REPO names a checkout and wins, as it does for the guard the
    rule comes from; the first version here ignored it."""
    named = tmp_path / 'a_hartos_checkout'
    (named / 'core').mkdir(parents=True)
    (named / 'core' / 'constants.py').write_text('')
    (named / 'requirements.txt').write_text('flask==1.0\ndnspython==9.9.9\n')
    monkeypatch.setenv('HARTOS_REPO', str(named))

    path, why_not = _hartos_requirements()

    assert (path, why_not) == (str(named / 'requirements.txt'), '')
    assert _pin_in(path, 'dnspython') == '9.9.9'


def test_a_hartos_without_requirements_txt_says_where_it_is(tmp_path, monkeypatch):
    named = tmp_path / 'a_hartos_wheel'
    (named / 'core').mkdir(parents=True)
    (named / 'core' / 'constants.py').write_text('')
    monkeypatch.setenv('HARTOS_REPO', str(named))

    path, why_not = _hartos_requirements()

    assert path is None
    assert str(named) in why_not and 'requirements.txt' in why_not


def test_no_hartos_at_all_lists_where_it_looked(monkeypatch):
    monkeypatch.setenv('HARTOS_REPO', 'Z:/nowhere/HARTOS')
    monkeypatch.setitem(globals(), '_hartos_root', lambda: None)

    path, why_not = _hartos_requirements()

    assert path is None
    assert 'HARTOS_REPO=Z:/nowhere/HARTOS' in why_not
    assert os.path.join(os.path.dirname(_ROOT), 'HARTOS') in why_not
    assert 'core' in why_not and 'wheel' not in why_not
