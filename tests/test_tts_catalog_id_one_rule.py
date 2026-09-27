"""One catalog-id -> engine-name rule, shared with HARTOS.

Review finding (2026-09-26): Nunba turned a TTS catalog id into a backend
name twice, and not the way HARTOS does.  tts_engine's capability map and
language ladder used ``entry.id.replace('tts-', '', 1)``, which keeps the
dashes; TTSLoader used HARTOS's ``_catalog_id_to_engine_id`` (a private
name), which turns them into underscores.  For every multi-word id Nunba
has no constant for, the two named different engines ('foo-bar' vs
'foo_bar').

Now HARTOS owns the rule as the public
``tts_router.catalog_id_to_engine_id`` and every Nunba boundary goes
through ``tts_engine.catalog_entry_backend``.  These tests drive the REAL
call sites (the capability map, the language ladder and TTSLoader) with a
catalog holding one entry, for every HARTOS registry id and for an id no
table maps, and require that each names the engine HARTOS's rule names.
"""
import os
import sys
from types import SimpleNamespace
from unittest.mock import patch

import pytest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from integrations.channels.media.tts_router import (  # noqa: E402
    ENGINE_REGISTRY,
    _engine_id_to_catalog_id,
    catalog_id_to_engine_id,
)

from models.orchestrator import TTSLoader  # noqa: E402
from tts import tts_engine as te  # noqa: E402

REGISTRY_IDS = [_engine_id_to_catalog_id(k) for k in ENGINE_REGISTRY]
# No Nunba constant, no CPU-fallback alias, several words: the case the
# two rules disagreed on.
UNMAPPED = 'tts-future-voice-x'
_LANG = 'zz'


class _OneEntryCatalog:
    def __init__(self, entry):
        self._entry = entry

    def list_by_type(self, _model_type):
        return [self._entry]

    def get(self, entry_id):
        return self._entry if entry_id == self._entry.id else None


def _entry(entry_id):
    return SimpleNamespace(
        id=entry_id, name=entry_id, capabilities={}, languages=[_LANG],
        language_priority={_LANG: 1}, priority=0, vram_gb=0,
        quality_score=0.5)


def _hartos_backend(entry_id):
    """What HARTOS's rule names, carried through Nunba's constant table."""
    key = catalog_id_to_engine_id(entry_id)
    return te._CATALOG_TO_BACKEND.get(key, key)


def test_every_registry_id_round_trips_through_hartos_rule():
    assert REGISTRY_IDS, 'ENGINE_REGISTRY is empty'
    for engine_id in ENGINE_REGISTRY:
        assert catalog_id_to_engine_id(
            _engine_id_to_catalog_id(engine_id)) == engine_id


def test_unmapped_multi_word_id_is_the_hartos_engine_name():
    assert catalog_id_to_engine_id(UNMAPPED) == 'future_voice_x'
    assert te.catalog_entry_backend(UNMAPPED) == 'future_voice_x'


def test_only_a_leading_prefix_is_stripped():
    # 'xtts-v2' carries 'tts-' inside it; it is not a prefix there.
    assert catalog_id_to_engine_id('tts-xtts-v2') == 'xtts_v2'
    assert catalog_id_to_engine_id('xtts-v2') == 'xtts_v2'


@pytest.mark.parametrize('entry_id', REGISTRY_IDS + [UNMAPPED])
def test_catalog_entry_backend_agrees_with_hartos(entry_id):
    assert te.catalog_entry_backend(entry_id) == _hartos_backend(entry_id)


@pytest.mark.parametrize('entry_id', REGISTRY_IDS + [UNMAPPED])
def test_tts_loader_names_the_same_backend(entry_id):
    e = SimpleNamespace(id=entry_id)
    assert TTSLoader._registry_key(e) == catalog_id_to_engine_id(entry_id)
    assert TTSLoader()._backend_name(e) == _hartos_backend(entry_id)


@pytest.mark.parametrize('entry_id', REGISTRY_IDS + [UNMAPPED])
def test_capability_map_keys_the_same_backend(entry_id):
    with patch('models.catalog.get_catalog',
               return_value=_OneEntryCatalog(_entry(entry_id))):
        caps = te._get_engine_capabilities()
    assert list(caps) == [_hartos_backend(entry_id)]


# --- the guard that keeps it at one ------------------------------------------
# Owner rule: a collapse ships the guard that makes a SECOND copy fail CI.
# Stripping the 'tts-' prefix is the rule's own step, and it lives in HARTOS
# (tts_router.catalog_id_to_engine_id).  Nunba's two call sites,
# tts_engine.catalog_entry_backend and TTSLoader._registry_key, only
# delegate to it, so no Nunba shipping file needs the prefix as a value at
# all: ANY string literal equal to 'tts-', or a regex starting '^tts-', is a
# second conversion in the making, however it is spelled -- a call argument,
# a named constant, a tuple for startswith, a slice comparison, a pattern
# with a capture group.  Only BUILDING an id may carry it: inside an
# f-string (f'tts-{x}') or as the left operand of + ('tts-' + x).  No
# exemptions by function: nothing in Nunba strips the prefix itself.
_SKIP_DIRS = {'tests', 'build', 'dist', 'node_modules', 'landing-page',
              '__pycache__', 'venv', 'memory'}


def _shipping_py_files(root):
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs
                   if x not in _SKIP_DIRS and not x.startswith('.')
                   and not x.startswith('python-embed')]
        for f in files:
            if f.endswith('.py'):
                yield os.path.join(d, f)


