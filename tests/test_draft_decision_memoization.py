"""
tests/test_draft_decision_memoization.py
────────────────────────────────────────
Regression battery for PERF-18 (task #614).

`should_boot_draft()` is a BOOT decision — `main.py:641` calls it once and
`main.py:652` starts the draft server on the result.  Nothing re-reads it to
start or stop that server afterwards.

Before the fix, `/backend/health` (main.py:3678) also called it on EVERY poll.
Measured live on an 8 GB box:

    draft_decision.jsonl  985,960 bytes | 5,528 lines | 38.5 h
                          144 lines/hour = one every ~25 s, unbounded

Each of those calls re-ran GPU detection + `mkdir` + an append to that file +
two INFO emits across four log files.  Two defects fell out:

  1. PERF — boot-only work (GPU probe + disk I/O) on a polled endpoint.
  2. CORRECTNESS (worse) — the gate branches on `free >= 1.0` and free VRAM
     fluctuates, so successive `/backend/health` polls could report
     `speculation_enabled` true then false while the actual boot state never
     changed.  Health reported a fresh re-decision, not what booted.

EVERY test here FAILS against the pre-fix code.  That is deliberate — see
memory/feedback_vacuous_guards.md: a test that passes against the unfixed code
proves nothing.  The pre-fix behaviour is named per-test in the docstring.
"""
from __future__ import annotations

import sys

import pytest

# Reuse the existing fake-VRAM harness rather than standing up a second one
# (Gate 2 — DRY).  These live in the cohort-gate battery next door.
from tests.test_draft_cohort_gate import _install_fake_vram


@pytest.fixture(autouse=True)
def _restore_vram_module_after_each_test():
    """Same sys.modules save/restore as the cohort-gate battery.

    The fake VRAM module is written into sys.modules, so without this it
    bleeds into alphabetically-later test files and crashes them on stale
    state.  Fixtures don't cross module boundaries in pytest, so this
    plumbing is repeated rather than imported.
    """
    saved_mods = {
        k: sys.modules.get(k) for k in (
            'integrations',
            'integrations.service_tools',
            'integrations.service_tools.vram_manager',
        )
    }
    yield
    for k, v in saved_mods.items():
        if v is None:
            sys.modules.pop(k, None)
        else:
            sys.modules[k] = v


@pytest.fixture
def cfg(monkeypatch):
    """LlamaConfig with lang/tts pinned and the drift log captured, not written.

    Returns (LlamaConfig, recorded_log_entries).  Cache is cleared before and
    after so these tests never inherit or leak a memoized decision.
    """
    from llama.llama_config import LlamaConfig

    recorded: list[dict] = []

    def _fake_log(decision, lang, vram_total, vram_free, active_tts, reason):
        recorded.append({
            'decision': decision, 'lang': lang,
            'vram_total_gb': vram_total, 'vram_free_gb': vram_free,
            'active_tts': active_tts, 'reason': reason,
        })

    monkeypatch.setattr(LlamaConfig, '_log_draft_decision',
                        staticmethod(_fake_log))
    monkeypatch.setattr(LlamaConfig, '_read_preferred_lang',
                        staticmethod(lambda: 'en'))
    monkeypatch.setattr(LlamaConfig, '_read_active_tts',
                        staticmethod(lambda: 'kokoro'))

    LlamaConfig.reset_draft_decision_cache()
    yield LlamaConfig, recorded
    LlamaConfig.reset_draft_decision_cache()


# ── Defect 2: determinism ────────────────────────────────────────────────
def test_decision_is_stable_when_free_vram_fluctuates(cfg):
    """The live bug: free VRAM moves, so the answer moved with it.

    PRE-FIX: second call re-derives against 3.0 GB total and returns False —
    /backend/health flips speculation_enabled under a caller who did nothing.
    POST-FIX: the boot decision is memoized, so it stays True.
    """
    LlamaConfig, _ = cfg

    _install_fake_vram(total_gb=16.0, free_gb=8.0)
    first = LlamaConfig.should_boot_draft()
    assert first is True, "16 GB / 8 GB free must enable draft at boot"

    # Simulate what actually happens on a live box: VRAM pressure changes.
    _install_fake_vram(total_gb=3.0, free_gb=0.2)
    second = LlamaConfig.should_boot_draft()

    assert second is first, (
        "should_boot_draft() must report the BOOT decision, not re-derive it. "
        "A polled caller (/backend/health) that changed nothing got a "
        "different answer — that is the non-determinism this fix removes."
    )


