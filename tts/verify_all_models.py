"""#217 — single boot-time matrix runner for all 6 verifiers.

Calls verified_synth / verified_llm / verified_stt / verified_vlm /
verified_audio_gen / verified_video_gen and returns a unified
Snapshot{modality → Result} dict + emits one SSE 'verification.matrix'
event with the result.

Reuses the existing per-modality Result dataclasses (no parallel
ledger).  Caches the snapshot with a 5-minute TTL so the admin
dashboard polling doesn't re-run every modality on every render.

Usage:
    from tts.verify_all_models import verify_all_models, get_cached
    snap = verify_all_models(engines=engines, llm_endpoint=...)
    # Cached re-read within 5min:
    snap = get_cached() or verify_all_models(engines=engines, ...)

SSE shape (subscribers can render directly from this):
    {
      'type': 'verification.matrix',
      'generated_at': '2026-05-20T12:34:56Z',
      'modalities': {
        'tts':       {'ok': True,  'detail': '...', 'elapsed_s': 1.2},
        'llm':       {'ok': True,  'detail': '...', 'elapsed_s': 0.3},
        'stt':       {'ok': False, 'detail': 'empty transcript', 'elapsed_s': 2.1},
        'vlm':       {'ok': True,  'detail': '...', 'elapsed_s': 1.8},
        'audio_gen': {'ok': True,  'detail': '...', 'elapsed_s': 4.5},
        'video_gen': {'ok': False, 'detail': 'too small (0B)', 'elapsed_s': 0.5},
      },
      'ready_count': 4,
      'total_count': 6,
    }
"""
from __future__ import annotations

import logging
import threading
import time
from datetime import datetime
from typing import Any, Dict, Optional


logger = logging.getLogger('hevolve.verify_all_models')

# 5-minute TTL: long enough that admin dashboard polling doesn't
# re-run the full matrix on every render; short enough that a freshly-
# installed backend shows up within a coffee break.
CACHE_TTL_S = 300

# Module-level cache.  Thread-safe single-writer pattern: only
# verify_all_models() writes, callers read.  Snapshot dict + monotonic
# timestamp so we can compute age.
_cache_lock = threading.Lock()
_cache: Optional[Dict[str, Any]] = None
_cache_ts: float = 0.0


def _result_to_dict(r: Any) -> Dict[str, Any]:
    """Coerce any verified_*.Result dataclass into the snapshot row
    shape.  Reuses existing Result fields — n_bytes/content/response/
    transcript all collapse into a single 'detail' string."""
    if r is None:
        return {'ok': False, 'detail': 'verifier returned None',
                'elapsed_s': 0.0}
    ok = bool(getattr(r, 'ok', False))
    elapsed_s = float(getattr(r, 'elapsed_s', 0.0))
    if ok:
        detail = (
            getattr(r, 'content', None)
            or getattr(r, 'response', None)
            or getattr(r, 'transcript', None)
            or (f"{getattr(r, 'n_bytes', 0)}B"
                if hasattr(r, 'n_bytes') else 'ok')
        )
    else:
        detail = getattr(r, 'err', '') or 'unknown failure'
    return {
        'ok': ok,
        'detail': str(detail)[:140],
        'elapsed_s': elapsed_s,
    }


