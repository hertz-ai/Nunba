"""
Functional tests for chatbot_routes.py pure logic functions.

Tests intent detection, resource extraction, missing key detection,
match_options, session management patterns, and template data validation.
"""
import json
import os
import sys

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from routes.chatbot_routes import (
    _CREATE_AGENT_EXACT,
    _KEY_NAME_MAP,
    _MISSING_KEY_INDICATORS,
    _detect_create_agent_intent,
    _detect_missing_key_in_response,
    _extract_resource_request,
    match_options,
)


# ==========================================================================
# 1. Create Agent Intent Detection
# ==========================================================================
class TestCreateAgentIntent:
    """_detect_create_agent_intent: exact-phrase fast path."""

    # Positive cases
    def test_exact_phrase_create_agent(self):
        assert _detect_create_agent_intent('create an agent') is True

    def test_exact_phrase_build_agent(self):
        assert _detect_create_agent_intent('build an agent') is True

    def test_exact_phrase_new_agent(self):
        assert _detect_create_agent_intent('new agent') is True

    def test_exact_phrase_train_agent(self):
        assert _detect_create_agent_intent('train an agent') is True

    def test_starts_with_create_plus_description(self):
        assert _detect_create_agent_intent('create an agent that helps with math') is True

    def test_case_insensitive(self):
        assert _detect_create_agent_intent('CREATE AN AGENT') is True

    def test_mixed_case(self):
        assert _detect_create_agent_intent('Create An Agent') is True

    def test_leading_whitespace(self):
        assert _detect_create_agent_intent('  create an agent') is True

    def test_i_want_new_agent(self):
        assert _detect_create_agent_intent('i want a new agent') is True

    def test_i_need_an_agent(self):
        assert _detect_create_agent_intent('i need an agent') is True

    # Negative cases — these should NOT match (let LLM handle)
    def test_question_form(self):
        assert _detect_create_agent_intent('can you create an agent?') is False

    def test_negation(self):
        assert _detect_create_agent_intent("don't create an agent") is False

    def test_regular_chat(self):
        assert _detect_create_agent_intent('hello how are you') is False

    def test_agent_word_in_sentence(self):
        assert _detect_create_agent_intent('the agent is running') is False

    def test_empty_string(self):
        assert _detect_create_agent_intent('') is False

    def test_just_whitespace(self):
        assert _detect_create_agent_intent('   ') is False

    def test_partial_phrase(self):
        assert _detect_create_agent_intent('create a') is False

    def test_about_agents(self):
        assert _detect_create_agent_intent('tell me about agents') is False

    # All exact phrases
    def test_all_exact_phrases_detected(self):
        for phrase in _CREATE_AGENT_EXACT:
            assert _detect_create_agent_intent(phrase) is True, f"Failed: {phrase}"

    def test_exact_phrases_count(self):
        assert len(_CREATE_AGENT_EXACT) >= 10


# ==========================================================================
# 2. Resource Request Extraction
# ==========================================================================
class TestExtractResourceRequest:
    """_extract_resource_request: parse RESOURCE_REQUEST:{json} markers."""

    def test_valid_resource_request(self):
        text = 'Some text RESOURCE_REQUEST:{"__SECRET_REQUEST__": true, "key_name": "GOOGLE_API_KEY"}'
        result = _extract_resource_request(text)
        assert result is not None
        assert result['key_name'] == 'GOOGLE_API_KEY'
        assert result['triggered_by'] == 'agent_request_resource'

    def test_no_marker(self):
        assert _extract_resource_request('hello world') is None

    def test_empty_string(self):
        assert _extract_resource_request('') is None

    def test_none_input(self):
        assert _extract_resource_request(None) is None

    def test_invalid_json(self):
        text = 'RESOURCE_REQUEST:{broken json'
        assert _extract_resource_request(text) is None

    def test_missing_secret_flag(self):
        text = 'RESOURCE_REQUEST:{"key_name": "TEST"}'
        result = _extract_resource_request(text)
        assert result is None  # __SECRET_REQUEST__ must be true

    def test_secret_flag_removed(self):
        text = 'RESOURCE_REQUEST:{"__SECRET_REQUEST__": true, "key_name": "X"}'
        result = _extract_resource_request(text)
        assert '__SECRET_REQUEST__' not in result

    def test_marker_at_end(self):
        text = 'I need an API key. RESOURCE_REQUEST:{"__SECRET_REQUEST__": true, "key": "val"}'
        result = _extract_resource_request(text)
        assert result is not None


