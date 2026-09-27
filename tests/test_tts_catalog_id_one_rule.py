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


@pytest.mark.parametrize('entry_id', REGISTRY_IDS + [UNMAPPED])
def test_language_ladder_names_the_same_backend(entry_id):
    te._LADDER_FILTER_CACHE.clear()
    with patch('models.catalog.get_catalog',
               return_value=_OneEntryCatalog(_entry(entry_id))), \
            patch.object(te, '_free_vram_gb', return_value=None):
        ladder = te._get_lang_preference(_LANG)
    assert ladder == [_hartos_backend(entry_id)]
