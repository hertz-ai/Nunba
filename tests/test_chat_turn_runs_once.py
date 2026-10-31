"""A turn sent again while it is still running runs once.

Measured 2026-10-31 10:30-11:09 on the installed desktop (agent 54, Teach
Yourself): the chat page gives up on a /chat it has heard nothing from for
180 s (socialApi chatApi.chat, #119) and its retry loop counts that abort as
retryable (utils/chatRetry classifyError), so it POSTs the SAME request_id
again while the first run is still going.  Two turns arrived ten times
between them.  Every arrival started another run on the same session and
re-dispatched the current recipe action, so the receipt search -- which looks
only after the newest dispatch -- no longer saw the tool results that had
already run: 7 "[REUSE-VERIFY] ... no canonical receipt" GAVE_UPs, all on the
two repeated ids, none on any session whose ids never repeated.

The arrival that finds its turn still running waits for that run and answers
with its reply.  A turn with another id, with no id, or with an id the node
does not take from a client (the daemon's tag) runs as before.

    python -m pytest tests/test_chat_turn_runs_once.py -q
"""
import os
import sys
import threading
from unittest.mock import patch

import pytest
from flask import Flask, jsonify

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import routes.chatbot_routes as cr  # noqa: E402
from llama.llama_config import LlamaConfig  # noqa: E402

pytestmark = pytest.mark.timeout(60)


class _TurnStop(BaseException):
    """Ends a turn at the first thing every turn reads after its entry line
    (LlamaConfig.cached_intelligence_preference).  BaseException, because the
    turn catches Exception there and would go on to a live backend."""


@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    return app


class _Gate:
    """Stand-in for the first read a turn makes: counts the runs that got
    there, and holds each one until released."""

    def __init__(self):
        self.runs = 0
        self.entered = threading.Event()
        self.release = threading.Event()
        self._lock = threading.Lock()

    def __call__(self, *_a, **_k):
        with self._lock:
            self.runs += 1
        self.entered.set()
        self.release.wait(10)
        raise _TurnStop()


def _send(app, body, outcome):
    """One /chat arrival on its own thread, as the server runs it."""
    def run():
        try:
            with app.test_request_context('/chat', method='POST'):
                outcome.append(('reply', cr._chat_turn(dict(body))))
        except _TurnStop:
            outcome.append(('stopped', None))
    t = threading.Thread(target=run, daemon=True)
    t.start()
    return t


def _turn(request_id, user_id='u-1001'):
    body = {'text': 'teach me the next page', 'user_id': user_id,
            'agent_id': '54', 'agent_type': 'local'}
    if request_id is not None:
        body['request_id'] = request_id
    return body


def _two_arrivals(app, first, second):
    """The second arrives while the first is running; returns the gate and
    both outcomes once both have ended."""
    gate = _Gate()
    outcome = []
    with patch.object(LlamaConfig, 'cached_intelligence_preference', gate):
        a = _send(app, first, outcome)
        assert gate.entered.wait(10), 'the first turn never started'
        b = _send(app, second, outcome)
        # Long enough for a second run to reach the gate, had it started.
        b.join(1.0)
        gate.release.set()
        a.join(10)
        b.join(10)
    assert not a.is_alive() and not b.is_alive()
    return gate, outcome


def test_a_resent_turn_waits_for_the_running_one(app):
    gate, outcome = _two_arrivals(
        app, _turn('msg_1000000000000_abcdef'), _turn('msg_1000000000000_abcdef'))
    assert gate.runs == 1, f'the resent turn ran again ({gate.runs} runs)'
    # The waiting arrival ends the way the run it waited for ended.
    assert [kind for kind, _ in outcome] == ['stopped', 'stopped']
    assert not cr._RUNNING_TURNS


def test_the_resent_turn_answers_with_the_running_turns_reply(app):
    release = threading.Event()
    runs = []

    def body(data):
        runs.append(data.get('request_id'))
        release.wait(10)
        return jsonify({'text': 'Page 3 is about rain.',
                        'request_id': data.get('request_id')}), 200

    outcome = []
    with patch.object(cr, '_run_chat_turn', body):
        a = _send(app, _turn('msg_2000000000000_ghijkl'), outcome)
        b = _send(app, _turn('msg_2000000000000_ghijkl'), outcome)
        b.join(1.0)
        release.set()
        a.join(10)
        b.join(10)
    assert runs == ['msg_2000000000000_ghijkl']
    assert len(outcome) == 2
    for kind, result in outcome:
        assert kind == 'reply'
        response, status = result if isinstance(result, tuple) else (result, None)
        assert (status or response.status_code) == 200
        assert response.get_json() == {'text': 'Page 3 is about rain.',
                                       'request_id': 'msg_2000000000000_ghijkl'}
    # Two requests, two response objects: each request's own hooks run on
    # its own copy.
    first, second = (r[1] if not isinstance(r[1], tuple) else r[1][0]
                     for r in outcome)
    assert first is not second


def test_turns_with_different_ids_both_run(app):
    gate, outcome = _two_arrivals(
        app, _turn('msg_3000000000000_aaaaaa'), _turn('msg_3000000000000_bbbbbb'))
    assert gate.runs == 2


def test_the_same_id_from_another_person_is_their_own_turn(app):
    gate, _ = _two_arrivals(
        app, _turn('msg_4000000000000_cccccc', user_id='u-1'),
        _turn('msg_4000000000000_cccccc', user_id='u-2'))
    assert gate.runs == 2


def test_turns_without_an_id_both_run(app):
    gate, _ = _two_arrivals(app, _turn(None), _turn(None))
    assert gate.runs == 2


def test_an_id_the_node_does_not_take_from_a_client_is_never_joined(app):
    """The daemon's tag: _turn_request_id runs such a turn under a fresh id,
    so it is not the client's turn to wait on."""
    from core.chat_client import DAEMON_PREFIX
    rid = f'{DAEMON_PREFIX}goal-5000'
    gate, _ = _two_arrivals(app, _turn(rid), _turn(rid))
    assert gate.runs == 2


def test_the_id_runs_again_once_its_turn_has_answered(app):
    """Only a RUNNING turn is waited on; nothing is kept after it answers."""
    gate = _Gate()
    gate.release.set()
    outcome = []
    with patch.object(LlamaConfig, 'cached_intelligence_preference', gate):
        _send(app, _turn('msg_6000000000000_dddddd'), outcome).join(10)
        _send(app, _turn('msg_6000000000000_dddddd'), outcome).join(10)
    assert gate.runs == 2
    assert not cr._RUNNING_TURNS