def test_free_vram_dip_does_not_flip_the_answer(cfg):
    """Narrower version of the above, at the exact `free >= 1.0` boundary.

    PRE-FIX: 0.5 GB free trips the free-VRAM branch and returns False.
    POST-FIX: memoized True.
    """
    LlamaConfig, _ = cfg

    _install_fake_vram(total_gb=16.0, free_gb=4.0)
    assert LlamaConfig.should_boot_draft() is True

    _install_fake_vram(total_gb=16.0, free_gb=0.5)   # transient dip, same box
    assert LlamaConfig.should_boot_draft() is True, (
        "a transient free-VRAM dip must not change the reported boot decision"
    )


# ── Defect 1: the unbounded side effect ──────────────────────────────────
def test_polling_emits_exactly_one_drift_log_line(cfg):
    """The 5,528-lines-in-38.5-h bug, in miniature.

    PRE-FIX: 25 calls -> 25 recorded entries (and 25 real jsonl appends,
    25 GPU probes, 25 mkdir syscalls).
    POST-FIX: 1.
    """
    LlamaConfig, recorded = cfg

    _install_fake_vram(total_gb=16.0, free_gb=8.0)
    for _ in range(25):
        LlamaConfig.should_boot_draft()

    assert len(recorded) == 1, (
        f"drift-monitor line is per-BOOT, not per-call; got {len(recorded)} "
        f"for 25 calls. Live this was 144 lines/hour into an unbounded file."
    )


def test_vram_is_probed_once_across_many_calls(cfg):
    """Assert the WORK is skipped, not merely that the return value is cached.

    Asserting only the return value would pass against an implementation that
    still probed the GPU every call and threw the result away — a proxy, not
    the property (feedback_vacuous_guards).  So count the probes.
    """
    LlamaConfig, _ = cfg

    _install_fake_vram(total_gb=16.0, free_gb=8.0)
    mod = sys.modules['integrations.service_tools.vram_manager']
    calls = {'n': 0}
    real = mod.vram_manager.detect_gpu

    def _counting_detect_gpu():
        calls['n'] += 1
        return real()

    mod.vram_manager.detect_gpu = _counting_detect_gpu

    for _ in range(25):
        LlamaConfig.should_boot_draft()

    assert calls['n'] == 1, (
        f"GPU detection must run once per boot decision, ran {calls['n']}x"
    )


# ── The escape hatches the boot path and the tests rely on ───────────────
def test_refresh_recomputes_against_current_vram(cfg):
    """`refresh=True` is how the boot path forces a real decision.

    Without this the cohort-gate battery could not test multiple VRAM rows,
    and a boot retry could not re-decide.
    """
    LlamaConfig, _ = cfg

    _install_fake_vram(total_gb=16.0, free_gb=8.0)
    assert LlamaConfig.should_boot_draft(refresh=True) is True

    _install_fake_vram(total_gb=3.0, free_gb=0.2)
    assert LlamaConfig.should_boot_draft(refresh=True) is False, (
        "refresh=True must re-derive against current VRAM"
    )


def test_refresh_emits_a_drift_line_each_time(cfg):
    """Boot-time re-decisions stay observable — the drift monitor still works."""
    LlamaConfig, recorded = cfg

    _install_fake_vram(total_gb=16.0, free_gb=8.0)
    LlamaConfig.should_boot_draft(refresh=True)
    LlamaConfig.should_boot_draft(refresh=True)

    assert len(recorded) == 2, (
        "an explicit refresh is a real boot decision and must be logged"
    )


def test_reset_clears_the_memoized_decision(cfg):
    """The reset hook the two existing test batteries depend on."""
    LlamaConfig, _ = cfg

    _install_fake_vram(total_gb=16.0, free_gb=8.0)
    assert LlamaConfig.should_boot_draft() is True

    LlamaConfig.reset_draft_decision_cache()
    _install_fake_vram(total_gb=3.0, free_gb=0.2)
    assert LlamaConfig.should_boot_draft() is False, (
        "after reset the next call must re-derive"
    )


def test_first_call_still_decides_when_health_beats_boot(cfg):
    """/backend/health can be hit before the boot thread decides.

    In that case the health call must compute a real answer (and log it), not
    return a placeholder — otherwise the endpoint lies during startup.
    """
    LlamaConfig, recorded = cfg

    _install_fake_vram(total_gb=16.0, free_gb=8.0)
    assert LlamaConfig.should_boot_draft() is True
    assert len(recorded) == 1, "the first call is a real decision and is logged"
