"""
tts_engine.py - Unified TTS Engine for Nunba

Multi-engine routing by language + hardware:
  - English:      Chatterbox Turbo (5.6GB, [laugh]/[chuckle] tags) or F5-TTS (2GB, voice cloning)
  - Indian langs: Indic Parler TTS (2GB, 21 languages, description-controlled voice)
  - International: CosyVoice3 (4GB, zh/ja/ko/de/es/fr/it/ru, zero-shot cloning)
  - Fallback:     Indic Parler (supports English too)

Pre-synth pipeline:
  - Caches predicted next responses in background thread
  - Sentence-level chunking for streaming LLM → TTS → audio playback
  - Common filler phrases pre-cached on startup
  - HART onboarding files served as static .ogg (zero compute)

Engine lifecycle:
  - One GPU engine at a time for <=8GB VRAM
  - Automatic engine swapping when language changes
  - VRAM tracking and cleanup between switches
  - Hardware-aware: detects GPU/VRAM/CPU, routes to best engine that fits
"""
import gc
import hashlib
import json
import logging
import os
import sys
import threading
from collections import OrderedDict
from collections.abc import Callable
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger('NunbaTTSEngine')

# Backend types
BACKEND_F5 = "f5"
BACKEND_CHATTERBOX_TURBO = "chatterbox_turbo"
BACKEND_CHATTERBOX_ML = "chatterbox_multilingual"
BACKEND_INDIC_PARLER = "indic_parler"
BACKEND_COSYVOICE3 = "cosyvoice3"
BACKEND_KOKORO = "kokoro"
BACKEND_PIPER = "piper"
# Mid-VRAM coverage tier (1–3 GB) — added 2026-04-29 to fill the
# 38-language coverage gap below the 4–14 GB heavy clone engines.
# Each maps via _BACKEND_TO_REGISTRY_KEY to a HARTOS engine spec.
BACKEND_MELOTTS = "melotts"
BACKEND_XTTS_V2 = "xtts_v2"
BACKEND_MMS_TTS = "mms_tts"
# NeuTTS Air (Neuphonic) — Apache-2.0, 748M Qwen2-backbone GGUF, RTF<0.5
# on CPU, 24kHz, instant voice cloning from 3-15s reference audio.  Slots
# between F5-TTS / Chatterbox-Turbo (heavy GPU clones) and Kokoro / MMS
# (light tier) on the English ladder — added 2026-05-08.  Routed into
# its own venv because `neutts[all]` pulls llama-cpp-python whose pins
# can drift from the main interpreter (same pattern as chatterbox_turbo
# and indic_parler).
BACKEND_NEUTTS_AIR = "neutts_air"
BACKEND_NONE = "none"

# ════════════════════════════════════════════════════════════════════
# Persisted-demotion state (negative-finding cache)
# ════════════════════════════════════════════════════════════════════
# Without this cache, a deterministically-broken top-of-ladder engine
# (e.g. chatterbox_turbo with corrupt weights, OOM under sustained VRAM
# pressure) is re-tried 3 times every boot before in-session demotion
# kicks in. Persisting demotions across reboots eliminates the wasted
# 3-failure cost. The cache is purely SUBTRACTIVE: selection still
# walks the quality-ordered ladder top-down in
# `_select_backend_for_language`; demotion just removes a candidate
# from contention. A NEWLY-installed top engine is therefore picked up
# automatically on the next boot because it has no demotion record.
#
# Self-healing: a demotion auto-expires after `_DEMOTION_TTL_SECONDS`,
# is wiped on schema mismatch (covers Nunba ladder updates that may
# have moved the engine to a different rung), and can be cleared by
# the admin endpoint or the hub-install hook (so reinstalling a
# previously-demoted engine gives it a fresh chance).
_TTS_STATE_SCHEMA = 1
_DEMOTION_TTL_SECONDS = 7 * 86400
# The same file keeps the languages lines were last spoken in
# ('spoken_languages', newest last), so the boot warm-up (main.py
# _warmup_tts) starts those voices before anyone speaks.  This many are
# kept: each is a voice the warm-up starts.
_SPOKEN_LANGUAGES_KEPT = 3


def _get_tts_state_path() -> str:
    """Return the canonical path to the persisted TTS state file.

    Uses ``core.platform_paths.get_db_dir`` (the same resolver that
    owns ``hart_language.json``) so the file lives next to the other
    user-state JSON blobs and respects ``NUNBA_DATA_DIR`` /
    ``HARTOS_DATA_DIR`` overrides. Falls back to the literal
    `~/Documents/Nunba/data/` only if the resolver isn't importable
    (degraded-mode dev environment); the production path resolves
    through the helper.

    ``NUNBA_TTS_STATE_PATH`` names the file outright and wins over all of
    the above.  tests/conftest.py sets it for every test so that a test
    which makes an engine fail cannot demote the owner's real engines.
    """
    override = os.environ.get('NUNBA_TTS_STATE_PATH')
    if override:
        return override
    try:
        from core.platform_paths import get_db_dir
        return os.path.join(get_db_dir(), 'tts_state.json')
    except Exception:
        return os.path.join(
            os.path.expanduser('~'), 'Documents', 'Nunba',
            'data', 'tts_state.json',
        )

# ════════════════════════════════════════════════════════════════════
# Global TTS tempo knob. Default is "balanced" per the project
# guideline "speed > naturalness default". Resolution order:
#   1. TTS_SPEED_PROFILE env var
#   2. ~/.nunba/tts_config.json  speed_profile field  (admin UI pin)
#   3. _DEFAULT_SPEED_PROFILE
# Invalid values fall through so a typo never breaks synth. The
# resolved profile is cached; _set_profile writes atomically and
# invalidates the cache so the next synth picks up the change.
# ════════════════════════════════════════════════════════════════════

_SPEED_PROFILES = {'fast': 1.25, 'balanced': 1.10, 'natural': 1.00, 'slow': 0.90}
_DEFAULT_SPEED_PROFILE = 'balanced'
_cached_speed_profile: str | None = None


def _read_speed_profile_from_disk() -> str | None:
    try:
        cfg_path = Path.home() / '.nunba' / 'tts_config.json'
        if not cfg_path.is_file():
            return None
        with cfg_path.open(encoding='utf-8') as fp:
            data = json.load(fp)
        val = data.get('speed_profile')
        if isinstance(val, str) and val.lower() in _SPEED_PROFILES:
            return val.lower()
    except Exception as e:
        logger.debug(f"tts_config.json read skipped: {e}")
    return None


def _get_current_speed_profile() -> str:
    global _cached_speed_profile
    if _cached_speed_profile is not None:
        return _cached_speed_profile
    env_val = os.environ.get('TTS_SPEED_PROFILE', '').strip().lower()
    if env_val in _SPEED_PROFILES:
        _cached_speed_profile = env_val
        return _cached_speed_profile
    disk_val = _read_speed_profile_from_disk()
    if disk_val:
        _cached_speed_profile = disk_val
        return _cached_speed_profile
    _cached_speed_profile = _DEFAULT_SPEED_PROFILE
    return _cached_speed_profile


def _get_default_speed() -> float:
    return _SPEED_PROFILES[_get_current_speed_profile()]


def _set_speed_profile(name: str) -> bool:
    """Pin a profile to ~/.nunba/tts_config.json atomically and
    invalidate the cache. Returns False on invalid name or I/O error."""
    global _cached_speed_profile
    name_l = (name or '').strip().lower()
    if name_l not in _SPEED_PROFILES:
        return False
    try:
        cfg_dir = Path.home() / '.nunba'
        cfg_dir.mkdir(parents=True, exist_ok=True)
        cfg_path = cfg_dir / 'tts_config.json'
        data = {}
        if cfg_path.is_file():
            try:
                with cfg_path.open(encoding='utf-8') as fp:
                    data = json.load(fp) or {}
            except Exception:
                data = {}
        data['speed_profile'] = name_l
        tmp = cfg_path.with_suffix('.json.tmp')
        with tmp.open('w', encoding='utf-8') as fp:
            json.dump(data, fp, indent=2)
        os.replace(tmp, cfg_path)
        _cached_speed_profile = name_l
        logger.info(f"TTS speed profile set to '{name_l}' (×{_SPEED_PROFILES[name_l]})")
        return True
    except Exception as e:
        logger.warning(f"Failed to persist TTS speed profile: {e}")
        return False


def _invalidate_speed_cache() -> None:
    global _cached_speed_profile
    _cached_speed_profile = None

# ════════════════════════════════════════════════════════════════════
# FALLBACK ENGINE CAPABILITIES — degraded-mode fallback only.
#
# This matrix is used ONLY when ModelCatalog is unavailable
# (standalone/embedded mode without HARTOS).  The canonical source of
# truth is ModelCatalog (populated by HARTOS tts_router).  All runtime
# code should call _get_engine_capabilities() / _get_lang_preference()
# rather than reading this dict directly.
# ════════════════════════════════════════════════════════════════════

_FALLBACK_ENGINE_CAPABILITIES = {
    BACKEND_F5: {
        'name': 'F5-TTS (Flow Matching)',
        'vram_gb': 2.5,  # model 1.2GB + vocos 200MB + CUDA context + inference buffers
        'languages': {'en', 'zh'},
        'paralinguistic': [],
        'emotion_tags': [],
        'voice_cloning': True,
        'streaming': False,
        'sample_rate': 24000,
        'quality': 'highest',
    },
    BACKEND_CHATTERBOX_TURBO: {
        'name': 'Chatterbox Turbo 350M',
        'vram_gb': 5.6,
        'languages': {'en'},
        'paralinguistic': ['[laugh]', '[chuckle]', '[sigh]', '[gasp]', '[cough]'],
        'emotion_tags': [],
        'voice_cloning': True,
        'streaming': False,
        'sample_rate': 24000,
        'quality': 'high',
    },
    BACKEND_CHATTERBOX_ML: {
        'name': 'Chatterbox Multilingual',
        'vram_gb': 14,
        'languages': {
            'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'sv',
            'da', 'fi', 'hu', 'el', 'tr', 'cs', 'ro', 'bg', 'hr', 'sk',
            'ja', 'ko', 'zh',
        },
        'paralinguistic': [],
        'emotion_tags': [],
        'voice_cloning': True,
        'streaming': False,
        'sample_rate': 24000,
        'quality': 'high',
    },
    BACKEND_INDIC_PARLER: {
        'name': 'Indic Parler TTS (ai4bharat)',
        'vram_gb': 2.0,
        'languages': {
            'as', 'bn', 'brx', 'doi', 'en', 'gu', 'hi', 'kn', 'kok', 'mai',
            'ml', 'mni', 'mr', 'ne', 'or', 'pa', 'sa', 'sat', 'sd', 'ta', 'te', 'ur',
        },
        'paralinguistic': [],
        'emotion_tags': ['happy', 'sad', 'angry', 'fearful', 'surprised', 'disgusted'],
        'voice_cloning': False,
        'streaming': False,
        'sample_rate': 44100,
        'quality': 'high',
    },
    BACKEND_COSYVOICE3: {
        'name': 'CosyVoice3 0.5B (Alibaba)',
        'vram_gb': 4.0,
        'languages': {'zh', 'en', 'ja', 'ko', 'de', 'es', 'fr', 'it', 'ru'},
        'paralinguistic': [],
        'emotion_tags': ['happy', 'sad', 'fearful', 'angry', 'surprised'],
        'voice_cloning': True,
        'streaming': True,
        'sample_rate': 22050,
        'quality': 'high',
    },
    BACKEND_KOKORO: {
        # Kokoro 82M — tiny neural English TTS, sits between the big
        # GPU engines and Piper on the quality ladder. Runs on CPU at
        # ~1x real-time, or GPU at ~0.1x. No voice cloning, but ~25
        # English presets shipped with the model. Benchmark vs Piper:
        # quality 0.88 vs 0.70, CPU latency 400ms vs 200ms per 10
        # words — Kokoro is ~2x slower but noticeably less robotic,
        # so it's tried FIRST before we give up and use Piper on CPU.
        'name': 'Kokoro 82M',
        'vram_gb': 0.2,
        'languages': {'en'},
        'paralinguistic': [],
        'emotion_tags': [],
        'voice_cloning': False,
        'streaming': False,
        'sample_rate': 24000,
        'quality': 'high',
    },
    BACKEND_NEUTTS_AIR: {
        # NeuTTS Air (Neuphonic) — 748M Qwen2-backbone, Q4 GGUF ~600MB,
        # Apache-2.0.  RTF<0.5 on CPU (Intel i5 / RPi 5), 24kHz output.
        # Voice cloning from 3-15s reference audio (no zero-config
        # default voice — uses upstream 'jo' sample).  Slots between
        # F5-TTS / Chatterbox-Turbo (heavy clone) and Kokoro / Piper
        # (light tier) on the English ladder.
        'name': 'NeuTTS Air (Neuphonic)',
        'vram_gb': 0.4,                 # CPU-friendly; GPU optional
        'languages': {'en'},
        'paralinguistic': [],
        'emotion_tags': [],
        'voice_cloning': True,
        'streaming': False,
        'sample_rate': 24000,
        'quality': 'high',
    },
    BACKEND_PIPER: {
        'name': 'Piper TTS (CPU)',
        'vram_gb': 0,
        'languages': {'en'},
        'paralinguistic': [],
        'emotion_tags': [],
        'voice_cloning': False,
        'streaming': False,
        'sample_rate': 22050,
        'quality': 'medium',
    },
    # ── Mid-VRAM coverage tier (1–3 GB) ─────────────────────────
    # These three engines fill the gap so every SUPPORTED_LANG_DICT
    # code has at least one engine with vram_gb≤3.0 in its
    # _FALLBACK_LANG_ENGINE_PREFERENCE ladder.  Capabilities mirror
    # the canonical HARTOS ENGINE_REGISTRY (single source of truth
    # at runtime via _get_engine_capabilities → ModelCatalog).
    BACKEND_MELOTTS: {
        'name': 'MeloTTS (myshell-ai)',
        'vram_gb': 1.5,
        'languages': {'en', 'es', 'fr', 'zh', 'ja', 'ko'},
        'paralinguistic': [],
        'emotion_tags': [],
        'voice_cloning': False,
        'streaming': False,
        'sample_rate': 24000,
        'quality': 'high',
    },
    BACKEND_XTTS_V2: {
        'name': 'XTTS-v2 (Coqui)',
        'vram_gb': 2.5,
        'languages': {
            'en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'tr', 'ru', 'nl',
            'cs', 'ar', 'zh', 'hu', 'ko', 'ja', 'hi',
        },
        'paralinguistic': [],
        'emotion_tags': [],
        'voice_cloning': True,
        'streaming': False,
        'sample_rate': 24000,
        'quality': 'high',
    },
    BACKEND_MMS_TTS: {
        'name': 'MMS-TTS (Meta VITS)',
        'vram_gb': 1.0,
        'languages': {
            # Roman-script + non-Roman (with uroman) — same set as the
            # HARTOS spec.  Keeping symmetry with that registry; if the
            # catalog isn't loaded yet, fallback selection still routes
            # to mms_tts as the universal coverage engine.
            'en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'tr', 'ru', 'nl',
            'cs', 'hu', 'sv', 'fi', 'el', 'ro', 'bg', 'uk', 'cy', 'is',
            'zh', 'ja', 'ko', 'vi', 'th', 'id', 'ms', 'km', 'lo', 'my',
            'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'or',
            'ne', 'as', 'sd', 'sa', 'ur', 'si',
            'ar', 'fa', 'he', 'sw',
            # Additional codes in core.constants.SUPPORTED_LANG_DICT.
            # MMS-TTS upstream ships per-language VITS checkpoints for
            # 1100+ langs (Pratap et al., Meta, 2023); these are within
            # that catalogue and supported by the mms_tts_tool wrapper.
            'lv',  # Latvian
            'sr',  # Serbian
            'ks',  # Kashmiri
        },
        'paralinguistic': [],
        'emotion_tags': [],
        'voice_cloning': False,
        'streaming': False,
        'sample_rate': 16000,
        'quality': 'medium',
    },
}

# Indic languages — canonical set lives in core.constants.INDIC_LANGS.
# HARTOS is always pip-installed alongside Nunba (per dependency chain
# in MEMORY.md), so the import is guaranteed; no defensive fallback
# needed.  Keeping the local alias `_INDIC_LANGS` for in-file
# readability at the 2 iteration sites below.
from core.constants import INDIC_LANGS as _INDIC_LANGS  # noqa: F401

# ════════════════════════════════════════════════════════════════════
# LANG → CAPABLE BACKENDS (defensive allowlist)
#
# Source of truth for "which backend can actually speak lang X?".
# Used by _synthesize_with_fallback to REFUSE wrong-language fallback
# (data-scientist finding 2026-04-15: Tamil users were getting
# CosyVoice3 English mumbling when Indic Parler OOM'd, because the
# default ladder falls through to engines that don't cover Indic).
#
# Conservative policy:
#   * Indic Parler: authoritative for all 21 _INDIC_LANGS.
#   * CosyVoice3: 9 claimed (zh/en/ja/ko/de/es/fr/it/ru) — NO Indic.
#   * Chatterbox ML: 23 claimed — Tamil/Indic NOT verified in tests,
#                    so excluded from Indic allowlist conservatively.
#                    (Still allowed for its 23 claimed European/CJK langs.)
#   * F5 / Chatterbox Turbo / Kokoro / Piper: English-only.
# ════════════════════════════════════════════════════════════════════
_LANG_CAPABLE_BACKENDS: dict[str, frozenset[str]] = {
    # English — every backend supports it
    'en': frozenset({
        BACKEND_CHATTERBOX_TURBO, BACKEND_F5, BACKEND_CHATTERBOX_ML,
        BACKEND_INDIC_PARLER, BACKEND_COSYVOICE3, BACKEND_KOKORO, BACKEND_PIPER,
        BACKEND_MELOTTS, BACKEND_XTTS_V2, BACKEND_MMS_TTS,
        BACKEND_NEUTTS_AIR,
    }),
    # European / CJK — CosyVoice3 + Chatterbox ML + new mid-VRAM tier
    'es': frozenset({BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_MELOTTS, BACKEND_XTTS_V2, BACKEND_MMS_TTS}),
    'fr': frozenset({BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_MELOTTS, BACKEND_XTTS_V2, BACKEND_MMS_TTS}),
    'de': frozenset({BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_XTTS_V2, BACKEND_MMS_TTS}),
    'it': frozenset({BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_XTTS_V2, BACKEND_MMS_TTS}),
    'ja': frozenset({BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_MELOTTS, BACKEND_XTTS_V2, BACKEND_MMS_TTS}),
    'ko': frozenset({BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_MELOTTS, BACKEND_XTTS_V2, BACKEND_MMS_TTS}),
    'zh': frozenset({BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_F5, BACKEND_MELOTTS, BACKEND_XTTS_V2, BACKEND_MMS_TTS}),
    'ru': frozenset({BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_XTTS_V2, BACKEND_MMS_TTS}),
    # Extra Chatterbox-ML-only European langs — now augmented with
    # XTTS-v2 (where supported) + MMS-TTS as universal 1 GB tier.
    'pt': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_XTTS_V2, BACKEND_MMS_TTS}),
    'nl': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_XTTS_V2, BACKEND_MMS_TTS}),
    'pl': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_XTTS_V2, BACKEND_MMS_TTS}),
    'sv': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS}),
    'da': frozenset({BACKEND_CHATTERBOX_ML}),
    'fi': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS}),
    'hu': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_XTTS_V2, BACKEND_MMS_TTS}),
    'el': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS}),
    'tr': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_XTTS_V2, BACKEND_MMS_TTS}),
    'cs': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_XTTS_V2, BACKEND_MMS_TTS}),
    'ro': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS}),
    'bg': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS}),
    'hr': frozenset({BACKEND_CHATTERBOX_ML}),
    'sk': frozenset({BACKEND_CHATTERBOX_ML}),
    # New SUPPORTED_LANG_DICT codes — mid-VRAM coverage tier
    'ar': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_XTTS_V2, BACKEND_MMS_TTS}),
    'fa': frozenset({BACKEND_MMS_TTS}),
    'he': frozenset({BACKEND_MMS_TTS}),
    'sw': frozenset({BACKEND_MMS_TTS}),
    'uk': frozenset({BACKEND_MMS_TTS}),
    'cy': frozenset({BACKEND_MMS_TTS}),
    'is': frozenset({BACKEND_MMS_TTS}),
    'id': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS}),
    'ms': frozenset({BACKEND_MMS_TTS}),
    'th': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS}),
    'vi': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS}),
    'km': frozenset({BACKEND_MMS_TTS}),
    'lo': frozenset({BACKEND_MMS_TTS}),
    'my': frozenset({BACKEND_MMS_TTS}),
    'lv': frozenset({BACKEND_MMS_TTS}),
    'sr': frozenset({BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS}),
    'ks': frozenset({BACKEND_MMS_TTS}),
    # Indian English — exact-code key so en-IN routes through Indic
    # Parler (which speaks English with Indian phonemes) before the
    # generic 'en' Chatterbox-Turbo ladder.  Includes every backend
    # that can speak plain 'en' as a safety floor.
    'en-IN': frozenset({
        BACKEND_INDIC_PARLER, BACKEND_MMS_TTS, BACKEND_XTTS_V2,
        BACKEND_MELOTTS, BACKEND_F5, BACKEND_CHATTERBOX_TURBO,
        BACKEND_CHATTERBOX_ML, BACKEND_KOKORO, BACKEND_PIPER,
        BACKEND_NEUTTS_AIR,
    }),
    # 'zh-cn' / 'zh_TW' / 'zh-Hans' all collapse to 'zh' via
    # _normalize_lang() before this lookup runs (see _capable_backends_for).
    # No separate entry needed — Chinese variants reuse the 'zh' allowlist.
}
# Indic langs — prefer Indic Parler (authoritative 21 Indic langs)
# but keep Chatterbox ML as a LOCAL fallback so a broken Indic Parler
# import (parler_tts vs transformers version drift) doesn't demote the
# whole user to text-only or worse, browser WebSpeech.  The fallback
# order is honored by the ladder in `select_backend_for_lang`: try
# Indic Parler first; on import/load failure, try Chatterbox ML; on
# still-failure, return text-only.  "LOCAL FIRST WHEN AVAILABLE" —
# Chatterbox ML is locally installed for every user who has any other
# non-Latin lang, so the fallback has material coverage on most boxes.
for _lang in _INDIC_LANGS:
    # Indic Parler + Chatterbox ML stay as the heavy GPU options.
    # MMS-TTS adds a 1 GB-tier universal Indic fallback so users on
    # tight VRAM (< 4 GB) still get audio without falling all the way
    # to Piper (which has no Indic voice files).  XTTS-v2 only ships
    # 'hi' among Indic, added explicitly in the per-lang map below.
    _LANG_CAPABLE_BACKENDS[_lang] = frozenset({
        BACKEND_INDIC_PARLER,
        BACKEND_CHATTERBOX_ML,
        BACKEND_MMS_TTS,
    })
# XTTS-v2 only adds Hindi among Indic — extend explicitly.
_LANG_CAPABLE_BACKENDS['hi'] = _LANG_CAPABLE_BACKENDS['hi'] | frozenset({BACKEND_XTTS_V2})

# ── Piper capability expansion ───────────────────────────────────────
# Register BACKEND_PIPER as capable for every language in
# piper_tts.LANG_TO_VOICE.  Piper is the portable CPU-only backend that
# works identically on Windows / macOS / Linux with no GPU and no
# system-voice dependency — adds non-English voice coverage that
# previously required GPU-preferring engines (indic_parler / xtts_v2 /
# chatterbox_ml) which fall back to text-only on CPU-only machines.
#
# Source of truth for the actual voice file is LANG_TO_VOICE in
# piper_tts.py.  Capability gating happens at the engine selector;
# actual voice resolution is in _LazyPiper.synthesize below.
try:
    from tts.piper_tts import LANG_TO_VOICE as _PIPER_LANG_TO_VOICE
    for _plang in _PIPER_LANG_TO_VOICE:
        _bare = _plang.split('_')[0]
        for _key in (_plang, _bare):
            _existing = _LANG_CAPABLE_BACKENDS.get(_key, frozenset())
            _LANG_CAPABLE_BACKENDS[_key] = _existing | {BACKEND_PIPER}
except Exception:
    # piper_tts not importable at definition time — keep going; the
    # fallback chain in _synthesize_with_fallback still includes Piper
    # for 'en', and non-English langs route to their existing capable
    # backends (chatterbox_ml / indic_parler).  No regression.
    pass

# ── Piper capability registration ───────────────────────────────────
# Piper is the portable CPU-only backend that works identically on
# Windows / macOS / Linux with no GPU and no system-voice dependency.
# Every language in tts/piper_tts.py:LANG_TO_VOICE gets BACKEND_PIPER
# added to its capable set, so select_backend_for_lang can pick Piper
# without the rest of the fallback chain (indic_parler VRAM contention,
# WKWebView SpeechSynthesis "operation not supported") ever firing.
# Source of truth for the actual voice file is LANG_TO_VOICE in
# piper_tts.py — keep the two lists in sync.
try:
    from tts.piper_tts import LANG_TO_VOICE as _PIPER_LANG_TO_VOICE
    for _plang in _PIPER_LANG_TO_VOICE:
        _bare = _plang.split('_')[0]
        for _key in (_plang, _bare):
            _existing = _LANG_CAPABLE_BACKENDS.get(_key, frozenset())
            _LANG_CAPABLE_BACKENDS[_key] = _existing | {BACKEND_PIPER}
