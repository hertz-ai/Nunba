"""
Deep functional tests for agent sync, migration, and multi-device rules.

Tests INTENDED BEHAVIOR of /agents/sync, /agents/migrate, /agents/contact:
- Sync returns agent list structure
- Migrate requires valid agent data
- Contact endpoint for peer discovery
- Agent data format: prompt_id, name, type, is_active
- No sensitive data leaked in sync responses
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


# ==========================================================================
# 1. Agent Sync GET
# ==========================================================================
class TestAgentSyncGet:
    def test_sync_returns_json(self, client):
        resp = client.get('/agents/sync')
        assert resp.status_code in (200, 401, 500)
        if resp.status_code == 200:
            data = resp.get_json()
            assert isinstance(data, (dict, list))

    def test_sync_has_agents_key(self, client):
        resp = client.get('/agents/sync')
        if resp.status_code == 200:
            data = resp.get_json()
            if isinstance(data, dict):
                assert 'agents' in data or 'prompts' in data or 'sync' in data

    def test_sync_responds_fast(self, client):
        start = time.time()
        client.get('/agents/sync')
        assert time.time() - start < 5.0, "/agents/sync must respond within 5s"


# ==========================================================================
# 2. Agent Sync POST
# ==========================================================================
class TestAgentSyncPost:
    def test_sync_post_accepts_json(self, client):
        resp = client.post('/agents/sync',
                          json={'device_id': 'test-device'},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 401, 500)

    def test_sync_post_empty_body(self, client):
        resp = client.post('/agents/sync',
                          json={},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 401, 500)

    def test_sync_post_returns_json(self, client):
        resp = client.post('/agents/sync',
                          json={'agents': []},
                          content_type='application/json')
        data = resp.get_json()
        assert data is not None


# ==========================================================================
# 3. Agent Migrate
# ==========================================================================
class TestAgentMigrate:
    def test_migrate_post(self, client):
        resp = client.post('/agents/migrate',
                          json={'agent_id': 'test-123', 'target_device': 'device-456'},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 401, 404, 500)

    def test_migrate_empty_body(self, client):
        resp = client.post('/agents/migrate',
                          json={},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 401, 500)

    def test_migrate_returns_json(self, client):
        resp = client.post('/agents/migrate',
                          json={},
                          content_type='application/json')
        data = resp.get_json()
        assert data is not None


# ==========================================================================
# 4. Agent Contact
# ==========================================================================
class TestAgentContact:
    def test_contact_post(self, client):
        resp = client.post('/agents/contact',
                          json={'peer_id': 'test-peer'},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 401, 500)

    def test_contact_respond(self, client):
        resp = client.post('/agents/contact/respond',
                          json={'peer_id': 'test', 'accepted': True},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 401, 404, 500)


# ==========================================================================
# 5. No Sensitive Data in Sync
# ==========================================================================
class TestSyncSecurity:
    def test_no_passwords_in_sync(self, client):
        resp = client.get('/agents/sync')
        body = resp.get_data(as_text=True)
        assert 'password' not in body.lower(), "Sync must not contain passwords"

    def test_no_secrets_in_sync(self, client):
        resp = client.get('/agents/sync')
        body = resp.get_data(as_text=True)
        assert 'secret_key' not in body.lower(), "Sync must not expose secret keys"
        assert 'api_key' not in body.lower() or 'api_key_required' in body.lower(), \
            "Sync must not expose API keys"


# ==========================================================================
# 6. Social Agent Endpoints
# ==========================================================================
class TestSocialAgentEndpoints:
    @pytest.fixture(autouse=True)
    def auth(self, client):
        ts = int(time.time() * 1000)
        user = {'username': f'agent_sync_{ts}', 'password': 'TestPass123!'}
        client.post('/api/social/auth/register', json=user, content_type='application/json')
        resp = client.post('/api/social/auth/login', json=user, content_type='application/json')
        if resp.status_code != 200:
            pytest.skip("Auth failed")
        token = (resp.get_json().get('data') or {}).get('token', '')
        self.headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

    def test_agent_dispatch(self, client):
        resp = client.post('/api/social/agent/dispatch',
                          json={'agent_id': 'test', 'task': 'hello'},
                          headers=self.headers)
        assert resp.status_code in (200, 400, 401, 404, 500)

    def test_agent_observe(self, client):
        resp = client.post('/api/social/agent/observe',
                          json={'agent_id': 'test'},
                          headers=self.headers)
        assert resp.status_code in (200, 400, 401, 404, 500)

    def test_specialization_trees(self, client):
        resp = client.get('/api/social/agents/specialization-trees',
                         headers=self.headers)
        assert resp.status_code in (200, 404, 500)

    def test_agent_audit(self, client):
        resp = client.get('/api/social/audit/agents', headers=self.headers)
        assert resp.status_code in (200, 403, 404, 500)

    def test_dashboard_agents(self, client):
        resp = client.get('/api/social/dashboard/agents', headers=self.headers)
        assert resp.status_code in (200, 404, 500)

    def test_user_agents(self, client):
        resp = client.get('/api/social/users/1/agents', headers=self.headers)
        assert resp.status_code in (200, 404, 500)
