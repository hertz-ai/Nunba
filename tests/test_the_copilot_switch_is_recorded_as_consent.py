"""Admin, Integrations, Claude Code: the copilot switch is the owner's consent
answer, and the page shows the switch as it is in force.

Measured on the owner's desktop: the copilot was switched off here on
2026-09-16.  POST /api/admin/mcp/enable called HARTOS set_copilot_enabled,
which writes one empty marker file and nothing else.  By 2026-11-22 the file
was gone and the copilot was on again.  The route now calls HARTOS
switch_copilot, which records the answer as a copilot_access consent row (the
marker follows it), and the GET puts a missing marker back before it reports.

main.py is not imported: importing it starts the app (and, outside the
pytest conftest, a real model server).  The two route functions are compiled
out of the file and run with the module names they use stubbed, the way
HARTOS tests run functions of its entry module.  The HARTOS functions they
call are recorded, so no switch on this computer is touched.

    python -m pytest tests/test_the_copilot_switch_is_recorded_as_consent.py -q
"""
import ast
import logging
import os
import sys
import tempfile
import types

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
# Never the real ~/.claude, whatever is imported below.
os.environ['CLAUDE_CONFIG_DIR'] = tempfile.mkdtemp(prefix='copilot_route_test_')

import pytest  # noqa: E402

ROUTES = ('admin_mcp_token_get', 'admin_mcp_enable')


def _routes(body=None):
    """The two route functions, without their decorators, on stubs."""
    src = open(os.path.join(ROOT, 'main.py'), encoding='utf-8').read()
    fns = [n for n in ast.parse(src).body
           if isinstance(n, ast.FunctionDef) and n.name in ROUTES]
    assert sorted(f.name for f in fns) == sorted(ROUTES)
    for fn in fns:
        fn.decorator_list = []
    request = types.SimpleNamespace(get_json=lambda force=False, silent=False: body)
    ns = {'request': request, 'jsonify': lambda payload: payload, 'logging': logging,
          '_MCP_CONFIG_URL': 'http://localhost:5000/api/mcp/local',
          '_mcp_config_snippet': lambda token: '{}'}
    exec(compile(ast.Module(body=fns, type_ignores=[]), 'main.py', 'exec'), ns)
    return ns


@pytest.fixture
def hartos(monkeypatch):
    """The HARTOS copilot module the routes import, as a recorder."""
    calls = []
    state = {'on': True, 'last_no_on_file': False}
    backend = types.ModuleType('integrations.coding_agent.claude_code_backend')

    def switch_copilot(enabled):
        calls.append(('switch_copilot', enabled))
        state['on'] = bool(enabled)
        return state['on']

    def set_copilot_enabled(enabled):
        calls.append(('set_copilot_enabled', enabled))
        state['on'] = bool(enabled)
        return state['on']

    def reconcile_copilot_switch(force=False):
        calls.append(('reconcile_copilot_switch',))
        if state['last_no_on_file']:
            state['on'] = False
        return state['last_no_on_file']

    def copilot_enabled():
        calls.append(('copilot_enabled',))
        return state['on']

    backend.switch_copilot = switch_copilot
    backend.set_copilot_enabled = set_copilot_enabled
    backend.reconcile_copilot_switch = reconcile_copilot_switch
    backend.copilot_enabled = copilot_enabled
    mcp = types.ModuleType('integrations.mcp')
    mcp.get_mcp_token = lambda: 'tok'
    for name, module in (('integrations', types.ModuleType('integrations')),
                         ('integrations.coding_agent',
                          types.ModuleType('integrations.coding_agent')),
                         ('integrations.coding_agent.claude_code_backend', backend),
                         ('integrations.mcp', mcp)):
        monkeypatch.setitem(sys.modules, name, module)
    return types.SimpleNamespace(calls=calls, state=state, backend=backend)


@pytest.mark.parametrize('wanted', [False, True])
def test_the_switch_goes_by_the_road_that_records_the_answer(hartos, wanted):
    answer = _routes({'enabled': wanted})['admin_mcp_enable']()
    assert ('switch_copilot', wanted) in hartos.calls, (
        f'the answer was not recorded as consent: {hartos.calls}')
    assert not [c for c in hartos.calls if c[0] == 'set_copilot_enabled'], (
        'the route flipped the marker alone')
    assert answer == {'success': True, 'enabled': wanted, 'pinned_by_env': False}


def test_a_switch_an_env_pin_holds_is_reported_as_before(hartos):
    hartos.backend.switch_copilot = lambda enabled: False
    answer = _routes({'enabled': True})['admin_mcp_enable']()
    assert answer == {'success': True, 'enabled': False, 'pinned_by_env': True}


def test_a_body_with_no_enabled_means_on_as_before(hartos):
    _routes({})['admin_mcp_enable']()
    _routes(None)['admin_mcp_enable']()
    assert [c for c in hartos.calls if c[0] == 'switch_copilot'] == [
        ('switch_copilot', True), ('switch_copilot', True)]


def test_the_page_is_shown_the_switch_after_a_missing_marker_is_put_back(hartos):
    """The owner's last answer is off and the marker is gone: the page must
    not show On."""
    hartos.state['last_no_on_file'] = True
    answer = _routes()['admin_mcp_token_get']()
    assert answer['enabled'] is False, 'the page showed On against the last answer'
    names = [c[0] for c in hartos.calls]
    assert 'reconcile_copilot_switch' in names, names
    assert names.index('reconcile_copilot_switch') < names.index('copilot_enabled')


def test_the_token_answer_keeps_its_keys(hartos):
    answer = _routes()['admin_mcp_token_get']()
    assert answer == {'token': 'tok', 'url': 'http://localhost:5000/api/mcp/local',
                      'config_snippet': '{}', 'enabled': True}