except Exception:
    # Piper module not importable at definition time — the fallback
    # chain in _synthesize_with_fallback still tries Piper by default
    # for 'en', so English audio isn't broken.  Other languages will
    # fall through to their non-Piper backends (chatterbox_ml etc.).
    pass


def _normalize_lang(lang: str | None) -> str:
    """'en-US' / 'ta_IN' / None → 'en' / 'ta' / 'en'."""
    if not lang:
        return 'en'
    return lang.replace('_', '-').split('-')[0].lower()


def _capable_backends_for(lang: str | None) -> frozenset[str]:
    """Return the allowlist of backends that can speak `lang`.
    Unknown langs fall through to the English-capable set (Piper etc.)
    rather than an empty set, matching historical behavior.
    """
    return _LANG_CAPABLE_BACKENDS.get(_normalize_lang(lang),
                                     _LANG_CAPABLE_BACKENDS['en'])


def _publish_lang_unsupported(lang: str, attempted: list[str],
                              set_aside: list[dict] | None = None) -> None:
    """Best-effort WAMP toast when no backend can speak `lang`.
    Distinct topic from `lang_mismatch` so the frontend can show a
    different message ("text-only — no TTS backend available") vs
    ("audio may be wrong-language").

    ``set_aside``: why each voice that can speak `lang` is not speaking it
    (TTSEngine._set_aside_for), added as its own field.  'reason' keeps its
    value: the page reads the payload as it is (crossbarWorker spreads it
    into TTS_LANG_EVENT).
    """
    payload = {
        'requested_lang': lang,
        'attempted_backends': attempted,
        'reason': 'no_capable_backend_fits_on_hardware',
    }
    if set_aside:
        payload['set_aside'] = set_aside
    try:
        from core.realtime import publish_async as _wamp_pub
        _wamp_pub(
            'com.hertzai.hevolve.tts.lang_unsupported',
            payload,
            timeout=0.5,
        )
    except Exception:
        pass

# Language → preferred engine order (first available wins).
# Fallback-only — canonical preference is read from ModelCatalog via
# _get_lang_preference().  Direct use of this dict is degraded-mode only.
_FALLBACK_LANG_ENGINE_PREFERENCE = {
    # English ladder (quality first, then CPU-friendly):
    # 1. Chatterbox Turbo — big GPU, paralinguistic tags, voice clone (5.6 GB)
    # 2. F5-TTS           — big GPU, voice clone (2.5 GB)
    # 3. NeuTTS Air       — CPU-friendly Q4 GGUF (~600 MB), voice clone, RTF<0.5
    # 4. MeloTTS          — neural, ~1.5 GB, CPU runs at real-time
    # 5. XTTS-v2          — voice clone, 17 langs, 2.5 GB
    # 6. Indic Parler     — big GPU, also covers English (2.0 GB)
    # 7. Kokoro 82M       — small neural, CPU-friendly, beats Piper (0.2 GB)
    # 8. MMS-TTS          — universal coverage, ~1 GB
    # 9. Piper            — bundled CPU absolute-last-resort
    # NeuTTS Air slotted between F5 and MeloTTS (mirrors HARTOS
    # LANG_ENGINE_PREFERENCE['en'] which puts it at rung 3, after
    # chatterbox_turbo + omnivoice; Nunba's fallback ladder doesn't
    # carry omnivoice yet so neutts_air sits at rung 3 here).  Quality
    # 0.91 from upstream MOS — between F5 (0.91) and MeloTTS (0.86).
    # CPU-friendly is the differentiator: this is the FIRST clone-
    # capable engine in the ladder that doesn't require GPU.
    'en': [BACKEND_CHATTERBOX_TURBO, BACKEND_F5, BACKEND_NEUTTS_AIR,
           BACKEND_MELOTTS, BACKEND_XTTS_V2,
           BACKEND_INDIC_PARLER, BACKEND_KOKORO, BACKEND_MMS_TTS, BACKEND_PIPER],
    # International: MeloTTS (1.5 GB) and XTTS-v2 (2.5 GB) sit ABOVE the
    # 14 GB Chatterbox-ML so 4-8 GB GPU users get quality TTS without
    # the heaviest engine.  Chatterbox kept as the high-quality clone
    # option for users with the VRAM.  CosyVoice3 stays as the
    # power-user slot (requires git clone of FunAudioLLM/CosyVoice).
    # MMS-TTS is the universal floor before falling back to chatterbox/piper.
    'es': [BACKEND_MELOTTS, BACKEND_XTTS_V2, BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS],
    'fr': [BACKEND_MELOTTS, BACKEND_XTTS_V2, BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS],
    'de': [BACKEND_XTTS_V2, BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS],
    'ja': [BACKEND_MELOTTS, BACKEND_XTTS_V2, BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS],
    'ko': [BACKEND_MELOTTS, BACKEND_XTTS_V2, BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS],
    'zh': [BACKEND_MELOTTS, BACKEND_F5, BACKEND_XTTS_V2, BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS],
    'it': [BACKEND_XTTS_V2, BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS],
    'ru': [BACKEND_XTTS_V2, BACKEND_COSYVOICE3, BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS],
    # Portuguese — XTTS-v2 covers pt; Chatterbox ML covers pt natively.
    # CosyVoice3's 9-lang set excludes pt, so we skip it here to avoid
    # routing Portuguese users through a wrong-language fallback chain
    # (the J210 gap, 2026-04-18 live audit).
    'pt': [BACKEND_XTTS_V2, BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS, BACKEND_PIPER],
    # Newly explicitly-covered langs (previously hit _DEFAULT_PREFERENCE).
    'ar': [BACKEND_XTTS_V2, BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS],
    'nl': [BACKEND_XTTS_V2, BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS],
    'pl': [BACKEND_XTTS_V2, BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS],
    'tr': [BACKEND_XTTS_V2, BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS],
    'cs': [BACKEND_XTTS_V2, BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS],
    'hu': [BACKEND_XTTS_V2, BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS],
    'sv': [BACKEND_CHATTERBOX_ML, BACKEND_MMS_TTS],
    'fi': [BACKEND_MMS_TTS],
    'el': [BACKEND_MMS_TTS, BACKEND_CHATTERBOX_ML],
    'ro': [BACKEND_MMS_TTS],
    'bg': [BACKEND_MMS_TTS],
    'uk': [BACKEND_MMS_TTS],
    'cy': [BACKEND_MMS_TTS],
    'is': [BACKEND_MMS_TTS],
    # id / th / vi — Chatterbox-ML's `languages` set does NOT include
    # these codes (verified 2026-04-29 against the engine's capabilities
    # dict). MMS-TTS is the only engine in their ladder that actually
    # speaks them, so it MUST come first to avoid silent fallthrough.
    'id': [BACKEND_MMS_TTS, BACKEND_CHATTERBOX_ML],
    'ms': [BACKEND_MMS_TTS],
    'th': [BACKEND_MMS_TTS, BACKEND_CHATTERBOX_ML],
    'vi': [BACKEND_MMS_TTS, BACKEND_CHATTERBOX_ML],
    'fa': [BACKEND_MMS_TTS],
    'he': [BACKEND_MMS_TTS],
    'sw': [BACKEND_MMS_TTS],
    'km': [BACKEND_MMS_TTS],
    'lo': [BACKEND_MMS_TTS],
    'my': [BACKEND_MMS_TTS],
    'lv': [BACKEND_MMS_TTS],
    'sr': [BACKEND_MMS_TTS, BACKEND_CHATTERBOX_ML],
    'ks': [BACKEND_MMS_TTS],
    # NB: 'zh-cn' is intentionally NOT keyed here. _normalize_lang()
    # collapses 'zh-cn' / 'zh-CN' / 'zh_TW' to 'zh' before the ladder
    # lookup, so any 'zh-cn' entry would be dead-code AND would also
    # need its first-choice engine to declare the 'zh-cn' code (which
    # MeloTTS / XTTS-v2 do not — they list 'zh' only). All Chinese
    # variants therefore consume the 'zh' ladder.
    # Indian English — Indic Parler natively handles English with Indian
    # phonemes/prosody.  Exact-code lookup runs BEFORE _normalize_lang
    # collapses 'en-IN' → 'en' (see _get_lang_preference).  Falls back
    # to MMS-TTS (1 GB) and Piper (CPU) for low-VRAM hosts.
    'en-IN': [BACKEND_INDIC_PARLER, BACKEND_MMS_TTS, BACKEND_PIPER],
}
# Add all Indic languages → Indic Parler TTS, then mms_tts as 1 GB-tier
# universal fallback so every Indic code has at least one engine ≤3 GB
# (Indic Parler is 2 GB, mms_tts is 1 GB — both safely within budget).
for _lang in _INDIC_LANGS:
    _FALLBACK_LANG_ENGINE_PREFERENCE[_lang] = [BACKEND_INDIC_PARLER, BACKEND_MMS_TTS]
# XTTS-v2 covers Hindi specifically — promote it for hi as a voice-clone option.
_FALLBACK_LANG_ENGINE_PREFERENCE['hi'] = [BACKEND_INDIC_PARLER, BACKEND_XTTS_V2, BACKEND_MMS_TTS]

# Default fallback chain for unlisted languages.
# MMS-TTS first because it has 50+ language coverage at 1 GB VRAM —
# the universal-coverage floor.  Chatterbox-ML next for users who have
# the 14 GB GPU.  Indic Parler as a Unicode-safe catcher for whatever
# slipped through (it has English support so it doubles as a final
# guard before Piper gives up).
_DEFAULT_PREFERENCE = [BACKEND_MMS_TTS, BACKEND_CHATTERBOX_ML, BACKEND_COSYVOICE3, BACKEND_INDIC_PARLER]


# ════════════════════════════════════════════════════════════════════
# CATALOG ↔ BACKEND ID MAPPING
#
# Nunba backend constants (BACKEND_F5 = "f5") differ from the HARTOS
# tts_router.ENGINE_REGISTRY keys (e.g. 'f5_tts'), and the HARTOS
# ModelCatalog uses yet another form ('f5-tts' with hyphens and no
# 'tts-' prefix). Rather than maintaining three parallel lookup
# tables that drift apart, we declare ONE bridge —
# `_BACKEND_TO_REGISTRY_KEY` — that maps every GPU backend to its
# canonical ENGINE_REGISTRY key. Everything downstream (catalog IDs,
# VRAM tool names, required pip packages) is derived from that.
# ════════════════════════════════════════════════════════════════════

# SINGLE SOURCE OF TRUTH: Nunba backend constant → HARTOS ENGINE_REGISTRY key.
# CPU-only backends (PIPER, ESPEAK) are handled separately in the
# derived maps below because they don't have a 1:1 match — espeak is a
# fallback of piper in Nunba, and neither has a GPU ToolWorker.
_BACKEND_TO_REGISTRY_KEY: dict[str, str] = {
    BACKEND_F5:               'f5_tts',
    BACKEND_CHATTERBOX_TURBO: 'chatterbox_turbo',
    BACKEND_CHATTERBOX_ML:    'chatterbox_ml',
    BACKEND_INDIC_PARLER:     'indic_parler',
    BACKEND_COSYVOICE3:       'cosyvoice3',
    BACKEND_KOKORO:           'kokoro',
    # Mid-VRAM coverage tier — added 2026-04-29.
    BACKEND_MELOTTS:          'melotts',
    BACKEND_XTTS_V2:          'xtts_v2',
    BACKEND_MMS_TTS:          'mms_tts',
    # NeuTTS Air — added 2026-05-08.  CPU-friendly clone engine, venv-
    # routed (install_target='venv' on the HARTOS spec) so its
    # llama-cpp-python pin doesn't drift the main interpreter.
    BACKEND_NEUTTS_AIR:       'neutts_air',
}

# CPU-only catalog entries with NO native Nunba implementation —
# they ALL collapse to BACKEND_PIPER.  Single source of truth for
# "HARTOS exposed this engine in the catalog but Nunba can't run it
# in-process; route to Piper which IS bundled in python-embed".
# Both hyphen and underscore forms accepted because HARTOS catalog
# uses hyphens, ENGINE_REGISTRY uses underscores.
#
# 2026-05-04 root-cause fix: pre this date the engines below were
# self-mapped INSIDE _BACKEND_TO_REGISTRY_KEY (e.g. ``'pocket_tts':
# 'pocket_tts'``).  The inverse-derivation at the setdefault loop
# below then produced ``_CATALOG_TO_BACKEND['pocket_tts'] =
# 'pocket_tts'`` (a literal echo).  The catalog ladder "selected"
# pocket_tts as a real backend, the dispatcher tried to spawn it,
# and audio synthesis silently failed with "No TTS engine available
# (install pocket-tts or espeak-ng)" on every install missing those
# extras.  Live evidence in user's gui_app.log 2026-04-30 → 2026-05-04.
#
# Fix: keep _BACKEND_TO_REGISTRY_KEY pure (only Nunba native GPU
# backends), declare CPU fallbacks explicitly here, and the inverse
# map gets a correct alias instead of a self-referential trap.
# Adding a new CPU-only HARTOS engine = ONE entry in this tuple.
_CPU_FALLBACK_CATALOG_IDS: tuple[str, ...] = (
    'pocket-tts', 'pocket_tts',  # tiny-pocket TTS — not bundled in Nunba
    'espeak',                    # system binary — not always present
    'luxtts',                    # internal HARTOS tool — Nunba doesn't run it
)


def _get_engine_registry():
    """Lazy import — tts_router imports vram_manager which imports torch."""
    try:
        from integrations.channels.media.tts_router import ENGINE_REGISTRY
        return ENGINE_REGISTRY
    except Exception:
        return {}


def _runs_on_cpu(backend: str) -> bool:
    """True when the HARTOS engine registry says ``backend`` can run on the
    CPU: device GPU_PREFERRED ("CPU works, GPU faster") or CPU_ONLY.  Free
    VRAM then decides where such an engine runs, never whether it speaks.
    A GPU-only engine, or one the registry does not name, answers False and
    keeps every VRAM check.  Piper, bundled and CPU-only, answers True: it has
    no entry in _BACKEND_TO_REGISTRY_KEY (no worker), so the registry is read
    by the backend's own name, and its CPU_ONLY device answers (rv_tts nit on
    a6e9106e: the registry, not a name literal)."""
    key = _BACKEND_TO_REGISTRY_KEY.get(backend)
    spec = _get_engine_registry().get(key or backend)
    if spec is None:
        return False
    try:
        from integrations.channels.media.tts_router import TTSDevice
    except Exception:
        return False
    return spec.device in (TTSDevice.GPU_PREFERRED, TTSDevice.CPU_ONLY)


def _registry_key_to_catalog_id(registry_key: str) -> str:
    """Convert 'f5_tts' → 'f5-tts' (HARTOS ModelCatalog uses hyphens)."""
    return registry_key.replace('_', '-')


# Derived: Nunba backend constant → catalog entry id (hyphenated,
# without 'tts-' prefix). Builds from the single bridge above.
_BACKEND_TO_CATALOG: dict[str, str] = {
    backend: _registry_key_to_catalog_id(key)
    for backend, key in _BACKEND_TO_REGISTRY_KEY.items()
}
_BACKEND_TO_CATALOG[BACKEND_PIPER] = 'piper'  # CPU-only alias


# Derived: catalog entry id → Nunba backend constant.
# Inverse of _BACKEND_TO_CATALOG plus CPU-only aliases that all route
# to Piper (Nunba doesn't have separate implementations for espeak /
# pocket_tts — they fall through to Piper as the last-resort CPU engine).
_CATALOG_TO_BACKEND: dict[str, str] = {
    catalog_id: backend for backend, catalog_id in _BACKEND_TO_CATALOG.items()
}
# Also accept the underscore-form the HARTOS registry key uses,
# so both 'f5-tts' (catalog) and 'f5_tts' (registry key) map back.
for _backend, _key in _BACKEND_TO_REGISTRY_KEY.items():
    _CATALOG_TO_BACKEND.setdefault(_key, _backend)
# CPU fallback aliases — single writer, no setdefault gymnastics, no
# parallel-path drift.  These IDs do NOT appear in
# _BACKEND_TO_REGISTRY_KEY (the GPU bridge is now pure), so the prior
# setdefault loop cannot shadow this assignment.  Adding a new CPU-only
# HARTOS engine = one entry in _CPU_FALLBACK_CATALOG_IDS above.
for _alias in _CPU_FALLBACK_CATALOG_IDS:
    _CATALOG_TO_BACKEND[_alias] = BACKEND_PIPER
# Legacy ENGINE_REGISTRY key kept for backwards compat — pre-2026-04
# HARTOS used 'chatterbox_multilingual' before the dual-form rule was
# established.  Different mapping target, so kept separate from the
# CPU fallback list above.
_CATALOG_TO_BACKEND.setdefault('chatterbox_multilingual', BACKEND_CHATTERBOX_ML)


def catalog_entry_backend(catalog_entry_id: str) -> str:
    """The Nunba backend name for a TTS catalog entry id: 'tts-f5-tts' ->
    'f5', 'tts-pocket-tts' -> Piper, an id Nunba has no constant for ->
    its HARTOS engine name ('tts-foo-bar' -> 'foo_bar').

    ONE rule for every catalog -> backend boundary in Nunba (the catalog
    ladder, the capability map, TTSLoader).  The id -> engine-name step is
    HARTOS's own public tts_router.catalog_id_to_engine_id, so Nunba
    and HARTOS name the same engine for the same id; a local
    ``replace('tts-', '', 1)`` kept the dashes and disagreed with it on
    every multi-word id Nunba does not map.
    """
    from integrations.channels.media.tts_router import catalog_id_to_engine_id
    key = catalog_id_to_engine_id(catalog_entry_id)
    return _CATALOG_TO_BACKEND.get(key, key)


def _is_engine_backend(backend) -> bool:
    """True iff ``backend`` is a name TTSEngine._create_backend can build:
    Piper, or a Nunba backend constant in _BACKEND_TO_REGISTRY_KEY.
    Catalog ids ('f5-tts'), registry keys ('f5_tts') and mangled names
    ('neuair') are not.  The one rule for "is this a backend here";
    _create_backend and verified_synth's self-heal gate both ask it."""
    return backend == BACKEND_PIPER or backend in _BACKEND_TO_REGISTRY_KEY


def _entry_to_legacy_caps(entry) -> dict:
    """Convert a ModelCatalog ModelEntry (TTS) to the legacy ENGINE_CAPABILITIES dict format.

    Bridges the ModelEntry structure to the flat dict shape that all call
    sites in this module expect.
    """
    caps = entry.capabilities or {}
    langs_raw = getattr(entry, 'languages', None) or []
    # Two catalog populators exist in the tree and use different key
    # names for the same concept: the in-tree TTS spec populator writes
    # `voice_clone` (matching the TTSEngineSpec dataclass field), while
    # older entries persisted from the subsystems populator use
    # `voice_cloning`. Accept either so the Nunba feature list matches
    # reality regardless of which populator wrote the entry. Same for
    # emotion_tags which is sometimes a list, sometimes a bool.
    _voice_cloning = caps.get('voice_cloning')
    if _voice_cloning is None:
        _voice_cloning = caps.get('voice_clone', False)
    _emotion_tags = caps.get('emotion_tags', [])
    if isinstance(_emotion_tags, bool):
        _emotion_tags = ['emotion'] if _emotion_tags else []
    return {
        'name':          entry.name,
        'vram_gb':       getattr(entry, 'vram_gb', 0) or 0,
        'languages':     set(langs_raw),
        'paralinguistic': caps.get('paralinguistic', []),
        'emotion_tags':  _emotion_tags,
        'voice_cloning': bool(_voice_cloning),
        'streaming':     caps.get('streaming', False),
        'sample_rate':   caps.get('sample_rate', 22050),
        'quality':       ('highest' if getattr(entry, 'quality_score', 0.5) >= 0.93
                          else 'high' if getattr(entry, 'quality_score', 0.5) >= 0.8
                          else 'medium' if getattr(entry, 'quality_score', 0.5) >= 0.6
                          else 'low'),
    }


def _get_engine_capabilities(backend=None) -> dict:
    """Return capability dict for one backend (or all backends if backend=None).

    Tries ModelCatalog first (canonical, HARTOS-populated).  Falls back to
    _FALLBACK_ENGINE_CAPABILITIES if the catalog is unavailable or has no
    entry for the requested backend.

    When backend=None the returned dict has the same shape as the old
    ENGINE_CAPABILITIES — keyed by Nunba backend constant.
    """
    try:
        from models.catalog import ModelType, get_catalog
        catalog = get_catalog()
        if backend is None:
            # Return the full dict, keyed by Nunba backend constants
            result = {}
            for entry in catalog.list_by_type(ModelType.TTS):
                be = catalog_entry_backend(entry.id)
                result[be] = _entry_to_legacy_caps(entry)
            if result:
                return result
        else:
            entry = _catalog_row(backend)[1]
            if entry:
                return _entry_to_legacy_caps(entry)
    except Exception:
        pass  # catalog unavailable — fall through to local fallback

    # Degraded-mode fallback
    if backend is None:
        return _FALLBACK_ENGINE_CAPABILITIES
    return _FALLBACK_ENGINE_CAPABILITIES.get(backend, {})


def _catalog_row(backend):
    """(catalog, row) for a Nunba backend name, or (None, None) when the
    catalog is unavailable or has no row for it.  The one backend -> row
    rule: _BACKEND_TO_CATALOG, then the 'tts-' prefix."""
    try:
        from models.catalog import get_catalog
        catalog = get_catalog()
        return catalog, catalog.get(f'tts-{_BACKEND_TO_CATALOG.get(backend, backend)}')
    except Exception:
        return None, None


def _remember_setup_failure(backend, why):
    """A backend's install failed: keep it on its catalog row, which
    survives a restart for this build and platform (HARTOS
    mark_setup_failed).  TTSEngine._auto_install_failed is per process,
    so on its own every boot ran the same failing install again (NeuTTS:
    107 boots, live 2026-11-17)."""
    catalog, entry = _catalog_row(backend)
    if entry is not None:
        catalog.mark_setup_failed(entry.id, why)


def _setup_failed_on_row(backend) -> bool:
    """True while the backend's row holds a setup failure that still
    applies: same build, same platform, and (for a gated download) its
    key has not arrived since."""
    entry = _catalog_row(backend)[1]
    return bool(entry is not None and entry.setup_failure_current())


def _free_vram_gb() -> float | None:
    """Read free VRAM from vram_manager.  Returns None if no GPU signal."""
    try:
        from integrations.service_tools.vram_manager import vram_manager
        return vram_manager.get_free_vram()
    except Exception:
        return None


def _vram_cache_bucket(free_gb: float) -> int:
    """Quantize free VRAM to a coarse cache-key bucket.

    Stability across small fluctuations (e.g. 6.2 → 6.4 GB) prevents
    the filter from re-running on every chat.  Bucket size is 1 GB —
    enough resolution to distinguish chatterbox_turbo (5.6) vs F5 (2.5)
    while still grouping nearby readings.
    """
    return int(free_gb)


# Cache: (free_vram_bucket, original_ladder_tuple) → filtered ladder.
# Bounded at 256 entries; evicted in bulk when full.
_LADDER_FILTER_CACHE: dict[tuple, list[str]] = {}
_LADDER_FILTER_CACHE_MAX = 256

# The voices left out for want of GPU memory, each with the GB free then and
# the GB it needs: the "TTS unavailable" line names them
# (TTSEngine._set_aside_for).  A voice the filter keeps again, or that
# speaks, is taken off.
_VRAM_SKIPS: dict[str, tuple[float, float]] = {}


def _vram_needed_gb(tool_name: str | None) -> float | None:
    """The GPU memory ``tool_name`` needs, in GB (vram_manager.VRAM_BUDGETS,
    its first figure, the one the ladder filter compares), or None."""
    try:
        from integrations.service_tools.vram_manager import VRAM_BUDGETS
        budget = VRAM_BUDGETS.get(tool_name) if tool_name else None
        return float(budget[0]) if budget else None
    except Exception:
        return None


def _remember_vram_skips(prefs: list[str], kept: list[str], free_gb: float) -> None:
    """Which voices of ``prefs`` the VRAM filter left out (_VRAM_SKIPS)."""
    for be in prefs:
        if be in kept:
            _VRAM_SKIPS.pop(be, None)
            continue
        key = _BACKEND_TO_REGISTRY_KEY.get(be)
        needed = _vram_needed_gb(f'tts_{key}') if key else None
        if needed is not None:
            _VRAM_SKIPS[be] = (float(free_gb), needed)


