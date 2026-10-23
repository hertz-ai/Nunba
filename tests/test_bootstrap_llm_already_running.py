"""The setup card must not say "failed" for a model that is running.

Measured 2026-10-21 on the installed app: the boot auto-start loaded
llm-qwen3.5-2b at 20:34:47 ("Loaded llm-qwen3.5-2b on cpu").  The language
bootstrap had planned the same model a few seconds earlier, while it was not
yet loaded, so its LLM step was 'selecting'.  When the step ran, auto_load
asked select_best for a model that fits the RAM left over AFTER the 2B model
was resident (the UI showed "too big for available compute (154MB budget)"),
got None, and pushed status 'failed', "Load failed (insufficient
resources?)".  The card showed "llm Failed" while chat answered normally.

The step now asks the orchestrator what is already loaded: the planned model
running (for any type), or any LLM running (any resident LLM serves chat), is
'ready'.  A different TTS/STT model running is not: that can be a real
language mismatch, and the failure must stay visible.
"""
import os
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import models.language_bootstrap as lb  # noqa: E402
from models.language_bootstrap import BootstrapStep, ModelType  # noqa: E402


def _entry(model_id, model_type, loaded, device='cpu'):
    return SimpleNamespace(id=model_id, name=model_id, model_type=model_type,
                           loaded=loaded, device=device, backend='llama.cpp',
                           vram_gb=0.0)


def _orch(catalog_entries, auto_load_result=None, on_auto_load=None):
    """An orchestrator double: a catalog of entries, auto_load's answer."""
    orch = MagicMock(spec=['auto_load', '_catalog'])
    orch._catalog = SimpleNamespace(
        _models={e.id: e for e in catalog_entries})

    def _auto_load(model_type, language=None):
        if on_auto_load:
            on_auto_load()
        return auto_load_result
    orch.auto_load.side_effect = _auto_load
    return orch


def _run_worker(plan, orch):
    """Run the real worker with the plan and orchestrator injected."""
    mod = MagicMock()
    mod.get_orchestrator.return_value = orch
    catalog_mod = MagicMock()
    catalog_mod.backend_requires_torch.return_value = False
    with patch.dict('sys.modules', {
            'models.orchestrator': mod,
            'integrations.service_tools.model_catalog': catalog_mod}), \
            patch.object(lb, '_detect_hardware', return_value={
                'name': None, 'total_gb': 0, 'free_gb': 0,
                'cuda_available': False}), \
            patch.object(lb, '_create_plan', return_value=plan), \
            patch.object(lb, '_refresh_vram'), \
            patch.object(lb, 'BOOTSTRAP_ORDER', list(plan)):
        lb._bootstrap_worker('en')
    with lb._lock:
        return {k: (s.status, s.detail) for k, s in lb._state.steps.items()}


def _planned(model_type, model_id):
    return BootstrapStep(model_type=model_type, model_id=model_id,
                         model_name=model_id, status='selecting')


class TestLoadedModelIsReady:

    def test_planned_llm_loaded_by_boot_while_auto_load_found_no_room(self):
        """The 2026-10-21 race: loaded concurrently, auto_load returns None."""
        llm = _entry('llm-qwen3.5-2b', ModelType.LLM, loaded=False)
        orch = _orch([llm], auto_load_result=None,
                     on_auto_load=lambda: setattr(llm, 'loaded', True))
        steps = _run_worker({ModelType.LLM: _planned(ModelType.LLM, llm.id)}, orch)
        status, detail = steps[ModelType.LLM]
        assert status == 'ready', detail
        assert 'llm-qwen3.5-2b' in detail

    def test_planned_model_already_running_skips_auto_load(self):
        llm = _entry('llm-qwen3.5-2b', ModelType.LLM, loaded=True)
        orch = _orch([llm])
        steps = _run_worker({ModelType.LLM: _planned(ModelType.LLM, llm.id)}, orch)
        assert steps[ModelType.LLM][0] == 'ready'
        orch.auto_load.assert_not_called()

    def test_any_running_llm_serves_chat(self):
        """Plan wanted the 2B, the 0.8B is resident and nothing else fits."""
        small = _entry('llm-qwen3.5-0.8b', ModelType.LLM, loaded=True)
        big = _entry('llm-qwen3.5-2b', ModelType.LLM, loaded=False)
        orch = _orch([small, big], auto_load_result=None)
        steps = _run_worker({ModelType.LLM: _planned(ModelType.LLM, big.id)}, orch)
        status, detail = steps[ModelType.LLM]
        assert status == 'ready'
        assert 'llm-qwen3.5-0.8b' in detail


class TestRealFailuresStayVisible:

    def test_nothing_loaded_and_nothing_fits_is_failed(self):
        llm = _entry('llm-qwen3.5-2b', ModelType.LLM, loaded=False)
        orch = _orch([llm], auto_load_result=None)
        steps = _run_worker({ModelType.LLM: _planned(ModelType.LLM, llm.id)}, orch)
        assert steps[ModelType.LLM][0] == 'failed'

    def test_a_different_tts_running_is_not_ready(self):
        """English Piper resident does not make a Tamil TTS step ready."""
        piper = _entry('tts-piper', ModelType.TTS, loaded=True)
        parler = _entry('tts-indic-parler', ModelType.TTS, loaded=False)
        orch = _orch([piper, parler], auto_load_result=None)
        steps = _run_worker({ModelType.TTS: _planned(ModelType.TTS, parler.id)}, orch)
        assert steps[ModelType.TTS][0] == 'failed'


class TestOneLoadedLookup:

    def test_refresh_and_worker_share_the_lookup(self):
        """No second copy of "find the loaded entry of this type"."""
        with open(os.path.join(PROJECT_ROOT, 'models', 'language_bootstrap.py'),
                  encoding='utf-8') as fh:
            src = fh.read()
        assert src.count('ent.model_type == model_type and ent.loaded') == 1
        assert 'def _loaded_entry(' in src
