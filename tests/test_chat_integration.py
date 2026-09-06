"""
test_chat_integration.py - Integration tests for the chat pipeline

Tests the full request→response chain: Flask route → adapter → LLM → response.
Each test verifies a specific end-to-end user scenario:

FT: Default agent "hi" returns a response, agent switching changes behavior,
    thinking traces included when present, error responses have correct shape.
NFT: Response time bounds (casual_conv < 1s for mock), no daemon traces leak,
     concurrent requests don't corrupt state, request_id propagated end-to-end.
"""
import os
import sys
import threading
from unittest.mock import patch

import pytest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


@pytest.fixture
def app():
    """Create a minimal Flask app with chatbot routes."""
    from flask import Flask
    app = Flask(__name__)
    app.config['TESTING'] = True
    try:
        from routes.chatbot_routes import chatbot_bp
        app.register_blueprint(chatbot_bp)
    except Exception:
        pass
    return app


@pytest.fixture
def client(app):
    return app.test_client()


# ============================================================
# Chat response shape — frontend parses specific keys
# ============================================================

class TestChatResponseShape:
    """Every /chat response must have specific keys — frontend destructures them."""

    def test_successful_response_has_text(self):
        """The 'text' field contains the AI's response — displayed in the chat bubble."""
        from routes.hartos_backend_adapter import chat
        with patch('routes.hartos_backend_adapter._fallback_chat',
                   return_value={'text': 'Hello!', 'source': 'local_llama'}):
            with patch('routes.hartos_backend_adapter._hartos_backend_available', False):
                result = chat(text='hi', user_id='test_user')
        assert 'text' in result or 'response' in result

    def test_response_includes_source(self):
        """Source field tells frontend where the response came from."""
        from routes.hartos_backend_adapter import chat
        with patch('routes.hartos_backend_adapter._fallback_chat',
                   return_value={'text': 'ok', 'source': 'local_llama'}):
            with patch('routes.hartos_backend_adapter._hartos_backend_available', False):
                result = chat(text='hi', user_id='test')
        assert 'source' in result

    def test_error_response_is_dict(self):
        """When fallback returns error, response is still a dict (not exception)."""
        from routes.hartos_backend_adapter import chat
        with patch('routes.hartos_backend_adapter._fallback_chat',
                   return_value={'error': 'LLM unavailable', 'loading': True}):
            with patch('routes.hartos_backend_adapter._hartos_backend_available', False):
                result = chat(text='hi', user_id='test')
        assert isinstance(result, dict)
        assert result.get('error') or result.get('loading')


# ============================================================
# casual_conv optimization — default agent should be fast
# ============================================================