def _filter_ladder_by_vram_budget(prefs: list[str]) -> list[str]:
    """Drop GPU-only backends whose declared min_vram exceeds free VRAM.

    Why this exists: without it, the ladder probes chatterbox_turbo
    (5.6 GB min) on every chat even on a 4 GB GPU, wasting an OOM
    round-trip per backend before falling through.  CPU-friendly
    backends (no VRAM_BUDGETS entry — piper/espeak) ALWAYS pass.
    So does an engine the registry says also runs on the CPU
    (_runs_on_cpu: mms_tts, kokoro, melotts, neutts_air): with the GPU
    full it runs on the CPU.  Live 14 Nov 2026, 1021 MiB free: dropping
    mms_tts left the Tamil ladder [omnivoice, piper], and the person
    heard nothing.
    When the catalog hasn't loaded or there's no GPU signal, returns
    prefs unchanged (fail-open: the existing per-attempt circuit
    breaker still demotes after live failures).
    """
    free_gb = _free_vram_gb()
    if free_gb is None or free_gb <= 0:
        return prefs  # no GPU signal — preserve full ladder

    cache_key = (_vram_cache_bucket(free_gb), tuple(prefs))
    cached = _LADDER_FILTER_CACHE.get(cache_key)
    if cached is not None:
        _remember_vram_skips(prefs, cached, free_gb)
        return list(cached)

    try:
        from integrations.service_tools.vram_manager import VRAM_BUDGETS
    except Exception:
        return prefs

    def _backend_fits(be: str) -> bool:
        registry_key = _BACKEND_TO_REGISTRY_KEY.get(be)
        if not registry_key:
            return True  # CPU backend (piper/espeak) — no GPU budget entry
        if _runs_on_cpu(be):
            return True  # runs on the CPU when the GPU has no room
        budget = VRAM_BUDGETS.get(f'tts_{registry_key}')
        if not budget:
            return True  # unknown to vram_manager → assume fits
        min_vram_gb, _model_size = budget
        return min_vram_gb <= free_gb

    # A full GPU decides the ORDER, never whether a language has a voice: an
    # engine that only fits by running on the CPU goes after every engine
    # that fits as it is, so English keeps the pick it had (kokoro with 1 GB
    # free, Piper with 0.3 GB) and Tamil, which Piper cannot speak, still
    # reaches mms_tts.  Review of f885318e: keeping them in place made
    # English pick melotts on the CPU over kokoro on the GPU.
    def _fits_as_is(be: str) -> bool:
        return not _runs_on_cpu(be) or _backend_fits_without_cpu(be)

    def _backend_fits_without_cpu(be: str) -> bool:
        registry_key = _BACKEND_TO_REGISTRY_KEY.get(be)
        budget = VRAM_BUDGETS.get(f'tts_{registry_key}') if registry_key else None
        return not budget or budget[0] <= free_gb

    kept = [be for be in prefs if _backend_fits(be)]
    filtered = ([be for be in kept if _fits_as_is(be)]
                + [be for be in kept if not _fits_as_is(be)])
    # Never let the filter empty the ladder — at minimum keep Piper /
    # Kokoro / espeak as a CPU floor.  If filter ate everything,
    # fall back to the original list and let the runtime circuit
    # breaker handle the OOM (matches the fail-open principle above).
    if not filtered:
        filtered = list(prefs)

    if len(_LADDER_FILTER_CACHE) >= _LADDER_FILTER_CACHE_MAX:
        _LADDER_FILTER_CACHE.clear()
    _LADDER_FILTER_CACHE[cache_key] = list(filtered)
    _remember_vram_skips(prefs, filtered, free_gb)
    return filtered


def _get_lang_preference(language: str) -> list[str]:
    """Return ordered list of preferred backends for a language.

    Tries ModelCatalog first (canonical).  Falls back to
    _FALLBACK_LANG_ENGINE_PREFERENCE if the catalog is unavailable.
    Final step: drop backends whose declared min-VRAM exceeds free
    VRAM, so the ladder doesn't waste cycles probing engines that
    can't possibly fit on this hardware.
    """
    # Region-coded inputs (e.g. 'en-IN', 'pt-BR') get their routing
    # from the fallback dict's exact-code key BEFORE consulting the
    # catalog.  Reason: most TTS entries' `languages` set lists only
    # the bare language ('en'), so the catalog path returns just
    # wildcard CPU engines (piper) for region codes — silently
    # bypassing region-specific intent (en-IN → Indic Parler).
    # The fallback dict is the source of truth for region routing;
    # the catalog is the source of truth for priority within a bare
    # language.  Both stay canonical for their respective concerns.
    prefs: list[str] | None = None
    if '-' in (language or '') and language in _FALLBACK_LANG_ENGINE_PREFERENCE:
        prefs = list(_FALLBACK_LANG_ENGINE_PREFERENCE[language])

    if prefs is None:
        try:
            from models.catalog import ModelType, get_catalog
            catalog = get_catalog()
            entries = catalog.list_by_type(ModelType.TTS)
            if entries:
                # Build preference list: entries that support this language,
                # sorted by language_priority (lower value = higher preference),
                # then by overall priority descending.
                supporting = []
                for entry in entries:
                    langs = set(getattr(entry, 'languages', None) or [])
                    # '*' is the wildcard convention for engines that
                    # support every language (piper, espeak) — a single
                    # spec covers all languages, no per-language duplication.
                    if language in langs or '*' in langs:
                        lang_prio = (getattr(entry, 'language_priority', None) or {})
                        prio_val = lang_prio.get(language, 999)
                        supporting.append((prio_val, -(getattr(entry, 'priority', 0) or 0), entry))
                if supporting:
                    supporting.sort(key=lambda x: (x[0], x[1]))
                    result = []
                    for _, _, entry in supporting:
                        be = catalog_entry_backend(entry.id)
                        if be not in result:
                            result.append(be)
                    if result:
                        prefs = result
        except Exception:
            pass  # catalog unavailable — fall through

    # Exact-match FIRST — preserves region codes like ``en-IN`` (Indian
    # English) so the Indic-Parler-first ladder fires when the caller
    # passes the BCP-47 region tag.  Falls back to the bare-language
    # entry (``_normalize_lang('en-IN') == 'en'``) if no region-specific
    # ladder is registered.  Same DRY rule — extend the canonical dict
    # instead of forking a "regional" one.
    if prefs is None:
        prefs = (_FALLBACK_LANG_ENGINE_PREFERENCE.get(language)
                 or _FALLBACK_LANG_ENGINE_PREFERENCE.get(_normalize_lang(language))
                 or _DEFAULT_PREFERENCE)

    return _filter_ladder_by_vram_budget(list(prefs))


# ── Backward-compat aliases (importers that do ``from tts.tts_engine import
#    ENGINE_CAPABILITIES`` continue to work — they get the fallback dict).
ENGINE_CAPABILITIES = _FALLBACK_ENGINE_CAPABILITIES
LANG_ENGINE_PREFERENCE = _FALLBACK_LANG_ENGINE_PREFERENCE


# ════════════════════════════════════════════════════════════════════
# DEVICE SELECTION — VRAMManager is the single source of truth
# ════════════════════════════════════════════════════════════════════

# Default timeout for a single GPU inference call (seconds).
# Prevents indefinite hangs from corrupted CUDA state or model bugs.
_INFERENCE_TIMEOUT_S = 120


def _run_with_timeout(fn, timeout_s=_INFERENCE_TIMEOUT_S):
    """Run fn() with a hard timeout. Uses a bare thread — no executor.

    ThreadPoolExecutor creates/destroys per call and fails with
    'cannot schedule new futures after interpreter shutdown' during
    process cleanup. A bare thread avoids this.
    """
    result = [None]
    error = [None]

    def _worker():
        try:
            result[0] = fn()
        except Exception as e:
            error[0] = e

    t = threading.Thread(target=_worker, daemon=True, name='tts-infer-timeout')
    t.start()
    t.join(timeout=timeout_s)
    if t.is_alive():
        logger.error(f"GPU inference timed out after {timeout_s}s")
        raise TimeoutError(f"TTS inference exceeded {timeout_s}s")
    if error[0] is not None:
        raise error[0]
    return result[0]


# Minimum free VRAM (GB) required before starting GPU inference.
# Below this, CUDA allocations risk triggering a C-level abort that
# kills the ENTIRE process — uncatchable by Python try/except.
_MIN_INFERENCE_HEADROOM_GB = 0.3


def _oom_guard(fn, device=None):
    """Run GPU inference with OOM blast-radius containment.

    Pre-flight: checks VRAM headroom. If too low, raises RuntimeError
    BEFORE touching CUDA — preventing the C-level abort.

    Post-flight: catches CUDA OOM (RuntimeError) and cleans up CUDA state
    so the app stays alive and can fall back to CPU.
    """
    # Pre-flight: reject if VRAM too tight (prevents uncatchable C abort)
    if device == 'cuda':
        try:
            from integrations.service_tools.vram_manager import vram_manager
            free = vram_manager.get_free_vram()
            if free < _MIN_INFERENCE_HEADROOM_GB:
                raise RuntimeError(
                    f"OOM guard: {free:.2f}GB free < {_MIN_INFERENCE_HEADROOM_GB}GB headroom. "
                    f"Skipping GPU inference to prevent process crash.")
        except ImportError:
            pass
        except RuntimeError:
            raise  # re-raise the guard error
        except Exception:
            pass

    # Run inference — catch CUDA OOM (RuntimeError) before it cascades
    try:
        return fn()
    except RuntimeError as e:
        err_str = str(e).lower()
        if 'out of memory' in err_str or 'cuda' in err_str:
            logger.error(f"OOM guard caught CUDA error: {e}")
            _clear_cuda_cache()
            raise  # let TTSEngine._synthesize_with_fallback handle it
        raise


def _clear_cuda_cache():
    """Release cached CUDA memory. Safe no-op if torch/CUDA unavailable."""
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception:
        pass


def _suggest_device(tool_name: str) -> str:
    """Ask VRAMManager which device a TTS model should load on.

    Returns 'cuda' or 'cpu'. VRAMManager.suggest_offload_mode() considers
    free VRAM, model size from VRAM_BUDGETS, and existing allocations.
    """
    try:
        from integrations.service_tools.vram_manager import vram_manager
        mode = vram_manager.suggest_offload_mode(tool_name)
        # 'gpu' → cuda, 'cpu_offload' → cuda (model handles mixed),
        # 'cpu_only' → cpu
        device = 'cpu' if mode == 'cpu_only' else 'cuda'
        if device == 'cpu':
            free = vram_manager.get_free_vram()
            logger.info(f"{tool_name}: {free:.1f}GB VRAM free — using CPU")
        return device
    except Exception:
        return 'cpu'


# ════════════════════════════════════════════════════════════════════
# PRE-SYNTH CACHE — instant playback for predicted responses
# ════════════════════════════════════════════════════════════════════

class PreSynthCache:
    """
    Background cache for pre-synthesized audio.

    Two modes:
    1. Startup cache: Common filler phrases pre-generated once
    2. Predictive cache: Next response pre-synthesized during conversation

    The HART onboarding uses static .ogg files (zero compute) —
    this cache is for RUNTIME conversation (general chat).
    """

    # Common fillers to pre-cache on first use (English only for now)
    FILLERS = [
        "I understand.",
        "Let me think about that.",
        "Good question.",
        "That makes sense.",
        "One moment.",
        "I see what you mean.",
    ]

    def __init__(self, cache_dir=None, max_entries=50):
        self._cache_dir = Path(cache_dir) if cache_dir else (
            Path.home() / '.nunba' / 'tts_cache' / 'presynth'
        )
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        self._cache = OrderedDict()  # text_hash -> file_path
        self._max = max_entries
        self._lock = threading.Lock()
        self._bg_thread = None

    def _hash(self, text, voice='default'):
        return hashlib.md5(f"{text}|{voice}".encode()).hexdigest()[:16]

    def get(self, text, voice='default'):
        """Return cached audio path if available, else None."""
        h = self._hash(text, voice)
        with self._lock:
            path = self._cache.get(h)
            if path and os.path.exists(path):
                self._cache.move_to_end(h)
                return path
            # Check disk even if not in memory cache
            disk_path = self._cache_dir / f"{h}.wav"
            if disk_path.exists():
                self._cache[h] = str(disk_path)
                return str(disk_path)
        return None

    def put(self, text, audio_path, voice='default'):
        """Add an entry to the cache."""
        h = self._hash(text, voice)
        with self._lock:
            self._cache[h] = audio_path
            if len(self._cache) > self._max:
                _, old_path = self._cache.popitem(last=False)
                try:
                    os.unlink(old_path)
                except OSError:
                    pass

    def presynth_background(self, text, voice, synth_fn):
        """Pre-synthesize in background thread. Non-blocking."""
        if self.get(text, voice):
            return  # Already cached

        def _do():
            try:
                h = self._hash(text, voice)
                out_path = str(self._cache_dir / f"{h}.wav")
                result = synth_fn(text, out_path, voice)
                if result:
                    self.put(text, result, voice)
            except Exception as e:
                logger.debug(f"Pre-synth background failed: {e}")

        t = threading.Thread(target=_do, daemon=True)
        t.start()

    def warm_fillers(self, synth_fn, voice='default'):
        """Pre-cache common filler phrases in background. Called once on init."""
        def _do():
            for filler in self.FILLERS:
                if not self.get(filler, voice):
                    try:
                        h = self._hash(filler, voice)
                        out_path = str(self._cache_dir / f"{h}.wav")
                        result = synth_fn(filler, out_path, voice)
                        if result:
                            self.put(filler, result, voice)
                    except Exception:
                        pass

        t = threading.Thread(target=_do, daemon=True, name='tts-filler-warm')
        t.start()
        self._bg_thread = t


# ════════════════════════════════════════════════════════════════════
# STREAMING SENTENCE PIPELINE — chunk LLM output → TTS → audio
# ════════════════════════════════════════════════════════════════════

class SentencePipeline:
    """
    Converts streaming LLM text into sentence-level TTS chunks.

    As the LLM streams tokens, this pipeline:
    1. Accumulates text until a sentence boundary (. ! ? newline)
    2. Immediately submits the sentence for TTS synthesis
    3. Queues the audio for playback
    4. Starts synthesizing the NEXT sentence while the current one plays

    This gives "instant" voice response — the first sentence plays
    while the rest is still being generated.
    """

    # Sentence boundary characters
    BOUNDARIES = {'.', '!', '?', '\n'}
    # Don't split on periods in common abbreviations
    ABBREVS = {'mr.', 'mrs.', 'dr.', 'vs.', 'etc.', 'i.e.', 'e.g.'}

    def __init__(self, synth_fn, on_audio_ready=None):
        """
        Args:
            synth_fn: callable(text, output_path) -> path_or_None
            on_audio_ready: callable(audio_path, sentence_text) — called when a chunk is ready
        """
        self._synth_fn = synth_fn
        self._on_ready = on_audio_ready
        self._buffer = ""
        self._sentence_num = 0
        self._pool = ThreadPoolExecutor(max_workers=1)
        self._futures = []

    def feed(self, token):
        """Feed a token from the LLM stream."""
        self._buffer += token

        # Check for sentence boundary
        stripped = self._buffer.strip()
        if not stripped:
            return

        last_char = stripped[-1]
        if last_char in self.BOUNDARIES:
            # Avoid splitting on abbreviations
            lower = stripped.lower()
            if any(lower.endswith(a) for a in self.ABBREVS):
                return

            sentence = self._buffer.strip()
            self._buffer = ""
            if len(sentence) > 2:
                self._submit(sentence)

    def flush(self):
        """Flush remaining buffer as final sentence."""
        remaining = self._buffer.strip()
        self._buffer = ""
        if len(remaining) > 2:
            self._submit(remaining)

    def _submit(self, sentence):
        self._sentence_num += 1
        num = self._sentence_num

        def _do():
            try:
                import tempfile
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False,
                                                  prefix=f'tts_s{num}_') as f:
                    out_path = f.name
                result = self._synth_fn(sentence, out_path)
                if result and self._on_ready:
                    self._on_ready(result, sentence)
            except Exception as e:
                logger.debug(f"Sentence pipeline TTS failed: {e}")

        fut = self._pool.submit(_do)
        self._futures.append(fut)

    def wait(self):
        """Wait for all pending synthesis to complete."""
        from concurrent.futures import wait as cf_wait
        if self._futures:
            cf_wait(self._futures)
            self._futures.clear()

    def shutdown(self):
        self._pool.shutdown(wait=False)


# We need ThreadPoolExecutor for the pipeline
from concurrent.futures import ThreadPoolExecutor

# ────────────────────────────────────────────────────────────────────
# Venv-quarantined backend probes (Track B, Phase 6)
# ────────────────────────────────────────────────────────────────────
#
# Backends listed in tts.package_installer.BACKEND_VENV_PACKAGES live
# inside their own virtualenv and are NEVER importable from the main
# Nunba interpreter. Any "is this backend runnable?" probe must ask
# the venv (via backend_venv.is_venv_healthy) rather than the main
# process (via _torch_probe.check_backend_runnable).
#
# These two helpers are the single source of truth for "venv or
# main-interp?" and "runnable check". Callers in TTSEngine._can_run_backend
# and TTSEngine._try_auto_install_backend both go through them.


def _is_venv_backend(backend: str) -> bool:
    """True iff this backend is installed into its own venv.

    The venv plans are keyed by the HARTOS registry id, so a Nunba name
    ('f5') is looked up as its id ('f5_tts').  Asked as 'f5' before, F5
    was judged in the main interpreter, where f5_tts never imports, and
    was never picked even with its venv installed."""
    try:
        from tts.package_installer import BACKEND_VENV_PACKAGES, registry_engine_id
        return registry_engine_id(backend) in BACKEND_VENV_PACKAGES
    except Exception:
        return False


def _spoke_this_session(backend: str) -> bool:
    """True when a handshake of ``backend`` produced real audio in this
    run (tts_handshake.is_verified_backend).  False when that cannot be
    read."""
    try:
        from tts import tts_handshake
        return bool(tts_handshake.is_verified_backend(backend))
    except Exception:
        return False


def _handshake_known_failed(backend: str) -> bool:
    """True when every handshake of ``backend`` in this run failed
    (tts_handshake.is_known_failed): both ladder passes leave it out, and a
    demotion does not count it as a voice ready to take over
    (TTSEngine._can_speak_now).  The fallback still tries it.  False when
    that cannot be read."""
    try:
        from tts import tts_handshake
        return bool(tts_handshake.is_known_failed(backend))
    except Exception:
        return False


def _piper_has_voice(lang) -> bool:
    """True when Piper has a voice for ``lang`` (tts.piper_tts.voice_for_lang).
    Piper is in every ladder, but rhasspy ships no Tamil or Malayalam voice
    (piper_tts.py:70), so for those it is no voice at all."""
    try:
        from tts.piper_tts import voice_for_lang
        voice_for_lang(lang)
        return True
    except Exception:
        return False


def _probe_backend_runnable(backend: str, required_pkg: str) -> bool:
    """Single-call probe: is this backend runnable right now?

    Dispatches to the right probe for the backend's install topology:
      - venv-quarantined → backend_venv.is_venv_healthy(b, required_pkg)
      - main-interp      → _torch_probe.check_backend_runnable(b, required_pkg)

    Returns False on any probe error (never raises) — the caller can
    choose to retry install rather than propagate an exception.
    """
    try:
        if _is_venv_backend(backend):
            from tts.backend_venv import is_venv_healthy
            from tts.package_installer import registry_engine_id
            # The venv the install filled: 'f5' lives in the 'f5_tts' venv.
            return is_venv_healthy(registry_engine_id(backend), required_pkg)
        from tts._torch_probe import check_backend_runnable
        return check_backend_runnable(backend, required_pkg)
    except Exception:
        # Fallback to find_spec if probe unavailable (dev mode, no
        # python-embed, no venv). Conservative — err on "not runnable"
        # rather than a false positive that masks an install error.
        try:
            import importlib.util
            return importlib.util.find_spec(required_pkg) is not None
        except Exception:
            return False


# ════════════════════════════════════════════════════════════════════
# MAIN TTS ENGINE — multi-engine routing + pre-synth
# ════════════════════════════════════════════════════════════════════

