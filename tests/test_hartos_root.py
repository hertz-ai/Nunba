"""The one rule for where HARTOS is (tests/hartos_root.py), and a source
guard over who uses it.  The guard's exact claim is above the guard, below."""
import ast
import os

import pytest

from tests import hartos_root as rule

_TESTS = os.path.dirname(os.path.abspath(__file__))


def _a_hartos(folder):
    (folder / 'core').mkdir(parents=True)
    (folder / 'core' / 'constants.py').write_text('')
    return str(folder)


def test_hartos_repo_wins_when_it_names_a_hartos_tree(tmp_path, monkeypatch):
    named = _a_hartos(tmp_path / 'named')
    monkeypatch.setenv('HARTOS_REPO', named)

    assert rule.hartos_root() == named


def test_a_hartos_repo_that_is_not_a_hartos_tree_is_passed_over(tmp_path, monkeypatch):
    """Before, one test took HARTOS_REPO as given and skipped on a wrong
    value even with a real checkout beside it."""
    beside = _a_hartos(tmp_path / 'work' / 'HARTOS')
    monkeypatch.setattr(rule, '_HERE', str(tmp_path / 'work' / 'Nunba-HART-Companion'))
    monkeypatch.setenv('HARTOS_REPO', str(tmp_path / 'nowhere'))

    assert rule.hartos_root() == beside


def test_the_checkout_beside_nunba_comes_before_an_installed_core(tmp_path, monkeypatch):
    beside = _a_hartos(tmp_path / 'work' / 'HARTOS')
    monkeypatch.setattr(rule, '_HERE', str(tmp_path / 'work' / 'Nunba-HART-Companion'))
    monkeypatch.delenv('HARTOS_REPO', raising=False)

    assert rule.hartos_root() == beside


def test_with_neither_it_is_wherever_core_is_imported_from_or_none(tmp_path, monkeypatch):
    monkeypatch.setattr(rule, '_HERE', str(tmp_path / 'alone' / 'Nunba-HART-Companion'))
    monkeypatch.delenv('HARTOS_REPO', raising=False)

    found = rule.hartos_root()

    try:
        import core.constants as constants
    except ImportError:
        assert found is None
    else:
        assert found == os.path.dirname(os.path.dirname(os.path.abspath(constants.__file__)))


def test_the_places_looked_at_are_named(monkeypatch):
    monkeypatch.setenv('HARTOS_REPO', 'Z:/nowhere/HARTOS')

    text = rule.searched()

    assert 'HARTOS_REPO=Z:/nowhere/HARTOS' in text
    assert os.path.join(os.path.dirname(rule._HERE), 'HARTOS') in text
    assert 'core' in text


# ---------------------------------------------------------------------------
# Source guard
# ---------------------------------------------------------------------------
# What it enforces, and no more:
#   1. the three test files that were moved onto tests/hartos_root.py locate
#      HARTOS nowhere else;
#   2. no OTHER test file starts locating HARTOS for itself.  The files that
#      already do are listed in _NOT_MOVED and left as they are: each puts the
#      sibling on sys.path or skips in its own way, and moving them onto the
#      rule would change which HARTOS they read when HARTOS_REPO is set.
# The first version (d54c7a8b) claimed "no test file ... for itself" and
# checked far less: only files that mentioned HARTOS_REPO, only this folder,
# and with an expression that stopped at the first nested bracket, so
# `os.path.join(os.path.dirname(REPO), 'HARTOS')` put back into a moved file
# passed (review rv_n7).  The source is now read as a syntax tree.

_MOVED_ONTO_THE_RULE = (
    'test_embed_has_the_mx_lookup_dep.py',
    'test_source_guard_one_ctx_size_authority.py',
    'test_vlm_stop_route_reachable.py',
)

