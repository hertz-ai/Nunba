"""A line that mixes languages, or speech with singing, is spoken by more than
one engine, and the parts are joined into one WAV.  Each engine or model writes
its own sample rate, channel count and sample format (mms_tts 16 kHz for Tamil,
Piper 22.05 kHz for English, a singing model 48 kHz stereo, torch engines
32-bit float, some models 24-bit).  A part copied into the joined file under
another part's header plays at the wrong speed and pitch; a part `wave` cannot
open was dropped.

Live 2026-11-25 on the installed Nunba's interpreter (files in
D:\\claude_scratch\\66e67cad\\tts_mix_test): "வணக்கம் Zoey! இது பந்து. Now say
ball. Great job!" was joined at the first part's 16 kHz with Piper's 22.05 kHz
frames copied unconverted.  The English played 1.38x slow and low ("Now say
ball, great job!" is 2.206 s of speech and took 3.04 s) and Whisper heard
"Zoey!" as "Sorry.".  The joined file ran 6.336 s; its parts add up to 5.217 s.

Real TTSEngine._synthesize_multilingual, HARTOS read_wav_f32 and
resample_pcm16.  The engines are stand-ins that write a tone in each real
engine's format; nothing else is stubbed.

    python -m pytest tests/test_tts_mixed_language_join_keeps_each_part_speed.py -q
"""
import math
import os
import struct
import sys
import wave
from array import array

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import pytest  # noqa: E402

# The live line's four parts: (language, engine rate, seconds of speech).
LIVE_LINE = [
    ('ta', 16000, 0.928),   # வணக்கம்            mms_tts
    ('en', 22050, 0.755),   # Zoey!              Piper en_US-amy
    ('ta', 16000, 1.328),   # இது பந்து.          mms_tts
    ('en', 22050, 2.206),   # Now say ball. ...  Piper
]


def _tone_values(rate, seconds, channels):
    n = int(round(rate * seconds))
    out = []
    for i in range(n):
        v = 0.25 * math.sin(2 * math.pi * 220 * i / rate)
        out.extend([v] * channels)
    return out


def _write(path, rate, seconds, channels=1, fmt='pcm16'):
    """Write `seconds` of a 220 Hz tone in one engine's output format."""
    vals = _tone_values(rate, seconds, channels)
    if fmt == 'garbage':  # an engine that wrote something no WAV reader reads
        with open(path, 'wb') as f:
            f.write(b'not audio at all, but long enough to pass the size check' * 4)
        return path
    if fmt == 'float32':  # torchaudio.save / scipy of a float tensor
        data = array('f', vals).tobytes()
        fmt_chunk = struct.pack('<HHIIHH', 3, channels, rate, rate * 4 * channels,
                                4 * channels, 32)
        body = (b'WAVE' + b'fmt ' + struct.pack('<I', len(fmt_chunk)) + fmt_chunk
                + b'data' + struct.pack('<I', len(data)) + data)
        with open(path, 'wb') as f:
            f.write(b'RIFF' + struct.pack('<I', len(body)) + body)
        return path
    width = 3 if fmt == 'pcm24' else 2
    full = (1 << (8 * width - 1)) - 1
    frames = b''.join(int(v * full).to_bytes(width, 'little', signed=True) for v in vals)
    with wave.open(path, 'wb') as w:
        w.setnchannels(channels)
        w.setsampwidth(width)
        w.setframerate(rate)
        w.writeframes(frames)
    return path


def _length(path):
    with wave.open(path, 'rb') as w:
        return w.getnframes() / w.getframerate(), w.getframerate(), w.getnchannels()


@pytest.fixture
def engine(monkeypatch, tmp_path):
    monkeypatch.setenv('NUNBA_TTS_STATE_PATH', str(tmp_path / 'tts_state.json'))
    from tts.tts_engine import TTSEngine
    eng = TTSEngine.__new__(TTSEngine)
    eng.parts = {}
    eng.written = []

    def speak(text, out_path):
        rate, seconds, channels, fmt = eng.parts[text]
        eng.written.append(out_path)
        return _write(out_path, rate, seconds, channels, fmt)

    eng._synth_speech_segment = lambda text, lang, out_path, *, warm_up=False, **_k: speak(text, out_path)
    eng._synth_sing_segment = lambda text, _duration, out_path: speak(text, out_path)
    eng._synth_music_segment = lambda *a, **k: None
    return eng


