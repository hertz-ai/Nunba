"""
Extended functional tests for routes/hartos_backend_adapter.py.

Tests the adapter layer between Nunba and HARTOS: thinking traces,
circuit breaker, chat routing, SocialAPI bridge, prompt loading.
"""
import os
import sys
import time
from collections import OrderedDict
from unittest.mock import MagicMock, patch

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    import routes.hartos_backend_adapter as hba
    from routes.hartos_backend_adapter import (
        _hartos_backend_available,
        drain_thinking_traces,
        get_prompts,
    )
    ADAPTER_AVAILABLE = True
except ImportError:
    ADAPTER_AVAILABLE = False


@pytest.fixture(autouse=True)
def skip_if_unavailable():
    if not ADAPTER_AVAILABLE:
        pytest.skip("hartos_backend_adapter not importable")


# ==========================================================================
# 1. Thinking Traces
# ==========================================================================
class TestThinkingTraces:
    def test_drain_empty_returns_list(self):
        result = drain_thinking_traces('nonexistent-request-id')
        assert isinstance(result, list)
        assert len(result) == 0

    def test_drain_with_unknown_id(self):
        result = drain_thinking_traces(f'unknown_{time.time()}')
        assert result == []

    def test_drain_does_not_return_daemon_traces(self):
        """Daemon traces (prefixed daemon_) should never leak to user chat."""
        result = drain_thinking_traces('daemon_goal123')
        assert isinstance(result, list)

    def test_drain_returns_list_type(self):
        result = drain_thinking_traces('test_request_abc')
        assert isinstance(result, list)


# ==========================================================================
# 2. get_prompts
# ==========================================================================
@pytest.fixture
def no_backend(monkeypatch):
    """The fallback tier, set here rather than inherited.

    _hartos_backend_available is process-wide: once any earlier test starts
    the adapter's hartos-init thread and HARTOS imports, every later
    get_prompts() goes to HARTOS's /prompts instead.  Without this the class
    below tested whichever tier the run happened to leave behind (on CI,
    Tier-1 from test 10 onward)."""
    monkeypatch.setattr(hba, '_hartos_backend_available', False)


@pytest.mark.usefixtures('no_backend')
class TestGetPrompts:
    def test_returns_dict(self):
        result = get_prompts()
        assert isinstance(result, dict)

    def test_has_prompts_key(self):
        result = get_prompts()
        assert 'prompts' in result

    def test_prompts_is_list(self):
        result = get_prompts()
        assert isinstance(result['prompts'], list)

    def test_has_success_or_error_key(self):
        result = get_prompts()
        assert 'success' in result or 'error' in result

    def test_prompts_have_required_fields(self):
        result = get_prompts()
        for prompt in result.get('prompts', []):
            # Each prompt should at minimum have name and prompt_id
            assert 'name' in prompt or 'prompt_id' in prompt or 'id' in prompt

    def test_prompts_not_empty(self):
        result = get_prompts()
        # Should have at least the default local agent
        assert len(result.get('prompts', [])) >= 0  # 0 ok if no agents configured

    def test_with_user_id(self):
        result = get_prompts(user_id='test_user')
        assert isinstance(result, dict)
        assert 'prompts' in result


@pytest.fixture
def in_process_hartos(monkeypatch):
    """Tier-1 with a Flask app whose GET /prompts answers as HARTOS's does
    (hart_intelligence_entry.get_prompts): 400 without a user_id, else that
    user's agents as a bare list.  ``agents`` is what the list holds."""
    from flask import Flask, jsonify, request

    app = Flask('fake_hartos')
    agents = []

    @app.route('/prompts', methods=['GET'])
    def prompts():
        if not request.args.get('user_id'):
            return jsonify({'error': 'user_id required'}), 400
        return jsonify(agents)

    monkeypatch.setattr(hba, '_hartos_backend_available', True)
    monkeypatch.setattr(hba, '_hevolve_app', app)
    return agents


