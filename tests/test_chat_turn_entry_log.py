"""A chat turn leaves a log line the moment it ARRIVES.

2026-10-02: a message typed right after boot got "Thought for 12.7s" and no
reply, and every Nunba log from the launch to Tier-1 going active held no
trace of it -- no dispatch line, no adapter fallback line, no traceback.
`_chat_turn` wrote nothing until its first branch deep inside, so "the request
never arrived" and "it arrived and returned before its first log line" read
identically.  One INFO line at entry (who, which agent, how long, which media
mode -- never the text itself) makes the two distinguishable.

    python -m pytest tests/test_chat_turn_entry_log.py -q
"""
import logging
import os
import sys

import pytest
from flask import Flask

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import routes.chatbot_routes as cr  # noqa: E402

pytestmark = pytest.mark.timeout(30)


@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    return app


def _entry_records(caplog):
    return [r for r in caplog.records if '[CHAT] turn received' in r.getMessage()]


def test_entry_is_logged_before_any_early_return(app, caplog):
    """Empty text returns 400 near the top; the arrival is already on record."""
    with caplog.at_level(logging.INFO, logger=cr.logger.name):
        with app.test_request_context('/chat', method='POST'):
            body, status = cr._chat_turn({'text': '', 'user_id': 'u-77'})
    assert status == 400
    recs = _entry_records(caplog)
    assert len(recs) == 1, [r.getMessage() for r in caplog.records]
    msg = recs[0].getMessage()
    assert 'user_id=u-77' in msg
    assert 'text_len=0' in msg


def test_entry_line_never_contains_the_message_text(app, caplog):
    secret = 'my-private-sentence-xyz'
    with caplog.at_level(logging.INFO, logger=cr.logger.name):
        with app.test_request_context('/chat', method='POST'):
            try:
                cr._chat_turn({'text': secret, 'user_id': 'u-1'})
            except Exception:
                pass  # past the entry line the turn needs a live backend
    recs = _entry_records(caplog)
    assert len(recs) == 1
    assert secret not in recs[0].getMessage()
    assert f'text_len={len(secret)}' in recs[0].getMessage()
