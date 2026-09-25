"""The context tier must be decided in ONE unit, measured from the file.

THE LIVE FAILURE THIS ENCODES (2026-09-22, installed build):

    08:15:30,716  vram_manager: 8.0 GB total, 4.84 GB free
    08:15:49,944  4.84 GB free
    08:15:49,946  Dynamic context size: 4096
                  (VRAM free=4.8GB, model=2.8GB, remaining=2.0GB)

The log says "remaining=2.0GB" and the code says ``elif remaining >= 2.0``,
so every prior investigation read that line as a PASS that somehow chose the
4096 branch.  It was not a pass.  ``.1f`` was rounding a miss into a match.

THE ARITHMETIC.  ``free_gb`` comes from nvidia-smi, which reports MiB, and
vram_manager divides by 1024 -- so ``free_gb`` is **GiB**.  ``model_gb`` came
from ``preset.size_mb / 1024.0``, where ``size_mb`` is the hand-typed literal
``2910``.  MEASURED against the file that was actually loaded
(C:\\Users\\sathi\\.trueflow\\models\\Qwen3.5-4B-UD-Q4_K_XL.gguf,
2,912,109,728 bytes):

    2,912,109,728 B = 2912.1 MB (decimal) = 2777.2 MiB = 2.712114 GiB
    literal 2910 matches the DECIMAL MB reading to 0.07%
    literal 2910 misses the binary MiB reading by 4.8%

so ``2910 / 1024 = 2.841797`` is a decimal-MB count divided by a binary
divisor: not GiB, not anything.  It overstates the model by 0.1297 GiB
(133 MB).  Subtracting it from a GiB free-reading mixes units, and that is
what decided the tier:

    remaining = 4.84 - 2.841797 = 1.998203  -> `>= 2.0` FALSE by 1.8 MB -> 4096
    remaining = 4.84 - 2.712114 = 2.127886  -> `>= 2.0` TRUE           -> 8192

4096 cannot hold the tool schema (MEASURED 8026 tokens), so every agentic
turn 400s for the whole life of the process.  A 133 MB unit error cost half
the context window.

WHY NOT A ROLLING-HISTORY FIX: the retained VRAM samples across that whole
boot window were 4.84, 4.84, 4.84, 4.84, 4.84, 4.71, 4.71 -- the high-water
mark IS 4.84, identical to the instantaneous sample already used.  A
max/median over history would have produced the same 4096.  The reading was
never stale; the unit was wrong.

WHY ``size_mb`` CANNOT SIMPLY BE RE-DIVIDED: the table is not internally
consistent.  The two rows whose files are on disk are decimal MB, but the
large rows carry their author's own arithmetic in the comment --
``6113,  # 5.97 GB`` (6113/1024 = 5.97), ``18022,  # 17.6 GB``,
``22733,  # 22.2 GB`` -- i.e. MiB.  One field, two vocabularies, so no single
divisor is right for every row.  The fix does not pick one: when the weights
are on disk it MEASURES them, and the literal survives only as the
pre-download estimate it always was.
"""
import logging
import os
import sys

import pytest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# `integrations.service_tools.__init__` rebinds `vram_manager` to the singleton
# INSTANCE, so the submodule is only reachable through sys.modules.
import integrations.service_tools.vram_manager  # noqa: F401,E402  (ensure cached)

from llama.llama_installer import QWEN35_RUNTIME_FAMILY  # noqa: E402

_VM_MOD = sys.modules['integrations.service_tools.vram_manager']

# The exact file the live 08:15:49 spawn loaded.
LIVE_GGUF_BYTES = 2_912_109_728
LIVE_GGUF_GIB = 2.712114          # 2_912_109_728 / 1024**3
LIVE_FREE_GIB = 4.84              # as logged by vram_manager at 08:15:49,944
LIVE_SIZE_MB_LITERAL = 2910       # llama_installer.MODEL_PRESETS[0]

# What the buggy conversion produced, kept so a regression is named.
BUGGY_MODEL_GB = LIVE_SIZE_MB_LITERAL / 1024.0   # 2.841797

