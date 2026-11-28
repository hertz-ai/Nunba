"""A voice whose install failed is not started in the middle of a reply.

LIVE 2026-11-28 12:55:17-12:55:48 IST, installed build, one Japanese line,
tts.synthesize = 31,053 ms (server.log):

  * mms_tts was started for the line and failed (15 s);
  * the fallback then took melotts.  Its install had failed at 10:56 (the
    pip step) and left a venv folder with python.exe and no ``melo``.  The
    fallback's list (TTSEngine._fallback_voices) asked only whether the
    folder was there, so melotts was on it: Whisper was stopped to make room
    for it ("VRAM eviction: stopping whisper to free memory for melotts"),
    its worker was spawned, and it died on "No module named 'melo'".

The selector already knew: its runnable check (_can_run_backend) had saved
"its packages do not import" for that voice.  The fallback now reads the
same saved answer.  It still starts nothing and probes nothing itself, and a
voice nobody has checked is tried as before (review rv_db95).

    python -m pytest tests/test_a_voice_whose_install_failed_is_not_started_in_a_reply.py -q
"""
import pytest

from tests.test_one_failure_does_not_silence_a_voice_that_works import (  # noqa: F401
    world)


def _two_voices(world, monkeypatch):
    """Tamil's ladder: mms_tts, then a venv voice whose folder is there."""
    from tts import backend_venv
    te = world.te
    venv_voice = te.BACKEND_INDIC_PARLER
    world.ladders['ta'] = [te.BACKEND_MMS_TTS, venv_voice, te.BACKEND_PIPER]
    monkeypatch.setattr(te, '_is_venv_backend', lambda b: b == venv_voice)
    monkeypatch.setattr(backend_venv, 'is_venv_healthy',
                        lambda name, probe_module=None: True)
    world.broken[te.BACKEND_MMS_TTS] = RuntimeError('mms_tts: model load failed')
    return venv_voice


def test_the_live_line_does_not_start_the_voice_without_its_packages(
        world, monkeypatch):
    venv_voice = _two_voices(world, monkeypatch)
    world.runnable(venv_voice, False)          # the install's own probe said no
    engine = world.boot()
    assert venv_voice not in engine._fallback_voices(
        'ta', without=world.te.BACKEND_MMS_TTS)
    world.line(engine)
    assert (venv_voice, 'ta') not in world.starts, world.starts


@pytest.mark.parametrize('saved', ['never_checked', 'said_yes'])
def test_a_voice_not_known_to_be_broken_is_still_tried(world, monkeypatch, saved):
    venv_voice = _two_voices(world, monkeypatch)
    if saved == 'said_yes':
        world.runnable(venv_voice)
    engine = world.boot()
    said, out = world.line(engine)
    assert (venv_voice, 'ta') in world.starts, world.starts
    assert said == out, 'the second voice works and the line was silent'


def test_a_voice_that_spoke_in_this_run_outranks_an_old_no(world, monkeypatch):
    """Audio on disk outranks a probe (_can_run_backend's own rule)."""
    venv_voice = _two_voices(world, monkeypatch)
    world.runnable(venv_voice, False)
    engine = world.boot()
    engine._stamped_this_run.add(venv_voice)
    assert venv_voice in engine._fallback_voices(
        'ta', without=world.te.BACKEND_MMS_TTS)
