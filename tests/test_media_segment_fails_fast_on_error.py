"""A media segment that failed is reported as failed at once, not 120 s later.

HARTOS 4b44aac5c + f1697c670 (mine) made check_media_status report a failed
composition in the house vocabulary, ``status: 'error'`` -- for an AceStep
failure, for a "succeeded but saved nothing", and for a task the server knows
nothing about. The video sidecars still pass their own ``'failed'`` through.
So a caller must treat BOTH as terminal.

routes/kids_media_routes.py did: ``in ('failed', 'error')``. But
tts/tts_engine.py _synth_media_segment -- the generic non-speech path music
reaches -- branched only on ``== 'failed'``. An ``'error'`` matched neither
completed nor failed, so the loop polled every 2 s until its 120 s deadline
before giving up. Found by the 2026-09-23 review's caller census (finding N1).

Not a regression: before 5ceedeb13 the poll named no task and EVERY outcome
read 'unknown', so this path polled the full 120 s for success and failure
alike. Success became legible then; fail-fast did not, because this caller
was never updated to the new vocabulary.

The fix reads the ONE definition, media_agent.MEDIA_FAILED_STATUSES, so the
two Nunba callers and HARTOS's own bind_game_sound cannot drift apart again.

Driven through the real method with only the boundary stubbed: the
media_agent module (generate_media / check_media_status) and the clock.
"""
import json
import sys
import types

import pytest


def _media_agent_stub(poll_status, calls):
    mod = types.ModuleType('integrations.service_tools.media_agent')

    def generate_media(**_kw):
        return json.dumps({'status': 'pending', 'task_id': 'acestep_t1'})

    def check_media_status(task_id):
        calls.append(task_id)
        return json.dumps({'status': poll_status, 'error': 'model failed to load'})

    mod.generate_media = generate_media
    mod.check_media_status = check_media_status
    mod.MEDIA_FAILED_STATUSES = frozenset({'failed', 'error'})
    return mod


@pytest.fixture
def fake_clock(monkeypatch):
    """No real sleeping, and a clock that advances 2 s per read, so the 120 s
    deadline is reachable in ~60 reads rather than two real minutes."""
    import time as _time
    now = [1_000_000.0]

    def _fake_time():
        now[0] += 2.0
        return now[0]
    monkeypatch.setattr(_time, 'sleep', lambda *_a, **_k: None)
    monkeypatch.setattr(_time, 'time', _fake_time)
    return now


@pytest.mark.parametrize('terminal', ['error', 'failed'])
def test_a_failed_segment_returns_after_one_poll(monkeypatch, fake_clock,
                                                  tmp_path, terminal):
    calls = []
    monkeypatch.setitem(sys.modules, 'integrations.service_tools.media_agent',
                        _media_agent_stub(terminal, calls))
    from tts.tts_engine import TTSEngine

    out = TTSEngine._synth_media_segment(
        None, 'audio_music', 'a bright chime', str(tmp_path / 'seg.wav'))

    assert out is None, 'a failed composition produced no audio'
    assert len(calls) == 1, (
        f"status {terminal!r} is terminal; the segment must stop at the first "
        f"poll that says so, not keep polling to its 120 s deadline -- it "
        f"polled {len(calls)} times")


def test_a_still_running_segment_keeps_polling(monkeypatch, fake_clock, tmp_path):
    """The other side of the boundary: 'processing' is NOT terminal, so the
    fix must not turn every non-completed status into an early exit."""
    calls = []
    monkeypatch.setitem(sys.modules, 'integrations.service_tools.media_agent',
                        _media_agent_stub('processing', calls))
    from tts.tts_engine import TTSEngine

    out = TTSEngine._synth_media_segment(
        None, 'audio_music', 'a bright chime', str(tmp_path / 'seg.wav'))

    assert out is None
    assert len(calls) > 10, (
        f"a still-running task must keep being polled; it stopped after "
        f"{len(calls)} polls")
