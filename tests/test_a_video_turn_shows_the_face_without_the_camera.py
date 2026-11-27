"""A video turn shows the agent's face; the person's camera is input of its own (owner 2026-11-27: "video
call need not be full video conversation for both parties"; "media mode is primaryly for output and not
input"; "do not create paralell mechanisms for the same thing").

The camera's one switch is its consent: only its stream fills the FrameStore, and get_frame answers only
a frame younger than the store's own age limit.  So a video turn with no live camera neither waits (it
waited up to 1.5 s per turn) nor captions; one with a live camera is described, as before.
"""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from flask import Flask


@pytest.fixture
def chat(tmp_path, monkeypatch):
    from core import platform_paths
    from models import orchestrator
    from routes import chatbot_routes as cr
    from routes import upload_routes as uploads
    monkeypatch.setenv('NUNBA_DATA_DIR', str(tmp_path))
    monkeypatch.setattr(platform_paths, '_cached_data_dir', None)
    app = Flask(__name__)
    app.add_url_rule('/chat', view_func=cr.chat_route, methods=['POST'])
    backend = MagicMock(return_value={'text': 'Hello!', '_tier': 'direct'})
    monkeypatch.setattr(cr, 'HEVOLVE_CHAT_AVAILABLE', True)
    monkeypatch.setattr(cr, 'hevolve_chat', backend)
    monkeypatch.setattr(orchestrator, 'get_orchestrator', MagicMock(side_effect=RuntimeError('isolated')))
    described = MagicMock(return_value='a child waving at the camera')
    monkeypatch.setattr(uploads, '_describe_image_via_llm', described)
    frames, asked = {}, []
    store = SimpleNamespace(get_frame=lambda uid: asked.append(uid) or frames.get(uid))
    monkeypatch.setattr(cr, '_get_vision_service', lambda: SimpleNamespace(store=store))
    # The camera consent ANSWER (the granted 'camera_capture' row useCameraConsent reads): none on
    # file unless a test says.  core.ai_sensing is the REAL gate (review rv_page): with no answer on
    # file it reads allowed, which is exactly the case that must not wait.
    import contextlib
    from core import ai_sensing
    from integrations.social import consent_service, models
    # The real gate with this process's state as at a fresh start (another test may have cut a sense).
    monkeypatch.setattr(ai_sensing, '_state', {'mic': False, 'camera': False, 'screen': False})
    monkeypatch.setattr(ai_sensing, '_withheld', {'camera': False, 'screen': False})
    monkeypatch.setattr(ai_sensing, '_answered', set())
    granted, consent_asks, consent_agents = {'camera_capture': False}, [], []

    def check_consent(db, user_id, consent_type, scope='*', agent_id=None):
        consent_asks.append((user_id, consent_type))
        consent_agents.append(agent_id)
        return granted.get(consent_type, False)
    monkeypatch.setattr(consent_service.ConsentService, 'check_consent', staticmethod(check_consent))
    monkeypatch.setattr(models, 'db_session', lambda *a, **k: contextlib.nullcontext(object()))
    monkeypatch.setattr(cr.time, 'sleep', lambda s: None)
    return SimpleNamespace(client=app.test_client(), backend=backend, described=described, frames=frames,
                           asked=asked, granted=granted, consent_asks=consent_asks,
                           consent_agents=consent_agents, store=store)


def _turn(chat, mode='video'):
    return chat.client.post('/chat', json={
        'text': 'Hi there', 'user_id': 'face_only_test', 'request_id': 'face_only_req',
        'media_mode': mode})


def test_a_video_turn_with_the_camera_off_neither_waits_nor_captions(chat):
    r = _turn(chat)
    assert r.status_code == 200, r.json
    assert chat.asked == ['face_only_test']  # asked once, not polled 10 times over 1.5 s
    chat.described.assert_not_called()
    assert chat.backend.call_args.kwargs['media_mode'] == 'video'  # the face is still asked for


def test_a_video_turn_with_a_live_camera_is_described_once(chat):
    chat.frames['face_only_test'] = b'\xff\xd8jpeg'
    r = _turn(chat)
    assert r.status_code == 200, r.json
    assert chat.described.call_count == 1
    assert 'a child waving at the camera' in chat.backend.call_args.kwargs['text']


