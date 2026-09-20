"""Grant-preserving migration: legacy llm_mode -> canonical intelligence_preference.

intelligence_preference is the single source of truth for "where inference runs"
and "does this node join the hive relay". This proves the resolver:
  - honors an explicit persisted choice (the user's grant) above everything,
  - migrates only DELIBERATE legacy llm_mode grants (cloud/hybrid), and
  - never lets the auto-setup default llm_mode='local' silently pin a node off
    the relay (a real local choice lands as an explicit intelligence_preference).

Uses an isolated config_dir so the test NEVER writes the real ~/.nunba config
(the pytest-pollution hazard that clobbered llm_mode to 'local' in the field).
"""
import pytest

from llama.llama_config import LlamaConfig


def _cfg(tmp_path, **overrides):
    c = LlamaConfig(config_dir=str(tmp_path))
    c.config.update(overrides)
    return c


def test_explicit_preference_wins_over_legacy(tmp_path):
    c = _cfg(tmp_path, llm_mode='local', intelligence_preference='hive_preferred')
    assert c.resolve_intelligence_preference() == 'hive_preferred'


def test_legacy_cloud_migrates_to_hive_preferred(tmp_path):
    c = _cfg(tmp_path, llm_mode='cloud')
    c.config.pop('intelligence_preference', None)
    assert c.resolve_intelligence_preference() == 'hive_preferred'


def test_legacy_hybrid_migrates_to_auto(tmp_path):
    c = _cfg(tmp_path, llm_mode='hybrid')
    c.config.pop('intelligence_preference', None)
    assert c.resolve_intelligence_preference() == 'auto'


def test_default_local_does_not_pin_node(tmp_path):
    # llm_mode 'local' is the auto-setup DEFAULT, not a deliberate privacy grant,
    # so it must resolve to 'auto' and the node joins the relay.
    c = _cfg(tmp_path, llm_mode='local')
    c.config.pop('intelligence_preference', None)
    assert c.resolve_intelligence_preference() == 'auto'
    assert c.joins_hive_relay() is True


def test_unset_defaults_to_auto(tmp_path):
    c = _cfg(tmp_path)
    c.config.pop('llm_mode', None)
    c.config.pop('intelligence_preference', None)
    assert c.resolve_intelligence_preference() == 'auto'


def test_explicit_local_only_stays_off_relay(tmp_path):
    c = _cfg(tmp_path, intelligence_preference='local_only')
    assert c.joins_hive_relay() is False


def test_set_persists_and_validates(tmp_path):
    c = _cfg(tmp_path)
    c.set_intelligence_preference('local_only')
    # a fresh instance over the same dir reads the persisted grant
    assert LlamaConfig(config_dir=str(tmp_path)).resolve_intelligence_preference() == 'local_only'
    with pytest.raises(ValueError):
        c.set_intelligence_preference('bogus')
