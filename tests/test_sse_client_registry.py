"""SSE client-registry invariants (task #643).

The registry ``main._sse_clients`` answers exactly one question: *which
live subscriptions exist right now?*  Membership must therefore be a
function of subscription EVENTS (stream opened / stream closed) and
nothing else.

Two defects motivated this file, both proven from live logs on
2026-08-12 (frozen build):

1. AGE EVICTION OF A LIVE CLIENT.  ``_SSE_CLIENT_TTL = 3600`` was
   compared against the connect time, which is never refreshed, so a
   perfectly healthy stream was dropped from the registry exactly 3600s
   after connecting.  Eviction did not close the stream, so the browser
   never saw an error, ``EventSource`` never reconnected, and every
   later per-user publish went to an empty list.  Live proof: connect
   logged 01:16:27, registry went 1 -> 0 at 02:16:27 (+3600s exactly),
   then 0 clients for 7h / 7,524 broadcasts spanning a real chat turn
   whose TTS wav was synthesized fine and never heard.

2. NON-ATOMIC REGISTRATION.  Registration ran in the view function
   while de-registration lived in the generator's ``finally``.  A
   generator body does not execute until Flask iterates it, and closing
   a NEVER-STARTED generator does not run its ``try/finally`` — so a
   client that aborted before streaming began leaked an entry forever.
   That leak is why an age sweeper felt necessary; it was compensating
   for the split scope rather than fixing it.

The invariant these tests pin: registration and de-registration share
one scope (the generator's lifetime), and connection AGE never affects
delivery.  Liveness detection stays event-driven — the 30s heartbeat
write fails on a dead peer, which raises out of the generator and runs
``finally``, converting a half-open socket into a real close event.
"""
import os
import queue as _queue
import sys
import time

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


@pytest.fixture(scope='module')
def main_mod():
    try:
        import main
    except Exception as e:  # pragma: no cover - import env issue
        pytest.skip(f"Could not import main.py: {e}")
    return main


@pytest.fixture(autouse=True)
def _clean_registry(main_mod):
    """Every test starts and ends with an empty registry."""
    with main_mod._sse_lock:
        main_mod._sse_clients.clear()
    yield
    with main_mod._sse_lock:
        main_mod._sse_clients.clear()


@pytest.fixture(autouse=True)
def _local_mode(monkeypatch):
    """Unlock the endpoint's no-JWT local branch, REVERSIBLY.

    Setting os.environ directly would leak NUNBA_BUNDLED into every
    later test in a full-suite run and silently flip other tests'
    view of `_is_local` — notably the three TestSSEEvents token tests
    in test_flask_routes.py, which assert a 401 that only happens when
    NOT local.  monkeypatch undoes it per test.
    """
    monkeypatch.setenv('NUNBA_BUNDLED', '1')


def _open_stream(main_mod, uid):
    """Call the real SSE view and hand back its response generator.

    Deliberately NOT via ``app.test_client()`` — the test client buffers
    the whole body and this endpoint streams forever.
    """
    with main_mod.app.test_request_context(
            f'/api/social/events/stream?user_id={uid}'):
        resp = main_mod.sse_event_stream()
    # A Flask view may return (body, status) on the auth-reject path.
    if isinstance(resp, tuple):
        pytest.fail(f"SSE view rejected the local request: {resp!r}")
    return resp.response


class TestAgeMustNotAffectDelivery:
    """Defect 1 — a live subscriber must never be forgotten for being old."""

    def test_ancient_connection_still_receives(self, main_mod):
        q = _queue.Queue(maxsize=50)
        ancient = time.time() - 86400        # connected 24h ago, still alive
        with main_mod._sse_lock:
            main_mod._sse_clients['u1'] = [(q, ancient)]

        main_mod.broadcast_sse_event('tts', {'audio_url': '/x.wav'},
                                     user_id='u1')

        assert not q.empty(), (
            "a live 24h-old subscriber received nothing — connection AGE "
            "was used as a liveness signal")
        assert 'u1' in main_mod._sse_clients, (
            "a live 24h-old subscriber was evicted from the registry")

    def test_ancient_connection_still_receives_broadcast_to_all(self, main_mod):
        q = _queue.Queue(maxsize=50)
        with main_mod._sse_lock:
            main_mod._sse_clients['u1'] = [(q, time.time() - 86400)]

        main_mod.broadcast_sse_event('system.health', {'ok': True},
                                     user_id=None)

        assert not q.empty(), "age blocked a broadcast-to-all delivery"

    def test_no_ttl_sweeper_survives(self, main_mod):
        """The age-based authority must be GONE, not merely retuned.

        Two authorities over one fact (connection events vs. a clock)
        always drift.  This is the drift guard.
        """
        assert not hasattr(main_mod, '_SSE_CLIENT_TTL'), (
            "_SSE_CLIENT_TTL still exists — the time-driven eviction "
            "authority is back alongside the event-driven one")

    def test_cleanup_helper_does_not_drop_live_clients(self, main_mod):
        """Whatever sweeper remains must not remove a live entry."""
        cleanup = getattr(main_mod, '_cleanup_dead_sse_clients', None)
        if cleanup is None:
            pytest.skip("no cleanup helper — nothing to constrain")
        q = _queue.Queue(maxsize=50)
        with main_mod._sse_lock:
            main_mod._sse_clients['u1'] = [(q, time.time() - 86400)]
        cleanup()
        assert 'u1' in main_mod._sse_clients, (
            "the sweeper removed a live subscriber purely for its age")


class TestRegistrationIsAtomicWithTheStream:
    """Defect 2 — membership must equal the generator's lifetime."""

    def test_unstarted_stream_leaves_no_entry(self, main_mod):
        """A client that aborts before streaming must not leak an entry.

        Closing a never-started generator does NOT run its finally, so
        registering outside the generator leaks here.
        """
        gen = _open_stream(main_mod, 'leaky')
        gen.close()                      # never iterated
        total = sum(len(v) for v in main_mod._sse_clients.values())
        assert total == 0, (
            f"aborted-before-stream left {total} orphan entrie(s) — "
            "registration is not in the generator's scope")

    def test_started_stream_registers(self, main_mod):
        gen = _open_stream(main_mod, 'live1')
        first = next(gen)                # runs to the 'connected' yield
        assert 'connected' in str(first)
        assert 'live1' in main_mod._sse_clients, (
            "an open stream is not present in the registry")
        gen.close()

    def test_close_deregisters(self, main_mod):
        gen = _open_stream(main_mod, 'live2')
        next(gen)
        assert 'live2' in main_mod._sse_clients
        gen.close()                      # real close event
        assert 'live2' not in main_mod._sse_clients, (
            "closing the stream did not remove the subscription")

    def test_open_stream_receives_published_event(self, main_mod):
        """End-to-end within the process: publish reaches an open stream."""
        gen = _open_stream(main_mod, 'live3')
        next(gen)
        main_mod.broadcast_sse_event('tts', {'audio_url': '/a.wav'},
                                     user_id='live3')
        payload = next(gen)              # queued message, not a heartbeat
        assert '/a.wav' in str(payload), (
            f"published event never reached the open stream: {payload!r}")
        gen.close()
