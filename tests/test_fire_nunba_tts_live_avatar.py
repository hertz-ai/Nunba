"""Nunba's own TTS publisher gives a video turn's reply its live face, and nothing else.

routes/chatbot_routes._fire_nunba_tts speaks a reply when HARTOS's chat did not
(Tier-1 down, the direct llama path, non-English replies).  On a video turn it calls
HARTOS's one helper, avatarforcing_tool.add_live_avatar, before publishing, exactly
as HARTOS's own publisher does.  Pinned: only a video turn calls it, with the turn's
avatar and this node's advertised base; whatever the helper adds is in the bundle
that is published; and a helper that fails never costs the reply its audio.
"""
import sys
import threading

import pytest

import routes.chatbot_routes as cr


class _SyncThread:
    """threading.Thread that runs its target at start(), so the publish is observable."""

    def __init__(self, target=None, daemon=None, name=None, **kw):
        self._target = target

    def start(self):
        self._target()


@pytest.fixture
def publish(monkeypatch, tmp_path):
    wav = tmp_path / 'reply.wav'
    wav.write_bytes(b'RIFF')
    import integrations.channels.media.tts_text_normalizer as norm
    import tts.tts_engine as engine
    monkeypatch.setattr(norm, 'normalize_for_tts', lambda text, lang, **k: text)
    monkeypatch.setattr(engine, 'synthesize_text', lambda text, language=None: str(wav))
    monkeypatch.setattr(threading, 'Thread', _SyncThread)
    sent = []
    main_mod = sys.modules['__main__']
    monkeypatch.setattr(main_mod, 'broadcast_sse_event',
                        lambda ev, payload, user_id=None: sent.append(payload), raising=False)
    import routes.hartos_backend_adapter as hba
    monkeypatch.setattr(hba, '_hartos_backend_available', False)
    import wamp_router
    monkeypatch.setattr(wamp_router, 'publish_local', lambda topic, args: None)
    import core.port_registry as pr
    monkeypatch.setattr(pr, 'get_advertisable_base_url', lambda: 'http://192.168.0.5:5000')
    calls = []
    import integrations.service_tools.avatarforcing_tool as af

    def add_live_avatar(payload, **kw):
        calls.append(kw)
        payload['generated_video_url'] = '/avatar/live/abcdef012345.mp4'
        return True
    monkeypatch.setattr(af, 'add_live_avatar', add_live_avatar)
    return type('P', (), {'sent': sent, 'calls': calls, 'wav': str(wav), 'af': af})


def test_a_video_turn_publishes_its_face(publish):
    cr._fire_nunba_tts('Hello, Arun!', 'u1', 'req-1', 'en', media_mode='video', avatar_id=1000007)
    assert publish.calls == [{'audio_path': publish.wav, 'avatar_id': 1000007, 'media_mode': 'video',
                              'phone_base': 'http://192.168.0.5:5000'}]
    assert len(publish.sent) == 1
    assert publish.sent[0]['generated_video_url'] == '/avatar/live/abcdef012345.mp4'
    assert publish.sent[0]['generated_audio_url'].startswith('/tts/audio/')


@pytest.mark.parametrize('mode', ['audio', None])
def test_an_audio_turn_never_asks_for_a_face(publish, mode):
    cr._fire_nunba_tts('Hello, Arun!', 'u1', 'req-2', 'en', media_mode=mode, avatar_id=1000007)
    assert publish.calls == []
    assert 'generated_video_url' not in publish.sent[0]


def test_a_failing_face_never_costs_the_audio(publish, monkeypatch):
    def boom(payload, **kw):
        raise RuntimeError('sidecar exploded')
    monkeypatch.setattr(publish.af, 'add_live_avatar', boom)
    cr._fire_nunba_tts('Hello, Arun!', 'u1', 'req-3', 'en', media_mode='video', avatar_id=1000007)
    assert len(publish.sent) == 1
    assert publish.sent[0]['generated_audio_url'].startswith('/tts/audio/')
    assert 'generated_video_url' not in publish.sent[0]