# Test files that build a path with a part named 'HARTOS' themselves (some to
# the sibling checkout, some inside a temp folder they made).  Not moved.
_NOT_MOVED = frozenset({
    'test_admin_models_lifecycle.py',
    'test_agent_pipeline_uat.py',
    'test_an_agent_contact_says_who_asks.py',
    'test_build_hartos_sync.py',
    'test_build_tmp_sweep.py',
    'test_caption_model_download_consent.py',
    'test_caption_server_spawn_lock.py',
    'test_embed_payload_hygiene.py',
    'test_gguf_quant_choice.py',
    'test_hartos_lib_shadowing.py',
    'test_mcp_auth.py',
    'test_peer_link_mounted.py',
    'test_preferred_lang_fallback.py',
    'test_rebuild_python_embed.py',
    'test_session_fixes_runtime.py',
    'test_setup_freeze_root_module_source.py',
    'test_spawn_records_residency.py',
    'test_switch_model_reports_the_truth.py',
    'test_torch_install_is_per_engine.py',
    'test_weight_file_complete_is_hartos_rule.py',
    'harness/conftest.py',
    'harness/test_family_e_chat_roundtrip.py',
    'harness/test_family_f_logs.py',
    'harness/test_family_h_vram.py',
    'harness/test_family_k_latency.py',
    'harness/test_family_l_security.py',
    'harness/test_family_n_injected_failure.py',
    'harness/test_family_o_concurrency.py',
})
_THE_RULE_AND_ITS_TEST = frozenset({'hartos_root.py', 'test_hartos_root.py'})


def _own_rule_sites(source):
    """(line, what) for every place a source locates HARTOS for itself: a read
    of HARTOS_REPO from the environment, or a path built with a part named
    'HARTOS' (os.path.join(..., 'HARTOS', ...) or <path> / 'HARTOS').  What
    sits inside an assert is a comparison, not a lookup, and is left out."""
    tree = ast.parse(source)
    inside_asserts = {id(node) for statement in ast.walk(tree)
                      if isinstance(statement, ast.Assert) for node in ast.walk(statement)}

    def is_text(node, text):
        return isinstance(node, ast.Constant) and node.value == text

    sites = []
    for node in ast.walk(tree):
        if id(node) in inside_asserts:
            continue
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            owner = node.func.value
            from_environ = (
                node.func.attr == 'getenv'
                or (node.func.attr == 'get' and (
                    (isinstance(owner, ast.Attribute) and owner.attr == 'environ')
                    or (isinstance(owner, ast.Name) and owner.id == 'environ'))))
            if from_environ and node.args and is_text(node.args[0], 'HARTOS_REPO'):
                sites.append((node.lineno, 'reads HARTOS_REPO'))
            if node.func.attr == 'join' and any(is_text(arg, 'HARTOS') for arg in node.args):
                sites.append((node.lineno, "joins a path with 'HARTOS'"))
        if (isinstance(node, ast.Subscript) and is_text(node.slice, 'HARTOS_REPO')
                and isinstance(node.value, ast.Attribute) and node.value.attr == 'environ'):
            sites.append((node.lineno, 'reads HARTOS_REPO'))
        if (isinstance(node, ast.BinOp) and isinstance(node.op, ast.Div)
                and is_text(node.right, 'HARTOS')):
            sites.append((node.lineno, "builds <path> / 'HARTOS'"))
    return sorted(set(sites))


def _test_files():
    """Every .py under tests/, as 'name.py' or 'folder/name.py'."""
    for folder, _folders, names in os.walk(_TESTS):
        for name in sorted(names):
            if name.endswith('.py'):
                path = os.path.join(folder, name)
                yield os.path.relpath(path, _TESTS).replace(os.sep, '/'), path


def _read(path):
    with open(path, encoding='utf-8', errors='replace') as fh:
        return fh.read()


_REVIEWERS_LINE = "hartos = os.environ.get('HARTOS_REPO') or os.path.join(\n    os.path.dirname(REPO), 'HARTOS')\n"


