"""The setup card's start keeps the video memory measured when the server
started.

MEASURED 2026-11-18 by rv_b9 (D:/claude_scratch/99c39a1e/rv_b9/probes/
auto_setup_overwrite.py, on Nunba 57f383dc): start_server's spawn booked the
'llm' row at 2.910 GiB, measured on the card for the file it started; then
auto_setup step 8 wrote the file size, 2.712 GiB, over it.  57f383dc fixed the
same overwrite on the reused-server path and left this writer beside it.

Now step 8 books through book_llm_vram and keeps a figure measured for this
preset's own file; with nothing measured it books the file size, as before.
"""
import types
from unittest.mock import MagicMock, patch

import pytest

import llama.llama_config as lc
from llama.llama_installer import MODEL_PRESETS, model_size_gib

GGUF = r'C:\models\x.gguf'
MEASURED = 2.910


@pytest.fixture
def setup(tmp_path, monkeypatch):
    monkeypatch.setattr(lc, '_llm_measured', {'file': None, 'gb': None})
    cfg = lc.LlamaConfig(config_dir=str(tmp_path))
    cfg.installer = MagicMock()
    cfg.installer.get_model_path.return_value = GGUF
    cfg.installer.find_llama_server.return_value = 'llama-server.exe'
    cfg.installer.get_mmproj_path.return_value = 'mm.gguf'
    ledger = types.SimpleNamespace(_allocations={}, get_free_vram=lambda: 8.0)
    diag = {'action': 'start', 'actions': [], 'run_mode': 'gpu', 'gpu_type': 'nvidia',
            'compute_budget_mb': 8000, 'best_model_index': 0, 'binary_mismatch': None,
            'gpu_occupied': False, 'binary_current_build': 1, 'gpu_free_gb': 8.0,
            'gpu_total_gb': 8.0, 'vram_allocations': {}}

    def run(spawn_books):
        def start(model_preset=None, **kw):
            spawn_books(ledger)
            return True
        with patch.object(lc, 'scan_existing_llm_endpoints', return_value=None), \
             patch.object(lc, 'scan_openai_compatible_ports', return_value=None), \
             patch.object(cfg, 'diagnose', return_value=diag), \
             patch.object(cfg, '_get_vram_manager', return_value=ledger), \
             patch.object(cfg, 'start_server', side_effect=start), \
             patch.object(cfg, '_save_config'):
            assert cfg.auto_setup(model_index=0).get('success')
        return ledger._allocations.get('llm')
    file_gb = model_size_gib(MODEL_PRESETS[0], installer=cfg.installer)
    return run, file_gb


def test_a_figure_measured_at_spawn_survives_setup(setup):
    run, file_gb = setup
    assert MEASURED != pytest.approx(file_gb)
    booked = run(lambda vm: lc.book_llm_vram(vm, MEASURED, measured_file=GGUF))
    assert booked == MEASURED


def test_with_nothing_measured_setup_books_the_file_size(setup):
    run, file_gb = setup
    assert run(lambda vm: None) == pytest.approx(file_gb)


def test_a_figure_measured_for_another_file_is_replaced(setup):
    run, file_gb = setup
    booked = run(lambda vm: lc.book_llm_vram(vm, MEASURED, measured_file=r'C:\models\other.gguf'))
    assert booked == pytest.approx(file_gb)


def test_the_file_size_setup_books_is_not_mistaken_for_a_measurement(setup):
    """A later reuse must not read step 8's file size as measured."""
    run, _ = setup
    run(lambda vm: None)
    assert lc._llm_measured == {'file': None, 'gb': None}
