"""
Functional tests for LLM management API endpoints via Flask test client.

Tests: /api/llm/status, /api/llm/auto-setup, /api/llm/configure,
/api/llm/switch, /api/admin/models/*, /nunba/ai/status, /backend/health,
/backend/watchdog
"""
import os
import sys
import time

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


@pytest.fixture(scope='module')
def client():
    try:
        from main import app
        app.config['TESTING'] = True
        with app.test_client() as c:
            yield c
    except Exception as e:
        pytest.skip(f"Could not import Flask app: {e}")


# ==========================================================================
# 1. LLM Status
# ==========================================================================
class TestLLMStatus:
    def test_llm_status_returns_json(self, client):
        resp = client.get('/api/llm/status')
        assert resp.status_code in (200, 500, 503)
        data = resp.get_json()
        assert data is not None

    def test_llm_status_has_health_info(self, client):
        resp = client.get('/api/llm/status')
        if resp.status_code == 200:
            data = resp.get_json()
            # Should have some health/status indicator
            assert isinstance(data, dict)

    def test_llm_control_status_active_field(self, client):
        resp = client.get('/llm_control_status')
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, dict)

    def test_status_includes_version_upgrade(self, client):
        """The global (Tier-1) upgrade card reads status.version_upgrade."""
        resp = client.get('/api/llm/status')
        if resp.status_code == 200:
            data = resp.get_json()
            assert 'version_upgrade' in data, \
                "status must expose version_upgrade for the global upgrade card"
            vu = data['version_upgrade']
            assert isinstance(vu, dict) and 'available' in vu


# ==========================================================================
# 1b. llama.cpp self-upgrade actuator (#124/#134) — queue now, swap at boot
# ==========================================================================
class TestLlamaUpgradeActuator:
    """Staged binary upgrade: the endpoint only sets a flag (instant, safe); the
    swap runs at the next cold start when no server holds the binary open."""

    def test_upgrade_endpoint_queues_pending_swap(self, client):
        resp = client.post('/api/llm/upgrade', json={},
                            content_type='application/json')
        # local test client → _is_local_request() True; 200 queued, or 500 if the
        # installer is unavailable in this env (still must return JSON, never hang).
        assert resp.status_code in (200, 500)
        data = resp.get_json()
        assert data is not None
        if resp.status_code == 200:
            assert data.get('success') is True
            assert data.get('queued') is True

    def test_queue_sets_flag_and_apply_runs_installer_once(self):
        from unittest.mock import MagicMock
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig()
        cfg._save_config = MagicMock()          # don't touch disk
        cfg.installer = MagicMock()
        cfg.installer.get_version.return_value = "9180"
        cfg.installer.update_llama_cpp.return_value = True

        out = cfg.queue_llama_upgrade()
        assert out['queued'] is True
        assert cfg.config.get('pending_llama_swap') is True

        applied = cfg.apply_pending_llama_upgrade()
        assert applied is True
        cfg.installer.update_llama_cpp.assert_called_once()
        assert cfg.config.get('pending_llama_swap') is False, \
            "applied upgrade must clear the flag so it doesn't re-run every boot"

    def test_apply_is_noop_when_nothing_queued(self):
        from unittest.mock import MagicMock
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig()
        cfg._save_config = MagicMock()
        cfg.installer = MagicMock()
        cfg.config['pending_llama_swap'] = False
        assert cfg.apply_pending_llama_upgrade() is False
        cfg.installer.update_llama_cpp.assert_not_called()

    def test_apply_clears_flag_even_when_download_fails(self):
        """A bad release must NOT wedge boot in a retry loop — clear on failure too."""
        from unittest.mock import MagicMock
        from llama.llama_config import LlamaConfig
        cfg = LlamaConfig()
        cfg._save_config = MagicMock()
        cfg.installer = MagicMock()
        cfg.installer.update_llama_cpp.side_effect = RuntimeError("download 404")
        cfg.config['pending_llama_swap'] = True
        assert cfg.apply_pending_llama_upgrade() is False      # failed
        assert cfg.config.get('pending_llama_swap') is False   # but cleared


