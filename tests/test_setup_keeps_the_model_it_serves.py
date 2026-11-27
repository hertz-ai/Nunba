"""Auto-setup keeps as the model choice what a server is serving, never a model
nothing runs.

Live 27 Nov 2026 11:55-11:56 IST (installed build #6, RTX 3070 8 GB, D20):
Nunba restarted while the 4B on the main port (:8082) was still loading and
answering 503 "Loading model".  auto_setup's scan found "No existing LLM
endpoints", the diagnosis budgeted the free video memory left beside the
loading 4B and picked the 2B, step 6 saved selected_model_index=1 BEFORE the
start, the 2B's start then timed out ("Server start by another process timed
out"), and the 4B kept serving.  ~/.nunba/llama_config.json named the 2B as
the next launch's model, and the 11:40 run had already booked the 2B's
1.248 GiB over the 4B's 5.810 GiB, so every other model's fit check
under-counted the running LLM.

Now:
 - a server on the main port that is still loading is waited for (one
   ceiling, MODEL_LOAD_WAIT_S), then found by the scan and reused;
 - the choice is saved only after the start, as the model the server itself
   says it serves; a failed start, or a server whose model is not identified,
   leaves the saved choice as it was;
 - step 8 books the served model.

The network is stubbed: check_server_type decides what each port answers and
requests.get answers /v1/models with the path llama-server reports.
"""
import time
import types
from unittest.mock import MagicMock, patch

import pytest

import llama.llama_config as lc
from llama.llama_config import ServerType
from llama.llama_installer import MODEL_PRESETS, model_size_gib

MAIN_PORT = 8082
CAPTION_PORT = 8081
SAVED = 0          # the 4B, what the owner runs
DOWNGRADE = 1      # the 2B the diagnosis picked beside the loading 4B
GGUF = r'C:\models\x.gguf'


class _Models:
    status_code = 200

    def __init__(self, model_id):
        self._id = model_id

    def json(self):
        return {'object': 'list', 'data': [{'id': self._id, 'object': 'model'}]}


def _served_path(index):
    # llama-server names the model by the full path it was started with
    return r'C:\Users\someone\.trueflow\models' + '\\' + MODEL_PRESETS[index].file_name


@pytest.fixture
def cfg(tmp_path, monkeypatch):
    monkeypatch.setattr(lc, '_llm_measured', {'file': None, 'gb': None})
    monkeypatch.setattr(lc.time, 'sleep', lambda s: None)
    c = lc.LlamaConfig(config_dir=str(tmp_path))
    c.config['server_port'] = MAIN_PORT
    c.config['selected_model_index'] = SAVED
    c.installer = MagicMock()
    c.installer.get_model_path.return_value = GGUF
    c.installer.find_llama_server.return_value = 'llama-server.exe'
    c.installer.get_mmproj_path.return_value = 'mm.gguf'
    c.ledger = types.SimpleNamespace(_allocations={}, get_free_vram=lambda: 8.0)
    c.diag = {'action': 'start', 'actions': [], 'run_mode': 'gpu', 'gpu_type': 'nvidia',
              'compute_budget_mb': 8000, 'best_model_index': DOWNGRADE,
              'binary_mismatch': None, 'gpu_occupied': False,
              'binary_current_build': 1, 'gpu_free_gb': 8.0, 'gpu_total_gb': 8.0,
              'vram_allocations': {}}
    return c


def _run(c, *, main_answers, start_returns, served_index=None, scan_after_wait=None,
         model_index=DOWNGRADE):
    """Run auto_setup.  ``main_answers`` is the sequence the main port gives
    check_server_type (the last repeats); ``served_index`` is the preset
    /v1/models names (None: no answer)."""
    answers = list(main_answers)
    asked_ports = []

    def server_type(port):
        asked_ports.append(port)
        if port != MAIN_PORT:
            return (ServerType.EXTERNAL_LLAMA, {'status': 'ok'})
        return answers.pop(0) if len(answers) > 1 else answers[0]

    def models(url, timeout=None, **kw):
        if served_index is None:
            raise ConnectionError('nothing answers')
        return _Models(_served_path(served_index))

    saves = []

    def save():
        saves.append(dict(c.config))

    with patch.object(c, 'check_server_type', side_effect=server_type), \
         patch.object(lc.requests, 'get', side_effect=models), \
         patch.object(lc, 'scan_existing_llm_endpoints',
                      side_effect=lambda *a, **k: scan_after_wait), \
         patch.object(lc, 'scan_openai_compatible_ports', return_value=None), \
         patch.object(c, 'diagnose', return_value=c.diag) as diagnose, \
         patch.object(c, '_get_vram_manager', return_value=c.ledger), \
         patch.object(c, 'start_server', return_value=start_returns) as start, \
         patch.object(c, '_save_config', side_effect=save):
        result = c.auto_setup(model_index=model_index)
    return result, asked_ports, saves, diagnose, start


