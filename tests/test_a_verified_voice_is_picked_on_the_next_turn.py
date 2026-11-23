"""A voice that has just been set up, verified and used is picked again on
the next turn; it is not "missing".

The defect (live walk, 22 Nov 2026, a Tamil speech agent on a source run):
MMS-TTS was set up, its handshake passed ("mms_tts ready") and it spoke one
reply.  On the next Tamil turn the selector called it unavailable again,
started its setup again and returned Piper, which has no Tamil voice:

    [auto-install] Starting background install for 'mms_tts'
    All backends unavailable for 'ta' AND Piper has no voice for it

Two checks disagreed.  The selector's "can it run" asks an import probe,
which needs the frozen app's python-embed and answers "not runnable" for
every backend in a source run; "it is ready" was a real synthesis.  Audio
on disk outranks an import probe: a backend whose handshake passed in this
run is runnable (TTSEngine._can_run_backend).

Real: _select_backend_for_language, _can_run_backend, tts_handshake's
record.  Faked: the import probe (says no, as in a source run), the VRAM
check, the installer (recorded, nothing is installed).
"""
import types

import pytest


@pytest.fixture
def ladder(monkeypatch, tmp_path):
    from tts import tts_engine as te
    from tts import tts_handshake as hs
    monkeypatch.setenv('NUNBA_TTS_STATE_PATH', str(tmp_path / 'tts_state.json'))
    monkeypatch.setattr(te.TTSEngine, '_import_check_cache',
                        {'_torch_cuda': True})
    probes = []
    monkeypatch.setattr(
        te, '_probe_backend_runnable',
        lambda backend, pkg: probes.append(backend) or False)
    monkeypatch.setattr(te.TTSEngine, '_vram_allows', lambda self, b: True)
    monkeypatch.setattr(te.TTSEngine, '_ensure_hw_detected', lambda self: None)
    started = []
    monkeypatch.setattr(te.TTSEngine, '_try_auto_install_backend',
                        lambda self, b: started.append(b))
    monkeypatch.setattr(hs, '_cache', {})
    engine = te.TTSEngine(auto_init=False)
    engine.has_gpu = True
    engine._demoted_backends.clear()

    def verified(backend, lang='ta', ok=True):
        hs._cache[(backend, lang)] = types.SimpleNamespace(ok=ok)
    return types.SimpleNamespace(te=te, engine=engine, started=started,
                                 verified=verified, probes=probes)


def test_before_it_is_verified_the_voice_is_set_up_and_piper_is_returned(ladder):
    """As it was: the first turn starts the setup."""
    picked = ladder.engine._select_backend_for_language('ta')
    assert picked == ladder.te.BACKEND_PIPER
    assert ladder.te.BACKEND_MMS_TTS in ladder.started


def test_once_verified_it_is_picked_and_not_set_up_again(ladder):
    ladder.engine._select_backend_for_language('ta')
    del ladder.started[:]
    ladder.verified(ladder.te.BACKEND_MMS_TTS)

    picked = ladder.engine._select_backend_for_language('ta')

    assert picked == ladder.te.BACKEND_MMS_TTS
    assert ladder.te.BACKEND_MMS_TTS not in ladder.started
    # and on every turn after it
    assert ladder.engine._select_backend_for_language('ta') == \
        ladder.te.BACKEND_MMS_TTS
    assert ladder.engine._can_run_backend(ladder.te.BACKEND_MMS_TTS) is True


def test_a_voice_that_has_not_spoken_is_still_not_runnable(ladder):
    ladder.verified(ladder.te.BACKEND_MMS_TTS)
    assert ladder.engine._can_run_backend(ladder.te.BACKEND_XTTS_V2) is False
    assert ladder.engine._can_run_backend(ladder.te.BACKEND_MMS_TTS) is True


def test_a_handshake_that_failed_makes_nothing_runnable(ladder):
    ladder.verified(ladder.te.BACKEND_MMS_TTS, ok=False)
    assert ladder.engine._can_run_backend(ladder.te.BACKEND_MMS_TTS) is False
    assert ladder.engine._select_backend_for_language('ta') == \
        ladder.te.BACKEND_PIPER


def test_a_verified_voice_still_needs_room_to_run(ladder, monkeypatch):
    """The other checks are not waived: only the import probe is outranked."""
    ladder.verified(ladder.te.BACKEND_MMS_TTS)
    monkeypatch.setattr(ladder.te.TTSEngine, '_vram_allows',
                        lambda self, b: False)
    assert ladder.engine._can_run_backend(ladder.te.BACKEND_MMS_TTS) is False


def test_a_probe_that_says_yes_is_believed_as_before(ladder, monkeypatch):
    monkeypatch.setattr(ladder.te, '_probe_backend_runnable',
                        lambda backend, pkg: True)
    assert ladder.engine._can_run_backend(ladder.te.BACKEND_MMS_TTS) is True
