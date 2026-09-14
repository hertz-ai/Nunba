"""A desktop hands its full app to another machine only behind HARTOS's gate.

Measured 2026-09-14 on an installed desktop: Nunba serves on 0.0.0.0:5000,
and a device on the same Wi-Fi could drive /chat and read /prompts with no
credential.  HARTOS's gate (security.middleware.install_api_gate) goes on
main.py's app when it is created, and app.py's dispatcher serves that app to
another machine only once the gate is confirmed on it (routes.auth.
app_for_caller).  Until then the caller gets gui_app's boot stubs.  This
machine's callers always get the full app.  All three servers (Hypercorn,
Waitress, the Flask dev server) serve the dispatcher.
"""
from __future__ import annotations

import ast
import os
import sys
import types

import pytest
from flask import Flask
from werkzeug.test import Client

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from routes.auth import app_for_caller, is_local_environ  # noqa: E402

LAN = {'REMOTE_ADDR': '192.168.0.50'}
LOOPBACK = {'REMOTE_ADDR': '127.0.0.1'}


@pytest.fixture(autouse=True)
def _plain_env(monkeypatch):
    for name in ('NUNBA_CI', 'TRUSTED_PROXY'):
        monkeypatch.delenv(name, raising=False)


def _full_app():
    app = Flask('full')
    app.add_url_rule('/chat', 'chat', lambda: 'full chat', methods=['GET', 'POST'])
    app.add_url_rule('/api/social/peers/health', 'peers', lambda: 'full peers')
    return app


def _boot_app():
    app = Flask('boot')
    app.add_url_rule('/chat', 'chat', lambda: 'loading', methods=['GET', 'POST'])
    return app


def _dispatch(full, boot):
    """The dispatcher app.py serves, built on the same rule."""
    def wsgi(environ, start_response):
        return app_for_caller(environ, full, boot)(environ, start_response)
    return wsgi


def _get(wsgi, path, environ_base):
    return Client(wsgi).get(path, environ_base=environ_base)


def test_the_boot_app_serves_until_the_full_app_exists():
    boot = _boot_app()
    assert app_for_caller(LOOPBACK, None, boot) is boot
    assert app_for_caller(LAN, None, boot) is boot


def test_this_machine_gets_the_full_app_gate_or_not():
    full, boot = _full_app(), _boot_app()
    assert app_for_caller(LOOPBACK, full, boot) is full
    assert _get(_dispatch(full, boot), '/chat', LOOPBACK).get_data(as_text=True) == 'full chat'


def test_another_machine_gets_the_stubs_until_the_gate_is_on():
    full, boot = _full_app(), _boot_app()
    assert app_for_caller(LAN, full, boot) is boot
    assert _get(_dispatch(full, boot), '/chat', LAN).get_data(as_text=True) == 'loading'


def test_the_confirmed_gate_is_what_hands_it_over():
    full, boot = _full_app(), _boot_app()
    full._hartos_api_gate = True
    assert app_for_caller(LAN, full, boot) is full


def test_with_the_real_gate_peers_reach_the_full_app_and_chat_needs_a_credential(monkeypatch):
    middleware = pytest.importorskip('security.middleware')
    if not hasattr(middleware, 'install_api_gate'):
        pytest.skip('this HARTOS predates install_api_gate')
    monkeypatch.setenv('NUNBA_BUNDLED', '1')
    monkeypatch.delenv('HEVOLVE_API_KEY', raising=False)
    monkeypatch.setitem(sys.modules, 'security.secrets_manager',
                        types.SimpleNamespace(get_secret=lambda name: ''))
    full, boot = _full_app(), _boot_app()
    assert middleware.install_api_gate(full) is True
    wsgi = _dispatch(full, boot)
    peers = _get(wsgi, '/api/social/peers/health', LAN)
    assert peers.status_code == 200
    assert peers.get_data(as_text=True) == 'full peers'
    assert _get(wsgi, '/chat', LAN).status_code == 401
    assert _get(wsgi, '/chat', LOOPBACK).get_data(as_text=True) == 'full chat'


