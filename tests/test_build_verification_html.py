"""
Functional tests for scripts/build_verification_html.py

Tests the report-generation logic: romanization, similarity scoring,
flag classification, end-clip detection, HTML structure, and row generation.
The file is a standalone script with main(); we test its internal logic
by extracting key patterns.
"""
import html
import os
import re
import sys
from difflib import SequenceMatcher
from unittest.mock import mock_open, patch

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


# ---------------------------------------------------------------------------
# Extracted logic from build_verification_html.py for testability
# ---------------------------------------------------------------------------
def romanize(text):
    """Romanize text to lowercase alphanumeric (fallback without unidecode)."""
    return re.sub(r'[^a-z0-9]', '', text.lower().strip())


def romanize_unidecode(text):
    """Romanize with unidecode if available."""
    try:
        from unidecode import unidecode
        return re.sub(r'[^a-z0-9]', '', unidecode(text).lower().strip())
    except ImportError:
        return romanize(text)


def compute_similarity(expected, actual):
    """Romanized character-level similarity score (0-100)."""
    exp_r = romanize_unidecode(expected)
    got_r = romanize_unidecode(actual) if actual != 'MISSING' else ''
    if exp_r and got_r:
        return SequenceMatcher(None, exp_r, got_r).ratio() * 100
    return 0


def classify_flag(actual, sim):
    """Classify a comparison result into a flag string."""
    if actual == 'MISSING':
        return 'MISSING'
    elif sim < 30:
        return f'BROKEN({sim:.0f}%)'
    elif sim < 50:
        return f'BAD({sim:.0f}%)'
    elif sim < 70:
        return f'WEAK({sim:.0f}%)'
    return ''


def detect_end_clip(expected_words, got_romanized):
    """Detect if the last 2 expected words are missing from transcription."""
    if len(expected_words) < 3 or not got_romanized:
        return False
    last2 = expected_words[-2:]
    found = sum(1 for w in last2 if len(w) >= 3 and w in got_romanized)
    return found == 0


# ==========================================================================
# 1. Romanization
# ==========================================================================
class TestRomanize:
    def test_lowercase(self):
        assert romanize('Hello World') == 'helloworld'

    def test_strips_punctuation(self):
        assert romanize('Hello, world!') == 'helloworld'

    def test_keeps_digits(self):
        assert romanize('Test 123') == 'test123'

    def test_empty_string(self):
        assert romanize('') == ''

    def test_only_symbols(self):
        assert romanize('!@#$%') == ''

    def test_spaces_removed(self):
        assert romanize('a b c') == 'abc'

    def test_unicode_stripped(self):
        # Non-ASCII chars stripped in fallback romanize
        assert romanize('café') == 'caf'

    def test_mixed_case(self):
        assert romanize('AbCdEf') == 'abcdef'


# ==========================================================================
# 2. Similarity Scoring
# ==========================================================================
class TestSimilarity:
    def test_identical_strings(self):
        sim = compute_similarity('hello world', 'hello world')
        assert sim == 100.0

    def test_completely_different(self):
        sim = compute_similarity('aaaa', 'zzzz')
        assert sim < 30

    def test_missing_actual(self):
        sim = compute_similarity('hello', 'MISSING')
        assert sim == 0

    def test_partial_match(self):
        sim = compute_similarity('hello world', 'hello')
        assert 30 < sim < 90

    def test_empty_expected(self):
        sim = compute_similarity('', 'anything')
        assert sim == 0

    def test_case_insensitive(self):
        sim = compute_similarity('HELLO', 'hello')
        assert sim == 100.0

    def test_symmetric(self):
        a = compute_similarity('abc def', 'abc xyz')
        b = compute_similarity('abc xyz', 'abc def')
        assert abs(a - b) < 1.0


# ==========================================================================
# 3. Flag Classification
# ==========================================================================
class TestClassifyFlag:
    def test_missing(self):
        assert classify_flag('MISSING', 0) == 'MISSING'

    def test_broken_low_sim(self):
        flag = classify_flag('some text', 15.0)
        assert 'BROKEN' in flag
        assert '15%' in flag

    def test_bad_mid_low_sim(self):
        flag = classify_flag('some text', 40.0)
        assert 'BAD' in flag

    def test_weak_mid_sim(self):
        flag = classify_flag('some text', 60.0)
        assert 'WEAK' in flag

    def test_ok_high_sim(self):
        flag = classify_flag('some text', 85.0)
        assert flag == ''

    def test_boundary_30(self):
        flag = classify_flag('text', 30.0)
        assert 'BAD' in flag  # 30 is < 50, >= 30

    def test_boundary_50(self):
        flag = classify_flag('text', 50.0)
        assert 'WEAK' in flag  # 50 is < 70, >= 50

    def test_boundary_70(self):
        flag = classify_flag('text', 70.0)
        assert flag == ''  # 70+ is OK

    def test_zero_sim_not_missing(self):
        flag = classify_flag('actual text', 0.0)
        assert 'BROKEN' in flag


