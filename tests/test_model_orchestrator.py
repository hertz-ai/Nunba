"""Tests for models/orchestrator.py — Nunba ModelOrchestrator shim.

Covers: re-exports from HARTOS, _entry_to_preset, LlamaLoader, TTSLoader,
STTLoader, VLMLoader, _register_loaders, get_orchestrator singleton.
"""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from integrations.service_tools.model_orchestrator import (
    ModelEntry,
    ModelLoader,
    ModelOrchestrator,
)

from models.orchestrator import (
    LlamaLoader,
    STTLoader,
    TTSLoader,
    VLMLoader,
    _entry_to_preset,
    _register_loaders,
    get_orchestrator,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_entry(**overrides):
    defaults = dict(
        id='llm-test-model',
        name='Test Model',
        model_type='llm',
        source='huggingface',
        repo_id='user/repo',
        files={'model': 'model.gguf', 'repo': 'user/repo'},
        vram_gb=4.0,
        ram_gb=5.0,
        disk_gb=4.0,
        backend='llama.cpp',
        supports_gpu=True,
        supports_cpu=True,
        supports_cpu_offload=False,
        idle_timeout_s=0,
        min_build=None,
        capabilities={'has_vision': False},
        quality_score=0.85,
        speed_score=0.7,
        priority=90,
        tags=['local'],
        auto_load=False,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


# ===========================================================================
# 1. RE-EXPORTS
# ===========================================================================

class TestReExports:
    def test_model_entry_reexported(self):
        from models.orchestrator import ModelEntry as ME
        assert ME is ModelEntry

    def test_model_loader_reexported(self):
        from models.orchestrator import ModelLoader as ML
        assert ML is ModelLoader

    def test_model_orchestrator_reexported(self):
        from models.orchestrator import ModelOrchestrator as MO
        assert MO is ModelOrchestrator

    def test_model_type_reexported(self):
        from models.orchestrator import ModelType
        assert ModelType is not None

    def test_get_catalog_reexported(self):
        from models.orchestrator import get_catalog
        assert callable(get_catalog)


# ===========================================================================
# 2. _entry_to_preset
# ===========================================================================

class TestEntryToPreset:
    def test_basic_conversion(self):
        entry = _make_entry()
        mock_preset_cls = MagicMock()
        with patch('models.orchestrator.ModelPreset', mock_preset_cls, create=True):
            from llama.llama_installer import ModelPreset
            result = _entry_to_preset(entry)
        assert result is not None

    def test_returns_none_when_no_model_file(self):
        entry = _make_entry(files={'repo': 'user/repo'})  # no 'model' key
        result = _entry_to_preset(entry)
        assert result is None

    def test_vision_model_includes_mmproj(self):
        entry = _make_entry(
            files={'model': 'model.gguf', 'repo': 'user/repo',
                   'mmproj': 'mmproj.gguf', 'mmproj_source': 'mmproj-F16.gguf'},
            capabilities={'has_vision': True},
        )
        result = _entry_to_preset(entry)
        assert result is not None
        assert result.has_vision is True
        assert result.mmproj_file == 'mmproj.gguf'
        assert result.mmproj_source_file == 'mmproj-F16.gguf'

    def test_non_vision_model_no_mmproj(self):
        entry = _make_entry(capabilities={'has_vision': False})
        result = _entry_to_preset(entry)
        assert result.has_vision is False
        assert result.mmproj_file is None

    def test_disk_gb_to_size_mb(self):
        entry = _make_entry(disk_gb=4.0)
        result = _entry_to_preset(entry)
        assert result.size_mb == 4096

    def test_repo_id_from_entry(self):
        entry = _make_entry(repo_id='custom/repo')
        result = _entry_to_preset(entry)
        assert result.repo_id == 'custom/repo'

    def test_repo_id_fallback_from_files(self):
        entry = _make_entry(repo_id=None, files={'model': 'model.gguf', 'repo': 'fallback/repo'})
        result = _entry_to_preset(entry)
        assert result.repo_id == 'fallback/repo'

    def test_min_build_propagated(self):
        entry = _make_entry(min_build='b3456')
        result = _entry_to_preset(entry)
        assert result.min_build == 'b3456'


# ===========================================================================
# 3. LlamaLoader
# ===========================================================================

class TestLlamaLoader:
    def test_is_model_loader_subclass(self):
        assert issubclass(LlamaLoader, ModelLoader)

    def test_load_success(self):
        loader = LlamaLoader()
        entry = _make_entry()
        mock_config = MagicMock()
        mock_config.start_server.return_value = True
        mock_presets = [SimpleNamespace(
            display_name='Test Model', file_name='model.gguf',
            repo_id='user/repo', size_mb=4000, has_vision=False,
            mmproj_file=None, mmproj_source_file=None, min_build=None,
            description='',
        )]
        with patch('models.orchestrator.LlamaConfig', return_value=mock_config, create=True):
            with patch('models.orchestrator.MODEL_PRESETS', mock_presets, create=True):
                mock_mod = MagicMock()
                mock_mod.LlamaConfig = MagicMock(return_value=mock_config)
                mock_mod2 = MagicMock()
                mock_mod2.MODEL_PRESETS = mock_presets
                mock_mod2.ModelPreset = type(mock_presets[0])
                with patch.dict('sys.modules', {
                    'llama.llama_config': mock_mod,
                    'llama.llama_installer': mock_mod2,
                }):
                    result = loader.load(entry, 'gpu')
        assert result is True

    def test_load_handles_exception(self):
        loader = LlamaLoader()
        entry = _make_entry()
        with patch.dict('sys.modules', {'llama.llama_config': None}):
            result = loader.load(entry, 'gpu')
        assert result is False

    def test_unload_calls_stop_server(self):
        loader = LlamaLoader()
        entry = _make_entry()
        mock_config = MagicMock()
        mock_mod = MagicMock()
        mock_mod.LlamaConfig = MagicMock(return_value=mock_config)
        with patch.dict('sys.modules', {'llama.llama_config': mock_mod}):
            loader.unload(entry)
        mock_config.stop_server.assert_called_once()

    def test_unload_handles_exception(self):
        loader = LlamaLoader()
        entry = _make_entry()
        with patch.dict('sys.modules', {'llama.llama_config': None}):
            # Should not raise
            loader.unload(entry)

    def test_download_calls_installer(self):
        loader = LlamaLoader()
        entry = _make_entry()
        mock_installer = MagicMock()
        mock_installer_inst = MagicMock()
        mock_installer_inst.download_model.return_value = True
        mock_installer.LlamaInstaller = MagicMock(return_value=mock_installer_inst)
        mock_installer.MODEL_PRESETS = [SimpleNamespace(
            display_name='Test Model', file_name='model.gguf',
            repo_id='user/repo', size_mb=4000, has_vision=False,
            mmproj_file=None, mmproj_source_file=None, min_build=None,
            description='',
        )]
        mock_installer.ModelPreset = type(mock_installer.MODEL_PRESETS[0])
        with patch.dict('sys.modules', {'llama.llama_installer': mock_installer}):
            result = loader.download(entry)
        assert result is True

    def test_download_handles_exception(self):
        loader = LlamaLoader()
        entry = _make_entry()
        with patch.dict('sys.modules', {'llama.llama_installer': None}):
            result = loader.download(entry)
        assert result is False

    def test_is_downloaded_calls_installer(self):
        loader = LlamaLoader()
        entry = _make_entry()
        mock_installer = MagicMock()
        mock_installer_inst = MagicMock()
        mock_installer_inst.is_model_downloaded.return_value = True
        mock_installer.LlamaInstaller = MagicMock(return_value=mock_installer_inst)
        mock_installer.MODEL_PRESETS = [SimpleNamespace(
            display_name='Test Model', file_name='model.gguf',
            repo_id='user/repo', size_mb=4000, has_vision=False,
            mmproj_file=None, mmproj_source_file=None, min_build=None,
            description='',
        )]
        mock_installer.ModelPreset = type(mock_installer.MODEL_PRESETS[0])
        with patch.dict('sys.modules', {'llama.llama_installer': mock_installer}):
            result = loader.is_downloaded(entry)
        assert result is True

    def test_is_downloaded_returns_false_on_error(self):
        loader = LlamaLoader()
        entry = _make_entry()
        with patch.dict('sys.modules', {'llama.llama_installer': None}):
            result = loader.is_downloaded(entry)
        assert result is False


# ===========================================================================
# 4. TTSLoader
# ===========================================================================

class TestTTSLoader:
    def test_is_model_loader_subclass(self):
        assert issubclass(TTSLoader, ModelLoader)

    def test_download_success(self):
        loader = TTSLoader()
        entry = _make_entry(id='tts-chatterbox-turbo')
        mock_pkg = MagicMock()
        mock_pkg.install_backend_full = MagicMock(return_value=(True, 'ok'))
        with patch.dict('sys.modules', {'tts.package_installer': mock_pkg}):
            result = loader.download(entry)
        assert result is True

    def test_download_failure(self):
        loader = TTSLoader()
        entry = _make_entry(id='tts-chatterbox-turbo')
        mock_pkg = MagicMock()
        mock_pkg.install_backend_full = MagicMock(return_value=(False, 'error'))
        with patch.dict('sys.modules', {'tts.package_installer': mock_pkg}):
            result = loader.download(entry)
        assert result is False

    def test_download_import_error(self):
        loader = TTSLoader()
        entry = _make_entry(id='tts-chatterbox-turbo')
        with patch.dict('sys.modules', {'tts.package_installer': None}):
            result = loader.download(entry)
        assert result is False

    def test_load_when_runnable(self):
        loader = TTSLoader()
        entry = _make_entry(id='tts-piper')
        mock_engine = MagicMock()
        mock_engine._can_run_backend.return_value = True
        mock_tts = MagicMock()
        mock_tts.TTSEngine = MagicMock(return_value=mock_engine)
        with patch.dict('sys.modules', {'tts.tts_engine': mock_tts}):
            result = loader.load(entry, 'gpu')
        assert result is True

    def test_load_when_not_runnable_triggers_install(self):
        loader = TTSLoader()
        entry = _make_entry(id='tts-f5-tts')
        mock_engine = MagicMock()
        mock_engine._can_run_backend.return_value = False
        mock_tts = MagicMock()
        mock_tts.TTSEngine = MagicMock(return_value=mock_engine)
        with patch.dict('sys.modules', {'tts.tts_engine': mock_tts}):
            result = loader.load(entry, 'gpu')
        assert result is False
        mock_engine._try_auto_install_backend.assert_called_once()

    def test_unload_is_noop(self):
        loader = TTSLoader()
        entry = _make_entry(id='tts-piper')
        loader.unload(entry)  # Should not raise

    def test_is_downloaded_with_package(self):
        loader = TTSLoader()
        entry = _make_entry(id='tts-test', files={'package': 'chatterbox'})
        with patch('importlib.util.find_spec', return_value=MagicMock()):
            result = loader.is_downloaded(entry)
        assert result is True

    def test_is_downloaded_missing_package(self):
        loader = TTSLoader()
        entry = _make_entry(id='tts-test', files={'package': 'nonexistent_pkg'})
        with patch('importlib.util.find_spec', return_value=None):
            result = loader.is_downloaded(entry)
        assert result is False

    def test_strips_tts_prefix_for_backend_name(self):
        loader = TTSLoader()
        entry = _make_entry(id='tts-chatterbox-turbo')
        mock_engine = MagicMock()
        mock_engine._can_run_backend.return_value = True
        mock_tts = MagicMock()
        mock_tts.TTSEngine = MagicMock(return_value=mock_engine)
        with patch.dict('sys.modules', {'tts.tts_engine': mock_tts}):
            loader.load(entry, 'gpu')
        mock_engine._can_run_backend.assert_called_with('chatterbox-turbo')


# ===========================================================================
# 5. STTLoader
# ===========================================================================

class TestSTTLoader:
    def test_is_model_loader_subclass(self):
        assert issubclass(STTLoader, ModelLoader)

    def test_load_returns_true_lazy(self):
        loader = STTLoader()
        entry = _make_entry(id='stt-whisper')
        result = loader.load(entry, 'gpu')
        assert result is True

    def test_is_downloaded_true_when_importable(self):
        loader = STTLoader()
        entry = _make_entry(id='stt-whisper')
        with patch('importlib.util.find_spec', return_value=MagicMock()):
            assert loader.is_downloaded(entry) is True

    def test_is_downloaded_false_when_not_importable(self):
        loader = STTLoader()
        entry = _make_entry(id='stt-whisper')
        with patch('importlib.util.find_spec', return_value=None):
            assert loader.is_downloaded(entry) is False

    def test_download_installs_faster_whisper(self):
        loader = STTLoader()
        entry = _make_entry(id='stt-whisper')
        mock_pkg = MagicMock()
        mock_pkg.has_nvidia_gpu.return_value = False
        mock_pkg.is_cuda_torch.return_value = True
        with patch.dict('sys.modules', {'tts.package_installer': mock_pkg}):
            with patch('importlib.util.find_spec', return_value=MagicMock()):
                result = loader.download(entry)
        assert result is True

    def test_download_handles_exception(self):
        loader = STTLoader()
        entry = _make_entry(id='stt-whisper')
        with patch.dict('sys.modules', {'tts.package_installer': None}):
            result = loader.download(entry)
        assert result is False


# ===========================================================================
# 6. VLMLoader
# ===========================================================================

class TestVLMLoader:
    def test_is_model_loader_subclass(self):
        assert issubclass(VLMLoader, ModelLoader)

    def test_load_success(self):
        loader = VLMLoader()
        entry = _make_entry(id='vlm-minicpm')
        mock_vision = MagicMock()
        with patch.dict('sys.modules', {
            'integrations.vision': MagicMock(),
            'integrations.vision.vision_service': mock_vision,
        }):
            result = loader.load(entry, 'gpu')
        assert result is True

    def test_load_handles_exception(self):
        loader = VLMLoader()
        entry = _make_entry(id='vlm-minicpm')
        with patch.dict('sys.modules', {'integrations.vision.vision_service': None}):
            result = loader.load(entry, 'gpu')
        assert result is False


# ===========================================================================
# 7. _register_loaders
# ===========================================================================

class TestRegisterLoaders:
    def test_registers_four_loaders(self):
        import models.orchestrator as mod
        old = mod._loaders_registered
        mod._loaders_registered = False
        try:
            orch = MagicMock(spec=ModelOrchestrator)
            _register_loaders(orch)
            assert orch.register_loader.call_count == 4
        finally:
            mod._loaders_registered = old

    def test_registers_only_once(self):
        import models.orchestrator as mod
        old = mod._loaders_registered
        mod._loaders_registered = False
        try:
            orch = MagicMock(spec=ModelOrchestrator)
            _register_loaders(orch)
            _register_loaders(orch)
            assert orch.register_loader.call_count == 4  # not 8
        finally:
            mod._loaders_registered = old


# ===========================================================================
# 8. get_orchestrator SINGLETON
# ===========================================================================

class TestGetOrchestrator:
    def test_returns_model_orchestrator_instance(self):
        orch = get_orchestrator()
        assert isinstance(orch, ModelOrchestrator)

    def test_returns_same_instance(self):
        o1 = get_orchestrator()
        o2 = get_orchestrator()
        assert o1 is o2

    def test_shared_with_hartos_module(self):
        import integrations.service_tools.model_orchestrator as hartos_mod
        orch = get_orchestrator()
        assert hartos_mod._orchestrator_instance is orch
