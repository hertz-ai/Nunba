"""A game's cue exists only through a binding.

The app asks /api/media/asset for a cue with the SAME prompt it uses for
the game's background music -- "<category> <mood> kids background music"
-- and only `state` tells them apart.  When the agent has not bound that
state, the route used to fall through to the generic music path, whose
cache is keyed by prompt alone: it answered the "correct" request with the
bgm file (or started composing bgm for it), and the phone played thirty
seconds of background music as the chime and cached it under the cue's key
for good.  MEASURED 2026-09-22 against the live route.

These tests drive the route in a bare Flask app through register_routes,
never through main: the journey fixture prefers a LIVE Nunba on :5000,
which would test whatever build is installed, not this code.
"""
import os
import sys
from unittest.mock import patch

import pytest
from flask import Flask

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from routes import kids_media_routes as kmr  # noqa: E402

PROMPT = 'spelling%20happy%20kids%20background%20music'


@pytest.fixture
def client():
    app = Flask(__name__)
    app.config['TESTING'] = True
    kmr.register_routes(app)
    return app.test_client()


def test_a_cue_nobody_bound_is_unbound_not_the_background_music(client):
    with patch.object(kmr, '_bound_game_media', return_value=(None, 'miss')), \
            patch.object(kmr, '_async_generate') as compose:
        resp = client.get(f'/api/media/asset?type=music&prompt={PROMPT}'
                          '&prompt_id=4242&game_id=eng-01&state=correct')
    assert resp.status_code == 404, resp.get_data(as_text=True)
    body = resp.get_json()
    assert body['status'] == 'unbound' and body['state'] == 'correct', body
    assert not compose.called, 'a cue nobody bound started a composition'


def test_a_bound_cue_answers_with_its_binding(client):
    with patch.object(kmr, '_bound_game_media',
                      return_value=('/v1/audio?path=chime.wav', 'game')):
        resp = client.get(f'/api/media/asset?type=music&prompt={PROMPT}'
                          '&prompt_id=4242&game_id=eng-01&state=correct')
    assert resp.status_code == 200
    assert resp.get_json() == {'url': '/v1/audio?path=chime.wav',
                               'bound': True, 'matched': 'game'}


def test_a_cue_still_composing_is_waited_for(client):
    with patch.object(kmr, '_bound_game_media', return_value=(None, 'composing')):
        resp = client.get(f'/api/media/asset?type=music&prompt={PROMPT}'
                          '&prompt_id=4242&game_id=eng-01&state=correct')
    assert resp.status_code == 202
    assert resp.get_json()['status'] == 'composing'


def test_the_guard_asks_the_memo_for_the_state_the_app_named(client):
    """The state must reach the matcher exactly, or a bound chime reads as
    unbound and the guard answers 404 for a sound the agent DID make."""
    with patch.object(kmr, '_bound_game_media', return_value=(None, 'miss')) as memo:
        client.get(f'/api/media/asset?type=music&prompt={PROMPT}'
                   '&prompt_id=4242&game_id=eng-01&state=starEarned&level=3')
    assert memo.call_args.kwargs['state'] == 'starEarned'
    assert memo.call_args.kwargs['level'] == '3'
    assert memo.call_args.args[:2] == ('4242', 'eng-01')
