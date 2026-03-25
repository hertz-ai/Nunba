"""
test_generate_hart_voices.py - Tests for scripts/generate_hart_voices.py

Covers:
- ENGINE_CAPS data structure (all engine definitions)
- Engine capability constraints
- VRAM requirements
- Language set coverage
- Paralinguistic tag definitions
- Voice cloning flags
- Module-level constants
"""
import io
import os
import sys

import pytest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# generate_hart_voices.py wraps sys.stdout/stderr with TextIOWrapper at
# import time (for Windows console UTF-8). This closes pytest's capture
# file descriptors. Prevent that by marking sys as frozen during import.
_was_frozen = getattr(sys, 'frozen', False)
sys.frozen = True
try:
    from scripts.generate_hart_voices import ENGINE_CAPS
finally:
    if not _was_frozen:
        try:
            del sys.frozen
        except AttributeError:
            pass


# ============================================================
# ENGINE_CAPS structure
# ============================================================

class TestEngineCaps:
    def test_is_dict(self):
        assert isinstance(ENGINE_CAPS, dict)

    def test_has_f5_engine(self):
        assert 'f5' in ENGINE_CAPS

    def test_has_chatterbox_turbo(self):
        assert 'chatterbox_turbo' in ENGINE_CAPS

    def test_has_chatterbox_multilingual(self):
        assert 'chatterbox_multilingual' in ENGINE_CAPS

    def test_has_indic_parler(self):
        assert 'indic_parler' in ENGINE_CAPS

    def test_at_least_four_engines(self):
        assert len(ENGINE_CAPS) >= 4


# ============================================================
# Required fields for each engine
# ============================================================

class TestEngineRequiredFields:
    REQUIRED_FIELDS = ['name', 'vram_gb', 'languages', 'paralinguistic',
                       'emotion_tags', 'voice_cloning', 'speed', 'quality', 'constraints']

    @pytest.mark.parametrize("engine_key", list(ENGINE_CAPS.keys()))
    def test_engine_has_all_required_fields(self, engine_key):
        engine = ENGINE_CAPS[engine_key]
        for field in self.REQUIRED_FIELDS:
            assert field in engine, f"Engine '{engine_key}' missing field '{field}'"

    @pytest.mark.parametrize("engine_key", list(ENGINE_CAPS.keys()))
    def test_name_is_nonempty_string(self, engine_key):
        assert isinstance(ENGINE_CAPS[engine_key]['name'], str)
        assert len(ENGINE_CAPS[engine_key]['name']) > 0

    @pytest.mark.parametrize("engine_key", list(ENGINE_CAPS.keys()))
    def test_vram_is_positive_number(self, engine_key):
        vram = ENGINE_CAPS[engine_key]['vram_gb']
        assert isinstance(vram, (int, float))
        assert vram > 0

    @pytest.mark.parametrize("engine_key", list(ENGINE_CAPS.keys()))
    def test_languages_is_set(self, engine_key):
        langs = ENGINE_CAPS[engine_key]['languages']
        assert isinstance(langs, set)
        assert len(langs) > 0

    @pytest.mark.parametrize("engine_key", list(ENGINE_CAPS.keys()))
    def test_voice_cloning_is_bool(self, engine_key):
        assert isinstance(ENGINE_CAPS[engine_key]['voice_cloning'], bool)

    @pytest.mark.parametrize("engine_key", list(ENGINE_CAPS.keys()))
    def test_quality_is_string(self, engine_key):
        quality = ENGINE_CAPS[engine_key]['quality']
        assert isinstance(quality, str)
        assert quality in ('highest', 'high', 'medium', 'low')


# ============================================================
# F5-TTS specifics
# ============================================================

