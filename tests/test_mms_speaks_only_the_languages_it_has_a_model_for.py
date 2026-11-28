"""mms_tts is offered only for a language it has a model for.

LIVE 2026-11-28 12:55 IST, installed build, one Japanese line: mms_tts was
picked, its worker started cold (15 s) and failed with "facebook/mms-tts-jpn
is not a local folder and is not a valid model identifier".  MMS has no
Japanese model.

MEASURED 2026-11-28 with a header-only request for
https://huggingface.co/facebook/mms-tts-<code>/resolve/main/config.json
(307 = there, 401 = no such model): eight languages have no model at all:
it, cs, zh, ja, ne, sd, sa, si.  Tamil (tam) and Hindi (hin) are there.

These tables are what Nunba uses when the HARTOS catalog cannot be read, and
the capable set is the gate every fallback voice passes.  None of them names
mms_tts for a language it has no model for.

    python -m pytest tests/test_mms_speaks_only_the_languages_it_has_a_model_for.py -q
"""
import pytest

from tts import tts_engine as te

NO_MODEL = ('it', 'cs', 'zh', 'ja', 'ne', 'sd', 'sa', 'si')
HAS_MODEL = ('ta', 'hi')
MMS = te.BACKEND_MMS_TTS


@pytest.mark.parametrize('lang', NO_MODEL)
def test_mms_is_not_capable_of_a_language_it_has_no_model_for(lang):
    assert MMS not in te._capable_backends_for(lang)


@pytest.mark.parametrize('lang', NO_MODEL)
def test_mms_is_not_in_the_ladder_of_a_language_it_has_no_model_for(lang):
    assert MMS not in te._FALLBACK_LANG_ENGINE_PREFERENCE.get(lang, ())


@pytest.mark.parametrize('lang', NO_MODEL)
def test_mms_does_not_list_a_language_it_has_no_model_for(lang):
    assert lang not in te._FALLBACK_ENGINE_CAPABILITIES[MMS]['languages']


@pytest.mark.parametrize('lang', HAS_MODEL)
def test_mms_still_speaks_a_language_it_has_a_model_for(lang):
    assert MMS in te._capable_backends_for(lang)
    assert MMS in te._FALLBACK_LANG_ENGINE_PREFERENCE[lang]
    assert lang in te._FALLBACK_ENGINE_CAPABILITIES[MMS]['languages']
