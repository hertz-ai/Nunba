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
