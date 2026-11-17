"""On macOS the ctx size is sized from unified memory, and ONLY there.

THE LIVE FAILURE THIS ENCODES (2026-11-17, Apple M4, 16 GB):

    Dynamic context size: 4096 (VRAM free=0.000GiB, model=2.712GiB ...)
    400 - request (4288 tokens) exceeds the available context size (4096)

A Mac has no nvidia-smi / rocm-smi, so vram_manager latches the all-zero
reading before its Metal branch runs and free_gb is 0.0 on every Mac.  The
fix reads available unified memory inside _derive_ctx_size only, so model,
TTS and STT selection (which also read vram_manager) do not move, and no
other platform changes.
"""
import os
import sys

import pytest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import integrations.service_tools.vram_manager  # noqa: F401,E402  (ensure cached)

import llama.llama_config as lc  # noqa: E402
from llama.llama_installer import QWEN35_RUNTIME_FAMILY  # noqa: E402

_VM_MOD = sys.modules['integrations.service_tools.vram_manager']


class _Preset:
    display_name = 'Qwen3.5 4B'
    size_mb = 2867.2
    min_build = None
    runtime_family = QWEN35_RUNTIME_FAMILY


class _Probe:
    def __init__(self, reading):
        self.reading = reading

    def detect_gpu(self):
        return dict(self.reading)

    def refresh_gpu_info(self, force=False):
        return dict(self.reading)


_ZERO = {'name': None, 'total_gb': 0.0, 'free_gb': 0.0,
         'cuda_available': False}


@pytest.fixture
def run(monkeypatch):
    def _run(platform, reading=_ZERO, unified_free=9.0):
        c = lc.LlamaConfig.__new__(lc.LlamaConfig)
        c.config = {'context_size': 8192}
        monkeypatch.setattr(_VM_MOD, 'vram_manager', _Probe(reading),
                            raising=True)
        monkeypatch.setattr(lc.sys, 'platform', platform)
        calls = []

        def _fake_unified():
            calls.append(1)
            return unified_free
        monkeypatch.setattr(lc, '_darwin_unified_free_gib', _fake_unified,
                            raising=False)
        return c._derive_ctx_size(_Preset()), calls
    return _run


def test_mac_with_zero_probe_reads_unified_memory(run):
    """9.0 - 2.8 = 6.2 GiB remaining -> top tier, capped at 12288."""
    ctx, calls = run('darwin')
    assert ctx == 12288
    assert calls == [1]


def test_tight_mac_still_gets_the_small_tier(run):
    """3.0 - 2.8 < 2 GiB -> 4096: the tiers are unchanged, only the input."""
    ctx, _ = run('darwin', unified_free=3.0)
    assert ctx == 4096


def test_mac_with_unreadable_memory_keeps_todays_4096(run):
    ctx, _ = run('darwin', unified_free=0.0)
    assert ctx == 4096


@pytest.mark.parametrize('platform', ['linux', 'win32'])
def test_other_platforms_with_zero_probe_are_unchanged(run, platform):
    """A CPU-only Linux/Windows box keeps exactly today's 4096 and never
    reads unified memory."""
    ctx, calls = run(platform)
    assert ctx == 4096
    assert calls == []


@pytest.mark.parametrize('platform', ['linux', 'win32', 'darwin'])
def test_a_real_probe_reading_is_never_overridden(run, platform):
    """A GPU the probe can read (CUDA box, or a future Metal-aware probe)
    is used as-is on every platform."""
    reading = {'name': 'RTX', 'total_gb': 8.0, 'free_gb': 3.0,
               'cuda_available': True}
    ctx, calls = run(platform, reading=reading, unified_free=30.0)
    assert ctx == 4096          # 3.0 - 2.8 -> small tier, from the probe
    assert calls == []


def test_helper_returns_zero_when_psutil_is_missing(monkeypatch):
    monkeypatch.setitem(sys.modules, 'psutil', None)
    assert lc._darwin_unified_free_gib() == 0.0
