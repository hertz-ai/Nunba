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


def test_a_failed_save_does_not_truncate_the_config(tmp_path, monkeypatch):
    """The whole point of the atomic write.

    A plain open(...,'w') truncates before writing, so a crash or a second
    writer mid-write leaves a half-written llama_config.json — the node's core
    config, which then fails to parse at boot. /chat persisting the preference on
    a concurrent request path widened that window.
    """
    import llama.llama_config as m
    c = _cfg(tmp_path)
    c.config['marker'] = 'first'
    c._save_config()
    before = c.config_file.read_text(encoding='utf-8')
    assert 'first' in before

    def boom(*a, **k):
        raise OSError('disk full')

    monkeypatch.setattr(m.json, 'dump', boom)
    c.config['marker'] = 'second'
    c._save_config()  # logs the error, must not raise

    assert c.config_file.read_text(encoding='utf-8') == before, \
        "a failed write truncated or corrupted the config"
    assert not list(tmp_path.glob('.llama_config.*.tmp')), \
        "temp file left behind on failure"


def test_cached_preference_is_read_once_and_only_the_setter_invalidates(tmp_path, monkeypatch):
    """/chat reads this per turn, so it must not re-read the file each time."""
    import llama.llama_config as m
    monkeypatch.setattr(m, '_PREF_CACHE', None)
    c = _cfg(tmp_path)

    # the canonical setter primes the cache (and never touches the real ~/.nunba)
    c.set_intelligence_preference('hive_preferred')
    assert m.LlamaConfig.cached_intelligence_preference() == 'hive_preferred'

    # a change made behind the setter's back is NOT re-read — proves it is cached
    c.config['intelligence_preference'] = 'local_only'
    c._save_config()
    assert m.LlamaConfig.cached_intelligence_preference() == 'hive_preferred'

    # ...and the setter is the one thing that invalidates it
    c.set_intelligence_preference('local_only')
    assert m.LlamaConfig.cached_intelligence_preference() == 'local_only'
