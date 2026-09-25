"""An agent-contact answer is recorded, and the wire contract does not move.

THE DEFECT (F9 half A): `_pending_contacts` was the entire record of the user's
answer. `contact['status'] = action` writes a field on a module-level dict, so:
  * an accept was forgotten on restart and the same agent asked again forever —
    the "pestered forever" failure ConsentService.record_capability_decision's
    own docstring names;
  * a deny was equally unrecorded, so a refused agent could re-ask at once;
  * neither appeared on the privacy page, and neither could be revoked.

The answer now goes to UserConsent (a deny as a revoke of the pending ask, which
is how ConsentService.declined() detects a no).

THE CONSTRAINT: landing-page/cypress/e2e/agent-consent-e2e-live.cy.js drives
these two routes live and pins the wire shape, including two orderings that are
easy to break — 404 on an unknown request_id BEFORE 400 on a bad action, and an
accept that can be REPLAYED and still answer 200 with the same body. Half of this
file is that contract, asserted here so it is checkable without a live Nunba on
:5000 and a browser.
"""
import contextlib
import json
import os
import sys
import types

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('HEVOLVE_DB_PATH', ':memory:')

from flask import Flask  # noqa: E402

AGENT = 'claude_orchestrator'
USER = '10202'
REASON = 'Cypress-shaped reason'
MESSAGE = 'Authorize WhatsApp onboarding outreach via the hive.'


@pytest.fixture
def api(monkeypatch):
    """The two real view functions, over a real consent DB."""
    from integrations.social.models import (
        Base,
        Notification,
        UserConsent,
        db_session,
        get_engine,
    )

    from routes import chatbot_routes as cr

    Base.metadata.create_all(get_engine())
    cr._pending_contacts.clear()
    # Isolate: the engine is shared across the session, and a consent row left
    # by a prior test leaks into the next one. Not hygiene for its own sake —
    # without it, a revoked row from the deny test makes the next accept
    # unrecordable, which is real behaviour (see the one-way test below) but
    # would show up here as an unrelated failure.
    with db_session(commit=True) as _db:
        for _row in _db.query(UserConsent).filter_by(user_id=USER).all():
            _db.delete(_row)
        for _row in _db.query(Notification).filter_by(user_id=USER).all():
            _db.delete(_row)

    # The agent is NOT owned by the target user -> the consent branch. The route
    # resolves ownership by reading an agent config off disk; with none found,
    # agent_config is None and is_owned is False, which is the branch under test.
    monkeypatch.setattr(cr, 'on_notification', lambda *a, **k: None,
                        raising=False)

    app = Flask(__name__)

    class _Api:
        module = cr

        def contact(self, reason=REASON, message=MESSAGE, agent=AGENT):
            with app.test_request_context(json={
                    'agent_id': agent, 'user_id': USER,
                    'reason': reason, 'message': message}):
                resp = cr.agent_contact_request()
            body = resp[0] if isinstance(resp, tuple) else resp
            code = resp[1] if isinstance(resp, tuple) else 200
            return code, json.loads(body.get_data(as_text=True))

        def respond(self, request_id, action):
            with app.test_request_context(json={
                    'request_id': request_id, 'action': action}):
                resp = cr.agent_contact_respond()
            body = resp[0] if isinstance(resp, tuple) else resp
            code = resp[1] if isinstance(resp, tuple) else 200
            return code, json.loads(body.get_data(as_text=True))

    return _Api()


def _consent(user=USER, agent=AGENT):
    from integrations.social.consent_service import ConsentService
    from integrations.social.models import db_session
    with db_session() as db:
        return (ConsentService.check_consent(db, user, 'agent_contact',
                                             agent_id=agent),
                ConsentService.declined(db, user, 'agent_contact',
                                        agent_id=agent))


# ── the record: what was missing ────────────────────────────────────────

