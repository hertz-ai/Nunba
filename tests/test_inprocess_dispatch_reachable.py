"""HARTOS's own-app routes must be REACHABLE on the app that serves :5000, and
only by the callers they are for.

Measured on the bundled desktop:
  2026-09-10  POST /api/vlm/stop -> 404 while a VLM loop drove the desktop, so
              Stop AI Control reported failure (tests/test_vlm_stop_route_reachable.py).
  2026-09-13  hartos/reuse_recipe.py execute_python_file and call_visual_task
              (same pair in create_recipe.py) POSTed scheduled agent actions to
              localhost:6777/time_agent and /visual_agent.  The desktop never
              binds :6777 and neither path was in /debug/routes, so every
              scheduled action was dropped while the caller still returned 'done'.

HARTOS declares all three on ITS OWN Flask app, which the desktop never mounts
on :5000.  create_inprocess_dispatch_blueprint() is the one door on this side.

The door is also a way in.  :5000 binds 0.0.0.0, and a web page open in the
user's browser posts from 127.0.0.1, so a local-only check cannot tell Nunba's
own page from any other: at d2f33033 a POST from 127.0.0.1 carrying
`Origin: https://evil.example` was served by /time_agent (this file's red
run, 2026-09-14).  The door is now routes.auth.require_local_or_token_csrf_safe.

    python -m pytest tests/test_inprocess_dispatch_reachable.py -q
"""
import ast
import glob
import json
import os
import sys
import types

import pytest
from flask import Flask, jsonify, request

import routes.auth as auth
import routes.hartos_backend_adapter as adapter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Pinned here, not read from _INPROCESS_DISPATCH_ROUTES: a test that takes its
# expected set from the code under test still passes when a route is dropped.
PATHS = ('/api/vlm/stop', '/time_agent', '/visual_agent')

EVIL = 'https://evil.example'
LAN = {'REMOTE_ADDR': '192.168.0.50'}


@pytest.fixture
def received():
    """(path, body) for every request that reached the HARTOS handler."""
    return []


@pytest.fixture
def hartos_app(received):
    """Stand-in for HARTOS's own Flask app: records and echoes what its handler got."""
    fake = Flask('fake_hartos')
    for path in PATHS:
        def handler(path=path):
            body = request.get_json(silent=True)
            received.append((path, body))
            return jsonify({'handled_by': path, 'got': body}), 200
        fake.add_url_rule(path, endpoint=path.strip('/').replace('/', '_'),
                          view_func=handler, methods=['POST'])
    return fake


def _nunba_client():
    app = Flask('nunba')
    app.register_blueprint(adapter.create_inprocess_dispatch_blueprint())
    return app.test_client()


def _clean_auth_env(monkeypatch):
    monkeypatch.setattr(auth, 'API_TOKEN', '')
    for var in ('NUNBA_CI', 'TRUSTED_PROXY', 'HARTOS_TRUSTED_ORIGINS'):
        monkeypatch.delenv(var, raising=False)


@pytest.fixture
def nunba(monkeypatch, hartos_app):
    monkeypatch.setattr(adapter, '_hevolve_app', hartos_app)
    monkeypatch.setattr(adapter, '_hartos_backend_available', True)
    _clean_auth_env(monkeypatch)
    return _nunba_client()


@pytest.fixture
def token(monkeypatch):
    monkeypatch.setattr(auth, 'API_TOKEN', 'nunba-test-token')
    return 'nunba-test-token'


# -- the callers the door is for ---------------------------------------------

@pytest.mark.parametrize('path', PATHS)
def test_local_caller_reaches_the_real_hartos_handler(nunba, received, path):
    """Dispatch, don't reimplement: the body arrives at HARTOS's own handler."""
    body = {'task_description': 'water the plants', 'user_id': 'u1', 'prompt_id': 7}
    resp = nunba.post(path, json=body)          # test_client is 127.0.0.1
    assert resp.status_code == 200
    assert resp.get_json() == {'handled_by': path, 'got': body}
    assert received == [(path, body)]


@pytest.mark.parametrize('path', ('/time_agent', '/visual_agent'))
def test_the_scheduler_request_shape_gets_through(nunba, received, path):
    """What HARTOS's scheduler sends: a JSON string as `data` with only
    Content-Type set, and no Origin (execute_python_file, create_recipe.py:605-611
    and reuse_recipe.py:653-656; call_visual_task posts `data=` with the same
    headers dict, create_recipe.py:784-813)."""
    body = {'task_description': 't', 'user_id': 1, 'prompt_id': 2,
            'action_entry_point': 0, 'request_from': 'Reuse'}
    resp = nunba.post(path, data=json.dumps(body),
                      headers={'Content-Type': 'application/json'})
    assert resp.status_code == 200
    assert received == [(path, body)]


