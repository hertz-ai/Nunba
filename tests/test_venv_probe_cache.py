"""`is_venv_healthy`'s import probe must not re-spawn a python per call.

GET /tts/engines measured on the live shipped build (pid 6960) 2026-08-04:
    run 1: 16.29s   run 2: 9.43s   run 3: 9.22s
while every other GET route in the same sweep was <= 1.06s.

Chain:
    chatbot_routes.py:4520  /tts/engines -> tts_engines_list
    chatbot_routes.py:1582  -> package_installer.get_backend_status()
    package_installer.py:1841  loops 18 backends
    package_installer.py:1846  -> is_venv_healthy(backend, probe)  for each venv-backed one
    backend_venv.py:557        -> invoke_in_venv(...)  = a SUBPROCESS running the venv's python

There are 8 venv-backed backends (chatterbox_turbo, f5_tts, indic_parler,
neutts_air, kokoro, omnivoice, melotts, xtts_v2), so one GET spawned up to eight
python interpreters, each importing a heavy ML package — the indic_parler probe
imports parler_tts, which pulls transformers + torch. ~1.2s x 8 ~= the 9s floor.

Same shape as #597 (/api/admin/models 23.08s -> 0.24s), fixed there by
TTL-caching the probe in llama/llama_config.py. This mirrors that precedent.

Counts probe INVOCATIONS rather than wall-clock: deterministic, and it fails for
the right reason if the cache silently stops working.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tts import backend_venv  # noqa: E402

BACKEND = 'f5_tts'          # a real entry, so _validate_backend_name passes
PROBE = 'f5_tts'


@pytest.fixture(autouse=True)
def _isolate(monkeypatch, tmp_path):
    """Fake a healthy venv on disk and count subprocess probes."""
    backend_venv.invalidate_venv_probe_cache()

    exe = tmp_path / 'python.exe'
    exe.write_text('')                       # exists -> is_file() True
    monkeypatch.setattr(backend_venv, 'venv_path', lambda b: tmp_path)
    monkeypatch.setattr(backend_venv, '_python_exe_in', lambda p: exe)

    calls = []

    def _fake_invoke(backend, module, args, **kw):
        calls.append((backend, module))
        return 0, '', ''                     # rc == 0 -> healthy

    monkeypatch.setattr(backend_venv, 'invoke_in_venv', _fake_invoke)
    yield calls
    backend_venv.invalidate_venv_probe_cache()


def test_repeated_calls_probe_the_subprocess_once(_isolate):
    """THE regression: /tts/engines re-probed on every request."""
    for _ in range(10):
        assert backend_venv.is_venv_healthy(BACKEND, PROBE) is True
    assert len(_isolate) == 1, (
        f'spawned {len(_isolate)} subprocesses for 10 calls — the probe is '
        f'uncached, which is what made GET /tts/engines take 9-20s')


def test_each_backend_probe_pair_is_cached_separately(_isolate):
    backend_venv.is_venv_healthy(BACKEND, PROBE)
    backend_venv.is_venv_healthy('kokoro', 'kokoro')
    backend_venv.is_venv_healthy(BACKEND, PROBE)
    backend_venv.is_venv_healthy('kokoro', 'kokoro')
    assert len(_isolate) == 2


def test_no_probe_module_never_spawns_and_never_caches(_isolate):
    """The cheap path — 'has the venv been created?' — is a stat, not a probe.

    It must stay outside the cache so it keeps reflecting the filesystem.
    """
    for _ in range(5):
        assert backend_venv.is_venv_healthy(BACKEND) is True
    assert _isolate == []


def test_missing_venv_beats_a_warm_cache(monkeypatch, _isolate, tmp_path):
    """A deleted venv must be seen IMMEDIATELY, not TTL seconds later.

    The `pyexe.is_file()` gate sits ABOVE the cache deliberately: caching the
    import answer must never make a wiped backend look installed.
    """
    assert backend_venv.is_venv_healthy(BACKEND, PROBE) is True   # warms it
    monkeypatch.setattr(backend_venv, '_python_exe_in',
                        lambda p: tmp_path / 'gone.exe')
    assert backend_venv.is_venv_healthy(BACKEND, PROBE) is False
    assert len(_isolate) == 1                                     # no new probe


def test_invalidate_forces_a_fresh_probe(_isolate):
    backend_venv.is_venv_healthy(BACKEND, PROBE)
    backend_venv.invalidate_venv_probe_cache()
    backend_venv.is_venv_healthy(BACKEND, PROBE)
    assert len(_isolate) == 2


def test_invalidate_can_target_one_backend(_isolate):
    backend_venv.is_venv_healthy(BACKEND, PROBE)
    backend_venv.is_venv_healthy('kokoro', 'kokoro')
    backend_venv.invalidate_venv_probe_cache(BACKEND)
    backend_venv.is_venv_healthy(BACKEND, PROBE)      # re-probes
    backend_venv.is_venv_healthy('kokoro', 'kokoro')  # still cached
    assert len(_isolate) == 3


def test_ttl_expiry_re_probes(monkeypatch, _isolate):
    """Bounds staleness if something mutates a venv without telling us."""
    t = [1000.0]
    monkeypatch.setattr(backend_venv.time, 'monotonic', lambda: t[0])
    backend_venv.is_venv_healthy(BACKEND, PROBE)
    t[0] += backend_venv._VENV_PROBE_TTL_S + 1
    backend_venv.is_venv_healthy(BACKEND, PROBE)
    assert len(_isolate) == 2


def test_unhealthy_result_is_cached_too(monkeypatch, _isolate):
    """A failing probe is the SLOW one (it waits out the import), so caching the
    negative matters more than caching the positive."""
    monkeypatch.setattr(backend_venv, 'invoke_in_venv',
                        lambda b, m, a, **kw: (_isolate.append((b, m)), (1, '', 'boom'))[1])
    assert backend_venv.is_venv_healthy(BACKEND, PROBE) is False
    assert backend_venv.is_venv_healthy(BACKEND, PROBE) is False
    assert len(_isolate) == 1


def test_never_probed_sentinel_is_not_zero():
    """The 5fa1ca01 lesson, carried forward.

    time.monotonic() is uptime-based, so on a freshly-booted box `now` can be
    smaller than the TTL. A 0.0 "never probed" marker would make `now - 0.0`
    look like a FRESH entry and return a bogus cached answer before any probe
    ever ran. Absence must be represented by absence.
    """
    backend_venv.invalidate_venv_probe_cache()
    assert backend_venv._venv_probe_cache == {}