def test_an_accept_is_recorded_so_the_agent_is_not_re_asked_forever(api):
    code, body = api.contact()
    assert code == 200 and body['requires_consent'] is True

    api.respond(body['request_id'], 'accept')

    granted, declined = _consent()
    assert granted is True, (
        "the accept lived only in a dict that dies with the process — nothing "
        'to revoke, nothing on the privacy page, and the same agent asks again')
    assert declined is False


def test_a_deny_is_recorded_as_a_refusal(api):
    code, body = api.contact()
    api.respond(body['request_id'], 'deny')

    granted, declined = _consent()
    assert granted is False
    assert declined is True, (
        'a deny must leave a decided record, or a refused agent re-asks at once')


def test_the_ask_itself_is_on_file_while_pending(api):
    """The ask is visible before the answer, which is what a privacy page shows."""
    from integrations.social.models import UserConsent, db_session
    api.contact()
    with db_session() as db:
        row = db.query(UserConsent).filter_by(
            user_id=USER, agent_id=AGENT, consent_type='agent_contact').first()
    assert row is not None, 'the pending ask was never filed'
    assert row.granted is False
    assert row.granted_at is None, 'a pending ask must carry no granted_at'
    # The label is the requester's DISPLAY name (what the card shows), which for
    # an agent with no config on disk is the route's f'Agent {agent_id[:8]}'.
    assert row.label and row.label.startswith('Agent '), \
        'the ask should carry the name the card displays'


def test_changing_a_deny_to_an_accept_IS_recorded(api):
    """A refused agent that the user later accepts must be grantable.

    This works because a denied ask never carried a granted_at, so
    grant_consent's promotion branch applies: it flips the SAME row rather than
    inserting beside it and hitting UNIQUE(user_id, agent_id, consent_type,
    scope). Before that branch existed, this whole path raised IntegrityError
    and the accept was silently unrecorded.
    """
    _, body = api.contact()
    api.respond(body['request_id'], 'deny')
    assert _consent() == (False, True)

    _, body2 = api.contact()
    code, out = api.respond(body2['request_id'], 'accept')

    assert code == 200 and out['success'] is True
    granted, _ = _consent()
    assert granted is True, 'a user who changes their mind must be recorded'


def test_re_granting_AFTER_a_real_grant_was_revoked_is_the_one_way_case(api):
    """The honest remaining limitation, pinned rather than hidden.

    Once a consent has genuinely been granted, granted_at is set. Revoking
    UPDATES that row (revoked_at set) rather than freeing the UNIQUE key, and
    promotion deliberately refuses a row with a granted_at because flipping it
    would rewrite history. So accept -> revoke -> accept cannot be recorded: the
    insert hits the constraint.

    The user still gets their answer; only the record fails to flip, and it is
    logged. Closing it needs a schema decision (a partial unique index that
    ignores revoked rows, or an explicit re-ask row), which is filed, not bodged
    in here. Asserted as CURRENT behaviour so that fixing it fails this test
    loudly instead of drifting.
    """
    from integrations.social.consent_service import ConsentService
    from integrations.social.models import db_session

    _, body = api.contact()
    api.respond(body['request_id'], 'accept')
    assert _consent()[0] is True
    with db_session(commit=True) as db:            # a real revoke, as the UI does
        ConsentService.revoke_consent(db, USER, 'agent_contact', agent_id=AGENT)
    assert _consent()[0] is False

    _, body2 = api.contact()
    code, out = api.respond(body2['request_id'], 'accept')

    assert code == 200 and out['success'] is True, \
        'the user must still get their answer even when the record cannot flip'
    assert _consent()[0] is False, (
        'if this now records as granted, the one-way limitation was fixed — '
        'update this test and the plan entry rather than deleting it')


def test_one_agents_grant_does_not_admit_another(api):
    code, body = api.contact(agent=AGENT)
    api.respond(body['request_id'], 'accept')

    assert _consent(agent=AGENT)[0] is True
    assert _consent(agent='some_other_agent')[0] is False, (
        'agent_contact is keyed per agent — a grant for one must not let '
        'another agent through')


