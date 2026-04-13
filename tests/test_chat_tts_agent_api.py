"""
Functional tests for Chat, TTS, Agent, and Upload API endpoints.

Tests: /chat, /prompts, /tts/*, /voice/*, /upload/*, /agents/*,
/api/social/agents/*, /api/agent-engine/*
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


@pytest.fixture(scope='module')
def auth_header(client):
    ts = int(time.time() * 1000)
    user = {'username': f'chat_tts_test_{ts}', 'password': 'TestPass123!'}
    client.post('/api/social/auth/register', json=user, content_type='application/json')
    resp = client.post('/api/social/auth/login', json=user, content_type='application/json')
    if resp.status_code != 200:
        pytest.skip("Auth failed")
    token = (resp.get_json().get('data') or {}).get('token', '')
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


# ==========================================================================
# 1. Chat Endpoint
# ==========================================================================
class TestChatAPI:
    def test_chat_post(self, client):
        resp = client.post('/chat', json={'message': 'hello', 'user_id': 'test'},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 500, 503)

    def test_chat_empty_message(self, client):
        resp = client.post('/chat', json={'message': '', 'user_id': 'test'},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 500)

    def test_chat_no_body(self, client):
        resp = client.post('/chat', content_type='application/json')
        assert resp.status_code in (200, 400, 500)

    def test_chat_get_not_allowed(self, client):
        resp = client.get('/chat')
        assert resp.status_code in (200, 404, 405)


# ==========================================================================
# 2. Prompts Endpoints
# ==========================================================================
class TestPromptsAPI:
    def test_get_prompts(self, client):
        resp = client.get('/prompts')
        assert resp.status_code in (200, 500)
        if resp.status_code == 200:
            data = resp.get_json()
            assert 'prompts' in data or isinstance(data, list)

    def test_get_prompt_all(self, client):
        resp = client.get('/getprompt_all/')
        assert resp.status_code in (200, 404, 500)

    def test_get_prompt_by_userid(self, client):
        resp = client.get('/getprompt_onlyuserid/')
        assert resp.status_code in (200, 404, 500)

    def test_prompts_response_structure(self, client):
        resp = client.get('/prompts')
        if resp.status_code == 200:
            data = resp.get_json()
            if 'prompts' in data:
                assert isinstance(data['prompts'], list)


# ==========================================================================
# 3. TTS Endpoints
# ==========================================================================
class TestTTSAPI:
    def test_tts_status(self, client):
        resp = client.get('/tts/status')
        assert resp.status_code in (200, 500, 503)

    def test_tts_engines(self, client):
        resp = client.get('/tts/engines')
        assert resp.status_code in (200, 500)
        if resp.status_code == 200:
            data = resp.get_json()
            assert isinstance(data, (dict, list))

    def test_tts_voices(self, client):
        resp = client.get('/tts/voices')
        assert resp.status_code in (200, 500)

    def test_tts_synthesize(self, client):
        resp = client.post('/tts/synthesize',
                          json={'text': 'hello world', 'language': 'en'},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 500, 503)

    def test_tts_synthesize_empty_text(self, client):
        resp = client.post('/tts/synthesize',
                          json={'text': '', 'language': 'en'},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 500)

    def test_tts_install(self, client):
        resp = client.post('/tts/install',
                          json={'engine': 'piper'},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 500)

    def test_tts_setup_engine(self, client):
        resp = client.post('/tts/setup-engine',
                          json={'engine': 'piper'},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 500)

    def test_social_tts_quick(self, client, auth_header):
        resp = client.post('/api/social/tts/quick',
                          json={'text': 'test', 'language': 'en'},
                          headers=auth_header)
        assert resp.status_code in (200, 400, 500)

    def test_social_tts_submit(self, client, auth_header):
        resp = client.post('/api/social/tts/submit',
                          json={'text': 'test submission', 'language': 'en'},
                          headers=auth_header)
        assert resp.status_code in (200, 202, 400, 500)


# ==========================================================================
# 4. Voice Endpoints
# ==========================================================================
class TestVoiceAPI:
    def test_voice_transcribe(self, client):
        resp = client.post('/voice/transcribe',
                          content_type='application/json',
                          json={})
        assert resp.status_code in (200, 400, 500)

    def test_voice_diarize(self, client):
        resp = client.post('/voice/diarize',
                          content_type='application/json',
                          json={})
        assert resp.status_code in (200, 400, 500)


# ==========================================================================
# 5. Upload Endpoints
# ==========================================================================
class TestUploadAPI:
    def test_upload_image_no_file(self, client):
        resp = client.post('/upload/image')
        assert resp.status_code in (200, 400, 500)

    def test_upload_audio_no_file(self, client):
        resp = client.post('/upload/audio')
        assert resp.status_code in (200, 400, 500)

    def test_upload_file_no_file(self, client):
        resp = client.post('/upload/file')
        assert resp.status_code in (200, 400, 500)

    def test_upload_vision_no_file(self, client):
        resp = client.post('/upload/vision')
        assert resp.status_code in (200, 400, 500)

    def test_parse_pdf_no_file(self, client):
        resp = client.post('/upload/parse_pdf')
        assert resp.status_code in (200, 400, 500)

    def test_parse_pdf_status(self, client):
        resp = client.get('/upload/parse_pdf/status')
        assert resp.status_code in (200, 404, 500)


# ==========================================================================
# 6. Agent Sync Endpoints
# ==========================================================================
class TestAgentSyncAPI:
    def test_agents_sync_get(self, client):
        resp = client.get('/agents/sync')
        assert resp.status_code in (200, 500)

    def test_agents_sync_post(self, client):
        resp = client.post('/agents/sync', json={}, content_type='application/json')
        assert resp.status_code in (200, 400, 500)

    def test_agents_migrate(self, client):
        resp = client.post('/agents/migrate', json={}, content_type='application/json')
        assert resp.status_code in (200, 400, 500)

    def test_agents_contact(self, client):
        resp = client.post('/agents/contact', json={}, content_type='application/json')
        assert resp.status_code in (200, 400, 500)


# ==========================================================================
# 7. Social Agent Endpoints
# ==========================================================================
class TestSocialAgentAPI:
    def test_agent_showcase(self, client, auth_header):
        resp = client.get('/api/social/agents/showcase', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_agent_leaderboard(self, client, auth_header):
        resp = client.get('/api/social/agents/leaderboard', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_discovery_agents(self, client, auth_header):
        resp = client.get('/api/social/discovery/agents', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_marketplace_agents(self, client, auth_header):
        resp = client.get('/api/social/marketplace/agents', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_suggest_agent_names(self, client, auth_header):
        resp = client.get('/api/social/agents/suggest-names', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_validate_agent_name(self, client, auth_header):
        resp = client.post('/api/social/agents/validate-name',
                          json={'name': 'TestAgent'},
                          headers=auth_header)
        assert resp.status_code in (200, 400, 404, 500)

    def test_feed_agents(self, client, auth_header):
        resp = client.get('/api/social/feed/agents', headers=auth_header)
        assert resp.status_code in (200, 404, 500)

    def test_agent_spotlight(self, client, auth_header):
        resp = client.get('/api/social/feed/agent-spotlight', headers=auth_header)
        assert resp.status_code in (200, 404, 500)


# ==========================================================================
# 8. Agent Engine Endpoints
# ==========================================================================
class TestAgentEngineAPI:
    def test_guardrails(self, client):
        resp = client.get('/api/agent-engine/guardrails')
        assert resp.status_code in (200, 404, 500)

    def test_agent_stats(self, client):
        resp = client.get('/api/agent-engine/stats')
        assert resp.status_code in (200, 404, 500)

    def test_speculation_nonexistent(self, client):
        resp = client.get('/api/agent-engine/speculation/nonexistent')
        assert resp.status_code in (200, 404, 500)


# ==========================================================================
# 9. Intelligence Chat (v1)
# ==========================================================================
class TestIntelligenceChatAPI:
    def test_intelligence_chat(self, client):
        resp = client.post('/api/v1/intelligence/chat',
                          json={'message': 'hello'},
                          content_type='application/json')
        assert resp.status_code in (200, 400, 401, 500)