def verify_all_models(engines: Dict[str, Any] | None = None,
                      llm_endpoint: str = "http://127.0.0.1:8080",
                      stt_engine: Any | None = None,
                      vlm_engine: Any | None = None,
                      audio_gen_engine: Any | None = None,
                      video_gen_engine: Any | None = None,
                      tts_engine: Any | None = None,
                      tts_backend: str | None = None,
                      broadcast: bool = True) -> Dict[str, Any]:
    """Run all 6 verifiers and return a unified snapshot.

    Each modality's verifier runs independently; one modality's
    failure doesn't block the others.  Caller passes whichever
    engines are loaded; missing engines get marked as 'engine not
    loaded' rather than crashing the matrix.

    `broadcast=True` emits an SSE 'verification.matrix' event so
    the admin UI can refresh without polling.

    Returns the snapshot dict shape documented in module docstring.
    """
    modalities: Dict[str, Dict[str, Any]] = {}

    # 1. TTS — uses the canonical backend per call (defaults to first
    # registered if tts_backend not passed)
    try:
        from tts.verified_synth import verify_backend_synth
        if tts_engine is not None and tts_backend:
            r = verify_backend_synth(tts_engine, tts_backend)
            modalities['tts'] = _result_to_dict(r)
        else:
            modalities['tts'] = {'ok': False,
                                  'detail': 'tts engine or backend not provided',
                                  'elapsed_s': 0.0}
    except Exception as e:
        modalities['tts'] = {'ok': False,
                              'detail': f"verifier crashed: {e}",
                              'elapsed_s': 0.0}

    # 2. LLM — endpoint-based; falls back inline if HARTOS unavailable
    try:
        from tts.verified_llm import verify_llm
        r = verify_llm(endpoint=llm_endpoint, timeout_s=15)
        modalities['llm'] = _result_to_dict(r)
    except Exception as e:
        modalities['llm'] = {'ok': False,
                              'detail': f"verifier crashed: {e}",
                              'elapsed_s': 0.0}

    # 3. STT
    try:
        if stt_engine is not None:
            from tts.verified_stt import verify_stt
            r = verify_stt(stt_engine, timeout_s=15)
            modalities['stt'] = _result_to_dict(r)
        else:
            modalities['stt'] = {'ok': False,
                                  'detail': 'stt engine not loaded',
                                  'elapsed_s': 0.0}
    except Exception as e:
        modalities['stt'] = {'ok': False,
                              'detail': f"verifier crashed: {e}",
                              'elapsed_s': 0.0}

    # 4. VLM
    try:
        if vlm_engine is not None:
            from tts.verified_vlm import verify_vlm
            r = verify_vlm(vlm_engine, timeout_s=30)
            modalities['vlm'] = _result_to_dict(r)
        else:
            modalities['vlm'] = {'ok': False,
                                  'detail': 'vlm engine not loaded',
                                  'elapsed_s': 0.0}
    except Exception as e:
        modalities['vlm'] = {'ok': False,
                              'detail': f"verifier crashed: {e}",
                              'elapsed_s': 0.0}

    # 5. Audio gen
    try:
        if audio_gen_engine is not None:
            from tts.verified_audio_gen import verify_audio_gen
            r = verify_audio_gen(audio_gen_engine, timeout_s=60)
            modalities['audio_gen'] = _result_to_dict(r)
        else:
            modalities['audio_gen'] = {'ok': False,
                                        'detail': 'audio_gen engine not loaded',
                                        'elapsed_s': 0.0}
    except Exception as e:
        modalities['audio_gen'] = {'ok': False,
                                    'detail': f"verifier crashed: {e}",
                                    'elapsed_s': 0.0}

    # 6. Video gen
    try:
        if video_gen_engine is not None:
            from tts.verified_video_gen import verify_video_gen
            r = verify_video_gen(video_gen_engine, timeout_s=120)
            modalities['video_gen'] = _result_to_dict(r)
        else:
            modalities['video_gen'] = {'ok': False,
                                        'detail': 'video_gen engine not loaded',
                                        'elapsed_s': 0.0}
    except Exception as e:
        modalities['video_gen'] = {'ok': False,
                                    'detail': f"verifier crashed: {e}",
                                    'elapsed_s': 0.0}

    ready_count = sum(1 for m in modalities.values() if m['ok'])

    snapshot = {
        'type': 'verification.matrix',
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'modalities': modalities,
        'ready_count': ready_count,
        'total_count': len(modalities),
    }

    # Cache + broadcast
    global _cache, _cache_ts
    with _cache_lock:
        _cache = snapshot
        _cache_ts = time.monotonic()

    if broadcast:
        try:
            import sys as _sys
            main_mod = _sys.modules.get('__main__')
            if main_mod and hasattr(main_mod, 'broadcast_sse_event'):
                main_mod.broadcast_sse_event(
                    'verification.matrix', snapshot, user_id=None)
        except Exception as _e:
            logger.debug(f"SSE broadcast failed (non-fatal): {_e}")

    return snapshot


def get_cached(max_age_s: int = CACHE_TTL_S) -> Optional[Dict[str, Any]]:
    """Return the cached snapshot if younger than max_age_s, else None.

    Use this from the admin dashboard polling endpoint so an idle
    matrix doesn't re-run every modality probe on every render.
    """
    with _cache_lock:
        if _cache is None:
            return None
        age = time.monotonic() - _cache_ts
        if age > max_age_s:
            return None
        # Defensive copy so caller mutations don't poison the cache
        return dict(_cache)


def reset_cache() -> None:
    """Clear the cache.  For test isolation + admin "force refresh"."""
    global _cache, _cache_ts
    with _cache_lock:
        _cache = None
        _cache_ts = 0.0