def _segments(eng, line):
    """line: (lang, rate, seconds[, channels[, fmt]]); lang 'sing' is a sung part."""
    segs = []
    for i, part in enumerate(line):
        lang, rate, seconds = part[:3]
        channels = part[3] if len(part) > 3 else 1
        fmt = part[4] if len(part) > 4 else 'pcm16'
        text = f'part {i} {lang}'
        eng.parts[text] = (rate, seconds, channels, fmt)
        segs.append({'type': 'sing' if lang == 'sing' else 'speech',
                     'lang': lang, 'text': text})
    return segs


def _join(eng, line, tmp_path):
    return eng._synthesize_multilingual(_segments(eng, line),
                                        output_path=str(tmp_path / 'joined.wav'))


def test_the_live_tamil_first_line_keeps_every_part_at_its_own_speed(engine, tmp_path):
    seconds, rate, _ = _length(_join(engine, LIVE_LINE, tmp_path))
    assert seconds == pytest.approx(sum(p[2] for p in LIVE_LINE), abs=0.01), (
        f'joined line runs {seconds:.3f} s; a part played at the wrong rate')
    assert rate == 22050, 'no part is downsampled: the join keeps the highest rate'


def test_an_english_first_line_keeps_the_tamil_at_its_own_speed(engine, tmp_path):
    line = [LIVE_LINE[3], LIVE_LINE[0], LIVE_LINE[1], LIVE_LINE[2]]
    seconds, _, _ = _length(_join(engine, line, tmp_path))
    assert seconds == pytest.approx(sum(p[2] for p in line), abs=0.01)


def test_a_sung_stereo_part_between_spoken_parts_keeps_its_length(engine, tmp_path):
    line = [LIVE_LINE[0], ('sing', 48000, 1.5, 2), LIVE_LINE[3]]
    seconds, rate, channels = _length(_join(engine, line, tmp_path))
    assert seconds == pytest.approx(0.928 + 1.5 + 2.206, abs=0.01)
    assert (rate, channels) == (48000, 1)


def test_float_and_24_bit_parts_from_other_models_are_joined(engine, tmp_path):
    """A float WAV first (wave refuses it: the old join returned that part
    alone) and a 24-bit part (wave reads it, the old join copied it raw)."""
    line = [('en', 24000, 0.8, 1, 'float32'), LIVE_LINE[0],
            ('en', 44100, 0.6, 1, 'pcm24')]
    seconds, rate, _ = _length(_join(engine, line, tmp_path))
    assert seconds == pytest.approx(0.8 + 0.928 + 0.6, abs=0.01)
    assert rate == 44100


def test_a_part_no_reader_can_read_is_left_out_and_the_rest_joined(engine, tmp_path):
    line = [('ta', 16000, 0.5, 1, 'garbage'), LIVE_LINE[0], LIVE_LINE[1]]
    out = _join(engine, line, tmp_path)
    assert out == str(tmp_path / 'joined.wav')
    seconds, _, _ = _length(out)
    assert seconds == pytest.approx(0.928 + 0.755, abs=0.01)


def test_every_part_file_is_removed_after_the_join(engine, tmp_path):
    line = [('ta', 16000, 0.5, 1, 'garbage'), LIVE_LINE[0], LIVE_LINE[3]]
    _join(engine, line, tmp_path)
    assert len(engine.written) == 3
    assert [p for p in engine.written if os.path.exists(p)] == []


def test_when_no_part_can_be_read_the_first_is_handed_back_as_before(engine, tmp_path):
    line = [('ta', 16000, 0.5, 1, 'garbage'), ('en', 22050, 0.5, 1, 'garbage')]
    out = _join(engine, line, tmp_path)
    assert out == engine.written[0] and os.path.exists(out)
    assert not os.path.exists(engine.written[1])
    assert not os.path.exists(str(tmp_path / 'joined.wav'))


def test_parts_that_already_share_a_format_are_joined_byte_for_byte(engine, tmp_path):
    line = [LIVE_LINE[0], LIVE_LINE[2]]
    expected = b''
    for i, (_lang, rate, seconds) in enumerate(line):
        p = _write(str(tmp_path / f'ref{i}.wav'), rate, seconds)
        with wave.open(p, 'rb') as w:
            expected += w.readframes(w.getnframes())
    out = _join(engine, line, tmp_path)
    with wave.open(out, 'rb') as w:
        assert (w.getframerate(), w.getnchannels(), w.getsampwidth()) == (16000, 1, 2)
        assert w.readframes(w.getnframes()) == expected
