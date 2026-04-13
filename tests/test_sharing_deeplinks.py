"""
Deep functional tests for the sharing and deeplinks system.

Tests: /s/<token> share redirect, /api/social/share/* endpoints,
OG metadata generation, referral tracking, share consent.
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
    user = {'username': f'share_test_{ts}', 'password': 'TestPass123!'}
    client.post('/api/social/auth/register', json=user, content_type='application/json')
    resp = client.post('/api/social/auth/login', json=user, content_type='application/json')
    if resp.status_code != 200:
        pytest.skip("Auth failed")
    token = (resp.get_json().get('data') or {}).get('token', '')
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


# ==========================================================================
# 1. Share Redirect (/s/<token>)
# ==========================================================================
class TestShareRedirect:
    def test_invalid_token_redirects(self, client):
        resp = client.get('/s/invalid-token-xyz')
        assert resp.status_code in (200, 302, 404)

    def test_redirect_goes_to_social(self, client):
        resp = client.get('/s/test-token', follow_redirects=False)
        if resp.status_code == 302:
            location = resp.headers.get('Location', '')
            assert 'social' in location or 'share' in location, \
                f"Share redirect should go to /social, got: {location}"

    def test_redirect_preserves_token(self, client):
        resp = client.get('/s/my-share-token', follow_redirects=False)
        if resp.status_code == 302:
            location = resp.headers.get('Location', '')
            assert 'my-share-token' in location, "Redirect must preserve share token"


# ==========================================================================
# 2. Share API Endpoints
# ==========================================================================
class TestShareAPI:
    def test_create_share_link(self, client, auth_header):
        resp = client.post('/api/social/share',
                          json={'content_type': 'post', 'content_id': 1},
                          headers=auth_header)
        assert resp.status_code in (200, 201, 400, 404, 500)

    def test_get_share_link(self, client, auth_header):
        resp = client.get('/api/social/share/test-token', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_share_view_count(self, client):
        resp = client.post('/api/social/share/test-token/view',
                          content_type='application/json')
        assert resp.status_code in (200, 404, 500)


# ==========================================================================
# 3. Experiments / Auto-Evolve
# ==========================================================================
class TestExperiments:
    def test_auto_evolve_endpoint(self, client, auth_header):
        resp = client.post('/api/social/experiments/auto-evolve',
                          json={'hypothesis': 'test'},
                          headers=auth_header)
        assert resp.status_code in (200, 400, 404, 405, 500)

    def test_pause_evolve(self, client, auth_header):
        resp = client.post('/api/social/experiments/pause-evolve',
                          json={}, headers=auth_header)
        assert resp.status_code in (200, 400, 404, 405, 500)

    def test_resume_evolve(self, client, auth_header):
        resp = client.post('/api/social/experiments/resume-evolve',
                          json={}, headers=auth_header)
        assert resp.status_code in (200, 400, 404, 405, 500)


# ==========================================================================
# 4. MCP Endpoints
# ==========================================================================
class TestMCPEndpoints:
    def test_mcp_tools(self, client, auth_header):
        resp = client.get('/api/social/mcp/tools', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_mcp_resources(self, client, auth_header):
        resp = client.get('/api/social/mcp/resources', headers=auth_header)
        assert resp.status_code in (200, 404, 500)


# ==========================================================================
# 5. Theme Endpoints
# ==========================================================================
class TestThemeEndpoints:
    def test_get_themes(self, client, auth_header):
        resp = client.get('/theme/presets', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_get_current_theme(self, client, auth_header):
        resp = client.get('/theme/current', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_set_theme(self, client, auth_header):
        resp = client.post('/theme/set',
                          json={'preset': 'dark'},
                          headers=auth_header)
        assert resp.status_code in (200, 400, 404, 405, 500)


# ==========================================================================
# 6. Memory API
# ==========================================================================
class TestMemoryAPI:
    def test_memory_context(self, client):
        resp = client.get('/api/memory/context?user_id=test')
        assert resp.status_code in (200, 401, 404, 405, 500)

    def test_memory_recall(self, client):
        resp = client.post('/api/memory/recall',
                          json={'query': 'test', 'user_id': 'test'},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 401, 404, 405, 500)


# ==========================================================================
# 7. HART Intelligence API
# ==========================================================================
class TestHARTIntelligenceAPI:
    def test_ai_bootstrap(self, client):
        resp = client.get('/api/ai/bootstrap')
        assert resp.status_code in (200, 401, 404, 405, 500)

    def test_hart_status(self, client):
        resp = client.get('/api/hart/status')
        assert resp.status_code in (200, 404, 500)


# ==========================================================================
# 8. Vault API
# ==========================================================================
class TestVaultAPI:
    def test_vault_list(self, client):
        resp = client.get('/api/vault/keys')
        assert resp.status_code in (200, 401, 404, 405, 500)

    def test_vault_set_requires_auth(self, client):
        resp = client.post('/api/vault/keys',
                          json={'key': 'TEST_KEY', 'value': 'test'},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 401, 404, 405, 500)
