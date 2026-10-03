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


def _clear_sse_state(main_mod):
    with main_mod._sse_lock:
        main_mod._sse_clients.clear()
        main_mod._sse_history.clear()
        main_mod._sse_lagged.clear()


@pytest.fixture(autouse=True)
def _clean_registry(main_mod):
    """Every test starts and ends with an empty registry and replay window."""
    _clear_sse_state(main_mod)
    yield
    _clear_sse_state(main_mod)


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


def _open_stream(main_mod, uid, since=None, remote_addr='127.0.0.1'):
    """Call the real SSE view and hand back its response generator.

    Deliberately NOT via ``app.test_client()`` — the test client buffers
    the whole body and this endpoint streams forever.
    """
    from urllib.parse import quote
    query = f'user_id={uid}' + (f'&since={quote(since)}' if since else '')
    with main_mod.app.test_request_context(
            f'/api/social/events/stream?{query}',
            environ_base={'REMOTE_ADDR': remote_addr}):
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


def _frame_id(frame):
    """The `id:` line of an SSE frame, or None."""
    for line in str(frame).splitlines():
        if line.startswith('id: '):
            return line[4:]
    return None


def _resume_id(frame):
    """The resume id a 'connected' frame carries in its data."""
    import json
    for line in str(frame).splitlines():
        if line.startswith('data: '):
            return json.loads(line[6:]).get('resume')
    return None


def _read_until_connected(gen):
    """Frames up to and including the 'connected' frame."""
    frames = []
    for frame in gen:
        frames.append(frame)
        if '"connected"' in frame:
            return frames
    pytest.fail(f"stream ended before its connected frame: {frames!r}")


