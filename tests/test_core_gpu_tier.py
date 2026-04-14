"""Tests for core.gpu_tier — single source of truth for tier classification."""
from __future__ import annotations

import pytest

from core.gpu_tier import (
    TIER_DESCRIPTIONS,
    TIER_THRESHOLDS,
    GpuTier,
    classify,
    tier_table,
)


def test_no_cuda_is_always_none():
    """No CUDA → NONE, regardless of how much VRAM the system reports.
    Integrated GPUs can show large 'shared' RAM but have no CUDA path."""
    assert classify(64.0, cuda_available=False) == GpuTier.NONE
    assert classify(0.0, cuda_available=False) == GpuTier.NONE
    assert classify(100.0, cuda_available=False) == GpuTier.NONE


@pytest.mark.parametrize("vram,expected", [
    (24.0, GpuTier.ULTRA),
    (32.0, GpuTier.ULTRA),
    (80.0, GpuTier.ULTRA),
    (23.99, GpuTier.FULL),  # boundary
    (10.0, GpuTier.FULL),
    (16.0, GpuTier.FULL),
    (9.99, GpuTier.STANDARD),  # boundary
    (4.0, GpuTier.STANDARD),
    (8.0, GpuTier.STANDARD),
    (3.99, GpuTier.NONE),
    (0.0, GpuTier.NONE),
])
def test_thresholds_with_cuda(vram, expected):
    """Boundary tests for every tier — locks the 24/10/4 ladder.
    If we change the thresholds we want a test to fail here to force
    a deliberate test update (not a silent drift like before)."""
    assert classify(vram, cuda_available=True) == expected


def test_tier_table_is_sorted_descending():
    """The frontend renders the table in array order; descending = most-
    capable first, which matches how operators read the chip color ladder."""
    table = tier_table()
    thresholds = [t['min_vram_gb'] for t in table]
    assert thresholds == sorted(thresholds, reverse=True), (
        f"tier_table must be descending by min_vram_gb, got {thresholds}"
    )


def test_tier_table_has_required_keys():
    """Frontend renders table[].name + label + short + description + min_vram_gb.
    Missing keys would render as 'undefined' in the chip — guard against it."""
    required = {'name', 'min_vram_gb', 'label', 'short', 'description'}
    for entry in tier_table():
        assert required.issubset(entry.keys()), (
            f"tier_table entry missing keys: {required - entry.keys()}"
        )


def test_all_tiers_have_descriptions():
    """Every tier in TIER_THRESHOLDS must have presentation metadata.
    Without this an unknown tier could land at the frontend with no label."""
    for tier in TIER_THRESHOLDS:
        assert tier in TIER_DESCRIPTIONS
        meta = TIER_DESCRIPTIONS[tier]
        assert meta['label']
        assert meta['short']
        assert meta['description']


def test_tier_values_are_strings():
    """GpuTier is a str-Enum so JSON serialization is transparent.  This is
    the contract that lets the Flask handler do `gpu_tier.value` and ship
    the wire format ('ultra', 'full', ...) without conversion glue."""
    assert GpuTier.ULTRA.value == 'ultra'
    assert GpuTier.FULL.value == 'full'
    assert GpuTier.STANDARD.value == 'standard'
    assert GpuTier.NONE.value == 'none'