class TestF5Engine:
    def test_supports_english(self):
        assert 'en' in ENGINE_CAPS['f5']['languages']

    def test_supports_chinese(self):
        assert 'zh' in ENGINE_CAPS['f5']['languages']

    def test_low_vram(self):
        assert ENGINE_CAPS['f5']['vram_gb'] <= 3.0

    def test_highest_quality(self):
        assert ENGINE_CAPS['f5']['quality'] == 'highest'

    def test_supports_voice_cloning(self):
        assert ENGINE_CAPS['f5']['voice_cloning'] is True

    def test_no_paralinguistic_tags(self):
        assert ENGINE_CAPS['f5']['paralinguistic'] == []

    def test_no_emotion_tags(self):
        assert ENGINE_CAPS['f5']['emotion_tags'] == []


# ============================================================
# Chatterbox Turbo specifics
# ============================================================

class TestChatterboxTurbo:
    def test_english_only(self):
        assert ENGINE_CAPS['chatterbox_turbo']['languages'] == {'en'}

    def test_has_paralinguistic_tags(self):
        tags = ENGINE_CAPS['chatterbox_turbo']['paralinguistic']
        assert len(tags) > 0
        assert '[laugh]' in tags

    def test_voice_cloning(self):
        assert ENGINE_CAPS['chatterbox_turbo']['voice_cloning'] is True

    def test_vram_under_8gb(self):
        assert ENGINE_CAPS['chatterbox_turbo']['vram_gb'] < 8.0


# ============================================================
# Chatterbox Multilingual specifics
# ============================================================

class TestChatterboxMultilingual:
    def test_supports_many_languages(self):
        langs = ENGINE_CAPS['chatterbox_multilingual']['languages']
        assert len(langs) >= 20

    def test_includes_japanese(self):
        assert 'ja' in ENGINE_CAPS['chatterbox_multilingual']['languages']

    def test_includes_korean(self):
        assert 'ko' in ENGINE_CAPS['chatterbox_multilingual']['languages']

    def test_requires_high_vram(self):
        assert ENGINE_CAPS['chatterbox_multilingual']['vram_gb'] >= 14


# ============================================================
# Indic Parler specifics
# ============================================================

class TestIndicParler:
    def test_supports_hindi(self):
        assert 'hi' in ENGINE_CAPS['indic_parler']['languages']

    def test_supports_tamil(self):
        assert 'ta' in ENGINE_CAPS['indic_parler']['languages']

    def test_supports_bengali(self):
        assert 'bn' in ENGINE_CAPS['indic_parler']['languages']

    def test_supports_telugu(self):
        assert 'te' in ENGINE_CAPS['indic_parler']['languages']

    def test_has_emotion_tags(self):
        tags = ENGINE_CAPS['indic_parler']['emotion_tags']
        assert 'happy' in tags
        assert 'sad' in tags

    def test_no_voice_cloning(self):
        assert ENGINE_CAPS['indic_parler']['voice_cloning'] is False

    def test_low_vram(self):
        assert ENGINE_CAPS['indic_parler']['vram_gb'] <= 3.0

    def test_supports_21_indic_languages(self):
        langs = ENGINE_CAPS['indic_parler']['languages']
        assert len(langs) >= 21


# ============================================================
# Cross-engine coverage
# ============================================================

class TestCrossEngineCoverage:
    def test_all_engines_support_english(self):
        for key, caps in ENGINE_CAPS.items():
            assert 'en' in caps['languages'], f"Engine '{key}' does not support English"

    def test_at_least_one_engine_supports_tamil(self):
        tamil_engines = [k for k, v in ENGINE_CAPS.items() if 'ta' in v['languages']]
        assert len(tamil_engines) >= 1

    def test_voice_cloning_available(self):
        cloning_engines = [k for k, v in ENGINE_CAPS.items() if v['voice_cloning']]
        assert len(cloning_engines) >= 2

    def test_no_engine_exceeds_16gb_vram(self):
        for key, caps in ENGINE_CAPS.items():
            assert caps['vram_gb'] <= 16.0, f"Engine '{key}' requires too much VRAM"

    def test_each_engine_has_dream_field(self):
        for key, caps in ENGINE_CAPS.items():
            assert 'dream' in caps, f"Engine '{key}' missing 'dream' field"
