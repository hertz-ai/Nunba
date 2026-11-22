"""The one rule for where HARTOS is (tests/hartos_root.py), and that the
tests which need HARTOS use it and keep no rule of their own."""
import os
import re

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


def test_source_guard_the_tests_that_need_hartos_ask_the_one_rule():
    """No test file reads HARTOS_REPO, or builds the sibling path, for itself."""
    own_rule = re.compile(r"environ(?:\.get)?\(?\[?\s*['\"]HARTOS_REPO['\"]|os\.path\.join\([^)]*['\"]HARTOS['\"]\)")
    copies = []
    for name in sorted(os.listdir(_TESTS)):
        if not name.endswith('.py') or name in ('hartos_root.py', 'test_hartos_root.py'):
            continue
        with open(os.path.join(_TESTS, name), encoding='utf-8', errors='replace') as fh:
            source = fh.read()
        if 'HARTOS_REPO' in source and own_rule.search(source):
            reads = [line.strip() for line in source.splitlines()
                     if own_rule.search(line) and 'setenv' not in line and 'delenv' not in line]
            if reads:
                copies.append((name, reads[0][:80]))
    assert copies == []
