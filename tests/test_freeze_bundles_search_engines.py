"""The frozen app can search the web: ddgs ships with its engines.

WHAT WENT WRONG (owner's desktop, build 75, 16 Nov 2026)
  HARTOS's keyless web search (hartos/helper.py _keyless_serp, tier A) uses
  ddgs.  ddgs/engines/__init__.py finds its engines at run time with
  pkgutil.iter_modules + importlib.import_module, which cx_Freeze's tracer
  cannot follow, so the traced copy in build/Nunba/lib/ddgs/engines/ held
  __init__.pyc and no engine.  Nunba.exe resolves lib/ first, so ENGINES
  was empty and every search raised KeyError 'text', which the search
  swallowed; the two scrape tiers behind it were blocked (captcha, 403), and
  every research turn on the desktop came back with no results.  The same
  ddgs from python-embed's full copy returned 3 rows from yahoo.

THE RULE
  Every freeze script names ddgs as a whole package (packages[] on Windows,
  the optional-package list where a platform has one), and a built bundle's
  lib/ddgs/engines holds the engine modules.

    python -m pytest tests/test_freeze_bundles_search_engines.py -q
"""
import ast
import os

import pytest

_REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
_SCRIPTS = os.path.join(_REPO, 'scripts')
FREEZE_SCRIPTS = ('setup_freeze_nunba.py', 'setup_freeze_linux.py',
                  'setup_freeze_mac.py')
_ENGINES = os.path.join(_REPO, 'build', 'Nunba', 'lib', 'ddgs', 'engines')


def _named_packages(script):
    """Every string in build_exe_options['packages'] and _optional_packages."""
    path = os.path.join(_SCRIPTS, script)
    with open(path, encoding='utf-8') as fh:
        tree = ast.parse(fh.read(), filename=path)
    names = set()
    for node in ast.walk(tree):
        if not isinstance(node, ast.Assign) or len(node.targets) != 1:
            continue
        target = node.targets[0]
        if not isinstance(target, ast.Name):
            continue
        lists = []
        if target.id == '_optional_packages' and isinstance(node.value, ast.List):
            lists.append(node.value)
        if target.id == 'build_exe_options' and isinstance(node.value, ast.Dict):
            for key, value in zip(node.value.keys, node.value.values):
                if (isinstance(key, ast.Constant) and key.value == 'packages'
                        and isinstance(value, ast.List)):
                    lists.append(value)
        for lst in lists:
            names.update(e.value for e in lst.elts
                         if isinstance(e, ast.Constant) and isinstance(e.value, str))
    return names


@pytest.mark.parametrize('script', FREEZE_SCRIPTS)
def test_every_freeze_script_bundles_ddgs_whole(script):
    assert 'ddgs' in _named_packages(script), (
        f"scripts/{script} does not name 'ddgs' as a package: the tracer "
        "drops its engines (found by pkgutil at run time) and every keyless "
        "web search in the frozen app fails")


@pytest.mark.skipif(not os.path.isdir(_ENGINES),
                    reason='no frozen bundle with ddgs at build/Nunba')
def test_a_built_bundle_carries_the_search_engines():
    modules = {os.path.splitext(n)[0] for n in os.listdir(_ENGINES)
               if n.endswith(('.py', '.pyc')) and not n.startswith('__init__')}
    assert {'yahoo', 'duckduckgo', 'brave'} <= modules, (
        f"build/Nunba/lib/ddgs/engines holds {sorted(modules) or 'no engine'}: "
        "ENGINES is empty in Nunba.exe and every search fails")
