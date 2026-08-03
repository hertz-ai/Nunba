"""#597: the llama port probe must not re-scan on every call.

GET /api/admin/models took 22s. py-spy caught all three samples parked in
``create_connection`` under this call chain:

    admin_models_list (main.py:2122)
      get_status (model_orchestrator.py)          # loops EVERY catalog entry
        LlamaLoader.is_loaded (models/orchestrator.py:167)
          check_llama_health (llama_config.py)
            _find_live_llama_port  ->  requests.get  ->  TCP connect

``_find_live_llama_port`` scans [config_port, 8082, 8081, 8080]. With 8081 and
8082 shut, each scan burns two connect timeouts before reaching the live 8080 —
and it ran once PER MODEL because nothing cached the result. The module had a
``_last_healthy_llama_port`` global that was written but never read back.

These tests pin the caching contract. They count probe calls rather than timing
anything, so they are deterministic and fast.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

llama_config = pytest.importorskip("llama.llama_config")


class _Resp:
    def __init__(self, code):
        self.status_code = code


@pytest.fixture()
def probe(monkeypatch):
    """Reset the cache and count/route every probe. Returns the call log."""
    calls = []

    def fake_get(url, timeout=None, **kw):
        calls.append((url, timeout))
        # only 8080 is alive, mirroring the live box (8081/8082 shut)
        if ":8080/" in url:
            return _Resp(200)
        raise OSError("connection refused")

    monkeypatch.setattr(llama_config.requests, "get", fake_get)
    monkeypatch.setattr(llama_config, "_llama_port_probed_at", None, raising=False)
    monkeypatch.setattr(llama_config, "_llama_port_cached", None, raising=False)
    return calls


def test_repeated_calls_scan_only_once(probe):
    """The actual production pattern: one call per model, many models."""
    first = llama_config._find_live_llama_port()
    after_first = len(probe)
    for _ in range(10):
        llama_config._find_live_llama_port()
    assert first == 8080
    assert len(probe) == after_first, (
        f"probe re-scanned {len(probe) - after_first} extra times across 10 "
        "calls — the per-model storm that made /api/admin/models take 22s"
    )


def test_force_bypasses_the_cache(probe):
    llama_config._find_live_llama_port()
    n = len(probe)
    llama_config._find_live_llama_port(force=True)
    assert len(probe) > n, "force=True must re-probe (used after start/stop)"


def test_cache_expires(probe, monkeypatch):
    """Stale liveness is worse than a redundant scan — the TTL must be real."""
    llama_config._find_live_llama_port()
    n = len(probe)
    # jump past the TTL
    monkeypatch.setattr(
        llama_config, "_llama_port_probed_at",
        llama_config._llama_port_probed_at - (llama_config._LLAMA_PORT_TTL_S + 1),
        raising=False,
    )
    llama_config._find_live_llama_port()
    assert len(probe) > n, "cache never expires — a dead llama would read alive forever"


def test_ttl_is_short_enough_to_notice_a_dead_server():
    assert 0 < llama_config._LLAMA_PORT_TTL_S <= 10, (
        "liveness cache TTL must stay small; a long TTL reports a dead "
        "llama-server as alive"
    )


def test_negative_result_is_cached_too(monkeypatch):
    """Worst case is ALL ports dead — without caching that is 4 timeouts/model."""
    calls = []

    def all_dead(url, timeout=None, **kw):
        calls.append(url)
        raise OSError("connection refused")

    monkeypatch.setattr(llama_config.requests, "get", all_dead)
    monkeypatch.setattr(llama_config, "_llama_port_probed_at", None, raising=False)
    monkeypatch.setattr(llama_config, "_llama_port_cached", None, raising=False)

    assert llama_config._find_live_llama_port() is None
    n = len(calls)
    for _ in range(5):
        assert llama_config._find_live_llama_port() is None
    assert len(calls) == n, (
        "a fully-stopped llama still re-scans every call — the worst case, and "
        "the one where each scan costs the most"
    )


def test_first_call_probes_even_on_a_freshly_booted_box(probe, monkeypatch):
    """The 'never probed' sentinel must not be 0.0.

    time.monotonic() is uptime-based, so within the first few seconds after a
    reboot it is itself smaller than the TTL. With 0.0 as the sentinel,
    `now - 0.0 < TTL` reads as a fresh cache entry and the very first call
    returns the initial None without ever touching the network — llama would
    look dead on every fresh boot.
    """
    monkeypatch.setattr(llama_config.time, "monotonic", lambda: 0.5)
    llama_config.invalidate_llama_port_cache()
    result = llama_config._find_live_llama_port()
    assert probe, "first call did not probe — the sentinel is being read as fresh"
    assert result == 8080


def test_server_state_change_invalidates_the_cache(probe):
    """start/stop change liveness. Caching it without invalidation would report
    the OLD state for up to the TTL — a regression the cache itself introduced.

    _write_server_status is the single chokepoint: spawn calls it with True,
    stop_server with False.
    """
    src = Path(llama_config.__file__).read_text(encoding="utf-8", errors="replace")
    body = src.split("def _write_server_status", 1)
    assert len(body) == 2, "_write_server_status vanished — re-point this guard"
    head = body[1][:1200]
    assert "invalidate_llama_port_cache()" in head, (
        "_write_server_status no longer resets the port-probe cache; a stopped "
        "server would keep reporting alive (and a started one, dead)"
    )


def test_probes_ipv4_not_localhost(probe):
    """`localhost` resolves to ::1 AND 127.0.0.1 on Windows; a closed port can
    burn the whole timeout on the IPv6 attempt before falling back."""
    llama_config._find_live_llama_port()
    assert probe, "no probe was attempted"
    for url, _timeout in probe:
        assert "127.0.0.1" in url, f"probe used a non-IPv4 host: {url}"
        assert "localhost" not in url, f"probe still uses localhost: {url}"


def test_timeout_is_loopback_appropriate(probe):
    llama_config._find_live_llama_port()
    for _url, timeout in probe:
        assert timeout is not None, "probe must always pass a timeout"
        # Bar is 0.5s, not 1.0s: 1.0 was the ORIGINAL value, so a <=1.0
        # assertion would pass against the bug it is meant to guard.
        assert timeout <= 0.5, (
            f"loopback probe timeout {timeout}s is too generous; closed ports "
            "multiply it by the number of ports scanned"
        )
