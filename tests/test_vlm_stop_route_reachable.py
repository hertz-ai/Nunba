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
import re

import pytest

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADAPTER = os.path.join(REPO, 'routes', 'hartos_backend_adapter.py')


def _adapter_src():
    with open(ADAPTER, encoding='utf-8', errors='replace') as fh:
        return fh.read()


def _proxy_blueprint_body():
    """Return the source of create_vlm_control_blueprint() only.

    Scoping to the function matters: asserting on the whole module would
    pass on any stray mention of the path in a comment or docstring, which
    is the vacuous-guard failure mode.

    NOT create_proxy_blueprint().  The first attempt at this fix put the
    route there and it STILL 404'd live, because main.py mounts that
    blueprint only under ``if not HARTOS_BACKEND_DIRECT`` and this install
    runs direct.  Deployed, restarted, still 404 -- the reason
    TestRegistrationIsUnconditional below exists.
    """
    src = _adapter_src()
    tree = ast.parse(src)
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == 'create_vlm_control_blueprint':
            return ast.get_source_segment(src, node) or ''
    raise AssertionError('create_vlm_control_blueprint() not found in the adapter')


class TestRegistrationIsUnconditional:
    """Declaring a route is not serving it.

    This is the check whose absence made the first fix fail live: the route
    existed, deployed cleanly with a verified sentinel, and still 404'd
    because its blueprint was behind a mode guard that is False here.
    """

    def _main_src(self):
        with open(os.path.join(REPO, 'main.py'), encoding='utf-8',
                  errors='replace') as fh:
            return fh.read()

    def test_main_registers_the_vlm_control_blueprint(self):
        assert 'create_vlm_control_blueprint' in self._main_src(), (
            'main.py never registers the VLM control blueprint, so the route '
            'is declared but not served')

    def test_registration_is_not_behind_the_direct_mode_guard(self):
        """It must not sit inside `if not HARTOS_BACKEND_DIRECT`.

        Measured: that branch is False on this install, which is exactly how
        the route stayed 404 after a clean deploy.
        """
        src = self._main_src()
        guard = src.index('if not HARTOS_BACKEND_DIRECT')
        reg = src.index('create_vlm_control_blueprint(')
        block_end = src.index('\n# VLM run-control', guard)
        assert not (guard < reg < block_end), (
            'the VLM control blueprint is registered INSIDE the '
            '`if not HARTOS_BACKEND_DIRECT` branch -- it will not be served '
            'in direct mode, which is what this install runs')


class TestTheStopRouteIsServed:

    def test_proxy_blueprint_declares_the_vlm_stop_route(self):
        body = _proxy_blueprint_body()
        assert '/api/vlm/stop' in body, (
            "the served blueprint has no /api/vlm/stop route, so Nunba's Stop "
            "AI Control button 404s and a desktop-driving agent cannot be "
            "stopped (live-proven 2026-09-10 11:44)")

    def test_it_accepts_POST(self):
        """call_stop_api() POSTs; a GET-only route would still 405.

        Anchored on the @route DECORATOR, not the first occurrence of the
        path string.  The blueprint's docstring also names the path (to
        explain why it lives here), and matching that instead is the same
        docstring trap this file hit twice already.
        """
        body = _proxy_blueprint_body()
        m = re.search(r"@\w+\.route\(\s*'/api/vlm/stop'[^)]*\)", body)
        assert m, 'no @route decorator for /api/vlm/stop found in the blueprint'
        assert 'POST' in m.group(0), (
            f"route must accept POST -- call_stop_api() posts. Got: {m.group(0)!r}")


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

    Every other test in this file proves the DOOR exists: the route is
    declared, registered unconditionally, accepts POST, dispatches instead of
    reimplementing.  All of them passed on 2026-09-11 while the button was
    still broken, because call_stop_api accepted only ('success', 'warning')
    -- the retired cloud endpoint's vocabulary -- and the handler it now
    reaches answers 'stopped' / 'no_active_session'.  The request arrived,
    succeeded, and was reported to the user as a failure; indicator_window's
    "stopped" branch was unreachable.  Fixed 2bf3540c.

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
