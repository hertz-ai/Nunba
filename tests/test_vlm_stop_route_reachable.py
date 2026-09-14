"""Stop AI Control must reach the stop handler, and understand its answer.

LIVE-PROVEN BROKEN 2026-09-10 11:44.  With a VLM computer-use loop driving the
desktop (54 alt+f4 that day), the designed stop did nothing:

    POST /api/vlm/stop {"user_id": "..."}
      -> {"error": "API endpoint not found", "path": "/api/vlm/stop"}   404
    GET  /indicator/stop
      -> {"success": false, "status": "indicator hidden but stop request failed"}

/indicator/stop -> call_stop_api() -> POST http://localhost:5000/api/vlm/stop.
HARTOS declares the route (hart_intelligence_entry.py vlm_stop) on ITS OWN
Flask app, which the desktop never mounts on :5000, so the route was in the
bundle and unreachable.  The stop machinery in local_loop.py was fine
(_vlm_stop_flags, _is_stop_requested, request_stop, list_active_sessions).

The door is now a row in routes/hartos_backend_adapter._INPROCESS_DISPATCH_ROUTES,
beside the scheduler's /time_agent and /visual_agent.  Whether it is served,
and to whom, is tested in tests/test_inprocess_dispatch_reachable.py, which
also replays the headers each call_stop_api really sends.  This file keeps
what is specific to the stop: the door does not choose sessions itself, and
call_stop_api understands the handler's answer.

    python -m pytest tests/test_vlm_stop_route_reachable.py -q
"""
import ast
import os
import re

import pytest

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADAPTER = os.path.join(REPO, 'routes', 'hartos_backend_adapter.py')


def _dispatch_code():
    """Source of create_inprocess_dispatch_blueprint() WITHOUT docstring or comments.

    Stripping them is load-bearing: the docstring names
    local_loop._vlm_stop_flags to explain why the door dispatches instead of
    forwarding over HTTP, and a raw substring scan fails on that prose.  What
    matters is live code.
    """
    with open(ADAPTER, encoding='utf-8', errors='replace') as fh:
        src = fh.read()
    for node in ast.walk(ast.parse(src)):
        if (isinstance(node, ast.FunctionDef)
                and node.name == 'create_inprocess_dispatch_blueprint'):
            body = list(node.body)
            if (body and isinstance(body[0], ast.Expr)
                    and isinstance(body[0].value, ast.Constant)
                    and isinstance(body[0].value.value, str)):
                body = body[1:]          # drop the docstring
            code = '\n'.join(ast.get_source_segment(src, s) or '' for s in body)
            return '\n'.join(ln.split('#', 1)[0] for ln in code.splitlines())
    raise AssertionError('create_inprocess_dispatch_blueprint() not found in the adapter')


class TestTheDoorDispatchesRatherThanReimplements:
    """A second copy of the stop logic is a parallel path (it would drift).

    The HARTOS handler owns user_id validation, optional prompt_id, and the
    bulk-stop enumeration.  The door hands the request to it.
    """

    def test_it_hands_the_request_to_the_hartos_app(self):
        assert 'test_client' in _dispatch_code(), (
            "the door must dispatch into HARTOS's own route via test_client "
            "(the idiom chat() uses in the same module), so the real handler runs")

    @pytest.mark.parametrize('forbidden', [
        '_vlm_stop_flags', 'list_active_sessions', 'request_stop'])
    def test_it_does_not_choose_sessions_itself(self, forbidden):
        assert forbidden not in _dispatch_code(), (
            f'{forbidden} appears in live door CODE (not merely its docstring) '
            f'-- that is a SECOND implementation of which sessions to stop, and '
            f'it will drift from the HARTOS handler.')


# The status values hart_intelligence_entry.vlm_stop ACTUALLY RETURNS.
#
# Pinned here rather than imported because this repo must be testable without
# the HARTOS tree on disk; TestTheAcceptedSetCoversWhatTheHandlerEmits
# re-derives it from HARTOS source when that tree IS findable, so a drift in
# the producer cannot sit undetected behind a stale constant.
#
# Source (HARTOS, hart_intelligence_entry.py, vlm_stop):
#     Response:
#         {"status": "stopped"|"no_active_session", "user_id", "prompt_id"}
#     ...
#     'status': 'stopped' if found else 'no_active_session',
HANDLER_EMITS = frozenset({'stopped', 'no_active_session'})


