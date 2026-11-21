"""Markup and emoji are written for the eye; Nunba's speakers do not read
them aloud (task #184).

The page's speak button and auto-speak post the reply to /tts/synthesize,
which handed the raw text to the engine: "**Well done**" was spoken with its
asterisks.  The chat fallback (_fire_nunba_tts) carried its own smaller copy
of HARTOS's cut.  Both now ask the one owner, HARTOS
integrations.channels.media.tts_text_normalizer.normalize_for_tts.

Nothing here loads an engine: synthesize_text is replaced by a recorder.
"""
import os
import re
import sys
import threading

import pytest
from flask import Flask

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from integrations.channels.media import tts_text_normalizer as tn  # noqa: E402

import routes.chatbot_routes as cr  # noqa: E402


@pytest.fixture(autouse=True)
def _own_cache_and_no_model(tmp_path, monkeypatch):
    monkeypatch.setenv('HEVOLVE_CACHE_DIR', str(tmp_path / 'norm'))
    monkeypatch.setattr(tn, '_llm_normalize', lambda *a, **k: None)


@pytest.fixture
def spoken(monkeypatch):
    """What the engine was asked to say, in order."""
    said = []

    def _synthesize_text(text, voice=None, speed=1.0, output_path=None,
                         language=None):
        said.append(text)
        return None

    monkeypatch.setattr(cr, 'TTS_AVAILABLE', True)
    monkeypatch.setattr(cr, 'synthesize_text', _synthesize_text, raising=False)
    return said


@pytest.fixture
def client():
    app = Flask(__name__)
    app.route('/tts/synthesize', methods=['POST'])(cr.tts_synthesize)
    with app.test_client() as c:
        yield c


class TestThePagesSpeakRoute:

    def test_markup_and_emoji_do_not_reach_the_engine(self, client, spoken):
        resp = client.post('/tts/synthesize', json={
            'text': '**Well done**, *you* \U0001F642', 'language': 'en'})
        assert spoken == ['Well done, you']
        # the engine stand-in made no file: the error names the words, so
        # the page's own voice says the same ones
        assert resp.status_code == 500
        assert resp.get_json() == {'error': 'Synthesis failed',
                                   'spoken_text': 'Well done, you'}

    def test_a_sum_and_a_blank_are_said_as_written(self, client, spoken,
                                                    monkeypatch):
        """A lone '*' or '_' is not emphasis: "5*4" must not become "54"."""
        monkeypatch.setattr(tn, '_num_to_words', lambda n, lang: None)
        said = 'What is 5*4? It is 20. Fill the blank: b_ll'
        client.post('/tts/synthesize', json={'text': said, 'language': 'en'})
        assert spoken == [said]

    def test_it_speaks_as_a_read_aloud(self, client, spoken, monkeypatch):
        seen = []
        real = tn.normalize_for_tts

        def _spy(text, lang='en', use_llm=True, source=None):
            seen.append(source)
            return real(text, lang, use_llm=use_llm, source=source)

        monkeypatch.setattr(tn, 'normalize_for_tts', _spy)
        client.post('/tts/synthesize', json={
            'text': 'see https://example.com now', 'language': 'en'})
        assert seen == ['read_aloud']

    def test_plain_text_reaches_the_engine_unchanged(self, client, spoken):
        client.post('/tts/synthesize', json={
            'text': 'We\'ll read "this" [as is]', 'language': 'en'})
        assert spoken == ['We\'ll read "this" [as is]']

    def test_a_link_is_announced_not_spelled(self, client, spoken):
        client.post('/tts/synthesize', json={
            'text': 'see https://example.com/a_b now', 'language': 'en'})
        assert spoken == ['see link now']

    def test_a_media_tag_keeps_its_attributes(self, client, spoken):
        tag = "<sing duration='15'>"
        client.post('/tts/synthesize', json={
            'text': f'*now* {tag}la la</sing>', 'language': 'en'})
        assert spoken == [f'now {tag}la la</sing>']

    def test_only_markup_is_nothing_to_say(self, client, spoken):
        resp = client.post('/tts/synthesize', json={
            'text': '**\U0001F642** ```x```', 'language': 'en'})
        assert spoken == []
        assert resp.status_code == 400
        assert resp.get_json() == {'error': 'No text provided',
                                   'spoken_text': ''}

    def test_no_language_is_read_from_the_text(self, client, spoken):
        client.post('/tts/synthesize', json={'text': '**Hello** there'})
        assert spoken == ['Hello there']
        # Tamil text and no language: the percent sign is said in Tamil
        client.post('/tts/synthesize', json={
            'text': 'விலை 50%'})
        assert 'சதவீதம்' in spoken[1]

    def test_the_route_waits_on_no_model(self, client, spoken, monkeypatch):
        asked = []
        monkeypatch.setattr(tn, '_llm_normalize',
                            lambda *a, **k: asked.append(a))
        client.post('/tts/synthesize', json={
            'text': 'the NASA code is 7', 'language': 'xx'})
        assert asked == []

    def test_an_engine_error_still_names_the_words(self, client, monkeypatch):
        def _boom(*a, **k):
            raise RuntimeError('engine fell over')

        monkeypatch.setattr(cr, 'TTS_AVAILABLE', True)
        monkeypatch.setattr(cr, 'synthesize_text', _boom, raising=False)
        resp = client.post('/tts/synthesize', json={
            'text': '**Hi** there', 'language': 'en'})
        assert resp.status_code == 500
        assert resp.get_json() == {'error': 'engine fell over',
                                   'spoken_text': 'Hi there'}

    def test_the_old_refusals_are_unchanged(self, client, spoken):
        assert client.post('/tts/synthesize', json={'text': ''}).get_json() \
            == {'error': 'No text provided'}
        resp = client.post('/tts/synthesize', json={'text': 'x' * 5001})
        assert resp.status_code == 400
        assert resp.get_json() == {
            'error': 'Text too long (max 5000 characters)'}
        assert spoken == []


