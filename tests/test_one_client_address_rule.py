"""Nunba decides "is this caller this machine" with HARTOS's one rule.

Review of HARTOS 291e548df, F3: routes.auth.is_local_environ took the FIRST
X-Forwarded-For hop when TRUSTED_PROXY was set, so a client that wrote
'X-Forwarded-For: 127.0.0.1' through the proxy was this machine, and the
chat / kids-media user_id fallbacks read request.remote_addr themselves.
They now delegate to HARTOS core.auth_local (is_local_environ /
_is_local_request), which Nunba already imports for the CI rule.  The
cross-repo source guard lives in HARTOS
(tests/unit/test_one_client_address_rule.py).

Runs the real functions inside real Flask request contexts.
"""
from __future__ import annotations

import os
import sys

import pytest
from flask import Flask

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

PROXY = '10.0.0.1'


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.delenv('NUNBA_CI', raising=False)
    monkeypatch.setenv('TRUSTED_PROXY', PROXY)


@pytest.mark.parametrize('remote, xff, local', [
    ('127.0.0.1', '', True),
    ('::ffff:127.0.0.1', '', True),
    (PROXY, '127.0.0.1', False),                  # the first-hop spoof
    (PROXY, '127.0.0.1, 203.0.113.9', False),
    ('127.0.0.1', '203.0.113.9', False),          # a local proxy, remote client
])
def test_is_local_environ_is_hartos_rule(remote, xff, local):
    from routes.auth import is_local_environ
    environ = {'REMOTE_ADDR': remote}
    if xff:
        environ['HTTP_X_FORWARDED_FOR'] = xff
    assert is_local_environ(environ) is local


CASES = [
    ({'REMOTE_ADDR': '127.0.0.1'}, True),
    ({'REMOTE_ADDR': '::ffff:127.0.0.1'}, True),
    ({'REMOTE_ADDR': '127.0.0.1', 'HTTP_X_FORWARDED_FOR': '127.0.0.1'}, True),
    ({'REMOTE_ADDR': '127.0.0.1', 'HTTP_X_FORWARDED_FOR': '203.0.113.9, ::1'}, True),
    ({'REMOTE_ADDR': '127.0.0.1', 'HTTP_X_FORWARDED_FOR': '203.0.113.9'}, False),
    ({'REMOTE_ADDR': '127.0.0.1', 'HTTP_X_FORWARDED_FOR': '127.0.0.1, 203.0.113.9'}, False),
    ({'REMOTE_ADDR': PROXY, 'HTTP_X_FORWARDED_FOR': '127.0.0.1'}, False),
    ({'REMOTE_ADDR': '192.168.0.50', 'HTTP_X_FORWARDED_FOR': '127.0.0.1'}, False),
    ({'REMOTE_ADDR': '0.0.0.0'}, False),
    ({'REMOTE_ADDR': ''}, False),
]


@pytest.fixture
def old_hartos(monkeypatch):
    """The installed desktop's HARTOS: a core.auth_local without
    is_local_environ (measured 2026-09-27, md5 c4b060ce)."""
    import types
    old = types.ModuleType('core.auth_local')
    old.ci_trusts_every_caller = lambda: False
    monkeypatch.setitem(sys.modules, 'core.auth_local', old)
    return old


@pytest.mark.parametrize('environ, local', CASES)
def test_the_degraded_path_matches_the_rule(old_hartos, environ, local):
    """With the import failing, the fallback gives the SAME answer as the
    rule: it never grants local to a forwarded claim, and it still admits
    this machine behind a local reverse proxy."""
    from routes import auth
    assert auth.is_local_environ(dict(environ)) is local


@pytest.mark.parametrize('environ, local', CASES)
def test_the_rule_gives_the_same_answers(environ, local):
    from routes.auth import is_local_environ
    assert is_local_environ(dict(environ)) is local


def test_a_loopback_trusted_proxy_naming_no_client_is_not_local(old_hartos,
                                                                  monkeypatch):
    from routes import auth
    monkeypatch.setenv('TRUSTED_PROXY', '127.0.0.1')
    assert auth.is_local_environ({'REMOTE_ADDR': '127.0.0.1'}) is False


def test_source_guard_the_manifest_import_forwards_no_claimed_address():
    """The internal hub-install call carried X-Forwarded-For; with the lookup
    failing it would have been a loopback claim.  The outer route is already
    local-only, so the inner call forwards nothing."""
    import ast
    tree = ast.parse(open(os.path.join(PROJECT_ROOT, 'main.py'),
                          encoding='utf-8').read())
    fn = next(n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)
              and n.name == 'admin_models_manifest_import')
    consts = [n.value for n in ast.walk(fn) if isinstance(n, ast.Constant)]
    assert 'X-Forwarded-For' not in consts


@pytest.mark.parametrize('module, fn', [
    ('routes.chatbot_routes', '_get_user_id_from_auth'),
    ('routes.kids_media_routes', '_get_user_id_from_request'),
])
def test_the_user_id_fallback_is_for_this_machine_only(module, fn):
    import importlib
    get = getattr(importlib.import_module(module), fn)
    app = Flask(__name__)
    with app.test_request_context('/?user_id=alice',
                                  environ_base={'REMOTE_ADDR': PROXY},
                                  headers={'X-Forwarded-For': '127.0.0.1'}):
        assert get() is None
    with app.test_request_context('/?user_id=alice',
                                  environ_base={'REMOTE_ADDR': '127.0.0.1'}):
        assert get() == 'alice'


def test_a_mapped_loopback_trusted_proxy_is_still_that_proxy(old_hartos,
                                                               monkeypatch):
    """A dual-stack server reports the proxy as ::ffff:127.0.0.1; it is still
    the TRUSTED_PROXY 127.0.0.1 and names no client."""
    from routes import auth
    monkeypatch.setenv('TRUSTED_PROXY', '127.0.0.1')
    assert auth.is_local_environ({'REMOTE_ADDR': '::ffff:127.0.0.1'}) is False