@pytest.mark.parametrize('environ, trusted_proxy, ci, local', [
    ({'REMOTE_ADDR': '127.0.0.1'}, '', '', True),
    ({'REMOTE_ADDR': '::1'}, '', '', True),
    ({'REMOTE_ADDR': '192.168.0.50'}, '', '', False),
    ({'REMOTE_ADDR': '192.168.0.50', 'HTTP_X_FORWARDED_FOR': '127.0.0.1'}, '', '', False),
    ({'REMOTE_ADDR': '10.0.0.1', 'HTTP_X_FORWARDED_FOR': '127.0.0.1'}, '10.0.0.1', '', True),
    ({'REMOTE_ADDR': '10.0.0.1', 'HTTP_X_FORWARDED_FOR': '8.8.8.8'}, '10.0.0.1', '', False),
    ({'REMOTE_ADDR': '192.168.0.50'}, '', '1', True),
])
def test_the_dispatcher_and_the_decorator_share_one_loopback_rule(
        monkeypatch, environ, trusted_proxy, ci, local):
    if trusted_proxy:
        monkeypatch.setenv('TRUSTED_PROXY', trusted_proxy)
    if ci:
        monkeypatch.setenv('NUNBA_CI', ci)
    from routes.auth import _is_local_request
    assert is_local_environ(environ) is local
    base = dict(environ)
    headers = {}
    forwarded = base.pop('HTTP_X_FORWARDED_FOR', None)
    if forwarded:
        headers['X-Forwarded-For'] = forwarded
    with Flask('probe').test_request_context('/', environ_base=base, headers=headers):
        assert _is_local_request() is local


def _tree(name):
    with open(os.path.join(PROJECT_ROOT, name), encoding='utf-8') as f:
        return ast.parse(f.read())


def _call_name(node):
    func = node.func
    return func.attr if isinstance(func, ast.Attribute) else getattr(func, 'id', None)


def test_every_server_serves_the_dispatcher():
    """Source guard: app.py's three servers (Hypercorn through build_asgi_app,
    Waitress, the Flask dev server) all serve _wsgi_target, _wsgi_target is
    always the dispatcher, and the dispatcher decides through app_for_caller.
    A server handed flask_app directly would skip the rule tested above."""
    tree = _tree('app.py')
    targets = [n for n in ast.walk(tree) if isinstance(n, ast.Assign)
               and any(getattr(t, 'id', None) == '_wsgi_target' for t in n.targets)]
    assert targets
    assert all(getattr(n.value, 'id', None) == '_dynamic_wsgi_app' for n in targets)
    calls = [n for n in ast.walk(tree) if isinstance(n, ast.Call)]
    for server in ('build_asgi_app', '_serve', 'run_simple'):
        assert any(_call_name(c) == server
                   and any(getattr(a, 'id', None) == '_wsgi_target' for a in c.args)
                   for c in calls), f'{server} does not serve the dispatcher'
    assert not any(_call_name(c) == 'run' and isinstance(c.func, ast.Attribute)
                   and getattr(c.func.value, 'id', None) in ('_serving_app', 'flask_app', 'gui_app')
                   for c in calls), 'a Flask app is served directly'
    dispatcher = next(n for n in ast.walk(tree)
                      if isinstance(n, ast.FunctionDef) and n.name == '_dynamic_wsgi_app')
    assert any(isinstance(n, ast.Call) and _call_name(n) == 'app_for_caller'
               for n in ast.walk(dispatcher))


def test_main_puts_the_gate_on_its_app_when_it_is_created():
    """Source guard: the statement after main.py's `app = Flask(...)` installs
    the gate, before anything can register a route or serve a request."""
    body = _tree('main.py').body
    created = next(i for i, n in enumerate(body)
                   if isinstance(n, ast.Assign)
                   and any(getattr(t, 'id', None) == 'app' for t in n.targets)
                   and isinstance(n.value, ast.Call) and _call_name(n.value) == 'Flask')
    following = body[created + 1]
    assert any(isinstance(n, ast.Call) and _call_name(n) == 'install_api_gate'
               for n in ast.walk(following))
