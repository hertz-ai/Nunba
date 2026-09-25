"""TTSLoader resolves a TTS catalog id to the backend that exists.

Live defect (gui_app.log, 2026-09-22 .. 09-26): the catalog picked
``tts-neutts-air`` and TTSLoader asked the engine for ``'neuair'``.
``entry.id.replace('tts-', '')`` removed EVERY ``'tts-'`` substring
(including the one inside ``neutts-air``) and never turned ``-`` back
into ``_``.  The engine could not run ``'neuair'``, auto-installed it,
the voice verify failed, and error_advice filed a self-heal goal for a
backend that does not exist, once per boot.

These tests drive the real TTSLoader against the real HARTOS
ENGINE_REGISTRY; only the engine object and the ToolWorker module
import (the boundaries that would spawn GPU work) are mocked.
"""

import os
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from integrations.channels.media.tts_router import ENGINE_REGISTRY  # noqa: E402

from models.catalog import ModelEntry  # noqa: E402
from models.orchestrator import TTSLoader  # noqa: E402
from tts import tts_engine as _te  # noqa: E402


def _entry(entry_id):
    return ModelEntry(id=entry_id, name=entry_id, model_type='tts',
                      files={}, capabilities={})


def _backend_passed_to_engine(entry_id):
    """Run TTSLoader.load and return the name it handed the engine."""
    engine = MagicMock()
    engine._can_run_backend.return_value = False
    with patch('tts.tts_engine.TTSEngine', return_value=engine):
        ok = TTSLoader().load(_entry(entry_id), 'gpu')
    assert ok is False
    (name,), _ = engine._can_run_backend.call_args
    (installed,), _ = engine._try_auto_install_backend.call_args
    assert installed == name
    return name


# Hand-written expectations: the Nunba backend constant each catalog id
# must reach.  Multi-word ids are the ones the old code mangled.
_EXPECTED = {
    'tts-neutts-air': _te.BACKEND_NEUTTS_AIR,           # was 'neuair'
    'tts-xtts-v2': _te.BACKEND_XTTS_V2,                 # was 'xv2'
    'tts-chatterbox-turbo': _te.BACKEND_CHATTERBOX_TURBO,
    'tts-chatterbox-ml': _te.BACKEND_CHATTERBOX_ML,
    'tts-indic-parler': _te.BACKEND_INDIC_PARLER,
    'tts-mms-tts': _te.BACKEND_MMS_TTS,
    'tts-f5-tts': _te.BACKEND_F5,
    'tts-kokoro': _te.BACKEND_KOKORO,
    'tts-piper': _te.BACKEND_PIPER,
}


@pytest.mark.parametrize('entry_id,backend', sorted(_EXPECTED.items()))
def test_load_hands_the_engine_the_real_backend(entry_id, backend):
    assert _backend_passed_to_engine(entry_id) == backend


def test_neutts_air_is_not_neuair():
    assert _backend_passed_to_engine('tts-neutts-air') == 'neutts_air'


def test_every_registry_engine_resolves_to_a_known_backend():
    """Every catalog id the HARTOS registry produces reaches a name the
    engine knows: a Nunba backend constant, or the registry key itself
    for engines Nunba has no constant for (e.g. omnivoice)."""
    known = {v for k, v in vars(_te).items()
             if k.startswith('BACKEND_') and isinstance(v, str)}
    for key in ENGINE_REGISTRY:
        entry_id = 'tts-' + key.replace('_', '-')
        name = _backend_passed_to_engine(entry_id)
        assert name in known or name == key, (entry_id, name)


def test_validate_and_download_use_the_same_backend():
    engine = MagicMock()
    result = SimpleNamespace(ok=True, n_bytes=1, duration_s=1.0, err='')
    with patch('tts.tts_engine.get_tts_engine', return_value=engine), \
            patch('tts.tts_handshake.run_handshake',
                  return_value=result) as hs, \
            patch('tts.tts_handshake.invalidate') as inv:
        ok, _ = TTSLoader().validate(_entry('tts-neutts-air'))
    assert ok is True
    inv.assert_called_once_with('neutts_air')
    assert hs.call_args.args[1] == 'neutts_air'

    with patch('tts.package_installer.install_backend_full',
               return_value=(True, 'ok')) as inst:
        assert TTSLoader().download(_entry('tts-chatterbox-turbo')) is True
    inst.assert_called_once_with('chatterbox_turbo')


def _worker_specs():
    return sorted(k for k, s in ENGINE_REGISTRY.items()
                  if s.tool_module and s.tool_worker_attr)


@pytest.mark.parametrize('key', _worker_specs())
def test_every_gpu_engine_finds_its_tool_worker(key):
    """load/unload/is_loaded find the ToolWorker for multi-word ids too
    (before: ENGINE_REGISTRY.get('neuair') is None, worker never spawned)."""
    spec = ENGINE_REGISTRY[key]
    worker = object()
    fake_mod = SimpleNamespace(**{spec.tool_worker_attr: worker})
    with patch('importlib.import_module', return_value=fake_mod) as imp:
        got = TTSLoader()._get_tool_worker(_entry('tts-' + key.replace('_', '-')))
    assert got is worker
    imp.assert_called_once_with(spec.tool_module)


def test_load_neutts_air_spawns_its_worker():
    engine = MagicMock()
    engine._can_run_backend.return_value = True
    worker = MagicMock()
    spec = ENGINE_REGISTRY['neutts_air']
    fake_mod = SimpleNamespace(**{spec.tool_worker_attr: worker})
    entry = _entry('tts-neutts-air')
    with patch('tts.tts_engine.TTSEngine', return_value=engine), \
            patch('importlib.import_module', return_value=fake_mod):
        assert TTSLoader().load(entry, 'gpu') is True
    worker._get_or_start.assert_called_once()
    assert entry.loaded is True
    assert entry.device == 'cuda'
    engine._try_auto_install_backend.assert_not_called()