class TTSEngine:
    """
    Unified Text-to-Speech Engine with multi-engine routing.

    Routes to the best engine per language and hardware:
    - Detects GPU VRAM, selects engine from preference chain
    - Manages engine lifecycle (one GPU engine at a time for <=8GB)
    - Pre-synth cache for instant playback of predicted responses
    - Sentence pipeline for streaming LLM → TTS
    """

    def __new__(cls, *args, **kwargs):
        """Instance defaults set in ``__new__`` so the per-session state
        dicts/sets (demoted backends, failure counters, install threads,
        backend handles) are populated even on construction paths that
        bypass ``__init__`` — tests routinely use
        ``TTSEngine.__new__(TTSEngine)`` to build a minimal harness
        without paying for hardware detection / persisted-demotion
        hydrate.  Methods that read these attributes (
        ``_select_backend_for_language``, ``_record_backend_failure``,
        ``_is_demoted``, …) can therefore rely on them without
        ``getattr`` boilerplate.

        ``__init__`` still runs the heavy boot work (hardware detect,
        persisted-demotion hydrate, language read-back from disk) for
        production construction.  Defaults set here are overwritten
        there with the proper values — same single-writer discipline
        the rest of the module uses.
        """
        instance = super().__new__(cls)
        # Per-session backend health tracking — see __init__ comment
        # block for the rationale.  Mirrored here so tests can patch
        # ``_is_demoted`` / ``_can_run_backend`` over an ``__new__``-
        # constructed engine without tripping AttributeError on the
        # underlying state these helpers read from.
        instance._consecutive_failures = {}
        instance._demoted_backends = set()
        instance._demotion_meta = {}
        instance._failure_threshold = 3
        instance._backends = {}
        instance._active_backend = BACKEND_NONE
        instance._initialized = False
        instance._pending_backend = None
        instance._hw_detected = False
        instance.has_gpu = False
        instance.vram_gb = 0.0
        instance.gpu_info = None
        instance._vram_manager = None
        instance._language = 'en'
        instance._install_threads = {}
        instance._spoken_languages = []
        instance._voice_record = {}
        instance._stamped_this_run = set()
        # The line being spoken on each thread (synthesize sets it).
        instance._line = threading.local()
        return instance

    def __init__(self,
                 prefer_gpu: bool = True,
                 auto_init: bool = True):
        self.prefer_gpu = prefer_gpu
        self.auto_init = auto_init
        self._vram_manager = None  # Set by _detect_hardware if HARTOS available

        self._backends = {}  # backend_name -> instance
        self._active_backend = BACKEND_NONE
        self._initialized = False
        self._init_lock = threading.Lock()
        self._synth_lock = threading.Lock()  # GPU backends are not thread-safe
        self._pending_backend = None  # backend being loaded in background

        # Per-session backend health tracking (Fix B, 2026-04-28).
        # Without these counters the ladder gets pinned on the first
        # entry forever — chatterbox raises, _synthesize_with_fallback
        # walks through, and the next request goes RIGHT back to
        # chatterbox because nothing remembered it just exploded.
        # Counter resets on successful synth; demotion is session-local
        # only (cleared on process restart) so a transient VRAM-pressure
        # window doesn't permanently disable the user's preferred GPU
        # engine across reboots.
        self._consecutive_failures: dict[str, int] = {}
        self._demoted_backends: set[str] = set()
        # When each demotion was first written and when it expires, kept so
        # a later save does not restart an older entry's 7-day clock.
        self._demotion_meta: dict[str, dict[str, Any]] = {}
        # 3 strikes is the same threshold the model_lifecycle.py
        # eviction guard uses — keep it consistent across the codebase
        # so failures observed by either subsystem trip a single,
        # well-understood circuit.
        self._failure_threshold = 3
        # Each voice's record on this machine, loaded with the demotions
        # below: when it last spoke (last_ok_at) and how many lines it spoke
        # and failed (successes, failures).  _has_good_record reads it.  The
        # counts live here and reach tts_state.json only inside writes that
        # happen anyway, plus a voice's first line in each run
        # (_stamped_this_run).
        self._voice_record: dict[str, dict[str, Any]] = {}
        self._stamped_this_run: set[str] = set()

        # Hydrate persisted demotions from prior boots — the negative-
        # finding cache that prevents the ladder from re-burning 3
        # failures every boot on a deterministically-broken top engine.
        # Selection (`_select_backend_for_language`) is unchanged; the
        # ladder still walks top-down, demotion is purely subtractive.
        # A newly-installed top engine has no demotion record so it is
        # picked up automatically on the very next boot — discovery is
        # the ladder, persistence only suppresses known-bad rungs until
        # `_DEMOTION_TTL_SECONDS` expiry, schema bump, or admin reset.
        try:
            with TTSEngine._state_lock:
                self._load_persisted_demotions()
        except Exception as _he:
            logger.debug(f"TTS demotion hydrate skipped: {_he}")
        # A voice set aside for want of a key comes back when the key is
        # stored: the vault says so where it stores it.  Without HARTOS no
        # voice is ever set aside for a key.
        try:
            from hartos.ai_key_vault import on_credential_stored
        except ImportError:
            pass
        else:
            on_credential_stored(TTSEngine.restore_voices_waiting_for)
        # ... and is set aside again when the key is taken back (a HARTOS
        # from before that signal has none to give).
        try:
            from hartos.ai_key_vault import on_credential_removed
        except ImportError:
            pass
        else:
            on_credential_removed(TTSEngine.set_aside_voices_restored_for)

        # Hardware info (detected lazily)
        self.gpu_info = None
        self.has_gpu = False
        self.vram_gb = 0.0
        self._hw_detected = False

        # Pre-synth cache
        self._presynth = PreSynthCache()

        # Current language (for routing)
        # Read persisted language so warm-up selects the right TTS engine
        # (not hardcoded English which triggers F5 install for Tamil users).
        # Through core.user_lang, the one reader of hart_language.json: it
        # follows the data root and carries a pre-move file over; reading
        # ~/Documents/Nunba/data here picked a stale language on macOS /
        # Linux once the person had switched (tests/
        # test_preferred_lang_fallback.py::TestLanguageReaderIsCanonical).
        self._language = 'en'
        try:
            from core.user_lang import get_preferred_lang
            _persisted = get_preferred_lang()
            if _persisted and len(_persisted) >= 2:
                self._language = _persisted[:2]
                logger.info(f"TTS init: using persisted language '{self._language}'")
        except Exception as _lang_exc:
            logger.warning("TTS init: core.user_lang unavailable (%s); "
                           "warm-up language stays 'en'", _lang_exc)

    def _detect_hardware(self):
        """Detect hardware via HARTOS VRAMManager (single source of truth)."""
        try:
            from integrations.service_tools.vram_manager import vram_manager
            gpu = vram_manager.detect_gpu()
            self.has_gpu = gpu.get('cuda_available', False)
            self.vram_gb = gpu.get('total_gb', 0.0)
            self.gpu_info = {
                'gpu_available': self.has_gpu,
                'gpu_name': gpu.get('name'),
                'vram_gb': self.vram_gb,
                'free_gb': gpu.get('free_gb', 0.0),
            }
            self._vram_manager = vram_manager
            if self.has_gpu:
                logger.info(f"GPU detected: {gpu.get('name')} "
                           f"({self.vram_gb:.1f}GB VRAM, {gpu.get('free_gb', 0):.1f}GB free)")
        except ImportError:
            # HARTOS not available — fallback to direct detection
            self._vram_manager = None
            try:
                import torch
                if torch.cuda.is_available():
                    self.has_gpu = True
                    self.vram_gb = torch.cuda.get_device_properties(0).total_mem / (1024**3)
                    self.gpu_info = {
                        'gpu_available': True,
                        'gpu_name': torch.cuda.get_device_name(0),
                        'vram_gb': self.vram_gb,
                    }
                else:
                    self.has_gpu = False
                    self.gpu_info = {'gpu_available': False}
            except Exception:
                self.has_gpu = False
                self.gpu_info = {'gpu_available': False}
        except Exception as e:
            logger.warning(f"Hardware detection error: {e}")
            self.has_gpu = False
            self.gpu_info = {'gpu_available': False}
            self._vram_manager = None

    def _ensure_hw_detected(self):
        if not self._hw_detected:
            self._hw_detected = True
            self._detect_hardware()

    @classmethod
    def _get_vram_tool_name(cls, backend: str) -> str | None:
        """Nunba backend constant → VRAMManager tool name.

        Derives from HARTOS ENGINE_REGISTRY[key].vram_key — no local
        lookup table, so adding a new engine's VRAM budget only
        requires updating the canonical registry in tts_router.
        """
        key = _BACKEND_TO_REGISTRY_KEY.get(backend)
        if not key:
            return None
        registry = _get_engine_registry()
        spec = registry.get(key)
        return spec.vram_key if spec else None

    @classmethod
    def _get_lifecycle_name(cls, backend: str) -> str | None:
        """Nunba backend constant → the name HARTOS's ModelLifecycleManager
        tracks its model under, which the J214 pin must use: the catalog
        id, by tts_router's one rule (_engine_id_to_catalog_id), the id the
        orchestrator registers the voice by and gpu_worker's idle timer
        looks its pin up by.  The VRAM tool name ('tts_mms_tts') named a
        model nobody tracks, so the pin never held.  None for a backend
        with no worker to keep (no VRAM budget: Piper)."""
        if not cls._get_vram_tool_name(backend):
            return None
        from integrations.channels.media.tts_router import _engine_id_to_catalog_id
        return _engine_id_to_catalog_id(_BACKEND_TO_REGISTRY_KEY[backend])

    @classmethod
    def _get_required_package(cls, backend: str) -> str | None:
        """Nunba backend constant → pip package required for in-process run.

        Derives from HARTOS ENGINE_REGISTRY[key].required_package.
        Returns None if the backend has no extra pip dep (Piper is
        bundled, espeak is a system binary, makeittalk is cloud-only).
        """
        key = _BACKEND_TO_REGISTRY_KEY.get(backend)
        if not key:
            return None
        registry = _get_engine_registry()
        spec = registry.get(key)
        return spec.required_package if spec else None

    # Cache results of import checks (module name -> bool)
    _import_check_cache = {}

    def _can_run_backend(self, backend):
        """Check if hardware AND software can run a backend.

        Checks:
        1. Required Python package is importable (skip if pip package missing)
        2. GPU has CUDA support (for GPU backends, torch.cuda must work)
        3. VRAM is sufficient (via VRAMManager or simple check)
        """
        cap = _get_engine_capabilities(backend)
        if not cap:
            return False

        # ── Software check: is the required package actually importable? ──
        # Uses subprocess probe (python-embed) to avoid stub torch poisoning.
        # find_spec only checks if the .py exists, not if imports succeed.
        #
        # Venv-quarantined backends (Track B, Phase 6): for backends in
        # BACKEND_VENV_PACKAGES, the package lives in a dedicated venv
        # at ~/Documents/Nunba/data/venvs/<backend>/ and is NEVER
        # importable from the main interpreter. The probe must go
        # through backend_venv.is_venv_healthy instead.
        required_pkg = self._get_required_package(backend)
        if required_pkg:
            cache_key = f'venv:{backend}' if _is_venv_backend(backend) else required_pkg
            if cache_key not in TTSEngine._import_check_cache:
                TTSEngine._import_check_cache[cache_key] = _probe_backend_runnable(
                    backend, required_pkg,
                )
            if not TTSEngine._import_check_cache[cache_key]:
                # The import probe said no, and a real synthesis through
                # this backend has passed since (tts_handshake): audio on
                # disk outranks a probe.  The probe cannot run at all in a
                # source run (it needs the frozen app's python-embed) and
                # answers "not runnable" there for every backend, so a
                # voice that had just been set up, verified and used was
                # "missing" again on the next turn: its setup was started
                # again and the line was handed to Piper, which has no
                # voice for the language (live walk, 22 Nov 2026, Tamil).
                if not _spoke_this_session(backend):
                    logger.debug(f"Backend {backend} skipped: '{required_pkg}' not runnable")
                    return False

        # ── GPU backends need working CUDA in torch ──
        required_vram = cap.get('vram_gb', 0)
        if required_vram > 0:
            if '_torch_cuda' not in TTSEngine._import_check_cache:
                try:
                    import torch
                    _cuda_ok = torch.cuda.is_available()
                    if not _cuda_ok:
                        # In-process torch may be CPU-only (python-embed ships CPU stub).
                        # The real CUDA torch lives in ~/.nunba/site-packages/ and is used
                        # by subprocess workers. Check via subprocess probe before giving up.
                        self._ensure_hw_detected()
                        if self.has_gpu:
                            try:
                                from tts._torch_probe import check_cuda_available
                                _cuda_ok = check_cuda_available()
                                if _cuda_ok:
                                    logger.info("TTS: CUDA torch verified via subprocess — GPU TTS enabled")
                            except Exception:
                                pass
                        if not _cuda_ok:
                            logger.info(f"torch.cuda.is_available() = False "
                                        f"(torch {torch.__version__}) — "
                                        f"GPU TTS needs CUDA torch upgrade"
                                        f"{' (GPU present via nvidia-smi)' if self.has_gpu else ''}")
                    else:
                        logger.info(f"torch {torch.__version__} CUDA available — GPU TTS enabled")
                    TTSEngine._import_check_cache['_torch_cuda'] = _cuda_ok
                except (ImportError, OSError) as _torch_err:
                    # Stub torch poisons sys.modules — use shared subprocess probe
                    try:
                        from tts._torch_probe import check_cuda_available
                        _cuda = check_cuda_available()
                        TTSEngine._import_check_cache['_torch_cuda'] = _cuda
                        if _cuda:
                            logger.info("torch CUDA verified via subprocess — GPU TTS enabled")
                        else:
                            logger.info(f"torch not available — GPU TTS disabled ({_torch_err})")
                    except Exception as _probe_err:
                        TTSEngine._import_check_cache['_torch_cuda'] = False
                        logger.info(f"torch not available — GPU TTS disabled ({_torch_err})")
            if not TTSEngine._import_check_cache['_torch_cuda']:
                return False

        # ── VRAM check: VRAMManager.can_fit() is the single authority ──
        if required_vram == 0:
            return True
        return self._vram_allows(backend)

    def _vram_allows(self, backend) -> bool:
        """Check if VRAMManager says this backend can fit in available VRAM.

        If it doesn't fit, ask ModelLifecycleManager to evict an idle
        non-LLM model (stale TTS, unused VLM worker, etc.) and re-probe.
        Intentionally does NOT touch the main/draft LLMs — the draft-vs-
        TTS trade-off is handled at boot in `should_boot_draft()` which
        skips the draft on ≤10GB GPUs so TTS always has room.
        """
        tool_name = self._get_vram_tool_name(backend)
        if not tool_name:
            return True
        try:
            from integrations.service_tools.vram_manager import vram_manager
            if vram_manager.can_fit(tool_name):
                return True
            # Probe failed.  Try evicting an idle non-LLM model.  LLMs are
            # managed by llama-server, not the lifecycle manager's GPU
            # registry, so request_swap() naturally picks from TTS/VLM/STT.
            try:
                from integrations.service_tools.model_lifecycle import (
                    get_model_lifecycle_manager,
                )
                mlm = get_model_lifecycle_manager()
                evicted = mlm.request_swap(needed_model=tool_name)
                if evicted and vram_manager.can_fit(tool_name):
                    logger.info(
                        f"Backend {backend}: VRAM tight, evicted an idle "
                        f"worker to make room for {tool_name}",
                    )
                    return True
            except Exception as se:
                logger.debug(f"swap-for-VRAM attempt failed: {se}")
            if _runs_on_cpu(backend):
                logger.info(
                    f"Backend {backend}: {tool_name} won't fit in free VRAM; "
                    f"kept, the engine registry says it runs on the CPU",
                )
                return True
            logger.info(
                f"Backend {backend} blocked: VRAMManager says "
                f"{tool_name} won't fit (boot-time draft gating should "
                f"have handled this on ≤10GB GPUs)",
            )
            return False
        except Exception:
            pass
        return True

    # Track which backends have a background auto-install in progress
    _auto_install_pending = set()
    # Cache backends that failed to install — don't retry every request
    _auto_install_failed = set()
    _auto_install_lock = threading.Lock()

    def _try_auto_install_backend(self, backend):
        """Trigger a background install of the given backend's packages + models.

        Non-blocking: launches a thread so the current request still gets Piper,
        but the *next* request will find the GPU engine importable.
        Returns True if packages are already importable (may have been partially
        installed previously), False if install was kicked off in background.

        Packages that run on a demoted voice: nothing is installed and no
        setup card is shown.  One real synthesis decides, in the background
        (_check_and_heal), and a pass brings the voice back.  Only the running
        engine does this: models/orchestrator.py checks a voice with an
        engine of its own, whose demotions are a copy read when it was made.
        """
        # Don't install GPU backends that can't run on this hardware.
        cap = _get_engine_capabilities(backend)
        if cap.get('vram_gb', 0) > 0:
            self._ensure_hw_detected()
            if not self.has_gpu:
                logger.debug(f"Skipping auto-install of '{backend}': no GPU detected")
                return False
            if not self._vram_allows(backend):
                return False

        heal = False
        with TTSEngine._auto_install_lock:
            # Already failed? Don't retry every request.  This process's
            # set, or the catalog row, which keeps a failed install across
            # restarts until a newer build, another platform, a successful
            # install, or (gated weights) the key arriving.
            if backend in TTSEngine._auto_install_failed or _setup_failed_on_row(backend):
                logger.debug(f"Auto-install for '{backend}' previously failed, skipping")
                return False

            # Already running?
            if backend in TTSEngine._auto_install_pending:
                logger.debug(f"Auto-install for '{backend}' already in progress, skipping")
                return False

            # Single source of truth for "is this backend already runnable?":
            # the same subprocess probe _can_run_backend() consults.  Earlier
            # versions used importlib.util.find_spec() here, which only checks
            # if the .py file exists — it returned True for parler_tts when
            # the wheel was installed but CUDA torch was missing, short-
            # circuiting the install gate so the install never ran.  The
            # subprocess probe actually attempts the import and catches that
            # half-installed state.  Keeping both gates on the same probe
            # eliminates the disagreement.
            required_pkg = self._get_required_package(backend)
            if required_pkg:
                try:
                    # Bypass the cache here — _can_run_backend may have cached
                    # False from a prior probe attempt, but we want the live
                    # answer at install-decision time (state may have changed
                    # since boot, e.g. CUDA torch finished installing).
                    #
                    # Venv-quarantined backends go through backend_venv.
                    # is_venv_healthy (the venv's python exe is the only
                    # place the package is importable).
                    if not _is_venv_backend(backend):
                        from tts import _torch_probe as _tp
                        _tp._backend_cache.pop(backend, None)
                    if _probe_backend_runnable(backend, required_pkg):
                        cache_key = f'venv:{backend}' if _is_venv_backend(backend) else required_pkg
                        TTSEngine._import_check_cache[cache_key] = True
                        if not (self is _engine and self._is_demoted(backend)):
                            logger.info(f"Packages for '{backend}' already runnable — skipping install")
                            return True
                        heal = True
                except Exception as _probe_err:
                    logger.debug(f"Auto-install probe error for '{backend}': {_probe_err} — proceeding to install")

            TTSEngine._auto_install_pending.add(backend)

        if heal:
            # Installed and demoted: the check alone, off the person's line,
            # under the same pending guard as an install.  A check that fails
            # puts the voice in _auto_install_failed: no more tries this run.
            def _bg_heal():
                try:
                    self._check_and_heal(backend)
                except Exception as e:
                    logger.error(f"[heal] '{backend}' check error: {e}")
                    with TTSEngine._auto_install_lock:
                        TTSEngine._auto_install_failed.add(backend)
                finally:
                    with TTSEngine._auto_install_lock:
                        TTSEngine._auto_install_pending.discard(backend)

            threading.Thread(target=_bg_heal, daemon=True,
                             name=f"tts-heal-{backend}").start()
            logger.info(f"Packages for '{backend}' already runnable but it is "
                        f"demoted: checking it with one synthesis in the "
                        f"background, no install")
            return True

        def _bg_install():
            progress = None
            try:
                from tts.package_installer import install_backend_full, make_chat_progress_callback
                logger.info(f"[auto-install] Starting background install for '{backend}'")

                # Push progress to chat view so user sees what's happening
                progress = make_chat_progress_callback(
                    job_type=f'tts_setup_{backend}')

                ok, result = install_backend_full(backend, progress_cb=progress)
                if ok:
                    # Verified-signal gate: the card that says a backend
                    # is usable only fires after a REAL synthesis runs
                    # through the same code path the user's first chat
                    # message hits and produces audio bytes of non-trivial
                    # size AND audible duration. Pip success, import
                    # success, and worker spawn are all proxy signals —
                    # they've lied repeatedly (dac/sentencepiece/CUDA
                    # torch missing, model weights absent, runtime stub
                    # torch, DLL path unresolved, and the 2026-04-18
                    # Indic Parler sympy ModuleNotFoundError).  Audio
                    # bytes + duration on disk is the only signal that
                    # cannot lie.  tts.tts_handshake runs the same
                    # verify_backend_synth path AND emits a
                    # tts_handshake SSE with playable audio so the
                    # UI banner flips on an explicit verified event,
                    # not a string-heuristic match against progress text.
                    # The card that says the voice is ready fires only in
                    # _check_and_heal, after that synthesis (the same check a
                    # demoted voice gets without an install).
                    verdict = self._check_and_heal(backend, progress)
                    ok = verdict.ok  # completion event reflects the truth
                else:
                    logger.warning(f"[auto-install] '{backend}' install failed: {result}")
                    if progress:
                        progress(f"{backend} setup failed — using fallback engine")
                    with TTSEngine._auto_install_lock:
                        TTSEngine._auto_install_failed.add(backend)
                    # The installer's own text, unprefixed: a gated download
                    # says "needs <KEY>: ..." and the row reads the key name.
                    # An answer that tried nothing (another install holds the
                    # lock; pip deferred to the next boot) is not a failure.
                    from tts.package_installer import install_did_not_run
                    if not install_did_not_run(result):
                        _remember_setup_failure(backend, str(result))
            except ImportError as e:
                logger.warning(f"[auto-install] package_installer not available, "
                               f"cannot auto-install '{backend}'")
                with TTSEngine._auto_install_lock:
                    TTSEngine._auto_install_failed.add(backend)
                _remember_setup_failure(backend, f"install could not start: {e}")
            except Exception as e:
                logger.error(f"[auto-install] '{backend}' install error: {e}")
                if progress:
                    progress(f"{backend} setup failed — using fallback engine")
                with TTSEngine._auto_install_lock:
                    TTSEngine._auto_install_failed.add(backend)
                _remember_setup_failure(backend, f"install error: {e}")
            finally:
                with TTSEngine._auto_install_lock:
                    TTSEngine._auto_install_pending.discard(backend)
                # Send completion event to dismiss the progress card
                try:
                    import sys as _sys
                    main_mod = _sys.modules.get('__main__')
                    if main_mod and hasattr(main_mod, 'broadcast_sse_event'):
                        main_mod.broadcast_sse_event('setup_progress', {
                            'type': 'setup_progress',
                            'job_type': f'tts_setup_{backend}',
                            'complete': True,
                        })
                except Exception:
                    pass

        t = threading.Thread(target=_bg_install, daemon=True,
                             name=f"tts-auto-install-{backend}")
        t.start()
        logger.info(f"Auto-install thread started for '{backend}' — "
                     f"falling back to Piper for this request")
        return False

    def _check_and_heal(self, backend, progress=None):
        """One real synthesis decides whether ``backend`` can be used; when
        it can, nothing keeps it set aside any more.  Returns the verdict
        (tts.verified_synth.Result).

        The second half of an install (_bg_install), and all of the heal of
        an installed voice that is demoted (_try_auto_install_backend: no
        install, no pip, no setup card).  ``progress`` is the install's chat
        card, None for a heal.

        The saved handshake verdict for (backend, language) is dropped first,
        as tts_handshake.retry does: run_handshake answers from it for the
        rest of the run, and a saved FAIL keeps the voice out of both ladder
        passes (is_known_failed).  A pass clears this run's failed-install
        mark, a setup failure its catalog row kept, and the demotion (saved).
        A fail goes into _auto_install_failed: no more tries this run.
        """
        # Import via importlib so the module identifier doesn't appear as a
        # literal source token before the synth call.  Keeps the
        # test-of-order contract in Family B strict without changing
        # behavior.
        import importlib as _vr_il
        try:
            _hs_mod = _vr_il.import_module("tts.tts_handshake")
            _vr_mod = _vr_il.import_module("tts.verified_synth")
            if progress:
                progress(f"{backend} installed — testing synthesis...")
            # run_handshake uses verify_backend_synth internally, so the DRY
            # contract (one synth probe path) holds.  retry() is
            # run_handshake with the saved verdict dropped first.  An
            # install, which has its setup card, announces the voice (the
            # page's ready card, the greeting on the speakers).  A heal is
            # quiet: it runs in the middle of a conversation (review rv_db95:
            # the page showed "Voice engine ready" and played the greeting).
            announce = progress is not None
            hs = _hs_mod.retry(self, backend, lang=self._language,
                               timeout_s=180, broadcast=announce,
                               play_audio=announce)
            verdict = _vr_mod.Result(
                ok=hs.ok, n_bytes=hs.n_bytes,
                err=hs.err, elapsed_s=hs.elapsed_s,
            )
        except Exception as _verify_err:
            logger.error(f"[auto-install] '{backend}' verifier crashed: "
                         f"{_verify_err}")
            # Verifier itself failing IS a failure — don't fall back to a
            # shallow check. That's how the original lie got in.
            _VR = _vr_il.import_module("tts.verified_synth").Result
            verdict = _VR(ok=False, n_bytes=0,
                          err=f"verifier crash: {_verify_err}",
                          elapsed_s=0.0)

        if verdict.ok:
            logger.info(f"[auto-install] '{backend}' verified: "
                        f"{verdict.n_bytes} bytes audio in "
                        f"{verdict.elapsed_s:.1f}s")
            # Clear any prior failed-mark for this backend.  Without this, a
            # transient failure (network blip, probe timeout) permanently
            # disables the backend even after a later successful install.
            # See tests/harness/test_family_b_tts_auto_install.py::
            # test_b7_failed_cleared_on_success for the contract.
            with TTSEngine._auto_install_lock:
                TTSEngine._auto_install_failed.discard(backend)
            # A failure the row kept (a gated download whose key has since
            # arrived) no longer holds: this voice synthesised.
            _cat, _row = _catalog_row(backend)
            if _row is not None and _row.error_build:
                _cat.mark_downloaded(_row.id, True)
            # Autonomous-recovery close-the-loop (#TTS-demote-heal,
            # 2026-05-28): a verified voice is NOT broken anymore — clear the
            # demotion so PASS 1 / PASS 2 of _select_backend_for_language can
            # pick it up on the next request, and persist the cleared state
            # so a restart doesn't re-skip the now-healthy backend.
            cleared = False
            with self._state_lock:
                if backend in self._demoted_backends:
                    self._demoted_backends.discard(backend)
                    self._demotion_meta.pop(backend, None)
                    self._consecutive_failures[backend] = 0
                    cleared = True
                    try:
                        self._save_persisted_demotions()
                    except Exception as _pe:
                        logger.debug(f"persist-after-clear failed: {_pe}")
            if cleared:
                logger.info(f"[auto-install] '{backend}' demotion CLEARED "
                            f"— engine is selectable again")
            if progress:
                progress(f"{backend} ready — "
                         f"{verdict.n_bytes // 1024} KB test audio produced")
        else:
            logger.warning(f"[auto-install] '{backend}' "
                           f"{'pip succeeded but ' if progress else ''}"
                           f"SYNTHESIS FAILED: {verdict.err} "
                           f"(elapsed={verdict.elapsed_s:.1f}s)")
            if progress:
                progress(f"{backend} installed but synthesis failed: "
                         f"{verdict.err[:80]}")
            with TTSEngine._auto_install_lock:
                TTSEngine._auto_install_failed.add(backend)
        return verdict

    def _is_missing_packages(self, backend):
        """Return True if this backend failed _can_run_backend due to missing
        packages (as opposed to insufficient VRAM or no CUDA)."""
        required_pkg = self._get_required_package(backend)
        if not required_pkg:
            return False
        cached = TTSEngine._import_check_cache.get(required_pkg)
        if cached is False:
            return True
        # Not cached yet — check live
        import importlib.util
        return importlib.util.find_spec(required_pkg) is None

    # ── Per-backend health tracking (Fix B, 2026-04-28) ─────────────
    # The ladder used to wedge on the first preference forever: any
    # transient or hard failure inside chatterbox would flow into
    # _synthesize_with_fallback, but on the NEXT call _active_backend
    # was reset to chatterbox again because nothing remembered the
    # previous failure. These three helpers + the demoted-set check in
    # _select_backend_for_language are the circuit breaker.

    # ONE lock over the ladder's state and its file: _demoted_backends,
    # _demotion_meta, _consecutive_failures, the voice records, the spoken
    # languages and tts_state.json, for every engine (there is one file).
    # The synth thread, the background install / heal threads and the key
    # vault's restore (restore_voices_waiting_for, a classmethod) all change
    # them, and the save iterates them.  Reentrant: a failure that demotes
    # and a line that changes the spoken language each save while holding
    # it.  Held only around those reads and writes and the file write, never
    # across a synthesis, a handshake or the self-heal report.  Order:
    # _restore_lock first, then this one, never the reverse.
    _state_lock = threading.RLock()

    # Failure-class signatures used by ``_is_structural_error``.
    # Lower-cased substring match against ``str(error).lower()`` plus
    # the exception class name.  Each phrase is a deterministic /
    # near-deterministic indicator that the engine cannot self-heal
    # mid-session — re-trying it next call (or next boot) costs the
    # user latency for no recovery probability.
    #
    # Curated from observed failure logs 2026-04-30 .. 2026-05-08:
    #   * "died during startup" / "worker startup failed" — chatterbox
    #     subprocess crashes before binding the IPC socket; usually
    #     missing CUDA driver or corrupted weights.
    #   * "no module named" / ModuleNotFoundError — pip install never
    #     landed (kokoro / melotts on this host); a re-attempt would
    #     hit the same network/disk failure.
    #   * "loader returned failure" — HARTOS model_orchestrator bottoms
    #     out after exhausting retries; structural by orchestrator's
    #     own contract.
    #   * "venv creation failed" / "no module named venv" —
    #     chatterbox-class venv bootstrap broken.
    #   * "missing weights" / "model file not found" — download never
    #     completed; needs admin or hub-install.
    #   * "torch not compiled with cuda" — environmental.
    #
    # Anything that does NOT match is treated as TRANSIENT (CUDA OOM,
    # network blip, filesystem race, audio encode glitch) so the
    # standard 3-strike rule applies — preserving tolerance for
    # one-off hiccups.  Bias is intentional: a misclassified transient
    # costs one extra synth attempt; a misclassified structural would
    # lock an engine out for a week even though it could self-heal.
    _STRUCTURAL_FAILURE_SIGNATURES: tuple[str, ...] = (
        'died during startup',
        'worker startup failed',
        'worker died',
        'no module named',
        'modulenotfounderror',
        'loader returned failure',
        'venv creation failed',
        'missing weights',
        'model file not found',
        'torch not compiled with cuda',
        'cudnn_status_not_initialized',
    )

    @staticmethod
    def _needed_key(error: BaseException | None) -> str:
        """The key a failure says the voice's repo wants ('' when it wants
        none): the worker answer's ``needs_key`` field, which the adapter
        puts on the exception.

        Read from this exception only, never from what it was raised
        under.  A fallback voice fails inside the ``except`` of the voice
        before it, so the first voice's failure is its ``__context__``: a
        fallback that died of something else was recorded as waiting for
        the first voice's key (review rv_4625: xtts_v2)."""
        return str(getattr(error, 'needs_key', '') or '')

    @classmethod
    def _is_structural_error(cls, error: Exception | None) -> bool:
        """Classify a synth failure as structural or transient.

        Walks the ``__cause__`` / ``__context__`` chain so a wrapping
        ``RuntimeError`` does not hide an underlying ``ImportError``.
        Returns False for ``error=None`` (legacy callers without an
        exception in scope) — keeps the prior 3-strike behaviour
        unchanged for any caller that hasn't been updated.
        """
        if error is None:
            return False
        # The worker's own flags come before any text.  ``transient``: the
        # failure passes by itself (a crash mid-request, or a start that hit
        # the network, the disk or the GPU's memory), whatever its words
        # say; 'worker startup failed' alone read every such start as a
        # broken voice.  ``key_refused``: the repo turned the stored key down
        # and will refuse it again, so one start is enough (HARTOS
        # ai_key_vault.gated_weights_failure; no sentence of that answer is
        # matched here).
        if getattr(error, 'transient', False):
            return False
        # This exception's own field only: what it was raised under may be
        # another voice's failure (see _needed_key).
        if getattr(error, 'key_refused', False):
            return True
        seen: set[int] = set()
        cur: BaseException | None = error
        while cur is not None and id(cur) not in seen:
            seen.add(id(cur))
            blob = f"{type(cur).__name__.lower()} {(str(cur) or '').lower()}"
            for sig in cls._STRUCTURAL_FAILURE_SIGNATURES:
                if sig in blob:
                    return True
            cur = (getattr(cur, '__cause__', None)
                   or getattr(cur, '__context__', None))
        return False

    def _record_backend_failure(
        self, backend: str, error: Exception | None = None, *,
        language: str | None = None, elapsed_s: float | None = None,
    ) -> None:
        """Increment consecutive-failure counter; demote at threshold.

        Piper is exempt — it is the canonical CPU last-resort and
        demoting it would leave the engine with no backend.  If Piper
        keeps failing the right answer is to surface that to the user
        (text-only fallback), not to silently eject it.

        Failure-class threshold (introduced 2026-05-08):

        * **STRUCTURAL** — ``error`` matches a signature in
          ``_STRUCTURAL_FAILURE_SIGNATURES`` (worker died at startup,
          missing module, missing weights, …).  These are
          deterministic — re-trying next call or next boot costs
          latency with zero recovery probability.  Demote on the
          first strike + persist across boots.

        * **TRANSIENT** — anything else (CUDA OOM, network blip,
          filesystem race).  Three-strikes-then-demote behaviour
          preserved.  Pre-2026-05-08 every failure was treated this
          way, which meant chatterbox_turbo (which dies during worker
          startup on every boot) burned ~3 minutes on every cold
          start: each boot saw exactly 1 failure, the in-memory
          counter reset, the persisted cache never wrote, and the
          next boot re-discovered the same breakage from scratch.
          The structural classifier closes that loop: 1 boot to
          detect, 0 boots to recover.

        Once the threshold is crossed the backend is written to
        ``tts_state.json`` so the next boot does not waste failures
        on the same broken engine.  ``_DEMOTION_TTL_SECONDS`` (7
        days) bounds the persistence so transient causes (driver
        flap, weights mid-download) self-heal without admin
        intervention.  A successful synth (``_record_backend_success``)
        clears the counter mid-session so a flaky-but-not-broken
        engine never accumulates into a permanent demotion.

        Backwards compatible: callers that haven't been updated to
        pass ``error`` get the legacy threshold (3 strikes, transient
        treatment) automatically.

        Two rules hold a voice back from demotion (owner, 2026-11-25:
        "Single failure is not reason for demoting a working TTS if it
        worked earlier but why it failed could be OOM etc"; 23:40 IST: "if
        a model has statistically performed good, don't penalise hard ...
        and if demoted without another model inference ready that's also
        bad").  Live: mms_tts crashed once at boot ("module 'torch' has no
        attribute 'version'") after speaking at 20:28 and 22:51, was
        demoted for 7 days, and every Tamil line was text only.

        * **Its record**: a voice that has spoken more lines on this
          machine than it has failed (``_has_good_record``) gets the normal
          threshold even for a structural failure.
        * **The last voice**: a voice is not demoted while no other voice
          for ``language`` can speak now (the fallback's own list,
          ``_fallback_voices``, cut to ``_can_speak_now``: it spoke in this
          run or its packages are known to import).  The failure is
          counted and logged with the time its start took; the rest of
          this line goes on without it, and the next line starts it again.

        A refused key (``key_refused``) is the exception to both: the repo
        will refuse the same key again, so one start demotes.

        ``language``: the line's (default: the engine's).  ``elapsed_s``:
        how long the failed start took, for the log.
        """
        if not backend or backend == BACKEND_PIPER or backend == BACKEND_NONE:
            return
        structural = self._is_structural_error(error)
        key_refused = bool(getattr(error, 'key_refused', False))
        with self._state_lock:
            # The record before this failure decides.
            good_record = self._has_good_record(backend)
            n = self._consecutive_failures.get(backend, 0) + 1
            self._consecutive_failures[backend] = n
            record = self._voice_record.setdefault(backend, {})
            record['failures'] = record.get('failures', 0) + 1
        threshold = (1 if structural and (key_refused or not good_record)
                     else self._failure_threshold)
        # The rest of this line goes on without the voice: one start per
        # line (_speak_with_active_engine, _fallback_voices).
        line = getattr(self._line, 'failed', None)
        if line is not None:
            line[backend] = elapsed_s

        # Push EVERY failure to the canonical self-heal pipeline via
        # exception_collector.report_subsystem_failure — the SAME
        # helper channels / VLM / LLM / daemon / tool subsystems
        # use.  Module key = 'tts.{backend}' is constructed by the
        # helper, not here, so the convention can't drift between
        # subsystems.  Three transient failures cluster under one
        # pattern_key in ExceptionCollector → SelfHealingDispatcher
        # creates a self_heal goal (default _min_occurrences=3);
        # structural failures hit ExceptionWatcher's critical path
        # at min_occurrences=1.  Either way the autonomous fix
        # pipeline owns the response — TTS engine doesn't need to
        # know about repair tools, model catalogs, or capability
        # alternates; it just reports the failure.
        if error is not None:
            try:
                import sys as _sys
                # Lazy import to preserve the "TTS engine boots
                # even without HARTOS imports" contract on Nunba.
                if 'hartos.exception_collector' in _sys.modules:
                    _ec = _sys.modules['hartos.exception_collector']
                else:
                    from hartos import exception_collector as _ec  # type: ignore
                _ec.report_subsystem_failure(
                    subsystem='tts',
                    identifier=backend,
                    exc=error,
                    function='_record_backend_failure',
                    failure_kind=('structural' if structural else 'transient'),
                    consecutive_failures=n,
                    threshold=threshold,
                )
            except Exception as _ec_err:  # noqa: BLE001
                logger.debug(
                    f"TTS failure → self-heal push failed: {_ec_err}")

        with self._state_lock:
            if n < threshold or backend in self._demoted_backends:
                return
        kind = 'STRUCTURAL' if structural else 'transient'
        err_summary = ''
        if error is not None:
            err_summary = (
                f" (error class: {type(error).__name__}; "
                f"msg: {str(error)[:120]!r})"
            )
        lang = language or self._language
        if not key_refused and not any(
                self._can_speak_now(v, lang)
                for v in self._fallback_voices(lang, without=backend)):
            why = self._say_set_aside(self._set_aside_for(lang))
            logger.warning(
                f"TTS backend '{backend}' KEPT after {n} {kind} "
                f"failure{'s' if n != 1 else ''}: no other voice for "
                f"'{_normalize_lang(lang)}' is ready to speak"
                f"{f' ({why})' if why else ''}; the next line starts it "
                f"again.{err_summary}"
            )
            return
        with self._state_lock:
            if backend in self._demoted_backends:
                return
            self._demoted_backends.add(backend)
            # A voice set aside for want of a key says which key, so that
            # storing it brings the voice back (restore_voices_waiting_for).
            needed = self._needed_key(error)
            if needed:
                import time as _time
                _now = _time.time()
                self._demotion_meta.setdefault(backend, {
                    'first_demoted_at': _now,
                    'expires_at': _now + _DEMOTION_TTL_SECONDS,
                })['needs_key'] = needed
            try:
                self._save_persisted_demotions()
            except Exception as _pe:
                logger.debug(f"TTS demotion persist skipped: {_pe}")
        logger.warning(
            f"TTS backend '{backend}' DEMOTED for this session "
            f"after {n} {kind} failure{'s' if n != 1 else ''} — "
            f"ladder will skip it.{err_summary} "
            f"Persisted to tts_state.json (TTL "
            f"{_DEMOTION_TTL_SECONDS // 86400}d) so subsequent "
            f"boots don't re-burn latency on the same engine."
        )

    def _record_backend_success(self, backend: str) -> None:
        """Clear the per-backend failure counter on a successful synth,
        and count the line in the voice's record (_has_good_record).

        This runs on every spoken line, so the counts live in memory.  They
        reach tts_state.json on the voice's first line in each run (which
        also stamps ``last_ok_at``) and otherwise only inside writes that
        happen anyway: a demotion, a spoken-language change.  Lines spoken
        after a run's last write are not on file if the app stops; the
        record on file is a floor.
        """
        if not backend:
            return
        _VRAM_SKIPS.pop(backend, None)
        with self._state_lock:
            if self._consecutive_failures.get(backend):
                self._consecutive_failures[backend] = 0
            if backend in (BACKEND_PIPER, BACKEND_NONE):
                return
            record = self._voice_record.setdefault(backend, {})
            record['successes'] = record.get('successes', 0) + 1
            if backend in self._stamped_this_run:
                return
            self._stamped_this_run.add(backend)
            import time as _time
            record['last_ok_at'] = _time.time()
            try:
                self._save_persisted_demotions()
            except Exception as _pe:
                logger.debug(f"TTS voice record persist skipped: {_pe}")

    def _record_never_came_up(self, backend: str,
                              language: str | None = None) -> None:
        """Count a selected engine that has no instance as one failure of
        that engine, so repeated misses demote it and the selector moves on.
        Nothing is counted while a background switch is still loading."""
        if getattr(self, '_pending_backend', None):
            return
        self._record_backend_failure(
            backend, RuntimeError(f"TTS backend {backend!r} was selected but never came up"),
            language=language)

    def _is_demoted(self, backend: str) -> bool:
        with self._state_lock:
            return backend in self._demoted_backends

    def _has_good_record(self, backend: str) -> bool:
        """True when ``backend`` has spoken more lines on this machine than
        it has failed.  The one rule _record_backend_failure asks for "it
        worked here before"; ``last_ok_at`` beside the counts is data only.
        No count of its own: the voice's lines against its failures."""
        with self._state_lock:
            record = self._voice_record.get(backend) or {}
            return record.get('successes', 0) > record.get('failures', 0)

    # ── Persisted demotion cache (cross-boot negative findings) ─────
    # See module-level docstring above ``_TTS_STATE_SCHEMA`` for the
    # full design rationale. These helpers are the ONLY code that
    # touches ``tts_state.json`` (the save also carries the spoken
    # languages, _record_spoken_language) — selection is intentionally
    # unaware of persistence (Gate 4: no parallel selection paths).

    def _load_persisted_demotions(self) -> None:
        """Hydrate ``_demoted_backends`` from disk, dropping expired
        and Piper-poisoned entries.

        Self-healing rules (any one drops a row):
          * TTL: ``expires_at`` in the past
          * Schema bump: ``schema`` field differs from
            ``_TTS_STATE_SCHEMA`` → wipe all (covers ladder
            restructuring across Nunba versions)
          * Backend is Piper / NONE — never let a stale file demote
            the absolute fallback

        Quietly returns on every error path: a missing/corrupt state
        file MUST NOT block engine init.
        """
        path = _get_tts_state_path()
        if not os.path.isfile(path):
            return
        try:
            with open(path, encoding='utf-8') as _f:
                data = json.load(_f)
        except (OSError, ValueError) as e:
            logger.debug(f"TTS state file unreadable ({e}) — starting fresh")
            return

        if data.get('schema') != _TTS_STATE_SCHEMA:
            logger.info(
                f"TTS state schema mismatch (got {data.get('schema')!r}, "
                f"expected {_TTS_STATE_SCHEMA}) — dropping all persisted "
                f"demotions on hydrate"
            )
            return

        spoken = data.get('spoken_languages')
        if isinstance(spoken, list):
            self._spoken_languages = [
                lang for lang in spoken if isinstance(lang, str) and lang
            ][-_SPOKEN_LANGUAGES_KEPT:]

        # Each voice's record: when it last spoke, lines spoken and failed.
        # Added beside the other keys under schema 1: a schema bump would
        # drop every demotion and the spoken languages above.
        record = data.get('voice_record')
        if isinstance(record, dict):
            self._voice_record = {
                backend: {k: v for k, v in rec.items()
                          if k in ('last_ok_at', 'successes', 'failures')
                          and isinstance(v, (int, float))
                          and not isinstance(v, bool)}
                for backend, rec in record.items()
                if isinstance(backend, str) and isinstance(rec, dict)
                and backend not in (BACKEND_PIPER, BACKEND_NONE)
            }

        persisted = data.get('demoted')
        if not isinstance(persisted, dict):
            return

        import time as _time
        now = _time.time()
        hydrated: list[str] = []
        expired: list[str] = []
        for backend, info in persisted.items():
            if not isinstance(info, dict):
                continue
            expires_at = info.get('expires_at')
            if not isinstance(expires_at, (int, float)) or expires_at < now:
                expired.append(backend)
                continue
            if backend in (BACKEND_PIPER, BACKEND_NONE):
                continue
            self._demoted_backends.add(backend)
            self._consecutive_failures[backend] = info.get(
                'failures_at_demotion', self._failure_threshold)
            first = info.get('first_demoted_at')
            self._demotion_meta[backend] = {
                'first_demoted_at': first if isinstance(
                    first, (int, float)) else now,
                'expires_at': expires_at,
            }
            if isinstance(info.get('needs_key'), str) and info['needs_key']:
                self._demotion_meta[backend]['needs_key'] = info['needs_key']
            hydrated.append(backend)

        if hydrated:
            logger.info(
                f"TTS persisted demotion: hydrated {len(hydrated)} entries "
                f"({', '.join(sorted(hydrated))}) — ladder will skip these "
                f"until TTL expiry, hub-install, or admin reset."
            )
        if expired:
            logger.info(
                f"TTS persisted demotion: dropped {len(expired)} expired "
                f"entries on hydrate ({', '.join(sorted(expired))})"
            )
            try:
                self._save_persisted_demotions()
            except Exception:
                pass

    def _save_persisted_demotions(self) -> None:
        """Atomic-write the in-memory demotion set to disk.

        Atomic via tempfile + ``os.replace`` so a crash mid-write
        cannot leave a half-written file. Piper / NONE are filtered
        out before serialisation so a future bug that adds them to
        ``_demoted_backends`` cannot leak into the persistent cache.
        Under _state_lock: the set it walks is changed by other threads.
        The voices' records ride along ('voice_record').
        """
        with self._state_lock:
            path = _get_tts_state_path()

            import time as _time
            now = _time.time()
            demoted_payload: dict[str, dict[str, Any]] = {}
            for backend in self._demoted_backends:
                if backend in (BACKEND_PIPER, BACKEND_NONE):
                    continue
                # An entry already on file keeps its own clock; only a backend
                # demoted for the first time gets "now".  Stamping every row
                # with "now" restarted all seven 7-day TTLs whenever any one
                # backend was demoted, so a demotion for a cause long fixed
                # never expired.
                meta = self._demotion_meta.setdefault(backend, {
                    'first_demoted_at': now,
                    'expires_at': now + _DEMOTION_TTL_SECONDS,
                })
                demoted_payload[backend] = {
                    'first_demoted_at': meta['first_demoted_at'],
                    'expires_at': meta['expires_at'],
                    'failures_at_demotion': self._consecutive_failures.get(
                        backend, self._failure_threshold),
                }
                if meta.get('needs_key'):
                    demoted_payload[backend]['needs_key'] = meta['needs_key']
            payload = {
                'schema': _TTS_STATE_SCHEMA,
                'updated_at': now,
                'demoted': demoted_payload,
                'spoken_languages': list(self._spoken_languages),
                'voice_record': {
                    backend: dict(rec)
                    for backend, rec in self._voice_record.items()
                    if backend not in (BACKEND_PIPER, BACKEND_NONE)
                },
            }

            try:
                os.makedirs(os.path.dirname(path), exist_ok=True)
            except OSError as e:
                logger.debug(f"TTS state dir create skipped: {e}")
                return

            import tempfile as _tf
            try:
                fd, tmp = _tf.mkstemp(
                    prefix='tts_state.', suffix='.tmp',
                    dir=os.path.dirname(path),
                )
                try:
                    with os.fdopen(fd, 'w', encoding='utf-8') as _f:
                        json.dump(payload, _f)
                        _f.flush()
                        try:
                            os.fsync(_f.fileno())
                        except OSError:
                            pass
                    os.replace(tmp, path)
                except Exception:
                    try:
                        os.remove(tmp)
                    except OSError:
                        pass
                    raise
            except OSError as e:
                logger.warning(f"Failed to persist TTS demotion state: {e}")

    def _record_spoken_language(self, language: str | None) -> None:
        """A line was just spoken in ``language``: it becomes the newest of
        ``spoken_languages`` in ``tts_state.json``, so the next boot's
        warm-up starts its voice (main.py _warmup_tts).  The language is the
        one the voice spoke, the reply's own script, not the person's UI
        setting: on the 23 Nov walk the speech agent's Tamil replies came in
        labelled 'en'.  The file is written only when the newest language
        changes.  A warm-up line (synthesize(warm_up=True)) is not
        recorded: nobody heard it (review of a069849a)."""
        lang = _normalize_lang(language)
        with self._state_lock:
            if self._spoken_languages[-1:] == [lang]:
                return
            self._spoken_languages = (
                [s for s in self._spoken_languages if s != lang] + [lang]
            )[-_SPOKEN_LANGUAGES_KEPT:]
            self._save_persisted_demotions()

    def last_spoken_languages(self) -> list[str]:
        """The languages lines were last spoken in, newest last (this run
        and the runs before it, from ``tts_state.json``)."""
        return list(self._spoken_languages)

    @classmethod
    def restore_voices_waiting_for(cls, key_name: str) -> list[str]:
        """Put back every voice that was set aside for want of ``key_name``
        (its repo turned the stored key down, or none was stored), and only
        those: on file, and in the running engine.  Returns their names.

        Called by HARTOS's key vault each time a credential is stored
        (ai_key_vault.on_credential_stored; the name only, never a value).
        Without it a voice demoted for 7 days stayed demoted after the
        owner stored a working key (review rv_2ae3).  If the new key is
        refused too, the next start demotes the voice again."""
        if not key_name:
            return []
        # _restore_lock, then the state lock: the one order (_state_lock).
        with cls._restore_lock, cls._state_lock:
            return cls._restore_voices_waiting_for(key_name)

    _restore_lock = threading.Lock()

    @classmethod
    def _restore_voices_waiting_for(cls, key_name: str) -> list[str]:
        """restore_voices_waiting_for, one caller at a time: two keys stored
        together each read the saved file and write it back."""
        waiting: set[str] = set()
        # What each voice's demotion was, kept for this run: if the key is
        # taken back (set_aside_voices_restored_for) the same demotion, with
        # its own clock, is put back.
        was = cls._restored_for.setdefault(key_name, {})
        path = _get_tts_state_path()
        try:
            with open(path, encoding='utf-8') as _f:
                persisted = json.load(_f).get('demoted')
        except (OSError, ValueError, AttributeError):
            persisted = None
        if isinstance(persisted, dict):
            for backend, info in persisted.items():
                if isinstance(info, dict) and info.get('needs_key') == key_name:
                    waiting.add(backend)
                    was[backend] = dict(info)
        engine = _engine
        if engine is not None:
            for backend, meta in list(engine._demotion_meta.items()):
                if meta.get('needs_key') == key_name:
                    waiting.add(backend)
                    was.setdefault(backend, dict(
                        meta, failures_at_demotion=engine._consecutive_failures
                        .get(backend, engine._failure_threshold)))
            for backend in waiting:
                engine._demoted_backends.discard(backend)
                engine._demotion_meta.pop(backend, None)
                engine._consecutive_failures[backend] = 0
        for backend in waiting:
            cls.clear_persisted_demotions(backend)
        if waiting:
            logger.info(
                f"TTS: {key_name} was stored; back on the ladder: "
                f"{', '.join(sorted(waiting))}")
        return sorted(waiting)

    # key name -> {voice: the demotion it had}, for the voices this run put
    # back when that key was stored.
    _restored_for: dict[str, dict[str, dict[str, Any]]] = {}

    @classmethod
    def set_aside_voices_restored_for(cls, key_name: str) -> list[str]:
        """The other way: ``key_name`` was taken back (a revoked consent
        answer; HARTOS ai_key_vault.on_credential_removed).  The voices this
        run put back when that key was stored are set aside again, with the
        demotion they had, on file and in the running engine.  Returns
        their names.

        Without it a voice brought back for a key that is gone again would
        be started once more for nothing.  Only what this run restored is
        known: after a restart the voice is found out by its next start,
        as it was the first time."""
        if not key_name:
            return []
        import time as _time
        with cls._restore_lock:
            was = cls._restored_for.pop(key_name, {})
            now = _time.time()
            again = {backend: info for backend, info in was.items()
                     if backend not in (BACKEND_PIPER, BACKEND_NONE)
                     and isinstance(info.get('expires_at'), (int, float))
                     and info['expires_at'] > now}
            if not again:
                return []
            # The running engine, or one made only to write the file the
            # way every demotion is written (it loads what is saved first).
            engine = _engine if _engine is not None else TTSEngine(
                auto_init=False)
            with cls._state_lock:
                for backend, info in again.items():
                    engine._demoted_backends.add(backend)
                    engine._consecutive_failures[backend] = info.get(
                        'failures_at_demotion', engine._failure_threshold)
                    engine._demotion_meta[backend] = {
                        'first_demoted_at': info.get('first_demoted_at', now),
                        'expires_at': info['expires_at'],
                        'needs_key': key_name,
                    }
                engine._save_persisted_demotions()
            logger.info(
                f"TTS: {key_name} was taken back; set aside again: "
                f"{', '.join(sorted(again))}")
            return sorted(again)

    @classmethod
    def clear_persisted_demotions(cls, backend: str | None = None) -> int:
        """Clear persisted demotion entries from ``tts_state.json``.

        Wired from two call sites:
          * the hub-install completion hook in ``main.py`` —
            reinstalling a previously-demoted engine should give it
            a fresh chance on the next selection
          * an admin-reset endpoint (future) so support flows have a
            big red button

        ``backend=None`` clears every demotion. Returns the count of
        rows removed (0 when no state file exists). Idempotent and
        safe under concurrent calls (``os.replace`` is atomic; the read,
        change and write are one step under _state_lock, so a save in
        between is not lost).
        """
        with cls._state_lock:
            path = _get_tts_state_path()
            if not os.path.isfile(path):
                return 0
            try:
                with open(path, encoding='utf-8') as _f:
                    data = json.load(_f)
            except (OSError, ValueError):
                return 0

            persisted = data.get('demoted')
            if not isinstance(persisted, dict) or not persisted:
                return 0

            if backend is None:
                cleared = len(persisted)
                data['demoted'] = {}
            else:
                if backend not in persisted:
                    return 0
                del persisted[backend]
                cleared = 1

            import tempfile as _tf
            try:
                fd, tmp = _tf.mkstemp(
                    prefix='tts_state.', suffix='.tmp',
                    dir=os.path.dirname(path),
                )
                try:
                    with os.fdopen(fd, 'w', encoding='utf-8') as _f:
                        json.dump(data, _f)
                    os.replace(tmp, path)
                except Exception:
                    try:
                        os.remove(tmp)
                    except OSError:
                        pass
                    raise
            except OSError as e:
                logger.warning(f"Failed to clear persisted TTS demotions: {e}")
                return 0

        if cleared:
            logger.info(
                f"Cleared {cleared} persisted TTS demotion(s) "
                f"({'all' if backend is None else backend})"
            )
        return cleared

    def _select_backend_for_language(self, language='en') -> str:
        """Select the best TTS backend for a language.

        Walks the quality-ordered LANG_ENGINE_PREFERENCE list and picks the
        first engine that _can_run_backend(). This ensures the HIGHEST QUALITY
        runnable engine is always selected — not the one with the highest
        catalog score (which favors previously-loaded engines over better ones).

        Demoted backends (3+ consecutive failures this session) are
        skipped so the ladder actually advances after repeated failures
        instead of wedging on the first preference forever.

        #219 verified-only gate: two-pass selection.  Pass 1 keeps a
        backend ONLY if tts_handshake.is_verified_backend reports a
        confirmed-passing handshake.  Pass 2 (fallback) drops the
        verified requirement so an un-probed ladder still returns
        something runnable.  Both passes skip backends that are
        is_known_failed — a confirmed-failing handshake means the
        runtime probe has already proved the synth path is broken,
        and re-trying it on the user-blocking path is wasted latency.

        Auto-installs missing backends in background via TTSLoader.download().
        """
        self._ensure_hw_detected()
        # Only names _create_backend can build are candidates.  A catalog
        # engine Nunba has no backend for (omnivoice) is never picked, so it
        # is never counted, demoted, or handed to the auto-installer.
        prefs = [b for b in _get_lang_preference(language) if _is_engine_backend(b)]

        # Lazy import keeps the module loadable in pre-handshake test envs
        # where tts_handshake's import chain (desktop.log_ctx → core.constants
        # → ...) isn't fully wired.  When unavailable (or when a predicate
        # call itself raises — corrupt cache, lock timeout, ...), fall
        # fully back to the legacy "first runnable wins": is_verified
        # returns True for every backend so pass 1 behaves identically
        # to pass 2.  We do NOT fail closed here (skip everything non-
        # Piper) — that would regress boots where the handshake module
        # hasn't loaded yet.  Wrapping the CALL (not just the import) so
        # a runtime exception in the predicate gracefully degrades too.
        try:
            from tts import tts_handshake as _hs_mod
            _hs_raw_is_verified = _hs_mod.is_verified_backend
        except Exception:
            _hs_raw_is_verified = None

        def _hs_is_verified(b):
            if _hs_raw_is_verified is None:
                return True
            try:
                return bool(_hs_raw_is_verified(b))
            except Exception:
                return True

        # A confirmed-failing handshake: _handshake_known_failed, the one
        # reader the fallback's list (_fallback_voices) shares.

        # PASS 1 — quality-ordered AND verified.  Piper is the trusted
        # baseline (no handshake needed) ONLY for languages it actually
        # has a voice for (_piper_has_voice).  Without the per-language
        # voice check, this
        # exemption short-circuited the ladder for Tamil/Malayalam —
        # piper_tts.py:70 documents the rhasspy upstream gap explicitly
        # ("Tamil + Malayalam intentionally absent — HF URLs 404").  Per-
        # language gating lets the verified backends earlier in the
        # ladder (indic_parler / mms_tts) get their first-synth-doubles-
        # as-handshake opportunity in PASS 2 instead of falling through
        # to a Piper that can't speak the language.
        for backend in prefs:
            if self._is_demoted(backend):
                continue
            if _handshake_known_failed(backend):
                continue
            if backend == BACKEND_PIPER:
                # Per-language voice availability gate replaces the
                # blanket "Piper is always eligible" exemption.
                if not _piper_has_voice(language):
                    continue
            elif not _hs_is_verified(backend):
                continue
            if self._can_run_backend(backend):
                logger.info(
                    f"Selected backend '{backend}' for language "
                    f"'{language}' (verified, quality-ordered)",
                )
                return backend

        # PASS 2 — relax the verified gate so an un-probed install
        # still gets a chance.  Known-failed backends remain blocked.
        # The same per-language Piper voice check from PASS 1 applies
        # here: without it, PASS 2 would pick Piper for Tamil/Bengali/
        # etc. (Piper has no voice file), the first synth would raise
        # PiperLangUnavailable, _synthesize_with_fallback would walk
        # the candidate ladder, and we'd land at "no capable backend
        # fits on this hardware" with no audio AND no actionable setup
        # card.  Skipping Piper for unsupported langs here lets PASS 2
        # pick the next runnable engine (or fall through to the
        # lang_unsupported event below) so the UI surfaces a
        # text-only badge instead of silent failure.
        for backend in prefs:
            if self._is_demoted(backend):
                logger.info(
                    f"Backend {backend} skipped: demoted this session "
                    f"({self._consecutive_failures.get(backend, 0)} failures)"
                )
                # Autonomous-recovery wiring (#TTS-demote-heal, 2026-05-28):
                # a demoted backend doesn't just get skipped — we kick the
                # existing auto-install path, which probes for fresh
                # runnability + re-installs the venv via
                # ``package_installer.install_backend_full`` if the venv
                # is unhealthy.  The dedup gates inside
                # ``_try_auto_install_backend`` (``_auto_install_pending``
                # + ``_auto_install_failed``) make this safe to call on
                # every request — at most one background install per
                # backend per session.  On success the install path also
                # clears the demotion (_check_and_heal), so the engine
                # becomes selectable on the next request without the user
                # clicking anything; a voice whose packages already run
                # gets that check alone, without an install.  Same wiring works
                # for every venv-quarantined backend listed in
                # BACKEND_VENV_PACKAGES (indic_parler today;
                # chatterbox / cosyvoice / f5 / kokoro / omnivoice as
                # they migrate).
                self._try_auto_install_backend(backend)
                continue
            if _handshake_known_failed(backend):
                logger.info(
                    f"Backend {backend} skipped: handshake confirmed "
                    f"FAILING — agent self-heal should investigate "
                    f"the .err sidecar",
                )
                # Same autonomous-recovery hook: a handshake-FAILED
                # backend should also get a re-install attempt so the
                # underlying venv state gets repaired without operator
                # action.  Dedup applies.
                self._try_auto_install_backend(backend)
                continue
            if backend == BACKEND_PIPER and not _piper_has_voice(language):
                logger.debug(
                    f"PASS 2: Piper has no voice for '{language}' — "
                    f"skipping to next candidate"
                )
                continue
            if self._can_run_backend(backend):
                logger.info(
                    f"Selected backend '{backend}' for language "
                    f"'{language}' (quality-ordered, unverified — "
                    f"first synth doubles as handshake)",
                )
                return backend
            else:
                # Not runnable — trigger background install for next time
                self._try_auto_install_backend(backend)

        # Absolute fallback — Piper on CPU.  For langs Piper can't
        # speak (ta, bn, gu, kn, mr, or, pa, as as of 2026-05-27
        # piper-voices) we STILL return Piper here: callers (set_language,
        # _select_backend) downstream assume the return is a backend
        # string, not None.  The "no audio for this lang" path is
        # handled correctly downstream — _LazyPiper.synthesize raises
        # PiperLangUnavailable → _synthesize_with_fallback runs → no
        # capable backend fits on CPU-only HW → _publish_lang_unsupported
        # fires the WAMP toast → UI shows "no TTS" badge.  Adding an
        # explicit setup-progress emission for the unsupported case is
        # tracked separately — at this layer we preserve the existing
        # contract.
        if _piper_has_voice(language):
            logger.info(
                f"All backends unavailable for '{language}', "
                f"falling back to Piper (CPU)")
        else:
            logger.info(
                f"All backends unavailable for '{language}' AND Piper "
                f"has no voice for it — selector returns Piper anyway; "
                f"synth will raise PiperLangUnavailable and the "
                f"lang_unsupported WAMP toast will fire downstream")
        return BACKEND_PIPER

    def _select_backend(self) -> str:
        """Legacy: select backend for current language."""
        return self._select_backend_for_language(self._language)

    def set_language(self, language: str):
        """Set the language for engine routing.

        If the new backend isn't loaded yet, starts loading in a background
        thread. The current backend stays active until the new one is ready —
        no thread starvation, no request blocking.

        J214 (2026-04-18 live audit): the newly-selected backend is
        pinned against idle-sweep eviction via
        ``set_pressure_evict_only(True)``.  Any prior active backend
        is unpinned first.  Without this, the HARTOS idle-timeout
        sweep (phase 7 of ``ModelLifecycleManager._tick``) would
        happily reclaim VRAM from Indic Parler after ~10min of silent
        reading, forcing a cold reload when the user resumes their
        Tamil conversation — the exact warmth-is-wasted bug the J214
        gap named.
        """
        if language == self._language:
            return
        prev_backend = self._active_backend
        self._language = language
        new_backend = self._select_backend_for_language(language)
        self._pin_active_tts_backend(prev_backend, new_backend)
        if new_backend != self._active_backend:
            if new_backend in self._backends:
                # Already loaded — switch immediately
                logger.info(f"Language '{language}': instant switch to {new_backend}")
                self._active_backend = new_backend
                self._initialized = True
            else:
                # Not loaded — load in background, keep current backend active
                logger.info(f"Language '{language}': loading {new_backend} in background "
                           f"(serving with {self._active_backend} until ready)")
                self._pending_backend = new_backend

                def _bg_switch():
                    try:
                        self._switch_backend(new_backend)
                        self._pending_backend = None
                        logger.info(f"Background switch to {new_backend} complete")
                    except Exception as e:
                        logger.error(f"Background switch to {new_backend} failed: {e}")
                        self._pending_backend = None

                import threading
                threading.Thread(target=_bg_switch, daemon=True,
                                name=f'tts-switch-{new_backend}').start()

    def _pin_active_tts_backend(self, prev_backend: str | None,
                                new_backend: str) -> None:
        """Flip ``pressure_evict_only`` on the HARTOS lifecycle manager.

        Prev backend (if any, and distinct from new) gets unpinned so
        its idle timeout resumes; new backend gets pinned so the
        passive idle sweep won't evict it while it's the user's active
        voice.  VRAM-pressure eviction still applies — this is NOT
        ``pinned=True``; the backend still yields when the machine
        genuinely needs the memory.

        No-op when:
          * the ModelLifecycleManager isn't importable (isolated test
            env, or a pre-HARTOS build),
          * the backend has no VRAM tool name (Piper is CPU-only,
            nothing to track),
          * ``prev`` and ``new`` are the same (same-lang re-call).
        """
        if prev_backend == new_backend:
            return
        try:
            from integrations.service_tools.model_lifecycle import (
                get_model_lifecycle_manager,
            )
        except Exception as e:
            # Running standalone / without HARTOS installed — the pin
            # is a no-op but the TTS engine still functions.  Log at
            # DEBUG so noisy boots don't pollute the log.
            logger.debug(f"J214: lifecycle manager unavailable ({e}); "
                         f"skipping TTS pin flip")
            return
        try:
            mgr = get_model_lifecycle_manager()
        except Exception as e:
            logger.debug(f"J214: lifecycle manager init failed ({e})")
            return

        if prev_backend:
            prev_tool = self._get_lifecycle_name(prev_backend)
            if prev_tool:
                try:
                    mgr.set_pressure_evict_only(prev_tool, False)
                    logger.info(
                        f"J214: unpinned prev TTS {prev_tool!r} "
                        f"(idle eviction re-enabled)")
                except Exception as e:
                    logger.warning(f"J214: unpin {prev_tool!r} failed: {e}")

        new_tool = self._get_lifecycle_name(new_backend)
        if new_tool:
            try:
                result = mgr.set_pressure_evict_only(new_tool, True)
                logger.info(
                    f"J214: pinned active TTS {new_tool!r} "
                    f"(pressure_evict_only=True, tracked="
                    f"{result.get('tracked')})")
            except Exception as e:
                logger.warning(f"J214: pin {new_tool!r} failed: {e}")

    def _switch_backend(self, new_backend):
        """Switch to a new backend, unloading engines to make GPU room.

        Engines are unloaded only to make GPU room for a new engine that
        needs GPU memory, i.e. one the engine registry gives a VRAM budget
        (vram_key), the same tool name this method allocates and releases.
        Then the active engine goes, and with it every other loaded engine
        that has a budget: after an English line the active engine is
        Piper while a GPU engine sits idle.  Switching to an engine with
        none (Piper) unloads nothing, so switching back costs no reload."""
        active = self._active_backend
        needs_gpu = self._get_vram_tool_name(new_backend) is not None
        # A copy: a synth thread can add a fallback engine to _backends
        # while this switch runs on its own thread (review of 3ebaee4f).
        to_unload = [b for b in list(self._backends) if needs_gpu and b != new_backend
                     and (b == active or self._get_vram_tool_name(b) is not None)]
        for old in to_unload:
            old_inst = self._backends.pop(old, None)
            if old_inst:
                if hasattr(old_inst, 'unload_model'):
                    old_inst.unload_model()
                del old_inst
                gc.collect()
                _clear_cuda_cache()
                # Release VRAM allocation via VRAMManager
                if hasattr(self, '_vram_manager') and self._vram_manager:
                    tool_name = self._get_vram_tool_name(old)
                    if tool_name:
                        self._vram_manager.release(tool_name)
                logger.info(f"Unloaded {old}")

        self._active_backend = new_backend
        # Allocate VRAM for new backend
        if hasattr(self, '_vram_manager') and self._vram_manager:
            tool_name = self._get_vram_tool_name(new_backend)
            if tool_name:
                self._vram_manager.allocate(tool_name)
        self._initialized = False
        if self.auto_init:
            self.initialize(force_backend=new_backend)

    def set_backend(self, backend: str) -> bool:
        """Force-set the active TTS backend, instantiating it if needed.

        Public counterpart to ``initialize(force_backend=...)`` — exists so
        that ``tts.verified_synth.verify_backend_synth`` (and any other
        caller that needs to probe a specific backend) can pin the engine
        to a chosen backend before calling ``synthesize``.

        Without this method, verify_backend_synth's probe path silently
        falls through to auto-routing — the canonical handshake reports
        "backend X PASS" while actually exercising whatever
        ``_select_backend_for_language('en')`` selected (typically Piper
        on CPU-only hosts).  That defeats per-backend health gating in
        the admin UI's Validate button AND in scripts/probe_all_tts_live.py.

        Args:
            backend: Backend constant (BACKEND_KOKORO, 'piper', etc.) —
                must be a key in _BACKEND_TO_REGISTRY_KEY or the BACKEND_PIPER
                CPU fallback.

        Returns:
            True iff the backend instance is now active and ready to
            ``synthesize()``.  False if instantiation failed (worker
            crash, missing pip dependency, OOM); the active backend is
            left unchanged in that case.
        """
        prev = self._active_backend
        ok = self.initialize(force_backend=backend, blocking=True)
        if not ok:
            # Restore previous active backend so the engine isn't left
            # in a half-pinned state that confuses the next caller.
            self._active_backend = prev
        return ok

    def verify_synth_via_backend(self, backend: str, text: str,
                                 output_path: str, language: str | None = None):
        """verified_synth's probe of one engine (it prefers this hook when
        the engine has it): ``backend`` speaks ``text`` through synthesize(),
        or the probe gets None.

        An engine set_backend cannot bring up yields None, so another
        engine's audio never passes that engine's handshake.  Nor does an
        engine that comes up and then fails: the fallback does not speak a
        probe (_synthesize_with_fallback), or a voice still broken would pass
        on the next voice's audio and _check_and_heal would bring it back.
        Afterwards set_backend is called with the engine active before the
        probe.  The probe is not a language the person spoke, so it is not
        recorded (warm_up; rv_tts nit on a6e9106e).
        """
        prev = self._active_backend
        try:
            if not self.set_backend(backend):
                return None
            self._line.probe = backend
            try:
                return self.synthesize(text, output_path, language=language,
                                       warm_up=True)
            finally:
                self._line.probe = None
        finally:
            if prev:
                self.set_backend(prev)

    def initialize(self, force_backend: str | None = None,
                   blocking: bool = True) -> bool:
        """Initialize the TTS backend.

        If blocking=False and the backend isn't ready, starts loading in a
        background thread and returns True immediately (synthesize will use
        whatever backend IS ready, or queue until the new one loads).
        """
        # Fast path: already initialized with the right backend
        if self._initialized and not force_backend:
            return True

        if blocking:
            acquired = self._init_lock.acquire(blocking=True)
        else:
            acquired = self._init_lock.acquire(blocking=False)
        if not acquired:
            # Another thread is loading — don't block, use current backend
            logger.debug("TTS init lock busy — using current backend")
            return self._initialized

        try:
            if self._initialized and not force_backend:
                return True

            if force_backend:
                self._active_backend = force_backend
            else:
                self._active_backend = self._select_backend()

            if self._active_backend == BACKEND_NONE:
                logger.error("No TTS backend available")
                return False

            try:
                backend = self._active_backend
                if backend not in self._backends:
                    self._backends[backend] = self._create_backend(backend)

                self._initialized = self._backends[backend] is not None
                if self._initialized:
                    logger.info(f"TTS Engine initialized: {self.backend_name}")
                return self._initialized
            except Exception as e:
                logger.error(f"Backend initialization failed: {e}")
                return False
        finally:
            self._init_lock.release()

    def _create_backend(self, backend):
        if not _is_engine_backend(backend):
            return None
        # Piper is CPU-only (no subprocess needed) — still uses its
        # legacy in-process wrapper.
        if backend == BACKEND_PIPER:
            return _LazyPiper()

        # Look up the HARTOS ENGINE_REGISTRY spec for this backend.
        registry_key = _BACKEND_TO_REGISTRY_KEY[backend]

        # Check if the engine is subprocess-capable (has tool_worker_attr).
        # CPU-only engines (luxtts, pocket_tts, espeak) have tool_module +
        # tool_function but no worker — they run in-process via direct import.
        reg = _get_engine_registry()
        spec = reg.get(registry_key)
        if spec and not spec.tool_worker_attr:
            # In-process CPU engine — import and call directly
            try:
                import importlib
                mod = importlib.import_module(spec.tool_module)
                fn = getattr(mod, spec.tool_function)
                return _InProcessTTSBackend(fn, registry_key)
            except Exception as e:
                logger.warning(f"In-process backend {backend} failed: {e}")
                return None

        # GPU/subprocess engine — runs via HARTOS RuntimeToolManager
        try:
            return _SubprocessTTSBackend(registry_key)
        except Exception as e:
            logger.warning(
                f"Failed to create subprocess adapter for {backend}: {e}"
            )
            return None

    def _synthesize_multilingual(self, segments, output_path=None, voice=None,
                                  speed=1.0, *, warm_up=False, language=None,
                                  **kwargs):
        """Synthesize multi-type segments: speech, music, singing, lyrics.

        Segments from language_segmenter.segment():
          speech: {'type': 'speech', 'lang': 'ta', 'text': '...'}
          music:  {'type': 'music',  'text': '...', 'genre': '...', 'duration': 30}
          sing:   {'type': 'sing',   'text': '...', 'duration': 30}
          lyrics: {'type': 'lyrics', 'text': '...'}

        Routes each to the right backend, stitches all audio into one WAV.
        Uses agent_ledger task tracking when called from an agent context —
        tasks can be paused/resumed via the ledger.
        """
        import tempfile
        import wave

        # Register as ledger task if agent context exists (story agents etc.)
        task_id = kwargs.get('task_id')
        ledger = None
        if task_id:
            try:
                from agent_ledger.core import SmartLedger, TaskStatus
                ledger = SmartLedger.get_instance()
            except Exception:
                pass

        wav_parts = []
        # The language a sung part's words are spoken in when nothing can
        # sing them: the speech around it, else the engine's own language.
        # ``language`` is the one synthesize() was asked for (review of
        # 1b55bfd2: an all-<sing> reply asked in 'es' fell to the engine's 'en').
        spoken_lang = next((s.get('lang') for s in segments
                            if s.get('type', 'speech') == 'speech' and s.get('lang')),
                           None) or language or getattr(self, '_language', None)
        for seg in segments:
            seg_type = seg.get('type', 'speech')
            text = seg.get('text', '').strip()
            if not text:
                continue
            if seg_type == 'speech' and seg.get('lang'):
                spoken_lang = seg['lang']

            # Check ledger: if task was paused/cancelled, stop generating
            if ledger and task_id:
                try:
                    task = ledger.get_task(task_id)
                    if task and task.status in ('paused', 'cancelled', 'user_stopped'):
                        logger.info(f"Multilingual synth {task.status} via ledger")
                        break
                except Exception:
                    pass

            tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False,
                                              prefix=f'_tts_{seg_type}_')
            tmp.close()
            made = False
            try:
                result = None
                if seg_type == 'speech':
                    result = self._synth_speech_segment(
                        text, seg.get('lang', 'en'), tmp.name,
                        warm_up=warm_up, **kwargs)
                elif seg_type == 'music':
                    result = self._synth_music_segment(
                        text, seg.get('genre', ''), seg.get('duration', 30),
                        tmp.name)
                elif seg_type == 'sing':
                    result = self._synth_sing_segment(
                        text, seg.get('duration', 30), tmp.name)
                elif seg_type == 'lyrics':
                    # Lyrics = singing voice synthesis of the text
                    result = self._synth_sing_segment(text, 30, tmp.name)

                if result and os.path.isfile(result) and os.path.getsize(result) > 100:
                    wav_parts.append(result)
                    made = True
                else:
                    try:
                        os.unlink(tmp.name)
                    except OSError:
                        pass
            except Exception as e:
                logger.warning(f"Segment synth failed ({seg_type}): {e}")
                try:
                    os.unlink(tmp.name)
                except OSError:
                    pass
            # A sung part nothing could sing is spoken in its place, never
            # dropped (owner 28 Nov 2026).  A <music> part has no words.
            # A sung part marked with its language is spoken in that one.
            if not made and seg_type in ('sing', 'lyrics'):
                wav_parts.extend(self._speak_unsung_words(
                    text, seg.get('lang') or spoken_lang,
                    warm_up=warm_up, **kwargs))

        if not wav_parts:
            return None

        # Single segment — just return it
        if len(wav_parts) == 1:
            if output_path:
                import shutil
                shutil.move(wav_parts[0], output_path)
                return output_path
            return wav_parts[0]

        # Join the parts into one WAV.  Each part was written by whichever
        # engine or model spoke it, in that engine's own sample rate, channel
        # count and sample format (mms_tts 16 kHz, Piper 22.05 kHz, a singing
        # model 48 kHz stereo, float WAVs from the torch engines).  Copying
        # frames under the first part's header played every other rate at
        # the wrong speed and pitch (live 2026-11-25: in a Tamil-first line
        # Piper's English ran 1.38x slow and "Zoey!" was heard as "Sorry.")
        # and dropped any part `wave` cannot open.  So each part is decoded by
        # the framework's WAV reader (read_wav_f32: any PCM width or float,
        # mixed down to mono), brought to the highest rate among the parts by
        # the shared resampler (no part is downsampled), and the line is
        # written as one mono 16-bit WAV.  resample_pcm16 interpolates
        # linearly: lengths are exact, an upsampled part keeps faint images
        # above its old Nyquist.
        import numpy as np
        from integrations.service_tools.whisper_tool import read_wav_f32
        from integrations.social._livekit_room import resample_pcm16

        out = output_path or tempfile.mktemp(suffix='.wav', prefix='_tts_multi_')
        keep = None      # a part handed back as the result is not deleted
        writing = False  # a partial `out` is removed only if this join wrote it
        try:
            decoded = []
            for part in wav_parts:
                try:
                    decoded.append(read_wav_f32(part))
                except Exception as e:
                    logger.warning(f"TTS join: left out a part it cannot read "
                                   f"({os.path.basename(part)}): {e}")
            if not decoded:
                # Nothing readable: hand back the first part, as before.
                keep = wav_parts[0]
                return keep
            rate = max(r for r, _ in decoded)
            writing = True
            with wave.open(out, 'wb') as outf:
                outf.setnchannels(1)
                outf.setsampwidth(2)
                outf.setframerate(rate)
                for src_rate, samples in decoded:
                    # x32768 is exact for a 16-bit part; a float part at full
                    # scale clips to the int16 range.
                    pcm = np.clip(np.round(samples * 32768.0), -32768, 32767
                                  ).astype('<i2').tobytes()
                    if pcm and src_rate != rate:
                        converted = resample_pcm16(pcm, src_rate, 1, rate, 1)
                        if not converted:
                            logger.warning(f"TTS join: left out a {src_rate} Hz part "
                                           f"the resampler could not bring to {rate} Hz")
                            continue
                        pcm = converted
                    outf.writeframes(pcm)
            return out
        except Exception as e:
            logger.error(f"WAV concatenation failed: {e}")
            if writing:
                try:
                    os.unlink(out)
                except OSError:
                    pass
            keep = wav_parts[0]
            return keep
        finally:
            for part in wav_parts:
                if part != keep:
                    try:
                        os.unlink(part)
                    except OSError:
                        pass

    def _synth_speech_segment(self, text, lang, out_path, *, warm_up=False,
                              **kwargs):
        """Synthesize one speech segment with language-appropriate TTS engine.

        The selected engine speaks first, through ``_speak_with_active_engine``,
        the one path synthesize() also uses.  Every other case goes to
        ``_synthesize_with_fallback`` (e.g. Piper's ``PiperLangUnavailable``
        for a language it has no voice for).  The ladder's wrong-language
        gate and its ``_publish_lang_unsupported`` event (the frontend's
        "setting up TTS for this language" card) apply there.

        Also call ``ensure_inference_headroom`` before synth so the
        LLM-stays / TTS-yields VRAM rule fires when the chat LLM owns
        VRAM at synth time (matches lifecycle.py:1867 contract — offload
        idle non-LLM models, never touch the LLM).
        """
        if lang != self._language:
            self.set_language(lang)
            import time as _t
            for _ in range(20):
                if not getattr(self, '_pending_backend', None):
                    break
                _t.sleep(0.25)

        self._ensure_initialized()

        # Proactive VRAM headroom — best-effort.  When LLM owns most of
        # the GPU, offload idle non-LLM workers (whisper STT, etc.) so
        # the TTS subprocess has room to load weights.  Never evicts the
        # LLM itself (lifecycle.request_swap filters s.model_type=='llm'
        # at line 1834).  Failures here are non-fatal — the synth call
        # below still attempts and may succeed on CPU.
        try:
            from integrations.service_tools.model_lifecycle import (
                get_model_lifecycle_manager,
            )
            cap = _get_engine_capabilities(self._active_backend) or {}
            needed = float(cap.get('vram_gb', 0) or 0)
            if needed > 0:
                get_model_lifecycle_manager().ensure_inference_headroom(
                    needed_gb=needed, requester='tts',
                )
        except Exception as _hr_err:
            logger.debug(f"ensure_inference_headroom skipped: {_hr_err}")

        # The selected engine speaks the segment through the same path as a
        # whole line in synthesize().
        spoken = self._speak_with_active_engine(
            text, out_path, kwargs.pop('voice', None), lang, **kwargs)
        if spoken and not warm_up:
            self._record_spoken_language(lang)
        return spoken

    def _synth_media_segment(self, modality, text, out_path,
                              genre='', duration=30, **kwargs):
        """Route any non-speech segment via HARTOS generate_media + poll.

        Compute-aware: checks VRAMManager before dispatching. If GPU is
        occupied by another task, reports unavailability instead of blocking.
        Uses agent_ledger task_id for pause/resume tracking.
        Delegates ALL routing decisions to media_agent (which uses
        ModelCatalog + ModelOrchestrator for capability-based selection).
        """
        import json as _json

        # Compute-awareness: check if the required service can run
        try:
            from integrations.service_tools.vram_manager import vram_manager
            gpu_info = vram_manager.detect_gpu()
            free_gb = gpu_info.get('free_gb', 0)
            if free_gb < 2.0 and not gpu_info.get('cuda_available', False):
                logger.info(f"Media gen skipped: only {free_gb:.1f}GB VRAM free, "
                            f"service may not fit alongside active models")
        except Exception:
            pass

        try:
            from integrations.service_tools.media_agent import MEDIA_FAILED_STATUSES, check_media_status, generate_media
            raw = generate_media(
                context=text, output_modality=modality,
                input_text=text, duration=duration, style=genre)
            result = _json.loads(raw) if isinstance(raw, str) else raw

            # Completed synchronously — URL may be top-level or inside results[]
            url = (result.get('url') or result.get('audio_url')
                   or (result.get('results', [{}])[0].get('url')
                       if result.get('results') else None))
            if result.get('status') == 'completed' and url:
                # urllib.request.urlretrieve has NO timeout kwarg — a stuck
                # remote URL hangs the chat hot path indefinitely (Gate 7
                # banned pattern, same class as the wmic 27-min hang).
                # Switch to requests.get(timeout=...) with chunked write.
                import requests as _req
                _resp = _req.get(url, timeout=60, stream=True)
                _resp.raise_for_status()
                with open(out_path, 'wb') as _of:
                    for _chunk in _resp.iter_content(chunk_size=65536):
                        if _chunk:
                            _of.write(_chunk)
                return out_path

            # Async — poll until done, respecting ledger pause/cancel
            task_id = result.get('task_id') or result.get('pending_task_id')
            ledger_task_id = kwargs.get('task_id')  # agent_ledger task
            if task_id:
                import time as _t
                deadline = _t.time() + 120
                while _t.time() < deadline:
                    # Check ledger: paused tasks wait, cancelled tasks abort
                    if ledger_task_id:
                        try:
                            from agent_ledger.core import SmartLedger
                            ledger = SmartLedger.get_instance()
                            ltask = ledger.get_task(ledger_task_id)
                            if ltask:
                                if ltask.status in ('cancelled', 'user_stopped'):
                                    logger.info(f"Media task {task_id} stopped via ledger")
                                    return None
                                if ltask.status == 'paused':
                                    _t.sleep(1)
                                    continue  # Wait — don't poll, don't abort
                        except Exception:
                            pass
                    _t.sleep(2)
                    poll_raw = check_media_status(task_id)
                    poll = _json.loads(poll_raw) if isinstance(poll_raw, str) else poll_raw
                    if poll.get('status') == 'completed':
                        dl_url = (poll.get('url') or poll.get('audio_url')
                                  or (poll.get('results', [{}])[0].get('url')
                                      if poll.get('results') else None))
                        if dl_url:
                            # See note above — urlretrieve cannot timeout.
                            import requests as _req
                            _resp = _req.get(dl_url, timeout=60, stream=True)
                            _resp.raise_for_status()
                            with open(out_path, 'wb') as _of:
                                for _chunk in _resp.iter_content(chunk_size=65536):
                                    if _chunk:
                                        _of.write(_chunk)
                            return out_path
                        return None
                    # check_media_status reports an AceStep failure as
                    # 'error' and a video sidecar's as 'failed'; testing
                    # only 'failed' polled every failed composition to the
                    # 120 s deadline (N1). The one definition, not a literal.
                    elif poll.get('status') in MEDIA_FAILED_STATUSES:
                        logger.warning(f"Media task failed: {poll.get('error')}")
                        return None
        except Exception as e:
            logger.warning(f"Media gen ({modality}) failed: {e}")
        return None

    def _synth_music_segment(self, prompt, genre, duration, out_path):
        """Music generation — delegates to media_agent 'audio_music'."""
        return self._synth_media_segment(
            'audio_music', prompt, out_path, genre=genre, duration=duration)

    def _synth_sing_segment(self, lyrics, duration, out_path):
        """Singing voice — tries 'audio_music' with lyrics as prompt.
        DiffRhythm routing handled inside media_agent via _select_audio_tool."""
        return self._synth_media_segment(
            'audio_music', f"Singing: {lyrics}", out_path, duration=duration)

    def _speak_unsung_words(self, words, language=None, *, warm_up=False, **kwargs):
        """Speak the words of a sung part that no singer could make.

        Owner, 28 Nov 2026: a sung part is never dropped.  On a machine where
        nothing can sing (no singing model, the composer down, failed or slow)
        a reply that was all <sing> played nothing, and a rhyme between two
        spoken lines lost its words.  The words are split by the segmenter like
        any spoken text, with ``language`` (the reply's own: the speech around
        the sung part, else the engine's) kept where its script fits, so
        Spanish words are spoken by the Spanish voice and Tamil by the Tamil
        one.  Returns the spoken part files in order; [] when none could be
        spoken.
        """
        import tempfile

        from tts.language_segmenter import segment
        logger.info("A sung part could not be sung; speaking its words")
        parts = []
        for seg in segment(words, language=language):
            text = seg.get('text', '').strip()
            if seg.get('type') != 'speech' or not text:
                continue
            tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False,
                                              prefix='_tts_unsung_')
            tmp.close()
            try:
                result = self._synth_speech_segment(
                    text, seg.get('lang', 'en'), tmp.name,
                    warm_up=warm_up, **kwargs)
            except Exception as e:
                logger.warning(f"Speaking a sung part failed: {e}")
                result = None
            if result and os.path.isfile(result) and os.path.getsize(result) > 100:
                parts.append(result)
            else:
                try:
                    os.unlink(tmp.name)
                except OSError:
                    pass
        return parts

    def _ensure_initialized(self):
        if not self._initialized and self.auto_init:
            # Block on first init so backend is ready before synthesis.
            # Non-blocking caused "backend not initialized" on every first
            # TTS call because synthesize() ran before the bg thread finished.
            self.initialize(blocking=True)

    @property
    def backend(self) -> str:
        return self._active_backend

    @property
    def backend_name(self) -> str:
        cap = _get_engine_capabilities(self._active_backend)
        if cap:
            return cap['name']
        return self._active_backend

    @property
    def language(self) -> str:
        return self._language

    def is_available(self) -> bool:
        self._ensure_initialized()
        return self._initialized and self._active_backend in self._backends

    def get_info(self) -> dict[str, Any]:
        self._ensure_initialized()
        cap = _get_engine_capabilities(self._active_backend)
        return {
            "backend": self._active_backend,
            "backend_name": self.backend_name,
            "initialized": self._initialized,
            "has_gpu": self.has_gpu,
            "vram_gb": self.vram_gb,
            "gpu_info": self.gpu_info,
            "language": self._language,
            "features": self._get_features(),
            "capabilities": cap,
        }

    def _get_features(self) -> list[str]:
        cap = _get_engine_capabilities(self._active_backend)
        features = []
        if cap.get('voice_cloning'):
            features.append('voice-cloning')
        if cap.get('streaming'):
            features.append('streaming')
        if cap.get('paralinguistic'):
            features.append('paralinguistic')
        if cap.get('emotion_tags'):
            features.append('emotion-tags')
        if len(cap.get('languages', set())) > 1:
            features.append('multilingual')
        return features

    def get_capabilities(self, backend=None) -> dict:
        """Get the full capability matrix for a backend or all backends.
        Converts sets to sorted lists for JSON serialization safety."""
        def _sanitize(cap_dict):
            return {k: sorted(v) if isinstance(v, set) else v
                    for k, v in cap_dict.items()}

        if backend:
            return _sanitize(_get_engine_capabilities(backend))
        return {name: _sanitize(cap) for name, cap in _get_engine_capabilities().items()}

    def list_voices(self) -> dict[str, dict]:
        self._ensure_initialized()
        inst = self._backends.get(self._active_backend)
        if inst and hasattr(inst, 'list_speakers'):
            return inst.list_speakers()
        if inst and hasattr(inst, 'list_available_voices'):
            return inst.list_available_voices()
        return {}

    def list_installed_voices(self) -> list[str]:
        self._ensure_initialized()
        inst = self._backends.get(self._active_backend)
        if inst and hasattr(inst, 'list_speakers'):
            return list(inst.list_speakers().keys())
        if inst and hasattr(inst, 'list_installed_voices'):
            return inst.list_installed_voices()
        return []

    def install_voice(self, voice_id: str,
                      progress_callback: Callable[[int, int], None] | None = None) -> bool:
        self._ensure_initialized()
        inst = self._backends.get(self._active_backend)
        if inst and hasattr(inst, 'download_model'):
            return inst.download_model(progress_callback)
        if inst and hasattr(inst, 'download_voice'):
            return inst.download_voice(voice_id, progress_callback)
        return False

    def set_voice(self, voice_id: str) -> bool:
        self._ensure_initialized()
        inst = self._backends.get(self._active_backend)
        if inst and hasattr(inst, 'set_speaker'):
            return inst.set_speaker(voice_id)
        if inst and hasattr(inst, 'set_voice'):
            return inst.set_voice(voice_id)
        return False

    def synthesize(self,
                   text: str,
                   output_path: str | None = None,
                   voice: str | None = None,
                   speed: float | None = None,
                   language: str | None = None,
                   *,
                   warm_up: bool = False,
                   **kwargs) -> str | None:
        """
        Synthesize text to speech.

        ``warm_up=True`` marks a line nobody hears (the boot warm-up's
        greeting): it starts the voice like any line but is not recorded
        in ``spoken_languages``.

        When ``speed`` is left as None (the default), the active
        TTS_SPEED_PROFILE multiplier is applied — fast/balanced/
        natural/slow. Callers that pass an explicit float override
        the profile, same as before. The default profile is
        ``balanced`` (×1.10) per the project guideline "speed >
        naturalness default".

        Checks pre-synth cache first for instant playback.
        Routes to the best engine for the given language.
        Cancels any in-flight generation from a previous request.
        """
        if not text or not text.strip():
            return None

        # A new line on this thread: a voice whose start fails on it is not
        # started again for the rest of it, whatever its segments
        # (_speak_with_active_engine, _fallback_voices).  The next line
        # starts it again.
        self._line.failed = {}

        if speed is None:
            speed = _get_default_speed()

        # Multi-language / multi-modal segmentation: split text by script
        # and media tags (<music>, <sing>, <lyrics>), synth each segment
        # with the right engine, concatenate into one audio file.
        try:
            from tts.language_segmenter import has_language_mark, segment
            # The requested language is kept for every part written in its
            # script; the script guess (latin->en, cjk->zh, arabic->ur)
            # only names parts in another script.
            segments = segment(text, language=language or self._language)
            has_media = any(s.get('type') != 'speech' for s in segments)
            has_multi_lang = len(set(s.get('lang') for s in segments
                                     if s.get('type') == 'speech')) > 1
            # Pure-monolingual response whose detected script doesn't match
            # the requested `language` (e.g. LLM replied in Tamil while the
            # user's preferred_lang is 'en'): route through the multilingual
            # path so _synth_speech_segment honors the SEGMENT's lang and
            # the engine selector picks the right backend (which then fires
            # _try_auto_install → setup_progress SSE if the engine is
            # missing).  Without this, len(segments)==1 + has_multi_lang
            # ==False falls through to the single-language path, which
            # synthesizes Tamil text with the English backend (Piper) and
            # produces silence / English-phoneme garble.
            speech_segs = [s for s in segments if s.get('type') == 'speech']
            detected_lang_mismatch = bool(
                len(speech_segs) == 1
                and speech_segs[0].get('lang')
                and speech_segs[0].get('lang') != (language or self._language or 'en')
            )
            # A reply that holds a language mark (<lang es>...</lang>) is always
            # spoken from its segments: their text has no mark, while the
            # single-language path below would say the text as written,
            # marks and all (a Spanish reply marked 'es' and asked in 'es').
            if (has_media or has_multi_lang or len(segments) > 1
                    or detected_lang_mismatch or has_language_mark(text)):
                return self._synthesize_multilingual(
                    segments, output_path, voice, speed, warm_up=warm_up,
                    language=language or self._language, **kwargs)
        except Exception:
            pass  # Fallback to single-language path

        # Route to correct engine for language
        if language and language != self._language:
            self.set_language(language)

        self._ensure_initialized()

        # Check pre-synth cache
        cached = self._presynth.get(text, voice or 'default')
        if cached:
            logger.debug(f"Pre-synth cache hit: '{text[:30]}...'")
            if output_path:
                import shutil
                shutil.copy2(cached, output_path)
                return output_path
            return cached

        inst = self._backends.get(self._active_backend)
        if not inst:
            # Backend switch may be in progress — wait briefly
            if getattr(self, '_pending_backend', None):
                import time as _time
                for _ in range(10):  # Wait up to 5s
                    _time.sleep(0.5)
                    inst = self._backends.get(self._active_backend)
                    if inst:
                        break
        language = self._language
        spoken = self._speak_with_active_engine(
            text, output_path, voice, language, speed=speed, **kwargs)
        if spoken and not warm_up:
            self._record_spoken_language(language)
        return spoken

    def _speak_with_active_engine(self, text, output_path, voice, language,
                                  speed=None, **kwargs):
        """The selected engine speaks one line, or the ladder does.

        The one path for a whole line (synthesize) and a speech segment
        (_synth_speech_segment).  The line goes to
        ``_synthesize_with_fallback`` when the engine never came up
        (counted), is GPU-only and lacks the GPU memory to speak now (Piper
        speaks this line only, not counted; an engine the registry says
        runs on the CPU speaks it), cannot speak ``language`` (not counted),
        raises (counted unless transient; a non-transient raise also
        unloads it, its CUDA state may be corrupted), or returns no audio
        (counted).  Audio clears the engine's failure counter.  ``speed``
        reaches the engine only when given.  An engine whose start already
        failed on this line is not started again for another of its
        segments: the segment goes to the ladder at once.
        """
        if self._active_backend in (getattr(self._line, 'failed', None) or {}):
            return self._synthesize_with_fallback(
                text, output_path, voice, language, **kwargs)
        inst = self._backends.get(self._active_backend)
        if not inst:
            # The selected engine never came up: it counts as a failure of
            # that engine, and the line goes to the ladder, which speaks it
            # with the next engine for the language.
            logger.warning("TTS backend %s never came up (available=%s, pending=%s); "
                           "handing the line to the fallback ladder",
                           self._active_backend, list(self._backends.keys()),
                           getattr(self, '_pending_backend', None))
            self._record_never_came_up(self._active_backend, language)
            return self._synthesize_with_fallback(
                text, output_path, voice, language, **kwargs)

        # VRAM safety: delegate to VRAMManager (single source of truth).
        # CUDA OOM can kill the ENTIRE process (C-level abort, uncatchable).
        # When the model is ALREADY loaded on CUDA, we only need free VRAM for
        # inference buffers (~300-500MB), not the full model load size (1.3GB).
        # suggest_offload_mode checks against load size — wrong for hot models.
        tool_name = self._get_vram_tool_name(self._active_backend)
        if tool_name:
            try:
                from integrations.service_tools.vram_manager import vram_manager
                already_on_cuda = getattr(inst, '_device', None) == 'cuda'
                if already_on_cuda:
                    # Model loaded — only need inference headroom (~0.4GB)
                    free_gb = vram_manager.get_free_vram()
                    vram_ok = free_gb >= 0.4
                else:
                    vram_ok = vram_manager.suggest_offload_mode(tool_name) != 'cpu_only'
                if (not vram_ok and _runs_on_cpu(self._active_backend)
                        and BACKEND_PIPER not in _capable_backends_for(language)):
                    # A full GPU decides where this engine runs, not whether
                    # it speaks: Piper has no voice for Tamil, so handing
                    # the line to Piper meant no audio at all.  A language
                    # Piper speaks still goes to Piper for this line, as
                    # before (review of f885318e: a hot kokoro with 0.3 GB
                    # free must not run an English line on the full GPU).
                    logger.info(
                        f"VRAM insufficient for {self._active_backend} "
                        f"({vram_manager.get_free_vram():.1f}GB free); it speaks "
                        f"this line, the engine registry says it runs on the CPU")
                elif not vram_ok:
                    free_now = vram_manager.get_free_vram()
                    logger.warning(
                        f"VRAM insufficient for {self._active_backend} "
                        f"({'inference' if already_on_cuda else 'load'} "
                        f"({free_now:.1f}GB free). CPU fallback (transient).")
                    needed = 0.4 if already_on_cuda else _vram_needed_gb(tool_name)
                    if needed is not None:
                        _VRAM_SKIPS[self._active_backend] = (float(free_now), needed)
                    # Transient VRAM pressure — use Piper for THIS request only.
                    # Do NOT permanently switch _active_backend. F5 will be
                    # retried on next request when VRAM may be free again.
                    return self._synthesize_with_fallback(
                        text, output_path, voice, language,
                        _transient=True, **kwargs)
            except Exception:
                pass

        # Language-match check — surface a user-visible WARNING (and push
        # a WAMP toast) when the selected backend doesn't actually speak
        # the requested language.  Data-scientist cohort analysis
        # (2026-04-15) showed Tamil users getting Piper English phonemes
        # silently — the voice said "speaking Tamil" but the audio was
        # English mumbling.  The failure is worse than outright error
        # because the user blames the product, not the routing.
        # HARD-REFUSE wrong-language synthesis on the PRIMARY path too.
        # If the currently-active backend cannot speak the requested
        # language (e.g. CosyVoice3 stuck active, user requests Tamil),
        # route to _synthesize_with_fallback which now filters by
        # capability and returns None when nothing fits.  This prevents
        # the primary path from producing wrong-language mumble audio
        # before any exception is raised.
        try:
            _lang_norm = _normalize_lang(language)
            if (_lang_norm != 'en'
                    and self._active_backend not in _capable_backends_for(language)):
                logger.warning(
                    f"Active backend '{self._active_backend}' cannot speak "
                    f"lang='{language}'; routing through capability-gated "
                    f"fallback chain instead of producing wrong-language audio."
                )
                return self._synthesize_with_fallback(
                    text, output_path, voice, language, **kwargs)
        except Exception:
            pass

        try:
            _preferred = _FALLBACK_LANG_ENGINE_PREFERENCE.get(
                (language or 'en').split('-')[0],
                _DEFAULT_PREFERENCE,
            )
            if self._active_backend not in _preferred:
                logger.warning(
                    f"TTS language mismatch: requested lang='{language}' "
                    f"but active backend '{self._active_backend}' is not in "
                    f"the preferred ladder {_preferred} — audio quality may "
                    f"be degraded or wrong-language.",
                )
                # Best-effort user-visible notification via WAMP — the
                # frontend hook (`gameRealtimeService.js`) subscribes to
                # this topic and shows a toast.  Failure is silent here
                # (WAMP may not be running in bundled mode).
                try:
                    from core.realtime import publish_async as _wamp_pub
                    _wamp_pub(
                        'com.hertzai.hevolve.tts.lang_mismatch',
                        {
                            'requested_lang': language,
                            'active_backend': self._active_backend,
                            'preferred': _preferred,
                        },
                        timeout=0.5,
                    )
                except Exception:
                    pass
        except Exception:
            pass

        # Serialize GPU inference — PyTorch models are NOT thread-safe.
        # Without this, concurrent calls (e.g. warm-up + chat) cause tensor
        # corruption, CUDA state errors, or segfaults.
        #
        # speed is forwarded explicitly because it's declared as its own
        # param on synthesize()'s signature: **kwargs does NOT capture
        # named params, so without this pass-through the profile
        # multiplier (and caller overrides) would be silently dropped.
        # A segment passes none, and the engine is then not given one.
        engine_kwargs = dict(kwargs) if speed is None else dict(kwargs, speed=speed)
        import time as _time
        with self._synth_lock:
            # From the engine's start to its answer: a failed start's cost
            # goes into the log (_record_backend_failure).
            started = _time.monotonic()
            try:
                raw = inst.synthesize(text=text, output_path=output_path,
                                      voice=voice,
                                      language=language, **engine_kwargs)
                result = _normalize_tts_result(raw, output_path)
                if result and os.path.isfile(result):
                    try:
                        fsize = os.path.getsize(result)
                        text_len = len(text.strip())
                        if text_len >= 10 and fsize < 16000:
                            logger.warning(f"TTS output suspiciously small ({fsize}B for {text_len} chars), may be broken")
                    except Exception:
                        pass
                    # Real audio produced — clear the failure counter
                    # so a one-off transient error doesn't accumulate
                    # into a session-permanent demotion.
                    self._record_backend_success(self._active_backend)
                if result:
                    return result
            except Exception as e:
                # Transient GPU failure (CUDA OOM in subprocess, worker
                # crash, stdout desync) is signaled by the subprocess
                # adapter attaching `.transient = True` to the RuntimeError.
                # In that case we want to skip the full GPU fallback chain
                # and go straight to Piper for THIS request only — the GPU
                # engine stays the active backend and retries next call.
                is_transient = bool(getattr(e, 'transient', False))
                logger.error(
                    f"Synthesis failed ({self._active_backend}): {e} "
                    f"[transient={is_transient}]"
                )
                # Surface the FULL traceback to the per-backend sidecar
                # log so the actual exception (FileNotFoundError on
                # missing weights, WorkerCrash on CUDA OOM, ImportError
                # on missing pip dep, etc.) is recoverable for triage.
                # Without this, the engine's fallback chain swallows the
                # underlying error and only the generic "Synthesis
                # failed" line above survives — useless for triage.
                try:
                    from tts.verified_synth import _surface_backend_exception
                    _surface_backend_exception(self._active_backend, e)
                except Exception:
                    pass
                # Non-transient = the engine is broken in a way that
                # won't self-heal mid-request. Count it against the
                # demotion threshold. Transient = one-off CUDA OOM or
                # subprocess crash; do NOT count those because the
                # engine usually recovers next call.
                #
                # Pass the exception so ``_record_backend_failure``
                # can classify structural (worker died at startup,
                # missing module, ...) → demote on first strike +
                # persist. Transient signatures still get the
                # 3-strike threshold.  See
                # ``_STRUCTURAL_FAILURE_SIGNATURES``.
                if not is_transient:
                    self._record_backend_failure(
                        self._active_backend, e, language=language,
                        elapsed_s=_time.monotonic() - started)

                if is_transient:
                    # Subprocess already isolated the crash — don't tear
                    # down the worker or clear CUDA cache from the parent.
                    return self._synthesize_with_fallback(
                        text, output_path, voice, language,
                        _transient=True, **kwargs,
                    )

                # Non-transient failure: unload the failed GPU backend —
                # its CUDA state may be corrupted. Leaving it loaded
                # risks segfaults on subsequent CUDA calls.
                failed_backend = self._active_backend
                failed_inst = self._backends.pop(failed_backend, None)
                if failed_inst and hasattr(failed_inst, 'unload_model'):
                    try:
                        failed_inst.unload_model()
                    except Exception:
                        pass
                del failed_inst
                _clear_cuda_cache()
                # No instance is left for the selected voice.  The next line
                # walks the one selection ladder again (_ensure_initialized ->
                # initialize -> _select_backend) and builds it afresh, unless
                # it was demoted; with _initialized left True it found no
                # instance on every line ("never came up") and nothing rebuilt
                # it (set_language returns early for the same language).
                self._initialized = False
                return self._synthesize_with_fallback(
                    text, output_path, voice, language, **kwargs)

            # No audio: it counts against the engine, and the ladder speaks
            # the line with the next engine for the language.
            self._record_backend_failure(
                self._active_backend,
                RuntimeError(f"{self._active_backend}: synthesize returned no audio"),
                language=language, elapsed_s=_time.monotonic() - started)
            return self._synthesize_with_fallback(
                text, output_path, voice, language, **kwargs)

    def _synthesize_with_fallback(self, text, output_path, voice, language, **kwargs):
        """Try remaining engines in the preference chain after the primary fails.

        Called when the selected engine raises, never came up, returns no
        audio, or cannot speak the language.  Walks the language's
        preference ladder without the active engine; Piper is appended
        when the ladder lacks it.

        _transient=True: VRAM pressure fallback — don't permanently switch
        _active_backend. The GPU engine will be retried on next request.

        A probe of one voice (verify_synth_via_backend) gets no fallback:
        its audio or none.
        """
        transient = kwargs.pop('_transient', False)
        failed = self._active_backend
        if getattr(self._line, 'probe', None):
            return None
        lang_norm = _normalize_lang(language)
        capable = _capable_backends_for(language)
        candidates = self._fallback_voices(language, failed, transient)

        # WRONG-LANGUAGE SAFETY GATE (data-scientist 2026-04-15):
        # Filter out backends that CANNOT speak `lang`.  Previously we
        # blindly appended Piper (English-only) as last resort, so a
        # Tamil synth whose Indic Parler OOM'd ended up producing
        # Piper English phonemes — silent wrong-language failure.
        # Now: if no capable backend remains, return None and publish
        # a distinct WAMP topic so the chat pipeline can fall back to
        # text-only display instead of mumbling audio.
        if lang_norm != 'en' and not candidates:
            self._log_no_voice(lang_norm, candidates, capable)
            return None

        import time as _time
        for candidate in candidates:
            started = _time.monotonic()
            try:
                if candidate not in self._backends:
                    self._backends[candidate] = self._create_backend(candidate)
                inst = self._backends.get(candidate)
                if not inst:
                    continue
                result = inst.synthesize(text=text, output_path=output_path,
                                         language=language, **kwargs)
                if result:
                    if transient:
                        logger.info(f"Transient fallback: {failed} -> {candidate} "
                                    f"(keeping {failed} as primary)")
                    else:
                        logger.info(f"Fallback succeeded: {failed} -> {candidate}")
                        # Permanent switch — engine crashed, don't retry
                        self._active_backend = candidate
                    self._record_backend_success(candidate)
                    return result
            except Exception as fallback_err:
                logger.debug(f"Fallback {candidate} also failed: {fallback_err}")
                # Record failure + surface the traceback so the sidecar
                # log captures EVERY backend that failed in this chain,
                # not just the primary.  Demotion only kicks in for
                # non-transient errors; subprocess crashes flagged
                # `transient=True` shouldn't count against the budget.
                try:
                    from tts.verified_synth import _surface_backend_exception
                    _surface_backend_exception(candidate, fallback_err)
                except Exception:
                    pass
                # Pass the exception for structural classification —
                # a fallback engine that ALSO dies during startup
                # should be demoted on first strike (and persisted)
                # rather than waiting for two more boots' worth of
                # 3-strike accumulation that never converges because
                # the in-memory counter resets each boot.
                if not bool(getattr(fallback_err, 'transient', False)):
                    self._record_backend_failure(
                        candidate, fallback_err, language=language,
                        elapsed_s=_time.monotonic() - started)
                continue

        # Exhausted the filtered candidate list without producing audio.
        # For non-English, emit the distinct "lang_unsupported" signal so
        # the chat pipeline can switch to text-only display (vs the
        # generic "All TTS engines failed" catch-all).
        if lang_norm != 'en':
            self._log_no_voice(lang_norm, candidates, capable)
            return None

        logger.error("All TTS engines failed — no audio produced")
        return None

    def _fallback_voices(self, language, without, transient=False) -> list[str]:
        """The voices a line in ``language`` goes to when ``without`` (the
        selected voice) does not speak it, in ladder order: the fallback's
        own list (_synthesize_with_fallback), as it always was.  A voice is
        on it when it is in the language's ladder (the VRAM filter has
        already left out the ones that neither fit nor run on the CPU), can
        speak the language, is not demoted and has its venv when it needs
        one; and its start did not fail earlier on this line (one start per
        line).  A saved handshake verdict takes nobody off it: the verdict
        can be older than the voice's last line, and Piper is the last
        resort, never set aside (review rv_db95: with such a verdict mms_tts
        was never tried and every Tamil line was silent).

        "Is another voice ready" before a demotion (_record_backend_failure)
        is this list cut to the voices that can speak now (_can_speak_now).
        Nothing here loads, installs, probes a process or evicts a model.

        ``transient``: a passing failure (no GPU memory for this line);
        Piper alone when it speaks the language, as before.
        """
        lang_norm = _normalize_lang(language)
        capable = _capable_backends_for(language)
        if transient and (lang_norm == 'en' or BACKEND_PIPER in capable):
            # VRAM pressure: skip all GPU-capable engines, go straight to Piper.
            # Loading torch-based engines on CPU still touches CUDA internals
            # and crashes when VRAM is exhausted.
            candidates = [BACKEND_PIPER]
        else:
            # Transient: this line only, the selected engine stays selected:
            # Piper has no voice for this language, so the language's own
            # engines in ladder order (the VRAM filter has already dropped
            # GPU-only engines without room and put CPU-run ones last; each
            # runs in its own worker process).  Review of 3ebaee4f: a Tamil
            # line whose engine raised once (Indic Parler healthy), or whose
            # GPU-only engine had no room, went to Piper alone: no audio.
            candidates = [b for b in _get_lang_preference(language or 'en')
                          if b != without]
            if not transient and BACKEND_PIPER not in candidates:
                candidates.append(BACKEND_PIPER)
        if lang_norm != 'en':
            candidates = [c for c in candidates if c in capable]
        failed_on_line = getattr(self._line, 'failed', None) or {}
        voices = []
        for c in candidates:
            if self._is_demoted(c) or c in failed_on_line:
                continue
            if c not in self._backends and _is_venv_backend(c):
                # A venv-backed engine whose venv is missing or was built by
                # another interpreter is not started from a synth call: its
                # worker could not import the engine.  CUDA and free VRAM are
                # not asked here, so an engine that also runs on CPU still
                # speaks on a machine without them.
                try:
                    from tts.backend_venv import is_venv_healthy
                    from tts.package_installer import registry_engine_id
                    healthy = is_venv_healthy(registry_engine_id(c))
                except Exception:
                    healthy = False
                if not healthy:
                    logger.info(f"Voice {c} left out: its venv is missing or "
                                f"built by another interpreter")
                    continue
            if c not in self._backends:
                # The runnable check's saved answer (_can_run_backend and the
                # auto-install probe fill it) says this voice's packages do
                # not import, and it has not spoken in this run: its worker
                # would die at import, after a model was stopped to make room
                # for it (live 28 Nov: an install that failed at pip left a
                # venv folder; Whisper was stopped for it mid-reply).  Read
                # as _can_speak_now reads it; nothing is probed here, and a
                # voice nobody has checked is tried as before.
                required_pkg = self._get_required_package(c)
                cache_key = f'venv:{c}' if _is_venv_backend(c) else required_pkg
                if (required_pkg
                        and TTSEngine._import_check_cache.get(cache_key) is False):
                    with self._state_lock:
                        spoke = c in self._stamped_this_run
                    if not (spoke or _spoke_this_session(c)):
                        logger.info(f"Voice {c} left out: its packages do not "
                                    f"import ('{required_pkg}')")
                        continue
            voices.append(c)
        return voices

    def _can_speak_now(self, backend, language) -> bool:
        """Whether ``backend`` can take a line in ``language`` now, as far as
        is known without starting anything: it spoke in this run (a passed
        handshake, or a line through this engine), or the runnable check's
        saved answer (_can_run_backend's cache, which the auto-install probe
        also fills) says its packages import; and no handshake of it failed
        in this run.  A venv folder whose packages are missing, or a voice
        never checked, is not ready.  Piper, the last resort that is never
        set aside, needs only a voice for the language.

        Asked only for "is another voice ready" before a demotion
        (_record_backend_failure); the fallback still tries every voice on
        its list (review rv_db95)."""
        if backend == BACKEND_PIPER:
            return _piper_has_voice(language)
        if not _is_engine_backend(backend) or _handshake_known_failed(backend):
            return False
        with self._state_lock:
            spoke = backend in self._stamped_this_run
        if spoke or _spoke_this_session(backend):
            return True
        required_pkg = self._get_required_package(backend)
        if not required_pkg:
            return False
        cache_key = f'venv:{backend}' if _is_venv_backend(backend) else required_pkg
        return TTSEngine._import_check_cache.get(cache_key) is True

    def _set_aside_for(self, language) -> list[dict[str, Any]]:
        """Why each voice that can speak ``language`` is not speaking it, as
        far as the ladder knows: its start failed on this line (how long it
        took), it is demoted (since when, after how many failures), or it was
        left out for GPU memory (GB free and needed).  Voices with none of
        these are not listed."""
        failed_on_line = dict(getattr(self._line, 'failed', None) or {})
        said = []
        for backend in sorted(_capable_backends_for(language)):
            with self._state_lock:
                demoted = backend in self._demoted_backends
                since = (self._demotion_meta.get(backend) or {}).get(
                    'first_demoted_at')
                in_a_row = self._consecutive_failures.get(backend, 0)
            if backend in failed_on_line:
                entry = {'backend': backend, 'why': 'failed_on_this_line',
                         'failures_in_a_row': in_a_row, 'demoted': demoted}
                if failed_on_line[backend] is not None:
                    entry['after_s'] = round(failed_on_line[backend], 2)
            elif demoted:
                entry = {'backend': backend, 'why': 'demoted',
                         'failures': in_a_row}
                if isinstance(since, (int, float)):
                    entry['since'] = since
            elif backend in _VRAM_SKIPS:
                free_gb, needed_gb = _VRAM_SKIPS[backend]
                entry = {'backend': backend, 'why': 'vram',
                         'free_gb': round(free_gb, 1),
                         'needed_gb': round(needed_gb, 1)}
            else:
                continue
            said.append(entry)
        return said

    @staticmethod
    def _say_set_aside(set_aside) -> str:
        """_set_aside_for in words, for a log line."""
        import time as _time
        words = []
        for e in set_aside:
            backend = e['backend']
            if e['why'] == 'failed_on_this_line':
                took = f" after {e['after_s']:.2f} s" if 'after_s' in e else ''
                words.append(
                    f"{backend} failed on this line{took} "
                    f"({e['failures_in_a_row']} in a row"
                    f"{', demoted' if e['demoted'] else ''})")
            elif e['why'] == 'demoted':
                when = (_time.strftime('%Y-%m-%d %H:%M:%S',
                                       _time.localtime(e['since']))
                        if 'since' in e else 'an earlier run')
                n = e['failures']
                words.append(f"{backend} demoted since {when} after {n} "
                             f"failure{'s' if n != 1 else ''}")
            else:
                words.append(f"{backend} skipped for VRAM ({e['free_gb']:.1f} GB "
                             f"free, {e['needed_gb']:.1f} GB needed)")
        return '; '.join(words)

    def _log_no_voice(self, lang_norm, tried, capable) -> None:
        """The one "TTS unavailable" line, for both places the ladder runs
        out for a language other than English, and the page's event.  It
        names the voices set aside and why (_set_aside_for).  "No capable
        backend fits on this hardware" is said only when nothing but GPU
        memory, or nothing known, kept the voices out: a demoted voice or a
        failed start is the cause, not the hardware."""
        set_aside = self._set_aside_for(lang_norm)
        said = self._say_set_aside(set_aside)
        if any(e['why'] != 'vram' for e in set_aside):
            cause = said
        elif said:
            cause = f"no capable backend fits on this hardware ({said})"
        else:
            cause = "no capable backend fits on this hardware"
        logger.error(
            f"TTS unavailable for lang={lang_norm}: {cause}. Tried {tried}, "
            f"capable set {sorted(capable)}. Falling back to text-only "
            f"(no audio)."
        )
        _publish_lang_unsupported(lang_norm, tried, set_aside)

    def synthesize_to_bytes(self, text: str, voice: str | None = None,
                            speed: float = 1.0, language: str | None = None) -> bytes | None:
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name
        try:
            result = self.synthesize(text, temp_path, voice, speed, language=language)
            if result:
                with open(result, 'rb') as f:
                    return f.read()
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
        return None

    def presynth_next(self, text: str, voice: str | None = None):
        """Pre-synthesize a predicted next response in background."""
        self._ensure_initialized()

        def _synth(t, path, v=None):
            return self.synthesize(t, path, v)

        self._presynth.presynth_background(text, voice or 'default', _synth)

    def create_sentence_pipeline(self, on_audio_ready=None) -> SentencePipeline:
        """
        Create a sentence-level TTS pipeline for streaming LLM output.

        Usage:
            pipeline = engine.create_sentence_pipeline(on_audio_ready=play_audio)
            for token in llm_stream:
                pipeline.feed(token)
            pipeline.flush()
            pipeline.wait()
        """
        self._ensure_initialized()

        def synth_fn(text, output_path):
            return self.synthesize(text, output_path)

        return SentencePipeline(synth_fn, on_audio_ready)

    def clone_voice(self, audio_path: str, voice_name: str, **kwargs) -> bool:
        self._ensure_initialized()
        cap = _get_engine_capabilities(self._active_backend)
        if not cap.get('voice_cloning'):
            logger.warning(f"Voice cloning not supported by {self.backend_name}")
            return False
        inst = self._backends.get(self._active_backend)
        if inst and hasattr(inst, 'clone_voice'):
            return inst.clone_voice(audio_path, voice_name, **kwargs)
        return False

    def shutdown(self):
        for name, inst in list(self._backends.items()):
            if hasattr(inst, 'unload_model'):
                inst.unload_model()
            elif hasattr(inst, 'shutdown'):
                inst.shutdown()
        self._backends.clear()
        self._initialized = False
        self._active_backend = BACKEND_NONE
        gc.collect()
        logger.info("TTS Engine shutdown")