def _stop_caller_shapes():
    """The headers call_stop_api's POST really sends, read from CODE.

    main.py holds the one call_stop_api (GET /indicator/stop calls it).
    app.py carried a second copy that nothing called; #58 deleted it.
    """
    shapes = []
    for name in ('main.py',):
        with open(os.path.join(REPO, name), encoding='utf-8', errors='replace') as fh:
            tree = ast.parse(fh.read())
        fns = [n for n in ast.walk(tree)
               if isinstance(n, ast.FunctionDef) and n.name == 'call_stop_api']
        assert len(fns) == 1, f'{name}: expected one call_stop_api, found {len(fns)}'
        posts = [n for n in ast.walk(fns[0])
                 if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
                 and n.func.attr == 'post' and isinstance(n.func.value, ast.Name)
                 and n.func.value.id == 'requests']
        assert len(posts) == 1, f'{name}: expected one requests.post in call_stop_api'
        kw = {k.arg: k.value for k in posts[0].keywords}
        headers = ast.literal_eval(kw['headers']) if 'headers' in kw else {}
        shapes.append(pytest.param(headers, 'json' in kw, id=name))
    return shapes


@pytest.mark.parametrize('headers,posts_json', _stop_caller_shapes())
def test_each_real_stop_caller_gets_through(nunba, received, headers, posts_json):
    """Stop AI Control: indicator_window -> GET /indicator/stop -> call_stop_api
    -> POST /api/vlm/stop.  This replays the headers each call_stop_api really
    sends, so a caller that starts sending an Origin, or stops sending JSON,
    fails here instead of on the user's Stop click."""
    assert posts_json, 'call_stop_api no longer posts json=; the stop handler reads JSON'
    resp = nunba.post('/api/vlm/stop', json={'user_id': 'u1'}, headers=headers)
    assert resp.status_code == 200, resp.get_data(as_text=True)
    assert received == [('/api/vlm/stop', {'user_id': 'u1'})]


@pytest.mark.parametrize('path', PATHS)
@pytest.mark.parametrize('origin', ['http://127.0.0.1:5000', 'http://localhost:5000'])
def test_a_loopback_page_gets_through(nunba, received, path, origin):
    """Nunba's own UI is served from loopback; its requests keep working."""
    resp = nunba.post(path, json={'user_id': 'u1'}, headers={'Origin': origin})
    assert resp.status_code == 200
    assert len(received) == 1


