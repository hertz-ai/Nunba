"""
Parametric intent detection matrix — comprehensive coverage of the
create agent intent detection boundary.

Tests every combination: positive phrases, negation guards, questions,
embedded phrases, case variations, unicode, empty/whitespace inputs.
"""
import os
import sys

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from routes.chatbot_routes import _detect_create_agent_intent

# ==========================================================================
# 1. Exact Positive Phrases — ALL must match
# ==========================================================================
POSITIVE_PHRASES = [
    'create an agent',
    'create agent',
    'build an agent',
    'build agent',
    'make an agent',
    'create a new agent',
    'train an agent',
    'train agent',
    'i want a new agent',
    'i want an agent',
    'i want to create',
    'i need a new agent',
    'i need an agent',
    'new agent',
]

@pytest.mark.parametrize('phrase', POSITIVE_PHRASES)
def test_positive_exact(phrase):
    assert _detect_create_agent_intent(phrase) is True, f"Should match: '{phrase}'"


@pytest.mark.parametrize('phrase', POSITIVE_PHRASES)
def test_positive_uppercase(phrase):
    assert _detect_create_agent_intent(phrase.upper()) is True, f"Case insensitive: '{phrase.upper()}'"


@pytest.mark.parametrize('phrase', POSITIVE_PHRASES)
def test_positive_title_case(phrase):
    assert _detect_create_agent_intent(phrase.title()) is True


@pytest.mark.parametrize('phrase', POSITIVE_PHRASES)
def test_positive_with_trailing_description(phrase):
    """'create an agent that does math' should match (starts with exact phrase)."""
    extended = phrase + ' that helps with mathematics'
    assert _detect_create_agent_intent(extended) is True, f"Should match with suffix: '{extended}'"


# ==========================================================================
# 2. Negative — these must NOT match (LLM handles them)
# ==========================================================================
NEGATIVE_INPUTS = [
    "can you create an agent?",
    "could you build an agent",
    "please create an agent",
    "don't create an agent",
    "do not create agent",
    "stop create agent",
    "never create an agent",
    "cancel create agent",
    "I cannot build an agent",
    "the agent is running",
    "tell me about agents",
    "what is an agent?",
    "hello how are you",
    "summarize this article",
    "write a poem",
    "explain quantum physics",
    "what's the weather like",
    "help me with my homework",
    "the agent helped me yesterday",
    "agents are useful tools",
]

@pytest.mark.parametrize('text', NEGATIVE_INPUTS)
def test_negative_not_matched(text):
    assert _detect_create_agent_intent(text) is False, f"Should NOT match: '{text}'"


# ==========================================================================
# 3. Edge Cases
# ==========================================================================
class TestEdgeCases:
    def test_empty_string(self):
        assert _detect_create_agent_intent('') is False

    def test_whitespace_only(self):
        assert _detect_create_agent_intent('   ') is False

    def test_single_word(self):
        assert _detect_create_agent_intent('create') is False

    def test_just_agent(self):
        assert _detect_create_agent_intent('agent') is False

    def test_very_long_text(self):
        long = 'create an agent ' + 'blah ' * 1000
        assert _detect_create_agent_intent(long) is True

    def test_unicode_input(self):
        assert _detect_create_agent_intent('एजेंट बनाओ') is False

    def test_mixed_language(self):
        assert _detect_create_agent_intent('create an agent 请') is True

    def test_numbers_in_input(self):
        assert _detect_create_agent_intent('create 3 agents') is False

    def test_special_chars(self):
        assert _detect_create_agent_intent('create an agent!!!') is True

    def test_leading_spaces(self):
        assert _detect_create_agent_intent('  create an agent') is True

    def test_tab_prefix(self):
        assert _detect_create_agent_intent('\tcreate an agent') is True
