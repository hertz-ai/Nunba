"""A turn the page sends again holds at most one server thread, and its reply
still reaches the page.

Measured 2026-11-26 12:14-12:17 IST on the desktop (build #5): :5000 stopped
answering every route, health included, with 118 CLOSE_WAIT sockets.  Each
was a copy of a running chat turn: the chat page gives up on a chat silent
for 180 s and its retry loop sends the same request_id again, and every copy
waited in _chat_turn for the run's reply after the page had gone, holding a
waitress thread.  And copies sent after their run had answered (msa3sk,
v07kbv, v70pq8, zt1897, gs4kgc, 12:12-12:17) ran the turn again; an open-mic
final the agent had judged not for it was judged again and answered.

Now one copy of a running turn waits for it; every later copy is answered at
once with the hold's kept line, and the run's reply then also goes to the
person as the agent's message (core.peer_link.crossbar_publish.publish_agent_
message), since the page has given up on every earlier copy.  A copy that
comes after its run answered, within the page's give-up window, gets that
reply at once and runs nothing.

    python -m pytest tests/test_a_resent_turn_holds_one_thread.py -q
"""
import os
import sys
import threading
import time
from unittest.mock import patch

import pytest
from flask import Flask, jsonify

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import routes.chatbot_routes as cr  # noqa: E402

pytestmark = pytest.mark.timeout(60)

RID = 'msg_1795671254000_resend'
SEND_AGAIN = 'send the same message again'


@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    return app


@pytest.fixture(autouse=True)
def _nothing_kept():
    with cr._RUNNING_TURNS_LOCK:
        cr._RUNNING_TURNS.clear()
        getattr(cr, '_FINISHED_TURNS', {}).clear()
    yield
    with cr._RUNNING_TURNS_LOCK:
        cr._RUNNING_TURNS.clear()
        getattr(cr, '_FINISHED_TURNS', {}).clear()


class _Run:
    """Stands in for the turn itself (_run_chat_turn): counts the runs, holds
    each until released, and answers."""

    def __init__(self):
        self.runs = 0
        self.entered = threading.Event()
        self.release = threading.Event()

    def __call__(self, data):
        self.runs += 1
        self.entered.set()
        self.release.wait(30)
        return jsonify({'text': 'I see the five photos you sent.',
                        'request_id': data.get('request_id')}), 200


def _turn(user_id='10202'):
    return {'text': 'I already uploaded all photos', 'user_id': user_id,
            'agent_id': '95568353503', 'prompt_id': '95568353503',
            'agent_type': 'local', 'request_id': RID}


def _send(app, outcome):
    def run():
        with app.test_request_context('/chat', method='POST'):
            outcome.append(cr._chat_turn(_turn()))
    t = threading.Thread(target=run, daemon=True)
    t.start()
    return t


def _text(result):
    response, _status = cr._reply_and_status(result)
    return (response.get_json() or {}).get('text') or ''


def test_twenty_resends_hold_one_thread_and_the_reply_reaches_the_page(app):
    run, outcome, published = _Run(), [], []
    with patch.object(cr, '_run_chat_turn', run), \
            patch('core.peer_link.crossbar_publish.publish_agent_message',
                  side_effect=lambda **k: published.append(k) or True):
        first = _send(app, outcome)
        assert run.entered.wait(10)
        copies = [_send(app, outcome) for _ in range(20)]
        for c in copies:
            c.join(2)
        waiting = [c for c in copies if c.is_alive()]
        assert len(waiting) <= 1, f'{len(waiting)} copies hold a thread'
        answered = [r for r in outcome]
        assert len(answered) >= 19
        for result in answered:
            assert SEND_AGAIN not in _text(result)
            assert _text(result).startswith(
                'This conversation is still answering an earlier message'), _text(result)
        run.release.set()
        first.join(10)
        for c in copies:
            c.join(10)
    assert run.runs == 1
    assert [p['text'] for p in published] == ['I see the five photos you sent.']
    assert published[0]['request_id'] == RID and published[0]['user_id'] == '10202'


def test_a_copy_after_the_run_answered_gets_its_reply_and_runs_nothing(app):
    run, outcome = _Run(), []
    run.release.set()
    with patch.object(cr, '_run_chat_turn', run):
        _send(app, outcome).join(10)
        _send(app, outcome).join(10)
    assert run.runs == 1, 'the copy ran the turn again'
    assert [_text(r) for r in outcome] == ['I see the five photos you sent.'] * 2


def test_a_copy_after_the_give_up_window_runs_again(app, monkeypatch):
    monkeypatch.setattr(cr, '_PAGE_GIVE_UP_S', 0.0, raising=False)
    run, outcome = _Run(), []
    run.release.set()
    with patch.object(cr, '_run_chat_turn', run):
        _send(app, outcome).join(10)
        time.sleep(0.01)
        _send(app, outcome).join(10)
    assert run.runs == 2


def test_one_copy_still_waits_for_the_reply_and_nothing_is_published(app):
    """The copy the page is still listening on gets the run's reply on its
    own socket; nothing is published, so the page shows it once."""
    run, outcome, published = _Run(), [], []
    with patch.object(cr, '_run_chat_turn', run), \
            patch('core.peer_link.crossbar_publish.publish_agent_message',
                  side_effect=lambda **k: published.append(k) or True):
        first = _send(app, outcome)
        assert run.entered.wait(10)
        copy = _send(app, outcome)
        copy.join(1)
        assert copy.is_alive(), 'the one copy did not wait for the run'
        run.release.set()
        first.join(10)
        copy.join(10)
    assert [_text(r) for r in outcome] == ['I see the five photos you sent.'] * 2
    assert published == []
