"""A phone reads the one ask its tapped banner names, through the door its
answer takes on :5000.

Owner, 23 Nov 2026: "when the app is not open the central or desktop flat
node shd be able to communicate with user via Firebase".  A person ask's
Firebase banner opens the app (OPEN_PERSON_ASK), and the app reads the ask
from its desktop: GET /api/agent/approval?ask_id=<id> (Android PersonAsk.read,
desktop-only, as the answer goes).  HARTOS serves it on its own app
(person_ask.read_from_request); on the desktop that app is reached only
through create_inprocess_dispatch_blueprint, which took POST alone and
dropped the query of what it forwarded, so the read was a 405 and, with GET
allowed, would have reached HARTOS with no ask_id.

    python -m pytest tests/test_a_phone_reads_its_ask_through_nunba.py -q
"""
import pytest
from flask import Flask, g, jsonify, request

import routes.auth as auth
import routes.hartos_backend_adapter as adapter

LAN = {'REMOTE_ADDR': '192.168.0.50'}


@pytest.fixture
def hartos(monkeypatch):
    """HARTOS's door stand-in: what its GET handler was given."""
    got = []
    fake = Flask('fake_hartos_approval')

    @fake.route('/api/agent/approval', methods=['GET', 'POST'])
    def _door():
        got.append((request.method, request.args.to_dict(),
                    request.headers.get('Authorization')))
        return jsonify({'ask_id': request.args.get('ask_id'), 'type': 'approval'}), 200

    monkeypatch.setattr(adapter, '_hevolve_app', fake)
    monkeypatch.setattr(adapter, '_hartos_backend_available', True)
    monkeypatch.setattr(auth, 'API_TOKEN', '')
    for var in ('NUNBA_CI', 'TRUSTED_PROXY', 'HARTOS_TRUSTED_ORIGINS'):
        monkeypatch.delenv(var, raising=False)
    return got


def _nunba(admitted):
    app = Flask('nunba_gated')

    @app.before_request
    def _gate():
        if admitted:              # what HARTOS's API gate sets for an allowed phone
            g.auth_source = 'device'
            g.jwt_payload = {'user_id': '7'}
            g.device_public_key = 'ab' * 32

    app.register_blueprint(adapter.create_inprocess_dispatch_blueprint())
    return app.test_client()


def test_an_admitted_phone_reads_the_ask_its_banner_names(hartos):
    r = _nunba(admitted=True).get('/api/agent/approval?ask_id=ask-3',
                                  environ_overrides=LAN,
                                  headers={'Authorization': 'Bearer phone-token'})
    assert r.status_code == 200, r.get_data(as_text=True)
    assert r.get_json() == {'ask_id': 'ask-3', 'type': 'approval'}
    assert hartos == [('GET', {'ask_id': 'ask-3'}, 'Bearer phone-token')]


def test_this_machines_page_reads_it_too(hartos):
    r = _nunba(admitted=False).get('/api/agent/approval?ask_id=ask-3')
    assert r.status_code == 200
    assert hartos[0][:2] == ('GET', {'ask_id': 'ask-3'})


def test_a_lan_caller_the_gate_did_not_admit_reads_nothing(hartos):
    r = _nunba(admitted=False).get('/api/agent/approval?ask_id=ask-3',
                                   environ_overrides=LAN)
    assert r.status_code == 401
    assert hartos == []


def test_an_answer_still_goes_through_unchanged(hartos):
    r = _nunba(admitted=True).post('/api/agent/approval', json={'ask_id': 'a'},
                                   environ_overrides=LAN)
    assert r.status_code == 200
    assert hartos == [('POST', {}, None)]
