"""A cloud login's token is a signed-in user on every local endpoint.

Measured live 2026-09-25 on the owner's desktop, after logout + cloud OTP
login as user 10202: the window's token is the Kong-issued cloud token (32
chars, opaque, no dots); the login sync stores it as the user's api_token.
With that one token, GET /api/social/auth/me answered 200 (user 10202) but
GET /agents/sync answered 401, so the UI showed the amber "Session expired"
toast and "Please login to talk to agent".  Three call sites decoded the
token as a JWT themselves instead of asking the canonical resolver:
chatbot_routes._get_user_id_from_auth (/agents/sync, agent save),
main._chat_sync_resolve_uid (/api/chat-sync/*) and main.sse_event_stream
(which then streamed as 'guest', so pushes to 10202 reached nobody).

These drive the real functions with the resolver mocked at its boundary.
"""
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

CLOUD_TOKEN = 'k' * 32          # the measured shape: opaque, no dots
CLOUD_USER = '10202'


def _resolver(token):
    return CLOUD_USER if token == CLOUD_TOKEN else None


@pytest.fixture(scope='module')
def main_mod():
    try:
        import main
    except Exception as e:  # pragma: no cover - import env issue
        pytest.skip(f"Could not import main.py: {e}")
    return main


@pytest.fixture(autouse=True)
def _resolver_patched():
    with patch('integrations.social.auth.user_id_for_token', side_effect=_resolver):
        yield


class TestTheCloudTokenIsTheUser:

    def test_agent_sync_auth_resolves_the_cloud_token(self, main_mod):
        from routes import chatbot_routes
        with main_mod.app.test_request_context(
                '/agents/sync', headers={'Authorization': f'Bearer {CLOUD_TOKEN}'},
                environ_base={'REMOTE_ADDR': '10.0.0.5'}):
            assert chatbot_routes._get_user_id_from_auth() == CLOUD_USER

    def test_an_unknown_token_is_still_refused(self, main_mod):
        from routes import chatbot_routes
        with main_mod.app.test_request_context(
                '/agents/sync', headers={'Authorization': 'Bearer nope'},
                environ_base={'REMOTE_ADDR': '10.0.0.5'}):
            assert chatbot_routes._get_user_id_from_auth() is None

    def test_chat_sync_resolves_the_cloud_token(self, main_mod):
        settings = MagicMock(cloud_sync_enabled=True)
        with patch('desktop.chat_settings.get_chat_settings', return_value=settings), \
             main_mod.app.test_request_context(
                 '/api/chat-sync/pull',
                 headers={'Authorization': f'Bearer {CLOUD_TOKEN}'}):
            uid, err = main_mod._chat_sync_resolve_uid()
        assert (uid, err) == (CLOUD_USER, None)

    def test_the_sse_stream_registers_under_the_cloud_user(self, main_mod, monkeypatch):
        monkeypatch.setenv('NUNBA_BUNDLED', '1')
        with main_mod._sse_lock:
            main_mod._sse_clients.clear()
        with main_mod.app.test_request_context(
                f'/api/social/events/stream?token={CLOUD_TOKEN}'):
            resp = main_mod.sse_event_stream()
        assert not isinstance(resp, tuple), resp
        gen = resp.response
        next(iter(gen))                      # registration runs on first yield
        try:
            with main_mod._sse_lock:
                assert CLOUD_USER in main_mod._sse_clients, dict(main_mod._sse_clients)
                assert 'guest' not in main_mod._sse_clients
        finally:
            gen.close()