@pytest.mark.parametrize('source, found', [
    # the line the first guard let back in (rv_n7): nested brackets, two lines
    (_REVIEWERS_LINE, [(1, "joins a path with 'HARTOS'"), (1, 'reads HARTOS_REPO')]),
    # the join alone, as rv_n7 put it back: no HARTOS_REPO on the line
    ("hartos = os.path.join(os.path.dirname(REPO), 'HARTOS')\n",
     [(1, "joins a path with 'HARTOS'")]),
    ("_HARTOS = os.path.normpath(os.path.join(_ROOT, '..', 'HARTOS'))\n",
     [(1, "joins a path with 'HARTOS'")]),
    ("x = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),\n"
     "                 'HARTOS', 'core')\n", [(1, "joins a path with 'HARTOS'")]),
    ("HARTOS = NUNBA.parent / 'HARTOS'\n", [(1, "builds <path> / 'HARTOS'")]),
    ("p = REPO.parent / 'HARTOS' / 'core' / 'constants.py'\n", [(1, "builds <path> / 'HARTOS'")]),
    ("root = os.environ['HARTOS_REPO']\n", [(1, 'reads HARTOS_REPO')]),
    ("root = os.getenv('HARTOS_REPO', '')\n", [(1, 'reads HARTOS_REPO')]),
    ("from os import environ\nroot = environ.get('HARTOS_REPO')\n", [(2, 'reads HARTOS_REPO')]),
    # not a lookup
    ("assert os.path.join(os.path.dirname(_ROOT), 'HARTOS') in why_not\n", []),
    ("monkeypatch.setenv('HARTOS_REPO', str(named))\nmonkeypatch.delenv('HARTOS_REPO', raising=False)\n", []),
    ("# hartos = os.path.join(os.path.dirname(REPO), 'HARTOS')\n"
     "TEXT = 'set HARTOS_REPO, or check out HARTOS beside Nunba'\n", []),
    ("from tests.hartos_root import hartos_root\nhartos = hartos_root()\n", []),
    ("x = os.path.join(root, 'HARTOS_backup')\ny = d.get('HARTOS_REPO')\n", []),
], ids=lambda value: value.splitlines()[0][:50] if isinstance(value, str) else '')
def test_how_a_lookup_of_hartos_is_recognised(source, found):
    assert _own_rule_sites(source) == found


@pytest.mark.parametrize('name', _MOVED_ONTO_THE_RULE)
def test_source_guard_a_test_moved_onto_the_rule_keeps_none_of_its_own(name):
    source = _read(os.path.join(_TESTS, name))

    assert 'tests.hartos_root import' in source, f'{name} no longer asks tests/hartos_root.py'
    assert _own_rule_sites(source) == []


@pytest.mark.parametrize('name', _MOVED_ONTO_THE_RULE)
def test_source_guard_the_reviewers_line_put_back_is_caught(name):
    """The exact regression rv_n7 showed passing: the old lookup put back into
    a moved file, here in a copy of its text."""
    source = _read(os.path.join(_TESTS, name)) + '\n' + _REVIEWERS_LINE

    assert sorted(what for _line, what in _own_rule_sites(source)) == [
        "joins a path with 'HARTOS'", 'reads HARTOS_REPO']


def test_source_guard_no_other_test_file_starts_locating_hartos_for_itself():
    """Every folder under tests/, not only this one.  A new file found here
    should import tests/hartos_root.py; a listed file that no longer does it
    comes off the list."""
    doing_it = set()
    for name, path in _test_files():
        if name in _THE_RULE_AND_ITS_TEST:
            continue
        try:
            if _own_rule_sites(_read(path)):
                doing_it.add(name)
        except SyntaxError:
            continue

    assert doing_it - _NOT_MOVED == set(), 'new own lookups of HARTOS'
    assert _NOT_MOVED - doing_it == set(), 'listed, and no longer locating HARTOS itself'
    assert not doing_it & set(_MOVED_ONTO_THE_RULE)
