"""HARTOS's scheduler callbacks must be REACHABLE on the app that serves :5000.

Measured 2026-09-13 on the bundled desktop: hartos/reuse_recipe.py
execute_python_file and call_visual_task (same pair in create_recipe.py) POSTed
scheduled agent actions to localhost:6777/time_agent and /visual_agent.  The
desktop never binds :6777 (connection refused) and neither path was in
/debug/routes, so every scheduled action was dropped while the caller still
returned 'done'.  HARTOS now dials core.port_registry.get_local_backend_url()
(:5000 here); create_inprocess_dispatch_blueprint() is the door on this side --
the same cure as /api/vlm/stop (tests/test_vlm_stop_route_reachable.py).

    python -m pytest tests/test_inprocess_dispatch_reachable.py -q
"""
import os

import pytest
from flask import Flask, jsonify, request

import routes.hartos_backend_adapter as adapter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATHS = ('/time_agent', '/visual_agent')


@pytest.fixture
def hartos_app():
    """Stand-in for HARTOS's own Flask app: echoes what its handler received."""
    fake = Flask('fake_hartos')
    for path in PATHS:
        def handler(path=path):
            return jsonify({'handled_by': path, 'got': request.get_json()}), 200
        fake.add_url_rule(path, endpoint=path.strip('/'), view_func=handler,
                          methods=['POST'])
    return fake


def _nunba_client():
    app = Flask('nunba')
    app.register_blueprint(adapter.create_inprocess_dispatch_blueprint())
    return app.test_client()


@pytest.fixture
def nunba(monkeypatch, hartos_app):
    monkeypatch.setattr(adapter, '_hevolve_app', hartos_app)
    monkeypatch.setattr(adapter, '_hartos_backend_available', True)
    monkeypatch.delenv('NUNBA_CI', raising=False)
    monkeypatch.delenv('TRUSTED_PROXY', raising=False)
    return _nunba_client()


@pytest.mark.parametrize('path', PATHS)
def test_local_caller_reaches_the_real_hartos_handler(nunba, path):
    """Dispatch, don't reimplement: the body arrives at HARTOS's own handler."""
    body = {'task_description': 'water the plants', 'user_id': 'u1', 'prompt_id': 7}
    resp = nunba.post(path, json=body)          # test_client is 127.0.0.1
    assert resp.status_code == 200
    assert resp.get_json() == {'handled_by': path, 'got': body}


@pytest.mark.parametrize('path', PATHS)
def test_lan_caller_is_refused(nunba, path):
    """HARTOS declares both handlers WITHOUT auth and :5000 binds 0.0.0.0.

    Without the local-only guard any device on the Wi-Fi could trigger agent
    runs for any user_id.
    """
    resp = nunba.post(path, json={'user_id': 'someone-else'},
                      environ_overrides={'REMOTE_ADDR': '192.168.0.50'})
    assert resp.status_code == 401


def test_backend_not_loaded_yet_is_503_not_500(monkeypatch):
    """HARTOS imports in a background thread; early callers get a clean 503."""
    monkeypatch.setattr(adapter, '_hevolve_app', None)
    monkeypatch.setattr(adapter, '_hartos_backend_available', False)
    resp = _nunba_client().post('/time_agent', json={})
    assert resp.status_code == 503
    assert resp.get_json()['status'] == 'backend_unavailable'


def test_main_registers_it_outside_the_direct_mode_guard():
    """Declaring a route is not serving it (see test_vlm_stop_route_reachable).

    The proxy blueprint is mounted only under `if not HARTOS_BACKEND_DIRECT`,
    which is False on this install -- a route registered there stays 404.
    """
    with open(os.path.join(REPO, 'main.py'), encoding='utf-8', errors='replace') as fh:
        src = fh.read()
    assert 'create_inprocess_dispatch_blueprint(' in src, (
        'main.py never registers the dispatch blueprint; /time_agent is declared '
        'but not served')
    reg = src.index('create_inprocess_dispatch_blueprint(')
    guard = src.index('if not HARTOS_BACKEND_DIRECT')
    block_end = src.index('\n# VLM run-control', guard)
    assert not (guard < reg < block_end), (
        'registered INSIDE the `if not HARTOS_BACKEND_DIRECT` branch -- it will '
        'not be served in direct mode, which is what the desktop runs')