def _accepted_status_values():
    """The set call_stop_api() treats as success, read from live CODE.

    AST, not a substring scan: the branch is a multi-line
    ``result.get('status') in (...)`` and the surrounding comment names the
    same literals to explain them.  Matching the comment instead of the
    comparison is the docstring trap this file already records twice.
    """
    with open(os.path.join(REPO, 'main.py'), encoding='utf-8',
              errors='replace') as fh:
        src = fh.read()
    tree = ast.parse(src)
    for fn in ast.walk(tree):
        if not (isinstance(fn, ast.FunctionDef) and fn.name == 'call_stop_api'):
            continue
        for node in ast.walk(fn):
            if not (isinstance(node, ast.Compare) and node.ops
                    and isinstance(node.ops[0], ast.In)):
                continue
            # left must be the status read, not some other membership test
            left = node.left
            if not (isinstance(left, ast.Call)
                    and isinstance(left.func, ast.Attribute)
                    and left.func.attr == 'get'
                    and left.args
                    and isinstance(left.args[0], ast.Constant)
                    and left.args[0].value == 'status'):
                continue
            comp = node.comparators[0]
            if isinstance(comp, (ast.Tuple, ast.List, ast.Set)):
                return frozenset(
                    e.value for e in comp.elts
                    if isinstance(e, ast.Constant) and isinstance(e.value, str))
        raise AssertionError(
            "call_stop_api() has no `result.get('status') in (...)` test -- "
            'the success branch this guard protects has moved or gone')
    raise AssertionError('call_stop_api() not found in main.py')


class TestTheAcceptedSetCoversWhatTheHandlerEmits:
    """Reachability is not comprehension.

    The dispatch tests prove the DOOR works: the route is served, registered
    unconditionally, and dispatches instead of reimplementing.  Tests of that
    kind all passed on 2026-09-11 while the button was still broken, because
    call_stop_api accepted only ('success', 'warning') -- the retired cloud
    endpoint's vocabulary -- and the handler it now reaches answers 'stopped'
    / 'no_active_session'.  The request arrived, succeeded, and was reported to
    the user as a failure; indicator_window's "stopped" branch was unreachable.
    Fixed 2bf3540c.

    A reachability suite cannot catch that class at all.  This one asserts the
    two vocabularies meet.
    """

    def test_every_value_the_handler_emits_is_accepted(self):
        accepted = _accepted_status_values()
        missing = HANDLER_EMITS - accepted
        assert not missing, (
            f'call_stop_api() rejects {sorted(missing)}, which '
            f'hart_intelligence_entry.vlm_stop returns -- a successful stop '
            f'would be reported to the user as a failure. accepted={sorted(accepted)}')

    def test_the_legacy_cloud_values_are_still_accepted(self):
        """Not a tautology: it pins the non-bundled path against a narrowing fix.

        get_stop_api_url still resolves to the cloud endpoint when not
        bundled, so dropping these would break that topology silently.
        """
        accepted = _accepted_status_values()
        assert {'success', 'warning'} <= accepted, (
            f'the legacy cloud vocabulary was dropped; the non-bundled path '
            f'would regress. accepted={sorted(accepted)}')

    def test_the_pin_still_matches_hartos_when_that_tree_is_findable(self):
        """Best-effort drift check; skips where HARTOS is not on disk.

        Deliberately NOT the primary assertion -- a test that only runs when a
        sibling repo happens to be present is a test that silently stops
        running.  This one only catches the pin going stale.
        """
        hartos = os.environ.get('HARTOS_REPO') or os.path.join(
            os.path.dirname(REPO), 'HARTOS')
        entry = os.path.join(hartos, 'hart_intelligence_entry.py')
        if not os.path.isfile(entry):
            pytest.skip(f'HARTOS tree not found at {entry}')
        with open(entry, encoding='utf-8', errors='replace') as fh:
            src = fh.read()
        found = set(re.findall(
            r"'status':\s*'([a-z_]+)'\s+if\s+\w+\s+else\s+'([a-z_]+)'", src))
        emitted = {v for pair in found for v in pair}
        assert emitted, 'could not re-derive vlm_stop status values from HARTOS'
        assert HANDLER_EMITS <= emitted, (
            f'HANDLER_EMITS is stale: HARTOS now emits {sorted(emitted)}')