class TestReplayWhatTheStreamMissed:
    """A frame published while a stream is away reaches it when it returns,
    exactly once, and only for its own user."""

    def _cursor(self, main_mod, uid):
        """Open a stream, take the id it hands out, close it."""
        gen = _open_stream(main_mod, uid)
        frames = _read_until_connected(gen)
        gen.close()
        cursor = _resume_id(frames[-1])
        assert cursor, f"connected frame carries no resume id: {frames[-1]!r}"
        return cursor

    def test_connected_frame_has_no_frame_id(self, main_mod):
        """Its resume point is the last id recorded for ANY user; as an
        `id:` line it collided with a real frame still queued on the
        client's other stream (review of 3e536fb4)."""
        main_mod.broadcast_sse_event('tts', {'audio_url': '/x.wav'}, user_id='other')
        gen = _open_stream(main_mod, 'u1')
        connected = _read_until_connected(gen)[-1]
        gen.close()
        assert _frame_id(connected) is None, connected
        assert _resume_id(connected), connected

    def test_every_frame_carries_an_id(self, main_mod):
        q = _queue.Queue(maxsize=50)
        with main_mod._sse_lock:
            main_mod._sse_clients['u1'] = [(q, time.time())]
        main_mod.broadcast_sse_event('tts', {'audio_url': '/a.wav'}, user_id='u1')
        assert _frame_id(q.get_nowait()), "a published frame has no id line"

    def test_missed_frame_is_replayed_on_return(self, main_mod):
        cursor = self._cursor(main_mod, 'u1')
        main_mod.broadcast_sse_event('tts', {'audio_url': '/gap.wav'}, user_id='u1')

        gen = _open_stream(main_mod, 'u1', since=cursor)
        frames = _read_until_connected(gen)
        gen.close()

        assert any('/gap.wav' in f for f in frames), (
            f"the frame published during the gap was not replayed: {frames!r}")

    def test_fresh_stream_without_since_replays_nothing(self, main_mod):
        main_mod.broadcast_sse_event('tts', {'audio_url': '/old.wav'}, user_id='u1')
        gen = _open_stream(main_mod, 'u1')
        frames = _read_until_connected(gen)
        gen.close()
        assert len(frames) == 1 and '"connected"' in frames[0], frames

    def test_replay_is_idempotent(self, main_mod):
        cursor = self._cursor(main_mod, 'u1')
        main_mod.broadcast_sse_event('tts', {'audio_url': '/once.wav'}, user_id='u1')

        runs = []
        for _ in range(2):
            gen = _open_stream(main_mod, 'u1', since=cursor)
            runs.append([f for f in _read_until_connected(gen)
                         if '"connected"' not in f])
            gen.close()
        assert runs[0] == runs[1] and len(runs[0]) == 1, runs

    def test_frame_is_replayed_or_live_never_both(self, main_mod):
        cursor = self._cursor(main_mod, 'u1')
        main_mod.broadcast_sse_event('tts', {'audio_url': '/before.wav'}, user_id='u1')
        gen = _open_stream(main_mod, 'u1', since=cursor)
        frames = _read_until_connected(gen)
        main_mod.broadcast_sse_event('tts', {'audio_url': '/after.wav'}, user_id='u1')
        frames.append(next(gen))
        gen.close()

        body = ''.join(frames)
        assert body.count('/before.wav') == 1, frames
        assert body.count('/after.wav') == 1, frames
        ids = [_frame_id(f) for f in frames if _frame_id(f)]
        assert len(ids) == len(set(ids)), f"an id was delivered twice: {ids}"

    def test_replay_never_crosses_users(self, main_mod):
        cursor = self._cursor(main_mod, 'u1')
        main_mod.broadcast_sse_event('tts', {'audio_url': '/other.wav'}, user_id='u2')
        main_mod.broadcast_sse_event('system.health', {'ok': True}, user_id=None)

        gen = _open_stream(main_mod, 'u1', since=cursor)
        body = ''.join(_read_until_connected(gen))
        gen.close()

        assert '/other.wav' not in body, "u2's frame was replayed to u1"
        assert 'system.health' in body, "a broadcast-to-all frame was not replayed"

    def test_restart_replays_everything_kept(self, main_mod):
        main_mod.broadcast_sse_event('tts', {'audio_url': '/after-restart.wav'},
                                     user_id='u1')
        gen = _open_stream(main_mod, 'u1', since='deadbeef-999999')
        body = ''.join(_read_until_connected(gen))
        gen.close()
        assert '/after-restart.wav' in body

    def test_malformed_since_replays_nothing(self, main_mod):
        main_mod.broadcast_sse_event('tts', {'audio_url': '/x.wav'}, user_id='u1')
        # Review of b07e025f: str.isdigit() took '²', and a 5000-digit seq
        # made int() raise inside the stream on every reconnect.
        for bad in ('garbage', '-5', 'abc-', 'abc-1x', 'abc-²', 'abc-' + '9' * 5000):
            gen = _open_stream(main_mod, 'u1', since=bad)
            frames = _read_until_connected(gen)
            gen.close()
            assert len(frames) == 1, (bad, frames)

    def test_expired_frames_are_not_replayed(self, main_mod, monkeypatch):
        cursor = self._cursor(main_mod, 'u1')
        main_mod.broadcast_sse_event('tts', {'audio_url': '/stale.wav'}, user_id='u1')
        later = time.time() + main_mod._SSE_HISTORY_TTL_S + 1
        monkeypatch.setattr(main_mod.time, 'time', lambda: later)

        gen = _open_stream(main_mod, 'u1', since=cursor)
        body = ''.join(_read_until_connected(gen))
        gen.close()
        assert '/stale.wav' not in body

    def test_history_is_bounded_per_user(self, main_mod):
        for i in range(main_mod._SSE_HISTORY_LEN + 10):
            main_mod.broadcast_sse_event('tick', {'i': i}, user_id='u1')
        assert len(main_mod._sse_history['u1']) == main_mod._SSE_HISTORY_LEN


class TestReplayNeedsMoreThanAClaimedUserId:
    """Review of b07e025f: bundled mode takes ?user_id= without a token, so
    a LAN host could pull a user's last minute of frames by naming them."""

    def test_lan_host_without_token_gets_no_replay(self, main_mod):
        gen = _open_stream(main_mod, 'u1')
        cursor = _resume_id(_read_until_connected(gen)[-1])
        gen.close()
        main_mod.broadcast_sse_event('chat.response', {'text': 'private'}, user_id='u1')

        gen = _open_stream(main_mod, 'u1', since=cursor, remote_addr='192.168.0.77')
        frames = _read_until_connected(gen)
        gen.close()
        assert len(frames) == 1 and 'private' not in ''.join(frames), frames

    def test_this_machine_still_gets_replay(self, main_mod):
        gen = _open_stream(main_mod, 'u1')
        cursor = _resume_id(_read_until_connected(gen)[-1])
        gen.close()
        main_mod.broadcast_sse_event('chat.response', {'text': 'mine'}, user_id='u1')

        gen = _open_stream(main_mod, 'u1', since=cursor)
        body = ''.join(_read_until_connected(gen))
        gen.close()
        assert 'mine' in body


