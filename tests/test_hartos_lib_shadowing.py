"""The frozen lib/hartos must not shadow the complete hartos package.

The hartos package ships TWICE in a frozen build: complete, as an
include_files copy at <root>/hartos/, and again as whatever cx_Freeze's static
tracing found, at lib/hartos/. lib/ is first on sys.path in a frozen app, so
the traced subset SHADOWS the complete copy. A module tracing missed is then
unreachable at runtime while its .py sits plainly on disk.

This shipped. Measured on the installed 2026-08-31 build (BUILD_SHA=677f544e):
20 modules in hartos/, 14 in lib/hartos/. hartos.lifecycle_hooks imported fine
(its .pyc was in lib/), while hartos.hartos_bootstrap raised "No module named
'hartos.hartos_bootstrap'" on all 6 retries on EVERY boot, because main.py
imports it lazily inside _start_hartos_bootstrap where tracing cannot see it.
bootstrap() never ran, so register_all_blueprints never ran, so every install
had zero HARTOS blueprints, an empty dashboard, and a 404 on /api/claude/v1
that silently disables the Claude Code EXPERT tier.

Nothing failed the build, because a lazily-imported module going missing is
invisible until runtime. These tests pin both halves of the fix: the explicit
includes, and the post-build gate that turns a recurrence into a build failure.

Runs standalone (`python tests/test_hartos_lib_shadowing.py`).
"""
import os
import re
import sys
import unittest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_FREEZE = os.path.join(_ROOT, 'scripts', 'setup_freeze_nunba.py')
_HARTOS = os.path.abspath(os.path.join(os.path.dirname(_ROOT), 'HARTOS'))

# Lazily imported (inside a function) or dynamically referenced, so cx_Freeze's
# static tracing cannot reach them and they MUST be declared explicitly.
REQUIRED_INCLUDES = {
    'hartos.hartos_bootstrap',       # load-bearing: gates every HARTOS blueprint
    'hartos.crossbar_server',
    'hartos.hartos_speech',
    'hartos.hartos_speech_stitch',
}


def _freeze_source():
    with open(_FREEZE, encoding='utf-8') as fh:
        return fh.read()


class TestExplicitIncludes(unittest.TestCase):

    def test_lazily_imported_hartos_modules_are_declared(self):
        src = _freeze_source()
        for mod in sorted(REQUIRED_INCLUDES):
            self.assertIn(
                f'"{mod}"', src,
                f'{mod} is not in build_exe_options["includes"]. cx_Freeze '
                f'cannot trace it, so it will be missing from lib/hartos and '
                f'unreachable at runtime.')

    def test_bootstrap_is_declared(self):
        """Called out separately: this one module gates every HARTOS blueprint,
        the agent dashboard, agent_engine, and the Claude Code endpoint."""
        self.assertIn('"hartos.hartos_bootstrap"', _freeze_source())


class TestPostBuildGate(unittest.TestCase):

    def test_gate_exists(self):
        src = _freeze_source()
        self.assertIn('_HARTOS_LIB_EXEMPT', src,
                      'the lib/hartos completeness gate is gone')
        self.assertIn('SHADOWS the complete hartos package', src)

    def test_gate_aborts_the_build(self):
        """A warning would let this ship again. It must exit non-zero."""
        src = _freeze_source()
        idx = src.index('SHADOWS the complete hartos package')
        self.assertIn('sys.exit(1)', src[idx:idx + 1600],
                      'the gate must fail the build, not just print')

    def test_exemptions_are_dev_only(self):
        """Exempting a runtime module would reintroduce the bug silently."""
        src = _freeze_source()
        block = src[src.index('_HARTOS_LIB_EXEMPT = {'):]
        block = block[:block.index('}')]
        exempt = set(re.findall(r"'([a-z_]+)'", block))
        self.assertEqual(exempt, {'run_debug', 'hart_cli'},
                         'only dev-only entry points may be exempt')


class TestGateLogic(unittest.TestCase):
    """The rule itself, independent of the build."""

    EXEMPT = {'run_debug', 'hart_cli'}

    def _shadowed(self, shipped, frozen):
        return sorted(set(shipped) - set(frozen) - self.EXEMPT)

    def test_detects_a_missing_module(self):
        self.assertEqual(
            self._shadowed(['helper', 'hartos_bootstrap'], ['helper']),
            ['hartos_bootstrap'])

    def test_complete_lib_passes(self):
        self.assertEqual(
            self._shadowed(['helper', 'hartos_bootstrap'],
                           ['helper', 'hartos_bootstrap']), [])

    def test_exempt_module_does_not_trip_the_gate(self):
        self.assertEqual(self._shadowed(['helper', 'run_debug'], ['helper']), [])

    def test_reproduces_the_shipped_regression(self):
        """The exact 2026-08-31 build state must be reported as a failure."""
        shipped = ['helper', 'lifecycle_hooks', 'hartos_bootstrap',
                   'crossbar_server', 'hartos_speech', 'hartos_speech_stitch',
                   'run_debug', 'hart_cli']
        frozen = ['helper', 'lifecycle_hooks']
        self.assertEqual(
            self._shadowed(shipped, frozen),
            ['crossbar_server', 'hartos_bootstrap',
             'hartos_speech', 'hartos_speech_stitch'])


class TestAgainstRealHartosTree(unittest.TestCase):

    @unittest.skipUnless(os.path.isdir(os.path.join(_HARTOS, 'hartos')),
                         'HARTOS sibling checkout not present')
    def test_required_includes_still_exist_upstream(self):
        """A declared include naming a deleted module would fail the freeze."""
        pkg = os.path.join(_HARTOS, 'hartos')
        for mod in sorted(REQUIRED_INCLUDES):
            name = mod.split('.', 1)[1]
            self.assertTrue(
                os.path.isfile(os.path.join(pkg, f'{name}.py')),
                f'{mod} is declared in includes but no longer exists in HARTOS')


if __name__ == '__main__':
    unittest.main(verbosity=2)
