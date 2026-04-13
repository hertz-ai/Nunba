"""Tests for tts/speed_profile.py — the single source of truth for
the TTS_SPEED_PROFILE config.

Guarantees:
  - Default profile is 'balanced' (1.10) per project guideline
    "speed > naturalness default".
  - Env var TTS_SPEED_PROFILE overrides the default.
  - Invalid values fall through to default instead of raising.
  - Cache can be invalidated for test isolation.
  - set_profile() persists to ~/.nunba/tts_config.json atomically.
"""

import json
import os
import sys

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from tts import speed_profile  # noqa: E402
from tts.speed_profile import (  # noqa: E402
    DEFAULT_PROFILE,
    SPEED_PROFILES,
    get_current_profile,
    get_default_speed,
    invalidate_cache,
    set_profile,
)


@pytest.fixture(autouse=True)
def _clean_state(monkeypatch, tmp_path):
    """Clear the profile cache and point HOME at a tmp dir so tests
    never touch the real ~/.nunba/tts_config.json."""
    monkeypatch.delenv('TTS_SPEED_PROFILE', raising=False)
    monkeypatch.setenv('HOME', str(tmp_path))
    monkeypatch.setenv('USERPROFILE', str(tmp_path))  # Windows
    invalidate_cache()
    yield
    invalidate_cache()


class TestProfileCatalog:
    def test_four_named_profiles(self):
        assert set(SPEED_PROFILES.keys()) == {'fast', 'balanced', 'natural', 'slow'}

    def test_fast_is_above_natural(self):
        assert SPEED_PROFILES['fast'] > SPEED_PROFILES['natural']

    def test_balanced_is_above_natural(self):
        # "speed > naturalness default" — balanced must be faster than natural
        assert SPEED_PROFILES['balanced'] > SPEED_PROFILES['natural']

    def test_slow_is_below_natural(self):
        assert SPEED_PROFILES['slow'] < SPEED_PROFILES['natural']

    def test_natural_is_exactly_1(self):
        assert SPEED_PROFILES['natural'] == 1.0

    def test_default_is_balanced(self):
        assert DEFAULT_PROFILE == 'balanced'


class TestGetCurrentProfile:
    def test_default_when_nothing_set(self):
        assert get_current_profile() == 'balanced'

    def test_env_var_overrides(self, monkeypatch):
        monkeypatch.setenv('TTS_SPEED_PROFILE', 'fast')
        invalidate_cache()
        assert get_current_profile() == 'fast'

    def test_env_var_case_insensitive(self, monkeypatch):
        monkeypatch.setenv('TTS_SPEED_PROFILE', 'FAST')
        invalidate_cache()
        assert get_current_profile() == 'fast'

    def test_env_var_with_whitespace(self, monkeypatch):
        monkeypatch.setenv('TTS_SPEED_PROFILE', '  balanced  ')
        invalidate_cache()
        assert get_current_profile() == 'balanced'

    def test_invalid_env_var_falls_through_to_default(self, monkeypatch):
        monkeypatch.setenv('TTS_SPEED_PROFILE', 'turbo_max')
        invalidate_cache()
        assert get_current_profile() == DEFAULT_PROFILE

    def test_empty_env_var_falls_through(self, monkeypatch):
        monkeypatch.setenv('TTS_SPEED_PROFILE', '')
        invalidate_cache()
        assert get_current_profile() == DEFAULT_PROFILE

    def test_cache_prevents_repeat_env_reads(self, monkeypatch):
        monkeypatch.setenv('TTS_SPEED_PROFILE', 'fast')
        invalidate_cache()
        first = get_current_profile()
        # Mutate env without invalidating — cached value wins
        monkeypatch.setenv('TTS_SPEED_PROFILE', 'slow')
        second = get_current_profile()
        assert first == second == 'fast'


class TestGetDefaultSpeed:
    def test_default_multiplier_matches_balanced(self):
        assert get_default_speed() == SPEED_PROFILES['balanced']

    def test_fast_profile_multiplier(self, monkeypatch):
        monkeypatch.setenv('TTS_SPEED_PROFILE', 'fast')
        invalidate_cache()
        assert get_default_speed() == SPEED_PROFILES['fast']
        assert get_default_speed() > 1.0

    def test_slow_profile_multiplier(self, monkeypatch):
        monkeypatch.setenv('TTS_SPEED_PROFILE', 'slow')
        invalidate_cache()
        assert get_default_speed() == SPEED_PROFILES['slow']
        assert get_default_speed() < 1.0

    def test_natural_profile_multiplier(self, monkeypatch):
        monkeypatch.setenv('TTS_SPEED_PROFILE', 'natural')
        invalidate_cache()
        assert get_default_speed() == 1.0


class TestSetProfile:
    def test_valid_name_returns_true(self):
        assert set_profile('fast') is True

    def test_invalid_name_returns_false(self):
        assert set_profile('rocket_mode') is False

    def test_empty_name_returns_false(self):
        assert set_profile('') is False

    def test_none_returns_false(self):
        assert set_profile(None) is False

    def test_set_profile_invalidates_cache(self):
        assert get_current_profile() == 'balanced'
        set_profile('fast')
        assert get_current_profile() == 'fast'

    def test_set_profile_persists_to_disk(self, tmp_path):
        set_profile('slow')
        cfg_path = tmp_path / '.nunba' / 'tts_config.json'
        assert cfg_path.is_file()
        with cfg_path.open() as fp:
            data = json.load(fp)
        assert data['speed_profile'] == 'slow'

    def test_persisted_profile_round_trips(self, tmp_path):
        set_profile('fast')
        invalidate_cache()
        # Env var is unset (autouse fixture), so resolution reads disk
        assert get_current_profile() == 'fast'

    def test_env_var_takes_priority_over_disk(self, monkeypatch, tmp_path):
        set_profile('slow')  # writes 'slow' to disk
        invalidate_cache()
        monkeypatch.setenv('TTS_SPEED_PROFILE', 'fast')
        assert get_current_profile() == 'fast'

    def test_case_normalization_on_set(self):
        assert set_profile('BALANCED') is True
        assert get_current_profile() == 'balanced'
