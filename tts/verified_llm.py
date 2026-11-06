"""Verified-signal probe for LLM readiness.

Sibling of tts/verified_synth.py for the LLM model type.  Same
contract: the only trigger allowed for an LLM "Ready / Healthy /
Loaded" UI claim is a successful round-trip call that produces
non-empty content.

The canonical deep implementation lives in HARTOS
(core/verified_llm.py, commit a0ba0a9).  This Nunba-side module is a
thin forwarder so the code that fires UI cards can import it from a
stable local path without cross-repo coupling.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Result:
    ok: bool
    content: str
    err: str
    elapsed_s: float

    def __bool__(self) -> bool:
        return self.ok


def verify_llm(endpoint: str = "http://127.0.0.1:8080",
               prompt: str = "hi",
               timeout_s: int = 30) -> Result:
    """Run a minimal /v1/chat/completions request and assert the
    response carries non-empty content.  /health returning 200 is a
    proxy signal; only a successful completion is a verified signal.

    Forwards to HARTOS core.verified_llm.verify_llm when available;
    falls back to an inline implementation otherwise so CI without
    HARTOS can still run.

    Timed here with time.perf_counter, whichever path answers: Windows'
    time.monotonic ticks every 15.6 ms, so a fast local round trip read 0.
    """
    import time

    t0 = time.perf_counter()
    try:
        from core.verified_llm import verify_llm as _hartos_verify  # type: ignore
    except ImportError:
        _hartos_verify = None
    if _hartos_verify is not None:
        # HARTOS's signature is (url, timeout, prompt, max_tokens) and it
        # answers a dict.  Called with this module's own names it raised
        # TypeError on every call, which a bare except hid, so this path
        # never ran (tests/test_verified_llm_forwards.py).
        r = _hartos_verify(url=endpoint, timeout=timeout_s, prompt=prompt)
        ok = bool(r.get("ok", False))
        return Result(
            ok=ok,
            content=str(r.get("content_snippet") or ""),
            # HARTOS says reason='verified' on success; only a failure's
            # reason is an error.
            err="" if ok else str(r.get("reason") or ""),
            elapsed_s=time.perf_counter() - t0,
        )

    # Fallback inline implementation — no HARTOS.
    import json
    import urllib.error
    import urllib.request

    payload = json.dumps({
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 16,
        "temperature": 0.0,
    }).encode("utf-8")
    req = urllib.request.Request(
        endpoint.rstrip("/") + "/v1/chat/completions",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        content = ""
        try:
            content = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            pass
        elapsed = time.perf_counter() - t0
        if content and content.strip():
            return Result(ok=True, content=content, err="", elapsed_s=elapsed)
        return Result(ok=False, content="", err="empty content", elapsed_s=elapsed)
    except (urllib.error.URLError, TimeoutError) as e:
        return Result(ok=False, content="", err=f"{type(e).__name__}: {e}",
                      elapsed_s=time.perf_counter() - t0)
    except Exception as e:
        return Result(ok=False, content="", err=f"{type(e).__name__}: {e}",
                      elapsed_s=time.perf_counter() - t0)


def is_llm_inference_verified(endpoint: str = "http://127.0.0.1:8080") -> bool:
    """Boolean sugar over verify_llm() for call sites that just want
    yes/no.  Always call this, not /health, before declaring the LLM
    usable to the user.
    """
    return verify_llm(endpoint=endpoint).ok