# ── the contract the live e2e pins, which must not move ─────────────────

def test_contact_response_shape_is_unchanged(api):
    import re
    code, body = api.contact()
    assert code == 200
    assert re.match(r'^[a-f0-9-]+$', body['request_id'], re.I), \
        'request_id shape is asserted by the live e2e'
    assert 'requires_consent' in body
    assert isinstance(body['agent_name'], str)
    assert body['delivered'] is False


def test_accept_echoes_the_reason_and_the_agent(api):
    code, body = api.contact(reason=REASON)
    code, out = api.respond(body['request_id'], 'accept')

    assert code == 200
    assert out['success'] is True
    assert out['agent_id'] == AGENT
    assert out['reason'] == REASON, 'the e2e asserts the reason is echoed back'
    assert out['message'] == MESSAGE


def test_accept_can_be_REPLAYED(api):
    """A duplicate answer from a flaky network must still succeed.

    Recording the grant must not make the second accept fail: grant_consent is
    only called when no active grant exists (re-granting trips the UNIQUE
    constraint), and the response is built from the cached payload either way.
    """
    code, body = api.contact()
    rid = body['request_id']
    first = api.respond(rid, 'accept')
    second = api.respond(rid, 'accept')

    assert first == second, 'a replayed accept changed its answer'
    assert second[0] == 200 and second[1]['success'] is True
    assert second[1]['agent_id'] == AGENT


def test_deny_response_shape_is_unchanged(api):
    code, body = api.contact()
    code, out = api.respond(body['request_id'], 'deny')
    assert code == 200
    assert out['success'] is True and out['denied'] is True
    assert out['agent_id'] == AGENT


def test_unknown_request_id_is_404_and_a_bad_action_is_400_IN_THAT_ORDER(api):
    """Both codes, and the ordering the e2e comments on explicitly.

    A bad action only 400s AFTER the request_id lookup passes; checking the
    action first would turn the unknown-id case into a 400 and break the e2e.
    """
    code, _ = api.respond('nonexistent-id', 'accept')
    assert code == 404

    code, _ = api.respond('nonexistent-id', 'maybe')
    assert code == 404, 'the id lookup must come first, even for a bad action'

    _, body = api.contact()
    code, out = api.respond(body['request_id'], 'maybe')
    assert code == 400
    assert 'action' in out['error'].lower()


def test_a_consent_write_failure_still_answers_the_user(api, monkeypatch):
    """Bookkeeping must never cost the user their answer.

    The record is written after the response data is settled and inside a
    try/except for exactly this reason.
    """
    from integrations.social.consent_service import ConsentService
    _, body = api.contact()
    monkeypatch.setattr(
        ConsentService, 'grant_consent',
        staticmethod(lambda *a, **k: (_ for _ in ()).throw(
            RuntimeError('db gone'))))

    code, out = api.respond(body['request_id'], 'accept')

    assert code == 200 and out['success'] is True
    assert out['reason'] == REASON


def test_the_dict_is_documented_as_a_payload_cache_not_a_decision_store():
    """Divergence guard on the thing that caused this.

    The dict is allowed to remain (it holds the payload, which has no durable
    home yet), but the moment it is treated as the record again the defect is
    back. Pinned on the declaration comment AND on the presence of the real
    write, so removing the ConsentService call fails here too.
    """
    import inspect

    from routes import chatbot_routes as cr
    src = inspect.getsource(cr)
    decl = src.split('_pending_contacts = {}')[0][-1400:]
    assert 'NOT the record of the decision' in decl, (
        'the cache must say what it is, or the next reader stores the answer '
        'in it again')
    respond = inspect.getsource(cr.agent_contact_respond)
    assert 'ConsentService' in respond, (
        'the answer is no longer recorded anywhere durable')
    assert 'revoke_consent' in respond, (
        'a deny must be recorded, not just an accept')
