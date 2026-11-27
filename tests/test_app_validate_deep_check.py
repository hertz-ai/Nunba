""""Regression guard for app.py --validate deep-health check.

Background: validator's deep check verifies Tier-1 LangChain pipeline
loaded by reading `routes.hartos_backend_adapter._hartos_backend_available`
and `_active_tier`.  At runtime these flip to True / 'Tier-1...' from a
background thread spawned by `main.py._deferred_social_init`, but in
--validate mode main.py never runs; the trigger has to fire synchronously
or the check sees the module-import defaults (False / 'unknown') and
falsely reports "Tier-1 failed to load".

History (the bug we're guarding against returning):
  Apr 25 — torch warning fired → SKIP path activated → false PASS
  Apr 26 commit e4bae07b — Tier-1 lazy init introduced; deep check
                            never triggered it; SKIP still hid the bug
  Apr 27 commit 5e4f3fe0 + Apr 28 packages_distributions monkey-patch
                          — both warning sources eliminated; SKIP no
                            longer fires; broken deep check fully
                            exposed (validate FAILED on every build)
  Fix — synchronous `_attempt_hartos_init()` call inside the deep
        check loop, BEFORE the attribute reads.

Test mode: AST + text scan on app.py.  We cannot exec --validate without
a frozen bundle; static guards are the right shape here.  The build-gate
class at the end instead runs app.py's real deep-check block, taken out by
AST, against the HARTOS this process imports.
"""
import ast
import os

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
APP_PY = os.path.join(PROJECT_ROOT, 'app.py')


@pytest.fixture(scope='module')
def app_source():
    with open(APP_PY, encoding='utf-8') as f:
        return f.read()


@pytest.fixture(scope='module')
def app_ast(app_source):
    return ast.parse(app_source)


class TestDeepCheckTriggersTier1Init:
    """`--validate` deep check must call _attempt_hartos_init synchronously."""

    def test_deep_checks_dict_present(self, app_source):
        # Sanity: the deep-checks block exists at all.
        assert "_deep_checks = {" in app_source, \
            "deep-checks dict missing from app.py — has the validator been refactored?"
        assert "'routes.hartos_backend_adapter'" in app_source, \
            "routes.hartos_backend_adapter check missing from _deep_checks"

    def test_attempt_hartos_init_called_in_deep_check(self, app_source):
        # The trigger must appear AFTER the _deep_checks dict and BEFORE
        # the Phase 3 (config file checks) section — i.e., inside the
        # deep-check loop body.
        deep_check_start = app_source.find("_deep_checks = {")
        config_check_start = app_source.find("Phase 3: Config file checks")
        assert deep_check_start > 0
        assert config_check_start > deep_check_start, \
            "Phase 3 marker missing — has the validator structure changed?"

        deep_check_block = app_source[deep_check_start:config_check_start]
        assert "_attempt_hartos_init" in deep_check_block, (
            "Deep check no longer calls _attempt_hartos_init synchronously. "
            "Without it, _hartos_backend_available stays at its module-import "
            "default (False) in --validate mode and the check falsely fails. "
            "See app.py around the `for _mod_name, _checks in _deep_checks` "
            "loop."
        )

    def test_attempt_hartos_init_called_via_getattr(self, app_source):
        # We use `getattr(_mod_obj, '_attempt_hartos_init', None)` so the
        # check is robust if the adapter ever renames the function.  The
        # test also enforces this defensive pattern (vs hard-coded import)
        # so a refactor that drops the getattr will be caught.
        deep_check_start = app_source.find("_deep_checks = {")
        config_check_start = app_source.find("Phase 3: Config file checks")
        deep_check_block = app_source[deep_check_start:config_check_start]
        assert "getattr(_mod_obj, '_attempt_hartos_init'" in deep_check_block, (
            "Deep check should look up _attempt_hartos_init via getattr "
            "(defensive against future adapter rename)."
        )

    def test_trigger_call_precedes_attribute_check(self, app_ast):
        """The trigger call must execute BEFORE the attribute-check loop.

        Otherwise the attribute reads happen against the unmodified
        (False / 'unknown') module state and the check still fails.
        """
        # Find the validate-mode Module node — it's at module-level inside
        # an `if getattr(args, 'validate', ...)` guard.  Walk the AST to
        # find the for-loop body that iterates `_deep_checks`.
        target_for = None
        for node in ast.walk(app_ast):
            if isinstance(node, ast.For):
                # Look for `for _mod_name, _checks in _deep_checks.items():`
                if (isinstance(node.target, ast.Tuple) and
                        all(isinstance(t, ast.Name) for t in node.target.elts) and
                        [t.id for t in node.target.elts] == ['_mod_name', '_checks'] and
                        isinstance(node.iter, ast.Call) and
                        isinstance(node.iter.func, ast.Attribute) and
                        node.iter.func.attr == 'items' and
                        isinstance(node.iter.func.value, ast.Name) and
                        node.iter.func.value.id == '_deep_checks'):
                    target_for = node
                    break
        assert target_for is not None, \
            "Could not locate `for _mod_name, _checks in _deep_checks.items()` loop"

        # Within the for body, find the inner for-loop that iterates _checks
        # (that's the attribute-check loop).  The trigger must come BEFORE it.
        trigger_lineno = None
        attr_loop_lineno = None
        for child in ast.walk(target_for):
            if (isinstance(child, ast.Call) and
                    isinstance(child.func, ast.Name) and
                    child.func.id == '_trigger'):
                if trigger_lineno is None or child.lineno < trigger_lineno:
                    trigger_lineno = child.lineno
            if (isinstance(child, ast.For) and
                    isinstance(child.target, ast.Tuple) and
                    all(isinstance(t, ast.Name) for t in child.target.elts) and
                    [t.id for t in child.target.elts] == ['_attr', '_expected', '_msg']):
                attr_loop_lineno = child.lineno

        assert trigger_lineno is not None, \
            "_trigger() call missing from deep-check loop body"
        assert attr_loop_lineno is not None, \
            "Attribute-check inner loop missing"
        assert trigger_lineno < attr_loop_lineno, (
            f"_trigger() at line {trigger_lineno} must execute BEFORE the "
            f"attribute-check loop at line {attr_loop_lineno}; otherwise "
            "_hartos_backend_available is read before the lazy init runs."
        )