# ==========================================================================
# 3. Missing Key Detection
# ==========================================================================
class TestDetectMissingKey:
    """_detect_missing_key_in_response: detect API key issues in LLM output."""

    def test_google_api_key_missing(self):
        text = "Error: Google API key not found. Please configure your API key."
        result = _detect_missing_key_in_response(text)
        assert result is not None
        assert result['key_name'] == 'GOOGLE_API_KEY'

    def test_serp_api_key(self):
        text = "SerpAPI: API key is required to search the web."
        result = _detect_missing_key_in_response(text)
        assert result is not None
        assert result['key_name'] == 'SERPAPI_API_KEY'

    def test_openai_key(self):
        text = "OpenAI: authentication failed. Invalid API key."
        result = _detect_missing_key_in_response(text)
        assert result is not None
        assert result['key_name'] == 'OPENAI_API_KEY'

    def test_news_key(self):
        text = "News API key not found in environment."
        result = _detect_missing_key_in_response(text)
        assert result is not None
        assert result['key_name'] == 'NEWS_API_KEY'

    def test_unknown_key(self):
        text = "Some unknown service: API key not found."
        result = _detect_missing_key_in_response(text)
        assert result is not None
        assert result['key_name'] == 'UNKNOWN_KEY'

    def test_no_key_issue(self):
        text = "Here is the weather forecast for today."
        result = _detect_missing_key_in_response(text)
        assert result is None

    def test_empty_text(self):
        assert _detect_missing_key_in_response('') is None

    def test_none_text(self):
        assert _detect_missing_key_in_response(None) is None

    def test_all_indicators_work(self):
        for indicator in _MISSING_KEY_INDICATORS:
            text = f"Error: {indicator} for some service"
            result = _detect_missing_key_in_response(text)
            assert result is not None, f"Indicator not detected: {indicator}"

    def test_key_map_has_required_keys(self):
        assert 'google' in _KEY_NAME_MAP
        assert 'serp' in _KEY_NAME_MAP
        assert 'openai' in _KEY_NAME_MAP
        assert 'news' in _KEY_NAME_MAP

    def test_key_info_structure(self):
        for key, info in _KEY_NAME_MAP.items():
            assert 'key_name' in info
            assert 'label' in info
            assert 'description' in info
            assert 'used_by' in info


# ==========================================================================
# 4. match_options
# ==========================================================================
class TestMatchOptions:
    """match_options: prefix + text matching for conversation flow."""

    def test_basic_match(self):
        result = match_options("learn", "I want to learn python")
        # Should return something (str or None)
        assert isinstance(result, (str, type(None)))

    def test_empty_text(self):
        result = match_options("learn", "")
        assert isinstance(result, (str, type(None)))

    def test_empty_prefix(self):
        result = match_options("", "hello")
        assert isinstance(result, (str, type(None)))


# ==========================================================================
# 5. CREATE_AGENT_EXACT Set Properties
# ==========================================================================
class TestCreateAgentExactSet:
    def test_is_set_type(self):
        assert isinstance(_CREATE_AGENT_EXACT, set)

    def test_all_lowercase(self):
        for phrase in _CREATE_AGENT_EXACT:
            assert phrase == phrase.lower(), f"Not lowercase: {phrase}"

    def test_no_duplicates(self):
        # By definition a set has no dupes, but verify count
        as_list = list(_CREATE_AGENT_EXACT)
        assert len(as_list) == len(set(as_list))

    def test_no_empty_strings(self):
        for phrase in _CREATE_AGENT_EXACT:
            assert len(phrase.strip()) > 0


# ==========================================================================
# 6. Template Data Validation
# ==========================================================================
class TestTemplateData:
    """Verify template.json is loaded and has expected structure."""

    def test_template_data_loaded(self):
        from routes.chatbot_routes import template_data
        assert isinstance(template_data, dict)

    def test_abusive_responses_exist(self):
        from routes.chatbot_routes import abusive
        assert isinstance(abusive, list)
        assert len(abusive) > 0

    def test_greet_responses_exist(self):
        from routes.chatbot_routes import greet
        assert isinstance(greet, list)
        assert len(greet) > 0

    def test_learn_responses_exist(self):
        from routes.chatbot_routes import learn
        assert isinstance(learn, list)

    def test_initial_labels(self):
        from routes.chatbot_routes import intital_labels
        assert isinstance(intital_labels, list)
        assert 'greet' in intital_labels
        assert 'abusive language' in intital_labels
        assert len(intital_labels) >= 10


# ==========================================================================
# 7. Config Data Validation
# ==========================================================================
class TestConfigData:
    def test_config_loaded(self):
        from routes.chatbot_routes import config_data
        assert isinstance(config_data, dict)

    def test_context_len_positive(self):
        from routes.chatbot_routes import CONTEXT_LEN
        assert CONTEXT_LEN > 0
        assert isinstance(CONTEXT_LEN, int)
