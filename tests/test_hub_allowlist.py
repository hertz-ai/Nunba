"""Tests for core.hub_allowlist — runtime trusted HF org allowlist."""
from __future__ import annotations

import json

import pytest

from core.hub_allowlist import (
    DEFAULT_TRUSTED_ORGS,
    HubAllowlist,
)


@pytest.fixture
def tmp_allowlist(tmp_path):
    """Fresh allowlist file per test — no shared state, no singleton."""
    cfg = tmp_path / 'hub_allowlist.json'
    return HubAllowlist(config_path=cfg)


def test_seed_defaults_on_first_load(tmp_path):
    """Cold install: file doesn't exist → seed all 27 defaults to disk."""
    cfg = tmp_path / 'hub_allowlist.json'
    assert not cfg.exists()
    al = HubAllowlist(config_path=cfg)
    assert cfg.exists()
    raw = json.loads(cfg.read_text(encoding='utf-8'))
    assert set(raw.keys()) == set(DEFAULT_TRUSTED_ORGS.keys())
    # Every entry has a reason — the audit-trail contract.
    for org in raw:
        assert raw[org]['reason']


def test_is_trusted_case_insensitive(tmp_allowlist):
    """HF org names resolve case-insensitively at the resolver — the
    allowlist MUST too, or an attacker can clone `qwen` as `Qwen`."""
    assert tmp_allowlist.is_trusted('qwen') is True
    assert tmp_allowlist.is_trusted('Qwen') is True
    assert tmp_allowlist.is_trusted('QWEN') is True
    assert tmp_allowlist.is_trusted('not-real-org') is False


def test_add_and_remove_round_trip(tmp_allowlist):
    """Add → is_trusted True → remove → is_trusted False; persisted to disk."""
    tmp_allowlist.add('acme-corp', 'enterprise tenant internal models')
    assert tmp_allowlist.is_trusted('acme-corp') is True
    # Re-load from disk via a fresh instance and verify persistence.
    fresh = HubAllowlist(config_path=tmp_allowlist._path)
    assert fresh.is_trusted('acme-corp') is True
    assert fresh.remove('acme-corp') is True
    # Idempotent remove
    assert fresh.remove('acme-corp') is False
    # Re-load and verify gone
    fresher = HubAllowlist(config_path=tmp_allowlist._path)
    assert fresher.is_trusted('acme-corp') is False


def test_add_rejects_invalid_org(tmp_allowlist):
    """Slashes, whitespace, empty strings, and non-ASCII (homoglyph defense)
    all rejected with ValueError so the admin handler surfaces the message."""
    with pytest.raises(ValueError):
        tmp_allowlist.add('', 'no name')
    with pytest.raises(ValueError):
        tmp_allowlist.add('has/slash', 'should fail')
    with pytest.raises(ValueError):
        tmp_allowlist.add('has space', 'should fail')
    with pytest.raises(ValueError):
        # Latin small i with acute (homoglyph for 'i') — same defense as
        # _normalize_hf_id in main.py.
        tmp_allowlist.add('a\u00ed4bharat', 'homoglyph attack')


def test_add_rejects_empty_reason(tmp_allowlist):
    """Reason is the audit trail — empty string defeats the purpose, reject."""
    with pytest.raises(ValueError):
        tmp_allowlist.add('valid-org', '')
    with pytest.raises(ValueError):
        tmp_allowlist.add('valid-org', None)  # type: ignore[arg-type]


def test_list_returns_metadata(tmp_allowlist):
    """The admin UI renders org + reason + added_at in a table; verify shape."""
    items = tmp_allowlist.list()
    assert len(items) >= len(DEFAULT_TRUSTED_ORGS)
    for entry in items:
        assert 'org' in entry
        assert 'reason' in entry
        assert 'added_at' in entry


def test_legacy_list_format_load(tmp_path):
    """A pre-existing config file with the legacy list-of-strings format
    should be tolerated (the `_TRUSTED_HF_ORGS` frozenset → JSON dump
    that an early operator might have done by hand)."""
    cfg = tmp_path / 'hub_allowlist.json'
    cfg.write_text(json.dumps(['google', 'microsoft']), encoding='utf-8')
    al = HubAllowlist(config_path=cfg)
    assert al.is_trusted('google') is True
    assert al.is_trusted('microsoft') is True
    # Defaults are NOT re-merged on legacy import — operator's curated
    # list is the source of truth.
    assert al.is_trusted('Qwen') is False


def test_corrupt_config_falls_back_to_defaults(tmp_path):
    """A corrupt JSON must not kill startup — log + re-seed defaults."""
    cfg = tmp_path / 'hub_allowlist.json'
    cfg.write_text("{not valid json", encoding='utf-8')
    al = HubAllowlist(config_path=cfg)
    # Defaults restored
    assert al.is_trusted('hertz-ai') is True
