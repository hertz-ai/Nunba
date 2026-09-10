"""The llama-server context size must be sized from a FRESH VRAM reading.

THE LIVE FAILURE THIS ENCODES (2026-09-10, installed build):

    16:19:58,967  GPU (nvidia-smi): ... 8.0 GB total, 2.98 GB free
    16:20:16      llama-server on :8080 died (connection refused)
    16:21:55,203  Dynamic context size: 4096
                  (VRAM free=3.0GB, model=2.8GB, remaining=0.1GB)
    16:21:59,261  GPU (nvidia-smi): ... 8.0 GB total, 7.56 GB free

`_derive_ctx_size` called `vram_manager.detect_gpu()`, which is a plain memo
with no TTL of its own, so it handed back the 16:19:58 sample -- taken 117 s
earlier, while the OUTGOING server still held 4.5 GB.  4.76 GB of real
headroom was read as 0.1 GB, the smallest tier (4096) was chosen, and the
geometry stuck for the life of the process.

What that cost: the tool schema alone measured 8026 tokens against n_ctx
4096, so EVERY create/reuse turn died --

    wire-trim: the TOOL SCHEMA alone is 8026 tokens against an n_ctx of 4096
    400 - request (9099 tokens) exceeds the available context size

-- and agent 28160128202 produced 0 action files across 3 CREATE turns.

The TTL alone does not fix it: 117 s is INSIDE the 120 s bundled TTL, so an
unforced refresh returns the same stale number.  A spawn invalidates any
cached reading by construction; this site has to ask for a real probe.
"""
import os
import sys

import pytest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# `integrations.service_tools.__init__` rebinds `vram_manager` to the singleton
# INSTANCE, so the submodule is only reachable through sys.modules.
import integrations.service_tools.vram_manager  # noqa: F401,E402  (ensure cached)

_VM_MOD = sys.modules['integrations.service_tools.vram_manager']


class _Preset:
    """The live preset: Qwen3.5-4B-UD-Q4_K_XL, 2.8 GB of weights."""
    display_name = 'Qwen3.5 4B'
    size_mb = 2867.2
    min_build = None


class _StaleThenFresh:
    """detect_gpu() serves the memo; refresh_gpu_info(force=True) probes.

    Mirrors the real class: `detect_gpu` returns `self._gpu_info` verbatim
    when it is set, and only the forced refresh clears it.
    """

    STALE = {'name': 'RTX 3070 Laptop', 'total_gb': 8.0, 'free_gb': 2.98,
             'cuda_available': True}
    FRESH = {'name': 'RTX 3070 Laptop', 'total_gb': 8.0, 'free_gb': 7.56,
             'cuda_available': True}

    def __init__(self):
        self.forced = 0

    def detect_gpu(self):
        return dict(self.STALE)

    def refresh_gpu_info(self, force=False):
        if not force:
            return dict(self.STALE)      # 117 s old is inside the 120 s TTL
        self.forced += 1
        return dict(self.FRESH)


@pytest.fixture
def cfg(monkeypatch):
    from llama.llama_config import LlamaConfig
    c = LlamaConfig.__new__(LlamaConfig)
    c.config = {'context_size': 8192}
    fake = _StaleThenFresh()
    monkeypatch.setattr(_VM_MOD, 'vram_manager', fake, raising=True)
    return c, fake


def test_ctx_is_derived_from_the_fresh_reading_not_the_memo(cfg):
    """7.56 - 2.8 = 4.76 GB remaining -> top tier, capped at 12288."""
    c, _fake = cfg
    assert c._derive_ctx_size(_Preset()) == 12288, (
        'the memoized 2.98 GB reading was used: 2.98 - 2.8 = 0.18 GB -> the '
        '4096 tier, which cannot hold the 8026-token tool schema'
    )


def test_the_spawn_actually_forces_a_probe(cfg):
    """A fresh number that arrived by luck is not the contract."""
    c, fake = cfg
    c._derive_ctx_size(_Preset())
    assert fake.forced == 1, (
        'no forced probe was requested, so on a real box the reading can be '
        'up to the full TTL old and taken across a server teardown'
    )


def test_a_genuinely_tight_box_still_gets_the_small_tier(cfg):
    """The tiers themselves are unchanged -- only their INPUT is fixed."""
    c, fake = cfg
    fake.FRESH = {'name': 'x', 'total_gb': 8.0, 'free_gb': 3.0,
                  'cuda_available': True}
    assert c._derive_ctx_size(_Preset()) == 4096
