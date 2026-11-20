"""/execute asks the owner for consent but never holds the request for it.

HARTOS's computer_control_block waits up to COMPUTER_CONTROL_WAIT_SECONDS
(90 s) for the owner's answer unless its caller passes wait=False, and its
docstring names the caller that must: "an HTTP request" (POST /coding/execute
held one 108.6 s).  /execute is one, and it waits while holding
computer_control_lock, so one unanswered ask also stalled every other
/execute for 90 s -- including the VLM loop's own actions, whose consent was
already granted upstream (local_loop calls the gate, and waits, before its
first action) and whose client gives up after 30 s.  The HTTP clients here
allow less than the wait: local_computer_tool 30 s, RemoteDesktopExecutor
timeout+10.  CI on PR #38 hung on exactly this.

The owner is still asked (one look files the ask); the caller gets the
refusal that says so and can run again once they allow it.

Behavioural: the real route through the Flask test client, the real gate,
with only the owner's answer lookup faked as "not answered yet".  A second
look means the gate polled -- i.e. it held the request -- so the fake fails
on it instead of letting the old code sleep out its 90 s.
"""
import os
import sys
import time

import pytest

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

safety = pytest.importorskip('integrations.vlm.safety')


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv('NUNBA_BUNDLED', '1')
    import main
    main.app.config['TESTING'] = True
    with main.app.test_client() as c:
        yield c


def test_an_unanswered_consent_ask_returns_at_once(client, monkeypatch):
    import subprocess

    def _boom(*a, **k):
        raise AssertionError('a command without consent reached subprocess')

    for name in ('run', 'Popen', 'call', 'check_output'):
        monkeypatch.setattr(subprocess, name, _boom, raising=False)

    # An owner exists (main exports one at import), the request is a watched
    # one rather than a daemon run, and the owner has not answered.
    monkeypatch.setenv('HEVOLVE_OWNER_USER_ID', 'owner-under-test')
    import integrations.agent_engine.dispatch as dispatch
    monkeypatch.setattr(dispatch, 'is_current_request_autonomous', lambda: False)
    looks = []

    def _not_answered_yet(owner, agent, reason):
        looks.append(owner)
        if len(looks) > 1:
            raise AssertionError('the gate polled: /execute held the request')
        return None

    monkeypatch.setattr(safety, '_computer_control_answer', _not_answered_yet)

    started = time.monotonic()
    resp = client.post('/execute', json={'command': 'echo hello', 'shell': True})
    elapsed = time.monotonic() - started

    assert resp.status_code == 403
    body = resp.get_json()
    assert body['exit_reason'] == 'consent_required'
    assert 'They have been asked' in body['error'], body['error']
    assert looks == ['owner-under-test'], 'the owner must be asked exactly once'
    assert elapsed < 2.0, f'/execute held the request {elapsed:.1f}s'
