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
# Stripping the 'tts-' prefix is the rule's own step (HARTOS does it inside
# catalog_id_to_engine_id), so anywhere in Nunba's shipping code that hands
# the bare prefix 'tts-' (or a regex '^tts-') to a call -- replace,
# startswith, removeprefix, lstrip, split, partition, re.sub, re.match, ... --
# is a second conversion.  Building an id (f'tts-{x}') is not a call
# argument and stays allowed.  Only these two may ever do it:
_PREFIX_RULE_HOMES = {
    ('tts/tts_engine.py', 'catalog_entry_backend'),
    ('models/orchestrator.py', 'TTSLoader._registry_key'),
}
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


def _prefix_strip_sites(path, rel):
    """(rel, qualified function, line) for every call handed the bare
    'tts-' prefix in ``path``."""
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
            if isinstance(child, ast.Call):
                args = list(child.args) + [k.value for k in child.keywords]
                if any(isinstance(a, ast.Constant) and isinstance(a.value, str)
                       and a.value.lstrip('^') == 'tts-' for a in args):
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
    stray = [s for s in _all_prefix_strip_sites(PROJECT_ROOT)
             if (s[0], s[1]) not in _PREFIX_RULE_HOMES]
    assert not stray, (
        "catalog id -> backend conversions outside the one rule "
        f"(use tts_engine.catalog_entry_backend): {stray}")


def test_source_guard_scans_the_shipping_tree():
    """The guard is not vacuous: it walks every tracked shipping .py file
    (git's own list, minus tests / the embedded interpreter / the web app)."""
    import subprocess
    rels = {os.path.relpath(p, PROJECT_ROOT).replace(os.sep, '/')
            for p in _shipping_py_files(PROJECT_ROOT)}
    tracked = subprocess.run(
        ['git', 'ls-files', '*.py'], cwd=PROJECT_ROOT, capture_output=True,
        text=True, timeout=60, check=True).stdout.split()
    shipping = {t for t in tracked
                if not t.startswith(('tests/', 'python-embed', 'build/',
                                     'landing-page/'))}
    assert {'tts/tts_engine.py', 'models/orchestrator.py'} <= shipping
    assert shipping <= rels, sorted(shipping - rels)
    assert not any(r.startswith('tests/') for r in rels)


@pytest.mark.parametrize('line', [
    "x = entry.id.replace('tts-', '', 1)",
    "x = e.startswith('tts-')",
    "x = e.removeprefix('tts-')",
    "x = re.sub(r'^tts-', '', e)",
    "x = e.split(sep='tts-')",
])
def test_source_guard_catches_a_planted_second_rule(tmp_path, line):
    (tmp_path / 'routes').mkdir()
    (tmp_path / 'routes' / 'planted.py').write_text(
        f"import re\n\ndef backend_for(e):\n    {line}\n    return x\n",
        encoding='utf-8')
    assert _all_prefix_strip_sites(str(tmp_path)) == [
        ('routes/planted.py', 'backend_for', 4)]


def test_source_guard_allows_building_an_id(tmp_path):
    (tmp_path / 'm.py').write_text(
        "def f(c, x):\n    return c.get(f'tts-{x}'), 'tts-' + x\n",
        encoding='utf-8')
    assert _all_prefix_strip_sites(str(tmp_path)) == []


@pytest.mark.parametrize('entry_id', REGISTRY_IDS + [UNMAPPED])
def test_language_ladder_names_the_same_backend(entry_id):
    te._LADDER_FILTER_CACHE.clear()
    with patch('models.catalog.get_catalog',
               return_value=_OneEntryCatalog(_entry(entry_id))), \
            patch.object(te, '_free_vram_gb', return_value=None):
        ladder = te._get_lang_preference(_LANG)
    assert ladder == [_hartos_backend(entry_id)]
