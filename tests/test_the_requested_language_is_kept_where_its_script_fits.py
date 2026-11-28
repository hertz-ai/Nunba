"""A reply is spoken in the language the caller asked for (owner 2026-11-28).

Measured on the live desktop 2026-11-28 (speech_baseline_1128): Spanish,
French, German, Italian, Portuguese, Indonesian, Turkish, Vietnamese and
Thai came back from speech-to-text as English, Japanese was voiced as
Chinese and Arabic as Urdu. Cause: tts/language_segmenter replaced the
requested language with a guess from the alphabet (Latin -> en, CJK -> zh,
Arabic -> ur, anything else -> en), and synthesize() then routed the text
to that guess's voice.

The rule pinned here: a run of letters written in the requested language's
script keeps the requested language; only a run in another script (an
English name inside Tamil) gets the alphabet guess. With no language the
splitter behaves as before, except that an accented letter, CJK punctuation
or a zero-width joiner no longer cuts a word in two.
"""
from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock, patch

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import pytest

from tts.language_segmenter import segment


def _speech(text, language=None):
    return [(s['lang'], s['text']) for s in segment(text, language=language)
            if s.get('type') == 'speech']


def _langs(text, language=None):
    return [lang for lang, _ in _speech(text, language)]


# ── the requested language is kept where its script fits ─────────────

@pytest.mark.parametrize('language,text', [
    ('es', 'Zoey fue al parque con su perro. ¿Quieres jugar conmigo?'),
    ('fr', 'Zoey est allée au café avec sa mère, près de la forêt.'),
    ('de', 'Zoey ging mit ihrem Hund in den großen Park.'),
    ('pt', 'Zoey foi ao parque com o cão e a irmã.'),
    ('tr', 'Zoey köpeğiyle parka gitti ve çok güldü.'),
    ('vi', 'Zoey đi công viên với con chó của cô ấy.'),
    ('id', 'Zoey pergi ke taman bersama anjingnya.'),
])
def test_a_latin_script_language_is_not_turned_into_english(language, text):
    assert _speech(text, language) == [(language, text)]


@pytest.mark.parametrize('language,text', [
    ('ja', '公園に行きました。人々が遊んでいます！'),
    ('zh', '佐伊和她的狗去了公园。'),
    ('ar', 'ذهبت زوي إلى الحديقة مع كلبها.'),
    ('ur', 'زوئی اپنے کتے کے ساتھ پارک گئی۔'),
    ('fa', 'زویی با سگش به پارک رفت.'),
    ('ru', 'Зоя пошла в парк со своей собакой.'),
    ('uk', 'Зоя пішла до парку зі своїм собакою.'),
    ('el', 'Η Ζωή πήγε στο πάρκο με τον σκύλο της.'),
    ('he', 'זואי הלכה לפארק עם הכלב שלה.'),
    ('th', 'โซอี้ไปสวนสาธารณะกับสุนัขของเธอ'),
    ('ko', '조이는 강아지와 함께 공원에 갔어요. ㅋㅋ'),
    ('mr', 'झोई तिच्या कुत्र्यासोबत बागेत गेली.'),
    ('ne', 'जोई आफ्नो कुकुरसँग पार्क गइन्।'),
    ('ta', 'சோயி தன் நாயுடன் பூங்காவுக்குச் சென்றாள்.'),
])
def test_a_language_keeps_its_name_across_its_own_script(language, text):
    """One segment, in the language asked for, with the text untouched:
    Japanese kanji + kana + '。' + '々' stay one Japanese part, Arabic is
    not called Urdu, Marathi is not guessed as Hindi."""
    assert _speech(text, language) == [(language, text)]


def test_a_regional_code_is_matched_by_its_base_and_returned_as_given():
    assert _speech('佐伊去了公园。', 'zh-CN') == [('zh-CN', '佐伊去了公园。')]
    assert _speech('Zoey foi ao parque.', 'pt_BR') == [('pt_BR', 'Zoey foi ao parque.')]


# ── a part in another script still gets its own voice ─────────────────

def test_an_english_name_inside_tamil_is_still_english():
    assert _langs('Zoey பூங்காவுக்குச் சென்றாள்.', 'ta') == ['en', 'ta']


def test_english_words_inside_hindi_are_still_english():
    assert _langs('आज Zoey पार्क गई।', 'hi') == ['hi', 'en', 'hi']


