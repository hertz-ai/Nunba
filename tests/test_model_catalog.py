"""Tests for models/catalog.py — Nunba ModelCatalog shim.

Covers: re-exports from HARTOS, populate_llm_presets, populate_tts_engines,
populate_media_gen, get_catalog singleton, and integration between Nunba
populators and the HARTOS ModelCatalog.
"""
import logging
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from integrations.service_tools.model_catalog import (
    ModelCatalog,
    ModelEntry,
    ModelType,
)

from models.catalog import (
    BACKENDS,
    MODEL_TYPES,
    SOURCES,
    get_catalog,
    populate_llm_presets,
    populate_media_gen,
    populate_tts_engines,
)

# ===========================================================================
# 1. RE-EXPORTS
# ===========================================================================

class TestReExports:
    def test_model_catalog_class_reexported(self):
        from models.catalog import ModelCatalog as MC
        assert MC is ModelCatalog

    def test_model_entry_reexported(self):
        from models.catalog import ModelEntry as ME
        assert ME is ModelEntry

    def test_model_type_reexported(self):
        from models.catalog import ModelType as MT
        assert MT is ModelType

    def test_backends_is_dict_or_list(self):
        assert BACKENDS is not None

    def test_model_types_is_not_none(self):
        assert MODEL_TYPES is not None

    def test_sources_is_not_none(self):
        assert SOURCES is not None


# ===========================================================================
# 2. populate_tts_engines (no-op)
# ===========================================================================

class TestPopulateTTSEngines:
    def test_returns_zero(self):
        catalog = MagicMock(spec=ModelCatalog)
        result = populate_tts_engines(catalog)
        assert result == 0

    def test_does_not_register_anything(self):
        catalog = MagicMock(spec=ModelCatalog)
        populate_tts_engines(catalog)
        catalog.register.assert_not_called()


# ===========================================================================
# 3. populate_llm_presets
# ===========================================================================

