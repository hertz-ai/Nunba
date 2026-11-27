"""GET /avatar/idle/<prompt_id>.mp4: an agent's idle face (owner 27 Nov), to the viewers the agent list
shows it to (review hartos-17 I1).  Everyone else is answered as a clip that does not exist."""
import json
import os
import sys

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

PHONE = {'REMOTE_ADDR': '192.168.0.77'}


@pytest.fixture(scope='module')
def app_client():
    try:
        from main import app
    except Exception as e:
        pytest.skip(f"Flask app not available: {e}")
    app.config['TESTING'] = True
    with app.test_client() as c:
        yield c


@pytest.fixture
def agent(monkeypatch, tmp_path):
    """Agent 4242 of user 43, speaking as avatar 7, whose idle clip is kept."""
    import core.platform_paths as pp
    from integrations.service_tools import avatarforcing_idle as idle
    prompts = tmp_path / 'prompts'
    prompts.mkdir()
    (prompts / '4242.json').write_text(json.dumps({
        'prompt_id': 4242, 'name': 'Tutor', 'creator_user_id': '43', 'teacher_avatar_id': 7}),
        encoding='utf-8')
    monkeypatch.setattr(pp, 'get_recipe_prompts_dir', lambda: str(prompts))
    clip = tmp_path / 'idle_7_1.mp4'
    clip.write_bytes(b'idle-face-of-7')
    monkeypatch.setattr(idle, 'stored_clip', lambda a: clip if a == 7 else None)
    return clip


def _phone(monkeypatch, user):
    import main
    from flask import g

    def admitted():
        g.auth_source = 'device'
        g.device_public_key = 'phone-key-under-test'
        g.jwt_payload = {'user_id': user}
    monkeypatch.setitem(main.app.before_request_funcs, None, [admitted])


def test_this_machine_gets_the_idle_face(app_client, agent):
    r = app_client.get('/avatar/idle/4242.mp4')
    assert r.status_code == 200 and r.mimetype == 'video/mp4' and r.get_data() == b'idle-face-of-7'


def test_the_agents_own_users_phone_gets_it(app_client, agent, monkeypatch):
    _phone(monkeypatch, '43')
    assert app_client.get('/avatar/idle/4242.mp4', environ_base=PHONE).status_code == 200


def test_another_users_phone_is_answered_as_no_clip(app_client, agent, monkeypatch):
    _phone(monkeypatch, '42')
    r = app_client.get('/avatar/idle/4242.mp4', environ_base=PHONE)
    assert r.status_code == 404 and b'idle-face' not in r.get_data()


@pytest.mark.parametrize('pid', ['9999', 'abc', '4242x'])
def test_no_agent_no_clip_or_a_bad_id_is_404(app_client, agent, pid):
    assert app_client.get(f'/avatar/idle/{pid}.mp4').status_code == 404


@pytest.mark.parametrize('pid', ['..%2F..%2Fx', '..%2F4242', '%2E%2E%2F4242'])
def test_a_traversal_shaped_id_never_serves_a_clip(app_client, agent, pid):
    """rv_face2 E: such a path never reaches /avatar/idle; Nunba's page catch-all answers it with the
    page (index.html, 200).  What matters is that no clip is served: not a video, no clip bytes."""
    r = app_client.get(f'/avatar/idle/{pid}.mp4')
    assert r.mimetype != 'video/mp4' and b'idle-face' not in r.get_data()


def test_an_agent_with_no_kept_clip_is_404(app_client, agent, monkeypatch):
    from integrations.service_tools import avatarforcing_idle as idle
    monkeypatch.setattr(idle, 'stored_clip', lambda a: None)
    assert app_client.get('/avatar/idle/4242.mp4').status_code == 404
