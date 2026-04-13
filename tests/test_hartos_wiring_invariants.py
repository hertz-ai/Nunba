"""
Deep functional tests for HARTOS wiring invariants.

Tests the CONTRACT between Nunba and HARTOS:
- HARTOS modules importable
- Dependency chain: Nunba → HARTOS → hevolve-database
- Key HARTOS exports available
- Social API routes registered
- Agent engine routes registered
- Cultural wisdom immutable
- ModelCatalog singleton shared
- Platform paths resolve correctly
"""
import importlib
import os
import sys

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


# ==========================================================================
# 1. Core HARTOS Modules Importable
# ==========================================================================
class TestCoreImports:
    def test_import_hart_intelligence(self):
        try:
            mod = importlib.import_module('hart_intelligence')
            assert mod is not None
        except (ImportError, ModuleNotFoundError) as e:
            pytest.skip(f"hart_intelligence deps missing: {e}")

    def test_import_helper(self):
        mod = importlib.import_module('helper')
        assert mod is not None

    def test_import_create_recipe(self):
        try:
            mod = importlib.import_module('create_recipe')
            assert mod is not None
        except (ImportError, ModuleNotFoundError) as e:
            pytest.skip(f"create_recipe deps missing: {e}")

    def test_import_reuse_recipe(self):
        try:
            mod = importlib.import_module('reuse_recipe')
            assert mod is not None
        except (ImportError, ModuleNotFoundError) as e:
            pytest.skip(f"reuse_recipe deps missing: {e}")

    def test_import_lifecycle_hooks(self):
        mod = importlib.import_module('lifecycle_hooks')
        assert mod is not None

    def test_import_cultural_wisdom(self):
        mod = importlib.import_module('cultural_wisdom')
        assert mod is not None

    def test_import_agent_identity(self):
        mod = importlib.import_module('agent_identity')
        assert mod is not None


# ==========================================================================
# 2. HARTOS Integration Packages
# ==========================================================================
class TestIntegrationPackages:
    def test_import_social(self):
        mod = importlib.import_module('integrations.social')
        assert mod is not None

    def test_import_channels_admin(self):
        mod = importlib.import_module('integrations.channels.admin.api')
        assert mod is not None

    def test_import_model_catalog(self):
        mod = importlib.import_module('integrations.service_tools.model_catalog')
        assert mod is not None

    def test_import_tts_router(self):
        try:
            mod = importlib.import_module('integrations.tts.tts_router')
            assert mod is not None
        except ImportError:
            pytest.skip("TTS router not available")

    def test_import_agent_engine(self):
        try:
            mod = importlib.import_module('integrations.agent_engine')
            assert mod is not None
        except ImportError:
            pytest.skip("Agent engine package not available")


# ==========================================================================
# 3. Nunba Shim Modules
# ==========================================================================
class TestNunbaShims:
    def test_models_catalog_reexports(self):
        from models.catalog import ModelCatalog, ModelEntry, ModelType
        assert ModelCatalog is not None
        assert ModelEntry is not None
        assert ModelType is not None

    def test_models_catalog_shared_singleton(self):
        from integrations.service_tools.model_catalog import get_catalog as hartos_get

        from models.catalog import get_catalog as nunba_get
        assert nunba_get() is hartos_get(), "Catalog singleton must be shared"

    def test_models_orchestrator_importable(self):
        from models.orchestrator import get_orchestrator
        assert get_orchestrator is not None


# ==========================================================================
# 4. Routes Registration
# ==========================================================================
class TestRoutesRegistration:
    @pytest.fixture(scope='class')
    def app_rules(self):
        from main import app
        return {r.rule for r in app.url_map.iter_rules()}

    def test_chat_route_registered(self, app_rules):
        assert '/chat' in app_rules

    def test_prompts_route_registered(self, app_rules):
        assert '/prompts' in app_rules

    def test_health_route_registered(self, app_rules):
        assert '/health' in app_rules

    def test_social_auth_routes(self, app_rules):
        assert '/api/social/auth/register' in app_rules
        assert '/api/social/auth/login' in app_rules

    def test_social_feed_route(self, app_rules):
        assert '/api/social/feed' in app_rules

    def test_admin_config_route(self, app_rules):
        assert '/api/admin/config' in app_rules or any('/api/admin/' in r for r in app_rules)

    def test_admin_models_route(self, app_rules):
        assert '/api/admin/models' in app_rules

    def test_tts_routes(self, app_rules):
        assert '/tts/synthesize' in app_rules
        assert '/tts/voices' in app_rules
        assert '/tts/status' in app_rules

    def test_voice_routes(self, app_rules):
        assert '/voice/transcribe' in app_rules

    def test_total_routes_above_100(self, app_rules):
        assert len(app_rules) >= 100, f"Expected 100+ routes, got {len(app_rules)}"


# ==========================================================================
# 5. Platform Paths Contract
# ==========================================================================
class TestPlatformPathsContract:
    def test_get_data_dir_returns_string(self):
        from core.platform_paths import get_data_dir
        assert isinstance(get_data_dir(), str)

    def test_db_path_ends_with_db(self):
        from core.platform_paths import get_db_path
        assert get_db_path().endswith('.db')

    def test_db_dir_under_data_dir(self):
        from core.platform_paths import get_data_dir, get_db_dir
        assert get_db_dir().startswith(get_data_dir())


# ==========================================================================
# 6. Cultural Wisdom Contract
# ==========================================================================
class TestCulturalWisdomContract:
    def test_traits_is_tuple(self):
        from cultural_wisdom import CULTURAL_TRAITS
        assert isinstance(CULTURAL_TRAITS, tuple)

    def test_at_least_30_traits(self):
        from cultural_wisdom import CULTURAL_TRAITS
        assert len(CULTURAL_TRAITS) >= 30

    def test_get_cultural_prompt_callable(self):
        from cultural_wisdom import get_cultural_prompt
        result = get_cultural_prompt()
        assert isinstance(result, str) and len(result) > 50

    def test_get_cultural_prompt_compact_callable(self):
        from cultural_wisdom import get_cultural_prompt_compact
        result = get_cultural_prompt_compact()
        assert isinstance(result, str) and len(result) > 50


# ==========================================================================
# 7. Key Configuration Files
# ==========================================================================
class TestConfigFiles:
    def test_config_json_exists(self):
        config_path = os.path.join(PROJECT_ROOT, 'config.json')
        assert os.path.isfile(config_path), "config.json must exist"

    def test_template_json_exists(self):
        template_path = os.path.join(PROJECT_ROOT, 'template.json')
        assert os.path.isfile(template_path), "template.json must exist"

    def test_hart_version_importable(self):
        import hart_version
        assert hasattr(hart_version, 'version')
        assert isinstance(hart_version.version, str)

    def test_requirements_txt_exists(self):
        assert os.path.isfile(os.path.join(PROJECT_ROOT, 'requirements.txt'))

    def test_ruff_toml_exists(self):
        assert os.path.isfile(os.path.join(PROJECT_ROOT, 'ruff.toml'))
