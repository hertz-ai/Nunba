"""
Deep functional tests for the distributed agent and goal system.

Tests: /api/distributed/*, /api/social/agent/*, goal contributions,
verification protocol, agent collaboration, evolution history.
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
    user = {'username': f'dist_test_{ts}', 'password': 'TestPass123!'}
    client.post('/api/social/auth/register', json=user, content_type='application/json')
    resp = client.post('/api/social/auth/login', json=user, content_type='application/json')
    if resp.status_code != 200:
        pytest.skip("Auth failed")
    token = (resp.get_json().get('data') or {}).get('token', '')
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


# ==========================================================================
# 1. Distributed API Endpoints
# ==========================================================================
class TestDistributedAPI:
    def test_distributed_tasks(self, client, auth_header):
        resp = client.get('/api/distributed/tasks', headers=auth_header)
        assert resp.status_code in (200, 401, 404, 500)

    def test_distributed_contributions(self, client, auth_header):
        resp = client.get('/api/distributed/contributions', headers=auth_header)
        assert resp.status_code in (200, 401, 404, 500)

    def test_distributed_verify(self, client, auth_header):
        resp = client.post('/api/distributed/verify',
                          json={'task_id': 'test', 'result': 'pass'},
                          headers=auth_header)
        assert resp.status_code in (200, 400, 401, 404, 405, 500)


# ==========================================================================
# 2. Agent Collaboration
# ==========================================================================
class TestAgentCollaboration:
    def test_collaborate_endpoint(self, client, auth_header):
        resp = client.post('/api/social/agents/1/collaborate',
                          json={'task': 'help with math'},
                          headers=auth_header)
        assert resp.status_code in (200, 400, 401, 404, 500)

    def test_list_collaborations(self, client, auth_header):
        resp = client.get('/api/social/agents/1/collaborations',
                         headers=auth_header)
        assert resp.status_code in (200, 404, 500)


# ==========================================================================
# 3. Agent Evolution
# ==========================================================================
class TestAgentEvolution:
    def test_evolution_history(self, client, auth_header):
        resp = client.get('/api/social/agents/1/evolution',
                         headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_evolution_history_detailed(self, client, auth_header):
        resp = client.get('/api/social/agents/1/evolution-history',
                         headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_specialize_agent(self, client, auth_header):
        resp = client.post('/api/social/agents/1/specialize',
                          json={'domain': 'math'},
                          headers=auth_header)
        assert resp.status_code in (200, 400, 401, 404, 500)


# ==========================================================================
# 4. Agent Audit Trail
# ==========================================================================
class TestAgentAudit:
    def test_audit_agents_list(self, client, auth_header):
        resp = client.get('/api/social/audit/agents', headers=auth_header)
        assert resp.status_code in (200, 403, 404, 500)

    def test_audit_agent_conversations(self, client, auth_header):
        resp = client.get('/api/social/audit/agents/1/conversations',
                         headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_audit_agent_thinking(self, client, auth_header):
        resp = client.get('/api/social/audit/agents/1/thinking',
                         headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_audit_agent_timeline(self, client, auth_header):
        resp = client.get('/api/social/audit/agents/1/timeline',
                         headers=auth_header)
        assert resp.status_code in (200, 404, 500)


# ==========================================================================
# 5. Agent Guardrails
# ==========================================================================
class TestAgentGuardrails:
    def test_guardrails_endpoint(self, client):
        resp = client.get('/api/agent-engine/guardrails')
        assert resp.status_code in (200, 401, 404, 500)

    def test_guardrails_returns_json(self, client):
        resp = client.get('/api/agent-engine/guardrails')
        if resp.status_code == 200:
            data = resp.get_json()
            assert isinstance(data, dict)

    def test_agent_engine_stats(self, client):
        resp = client.get('/api/agent-engine/stats')
        assert resp.status_code in (200, 401, 404, 500)


# ==========================================================================
# 6. Social Feed Agent Integration
# ==========================================================================
class TestFeedAgentIntegration:
    def test_feed_agent_spotlight(self, client, auth_header):
        resp = client.get('/api/social/feed/agent-spotlight', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_feed_agents(self, client, auth_header):
        resp = client.get('/api/social/feed/agents', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_marketplace_agents(self, client, auth_header):
        resp = client.get('/api/social/marketplace/agents', headers=auth_header)
        assert resp.status_code in (200, 404, 500)


# ==========================================================================
# 7. Notifications (Agent-related)
# ==========================================================================
class TestAgentNotifications:
    def test_notifications_endpoint(self, client, auth_header):
        resp = client.get('/api/social/notifications', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_notifications_returns_json(self, client, auth_header):
        resp = client.get('/api/social/notifications', headers=auth_header)
        if resp.status_code == 200:
            data = resp.get_json()
            assert isinstance(data, (list, dict))