SYNC_ENGINE = 'integrations.social.sync_engine'
RECIPE_SYNC = 'core.recipe_sync'
#: The HARTOS modules the cloud-agent path imports names from, unguarded.
CLOUD_PATH_MODULES = (SYNC_ENGINE, RECIPE_SYNC)


def _names_the_chat_route_imports_from(module):
    """The names routes/chatbot_routes.py imports from ``module``."""
    with open(os.path.join(PROJECT_ROOT, 'routes', 'chatbot_routes.py'),
              encoding='utf-8') as f:
        routes = ast.parse(f.read())
    return sorted({alias.name for node in ast.walk(routes)
                   if isinstance(node, ast.ImportFrom)
                   and node.module == module for alias in node.names})


class TestTheCloudAgentRuleIsABuildGate:
    """routes/chatbot_routes.py's cloud-agent rule (_cloud_turn_can_reach_
    central) imports HARTOS's central-origin rule by name, unguarded
    (first-party HARTOS imports are never try/except-degraded).  A bundled
    HARTOS without it would fail every signed-in cloud-agent turn, so
    --validate must fail that bundle.

    Behavioural: this runs app.py's REAL deep-check block (the _TORCH_HINT
    and _deep_checks assignments and the loop over _deep_checks, taken from
    app.py by AST, run as --validate runs them; review rv_e619's probe)
    against the HARTOS this process imports.  With every name the route
    imports from sync_engine and recipe_sync (the cloud-agent rule and the
    pull that runs a central agent here first) it records no failure for
    them; with any one of them missing it records one, and --validate exits
    1 on any."""

    @pytest.fixture
    def deep_check(self, app_ast, monkeypatch):
        import importlib
        import sys
        import types
        parts = {}
        for node in ast.walk(app_ast):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id in (
                            '_TORCH_HINT', '_deep_checks'):
                        parts[target.id] = node
            if (isinstance(node, ast.For) and isinstance(node.iter, ast.Call)
                    and isinstance(node.iter.func, ast.Attribute)
                    and isinstance(node.iter.func.value, ast.Name)
                    and node.iter.func.value.id == '_deep_checks'):
                parts['loop'] = node
        assert set(parts) == {'_TORCH_HINT', '_deep_checks', 'loop'}, \
            'the deep-check block of app.py --validate moved'
        code = compile(ast.Module(body=[parts['_TORCH_HINT'],
                                        parts['_deep_checks'], parts['loop']],
                                  type_ignores=[]),
                       'app.py[deep-check]', 'exec')
        # The adapter's own check is not under test: a stand-in that passes.
        adapter = types.ModuleType('routes.hartos_backend_adapter')
        adapter._hartos_backend_available = True
        adapter._active_tier = 'Tier-1 (stand-in)'
        monkeypatch.setitem(sys.modules, 'routes.hartos_backend_adapter',
                            adapter)
        if 'HEVOLVE_DB_PATH' not in os.environ:
            monkeypatch.setenv('HEVOLVE_DB_PATH', ':memory:')

        def run():
            ns = {'sys': sys, 'importlib': importlib, '_fail': [], '_warn': [],
                  '_vprint': lambda _line: None}
            exec(code, ns)
            return [(mod, why) for mod, why in ns['_fail']
                    if mod in CLOUD_PATH_MODULES]
        return run

    def test_the_route_imports_the_rules(self):
        assert 'central_origin_mismatch' in \
            _names_the_chat_route_imports_from(SYNC_ENGINE)
        assert 'pull_recipe' in _names_the_chat_route_imports_from(RECIPE_SYNC)

    def test_a_hartos_with_the_rules_passes_validate(self, deep_check):
        assert deep_check() == []

    @pytest.mark.parametrize('module, name', [
        (module, name) for module in CLOUD_PATH_MODULES
        for name in _names_the_chat_route_imports_from(module)])
    def test_a_hartos_without_a_name_the_route_imports_fails_validate(
            self, deep_check, monkeypatch, module, name):
        import importlib
        monkeypatch.delattr(importlib.import_module(module), name)
        failures = deep_check()
        assert any(mod == module and name in why for mod, why in failures), \
            f'--validate passed a HARTOS without {module}.{name}'