FAKE_MODEL_PATH = os.path.join('C:\\', 'models', 'Qwen3.5-4B-UD-Q4_K_XL.gguf')


class _LivePreset:
    """MODEL_PRESETS[0] exactly as shipped."""
    display_name = 'Qwen3.5-4B VL (Recommended)'
    file_name = 'Qwen3.5-4B-UD-Q4_K_XL.gguf'
    size_mb = LIVE_SIZE_MB_LITERAL
    min_build = 9180
    # WITHOUT this the preset is not a Qwen3.5 row and `_derive_ctx_size`
    # never reaches the VRAM branch at all -- which is why the sibling
    # guard file tests/test_ctx_size_reads_fresh_vram.py has been failing.
    runtime_family = QWEN35_RUNTIME_FAMILY


class _FakeVRAM:
    """nvidia-smi reporting the live boot's free VRAM, in GiB."""

    def __init__(self, free_gib=LIVE_FREE_GIB):
        self.free_gib = free_gib
        self.forced = 0

    def detect_gpu(self):
        return {'name': 'RTX 3070 Laptop', 'total_gb': 8.0,
                'free_gb': self.free_gib, 'cuda_available': True}

    def refresh_gpu_info(self, force=False):
        if force:
            self.forced += 1
        return self.detect_gpu()


@pytest.fixture
def sized_file(monkeypatch):
    """Make FAKE_MODEL_PATH stat as the real 2,912,109,728-byte gguf.

    Patching the stat rather than writing the file: this assertion is about
    2.9 GB of BYTE COUNT, and writing 2.9 GB to a laptop disk to test a
    division is how a test suite fills a disk (see feedback_disk_full).
    """
    real_getsize = os.path.getsize
    real_exists = os.path.exists

    def fake_getsize(path):
        if str(path) == FAKE_MODEL_PATH:
            return LIVE_GGUF_BYTES
        return real_getsize(path)

    def fake_exists(path):
        if str(path) == FAKE_MODEL_PATH:
            return True
        return real_exists(path)

    monkeypatch.setattr(os.path, 'getsize', fake_getsize)
    monkeypatch.setattr(os.path, 'exists', fake_exists)
    return FAKE_MODEL_PATH


@pytest.fixture
def cfg(monkeypatch):
    from llama.llama_config import LlamaConfig
    c = LlamaConfig.__new__(LlamaConfig)
    c.config = {'context_size': 8192}
    fake = _FakeVRAM()
    monkeypatch.setattr(_VM_MOD, 'vram_manager', fake, raising=True)
    return c, fake


# ── 1. The unit, isolated from the tier policy ────────────────────────

def test_model_size_is_the_files_true_gib_not_the_literal_over_1024(sized_file):
    """2,912,109,728 B is 2.712114 GiB.  The literal path says 2.841797."""
    from llama.llama_installer import model_size_gib

    measured = model_size_gib(_LivePreset(), model_path=sized_file)

    assert measured == pytest.approx(LIVE_GGUF_GIB, abs=0.001), (
        f'expected the file measured in GiB ({LIVE_GGUF_GIB}); a result of '
        f'{BUGGY_MODEL_GB:.6f} means size_mb (decimal MB) was divided by the '
        f'binary 1024, overstating the weights by 133 MB'
    )
    assert measured < BUGGY_MODEL_GB, (
        'the measured size must be SMALLER than the literal reading -- that '
        '133 MB of phantom weight is what consumed the context tier'
    )


def test_the_literal_fallback_is_used_only_when_the_file_is_absent():
    """Pre-download there is nothing to measure, so the estimate stands.

    It stays on the CONSERVATIVE (over-stating) reading: understating a
    model's size is the direction that OOMs a spawn.
    """
    from llama.llama_installer import model_size_gib

    assert model_size_gib(_LivePreset(), model_path=None) == pytest.approx(
        BUGGY_MODEL_GB, abs=0.001)


# ── 2. The live decision ──────────────────────────────────────────────