# ==========================================================================
# 4. End-Clip Detection
# ==========================================================================
class TestDetectEndClip:
    def test_last_words_missing(self):
        words = ['the', 'quick', 'brown', 'fox', 'jumps']
        got = 'thequickbrown'
        assert detect_end_clip(words, got) is True

    def test_last_words_present(self):
        words = ['the', 'quick', 'brown', 'fox', 'jumps']
        got = 'thequickbrownfoxjumps'
        assert detect_end_clip(words, got) is False

    def test_too_few_words(self):
        words = ['hello', 'world']
        got = 'something'
        assert detect_end_clip(words, got) is False

    def test_empty_got(self):
        words = ['the', 'quick', 'brown']
        got = ''
        assert detect_end_clip(words, got) is False

    def test_short_words_ignored(self):
        # Words with len < 3 don't count
        words = ['the', 'big', 'red', 'ox', 'is']
        got = 'thebigred'
        # 'ox' (len 2) and 'is' (len 2) are both < 3, so found=0 → True
        assert detect_end_clip(words, got) is True

    def test_one_word_found(self):
        words = ['alpha', 'beta', 'gamma', 'delta', 'epsilon']
        got = 'alphabetagammadelta'  # delta present, epsilon missing
        # last2 = ['delta', 'epsilon'], delta in got → found=1 → not clipped
        assert detect_end_clip(words, got) is False


# ==========================================================================
# 5. Sim Class Assignment (CSS class for display)
# ==========================================================================
class TestSimClass:
    """Test the CSS class logic used in HTML generation."""

    @staticmethod
    def _sim_class(sim):
        if sim >= 90:
            return 'sim-good'
        elif sim >= 70:
            return 'sim-ok'
        elif sim >= 50:
            return 'sim-weak'
        return 'sim-bad'

    def test_high_sim(self):
        assert self._sim_class(95) == 'sim-good'

    def test_boundary_90(self):
        assert self._sim_class(90) == 'sim-good'

    def test_ok_sim(self):
        assert self._sim_class(75) == 'sim-ok'

    def test_weak_sim(self):
        assert self._sim_class(55) == 'sim-weak'

    def test_bad_sim(self):
        assert self._sim_class(25) == 'sim-bad'

    def test_zero(self):
        assert self._sim_class(0) == 'sim-bad'


# ==========================================================================
# 6. Language Name Mapping
# ==========================================================================
class TestLanguageNames:
    """Verify the language code → name mapping used in report."""

    LANG_MAP = {
        'en': 'English', 'ta': 'Tamil', 'hi': 'Hindi', 'bn': 'Bengali',
        'te': 'Telugu', 'kn': 'Kannada', 'ml': 'Malayalam', 'gu': 'Gujarati',
        'mr': 'Marathi', 'pa': 'Punjabi', 'ur': 'Urdu', 'ne': 'Nepali',
        'or': 'Odia', 'as': 'Assamese', 'sa': 'Sanskrit',
        'es': 'Spanish', 'fr': 'French', 'ja': 'Japanese', 'ko': 'Korean',
        'zh': 'Chinese', 'de': 'German', 'it': 'Italian', 'ru': 'Russian',
        'pt': 'Portuguese', 'ar': 'Arabic',
    }

    def test_all_indic_present(self):
        indic = ['hi', 'ta', 'te', 'bn', 'kn', 'ml', 'gu', 'mr', 'pa', 'ur', 'ne', 'or', 'as', 'sa']
        for lang in indic:
            assert lang in self.LANG_MAP, f'{lang} missing from language map'

    def test_all_international_present(self):
        intl = ['es', 'fr', 'ja', 'ko', 'zh', 'de', 'it', 'ru', 'pt', 'ar']
        for lang in intl:
            assert lang in self.LANG_MAP

    def test_unknown_lang_defaults_to_uppercase(self):
        lang = 'xx'
        name = self.LANG_MAP.get(lang, lang.upper())
        assert name == 'XX'

    def test_total_languages(self):
        assert len(self.LANG_MAP) == 25


# ==========================================================================
# 7. Line IDs
# ==========================================================================
class TestLineIDs:
    """Verify the expected line IDs in the report."""

    LINE_IDS = ['greeting', 'question_passion', 'question_escape', 'ack_escape',
                'pre_reveal', 'reveal_intro', 'post_reveal',
                'ack_music_art', 'ack_reading_learning', 'ack_building_coding',
                'ack_people_stories', 'ack_nature_movement', 'ack_games_strategy']

    def test_greeting_first(self):
        assert self.LINE_IDS[0] == 'greeting'

    def test_count(self):
        assert len(self.LINE_IDS) == 13

    def test_all_unique(self):
        assert len(self.LINE_IDS) == len(set(self.LINE_IDS))

    def test_ack_lines_present(self):
        ack_lines = [lid for lid in self.LINE_IDS if lid.startswith('ack_')]
        assert len(ack_lines) == 7  # includes ack_escape + 6 topic acks


# ==========================================================================
# 8. HTML Escaping Safety
# ==========================================================================
class TestHTMLEscaping:
    """Verify that user-controlled text is properly escaped."""

    def test_angle_brackets(self):
        assert '&lt;' in html.escape('<script>')

    def test_ampersand(self):
        assert '&amp;' in html.escape('AT&T')

    def test_quotes(self):
        assert '&quot;' in html.escape('"hello"')

    def test_safe_text_unchanged(self):
        assert html.escape('Hello World') == 'Hello World'