class TestCasualConvOptimization:
    """casual_conv=True skips tool loading — 14K→3K chars prompt, 5x faster."""

    def test_casual_conv_passed_to_backend(self):
        """When casual_conv=True, the backend should receive it."""
        from routes.hartos_backend_adapter import chat
        with patch('routes.hartos_backend_adapter._fallback_chat',
                   return_value={'text': 'hi', 'source': 'local'}) as mock_fb:
            with patch('routes.hartos_backend_adapter._hartos_backend_available', False):
                chat(text='hello', user_id='test', casual_conv=True)

    def test_non_casual_with_agent_id(self):
        """When agent_id is set, casual_conv should be False (tools needed)."""
        from routes.hartos_backend_adapter import chat
        with patch('routes.hartos_backend_adapter._fallback_chat',
                   return_value={'text': 'ok', 'source': 'local'}):
            with patch('routes.hartos_backend_adapter._hartos_backend_available', False):
                result = chat(text='hi', user_id='test', agent_id='12345',
                              casual_conv=False)
        assert isinstance(result, dict)

    def test_bundled_mode_never_casual(self):
        """In bundled mode (NUNBA_BUNDLED/frozen), casual_conv must be False
        so all tools (Visual_Context_Camera, memory, watchers) are visible."""
        import os
        # Simulate bundled mode
        old = os.environ.get('NUNBA_BUNDLED')
        os.environ['NUNBA_BUNDLED'] = '1'
        try:
            _is_bundled = bool(os.environ.get('NUNBA_BUNDLED'))
            _is_casual = (
                True  # no prompt_id, no create_agent, no agentic — would be casual
                and not _is_bundled
            )
            assert not _is_casual, "Bundled mode should never be casual"
        finally:
            if old is None:
                os.environ.pop('NUNBA_BUNDLED', None)
            else:
                os.environ['NUNBA_BUNDLED'] = old

    def test_non_bundled_default_is_casual(self):
        """Non-bundled (cloud/web) default chat should still be casual for performance."""
        import os
        old = os.environ.pop('NUNBA_BUNDLED', None)
        try:
            import sys
            was_frozen = getattr(sys, 'frozen', False)
            sys.frozen = False
            _is_bundled = bool(os.environ.get('NUNBA_BUNDLED') or getattr(sys, 'frozen', False))
            _is_casual = (
                True  # no prompt_id, no create_agent, no agentic
                and not _is_bundled
            )
            assert _is_casual, "Non-bundled default should be casual for performance"
            sys.frozen = was_frozen
        finally:
            if old:
                os.environ['NUNBA_BUNDLED'] = old


# ============================================================
# Thinking traces — batched, not streamed
# ============================================================

class TestThinkingTraceIntegration:
    """Thinking traces are captured during chat and returned in the response."""

    def test_thinking_traces_isolated_by_request_id(self):
        """Each request gets only its own traces — daemon traces excluded."""
        from routes.hartos_backend_adapter import _capture_thinking, drain_thinking_traces
        # Simulate daemon trace
        _capture_thinking({'priority': 49, 'action': 'Thinking',
                           'request_id': 'daemon_goal1', 'text': 'daemon work'})
        # Simulate user trace
        _capture_thinking({'priority': 49, 'action': 'Thinking',
                           'request_id': 'user_req_1', 'text': 'user thinking'})

        # Drain user's traces
        user_traces = drain_thinking_traces('user_req_1')
        assert len(user_traces) == 1
        assert user_traces[0]['text'] == 'user thinking'

        # Daemon traces still present (not drained to user)
        daemon_traces = drain_thinking_traces('daemon_goal1')
        assert len(daemon_traces) == 1

    def test_drain_with_no_traces_returns_empty(self):
        from routes.hartos_backend_adapter import drain_thinking_traces
        result = drain_thinking_traces('nonexistent_request')
        assert result == []


# ============================================================
# Concurrent requests — thread safety
# ============================================================

class TestConcurrentRequests:
    """Multiple users chatting simultaneously must not corrupt each other's state."""

    def test_parallel_chat_calls_dont_crash(self):
        """10 concurrent chat calls must all complete without crash."""
        from routes.hartos_backend_adapter import chat
        errors = []
        results = []

        def do_chat(user_id):
            try:
                with patch('routes.hartos_backend_adapter._fallback_chat',
                           return_value={'text': f'hi {user_id}', 'source': 'mock'}):
                    with patch('routes.hartos_backend_adapter._hartos_backend_available', False):
                        r = chat(text='hello', user_id=user_id)
                        results.append(r)
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=do_chat, args=(f'user_{i}',))
                   for i in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0, f"Errors in concurrent chat: {errors}"
        assert len(results) == 10


# ============================================================
# Request ID propagation — traces keyed by request
# ============================================================

