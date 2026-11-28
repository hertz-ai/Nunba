"""A part marked with its language is spoken in it, and no mark is spoken.

Speech design Part A (D:\\claude_scratch\\66e67cad\\speech_out_1128\\design.md,
review 1 MUST 2; owner 28 Nov 2026: the model tags a language the way it
tags singing). The model will mark a part written in another language as
<lang es>...</lang>. The alphabet cannot tell Spanish from English or
Japanese from Chinese; the mark can. One form only, under a name that is
ours: a bare <es>, <tr>, <id>, <it> or <my-app> is ordinary text (review of
714d77c0, where the bare form took a web page table, a path placeholder and
a C++ type for languages). This file pins the speaking half, which ships
before any model is told about the marks:

1. One grammar: tests/fixtures/speech_tags_cases.json is the same file in
   HARTOS, where the text a person reads is run against it; its sha256 is
   pinned in both repos.
2. A marked part is one speech segment in the marked language, whatever
   alphabet it is written in; a sung part carries its mark's language; an
   open mark closes at the end of the message; a stray close is dropped.
3. Text with no mark is split exactly as before.
4. synthesize() speaks a marked reply from its segments, so a mark is never
   said, and a sung part nothing can sing is spoken in its marked language.

Real: tts.language_segmenter.segment, TTSEngine.synthesize's routing and
TTSEngine._synthesize_multilingual. The speaking and singing engines are
stand-ins that write a tone.

    python -m pytest tests/test_a_part_marked_with_its_language_is_spoken_in_it.py -q
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import sys
import wave
from unittest.mock import MagicMock, patch

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import pytest  # noqa: E402

from tts.language_segmenter import (  # noqa: E402
    _segment_speech, has_language_mark, segment)

FIXTURE = os.path.join(PROJECT_ROOT, 'tests', 'fixtures', 'speech_tags_cases.json')
# The same constant is in HARTOS tests/unit/
# test_a_part_marked_with_its_language_keeps_its_words_and_loses_its_mark.py.
FIXTURE_SHA256 = '0f227d3144f54754a33a1de835a75e839ec9f9cc8f8b21cb6e7b0efed8dafe49'

with open(FIXTURE, 'rb') as _f:
    # line ends as git stores them, whatever the checkout wrote
    _BYTES = _f.read().replace(b'\r\n', b'\n')
_SHARED = json.loads(_BYTES.decode('utf-8'))
CASES = _SHARED['cases']
_IDS = [c['name'] for c in CASES]


def _parts(text, language=None):
    return [[s.get('lang'), s['type'], s['text']]
            for s in segment(text, language=language)]


# ── one grammar, shared with HARTOS ──────────────────────────────────

def test_the_shared_cases_are_the_same_file_as_in_hartos():
    assert hashlib.sha256(_BYTES).hexdigest() == FIXTURE_SHA256, (
        'tests/fixtures/speech_tags_cases.json changed: make the same change '
        'in HARTOS and set the new sha256 in both tests')


@pytest.mark.parametrize('case', CASES, ids=_IDS)
def test_each_part_is_spoken_in_its_language(case):
    assert _parts(case['input'], case['language']) == case['segments']


@pytest.mark.parametrize('case', [c for c in CASES if '<' not in c['shown']],
                         ids=lambda c: c['name'])
def test_no_mark_is_left_in_what_is_spoken(case):
    for _lang, _kind, text in _parts(case['input'], case['language']):
        assert '<' not in text and '>' not in text, text


@pytest.mark.parametrize('case', [c for c in CASES if c['whole_language']],
                         ids=lambda c: c['name'])
def test_a_reply_marked_whole_is_all_in_that_language(case):
    assert {lang for lang, _kind, _text in _parts(case['input'], case['language'])
            } == {case['whole_language']}


# ── a marked part ────────────────────────────────────────────────────

@pytest.mark.parametrize('language', [None, 'en', 'ta', 'ja'])
def test_a_marked_part_in_the_latin_alphabet_is_spoken_as_its_language(language):
    """Whatever was asked for, and whatever the alphabet guess says."""
    assert _parts('<lang hi>namaste dost</lang>', language) == [
        ['hi', 'speech', 'namaste dost']]


def test_a_marked_part_is_one_segment_across_alphabets():
    assert _parts('<lang ja>Zoey は公園に行きました</lang>', 'en') == [
        ['ja', 'speech', 'Zoey は公園に行きました']]


def test_a_mark_left_open_runs_to_the_end_across_a_sung_part():
    assert _parts('Hi. <lang es>Escucha <sing>la cucaracha</sing> amigo', 'en') == [
        ['en', 'speech', 'Hi.'], ['es', 'speech', 'Escucha'],
        ['es', 'sing', 'la cucaracha'], ['es', 'speech', 'amigo']]


def test_a_sung_part_marked_in_two_languages_has_no_one_language():
    assert _parts(
        '<sing><lang es>hola</lang> <lang fr>salut</lang></sing>', 'en') == [
        [None, 'sing', 'hola salut']]


def test_a_sung_part_keeps_its_length_inside_a_mark():
    segs = segment('<lang es><sing duration="15">la la la</sing></lang>')
    assert segs == [{'type': 'sing', 'text': 'la la la', 'duration': 15,
                     'lang': 'es'}]


def test_only_marks_and_nothing_to_say_is_no_segment():
    assert segment('<lang es></lang>', language='en') == []
    assert segment('</lang>', language='en') == []


@pytest.mark.parametrize('mark,language', [
    ('<lang pt-BR>', 'pt'), ('<lang zh-Hans>', 'zh'), ('<lang es-419>', 'es'),
    ('<lang=en-IN>', 'en'), ('<lang ZH-cn>', 'zh'), ('<lang cs>', 'cs'),
])
def test_a_code_with_a_region_is_spoken_by_its_base_language(mark, language):
    assert _parts(mark + 'abc</lang>', 'ta') == [[language, 'speech', 'abc']]


@pytest.mark.parametrize('mark', [
    '<lang zz>', '<lang español>', '<lang>', '<lang code="es" x>', '<lang e>',
    '<lang 12>',
])
def test_a_mark_that_names_no_language_marks_nothing_and_is_not_spoken(mark):
    """The words are split as text with no mark is: by the language asked
    for where its alphabet fits."""
    assert _parts(mark + 'Hola amigo</lang>', 'es') == [
        ['es', 'speech', 'Hola amigo']]


@pytest.mark.parametrize('text,marked', [
    ('<lang es>Hola</lang>', True), ('<lang es>Hola', True),
    ('Hello </lang>', True), ('<lang="pt-BR">Olá</lang>', True),
    ('<LANG ES>Hola', True), ('<lang español>Hola', True),
    ('<es>Hola</es>', False), ('<tr><th>Name</th></tr>', False),
    ('/users/<id>', False), ('use the <it> tag', False),
    ('vector<it> x', False), ('<my-app></my-app>', False),
    ('<en-dash> <or-else> <id-num>', False), ('<pt-BR>Olá</pt-BR>', False),
    ('<b>bold</b>', False), ('line<br>line', False), ('<em>x</em>', False),
    ('<i>x</i> <p>y</p> <a>z</a>', False), ('<language>', False),
    ('<sing>la</sing>', False), ('a < lang es > b', False), ('', False),
    (None, False),
])
def test_what_counts_as_a_language_mark(text, marked):
    assert has_language_mark(text) is marked


@pytest.mark.parametrize('language,text', [
    # measured on 714d77c0 by its reviewer: each of these lost a tag and
    # most turned the rest of the reply into another language
    ('en', 'The page is <table><tr><th>Name</th></tr><tr><td>Zoey</td></tr></table>'),
    ('en', 'GET /users/<id> returns the user'), ('en', 'use the <it> tag'),
    ('en', 'vector<it> x'), ('en', 'Add <my-app></my-app> to the page'),
    ('en', 'Write <en-dash> then <or-else> and <id-num>'),
    ('en', 'Say <es>Hola</es>'), ('es', 'Di <en>hello</en> ahora'),
    (None, 'A <tr>Merhaba</tr> row'),
])
def test_a_bare_code_in_brackets_is_spoken_as_before(language, text):
    assert segment(text, language=language) == _segment_speech(text, language)
    assert _parts(text, language) == [[language or 'en', 'speech', text]]


# ── text with no mark is split exactly as before ─────────────────────

@pytest.mark.parametrize('language,text', [
    (None, 'Hello world'), ('es', 'Zoey fue al parque. ¿Quieres jugar?'),
    ('ta', 'வணக்கம் Zoey, எப்படி இருக்கிறாய்?'), ('en', 'வணக்கம் நண்பா!'),
    ('ja', '公園に行きました。人々が遊んでいます！'), (None, '123'), ('es', '!!'),
    ('en', 'a <b>bold</b> word<br>next'), ('en', 'open <url> now'),
    (None, 'नमस्ते hello مرحبا'),
])
def test_text_with_no_mark_is_split_as_the_script_splitter_splits_it(language, text):
    assert segment(text, language=language) == _segment_speech(text, language)


def test_a_sung_part_with_no_mark_is_the_same_segment_as_before():
    assert segment('Hi <sing duration="15">la la</sing> bye', language='en') == [
        {'type': 'speech', 'lang': 'en', 'text': 'Hi'},
        {'type': 'sing', 'text': 'la la', 'duration': 15},
        {'type': 'speech', 'lang': 'en', 'text': 'bye'}]


# ── synthesize() speaks a marked reply from its segments ─────────────

class _Stop(Exception):
    pass


def _routing_engine(active_lang):
    from tts.tts_engine import TTSEngine
    eng = TTSEngine.__new__(TTSEngine)
    eng._language = active_lang
    eng._active_backend = 'piper'
    eng._backends = {'piper': MagicMock()}
    eng._presynth = MagicMock(get=MagicMock(return_value=None))
    eng._pending_backend = None
    return eng


def test_a_reply_marked_in_the_language_asked_for_is_not_said_with_its_marks():
    """One Spanish segment asked in Spanish looked like plain text to the
    routing, and the single-language path says the text as written."""
    eng = _routing_engine('es')
    with patch.object(eng, '_synthesize_multilingual',
                      return_value='/tmp/x.wav') as m_multi:
        assert eng.synthesize('<lang es>Hola amigo</lang>', language='es',
                              speed=1.0) == '/tmp/x.wav'
    assert [(s['lang'], s['text']) for s in m_multi.call_args[0][0]] == [
        ('es', 'Hola amigo')]


def test_a_stray_closing_mark_is_not_said():
    eng = _routing_engine('en')
    with patch.object(eng, '_synthesize_multilingual',
                      return_value='/tmp/x.wav') as m_multi:
        eng.synthesize('Hello </lang> world', language='en', speed=1.0)
    assert [(s['lang'], s['text']) for s in m_multi.call_args[0][0]] == [
        ('en', 'Hello world')]


def test_a_reply_with_no_mark_still_takes_the_single_language_path():
    eng = _routing_engine('en')
    with patch.object(eng, '_synthesize_multilingual') as m_multi, \
            patch.object(eng, 'set_language') as m_set, \
            patch.object(eng, '_ensure_initialized', side_effect=_Stop):
        with pytest.raises(_Stop):
            eng.synthesize('Zoey fue al parque.', language='es', speed=1.0)
    m_multi.assert_not_called()
    m_set.assert_called_once_with('es')


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


@pytest.fixture
def engine(monkeypatch, tmp_path):
    """spoken: (text, lang) of every part the speaking engine was asked for.
    sung: the words the singer was asked for. The singer makes nothing."""
    monkeypatch.setenv('NUNBA_TTS_STATE_PATH', str(tmp_path / 'tts_state.json'))
    from tts.tts_engine import TTSEngine
    eng = TTSEngine.__new__(TTSEngine)
    eng.spoken, eng.sung = [], []
    eng._language = 'en'

    def speak(text, lang, out_path, *, warm_up=False, **_k):
        eng.spoken.append((text, lang))
        return _tone(out_path, 0.5)

    def sing(text, _duration, out_path):
        eng.sung.append(text)
        return None

    eng._synth_speech_segment = speak
    eng._synth_sing_segment = sing
    eng._synth_music_segment = lambda *a, **k: None
    return eng


def test_each_marked_part_goes_to_the_voice_of_its_language(engine, tmp_path):
    engine._synthesize_multilingual(
        segment('Hi there. <lang es>Hola amigo</lang> <lang fr>Salut</lang> Bye.',
                language='en'),
        output_path=str(tmp_path / 'line.wav'), language='en')
    assert engine.spoken == [('Hi there.', 'en'), ('Hola amigo', 'es'),
                             ('Salut', 'fr'), ('Bye.', 'en')]


def test_a_marked_sung_part_nothing_can_sing_is_spoken_in_its_language(
        engine, tmp_path):
    """The speech around it is English; the sung words are marked Spanish."""
    engine._synthesize_multilingual(
        segment('Listen. <sing><lang es>la cucaracha ya no puede caminar</lang></sing>',
                language='en'),
        output_path=str(tmp_path / 'line.wav'), language='en')
    assert engine.sung == ['la cucaracha ya no puede caminar'], 'no mark is sung'
    assert engine.spoken == [('Listen.', 'en'),
                             ('la cucaracha ya no puede caminar', 'es')]