class TestOneLockHold:
    """Review of b07e025f: moving the enqueue, the record or the replay
    snapshot out of their lock hold passed every other test here."""

    def _ids(self, frames):
        return [int(_frame_id(f).split('-')[1]) for f in frames if _frame_id(f)]

    def test_concurrent_publishers_deliver_in_id_order(self, main_mod):
        import threading
        q = _queue.Queue()
        with main_mod._sse_lock:
            main_mod._sse_clients['u1'] = [(q, time.time())]

        def publish(n):
            for i in range(300):
                main_mod.broadcast_sse_event('tick', {'p': n, 'i': i}, user_id='u1')

        threads = [threading.Thread(target=publish, args=(n,)) for n in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        frames = []
        while not q.empty():
            frames.append(q.get_nowait())
        ids = self._ids(frames)
        assert len(ids) == 1200
        assert ids == sorted(ids), "frames reached the queue out of id order"

    def test_stream_opened_mid_publish_misses_and_repeats_nothing(self, main_mod):
        import threading
        gen = _open_stream(main_mod, 'u1')
        cursor = _resume_id(_read_until_connected(gen)[-1])
        gen.close()
        start = threading.Event()

        def publish(n):
            start.wait()
            for i in range(12):
                main_mod.broadcast_sse_event('tick', {'p': n, 'i': i}, user_id='u1')

        threads = [threading.Thread(target=publish, args=(n,)) for n in range(4)]
        for t in threads:
            t.start()
        start.set()
        gen = _open_stream(main_mod, 'u1', since=cursor)
        replayed = _read_until_connected(gen)
        for t in threads:
            t.join()
        with main_mod._sse_lock:
            q = main_mod._sse_clients['u1'][0][0]
        live = []
        while not q.empty():
            live.append(q.get_nowait())
        gen.close()

        ids = self._ids(replayed) + self._ids(live)
        assert len(ids) == 48, f"{len(ids)} delivered of 48"
        assert len(set(ids)) == 48, "a frame was both replayed and delivered live"

    def test_idle_users_are_swept_from_history(self, main_mod, monkeypatch):
        main_mod.broadcast_sse_event('tick', {}, user_id='gone')
        later = time.time() + main_mod._SSE_HISTORY_TTL_S + 1
        monkeypatch.setattr(main_mod.time, 'time', lambda: later)
        for _ in range(main_mod._SSE_HISTORY_LEN):
            main_mod.broadcast_sse_event('tick', {}, user_id='active')
        assert 'gone' not in main_mod._sse_history


class TestFullQueueResumesInsteadOfLosing:
    """A dropped frame on a full queue ends the stream; the client resumes
    from its last id and the replay window returns the dropped frame."""

    def test_full_queue_ends_stream_and_frame_is_replayable(self, main_mod):
        gen = _open_stream(main_mod, 'slow')
        cursor = _resume_id(_read_until_connected(gen)[-1])
        with main_mod._sse_lock:
            q = main_mod._sse_clients['slow'][0][0]
        while not q.full():
            q.put_nowait(': filler\n\n')
        main_mod.broadcast_sse_event('tts', {'audio_url': '/dropped.wav'},
                                     user_id='slow')

        with pytest.raises(StopIteration):
            next(gen)
        assert 'slow' not in main_mod._sse_clients, "lagged stream stayed registered"
        assert not main_mod._sse_lagged, "lag flag outlived its stream"

        gen = _open_stream(main_mod, 'slow', since=cursor)
        body = ''.join(_read_until_connected(gen))
        gen.close()
        assert '/dropped.wav' in body, "the dropped frame was not replayed"
