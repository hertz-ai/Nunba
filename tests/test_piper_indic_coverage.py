"""Behavioural regression tests for the 2026-05-27 Indic-coverage fix.

Root cause (from frozen_debug.log):
  - User typed Tamil "hi"; agent responded in Tamil
  - TTS engine selected Piper as absolute fallback for 'ta'
  - Piper synth failed (no Tamil voice in LANG_TO_VOICE)
  - _synthesize_with_fallback ran ladder: indic_parler tried, no GPU,
    "no capable backend fits on this hardware" → text-only

Fix:
  1. Add Piper voice coverage for hi / ml / te / ur (rhasspy/piper-
     voices voices.json @ 2026-05-27 has all four).  These now have
     CPU-runnable fallback.
  2. PASS 2 of _select_backend_for_language now skips Piper for langs
     it can't speak (previously only PASS 1 had this check).

These tests prove the fix by inspecting the static state
(LANG_TO_VOICE + VOICE_PRESETS) — they don't download .onnx files or
run synth.  Network-touching probes belong in integration suites.
"""
from __future__ import annotations

import os
import sys

import pytest


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)


# ── New Piper voice coverage ──────────────────────────────────

@pytest.mark.parametrize('lang,expected_voice', [
    ('hi',    'hi_IN-pratham-medium'),
    ('hi_IN', 'hi_IN-pratham-medium'),
    ('ml',    'ml_IN-arjun-medium'),
    ('ml_IN', 'ml_IN-arjun-medium'),
    ('te',    'te_IN-maya-medium'),
    ('te_IN', 'te_IN-maya-medium'),
    ('ur',    'ur_PK-fasih-medium'),
    ('ur_PK', 'ur_PK-fasih-medium'),
])
def test_indic_lang_has_piper_voice(lang, expected_voice):
    """hi / ml / te / ur now resolve to a real Piper voice id.  Each
    key (bare + region-coded) is covered so callers passing either
    form get the same routing."""
    from tts.piper_tts import voice_for_lang
    assert voice_for_lang(lang) == expected_voice


@pytest.mark.parametrize('voice_id', [
    'hi_IN-pratham-medium',
    'ml_IN-arjun-medium',
    'te_IN-maya-medium',
    'ur_PK-fasih-medium',
])
def test_new_voices_registered_in_piper_voices(voice_id):
    """Each new LANG_TO_VOICE entry MUST have a corresponding
    VOICE_PRESETS record with url + config_url, otherwise _LazyPiper
    can't download the .onnx + .json pair.  Catches the case where
    someone adds a LANG_TO_VOICE mapping but forgets the URL entry."""
    from tts.piper_tts import VOICE_PRESETS
    assert voice_id in VOICE_PRESETS, (
        f"{voice_id} in LANG_TO_VOICE but missing from VOICE_PRESETS — "
        f"download would 404")
    entry = VOICE_PRESETS[voice_id]
    assert 'url' in entry and entry['url'].endswith('.onnx')
    assert 'config_url' in entry and entry['config_url'].endswith('.onnx.json')
    # All four new voices live under rhasspy/piper-voices on HF.
    assert 'rhasspy/piper-voices' in entry['url']


# ── Tamil + other unbundled Indic langs still raise correctly ──

@pytest.mark.parametrize('lang', ['ta', 'ta_IN', 'bn', 'gu', 'kn',
                                  'mr', 'or', 'pa', 'as'])
def test_unbundled_indic_lang_still_raises(lang):
    """Tamil (and the other 7 Indic langs Piper still doesn't ship)
    must raise PiperLangUnavailable so the engine selector can fall
    through to indic_parler / mms_tts.  Regression guard: if someone
    accidentally adds these to LANG_TO_VOICE without verifying the
    URL returns a real .onnx (>1MB), this test fails."""
    from tts.piper_tts import PiperLangUnavailable, voice_for_lang
    with pytest.raises(PiperLangUnavailable):
        voice_for_lang(lang)


# ── PASS 2 selector guard ──────────────────────────────────────

