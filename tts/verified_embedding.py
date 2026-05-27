"""#214 — Verified-signal probe for embedding models (used by RAG).

Sibling of tts/verified_synth.py for the embedding modality.  An
embedding "Ready" claim only fires when a round-trip vectorization
of two known-similar phrases returns vectors whose cosine similarity
exceeds a sanity floor.

Why cosine-similarity over a simple "non-empty vector" check:
shallow "the model returned 384 floats" is the embedding analogue of
"synthesize returned no path" (#212) — every embedding model returns
SOMETHING but only a working one returns vectors with meaningful
semantic distance.  Pinning a similarity floor against a known-good
test pair catches:
  * dimension collapse (all-zero vectors → similarity 0/NaN)
  * NaN propagation (similarity is NaN)
  * loaded-wrong-model regression (similarity falls to random)

The default test pair "hello world" / "hi there" has a stable
cosine ≥ 0.5 on every general-purpose embedding model we ship; raise
MIN_COSINE if a future model breaks the floor.
"""
from __future__ import annotations

import math
import threading
import time
from dataclasses import dataclass


# Default similarity floor for the canned "hello world" / "hi there"
# test pair.  Picked low enough that even small/quantized embedding
# models pass, high enough that a broken model (all-zero / random)
# fails.  Empirical floor on all-MiniLM-L6-v2 + bge-small-en + e5-small
# is ~0.65; 0.5 leaves a generous margin.
MIN_COSINE: float = 0.5

# Default test pair — short, language-neutral-ish English, no
# domain-specific jargon that would skew domain-trained embeddings.
DEFAULT_TEXT_A: str = "hello world"
DEFAULT_TEXT_B: str = "hi there"


@dataclass
class Result:
    ok: bool
    similarity: float
    dim: int
    err: str
    elapsed_s: float

    def __bool__(self) -> bool:
        return self.ok


def _cosine(a, b) -> float:
    """Cosine similarity over two sequences-of-floats.  Returns 0.0
    when either input has zero magnitude (no NaN escapes)."""
    try:
        dot = sum(float(x) * float(y) for x, y in zip(a, b))
        norm_a = math.sqrt(sum(float(x) * float(x) for x in a))
        norm_b = math.sqrt(sum(float(x) * float(x) for x in b))
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        return dot / (norm_a * norm_b)
    except Exception:
        return 0.0


def verify_embedding(engine,
                     text_a: str = DEFAULT_TEXT_A,
                     text_b: str = DEFAULT_TEXT_B,
                     min_cosine: float = MIN_COSINE,
                     timeout_s: int = 30) -> Result:
    """Embed two known-similar phrases and assert cosine ≥ min_cosine.

    Args:
        engine:     Loaded embedding engine with .embed(str) → list[float]
                    OR .encode(str) (sentence-transformers naming).
        text_a:     First phrase (default 'hello world').
        text_b:     Second phrase (default 'hi there' — known-similar
                    to text_a on every general-purpose embedding model).
        min_cosine: Pass threshold for cosine similarity.  Default 0.5
                    accommodates small quantized models; raise for
                    high-precision domain models.
        timeout_s:  Max wall time for the two embed calls.

    Returns:
        Result with ok=True iff cos(embed(a), embed(b)) ≥ min_cosine.
        Failure modes captured in `err`:
          * engine returned None / empty vector
          * dimensions mismatch between the two embeds
          * similarity < min_cosine (likely model load regression)
          * inference raised
          * timed out
    """
    box = {"ok": False, "similarity": 0.0, "dim": 0, "err": ""}

    def _embed(text):
        if hasattr(engine, "embed"):
            return engine.embed(text)
        if hasattr(engine, "encode"):
            return engine.encode(text)
        raise AttributeError(
            "embedding engine exposes neither embed() nor encode()")

    def _run():
        try:
            vec_a = _embed(text_a)
            vec_b = _embed(text_b)
            if not vec_a or not vec_b:
                box["err"] = "engine returned empty vector"
                return
            # Normalize to plain lists so cosine works with any
            # numpy / torch tensor input.
            try:
                vec_a = list(vec_a)
                vec_b = list(vec_b)
            except Exception:
                box["err"] = "vectors not iterable"
                return
            if len(vec_a) != len(vec_b):
                box["err"] = (
                    f"dimension mismatch: a={len(vec_a)}, b={len(vec_b)}"
                )
                return
            box["dim"] = len(vec_a)
            sim = _cosine(vec_a, vec_b)
            box["similarity"] = sim
            if math.isnan(sim):
                box["err"] = "similarity is NaN (likely all-zero vectors)"
                return
            if sim < min_cosine:
                box["err"] = (
                    f"cosine {sim:.3f} < floor {min_cosine:.3f} — "
                    f"model may be loaded incorrectly or quantized "
                    f"below semantic resolution"
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
        return Result(ok=False, similarity=0.0, dim=0,
                      err=f"timed out after {timeout_s}s",
                      elapsed_s=elapsed)
    return Result(ok=box["ok"], similarity=box["similarity"],
                  dim=box["dim"], err=box["err"], elapsed_s=elapsed)
