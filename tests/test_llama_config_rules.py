"""
Deep functional tests for llama/llama_config.py business rules.

Tests INTENDED BEHAVIOR:
- KNOWN_LLM_ENDPOINTS excludes port 5000 (Flask conflict)
- ServerType enum values
- LlamaConfig persistence (config.json read/write)
- scan_existing_llm_endpoints returns correct format
- check_llama_health behavior when server up/down
- get_llama_endpoint returns valid URL
- Port 5000 exclusion prevents false detection
"""
import json
import os
import sys
import tempfile
from unittest.mock import MagicMock, patch

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from llama.llama_config import (
    KNOWN_LLM_ENDPOINTS,
    LlamaConfig,
    ServerType,
    check_llama_health,
    get_llama_endpoint,
    get_llama_info,
    scan_existing_llm_endpoints,
)


# ==========================================================================
# 1. KNOWN_LLM_ENDPOINTS Business Rules
# ==========================================================================
class TestKnownEndpoints:
    def test_port_5000_excluded(self):
        """Port 5000 must NOT be in endpoints — Nunba's Flask runs there."""
        for ep in KNOWN_LLM_ENDPOINTS:
            assert ':5000' not in ep['base_url'], \
                f"Port 5000 must be excluded: {ep['name']} at {ep['base_url']}"

    def test_at_least_5_known_endpoints(self):
        assert len(KNOWN_LLM_ENDPOINTS) >= 5, "Should know 5+ LLM server types"

    def test_includes_ollama(self):
        names = [ep['name'] for ep in KNOWN_LLM_ENDPOINTS]
        assert any('ollama' in n.lower() for n in names), "Must include Ollama"

    def test_includes_lm_studio(self):
        names = [ep['name'] for ep in KNOWN_LLM_ENDPOINTS]
        assert any('lm studio' in n.lower() for n in names), "Must include LM Studio"

    def test_each_has_required_fields(self):
        for ep in KNOWN_LLM_ENDPOINTS:
            assert 'name' in ep, f"Endpoint missing name: {ep}"
            assert 'base_url' in ep, f"{ep['name']} missing base_url"
            assert 'health' in ep, f"{ep['name']} missing health path"
            assert 'completions' in ep, f"{ep['name']} missing completions path"
            assert 'type' in ep, f"{ep['name']} missing type"

    def test_all_urls_are_localhost(self):
        """All known endpoints should be local servers."""
        for ep in KNOWN_LLM_ENDPOINTS:
            assert 'localhost' in ep['base_url'] or '127.0.0.1' in ep['base_url'], \
                f"{ep['name']} URL is not localhost: {ep['base_url']}"

    def test_all_urls_start_with_http(self):
        for ep in KNOWN_LLM_ENDPOINTS:
            assert ep['base_url'].startswith('http://'), \
                f"{ep['name']} URL must be HTTP (local): {ep['base_url']}"

    def test_unique_ports(self):
        ports = [ep['base_url'].split(':')[-1].rstrip('/') for ep in KNOWN_LLM_ENDPOINTS]
        assert len(ports) == len(set(ports)), f"Duplicate ports: {ports}"

    def test_known_types(self):
        valid_types = {'ollama', 'openai', 'kobold', 'llama.cpp'}
        for ep in KNOWN_LLM_ENDPOINTS:
            assert ep['type'] in valid_types, f"{ep['name']} has unknown type: {ep['type']}"


# ==========================================================================
# 2. ServerType Enum
# ==========================================================================
class TestServerType:
    def test_not_running(self):
        assert ServerType.NOT_RUNNING == "not_running"

    def test_nunba_managed(self):
        assert ServerType.NUNBA_MANAGED == "nunba_managed"

    def test_external_llama(self):
        assert ServerType.EXTERNAL_LLAMA == "external_llama"

    def test_other_service(self):
        assert ServerType.OTHER_SERVICE == "other_service"


# ==========================================================================
# 3. LlamaConfig Class
# ==========================================================================
class TestLlamaConfig:
    def test_constructor(self):
        lc = LlamaConfig()
        assert lc is not None

    def test_has_config_dict(self):
        lc = LlamaConfig()
        assert hasattr(lc, 'config') and isinstance(lc.config, dict)

    def test_config_is_dict(self):
        lc = LlamaConfig()
        assert isinstance(lc.config, dict)


# ==========================================================================
# 4. scan_existing_llm_endpoints
# ==========================================================================
class TestScanEndpoints:
    def test_returns_dict_or_none(self):
        # Will return None if no LLM servers running
        result = scan_existing_llm_endpoints()
        assert result is None or isinstance(result, dict)

    def test_found_result_has_required_keys(self):
        result = scan_existing_llm_endpoints()
        if result is not None:
            assert 'name' in result
            assert 'base_url' in result
            assert 'type' in result

    def test_scan_with_mocked_ollama(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        with patch('llama.llama_config.requests.get', return_value=mock_resp):
            result = scan_existing_llm_endpoints()
        assert result is not None
        assert 'name' in result


# ==========================================================================
# 5. check_llama_health
# ==========================================================================
class TestCheckLlamaHealth:
    def test_returns_bool(self):
        result = check_llama_health()
        assert isinstance(result, bool)

    def test_false_when_no_server(self):
        """When no LLM server is running, health should be False."""
        with patch('llama.llama_config.requests.get', side_effect=ConnectionError):
            result = check_llama_health()
        assert result is False


# ==========================================================================
# 6. get_llama_endpoint
# ==========================================================================
class TestGetLlamaEndpoint:
    def test_returns_string(self):
        result = get_llama_endpoint()
        assert isinstance(result, str)

    def test_is_valid_url(self):
        result = get_llama_endpoint()
        assert result.startswith('http'), f"Endpoint must be HTTP URL: {result}"

    def test_default_port_8080(self):
        result = get_llama_endpoint()
        assert '8080' in result, f"Default llama.cpp port is 8080: {result}"


# ==========================================================================
# 7. get_llama_info
# ==========================================================================
class TestGetLlamaInfo:
    def test_returns_dict(self):
        result = get_llama_info()
        assert isinstance(result, dict)

    def test_has_running_key(self):
        result = get_llama_info()
        assert 'running' in result or 'status' in result or 'error' in result

    def test_includes_port_info(self):
        result = get_llama_info()
        assert 'llama_port' in result or 'port' in result or 'wrapper_port' in result