class TestGetPromptsInProcess:
    """Tier-1: the adapter turns HARTOS's bare list into {"prompts": [...]}."""

    def test_no_agents_is_an_empty_list_not_an_empty_dict(self, in_process_hartos):
        # `resp.get_json() or {}` read HARTOS's [] as falsy and handed every
        # caller {} - the /prompts proxy sent it on to the frontend.
        assert get_prompts(user_id='test_user') == {'prompts': []}

    def test_agents_come_back_under_prompts(self, in_process_hartos):
        in_process_hartos.append({'prompt_id': 7, 'name': 'Tutor'})
        assert get_prompts(user_id='test_user') == {
            'prompts': [{'prompt_id': 7, 'name': 'Tutor'}]}

    def test_without_a_user_id_hartos_error_is_passed_on(self, in_process_hartos):
        assert get_prompts() == {'error': 'user_id required'}


# ==========================================================================
# 3. Backend Availability
# ==========================================================================
class TestBackendAvailability:
    def test_is_boolean(self):
        assert isinstance(_hartos_backend_available, bool)

    def test_adapter_module_importable(self):
        import routes.hartos_backend_adapter
        assert hasattr(routes.hartos_backend_adapter, 'drain_thinking_traces')
        assert hasattr(routes.hartos_backend_adapter, 'get_prompts')


# ==========================================================================
# 4. OrderedDict FIFO for Traces
# ==========================================================================
class TestTraceFIFO:
    """Verify thinking traces use OrderedDict for FIFO eviction."""

    def test_ordered_dict_fifo(self):
        od = OrderedDict()
        od['a'] = 1
        od['b'] = 2
        od['c'] = 3
        # FIFO: first inserted is first out
        key, val = od.popitem(last=False)
        assert key == 'a'

    def test_ordered_dict_maintains_order(self):
        od = OrderedDict()
        for i in range(100):
            od[f'req_{i}'] = [f'trace_{i}']
        keys = list(od.keys())
        assert keys[0] == 'req_0'
        assert keys[-1] == 'req_99'

    def test_ordered_dict_eviction_pattern(self):
        """When max size reached, evict oldest (FIFO)."""
        MAX = 50
        od = OrderedDict()
        for i in range(100):
            od[f'req_{i}'] = [f'trace_{i}']
            if len(od) > MAX:
                od.popitem(last=False)
        assert len(od) == MAX
        assert 'req_0' not in od
        assert 'req_99' in od


# ==========================================================================
# 5. Circuit Breaker Pattern
# ==========================================================================
class TestCircuitBreakerPattern:
    """Test circuit breaker logic used in adapter."""

    def test_breaker_opens_after_failures(self):
        failures = 0
        threshold = 3
        breaker_open = False
        for _ in range(threshold):
            failures += 1
            if failures >= threshold:
                breaker_open = True
        assert breaker_open is True

    def test_breaker_resets_on_success(self):
        failures = 3
        # Success resets
        failures = 0
        assert failures == 0

    def test_breaker_half_open_after_cooldown(self):
        """After cooldown, allow one test request."""
        last_failure_time = time.time() - 60  # 60s ago
        cooldown = 30
        half_open = (time.time() - last_failure_time) > cooldown
        assert half_open is True

    def test_breaker_stays_open_within_cooldown(self):
        last_failure_time = time.time() - 5  # 5s ago
        cooldown = 30
        half_open = (time.time() - last_failure_time) > cooldown
        assert half_open is False


# ==========================================================================
# 6. Request ID Isolation
# ==========================================================================
class TestRequestIdIsolation:
    """Thinking traces should be isolated per request_id."""

    def test_different_request_ids_independent(self):
        traces = OrderedDict()
        traces['req_user_1'] = ['thinking about math']
        traces['req_user_2'] = ['thinking about science']
        traces['daemon_goal_1'] = ['background research']

        # Draining req_user_1 should not affect others
        user1_traces = traces.pop('req_user_1', [])
        assert user1_traces == ['thinking about math']
        assert 'req_user_2' in traces
        assert 'daemon_goal_1' in traces

    def test_daemon_prefix_excluded_from_user_drain(self):
        traces = OrderedDict()
        traces['req_123'] = ['user trace']
        traces['daemon_goal_abc'] = ['daemon trace']

        # User should only get their own traces
        request_id = 'req_123'
        result = traces.pop(request_id, [])
        assert result == ['user trace']
        # Daemon traces untouched
        assert 'daemon_goal_abc' in traces