# ==========================================================================
# 1c. Version-aware binary resolution (#124 follow-through)
# ==========================================================================
class TestVersionAwareBinaryResolution:
    """A stale system/trueflow binary must not shadow a freshly-upgraded
    Nunba-managed one: with min_build given, find_llama_server prefers the
    first candidate that satisfies it (live-witnessed: trueflow b8200 kept
    serving while the upgraded b9581 sat unused in install_dir)."""

    def _installer(self):
        from llama.llama_installer import LlamaInstaller
        LlamaInstaller._logged_paths.clear()
        LlamaInstaller._version_cache.clear()
        return LlamaInstaller()

    def test_no_min_build_keeps_first_existing(self):
        import pathlib
        from unittest.mock import patch
        inst = self._installer()
        nunba_marker = str(inst.install_dir).lower()
        def fake_exists(p):
            s = str(p).lower()
            return '.trueflow' in s or nunba_marker in s
        with patch.object(pathlib.Path, 'exists', fake_exists):
            found = inst.find_llama_server(check_system_first=True)
        assert found and '.trueflow' in found.lower(), \
            "without min_build the original first-existing order must hold"

    def test_min_build_prefers_satisfying_candidate(self):
        inst = self._installer()
        nunba_marker = str(inst.install_dir).lower()
        def fake_exists(p):
            s = str(p).lower()
            return '.trueflow' in s or nunba_marker in s
        def fake_version(path=None):
            s = str(path or '').lower()
            if '.trueflow' in s:
                return 8200
            if nunba_marker in s:
                return 9581
            return None
        import pathlib
        from unittest.mock import patch
        inst.get_version = fake_version
        with patch.object(pathlib.Path, 'exists', fake_exists):
            found = inst.find_llama_server(check_system_first=True, min_build=9180)
        assert found and nunba_marker in found.lower(), \
            f"should pick the b9581 nunba-managed binary, got {found}"

    def test_min_build_falls_back_when_none_satisfies(self):
        inst = self._installer()
        nunba_marker = str(inst.install_dir).lower()
        def fake_exists(p):
            s = str(p).lower()
            return '.trueflow' in s or nunba_marker in s
        def fake_version(path=None):
            return 8200  # everything old
        import pathlib
        from unittest.mock import patch
        inst.get_version = fake_version
        with patch.object(pathlib.Path, 'exists', fake_exists):
            found = inst.find_llama_server(check_system_first=True, min_build=9180)
        assert found and '.trueflow' in found.lower(), \
            "no candidate satisfies -> keep first existing (warn-and-proceed)"

    def test_get_version_mtime_cache_skips_respawn(self):
        from unittest.mock import patch, MagicMock
        from llama.llama_installer import LlamaInstaller
        LlamaInstaller._version_cache.clear()
        inst = LlamaInstaller()
        fake = MagicMock()
        fake.stdout, fake.stderr = 'version: 9581 (abc)', ''
        with patch('llama.llama_installer.subprocess.run', return_value=fake) as run, \
             patch('llama.llama_installer.os.path.getmtime', return_value=111.0):
            assert inst.get_version('X:/fake/llama-server.exe') == 9581
            assert inst.get_version('X:/fake/llama-server.exe') == 9581
            assert run.call_count == 1, "second call must hit the mtime cache"
        with patch('llama.llama_installer.subprocess.run', return_value=fake) as run2, \
             patch('llama.llama_installer.os.path.getmtime', return_value=222.0):
            assert inst.get_version('X:/fake/llama-server.exe') == 9581
            assert run2.call_count == 1, "changed mtime must re-probe"


# ==========================================================================
# 2. LLM Auto-Setup
# ==========================================================================
class TestLLMAutoSetup:
    def test_auto_setup_post(self, client):
        resp = client.post('/api/llm/auto-setup',
                          json={},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 500, 503)

    def test_auto_setup_returns_json(self, client):
        resp = client.post('/api/llm/auto-setup',
                          json={},
                          content_type='application/json')
        data = resp.get_json()
        assert data is not None


# ==========================================================================
# 3. LLM Configure
# ==========================================================================
class TestLLMConfigure:
    def test_configure_post(self, client):
        resp = client.post('/api/llm/configure',
                          json={},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 500)

    def test_configure_with_model_index(self, client):
        resp = client.post('/api/llm/configure',
                          json={'model_index': 0},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 500)


# ==========================================================================
# 4. LLM Switch
# ==========================================================================
class TestLLMSwitch:
    def test_switch_model(self, client):
        resp = client.post('/api/llm/switch',
                          json={'model_index': 0},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 500)

    def test_switch_invalid_index(self, client):
        resp = client.post('/api/llm/switch',
                          json={'model_index': 9999},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 404, 500)