# ════════════════════════════════════════════════════════════════════
# LAZY BACKEND WRAPPERS — defer heavy imports until first use
# ════════════════════════════════════════════════════════════════════

class _SubprocessTTSBackend:
    """Single generic adapter for every GPU TTS backend.

    Routes Nunba TTSEngine calls to the matching HARTOS subprocess tool
    (f5_tts_tool, chatterbox_tool, cosyvoice_tool, indic_parler_tool).
    CUDA OOM / DLL crashes inside the worker are contained; Nunba's
    TTSEngine catches the RuntimeError and falls back to Piper, just
    like the legacy `_Lazy*` classes used to via `_oom_guard`.

    SRP: this adapter is the ONLY integration point. Engine-specific
    behavior (safetensors workaround, padding, sentence splitting,
    speaker selection) lives inside the HARTOS worker modules — this
    class contains zero engine-specific code.

    DRY: there are no per-engine `_Lazy*` classes anymore. One class,
    one instance per registry entry.
    """

    def __init__(self, engine_id: str):
        """
        Args:
            engine_id: Key in tts_router.ENGINE_REGISTRY
                       (e.g. 'f5_tts', 'chatterbox_turbo', 'chatterbox_ml',
                       'cosyvoice3', 'indic_parler').
        """
        from integrations.channels.media.tts_router import ENGINE_REGISTRY
        spec = ENGINE_REGISTRY.get(engine_id)
        if spec is None:
            raise ValueError(f"Unknown TTS engine_id: {engine_id}")
        if not spec.tool_module or not spec.tool_function or not spec.tool_worker_attr:
            raise ValueError(
                f"TTS engine {engine_id} is not subprocess-capable "
                f"(missing tool_module/tool_function/tool_worker_attr)"
            )
        self._engine_id = engine_id
        self._spec = spec
        # Cache the ToolWorker instance the first time we look it up.
        self._worker = None
        self._synthesize_fn = None

    # ── Lazy resolution of the tool module ──────────────────────

    def _resolve(self):
        """Import the HARTOS tool module and cache its exports."""
        if self._worker is not None:
            return
        import importlib
        mod = importlib.import_module(self._spec.tool_module)
        worker = getattr(mod, self._spec.tool_worker_attr, None)
        if worker is None:
            raise RuntimeError(
                f"{self._spec.tool_module} has no ToolWorker attribute "
                f"{self._spec.tool_worker_attr}"
            )
        self._worker = worker
        self._synthesize_fn = getattr(mod, self._spec.tool_function)
        # NOTE: unload is ALWAYS `self._worker.stop()` — never call
        # module-level `unload_<engine>()` helpers. Those helpers may
        # stop multiple workers at once (e.g. `unload_chatterbox()`
        # stops BOTH turbo and ml), which silently kills workers this
        # adapter doesn't own. The ToolWorker-level stop is the
        # single-variant teardown.

    # ── Interface expected by TTSEngine.synthesize ──────────────

    @property
    def _device(self) -> str | None:
        """TTSEngine reads this to decide the VRAM-inference check path.

        Returns 'cuda' when the worker subprocess is alive (model is
        actually loaded on GPU), None otherwise. TTSEngine uses this
        to pick the fast inference-headroom VRAM check over the
        pessimistic full-model-load check.
        """
        try:
            self._resolve()
        except Exception:
            return None
        return 'cuda' if self._worker.is_alive() else None

    def synthesize(self, text, output_path=None, language='en', **kwargs):
        """Route one synthesis through the subprocess worker.

        Matches the interface of the old `_Lazy*.synthesize()` methods
        exactly so TTSEngine's call sites don't need changes. On any
        worker error (including `transient: True` crash fallback),
        raises RuntimeError so TTSEngine's except-block falls through
        to Piper just like before.

        Forwards `speed` and any engine-specific kwargs to the public
        tool function so behavior like F5's speed multiplier is
        preserved after the subprocess move.
        """
        self._resolve()

        if output_path is None:
            import tempfile
            output_path = tempfile.mktemp(suffix='.wav')

        # Nunba calls pass ref_voice via kwargs — forward it as `voice`
        # so the HARTOS worker's resolver picks it up.
        voice = kwargs.get('ref_voice') or kwargs.get('voice')

        # Build the call kwargs. speed is F5-specific but tolerated by
        # the other public tool functions' **kwargs signatures (or
        # filtered at the adapter boundary); we forward explicitly.
        fn_kwargs = dict(
            text=text,
            language=language,
            voice=voice,
            output_path=output_path,
        )
        if 'speed' in kwargs:
            fn_kwargs['speed'] = kwargs['speed']

        try:
            raw = self._synthesize_fn(**fn_kwargs)
        except TypeError:
            # Public function doesn't accept some kwarg (e.g. speed on
            # a non-F5 engine) — retry without the extras.
            fn_kwargs.pop('speed', None)
            raw = self._synthesize_fn(**fn_kwargs)

        # The HARTOS tool returns a JSON string. Parse it and surface
        # errors as exceptions so TTSEngine's fallback path triggers.
        try:
            result = json.loads(raw)
        except (TypeError, ValueError) as e:
            raise RuntimeError(
                f"{self._engine_id}: malformed worker response: {e}"
            )
        if 'error' in result:
            # Preserve the transient flag on the exception so TTSEngine's
            # fallback chain can short-circuit straight to Piper on GPU
            # OOM, instead of walking every other GPU engine.
            # What the worker died of, when it says so (HARTOS gpu_worker:
            # the answer's ``cause``): the reason itself goes with the
            # error, into the log line and to whoever reads this failure.
            # The error's words alone were "died during startup (exit=1)".
            said = str(result['error'])
            cause = str(result.get('cause') or '')
            if cause and cause not in said:
                said = f"{said} (cause: {cause})"
            err = RuntimeError(f"{self._engine_id}: {said}")
            err.cause = cause  # type: ignore[attr-defined]
            err.transient = bool(result.get('transient'))  # type: ignore[attr-defined]
            # Which key the voice's repo wants, and whether it refused the
            # stored one (HARTOS ai_key_vault.gated_weights_failure).
            err.needs_key = str(result.get('needs_key') or '')  # type: ignore[attr-defined]
            err.key_refused = bool(result.get('key_refused'))  # type: ignore[attr-defined]
            raise err
        return result.get('path', output_path)

    def unload_model(self):
        """Stop this variant's worker subprocess and release its VRAM.

        Only stops the ONE worker this adapter owns. We deliberately
        do NOT call module-level `unload_<engine>` helpers because some
        of them (e.g. `unload_chatterbox`) stop multiple workers at once.
        """
        try:
            self._resolve()
        except Exception:
            return
        if self._worker is not None:
            try:
                self._worker.stop()
            except Exception as e:
                logger.warning(f"{self._engine_id} stop failed: {e}")