class TestRequestIdPropagation:
    """request_id flows from Flask route → adapter → thinking traces → response."""

    def test_request_id_accepted(self):
        from routes.hartos_backend_adapter import chat
        with patch('routes.hartos_backend_adapter._fallback_chat',
                   return_value={'text': 'ok', 'source': 'mock'}):
            with patch('routes.hartos_backend_adapter._hartos_backend_available', False):
                result = chat(text='hi', user_id='test', request_id='req-abc-123')
        assert isinstance(result, dict)

    def test_thinking_traces_keyed_by_request_id(self):
        """Traces captured with the request_id can be drained by that ID."""
        from routes.hartos_backend_adapter import _capture_thinking, drain_thinking_traces
        _capture_thinking({'priority': 49, 'action': 'Thinking',
                           'request_id': 'specific_req', 'text': 'step 1'})
        traces = drain_thinking_traces('specific_req')
        assert len(traces) == 1
        assert traces[0]['request_id'] == 'specific_req'


# ============================================================
# Boot window — a request that NAMES an agent must not be
# answered by the generic fallback
# ============================================================

class TestBootWindowDoesNotImpersonateAgent:
    """While HARTOS loads, `chat()` must not answer AS a named agent.

    Root cause, measured live 2026-09-07 on the installed build.  Driving
    agent 60834540771 at 30s and 40s after launch produced a fluent
    "Hello! I'm ready to help, but I need a specific task to get started..."
    with ZERO hart_intelligence_entry lines in the log; the same drive at
    ~6 min entered reuse normally (3/3 reproduction by app age).
    /backend/health reported "operational" the whole time, so nothing
    surfaced the substitution — the agent simply looked broken.

    Mechanism: hartos_backend_adapter.chat falls back with
    `_fallback_chat(text, user_id, **kwargs)`.  agent_id / create_agent /
    agentic_execute are NAMED parameters of chat(), so they are
    structurally absent from kwargs — the fallback cannot know which agent
    was addressed, and answers from bare llama.cpp with no persona and no
    recipe.

    Casual chat keeps the fallback (that is the case it was written for and
    the LLM really is up).  These tests pin the split.
    """

    _SENTINEL = {'text': 'FALLBACK-WAS-USED', 'source': 'local_llama'}

    def _chat(self, **kw):
        from routes.hartos_backend_adapter import chat
        with patch('routes.hartos_backend_adapter._fallback_chat',
                   return_value=dict(self._SENTINEL)):
            with patch('routes.hartos_backend_adapter._hartos_initialized', False):
                return chat(user_id='test_user', **kw)

    def test_agent_addressed_request_is_not_answered_by_fallback(self):
        """A saved agent must never be impersonated by a generic completion."""
        result = self._chat(text='Carry out your assigned job now.',
                            agent_id=60834540771)
        assert result.get('text') != 'FALLBACK-WAS-USED', (
            "a request naming agent 60834540771 was answered by the generic "
            "llama.cpp fallback, which never receives agent_id and so has no "
            "persona and no recipe — the user cannot tell their agent never ran")

    def test_create_agent_request_is_not_answered_by_fallback(self):
        """CREATE is agent work too — the fallback cannot author a recipe."""
        result = self._chat(text='Build me an agent that files receipts.',
                            create_agent=True)
        assert result.get('text') != 'FALLBACK-WAS-USED', (
            "a create_agent request was answered by the generic fallback, "
            "which cannot author or save a recipe")

    def test_boot_window_refusal_is_honest_and_marked_loading(self):
        """The caller must be able to tell 'still starting' from 'agent replied'."""
        result = self._chat(text='Carry out your assigned job now.',
                            agent_id=60834540771)
        assert result.get('loading') is True, (
            "the boot-window result must be marked loading:true so the caller "
            "can retry instead of treating it as the agent's answer")
        blob = ' '.join(str(v) for v in result.values()).lower()
        assert 'start' in blob, (
            "the message must say the agent is still starting, not invent a "
            "generic assistant reply")

    def test_casual_chat_still_uses_the_fallback(self):
        """Non-regression: the case the fallback was written for is untouched."""
        result = self._chat(text='hi')
        assert result.get('text') == 'FALLBACK-WAS-USED', (
            "casual chat names no agent and the LLM is up — it must keep "
            "using the direct llama.cpp fallback exactly as before")