@pytest.mark.parametrize('mode', ['audio', 'text'])
def test_a_live_camera_is_described_in_every_mode(chat, mode):
    """Owner 27 Nov: "when the camera is on all the existing vision services and features shd work"."""
    chat.frames['face_only_test'] = b'jpeg-frame'
    r = _turn(chat, mode)
    assert r.status_code == 200, r.json
    assert chat.described.call_count == 1


@pytest.mark.parametrize('mode', ['audio', 'text'])
def test_no_camera_in_other_modes_neither_waits_nor_captions(chat, mode):
    r = _turn(chat, mode)
    assert r.status_code == 200, r.json
    assert chat.asked == ['face_only_test'] and chat.described.call_count == 0


def test_a_voice_turn_is_told_the_camera_is_on_not_that_it_is_on_a_call(chat):
    """rv_page /chat: the video-call wording assumed a call; a voice turn sees the same camera."""
    chat.frames['face_only_test'] = b'jpeg-frame'
    assert _turn(chat, 'audio').status_code == 200
    sent = chat.backend.call_args.kwargs['text']
    assert sent.startswith("The user's camera is on. ") and 'video call' not in sent
    assert sent.endswith('USER QUESTION: Hi there')


def test_a_video_turn_is_still_a_video_call(chat):
    chat.frames['face_only_test'] = b'jpeg-frame'
    assert _turn(chat).status_code == 200
    assert chat.backend.call_args.kwargs['text'].startswith('You are on a live video call with the user. ')


def test_no_answer_on_file_and_no_camera_means_no_wait(chat):
    """rv_page /chat: the real gate reads allowed for a person who never answered; only a YES on file
    makes a camera-off video turn wait for a starting stream."""
    from core.ai_sensing import allowed
    assert allowed('camera')  # the real gate, nothing on file
    assert _turn(chat).status_code == 200
    assert chat.asked == ['face_only_test'] and chat.described.call_count == 0
    assert chat.consent_asks == [('face_only_test', 'camera_capture')]


def test_a_yes_cut_by_the_eye_button_does_not_wait_either(chat, monkeypatch):
    from core import ai_sensing
    chat.granted['camera_capture'] = True
    monkeypatch.setattr(ai_sensing, 'allowed', lambda sensor: False)
    assert _turn(chat).status_code == 200
    assert chat.asked == ['face_only_test']


def test_a_video_turn_waits_briefly_for_a_camera_that_is_starting(chat):
    """rv_page /chat: the first video turn of a page that opened straight into video (or right after
    consent) comes before the stream's first frame.  With a yes on file, it waits (bounded)."""
    chat.granted['camera_capture'] = True
    calls = []

    def starting(uid):
        calls.append(uid)
        return b'jpeg-frame' if len(calls) >= 3 else None
    chat.store.get_frame = starting
    assert _turn(chat).status_code == 200
    assert len(calls) == 3 and chat.described.call_count == 1


def test_a_camera_that_never_comes_is_waited_for_at_most_ten_polls(chat):
    chat.granted['camera_capture'] = True
    assert _turn(chat).status_code == 200
    assert len(chat.asked) == 11 and chat.described.call_count == 0


@pytest.mark.parametrize('mode', ['audio', 'text'])
def test_only_a_video_turn_waits_for_a_starting_camera(chat, mode):
    chat.granted['camera_capture'] = True
    assert _turn(chat, mode).status_code == 200
    assert chat.asked == ['face_only_test']


def test_the_consent_read_names_this_turns_agent(chat):
    """rv_page (a): a grant for this agent counts, as the page's own camera state does, so the
    turn's agent is passed to check_consent (which also takes the blanket grant)."""
    chat.granted['camera_capture'] = True
    r = chat.client.post('/chat', json={'text': 'Hi there', 'user_id': 'face_only_test',
                                        'request_id': 'face_only_req', 'media_mode': 'video',
                                        'prompt_id': 4242})
    assert r.status_code == 200
    assert chat.consent_agents == ['4242']


def test_a_turn_with_no_agent_asks_for_the_blanket_grant_only(chat):
    _turn(chat)
    assert chat.consent_agents == [None]