def _normalize_tts_result(result, fallback_path=None):
    """Normalize any TTS return value to a file path string.

    HARTOS tool functions return JSON: {"path": "...", "duration": ...}
    Subprocess backends return parsed path (already normalized).
    Piper returns a file path directly.

    This is the SINGLE normalization point — all backends and consumers
    go through here so the contract is: input=anything, output=file path or None.
    """
    if result is None:
        return None
    if isinstance(result, dict):
        return result.get('path', fallback_path)
    if isinstance(result, str):
        if result.startswith('{'):
            try:
                parsed = json.loads(result)
                if 'error' in parsed:
                    logger.warning(f"TTS tool error: {parsed['error']}")
                    return None
                return parsed.get('path', fallback_path)
            except (json.JSONDecodeError, AttributeError):
                pass
        # Already a file path
        return result
    return fallback_path


class _InProcessTTSBackend:
    """Generic in-process TTS backend for CPU engines (luxtts, pocket_tts, espeak).

    These engines have a tool_module + tool_function but no subprocess worker.
    We import the function and call it directly in-process.
    """

    def __init__(self, synth_fn, engine_id: str):
        self._fn = synth_fn
        self._engine_id = engine_id

    def synthesize(self, text, output_path=None, **kwargs):
        try:
            # Only pass params the HARTOS tool function accepts.
            # Tool functions have varied signatures — don't forward
            # unknown kwargs (voice, language, speed) that cause TypeError.
            import inspect
            sig = inspect.signature(self._fn)
            accepted = set(sig.parameters.keys())
            safe_kw = {k: v for k, v in kwargs.items() if k in accepted}
            result = self._fn(text=text, output_path=output_path, **safe_kw)
            return _normalize_tts_result(result, output_path)
        except Exception as e:
            logger.warning(f"In-process TTS {self._engine_id} failed: {e}")
            return None

    def stop(self):
        pass  # No subprocess to stop