def test_tamil_text_asked_for_in_english_is_still_tamil():
    """synthesize()'s mismatch branch (English requested, Tamil written)
    still sees the Tamil."""
    assert _langs('வணக்கம் நண்பா!', 'en') == ['ta']


def test_an_unsupported_language_code_falls_back_to_the_script_guess():
    assert _langs('Zoey went to the park.', 'xx') == ['en']


def test_text_with_no_letters_keeps_the_requested_language():
    assert _langs('123 !!', 'es') == ['es']
    assert _langs('123 !!') == ['en']


def test_media_tags_split_the_same_way_with_a_language():
    r = segment('Hola Zoey <music genre="pop" duration="5">beat</music> adiós',
                language='es')
    assert [(s['type'], s.get('lang')) for s in r] == [
        ('speech', 'es'), ('music', None), ('speech', 'es')]
    assert r[2]['text'] == 'adiós'


# ── no language: as before, minus words cut in two ────────────────────

def test_without_a_language_the_script_guess_is_unchanged():
    assert _langs('Hello world') == ['en']
    assert _langs('வணக்கம் உலகம்.') == ['ta']
    assert _langs('Hello வணக்கம்') == ['en', 'ta']
    assert _langs('مرحبا') == ['ur']
    assert _langs('你好') == ['zh']
    assert _langs('Привет') == ['en']


def test_an_accented_letter_no_longer_cuts_a_word_in_two():
    """Before: 'café' was 'caf' + 'é' (an unknown script), joined back as
    'caf é' and read that way."""
    assert _speech('Un café, señor.') == [('en', 'Un café, señor.')]


def test_cjk_punctuation_is_not_a_part_of_its_own():
    """Before: '。' read as an unknown script and became an English part
    between two Japanese ones."""
    assert _langs('こんにちは。さようなら。') == ['ja']


def test_a_zero_width_joiner_stays_inside_its_word():
    """Malayalam chillu written with ZWJ: before, the joiner split the
    word into Malayalam + English + Malayalam."""
    text = 'അവന്‍ വന്നു'
    assert _speech(text) == [('ml', text)]
    assert _speech(text, 'ml') == [('ml', text)]


# ── synthesize() hands the requested language to the splitter ─────────

class _Stop(Exception):
    pass


def _engine(active_lang):
    from tts.tts_engine import TTSEngine
    eng = TTSEngine.__new__(TTSEngine)
    eng._language = active_lang
    eng._active_backend = 'piper'
    eng._backends = {'piper': MagicMock()}
    eng._presynth = MagicMock(get=MagicMock(return_value=None))
    eng._pending_backend = None
    return eng


@pytest.mark.parametrize('language,text', [
    ('es', 'Zoey fue al parque con su perro.'),
    ('ja', '公園に行きました。'),
    ('ar', 'ذهبت زوي إلى الحديقة.'),
])
def test_synthesize_speaks_the_requested_language_not_the_script_guess(language, text):
    """The single-language path is taken with the requested language, so
    the engine for that language is chosen. Before the fix, the splitter's
    guess (en / zh / ur) differed from the request and sent the text down
    the multilingual path in the guessed language."""
    eng = _engine('en')
    with patch.object(eng, '_synthesize_multilingual') as m_multi, \
            patch.object(eng, 'set_language') as m_set, \
            patch.object(eng, '_ensure_initialized', side_effect=_Stop):
        with pytest.raises(_Stop):
            eng.synthesize(text, language=language, speed=1.0)
    m_multi.assert_not_called()
    m_set.assert_called_once_with(language)


def test_synthesize_uses_the_engine_language_when_none_is_passed():
    eng = _engine('es')
    with patch.object(eng, '_synthesize_multilingual') as m_multi, \
            patch.object(eng, 'set_language') as m_set, \
            patch.object(eng, '_ensure_initialized', side_effect=_Stop):
        with pytest.raises(_Stop):
            eng.synthesize('Zoey fue al parque.', speed=1.0)
    m_multi.assert_not_called()
    m_set.assert_not_called()


def test_synthesize_still_sends_another_script_down_the_multilingual_path():
    eng = _engine('en')
    with patch.object(eng, '_synthesize_multilingual',
                      return_value='/tmp/x.wav') as m_multi:
        assert eng.synthesize('வணக்கம் நண்பா!', language='en',
                              speed=1.0) == '/tmp/x.wav'
    segs = m_multi.call_args[0][0]
    assert [s['lang'] for s in segs] == ['ta']
