"""/execute must refuse when it cannot reach the safety policy.

This route runs subprocess itself, and @require_local_or_token admits any
local process or token holder, so it cannot assume an upstream caller already
checked.  It calls HARTOS's canonical policy (integrations.vlm.safety) rather
than reimplementing it; the only question these tests pin is what happens when
that policy is UNREACHABLE.

Before this guard both gates were wrapped in `except ImportError: pass`.
ModuleNotFoundError subclasses ImportError, so one bundle that missed
integrations/ turned /execute into an ungated OS command runner.  The recovery
plan's Phase 1 is explicit: "An unavailable semantic agent must not become an
implicit allow."

Behavioural: the real Flask route through the real test client, with the
policy import forced to fail.  Nothing is executed -- each case must be
refused before subprocess is reached, which the spy asserts.
"""
import os
import sys

import pytest

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv('NUNBA_BUNDLED', '1')
    import main
    main.app.config['TESTING'] = True
    with main.app.test_client() as c:
        yield c, main


def _no_subprocess(monkeypatch, main):
    """Fail the test loudly if the route ever reaches an executor."""
    import subprocess

    def _boom(*a, **k):
        raise AssertionError('a refused command reached subprocess')

    for name in ('run', 'Popen', 'call', 'check_output'):
        monkeypatch.setattr(subprocess, name, _boom, raising=False)


def _break_policy_import(monkeypatch):
    """Make `from integrations.vlm.safety import ...` raise, as a bundle that
    shipped without integrations/ would."""
    import builtins
    real_import = builtins.__import__

    def fake_import(name, *a, **k):
        if name.startswith('integrations.vlm.safety'):
            raise ModuleNotFoundError("No module named 'integrations.vlm.safety'")
        return real_import(name, *a, **k)

    monkeypatch.setattr(builtins, '__import__', fake_import)


def test_a_missing_safety_policy_refuses_instead_of_executing(client, monkeypatch):
    c, main = client
    _no_subprocess(monkeypatch, main)
    _break_policy_import(monkeypatch)

    resp = c.post('/execute', json={'command': 'shutdown.exe /s /t 0', 'shell': True})

    assert resp.status_code == 403, 'an unreachable policy must not be an allow'
    body = resp.get_json()
    assert body['status'] == 'blocked'
    assert body['exit_reason'] == 'safety_policy_unavailable'


def test_a_benign_command_is_also_refused_when_the_policy_is_gone(client, monkeypatch):
    """Fail-closed means closed: we cannot tell benign from destructive
    without the policy, so nothing runs."""
    c, main = client
    _no_subprocess(monkeypatch, main)
    _break_policy_import(monkeypatch)

    resp = c.post('/execute', json={'command': 'echo hello', 'shell': True})
    assert resp.status_code == 403
    assert resp.get_json()['exit_reason'] == 'safety_policy_unavailable'


def test_the_policy_still_blocks_a_destructive_command_normally(client, monkeypatch):
    """The guard must not have broken the ordinary path it protects."""
    pytest.importorskip('integrations.vlm.safety')
    c, main = client
    _no_subprocess(monkeypatch, main)

    resp = c.post('/execute', json={'command': 'shutdown.exe /s /t 0', 'shell': True})
    assert resp.status_code == 403
    assert resp.get_json()['exit_reason'] == 'destructive_operation'
