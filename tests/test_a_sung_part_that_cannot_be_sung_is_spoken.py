"""A sung part that no singer can make is spoken, never dropped.

Owner, 28 Nov 2026, singing part 3 of 4 ("all 4 parts").  A reply's
<sing>...</sing> (or <lyrics>) words go to a singing model through
_synth_sing_segment.  On a machine where nothing can sing (no singing model
installed, the composer is down, it failed or timed out) that call returns
nothing, and _synthesize_multilingual dropped the part: a reply that was all
<sing> played nothing at all, and a rhyme between two spoken lines lost its
words.  Now the words are spoken instead, in the language the segmenter
detects for them (a Tamil rhyme is spoken by the Tamil voice, not by
English), and the rest of the line is unchanged.  A <music> part has no words
to speak and is still left out when it cannot be made.

Real TTSEngine._synthesize_multilingual, the real language segmenter and the
real WAV join.  The speaking and singing engines are stand-ins that write a
tone in a real engine's format; nothing else is stubbed.

    python -m pytest tests/test_a_sung_part_that_cannot_be_sung_is_spoken.py -q
"""
import math
import os
import sys
import wave

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import pytest  # noqa: E402

RATE = 22050


def _tone(path, seconds, rate=RATE):
    n = int(round(rate * seconds))
    frames = b''.join(
        int(0.25 * math.sin(2 * math.pi * 220 * i / rate) * 32767).to_bytes(
            2, 'little', signed=True) for i in range(n))
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(frames)
    return path


def _seconds(path):
    with wave.open(path, 'rb') as w:
        return w.getnframes() / w.getframerate()


@pytest.fixture
def engine(monkeypatch, tmp_path):
    """spoken: (text, lang) of every part the speaking engine was asked for.
    sung: the words the singer was asked for.  singer: what the singer does."""
    monkeypatch.setenv('NUNBA_TTS_STATE_PATH', str(tmp_path / 'tts_state.json'))
    from tts.tts_engine import TTSEngine
    eng = TTSEngine.__new__(TTSEngine)
    eng.spoken, eng.sung = [], []
    eng.singer = 'none'   # 'none' -> returns None, 'raise', 'empty' -> 0-byte file, 'sings'

    def speak(text, lang, out_path, *, warm_up=False, **_k):
        eng.spoken.append((text, lang))
        return _tone(out_path, 0.5)

    def sing(text, _duration, out_path):
        eng.sung.append(text)
        if eng.singer == 'raise':
            raise RuntimeError('composer is down')
        if eng.singer == 'empty':
            open(out_path, 'wb').close()
            return out_path
        if eng.singer == 'sings':
            return _tone(out_path, 1.5)
        return None

    eng._synth_speech_segment = speak
    eng._synth_sing_segment = sing
    eng._synth_music_segment = lambda *a, **k: None
    return eng


def _say(eng, text, tmp_path, language=None):
    """As TTSEngine.synthesize splits a reply: by the segmenter, with the
    requested language."""
    from tts.language_segmenter import segment
    return eng._synthesize_multilingual(segment(text, language=language),
                                        output_path=str(tmp_path / 'line.wav'))


def test_spanish_words_that_cannot_be_sung_are_spoken_in_spanish(engine, tmp_path):
    """Design review 1, item 1 (28 Nov): the unsung words were split with no
    language, so Latin-script words went to the English voice."""
    _say(engine, 'Escucha. <sing>la cucaracha ya no puede caminar</sing>', tmp_path,
         language='es')
    assert engine.spoken == [('Escucha.', 'es'), ('la cucaracha ya no puede caminar', 'es')]


def test_a_reply_that_is_all_singing_is_spoken_in_the_engines_language(engine, tmp_path):
    engine._language = 'es'
    _say(engine, '<sing>la cucaracha</sing>', tmp_path, language='es')
    assert engine.spoken == [('la cucaracha', 'es')]


@pytest.mark.parametrize('singer', ['none', 'raise', 'empty'])
def test_a_reply_that_is_all_singing_is_spoken_when_nothing_can_sing(engine, tmp_path, singer):
    engine.singer = singer
    out = _say(engine, '<sing duration="15">Twinkle twinkle little star</sing>', tmp_path)
    assert engine.sung == ['Twinkle twinkle little star'], 'the singer is still asked first'
    assert [t for t, _ in engine.spoken] == ['Twinkle twinkle little star']
    assert out and os.path.isfile(out), 'the reply plays something'
    assert _seconds(out) == pytest.approx(0.5, abs=0.01)


def test_a_rhyme_between_spoken_lines_keeps_its_words_and_its_place(engine, tmp_path):
    out = _say(engine, 'Here is a rhyme. <sing>Row row row your boat</sing> Did you like it?',
               tmp_path)
    assert [t.strip() for t, _ in engine.spoken] == [
        'Here is a rhyme.', 'Row row row your boat', 'Did you like it?']
    assert _seconds(out) == pytest.approx(1.5, abs=0.02)


def test_lyrics_that_cannot_be_sung_are_spoken_too(engine, tmp_path):
    _say(engine, '<lyrics>Baa baa black sheep</lyrics>', tmp_path)
    assert engine.sung == ['Baa baa black sheep']
    assert [t for t, _ in engine.spoken] == ['Baa baa black sheep']


def test_a_tamil_rhyme_is_spoken_in_tamil(engine, tmp_path):
    _say(engine, '<sing>நிலா நிலா ஓடி வா</sing>', tmp_path)
    assert engine.spoken == [('நிலா நிலா ஓடி வா', 'ta')]


def test_a_sung_part_that_is_sung_is_not_also_spoken(engine, tmp_path):
    engine.singer = 'sings'
    out = _say(engine, 'Listen. <sing>Twinkle twinkle</sing>', tmp_path)
    assert [t.strip() for t, _ in engine.spoken] == ['Listen.']
    assert _seconds(out) == pytest.approx(0.5 + 1.5, abs=0.02)


def test_music_that_cannot_be_made_is_still_left_out(engine, tmp_path):
    out = _say(engine, 'Hello there. <music genre="jazz" duration="10">calm</music>', tmp_path)
    assert [t.strip() for t, _ in engine.spoken] == ['Hello there.']
    assert _seconds(out) == pytest.approx(0.5, abs=0.01)