class TestPopulateLLMPresets:
    def _make_preset(self, name='Test Model', repo='user/repo', file='model.gguf',
                     size_mb=4000, has_vision=False, mmproj=None, mmproj_source=None,
                     min_build=None):
        return SimpleNamespace(
            display_name=name,
            repo_id=repo,
            file_name=file,
            size_mb=size_mb,
            description='A test model',
            has_vision=has_vision,
            mmproj_file=mmproj,
            mmproj_source_file=mmproj_source,
            min_build=min_build,
        )

    def test_registers_presets_into_catalog(self):
        presets = [self._make_preset(name='Model A'), self._make_preset(name='Model B')]
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = None  # not yet registered

        with patch('models.catalog.MODEL_PRESETS', presets, create=True):
            with patch.dict('sys.modules', {}):
                # Patch the import inside the function
                mock_installer = MagicMock()
                mock_installer.MODEL_PRESETS = presets
                with patch.dict('sys.modules', {'llama': MagicMock(), 'llama.llama_installer': mock_installer}):
                    result = populate_llm_presets(catalog)
        assert result == 2
        assert catalog.register.call_count == 2

    def test_skips_already_registered(self):
        presets = [self._make_preset(name='Model A')]
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = MagicMock()  # already registered

        mock_installer = MagicMock()
        mock_installer.MODEL_PRESETS = presets
        with patch.dict('sys.modules', {'llama': MagicMock(), 'llama.llama_installer': mock_installer}):
            result = populate_llm_presets(catalog)
        assert result == 0
        catalog.register.assert_not_called()

    def test_handles_import_error(self):
        catalog = MagicMock(spec=ModelCatalog)
        # Force ImportError when trying to import llama.llama_installer
        with patch.dict('sys.modules', {'llama': None, 'llama.llama_installer': None}):
            result = populate_llm_presets(catalog)
        assert result == 0

    def test_vision_model_includes_mmproj(self):
        presets = [self._make_preset(
            name='Vision Model', has_vision=True,
            mmproj='mmproj.gguf', mmproj_source='mmproj-F16.gguf')]
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = None

        mock_installer = MagicMock()
        mock_installer.MODEL_PRESETS = presets
        with patch.dict('sys.modules', {'llama': MagicMock(), 'llama.llama_installer': mock_installer}):
            populate_llm_presets(catalog)

        # Check the registered entry has vision tags and mmproj in files
        entry = catalog.register.call_args[0][0]
        assert 'vision' in entry.tags
        assert entry.files['mmproj'] == 'mmproj.gguf'
        assert entry.files['mmproj_source'] == 'mmproj-F16.gguf'
        assert entry.capabilities['has_vision'] is True

    def test_first_preset_gets_recommended_tag(self):
        presets = [self._make_preset(name='First'), self._make_preset(name='Second')]
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = None

        mock_installer = MagicMock()
        mock_installer.MODEL_PRESETS = presets
        with patch.dict('sys.modules', {'llama': MagicMock(), 'llama.llama_installer': mock_installer}):
            populate_llm_presets(catalog)

        first_entry = catalog.register.call_args_list[0][0][0]
        second_entry = catalog.register.call_args_list[1][0][0]
        assert 'recommended' in first_entry.tags
        assert 'recommended' not in second_entry.tags

    def test_first_preset_has_auto_load(self):
        presets = [self._make_preset(name='First'), self._make_preset(name='Second')]
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = None

        mock_installer = MagicMock()
        mock_installer.MODEL_PRESETS = presets
        with patch.dict('sys.modules', {'llama': MagicMock(), 'llama.llama_installer': mock_installer}):
            populate_llm_presets(catalog)

        first_entry = catalog.register.call_args_list[0][0][0]
        second_entry = catalog.register.call_args_list[1][0][0]
        assert first_entry.auto_load is True
        assert second_entry.auto_load is False

    def test_entry_id_format(self):
        presets = [self._make_preset(name='Qwen 3.5 (4B)')]
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = None

        mock_installer = MagicMock()
        mock_installer.MODEL_PRESETS = presets
        with patch.dict('sys.modules', {'llama': MagicMock(), 'llama.llama_installer': mock_installer}):
            populate_llm_presets(catalog)

        entry = catalog.register.call_args[0][0]
        assert entry.id.startswith('llm-')
        assert '(' not in entry.id
        assert ')' not in entry.id
        assert ' ' not in entry.id

    def test_quality_score_bounded(self):
        presets = [self._make_preset(name='Huge Model', size_mb=100000)]
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = None

        mock_installer = MagicMock()
        mock_installer.MODEL_PRESETS = presets
        with patch.dict('sys.modules', {'llama': MagicMock(), 'llama.llama_installer': mock_installer}):
            populate_llm_presets(catalog)

        entry = catalog.register.call_args[0][0]
        assert entry.quality_score <= 0.95

    def test_speed_score_bounded(self):
        presets = [self._make_preset(name='Huge Model', size_mb=100000)]
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = None

        mock_installer = MagicMock()
        mock_installer.MODEL_PRESETS = presets
        with patch.dict('sys.modules', {'llama': MagicMock(), 'llama.llama_installer': mock_installer}):
            populate_llm_presets(catalog)

        entry = catalog.register.call_args[0][0]
        assert entry.speed_score >= 0.3

    def test_qwen_model_gets_context_length(self):
        presets = [self._make_preset(name='Qwen3.5 4B Q4')]
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = None

        mock_installer = MagicMock()
        mock_installer.MODEL_PRESETS = presets
        with patch.dict('sys.modules', {'llama': MagicMock(), 'llama.llama_installer': mock_installer}):
            populate_llm_presets(catalog)

        entry = catalog.register.call_args[0][0]
        assert entry.capabilities.get('context_length') == 256000
        assert entry.capabilities.get('chat_template') == 'jinja'


# ===========================================================================
# 4. populate_media_gen
# ===========================================================================

class TestPopulateMediaGen:
    def test_registers_ace_step_and_ltx(self):
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = None  # not registered
        result = populate_media_gen(catalog)
        assert result == 2
        assert catalog.register.call_count == 2

    def test_skips_already_registered(self):
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = MagicMock()  # already registered
        result = populate_media_gen(catalog)
        assert result == 0

    def test_ace_step_entry_fields(self):
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = None
        populate_media_gen(catalog)

        # Find the ACE Step entry
        entries = [c[0][0] for c in catalog.register.call_args_list]
        ace = next(e for e in entries if 'acestep' in e.id)
        assert ace.model_type == ModelType.AUDIO_GEN
        assert ace.vram_gb == 6.0
        assert 'music' in ace.tags
        assert ace.auto_load is False

    def test_ltx_entry_fields(self):
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = None
        populate_media_gen(catalog)

        entries = [c[0][0] for c in catalog.register.call_args_list]
        ltx = next(e for e in entries if 'ltx' in e.id)
        assert ltx.model_type == ModelType.VIDEO_GEN
        assert ltx.vram_gb == 8.0
        assert 'video' in ltx.tags
        assert ltx.supports_cpu is False

    def test_partial_registration(self):
        """Only register what's missing."""
        catalog = MagicMock(spec=ModelCatalog)

        def get_side_effect(entry_id):
            if 'acestep' in entry_id:
                return MagicMock()  # already exists
            return None

        catalog.get.side_effect = get_side_effect
        result = populate_media_gen(catalog)
        assert result == 1  # only LTX registered