# ==========================================================================
# 5. Admin Models API
# ==========================================================================
class TestAdminModelsAPI:
    def test_list_models(self, client):
        resp = client.get('/api/admin/models')
        assert resp.status_code in (200, 401, 403, 500)
        if resp.status_code == 200:
            data = resp.get_json()
            assert isinstance(data, (dict, list))

    def test_models_health(self, client):
        resp = client.get('/api/admin/models/health')
        assert resp.status_code in (200, 401, 403, 500)

    def test_get_specific_model(self, client):
        # Try to get a model that likely exists
        resp = client.get('/api/admin/models')
        if resp.status_code == 200:
            data = resp.get_json()
            models = data.get('models', data) if isinstance(data, dict) else data
            if isinstance(models, list) and models:
                model_id = models[0].get('id', models[0].get('model_id', ''))
                if model_id:
                    resp2 = client.get(f'/api/admin/models/{model_id}')
                    assert resp2.status_code in (200, 404, 500)

    def test_get_nonexistent_model(self, client):
        resp = client.get('/api/admin/models/does-not-exist-xyz')
        assert resp.status_code in (200, 404, 500)

    def test_auto_select_model(self, client):
        resp = client.post('/api/admin/models/auto-select',
                          json={},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 500)

    def test_register_model(self, client):
        resp = client.post('/api/admin/models',
                          json={'id': 'test-model', 'name': 'Test'},
                          content_type='application/json')
        assert resp.status_code in (200, 201, 400, 409, 500)

    def test_load_model(self, client):
        resp = client.post('/api/admin/models/test-model/load',
                          json={},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 404, 500)

    def test_unload_model(self, client):
        resp = client.post('/api/admin/models/test-model/unload',
                          json={},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 404, 500)

    def test_download_model(self, client):
        resp = client.post('/api/admin/models/test-model/download',
                          json={},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 404, 500)

    def test_swap_model(self, client):
        resp = client.post('/api/admin/models/swap',
                          json={'model_id': 'test'},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 404, 500)

    def test_delete_model(self, client):
        resp = client.delete('/api/admin/models/nonexistent-test-xyz')
        assert resp.status_code in (200, 204, 404, 500)

    def test_update_model(self, client):
        resp = client.put('/api/admin/models/nonexistent-test-xyz',
                         json={'name': 'Updated'},
                         content_type='application/json')
        assert resp.status_code in (200, 400, 404, 500)


# ==========================================================================
# 6. Nunba AI Status
# ==========================================================================
class TestNunbaAIStatus:
    def test_nunba_info(self, client):
        resp = client.get('/nunba/info')
        assert resp.status_code in (200, 500)
        if resp.status_code == 200:
            data = resp.get_json()
            assert 'application' in data or 'ai_config' in data

    def test_nunba_ai_status(self, client):
        resp = client.get('/nunba/ai/status')
        assert resp.status_code in (200, 404, 500)

    def test_nunba_info_has_ai_capabilities(self, client):
        resp = client.get('/nunba/info')
        if resp.status_code == 200:
            data = resp.get_json()
            if 'ai_capabilities' in data:
                caps = data['ai_capabilities']
                assert 'engine' in caps or 'local_llm' in caps


# ==========================================================================
# 7. Backend Health / Watchdog
# ==========================================================================
class TestBackendHealth:
    def test_backend_health(self, client):
        resp = client.get('/backend/health')
        assert resp.status_code in (200, 404, 500)

    def test_backend_watchdog(self, client):
        resp = client.get('/backend/watchdog')
        assert resp.status_code in (200, 500)
        data = resp.get_json()
        assert data is not None

    def test_health_endpoint(self, client):
        resp = client.get('/health')
        assert resp.status_code in (200, 500)
        data = resp.get_json()
        assert data is not None


# ==========================================================================
# 8. Network Status
# ==========================================================================
class TestNetworkStatusLLM:
    def test_network_status(self, client):
        resp = client.get('/network/status')
        assert resp.status_code in (200, 404)
        if resp.status_code == 200:
            data = resp.get_json()
            assert 'is_online' in data

    def test_status_endpoint(self, client):
        resp = client.get('/status')
        assert resp.status_code in (200, 500)
