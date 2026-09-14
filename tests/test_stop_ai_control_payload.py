"""Stop AI Control asks HARTOS to stop every screen-driving loop on this machine.

GET /indicator/stop (the indicator's Stop button and its right-click menu,
desktop/indicator_window.py) calls main.py's call_stop_api, the one producer
of the POST to /api/vlm/stop.  Each VLM loop registers under its agent's
creator and the payload named only the desktop owner, so another creator's
loop kept driving the mouse (live 2026-09-14, agent 88659566083).  HARTOS's
vlm_stop takes {"scope": "node"} from a caller on this machine
(HARTOS tests/unit/test_vlm_stop_node_scope.py).  user_id stays in the body
for a bundled HARTOS that predates the scope: that one answers a body with no
user_id with 400 "user_id required".

call_stop_api runs here from its own source with requests faked, because
importing main.py drags in the boot path (tests/test_storage_set_merge.py).
"""
import ast
import logging
import traceback
import types
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parent.parent
OWNER = 'd68c9dee-b324-4c04-86c4-1205a836957f'


def _call_stop_api_source():
    src = (REPO / 'main.py').read_text(encoding='utf-8')
    fns = [n for n in ast.walk(ast.parse(src))
           if isinstance(n, ast.FunctionDef) and n.name == 'call_stop_api']
    assert len(fns) == 1, f'expected one call_stop_api in main.py, found {len(fns)}'
    return ast.get_source_segment(src, fns[0])


class _Requests:
    """Records each POST body; answers like HARTOS's vlm_stop."""

    def __init__(self):
        self.bodies = []

    def post(self, url, **kw):
        self.bodies.append(kw.get('json'))
        return types.SimpleNamespace(status_code=200, text='',
                                     json=lambda: {'status': 'stopped'})


@pytest.fixture
def stop(monkeypatch):
    """stop(owner) -> (call_stop_api's result, the bodies it POSTed).

    owner is what desktop.guest_identity.get_desktop_owner_id returns, or an
    exception it raises.
    """
    from desktop import guest_identity

    def _stop(owner):
        def _owner():
            if isinstance(owner, Exception):
                raise owner
            return owner
        monkeypatch.setattr(guest_identity, 'get_desktop_owner_id', _owner)
        fake = _Requests()
        ns = {
            'logger': logging.getLogger('test_stop_ai_control_payload'),
            'traceback': traceback,
            'requests': fake,
            'args': types.SimpleNamespace(
                stop_api_url='http://127.0.0.1:5000/api/vlm/stop'),
        }
        exec(_call_stop_api_source(), ns)  # noqa: S102 -- main.py's own function
        return ns['call_stop_api'](), fake.bodies
    return _stop


def test_stop_asks_for_every_loop_on_this_machine(stop):
    """RED before the fix: the body was {"user_id": owner} alone."""
    ok, bodies = stop(OWNER)
    assert ok is True
    assert bodies == [{'scope': 'node', 'user_id': OWNER}]


@pytest.mark.parametrize('owner', [None, RuntimeError('identity unreadable')],
                         ids=['no-owner', 'owner-read-fails'])
def test_the_brake_does_not_depend_on_knowing_the_owner(stop, owner):
    """RED before the fix: both posted {}, which HARTOS answers with 400."""
    ok, bodies = stop(owner)
    assert ok is True
    assert bodies == [{'scope': 'node'}]