# ===========================================================================
# 5. get_catalog SINGLETON
# ===========================================================================

class TestGetCatalog:
    def test_returns_model_catalog_instance(self):
        catalog = get_catalog()
        assert isinstance(catalog, ModelCatalog)

    def test_returns_same_instance(self):
        c1 = get_catalog()
        c2 = get_catalog()
        assert c1 is c2

    def test_catalog_has_populators(self):
        catalog = get_catalog()
        populator_names = [name for name, fn in catalog._populators]
        assert 'llm_presets' in populator_names
        assert 'tts_engines' in populator_names
        assert 'media_gen' in populator_names

    def test_shared_with_hartos_module(self):
        import integrations.service_tools.model_catalog as hartos_mod
        catalog = get_catalog()
        assert hartos_mod._catalog_instance is catalog


# ===========================================================================
# 6. ENTRY REGISTRATION DETAILS
# ===========================================================================

class TestEntryRegistrationDetails:
    def test_all_entries_have_local_tag(self):
        """All LLM presets registered by populate_llm_presets should have 'local' tag."""
        presets = [SimpleNamespace(
            display_name='Test', repo_id='repo/test', file_name='test.gguf',
            size_mb=2000, description='', has_vision=False,
            mmproj_file=None, mmproj_source_file=None, min_build=None,
        )]
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = None

        mock_installer = MagicMock()
        mock_installer.MODEL_PRESETS = presets
        with patch.dict('sys.modules', {'llama': MagicMock(), 'llama.llama_installer': mock_installer}):
            populate_llm_presets(catalog)

        entry = catalog.register.call_args[0][0]
        assert 'local' in entry.tags

    def test_persist_is_false(self):
        """Populate should not persist to disk (runtime-only registration)."""
        presets = [SimpleNamespace(
            display_name='Test', repo_id='repo/test', file_name='test.gguf',
            size_mb=2000, description='', has_vision=False,
            mmproj_file=None, mmproj_source_file=None, min_build=None,
        )]
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = None

        mock_installer = MagicMock()
        mock_installer.MODEL_PRESETS = presets
        with patch.dict('sys.modules', {'llama': MagicMock(), 'llama.llama_installer': mock_installer}):
            populate_llm_presets(catalog)

        _, kwargs = catalog.register.call_args
        assert kwargs.get('persist') is False

    def test_backend_is_llama_cpp(self):
        presets = [SimpleNamespace(
            display_name='Test', repo_id='repo/test', file_name='test.gguf',
            size_mb=2000, description='', has_vision=False,
            mmproj_file=None, mmproj_source_file=None, min_build=None,
        )]
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = None

        mock_installer = MagicMock()
        mock_installer.MODEL_PRESETS = presets
        with patch.dict('sys.modules', {'llama': MagicMock(), 'llama.llama_installer': mock_installer}):
            populate_llm_presets(catalog)

        entry = catalog.register.call_args[0][0]
        assert entry.backend == 'llama.cpp'

    def test_supports_both_gpu_and_cpu(self):
        presets = [SimpleNamespace(
            display_name='Test', repo_id='repo/test', file_name='test.gguf',
            size_mb=2000, description='', has_vision=False,
            mmproj_file=None, mmproj_source_file=None, min_build=None,
        )]
        catalog = MagicMock(spec=ModelCatalog)
        catalog.get.return_value = None

        mock_installer = MagicMock()
        mock_installer.MODEL_PRESETS = presets
        with patch.dict('sys.modules', {'llama': MagicMock(), 'llama.llama_installer': mock_installer}):
            populate_llm_presets(catalog)

        entry = catalog.register.call_args[0][0]
        assert entry.supports_gpu is True
        assert entry.supports_cpu is True
