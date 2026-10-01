"""No test may read or write the owner's real ``tts_state.json``.

2026-09-27 17:42:31 seven engines (f5, kokoro, melotts, xtts_v2,
indic_parler, mms_tts, neutts_air) were demoted for seven days in the
owner's real ~/Documents/Nunba/data/tts_state.json by a test run:
tests/test_tts_lang_safety.py and others build a TTSEngine whose
backends are patched to raise, and none of them redirected
``_get_tts_state_path``, so the engine's own save wrote the real file.
The installed app then skipped those engines on every boot and spoke
with Piper.  The autouse fixture in tests/conftest.py now gives every
test its own file; this test pins that.
"""
import os


def test_every_test_gets_a_private_tts_state_file(tmp_path):
    from tts import tts_engine

    path = tts_engine._get_tts_state_path()

    assert path == str(tmp_path / 'tts_state.json')
    assert os.environ.get('NUNBA_TTS_STATE_PATH') == path


def test_a_failing_engine_in_a_test_writes_only_the_private_file(tmp_path):
    """The shape that polluted the owner's file: demote through the real
    save path and see where the bytes land."""
    from tts.tts_engine import TTSEngine

    eng = TTSEngine(auto_init=False)
    eng._demoted_backends.add('kokoro')
    eng._save_persisted_demotions()

    assert (tmp_path / 'tts_state.json').is_file()