def test_a_main_port_server_still_loading_is_waited_for_and_reused(cfg):
    """The 11:55 case: 503 "Loading model" twice, then serving.  Setup waits,
    the scan finds it, nothing is diagnosed or started, the choice stays."""
    loading = (ServerType.EXTERNAL_LLAMA, {'status': 'loading'})
    serving = (ServerType.EXTERNAL_LLAMA, {'status': 'ok'})
    existing = {'name': 'llama.cpp', 'base_url': f'http://127.0.0.1:{MAIN_PORT}'}
    result, _, saves, diagnose, start = _run(
        cfg, main_answers=[loading, loading, serving], start_returns=True,
        served_index=SAVED, scan_after_wait=existing, model_index=None)
    assert result['diagnosis']['action'] == 'reuse_existing'
    diagnose.assert_not_called()
    start.assert_not_called()
    assert cfg.config['selected_model_index'] == SAVED
    assert all(s.get('selected_model_index') == SAVED for s in saves)


def test_a_failed_start_leaves_the_saved_choice(cfg):
    """The 2B's start timed out (start_server False, as it is for the caller
    that loses the start lock).  Before: index 1 was already saved."""
    result, _, saves, _, start = _run(
        cfg, main_answers=[(ServerType.NOT_RUNNING, None)], start_returns=False)
    start.assert_called_once()
    assert not result['success']
    assert cfg.config['selected_model_index'] == SAVED
    assert all(s.get('selected_model_index') == SAVED for s in saves), (
        'a model nothing runs was saved as the next launch\'s model')


def test_a_start_that_finds_the_4b_serving_keeps_the_4b_and_books_it(cfg):
    """start_server reports True but the port serves the 4B (it reused the
    running server, or another process's start won).  The choice and the
    booking follow what is served, not the 2B that was asked for."""
    serving = (ServerType.EXTERNAL_LLAMA, {'status': 'ok'})
    result, _, saves, _, _ = _run(
        cfg, main_answers=[(ServerType.NOT_RUNNING, None), serving],
        start_returns=True, served_index=SAVED)
    assert result['success']
    assert cfg.config['selected_model_index'] == SAVED
    assert saves[-1]['selected_model_index'] == SAVED
    booked = cfg.ledger._allocations.get('llm')
    assert booked == pytest.approx(model_size_gib(MODEL_PRESETS[SAVED], installer=cfg.installer))
    assert booked != pytest.approx(model_size_gib(MODEL_PRESETS[DOWNGRADE], installer=cfg.installer))
    assert MODEL_PRESETS[SAVED].display_name in result['message']


def test_a_start_that_serves_the_new_model_saves_it(cfg):
    """The ordinary case still saves the choice: the 2B started and serves."""
    serving = (ServerType.NUNBA_MANAGED, {'status': 'ok'})
    _, _, saves, _, _ = _run(
        cfg, main_answers=[(ServerType.NOT_RUNNING, None), serving],
        start_returns=True, served_index=DOWNGRADE)
    assert cfg.config['selected_model_index'] == DOWNGRADE
    assert saves[-1]['selected_model_index'] == DOWNGRADE


def test_a_served_model_not_identified_leaves_the_saved_choice(cfg):
    serving = (ServerType.EXTERNAL_LLAMA, {'status': 'ok'})
    _run(cfg, main_answers=[(ServerType.NOT_RUNNING, None), serving],
         start_returns=True, served_index=None)
    assert cfg.config['selected_model_index'] == SAVED


def test_a_server_that_never_finishes_loading_does_not_hang_setup(cfg, monkeypatch):
    """503 forever: the wait ends at the one ceiling, setup goes on, and the
    choice is not touched by a start that never served."""
    monkeypatch.setattr(lc, 'MODEL_LOAD_WAIT_S', 0.2)
    loading = (ServerType.EXTERNAL_LLAMA, {'status': 'loading'})
    t0 = time.monotonic()
    _, _, _, diagnose, _ = _run(cfg, main_answers=[loading], start_returns=True,
                                served_index=DOWNGRADE)
    assert time.monotonic() - t0 < 5
    diagnose.assert_called_once()
    assert cfg.config['selected_model_index'] == SAVED


def test_only_the_main_port_is_waited_on(cfg):
    """The caption server on its own port is never taken as the main LLM:
    the loading wait asks the main port only."""
    _, asked, _, _, _ = _run(cfg, main_answers=[(ServerType.NOT_RUNNING, None)],
                             start_returns=False)
    assert asked and set(asked) == {MAIN_PORT}
    assert CAPTION_PORT not in asked
