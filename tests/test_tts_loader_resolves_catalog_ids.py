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
    # CPU-fallback ids (tts_engine._CPU_FALLBACK_CATALOG_IDS): Nunba
    # cannot create these backends, Piper speaks for them, so Piper is
    # what load/validate must check.
    'tts-pocket-tts': _te.BACKEND_PIPER,
    'tts-espeak': _te.BACKEND_PIPER,
    # No Nunba constant and not a CPU fallback: the registry key itself.
    'tts-omnivoice': 'omnivoice',
    'tts-makeittalk': 'makeittalk',
}

# Ids whose ENGINE_REGISTRY key and Nunba backend constant are
# DIFFERENT strings.  Only these can tell the two names apart, so every
# path that takes the Nunba constant is pinned with them.
_KEY_DIFFERS = [
    ('tts-f5-tts', 'f5_tts', _te.BACKEND_F5),
    ('tts-chatterbox-ml', 'chatterbox_ml', _te.BACKEND_CHATTERBOX_ML),
]


def test_key_differs_cases_really_differ():
    for entry_id, key, backend in _KEY_DIFFERS:
        assert key in ENGINE_REGISTRY, key
        assert key != backend, entry_id


@pytest.mark.parametrize('entry_id,key,backend', _KEY_DIFFERS)
def test_download_installs_the_nunba_backend_name(entry_id, key, backend):
    """download hands install_backend_full the same name the engine's
    own auto-install does (TTSEngine._try_auto_install_backend), the
    Nunba constant -- not the registry key."""
    with patch('tts.package_installer.install_backend_full',
               return_value=(True, 'ok')) as inst:
        assert TTSLoader().download(_entry(entry_id)) is True
    inst.assert_called_once_with(backend)


@pytest.mark.parametrize('entry_id,key,backend', _KEY_DIFFERS)
def test_validate_probes_the_nunba_backend_name(entry_id, key, backend):
    engine = MagicMock()
    result = SimpleNamespace(ok=True, n_bytes=1, duration_s=1.0, err='')
    with patch('tts.tts_engine.get_tts_engine', return_value=engine), \
            patch('tts.tts_handshake.run_handshake',
                  return_value=result) as hs, \
            patch('tts.tts_handshake.invalidate') as inv:
        ok, _ = TTSLoader().validate(_entry(entry_id))
    assert ok is True
    inv.assert_called_once_with(backend)
    assert hs.call_args.args[1] == backend


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


# ENGINE_REGISTRY ids that tts_engine routes to Piper.
_CPU_FALLBACK = [('tts-pocket-tts', 'pocket_tts'), ('tts-espeak', 'espeak')]


@pytest.mark.parametrize('entry_id,key', _CPU_FALLBACK)
def test_cpu_fallback_engine_cannot_run_under_its_own_name(entry_id, key):
    """Why these ids resolve to Piper: the engine builds no backend for
    the registry key, so loading or probing it by that name checks an
    engine that can never speak."""
    assert key in ENGINE_REGISTRY
    engine = _te.TTSEngine(prefer_gpu=False, auto_init=False)
    assert engine._create_backend(key) is None
    assert engine._create_backend(_te.BACKEND_PIPER) is not None


@pytest.mark.parametrize('entry_id,key', _CPU_FALLBACK)
def test_cpu_fallback_loads_and_validates_piper(entry_id, key):
    engine = MagicMock()
    engine._can_run_backend.return_value = True
    entry = _entry(entry_id)
    with patch('tts.tts_engine.TTSEngine', return_value=engine):
        assert TTSLoader().load(entry, 'cpu') is True
    engine._can_run_backend.assert_called_once_with(_te.BACKEND_PIPER)
    assert entry.loaded is True

    result = SimpleNamespace(ok=True, n_bytes=1, duration_s=1.0, err='')
    with patch('tts.tts_engine.get_tts_engine', return_value=engine),             patch('tts.tts_handshake.run_handshake',
                  return_value=result) as hs,             patch('tts.tts_handshake.invalidate') as inv:
        ok, _ = TTSLoader().validate(entry)
    assert ok is True
    inv.assert_called_once_with(_te.BACKEND_PIPER)
    assert hs.call_args.args[1] == _te.BACKEND_PIPER


@pytest.mark.parametrize('entry_id,key,backend', _KEY_DIFFERS)
def test_unload_log_names_the_nunba_backend(entry_id, key, backend, caplog):
    """The 'worker stopped' line is what log RCA reads; it names the
    Nunba constant, the same name load/validate/download use."""
    spec = ENGINE_REGISTRY[key]
    worker = MagicMock()
    fake_mod = SimpleNamespace(**{spec.tool_worker_attr: worker})
    entry = _entry(entry_id)
    entry.loaded = True
    with patch('importlib.import_module', return_value=fake_mod),             caplog.at_level('INFO', logger='NunbaModelOrchestrator'):
        TTSLoader().unload(entry)
    worker.stop.assert_called_once()
    assert entry.loaded is False
    msgs = [r.getMessage() for r in caplog.records
            if r.name == 'NunbaModelOrchestrator']
    assert f'TTS backend {backend} worker stopped' in msgs, msgs