@pytest.mark.parametrize('path', PATHS)
def test_a_token_holder_gets_through_from_the_lan(nunba, received, token, path):
    resp = nunba.post(path, json={'user_id': 'u1'}, environ_overrides=LAN,
                      headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    assert len(received) == 1


def test_a_token_holder_skips_the_origin_check(nunba, received, token):
    """A browser page cannot read the token, so holding it shows the caller is
    not a cross-origin page (the same rule as HARTOS's decorator)."""
    resp = nunba.post('/time_agent', json={}, headers={
        'Origin': EVIL, 'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200


# -- everyone else -------------------------------------------------------------

@pytest.mark.parametrize('path', PATHS)
def test_a_lan_caller_is_refused(nunba, received, path):
    """HARTOS declares /time_agent and /visual_agent WITHOUT auth and :5000
    binds 0.0.0.0, so without the guard any device on the Wi-Fi could start
    agent runs, or stop them, for any user_id."""
    resp = nunba.post(path, json={'user_id': 'someone-else'}, environ_overrides=LAN)
    assert resp.status_code == 401
    assert received == []


@pytest.mark.parametrize('path', PATHS)
@pytest.mark.parametrize('headers', [
    {'Origin': EVIL},
    {'Referer': EVIL + '/page'},
    {'Origin': 'null'},              # sandboxed iframe, file:// page
], ids=['origin', 'referer-only', 'null-origin'])
def test_a_cross_origin_page_is_refused_before_hartos_runs(nunba, received, path, headers):
    """A page in the user's browser posts from 127.0.0.1, so the local check
    alone served it (measured 2026-09-14 on /time_agent)."""
    resp = nunba.post(path, json={'user_id': 'u1'}, headers=headers)
    assert resp.status_code == 403
    assert received == [], 'HARTOS ran a request the guard refused'


def test_a_wrong_token_from_the_lan_is_refused(nunba, received, token):
    resp = nunba.post('/time_agent', json={}, environ_overrides=LAN,
                      headers={'Authorization': 'Bearer wrong'})
    assert resp.status_code == 401
    assert received == []


def test_a_non_ascii_token_is_a_401_not_a_500(nunba, received, token):
    """hmac.compare_digest on two str raises TypeError for non-ASCII input,
    and the Authorization header is the caller's to choose."""
    resp = nunba.post('/time_agent', json={}, environ_overrides=LAN,
                      headers={'Authorization': 'Bearer ünïcodé'})
    assert resp.status_code == 401
    assert received == []


def test_without_hartos_the_guard_does_not_fail_open(nunba, received, monkeypatch):
    """The Origin check is HARTOS's core.auth_local.is_safe_csrf_origin.  If
    the bundled HARTOS predates it (Nunba deployed first), callers with no
    Origin/Referer (scheduler, call_stop_api) still pass and anything a
    browser sent is refused."""
    monkeypatch.setitem(sys.modules, 'core.auth_local',
                        types.ModuleType('core.auth_local'))
    assert nunba.post('/time_agent', json={}).status_code == 200
    for origin in ('http://127.0.0.1:5000', EVIL):
        resp = nunba.post('/time_agent', json={}, headers={'Origin': origin})
        assert resp.status_code == 403, origin
    assert len(received) == 1


def test_a_broken_hartos_check_refuses_browsers_and_never_500s(nunba, received, monkeypatch):
    """An error other than ImportError while loading the check (a HARTOS
    module that fails part-way) is handled like a missing check, not raised
    as a 500 on the Stop route."""
    broken = types.ModuleType('core.auth_local')

    def _explode(name):
        raise RuntimeError('core.auth_local failed while loading')
    broken.__getattr__ = _explode
    monkeypatch.setitem(sys.modules, 'core.auth_local', broken)
    assert nunba.post('/api/vlm/stop', json={}).status_code == 200
    resp = nunba.post('/api/vlm/stop', json={}, headers={'Origin': EVIL})
    assert resp.status_code == 403
    assert len(received) == 1


def test_source_guard_one_local_or_token_rule():
    """The CSRF-safe decorator is require_local_or_token plus an Origin check.
    A second copy of the local-or-token rule (its own 401) drifts from the
    first; routes/auth.py returns 401 from exactly one place."""
    with open(os.path.join(REPO, 'routes', 'auth.py'), encoding='utf-8') as fh:
        tree = ast.parse(fh.read())
    returns_401 = [n.lineno for n in ast.walk(tree)
                   if isinstance(n, ast.Return) and isinstance(n.value, ast.Tuple)
                   and any(isinstance(e, ast.Constant) and e.value == 401
                           for e in n.value.elts)]
    assert len(returns_401) == 1, f'401 returned at routes/auth.py lines {returns_401}'


# -- edges ---------------------------------------------------------------------

def test_a_non_json_body_reaches_hartos_as_empty_json(nunba, received):
    """get_json(silent=True): a non-JSON body is forwarded as {} and HARTOS's
    handler does its own validation, instead of the door raising a 500."""
    resp = nunba.post('/api/vlm/stop', data='not json', content_type='text/plain')
    assert resp.status_code == 200
    assert received == [('/api/vlm/stop', {})]


@pytest.mark.parametrize('path', PATHS)
def test_backend_not_loaded_yet_is_503_not_500(monkeypatch, path):
    """HARTOS imports in a background thread; early callers get a clean 503."""
    monkeypatch.setattr(adapter, '_hevolve_app', None)
    monkeypatch.setattr(adapter, '_hartos_backend_available', False)
    _clean_auth_env(monkeypatch)
    resp = _nunba_client().post(path, json={})
    assert resp.status_code == 503
    assert resp.get_json()['status'] == 'backend_unavailable'


# -- source guards -------------------------------------------------------------

def test_source_guard_main_registers_the_door_unconditionally():
    """Declaring a route is not serving it.

    main.py mounts the proxy blueprint only under `if not HARTOS_BACKEND_DIRECT`,
    which is False on the desktop.  A route registered under a condition, or in
    a function, can stay shut: measured for /api/vlm/stop, deployed, restarted,
    still 404.  A try/except around the registration is fine.
    """
    with open(os.path.join(REPO, 'main.py'), encoding='utf-8', errors='replace') as fh:
        tree = ast.parse(fh.read())
    parents = {child: node for node in ast.walk(tree)
               for child in ast.iter_child_nodes(node)}
    calls = [n for n in ast.walk(tree)
             if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
             and n.func.id == 'create_inprocess_dispatch_blueprint']
    assert len(calls) == 1, (
        f'expected one registration call in main.py, found {len(calls)}')
    node = calls[0]
    while node in parents:
        node = parents[node]
        assert not isinstance(node, (ast.If, ast.IfExp, ast.While, ast.For,
                                     ast.FunctionDef, ast.AsyncFunctionDef)), (
            f'the dispatch blueprint is registered inside '
            f'{type(node).__name__} at main.py:{node.lineno}; it has to run at '
            f'import in every topology')


def test_source_guard_the_dispatch_table_is_the_only_door():
    """One door per route.  /api/vlm/stop used to have its own blueprint
    (proxy_vlm_stop) with no guard of its own; its test_client() call reached
    HARTOS as 127.0.0.1 with no Origin, so HARTOS's guard passed every caller.
    A second door to the same handler ends up with a different guard."""
    files = [os.path.join(REPO, 'main.py')] + sorted(
        glob.glob(os.path.join(REPO, 'routes', '*.py')))
    doubled = []
    for path in files:
        with open(path, encoding='utf-8', errors='replace') as fh:
            tree = ast.parse(fh.read())
        for n in ast.walk(tree):
            if (isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
                    and n.func.attr in ('route', 'add_url_rule')
                    and n.args and isinstance(n.args[0], ast.Constant)
                    and n.args[0].value in PATHS):
                doubled.append(f'{os.path.relpath(path, REPO)}:{n.lineno} '
                               f'{n.args[0].value}')
    assert not doubled, (
        'these routes are served through _INPROCESS_DISPATCH_ROUTES; a second '
        f'declaration is a second door: {doubled}')