def _is_prefix_literal(node):
    import ast
    return (isinstance(node, ast.Constant) and isinstance(node.value, str)
            and (node.value == 'tts-' or node.value.startswith('^tts-')))


def _prefix_strip_sites(path, rel):
    """(rel, qualified function, line) for every 'tts-' / '^tts-' string
    literal in ``path`` that does not build an id."""
    import ast
    with open(path, encoding='utf-8') as fh:
        tree = ast.parse(fh.read(), path)
    sites = []

    def visit(node, scope):
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef,
                                  ast.ClassDef)):
                visit(child, scope + [child.name])
                continue
            if isinstance(child, ast.JoinedStr):
                continue                  # f'tts-{x}': builds an id
            if (isinstance(child, ast.BinOp) and isinstance(child.op, ast.Add)
                    and _is_prefix_literal(child.left)):
                visit(ast.Expression(body=child.right), scope)
                continue                  # 'tts-' + x: builds an id
            if _is_prefix_literal(child):
                sites.append((rel, '.'.join(scope) or '<module>',
                              child.lineno))
            visit(child, scope)
    visit(tree, [])
    return sites


def _all_prefix_strip_sites(root):
    out = []
    for path in _shipping_py_files(root):
        rel = os.path.relpath(path, root).replace(os.sep, '/')
        out += _prefix_strip_sites(path, rel)
    return out


def test_source_guard_tts_prefix_is_stripped_only_by_the_one_rule():
    stray = _all_prefix_strip_sites(PROJECT_ROOT)
    assert not stray, (
        "a 'tts-' prefix literal that does not build an id: a second "
        "catalog id -> backend conversion (use "
        f"tts_engine.catalog_entry_backend): {stray}")


def _git_tracked_py(root):
    """Tracked .py paths, or None when ``root`` is not a git checkout (a
    ``git archive`` export, a source tarball)."""
    import subprocess
    try:
        res = subprocess.run(['git', 'ls-files', '*.py'], cwd=root,
                             capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired):
        return None
    if res.returncode != 0:
        return None
    return res.stdout.split()


def test_source_guard_scans_the_shipping_tree():
    """The guard is not vacuous: it walks every tracked shipping .py file
    (git's own list, minus tests / the embedded interpreter / the web app)."""
    tracked = _git_tracked_py(PROJECT_ROOT)
    if tracked is None:
        pytest.skip('not a git checkout (e.g. a git archive export): no '
                    'tracked-file list to hold the walk against')
    rels = {os.path.relpath(p, PROJECT_ROOT).replace(os.sep, '/')
            for p in _shipping_py_files(PROJECT_ROOT)}
    shipping = {t for t in tracked
                if not t.startswith(('tests/', 'python-embed', 'build/',
                                     'landing-page/'))}
    assert {'tts/tts_engine.py', 'models/orchestrator.py'} <= shipping
    assert shipping <= rels, sorted(shipping - rels)
    assert not any(r.startswith('tests/') for r in rels)


def test_git_tracked_py_is_none_outside_a_checkout(tmp_path):
    assert _git_tracked_py(str(tmp_path)) is None


@pytest.mark.parametrize('line', [
    "x = entry.id.replace('tts-', '', 1)",
    "x = e.startswith('tts-')",
    "x = e.removeprefix('tts-')",
    "x = re.sub(r'^tts-', '', e)",
    "x = e.split(sep='tts-')",
    # the review's four shapes (ce15adc6 let each through)
    "P = 'tts-'; x = e.replace(P, '', 1)",
    "x = e.startswith(('tts-', 'stt-'))",
    "x = e[:4] == 'tts-'",
    "x = re.sub(r'^tts-(.+)', r'\\1', e)",
])
def test_source_guard_catches_a_planted_second_rule(tmp_path, line):
    (tmp_path / 'routes').mkdir()
    (tmp_path / 'routes' / 'planted.py').write_text(
        f"import re\n\ndef backend_for(e):\n    {line}\n    return x\n",
        encoding='utf-8')
    assert _all_prefix_strip_sites(str(tmp_path)) == [
        ('routes/planted.py', 'backend_for', 4)]


def test_source_guard_catches_a_module_level_constant(tmp_path):
    (tmp_path / 'm.py').write_text("PREFIX = 'tts-'\n", encoding='utf-8')
    assert _all_prefix_strip_sites(str(tmp_path)) == [('m.py', '<module>', 1)]


def test_source_guard_allows_building_an_id(tmp_path):
    (tmp_path / 'm.py').write_text(
        "def f(c, x):\n"
        "    return (c.get(f'tts-{x}'), 'tts-' + x,\n"
        "            'tts-' + x.replace('_', '-'))\n",
        encoding='utf-8')
    assert _all_prefix_strip_sites(str(tmp_path)) == []


def test_source_guard_still_scans_the_right_of_a_build(tmp_path):
    (tmp_path / 'm.py').write_text(
        "def f(e):\n    return 'tts-' + e.replace('tts-', '')\n",
        encoding='utf-8')
    assert _all_prefix_strip_sites(str(tmp_path)) == [('m.py', 'f', 2)]


@pytest.mark.parametrize('entry_id', REGISTRY_IDS + [UNMAPPED])
def test_language_ladder_names_the_same_backend(entry_id):
    te._LADDER_FILTER_CACHE.clear()
    with patch('models.catalog.get_catalog',
               return_value=_OneEntryCatalog(_entry(entry_id))), \
            patch.object(te, '_free_vram_gb', return_value=None):
        ladder = te._get_lang_preference(_LANG)
    assert ladder == [_hartos_backend(entry_id)]