def test_the_live_boot_numbers_choose_8192(cfg, sized_file):
    """free 4.84 GiB - model 2.712 GiB = 2.128 remaining -> the 8192 tier."""
    c, _fake = cfg

    ctx = c._derive_ctx_size(_LivePreset(), model_path=sized_file)

    assert ctx == 8192, (
        f'got {ctx}.  4096 means the decision still subtracts '
        f'{BUGGY_MODEL_GB:.6f} GB from a GiB reading and misses the 2.0 '
        f'threshold by 1.8 MB'
    )


def test_a_genuinely_tight_box_still_gets_the_small_tier(cfg, sized_file):
    """The tiers are unchanged -- only their INPUT unit is fixed."""
    c, fake = cfg
    fake.free_gib = 4.0          # 4.0 - 2.712 = 1.288 remaining, nowhere near 2.0

    assert c._derive_ctx_size(_LivePreset(), model_path=sized_file) == 4096


def test_a_roomy_box_still_reaches_the_cap(cfg, sized_file):
    c, fake = cfg
    fake.free_gib = 7.56         # 7.56 - 2.712 = 4.85 remaining -> 16384, capped

    assert c._derive_ctx_size(_LivePreset(), model_path=sized_file) == 12288


def test_the_spawn_still_forces_a_fresh_probe(cfg, sized_file):
    """The 2026-09-10 fix must survive this one (a spawn invalidates the memo)."""
    c, fake = cfg

    c._derive_ctx_size(_LivePreset(), model_path=sized_file)

    assert fake.forced == 1, (
        'no forced probe was requested, so the reading can be a full TTL old '
        'and taken across a server teardown'
    )


# ── 3. The knife edge itself ──────────────────────────────────────────

def test_the_tier_comparison_is_exact_with_no_hidden_margin(cfg, sized_file):
    """Owner 2026-09-22: no tolerance.  ONE mechanism decides the tier --
    the measured weights in the right unit -- and the comparison against the
    3.0 / 2.0 GiB gates is exact.  A box that lands under a gate gets the
    smaller tier, full stop; the fix for landing under it by a hair is to
    measure correctly, not to move the gate.

    Guards against a margin quietly coming back: 22 MB under 2.0 must yield
    4096, and 1 MB over must yield 8192.
    """
    c, fake = cfg
    fake.free_gib = 4.69         # 4.69 - 2.712114 = 1.977886 -> under 2.0
    assert c._derive_ctx_size(_LivePreset(), model_path=sized_file) == 4096

    fake.free_gib = 4.7132       # 4.7132 - 2.712114 = 2.001086 -> over 2.0
    assert c._derive_ctx_size(_LivePreset(), model_path=sized_file) == 8192


# ── 4. Telemetry: the boundary must be readable in the log ────────────

def test_the_decision_log_shows_enough_precision_to_falsify_it(cfg, sized_file, caplog):
    """``.1f`` printed remaining=1.998203 as "2.0" against a `>= 2.0` test.

    The log was not merely thin, it was ACTIVELY MISLEADING: it showed a
    number that satisfies the condition next to the branch that rejects it.
    Every prior investigation, including two of mine, read that line as a
    pass.  The decision line has to carry its raw inputs at a precision the
    comparison actually uses.
    """
    c, _fake = cfg
    with caplog.at_level(logging.INFO, logger='NunbaLlamaConfig'):
        c._derive_ctx_size(_LivePreset(), model_path=sized_file)

    line = next((r.getMessage() for r in caplog.records
                 if 'context size' in r.getMessage().lower()), None)
    assert line is not None, 'the context decision emitted no log line at all'

    assert '2.128' in line, (
        f'remaining must print at >=3 decimals so a boundary case is '
        f'visible; got: {line}'
    )
    assert '4.840' in line, f'free VRAM must print at >=3 decimals; got: {line}'
    assert str(LIVE_GGUF_BYTES) in line or '2912109728' in line, (
        f'the measured byte count is the evidence that the unit is right -- '
        f'print it; got: {line}'
    )
    assert '2.0' in line, (
        f'the threshold the comparison used must appear beside the value; '
        f'got: {line}'
    )