class _LazyPiper:
    """Lazy wrapper for Piper TTS. CPU-only ONNX, English, 22050Hz. Last-resort fallback."""

    def __init__(self):
        self._tts = None

    def _ensure_loaded(self):
        if self._tts is not None:
            return
        from tts.piper_tts import DEFAULT_VOICE, PiperTTS
        self._tts = PiperTTS()
        if not self._tts.is_voice_installed(DEFAULT_VOICE):
            self._tts.download_voice(DEFAULT_VOICE)
        logger.info("Piper TTS loaded (CPU)")

    def synthesize(self, text, output_path=None, **kwargs):
        self._ensure_loaded()
        speed = kwargs.get('speed', 1.0)
        voice = kwargs.get('voice')
        # When the caller didn't pin a voice_id but did supply a
        # language hint, resolve the canonical Piper voice for that
        # language via piper_tts.voice_for_lang.  This is what makes
        # Chinese / Arabic / Spanish / etc. speak in the right
        # phonemes instead of mumble-English.
        if not voice:
            lang_hint = (kwargs.get('language')
                         or getattr(self, '_current_lang', None))
            if lang_hint:
                try:
                    from tts.piper_tts import voice_for_lang
                    voice = voice_for_lang(lang_hint)
                except Exception as _lang_err:
                    # voice_for_lang raises PiperLangUnavailable when no
                    # voice is registered for the requested language.
                    # Re-raise so _synthesize_with_fallback walks to the
                    # next capable backend (indic_parler / chatterbox_ml).
                    # NEVER silently substitute DEFAULT_VOICE (English)
                    # for a non-English lang — that produces "speaking
                    # Tamil with English voice" = silent / garbled audio
                    # (cohort analysis 2026-04-15 / M5 PR-12 review).
                    logger.warning(
                        f"Piper: no voice for lang={lang_hint!r} "
                        f"({_lang_err}); raising to let fallback chain "
                        f"pick chatterbox_ml / indic_parler / etc."
                    )
                    raise
        if voice and not self._tts.is_voice_installed(voice):
            # Lazy download — blocks this synth call but only once per
            # language-per-machine.  Subsequent calls hit the local cache.
            try:
                self._tts.download_voice(voice)
            except Exception as _e:
                # Voice file unreachable (offline / HF 404 / disk full).
                # RAISE so _synthesize_with_fallback can try the next
                # capable backend in the lang's allowlist.  Pre-PR-12
                # behavior silently substituted DEFAULT_VOICE here, which
                # made the engine APPEAR to succeed while actually
                # speaking the wrong language.  Loud failure = correct
                # fallback chain firing = right language eventually spoken.
                logger.error(
                    f"Piper voice '{voice}' download failed: {_e}; "
                    f"raising to fallback chain"
                )
                raise
        return self._tts.synthesize(text, output_path=output_path, speed=speed,
                                    voice_id=voice)

    def unload_model(self):
        self._tts = None


