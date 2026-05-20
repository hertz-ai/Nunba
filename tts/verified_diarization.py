"""#216 — Verified-signal probe for diarization (speaker-turn segmentation).

Sibling of tts/verified_synth.py for the diarization modality.  A
"Ready" claim only fires when a known multi-speaker WAV produces at
least N speaker labels.  "Engine loaded" without a real inference
test misses the regression where a model loads but emits zero turns
(under-segmentation) or merges everyone into a single speaker
(speaker-count collapse).

Default test asset: a synthetic 2-speaker WAV.  Caller is expected to
supply a real multi-speaker fixture for the production health check;
the synthetic fallback exists so CI can run without an external file.
"""
from __future__ import annotations

import io
import math
import struct
import threading
import time
import wave
from dataclasses import dataclass


MIN_TURNS: int = 2          # at least 2 turns from a 2-speaker clip
MIN_SPEAKERS: int = 2       # at least 2 distinct speaker labels


@dataclass
class Result:
    ok: bool
    n_turns: int
    n_speakers: int
    err: str
    elapsed_s: float

    def __bool__(self) -> bool:
        return self.ok


def _synth_two_speaker_wav() -> bytes:
    """Generate a 4-second synthetic WAV alternating two tones (one
    per 'speaker').  Not a substitute for real speech audio — a
    well-trained diarization model may collapse the synthetic input
    into one speaker.  Tests against synthetic input are expected to
    FAIL with a clear "n_speakers=1" so the caller is forced to
    supply real audio."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        # 2-second 440 Hz tone (speaker A)
        a = [
            struct.pack("<h",
                        int(32767 * 0.3 * math.sin(2 * math.pi * 440 * t / 16000)))
            for t in range(32000)
        ]
        # 2-second 660 Hz tone (speaker B)
        b = [
            struct.pack("<h",
                        int(32767 * 0.3 * math.sin(2 * math.pi * 660 * t / 16000)))
            for t in range(32000)
        ]
        w.writeframes(b"".join(a) + b"".join(b))
    return buf.getvalue()


def _count_turns_and_speakers(diarization_output) -> tuple[int, int]:
    """Coerce diarization output into (n_turns, n_speakers).

    Supports the two common output shapes:
      * pyannote-style: iterable of (segment, _, speaker_label) tuples
      * dict-style: {"turns": [{"speaker": "A", ...}, ...]}
      * list-of-dicts: [{"speaker": ..., "start": ..., "end": ...}]
    """
    if diarization_output is None:
        return (0, 0)
    if isinstance(diarization_output, dict):
        turns = diarization_output.get("turns") or []
        speakers = {t.get("speaker") for t in turns if t.get("speaker")}
        return (len(turns), len(speakers))
    if isinstance(diarization_output, list):
        if not diarization_output:
            return (0, 0)
        if isinstance(diarization_output[0], dict):
            speakers = {t.get("speaker") for t in diarization_output
                        if t.get("speaker")}
            return (len(diarization_output), len(speakers))
        # pyannote-style triples
        try:
            speakers = {row[-1] for row in diarization_output}
            return (len(diarization_output), len(speakers))
        except Exception:
            return (0, 0)
    # Try iterating (lazy pyannote .itertracks)
    try:
        rows = list(diarization_output)
        speakers = {row[-1] for row in rows}
        return (len(rows), len(speakers))
    except Exception:
        return (0, 0)


def verify_diarization(engine,
                       audio_bytes: bytes | None = None,
                       min_turns: int = MIN_TURNS,
                       min_speakers: int = MIN_SPEAKERS,
                       timeout_s: int = 60) -> Result:
    """Run a diarization round-trip and verify it produces a sensible
    turn/speaker count.

    Args:
        engine:        Diarization engine with .diarize(audio_bytes)
                       OR .__call__(audio_bytes) method.
        audio_bytes:   Multi-speaker WAV.  REQUIRED for a truthful probe;
                       if None we fall back to a synthetic 2-tone clip
                       which SHOULD fail verification on a real model.
        min_turns:     Pass threshold for turn count.  Default 2.
        min_speakers:  Pass threshold for unique speaker labels.  Default 2.
        timeout_s:     Max wall time.
    """
    synthetic = False
    if audio_bytes is None:
        synthetic = True
        audio_bytes = _synth_two_speaker_wav()

    box = {"ok": False, "n_turns": 0, "n_speakers": 0, "err": ""}

    def _run():
        try:
            if hasattr(engine, "diarize"):
                out = engine.diarize(audio_bytes)
            elif callable(engine):
                out = engine(audio_bytes)
            else:
                raise AttributeError(
                    "diarization engine exposes neither diarize() "
                    "nor __call__")
            n_turns, n_speakers = _count_turns_and_speakers(out)
            box["n_turns"] = n_turns
            box["n_speakers"] = n_speakers
            if n_turns < min_turns:
                box["err"] = (
                    f"only {n_turns} turn(s) — under-segmentation"
                    + (" (synthetic input — supply real multi-speaker audio)"
                       if synthetic else "")
                )
                return
            if n_speakers < min_speakers:
                box["err"] = (
                    f"only {n_speakers} distinct speaker(s) — "
                    f"speaker-count collapse"
                    + (" (synthetic input — supply real multi-speaker audio)"
                       if synthetic else "")
                )
                return
            box["ok"] = True
        except Exception as e:
            box["err"] = f"{type(e).__name__}: {e}"[:200]

    t0 = time.monotonic()
    th = threading.Thread(target=_run, daemon=True)
    th.start()
    th.join(timeout=timeout_s)
    elapsed = time.monotonic() - t0

    if th.is_alive():
        return Result(ok=False, n_turns=0, n_speakers=0,
                      err=f"timed out after {timeout_s}s",
                      elapsed_s=elapsed)
    return Result(ok=box["ok"], n_turns=box["n_turns"],
                  n_speakers=box["n_speakers"], err=box["err"],
                  elapsed_s=elapsed)
