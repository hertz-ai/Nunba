"""A llama-server Nunba reuses is recognised as the model it serves, and its
video memory is counted.

Live 2026-11-17 on build 75 (RTX 3070 8 GB): Nunba started beside a 4B
llama-server it had left running on :8082.  The reuse branch of
_do_start_server asked /v1/models what it serves; llama-server answers with
the FULL path ('C:\\Users\\...\\.trueflow\\models\\Qwen3.5-4B-UD-Q4_K_XL.gguf',
server.log 09:24:59), and the branch compared that to each preset's bare
file name, so nothing matched:
 - the catalog was told a full path, matched no row, and the 4B never read
   as loaded; Auto Setup then "loaded" the 2B and saved
   selected_model_index=1 (~/.nunba/llama_config.json, 09:25:14), so the next
   time Nunba starts its own server it starts the 2B;
 - the running model's video memory was never booked (the ledger read
   llm 0.0 while nvidia-smi showed 6.6 GB used), unlike the spawn path,
   which books the model's size (llama_config.py, "VRAM allocation
   registered").

The network is stubbed: check_server_type decides which port looks alive and
requests.get answers /v1/models; the orchestrator and VRAM ledger are fakes.
"""
import sys
import types
from unittest.mock import MagicMock, patch

import pytest

_PORT = 8080


class _Models:
    """A /v1/models answer naming ``model_id``."""

    status_code = 200

    def __init__(self, model_id):
        self._id = model_id

    def json(self):
        return {'object': 'list', 'data': [{'id': self._id, 'object': 'model'}]}


def _reuse(tmp_config_dir, served_id, use_gpu=True, saved_index=1):
    """Run _do_start_server against a llama-server already on _PORT that
    serves ``served_id``.  Returns (config, orchestrator fake, VRAM ledger)."""
    from llama.llama_config import LlamaConfig, ServerType

    cfg = LlamaConfig(config_dir=tmp_config_dir)
    cfg.config['server_port'] = _PORT
    cfg.config['use_gpu'] = use_gpu
    cfg.config['selected_model_index'] = saved_index
    cfg.installer = MagicMock(gpu_available='nvidia', binary_supports_gpu=True)
    ledger = types.SimpleNamespace(_allocations={})
    orchestrator = MagicMock()
    fake_module = types.ModuleType('models.orchestrator')
    fake_module.get_orchestrator = lambda: orchestrator

    def alive(port):
        if port == _PORT:
            return (ServerType.EXTERNAL_LLAMA, {'status': 'ok'})
        return (ServerType.NOT_RUNNING, None)

    def get(url, *a, **kw):
        if url.endswith('/v1/models'):
            return _Models(served_id)
        raise OSError('no network in this test')

    with patch.object(cfg, 'check_server_type', side_effect=alive), \
         patch('requests.get', side_effect=get), \
         patch.object(LlamaConfig, '_propagate_llm_url'), \
         patch.object(cfg, '_get_vram_manager', return_value=ledger), \
         patch.dict(sys.modules, {'models.orchestrator': fake_module}):
        assert cfg._do_start_server(model_preset=None) is True
    return cfg, orchestrator, ledger


@pytest.fixture
def four_b():
    from llama.llama_installer import MODEL_PRESETS
    index = next(i for i, p in enumerate(MODEL_PRESETS)
                 if p.file_name == 'Qwen3.5-4B-UD-Q4_K_XL.gguf')
    return index, MODEL_PRESETS[index]


_WINDOWS_PATH = r'C:\Users\someone\.trueflow\models\Qwen3.5-4B-UD-Q4_K_XL.gguf'


def test_a_server_naming_its_model_by_full_path_is_that_model(tmp_config_dir, four_b):
    """llama-server names the model by the path it was started with; the
    reused 4B is the 4B: the saved choice follows it and the catalog is told
    its name, not the path."""
    index, preset = four_b
    cfg, orchestrator, _ = _reuse(tmp_config_dir, _WINDOWS_PATH, saved_index=1)
    assert cfg.config['selected_model_index'] == index, (
        'the saved model choice still names another model while the 4B runs')
    orchestrator.notify_loaded.assert_called_once()
    assert orchestrator.notify_loaded.call_args[0][:2] == ('llm', preset.display_name)


def test_a_server_naming_its_model_by_posix_path_is_that_model(tmp_config_dir, four_b):
    index, preset = four_b
    cfg, orchestrator, _ = _reuse(
        tmp_config_dir, '/home/someone/.trueflow/models/Qwen3.5-4B-UD-Q4_K_XL.gguf')
    assert cfg.config['selected_model_index'] == index
    assert orchestrator.notify_loaded.call_args[0][:2] == ('llm', preset.display_name)


def test_a_server_naming_its_bare_file_still_matches(tmp_config_dir, four_b):
    """What matched before keeps matching."""
    index, preset = four_b
    cfg, orchestrator, _ = _reuse(tmp_config_dir, preset.file_name)
    assert cfg.config['selected_model_index'] == index
    assert orchestrator.notify_loaded.call_args[0][:2] == ('llm', preset.display_name)


def test_a_reused_server_on_the_gpu_books_its_model_size(tmp_config_dir, four_b):
    """The reused model's video memory is counted like a model Nunba started
    itself: the ledger holds its size, not 0.0."""
    from llama.llama_installer import model_size_gib
    _, preset = four_b
    _, _, ledger = _reuse(tmp_config_dir, _WINDOWS_PATH, use_gpu=True)
    booked = ledger._allocations.get('llm')
    assert booked == pytest.approx(model_size_gib(preset)), (
        f'the reused 4B is booked at {booked!r} GB')
    assert booked > 1.0


def test_a_reused_server_on_the_cpu_books_no_video_memory(tmp_config_dir):
    _, _, ledger = _reuse(tmp_config_dir, _WINDOWS_PATH, use_gpu=False)
    assert 'llm' not in ledger._allocations


def test_an_unknown_model_is_not_given_a_preset_or_a_size(tmp_config_dir):
    """Another app's model that is no Nunba preset: the saved choice is left
    alone and nothing is booked from a guess."""
    cfg, orchestrator, ledger = _reuse(
        tmp_config_dir, r'D:\models\someone-elses-model.gguf', saved_index=0)
    assert cfg.config['selected_model_index'] == 0
    assert 'llm' not in ledger._allocations