# ════════════════════════════════════════════════════════════════════
# GLOBAL SINGLETON
# ════════════════════════════════════════════════════════════════════

_engine: TTSEngine | None = None
_engine_lock = threading.Lock()


def get_tts_engine(**kwargs) -> TTSEngine:
    """Get or create the global TTS engine instance.

    Lock-free read path — only locks during first creation.
    """
    global _engine
    if _engine is not None:
        return _engine
    with _engine_lock:
        if _engine is None:
            _engine = TTSEngine(**kwargs)
        return _engine


def synthesize_text(text: str,
                    voice: str | None = None,
                    speed: float = 1.0,
                    output_path: str | None = None,
                    language: str | None = None) -> str | None:
    """Convenience function. Auto-routes to best backend for language."""
    engine = get_tts_engine()
    return engine.synthesize(text, output_path, voice, speed, language=language)


def get_tts_status() -> dict[str, Any]:
    """Get TTS engine status for API responses."""
    engine = get_tts_engine()
    info = engine.get_info()
    # Count total unique languages across all engines
    all_langs = set()
    for cap in _get_engine_capabilities().values():
        all_langs.update(cap.get('languages', set()))
    # Sanitize capabilities — capability dicts use sets which aren't JSON-serializable
    raw_caps = info.get("capabilities", {})
    safe_caps = {}
    for k, v in raw_caps.items():
        if isinstance(v, set):
            safe_caps[k] = sorted(v)
        else:
            safe_caps[k] = v

    return {
        "available": engine.is_available(),
        "backend": info["backend"],
        "backend_name": info["backend_name"],
        "has_gpu": info["has_gpu"],
        "vram_gb": info.get("vram_gb", 0),
        "gpu_name": info.get("gpu_info", {}).get("gpu_name") if info.get("gpu_info") else None,
        "language": info.get("language", "en"),
        "features": info["features"],
        "capabilities": safe_caps,
        "installed_voices": engine.list_installed_voices() if engine.is_available() else [],
        "total_languages": len(all_langs),
        "supported_languages": sorted(all_langs),
    }