class TestTheChatFallback:

    def _fire(self, monkeypatch, text, language='en'):
        import tts.tts_engine as engine_mod
        said = []
        monkeypatch.setattr(engine_mod, 'synthesize_text',
                            lambda t, language=None, **k: said.append(
                                (t, language)) or None)

        class _Inline:
            def __init__(self, target=None, **kw):
                self._target = target

            def start(self):
                self._target()

        monkeypatch.setattr(threading, 'Thread', _Inline)
        cr._fire_nunba_tts(text, 'user-1', 'req-1', language=language)
        return said

    def test_it_is_cut_as_hartos_cuts_a_chat_reply(self, monkeypatch):
        reply = ('## Result\n**Well done** \U0001F642 see https://x.com '
                 '[aside] "now"')
        said = self._fire(monkeypatch, reply)
        assert said == [(tn.normalize_for_tts(
            reply, 'en', use_llm=False, source=tn.CHAT_REPLY_SOURCE), 'en')]
        assert said == [('Result Well done see now', 'en')]

    def test_only_markup_is_not_spoken(self, monkeypatch):
        assert self._fire(monkeypatch, '** \U0001F642 **') == []


class TestNunbaKeepsNoCopyOfTheCut:
    """Shape, not names: a regex that deletes emphasis marks or code fences
    in Nunba's speaking code is a second copy of HARTOS's rule."""

    WATCHED = ['routes/chatbot_routes.py', 'tts/tts_engine.py',
               'landing-page/src/hooks/useTTS.js']
    SHAPES = [r'\[\*_~\]', r'```\[\\s\\S\]', r'U0001F600-']

    def test_no_copy(self):
        found = []
        for rel in self.WATCHED:
            src = open(os.path.join(PROJECT_ROOT, rel), encoding='utf-8').read()
            found += [(rel, s) for s in self.SHAPES if re.search(s, src)]
        assert found == []
