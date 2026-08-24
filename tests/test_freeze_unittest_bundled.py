"""The frozen bundle must carry stdlib `unittest` — torch cannot init without it.

WHAT WENT WRONG (2026-08-19..21): setup_freeze_nunba.py excluded "unittest"
for years, and every build still shipped it because build/Nunba/lib was
REUSED across builds and carried lib/unittest from before the exclude
existed.  The first genuinely fresh lib/ (after the 08-19 staging-dir sweep)
honoured the exclude, and torch 2.10's own import chain

    torch/__init__ -> torch.nested -> torch.fx
      -> torch/utils/_config_module.py:10  `import unittest`

raised ModuleNotFoundError.  That first failure was swallowed by a bare
`except: pass` in app.py's torch pre-guard, which left 392 partially
initialized torch.* modules in sys.modules; every later `import torch`
re-executed torch/__init__ against that stale cache and died with

    AttributeError: partially initialized module 'torch' has no attribute
    'autograd' (most likely due to a circular import)

knocking the backend adapter to Tier-3 (llama.cpp fallback).  Restoring
unittest alone flipped the identical tree to Tier-1, validate 62/0/0
(2026-08-21T19:17).

This test pins BOTH halves of the fix at the source level, so neither can
silently revert:
  1. "unittest" is NOT in cx_Freeze excludes[]
  2. "unittest" IS in packages[] — a forced include, because torch resolves
     from python-embed at runtime and the cx_Freeze tracer never sees
     torch's `import unittest`.

Text-level assertions are deliberate: importing setup_freeze_nunba runs
setup().  The patterns asserted are exact list-literal members, the same
shape the AST guards in tests/test_lang_constants.py rely on.

    python -m pytest tests/test_freeze_unittest_bundled.py -q
"""

import ast
import os

_SETUP = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'scripts', 'setup_freeze_nunba.py')


def _string_lists(tree):
    """Every list literal of plain strings in the module, as Python lists."""
    out = []
    for node in ast.walk(tree):
        if isinstance(node, ast.List):
            items = []
            for elt in node.elts:
                if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                    items.append(elt.value)
            if items:
                out.append(items)
    return out


def _load():
    src = open(_SETUP, encoding='utf-8').read()
    return _string_lists(ast.parse(src))


def test_unittest_is_not_excluded():
    """The exclude that produced the Tier-3 build must never come back.

    The excludes list is identified by its stable neighbours ("test",
    "tests" — the CPython test suite, which STAYS excluded)."""
    for lst in _load():
        if 'test' in lst and 'tests' in lst:
            assert 'unittest' not in lst, (
                'setup_freeze_nunba.py excludes "unittest" again — torch 2.10 '
                'cannot import without it (torch/utils/_config_module.py:10) '
                'and a fresh lib/ will land the frozen exe on Tier-3')
            return
    raise AssertionError(
        'could not locate the cx_Freeze excludes list ("test"/"tests" '
        'markers) in setup_freeze_nunba.py — update this guard')


def test_unittest_is_a_forced_package():
    """The tracer cannot see torch's import (torch lives in python-embed),
    so presence in packages[] is the ONLY thing that bundles unittest."""
    for lst in _load():
        if 'flask' in lst and 'winreg' in lst:   # the build_exe packages list
            assert 'unittest' in lst, (
                '"unittest" missing from cx_Freeze packages[] — nothing else '
                'forces it into lib/, and torch 2.10 dies without it')
            return
    raise AssertionError(
        'could not locate the cx_Freeze packages list ("flask"/"winreg" '
        'markers) in setup_freeze_nunba.py — update this guard')
