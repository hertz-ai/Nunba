"""TTS routing — detected-lang vs requested-lang mismatch.

Regression for the gap surfaced on 2026-05-15:

The chat hot path at routes/chatbot_routes.py:2910 calls
`_fire_nunba_tts(response_text, user_id, request_id, preferred_lang)`
which passes the USER's preferred_lang (often 'en') to
`tts_engine.synthesize(text, language='en')`.

When the LLM agentically responds in another language (e.g. Tamil),
`tts/language_segmenter.segment(text)` correctly returns
`[{'type':'speech', 'lang':'ta', 'text':'வணக்கம் நண்பா!'}]` — but
the prior condition `if has_media or has_multi_lang or len(segments) > 1`
was False for a pure-monolingual response (len==1, has_multi_lang==False).
Control fell through to the single-language path which honored the
caller-passed `language='en'` and synthesized Tamil text with Piper
English → silence / garble.

The fix routes such cases through `_synthesize_multilingual`, which
calls `_synth_speech_segment(text, seg['lang'], ...)` and triggers
`set_language('ta')` → engine switch → `_try_auto_install('indic_parler')`
→ `setup_progress` SSE → `SetupProgressCard` inline in chat.

We assert ROUTING DECISION ONLY (which branch is taken) — running real
synth pulls torch/CUDA which isn't available on CI.
"""
from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock, patch

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import pytest

from tts.tts_engine import TTSEngine


def _make_stub_engine(active_lang='en'):
    """Build a TTSEngine stub with just the attrs synthesize() touches
    before the segmenter branch decision."""
    eng = TTSEngine.__new__(TTSEngine)
    eng._language = active_lang
    eng._active_backend = 'piper'
    eng._backends = {'piper': MagicMock()}
    eng._presynth = MagicMock(get=MagicMock(return_value=None))
    eng._pending_backend = None
    return eng


def _patch_segment(monkeypatch, segments):
    """Patch tts.language_segmenter.segment to return given segments."""
    import tts.language_segmenter as ls
    monkeypatch.setattr(ls, 'segment', lambda _t: segments)


def test_pure_tamil_response_routes_through_multilingual(monkeypatch):
    """Single Tamil segment + language='en' → multilingual branch fires.

    This is the bug screenshot scenario: LLM replies வணக்கம் நண்பா!
    while caller passes preferred_lang='en'.  Before the fix, control
    fell to the single-language path with language='en' → Piper.
    """
    eng = _make_stub_engine(active_lang='en')
    _patch_segment(monkeypatch, [
        {'type': 'speech', 'lang': 'ta', 'text': 'வணக்கம் நண்பா!'},
    ])
    with patch.object(eng, '_synthesize_multilingual',
                      return_value='/tmp/out.wav') as m_multi:
        result = eng.synthesize('வணக்கம் நண்பா!', language='en')
    m_multi.assert_called_once()
    assert result == '/tmp/out.wav'


def test_pure_english_response_skips_multilingual_branch(monkeypatch):
    """Single English segment + language='en' → multilingual branch
    does NOT fire (existing single-language fast path is preserved)."""
    eng = _make_stub_engine(active_lang='en')
    _patch_segment(monkeypatch, [
        {'type': 'speech', 'lang': 'en', 'text': 'hello world'},
    ])
    with patch.object(eng, '_synthesize_multilingual') as m_multi, \
         patch.object(eng, '_ensure_initialized'):
        # Force the single-language path to bail early — we only care
        # that _synthesize_multilingual was NOT called.
        eng._backends = {}
        eng._pending_backend = None
        eng.synthesize('hello world', language='en')
    m_multi.assert_not_called()


def test_pure_tamil_response_with_matching_language_skips_multilingual(monkeypatch):
    """When caller passes language='ta' and detected is 'ta', no need
    for the multilingual branch — single-language path is correct."""
    eng = _make_stub_engine(active_lang='ta')
    _patch_segment(monkeypatch, [
        {'type': 'speech', 'lang': 'ta', 'text': 'வணக்கம்'},
    ])
    with patch.object(eng, '_synthesize_multilingual') as m_multi, \
         patch.object(eng, '_ensure_initialized'):
        eng._backends = {}
        eng._pending_backend = None
        eng.synthesize('வணக்கம்', language='ta')
    m_multi.assert_not_called()


def test_multi_lang_response_still_routes_through_multilingual(monkeypatch):
    """Existing multi-lang routing must still fire — regression guard
    against the fix accidentally narrowing the condition."""
    eng = _make_stub_engine(active_lang='en')
    _patch_segment(monkeypatch, [
        {'type': 'speech', 'lang': 'en', 'text': 'Hello'},
        {'type': 'speech', 'lang': 'ta', 'text': 'வணக்கம்'},
    ])
    with patch.object(eng, '_synthesize_multilingual',
                      return_value='/tmp/mixed.wav') as m_multi:
        result = eng.synthesize('Hello வணக்கம்', language='en')
    m_multi.assert_called_once()
    assert result == '/tmp/mixed.wav'


def test_media_tag_still_routes_through_multilingual(monkeypatch):
    """<music>/<sing>/<lyrics> tags must keep routing through the
    multilingual path — fix must not regress media-tag handling."""
    eng = _make_stub_engine(active_lang='en')
    _patch_segment(monkeypatch, [
        {'type': 'speech', 'lang': 'en', 'text': 'before'},
        {'type': 'music', 'text': 'jazz intro', 'genre': 'jazz', 'duration': 10},
    ])
    with patch.object(eng, '_synthesize_multilingual',
                      return_value='/tmp/media.wav') as m_multi:
        result = eng.synthesize('before <music>jazz intro</music>',
                                language='en')
    m_multi.assert_called_once()
    assert result == '/tmp/media.wav'


def test_language_none_falls_back_to_active_language(monkeypatch):
    """When caller passes language=None, the fix compares the segment's
    detected lang against self._language (the active backend's lang).
    Tamil segment + active='en' → still must fire multilingual."""
    eng = _make_stub_engine(active_lang='en')
    _patch_segment(monkeypatch, [
        {'type': 'speech', 'lang': 'ta', 'text': 'வணக்கம்'},
    ])
    with patch.object(eng, '_synthesize_multilingual',
                      return_value='/tmp/out.wav') as m_multi:
        eng.synthesize('வணக்கம்', language=None)
    m_multi.assert_called_once()


def test_segment_with_no_lang_falls_through_to_single_path(monkeypatch):
    """If segmenter returns a segment with no 'lang' key (defensive
    guard), the new mismatch check must NOT fire — fall through to
    the single-language path so the existing behavior is preserved."""
    eng = _make_stub_engine(active_lang='en')
    _patch_segment(monkeypatch, [
        {'type': 'speech', 'text': 'no lang here'},  # lang missing
    ])
    with patch.object(eng, '_synthesize_multilingual') as m_multi, \
         patch.object(eng, '_ensure_initialized'):
        eng._backends = {}
        eng._pending_backend = None
        eng.synthesize('no lang here', language='en')
    m_multi.assert_not_called()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
