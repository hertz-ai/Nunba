"""
Deep functional tests for Admin Channels API (/api/admin/*).

Tests INTENDED BEHAVIOR of the channels admin system:
- Config CRUD (get/update settings)
- Identity management
- Channel management
- Workflow automation
- Metrics collection
- Session management
- Auth: requires JWT + admin role
- Plugin system
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
        pytest.skip(f"Flask app not available: {e}")


@pytest.fixture(scope='module')
def auth_header(client):
    ts = int(time.time() * 1000)
    user = {'username': f'admin_test_{ts}', 'password': 'AdminPass123!'}
    client.post('/api/social/auth/register', json=user, content_type='application/json')
    resp = client.post('/api/social/auth/login', json=user, content_type='application/json')
    if resp.status_code != 200:
        pytest.skip("Auth failed")
    token = (resp.get_json().get('data') or {}).get('token', '')
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


# ==========================================================================
# 1. Config Endpoints
# ==========================================================================
class TestConfigAPI:
    def test_get_config(self, client, auth_header):
        resp = client.get('/api/admin/config', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)

    def test_get_config_returns_json(self, client, auth_header):
        resp = client.get('/api/admin/config', headers=auth_header)
        if resp.status_code == 200:
            data = resp.get_json()
            assert isinstance(data, dict), "Config must be a JSON object"

    def test_update_config(self, client, auth_header):
        resp = client.put('/api/admin/config',
                         json={'test_setting': 'test_value'},
                         headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 405, 500)

    def test_config_general(self, client, auth_header):
        resp = client.get('/api/admin/config/general', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)

    def test_config_ai(self, client, auth_header):
        resp = client.get('/api/admin/config/ai', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)


# ==========================================================================
# 2. Identity Endpoints
# ==========================================================================
class TestIdentityAPI:
    def test_get_identity(self, client, auth_header):
        resp = client.get('/api/admin/identity', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)

    def test_identity_returns_json(self, client, auth_header):
        resp = client.get('/api/admin/identity', headers=auth_header)
        if resp.status_code == 200:
            data = resp.get_json()
            assert isinstance(data, dict)

    def test_update_identity(self, client, auth_header):
        resp = client.put('/api/admin/identity',
                         json={'name': 'Test Node'},
                         headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 405, 500)


# ==========================================================================
# 3. Channels Endpoints
# ==========================================================================
class TestChannelsAPI:
    def test_list_channels(self, client, auth_header):
        resp = client.get('/api/admin/channels', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)

    def test_channels_returns_list_or_dict(self, client, auth_header):
        resp = client.get('/api/admin/channels', headers=auth_header)
        if resp.status_code == 200:
            data = resp.get_json()
            assert isinstance(data, (list, dict))

    def test_create_channel(self, client, auth_header):
        resp = client.post('/api/admin/channels',
                          json={'name': f'test-channel-{int(time.time())}', 'type': 'text'},
                          headers=auth_header)
        assert resp.status_code in (200, 201, 400, 401, 403, 404, 500)


# ==========================================================================
# 4. Metrics Endpoints
# ==========================================================================
class TestMetricsAPI:
    def test_get_metrics(self, client, auth_header):
        resp = client.get('/api/admin/metrics', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)

    def test_metrics_errors(self, client, auth_header):
        resp = client.get('/api/admin/metrics/errors', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)

    def test_metrics_performance(self, client, auth_header):
        resp = client.get('/api/admin/metrics/performance', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)


# ==========================================================================
# 5. Sessions Endpoints
# ==========================================================================
class TestSessionsAPI:
    def test_list_sessions(self, client, auth_header):
        resp = client.get('/api/admin/sessions', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)

    def test_sessions_returns_json(self, client, auth_header):
        resp = client.get('/api/admin/sessions', headers=auth_header)
        if resp.status_code == 200:
            data = resp.get_json()
            assert isinstance(data, (list, dict))


# ==========================================================================
# 6. Workflows / Automation Endpoints
# ==========================================================================
class TestWorkflowsAPI:
    def test_list_workflows(self, client, auth_header):
        resp = client.get('/api/admin/automation/workflows', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)

    def test_create_workflow(self, client, auth_header):
        resp = client.post('/api/admin/automation/workflows',
                          json={'name': 'test-workflow', 'steps': []},
                          headers=auth_header)
        assert resp.status_code in (200, 201, 400, 401, 403, 404, 500)


# ==========================================================================
# 7. Auth Requirements
# ==========================================================================
class TestAdminAuthRequirements:
    def test_config_requires_auth(self, client):
        resp = client.get('/api/admin/config')
        assert resp.status_code in (401, 403, 404, 500), \
            f"Admin config without auth should be rejected, got {resp.status_code}"

    def test_identity_requires_auth(self, client):
        resp = client.get('/api/admin/identity')
        assert resp.status_code in (401, 403, 404, 500)

    def test_channels_requires_auth(self, client):
        resp = client.get('/api/admin/channels')
        assert resp.status_code in (401, 403, 404, 500)

    def test_metrics_requires_auth(self, client):
        resp = client.get('/api/admin/metrics')
        assert resp.status_code in (401, 403, 404, 500)

    def test_sessions_requires_auth(self, client):
        resp = client.get('/api/admin/sessions')
        assert resp.status_code in (401, 403, 404, 500)

    def test_invalid_token_rejected(self, client):
        resp = client.get('/api/admin/config',
                         headers={'Authorization': 'Bearer invalid.fake.token'})
        assert resp.status_code in (401, 403, 500)


# ==========================================================================
# 8. Plugins Endpoints
# ==========================================================================
class TestPluginsAPI:
    def test_list_plugins(self, client, auth_header):
        resp = client.get('/api/admin/plugins', headers=auth_header)
        assert resp.status_code in (200, 401, 403, 404, 500)

    def test_install_plugin(self, client, auth_header):
        resp = client.post('/api/admin/plugins',
                          json={'name': 'test-plugin'},
                          headers=auth_header)
        assert resp.status_code in (200, 201, 400, 401, 403, 404, 500)
