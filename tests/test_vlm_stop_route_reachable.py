"""The VLM stop route must be REACHABLE on the app that serves :5000.

LIVE-PROVEN BROKEN 2026-09-10 11:44.  With a VLM computer-use loop actively
driving the desktop (54 alt+f4 that day), the designed stop was issued and
did nothing:

    POST /api/vlm/stop {"user_id": "..."}
      -> {"error": "API endpoint not found", "path": "/api/vlm/stop"}   404
    GET  /indicator/stop
      -> {"success": false, "status": "indicator hidden but stop request failed"}

/indicator/stop -> call_stop_api() -> POSTs http://localhost:5000/api/vlm/stop,
which 404s, so Nunba's own Stop AI Control button reports failure and the loop
keeps running.  The only remaining actuator was killing Nunba.exe.

THE ROUTE IS NOT MISSING FROM THE BUILD -- IT IS UNREGISTERED.
hart_intelligence_entry.py:10497 declares @app.route('/api/vlm/stop'), and the
string is byte-present in BOTH installed copies (python-embed .py and lib
.pyc).  But HARTOS declares it on ITS OWN Flask app, and the desktop topology
never mounts that app into the one serving :5000.  Nothing listens on :5001 or
:6777 either.  Same family as the recorded "/api/settings/compute 404s locally
-- blueprint not mounted in desktop topology".

THE STOP MACHINERY IS FINE; ONLY THE DOOR WAS MISSING:
    local_loop.py:148  _vlm_stop_flags   {user_id:prompt_id -> Event}
    local_loop.py:181  _is_stop_requested()   checked every loop iteration
    local_loop.py:190  request_stop()  "Public API - called by /api/vlm/stop"
    local_loop.py:213  list_active_sessions()  for bulk stop

So the fix is a pass-through proxy in the SAME blueprint that already carries
/chat, /prompts, /zeroshot and /backend/health, dispatching through
_hevolve_app.test_client() exactly as chat() does -- the HARTOS handler keeps
ownership of user_id validation, prompt_id optionality and bulk enumeration.
No logic is duplicated here; a second implementation of "which sessions to
stop" is precisely the parallel path that must not exist.

    python -m pytest tests/test_vlm_stop_route_reachable.py -q
"""
import ast
import os

import pytest

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADAPTER = os.path.join(REPO, 'routes', 'hartos_backend_adapter.py')


def _adapter_src():
    with open(ADAPTER, encoding='utf-8', errors='replace') as fh:
        return fh.read()


def _proxy_blueprint_body():
    """Return the source of create_proxy_blueprint() only.

    Scoping to the function matters: asserting on the whole module would
    pass on any stray mention of the path in a comment or docstring, which
    is the vacuous-guard failure mode.
    """
    src = _adapter_src()
    tree = ast.parse(src)
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == 'create_proxy_blueprint':
            return ast.get_source_segment(src, node) or ''
    raise AssertionError('create_proxy_blueprint() not found in the adapter')


class TestTheStopRouteIsServed:

    def test_proxy_blueprint_declares_the_vlm_stop_route(self):
        body = _proxy_blueprint_body()
        assert '/api/vlm/stop' in body, (
            "the served blueprint has no /api/vlm/stop route, so Nunba's Stop "
            "AI Control button 404s and a desktop-driving agent cannot be "
            "stopped (live-proven 2026-09-10 11:44)")

    def test_it_accepts_POST(self):
        """call_stop_api() POSTs; a GET-only route would still 405."""
        body = _proxy_blueprint_body()
        idx = body.index('/api/vlm/stop')
        decorator = body[max(0, idx - 120): idx + 160]
        assert 'POST' in decorator, (
            f"route must accept POST -- call_stop_api() posts. Got: {decorator!r}")


def _stop_handler_code():
    """Source of the stop proxy WITH ITS DOCSTRING REMOVED.

    Stripping the docstring is load-bearing, and this test file learned it
    the hard way on its own first run: the handler's docstring necessarily
    NAMES list_active_sessions() to explain why the proxy must not
    reimplement it, so a raw substring scan failed on the very prose
    explaining the rule.  Identical to the lesson already recorded in
    HARTOS's finance-tag guard.  What matters is live CODE, not commentary.
    """
    src = _adapter_src()
    tree = ast.parse(src)
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == 'proxy_vlm_stop':
            body = list(node.body)
            if (body and isinstance(body[0], ast.Expr)
                    and isinstance(body[0].value, ast.Constant)
                    and isinstance(body[0].value.value, str)):
                body = body[1:]          # drop the docstring
            code = '\n'.join(ast.get_source_segment(src, s) or '' for s in body)
            # strip trailing '#' comments too -- same reason as the docstring
            return '\n'.join(ln.split('#', 1)[0] for ln in code.splitlines())
    raise AssertionError('proxy_vlm_stop() not found -- the route is missing')


class TestItDispatchesRatherThanReimplements:
    """A second copy of the stop logic is a parallel path (it would drift).

    The HARTOS handler owns user_id validation, optional prompt_id, and the
    bulk-stop enumeration.  The proxy must hand the request to it, not
    re-derive any of that.
    """

    def test_proxy_dispatches_into_the_hartos_app(self):
        assert 'test_client' in _stop_handler_code(), (
            "the stop proxy must dispatch into HARTOS's own route via "
            "test_client (the idiom chat() already uses at adapter.py:742), "
            "so the real handler runs")

    @pytest.mark.parametrize("forbidden", ['_vlm_stop_flags', 'list_active_sessions'])
    def test_proxy_does_not_reimplement_session_selection(self, forbidden):
        assert forbidden not in _stop_handler_code(), (
            f"{forbidden} appears in live proxy CODE (not merely in its "
            f"docstring) -- that is a SECOND implementation of which sessions "
            f"to stop, and it will drift from the HARTOS handler.")