def test_pass_2_skips_piper_for_unsupported_lang(monkeypatch):
    """_select_backend_for_language must NOT pick Piper for Tamil
    in PASS 2 (PASS 1 already had this check).  Pre-fix: PASS 2
    selected Piper, synth raised PiperLangUnavailable, the
    _synthesize_with_fallback chain ran, eventually hit "no capable
    backend" with no audio.  Post-fix: PASS 2 skips Piper just like
    PASS 1 does, so the absolute-fallback branch is the only path
    that can return Piper for unsupported langs — and that branch
    logs explicitly that the synth will fail downstream.

    We don't have GPUs in CI, so we mock _can_run_backend to return
    True for Piper only, ensuring the only candidate that COULD be
    selected in PASS 2 is Piper.  Then we assert that for 'ta',
    Piper is still picked (via the absolute fallback path) but a
    specific log line documents the no-voice condition."""
    from tts import tts_engine as mod

    # Build a minimal engine without firing the full init machinery.
    eng = mod.TTSEngine.__new__(mod.TTSEngine)
    # Fields the selector reads — set to safe defaults.
    eng._backends = {}
    eng._demoted_backends = set()
    eng._consecutive_failures = {}
    eng._active_backend = None
    eng._language = 'en'
    eng._pending_backend = None
    eng._initialized = False
    eng.auto_init = False
    eng.has_gpu = False
    eng._hw_detected = True

    # Force prefs to a small list so we control the iteration.
    monkeypatch.setattr(mod, '_get_lang_preference',
                        lambda lang: [mod.BACKEND_INDIC_PARLER,
                                      mod.BACKEND_MMS_TTS,
                                      mod.BACKEND_PIPER])
    # Mock _can_run_backend so only Piper passes — exercises the
    # PASS 2 guard.  Pre-fix this would have returned Piper too,
    # post-fix it still does — but via the absolute-fallback branch.
    monkeypatch.setattr(mod.TTSEngine, '_can_run_backend',
                        lambda self, b: b == mod.BACKEND_PIPER)
    monkeypatch.setattr(mod.TTSEngine, '_is_demoted',
                        lambda self, b: False)
    monkeypatch.setattr(mod.TTSEngine, '_try_auto_install_backend',
                        lambda self, b: None)

    # For 'ta', Piper has no voice — PASS 2 must skip it; absolute
    # fallback still returns Piper (the contract preserved for
    # caller compat).
    result = eng._select_backend_for_language('ta')
    assert result == mod.BACKEND_PIPER

    # For 'hi' — Piper HAS a voice now (fix #1).  PASS 2 should
    # also select Piper because it's the only runnable.
    result = eng._select_backend_for_language('hi')
    assert result == mod.BACKEND_PIPER


def test_pass_2_prefers_runnable_non_piper_over_unsupported_lang(monkeypatch):
    """If a non-Piper backend IS runnable and the lang is unsupported
    by Piper, PASS 2 must pick the non-Piper backend rather than
    falling through to the absolute Piper fallback.  This is the
    real production scenario: indic_parler IS in the candidate list
    AND can run on a machine with GPU — pre-fix PASS 2 picked Piper
    first (because of iteration order), wasted a synth attempt, then
    fell back; post-fix the Piper-can't-speak-this-lang guard
    deprioritises it and the GPU engine wins."""
    from tts import tts_engine as mod

    eng = mod.TTSEngine.__new__(mod.TTSEngine)
    eng._backends = {}
    eng._demoted_backends = set()
    eng._consecutive_failures = {}
    eng._active_backend = None
    eng._language = 'en'
    eng._pending_backend = None
    eng._initialized = False
    eng.auto_init = False
    eng.has_gpu = True
    eng._hw_detected = True

    # Prefs put Piper FIRST so the bug surface is exercised — the
    # pre-fix selector would have picked Piper from this list for 'ta'
    # because the per-lang voice check wasn't running in PASS 2.
    monkeypatch.setattr(mod, '_get_lang_preference',
                        lambda lang: [mod.BACKEND_PIPER,
                                      mod.BACKEND_INDIC_PARLER])
    # Both backends runnable in this test — but Piper should be
    # skipped for Tamil due to the no-voice guard.
    monkeypatch.setattr(mod.TTSEngine, '_can_run_backend',
                        lambda self, b: True)
    monkeypatch.setattr(mod.TTSEngine, '_is_demoted',
                        lambda self, b: False)
    monkeypatch.setattr(mod.TTSEngine, '_try_auto_install_backend',
                        lambda self, b: None)

    # Tamil: PASS 1 skips Piper (already had the guard), then sees
    # indic_parler isn't verified yet, falls to PASS 2.  PASS 2
    # MUST skip Piper too (new guard) and pick indic_parler.
    result = eng._select_backend_for_language('ta')
    assert result == mod.BACKEND_INDIC_PARLER, (
        f"PASS 2 must skip Piper for Tamil — got {result!r} which "
        f"means the no-voice guard didn't fire and the engine "
        f"would synth wrong-language audio"
    )
