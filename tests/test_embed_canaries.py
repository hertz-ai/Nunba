"""The python-embed verification gate must actually verify hart-backend.

Observed 2026-08-19 on a full scratch rebuild (python-embed deleted, rebuilt
from zero).  Step 8 is documented as a "hard gate - atomic swap only on full
pass" and it did check torch, torch._C, transformers and four hevolveai
modules.  The hart-backend check, however, ran:

    python.exe -c "import hartos_backend; print('hart-backend OK')"
    FAILED: ModuleNotFoundError: No module named 'hartos_backend'
    WARN (non-critical): hart-backend import

`hartos_backend` is not a module and never was.  It is the SOURCE DIRECTORY
name -- rebuild_python_embed.py:76 defines
HARTOS_BACKEND_SRC = .../hartos_backend_src.  The distribution is
`hart-backend`, whose top_level.txt ships core, agent_identity, agent_ledger,
create_recipe, hart_intelligence, hart_intelligence_entry, hartos_bootstrap...
-- no `hartos_backend` at any point.

So the check raised on EVERY build, was demoted to a warning, and verified
nothing.  The largest and most import-fragile dependency in the bundle was the
one thing the hard gate did not cover.  Two independent faults kept it hidden:

  1. a module name that can never resolve, and
  2. `critical=False` hardcoded, rather than the flag-driven form the
     hevolveai canaries use ("the single source of truth ... so the
     install-skip / canary-skip can never drift apart").

Fault 2 is what made fault 1 survive: a canary that cannot pass AND cannot
fail the build is indistinguishable from one that is merely being lenient.
"""
import os
import re
import subprocess
import sys
import unittest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_REBUILD = os.path.join(_ROOT, 'scripts', 'rebuild_python_embed.py')

# hart-backend's real top-level modules, from its top_level.txt.  Any of these
# is a legitimate canary; `hartos_backend` is not among them and never was.
_REAL_TOP_LEVEL = {
    # Post 2026-08-30: the flat implementation modules moved into the
    # hartos/ package; top_level.txt is the authority for this set.
    'agent_ledger', 'asgi', 'core', 'embedded_main',
    'hart_intelligence', 'hart_intelligence_entry',
    'hart_sdk', 'hart_version', 'hartos', 'integrations', 'security',
}


def _source():
    with open(_REBUILD, encoding='utf-8') as fh:
        return fh.read()


def _hart_canary_block(src):
    """The _verify(...) call for the hart-backend canary, comments stripped."""
    start = src.index('_verify("hart-backend import"')
    end = src.index('\n', src.index('critical=', start))
    return src[start:end]


def _canary_code():
    """The -c code step 8 actually runs (HART_BACKEND_CANARY), imported, not scraped."""
    if _ROOT not in sys.path:
        sys.path.insert(0, _ROOT)
    from scripts.rebuild_python_embed import HART_BACKEND_CANARY
    return HART_BACKEND_CANARY


class TestHartBackendCanaryIsReal(unittest.TestCase):

    def test_canary_does_not_import_the_source_directory_name(self):
        """`hartos_backend` is HARTOS_BACKEND_SRC's basename, not a module."""
        code = _canary_code()
        self.assertNotIn(
            'import hartos_backend', code,
            'the hart-backend canary imports `hartos_backend`, which is the '
            'source-directory name (hartos_backend_src), not a module -- it '
            'raises ModuleNotFoundError on every build and verifies nothing')

    def test_canary_imports_a_real_top_level_module(self):
        m = re.search(r'import\s+([A-Za-z_][A-Za-z0-9_]*)', _canary_code())
        self.assertIsNotNone(m, 'no import found in the hart-backend canary')
        mod = m.group(1)
        self.assertIn(
            mod, _REAL_TOP_LEVEL,
            f'canary imports {mod!r}, which is not a hart-backend top-level '
            f'module; pick one of: {sorted(_REAL_TOP_LEVEL)}')

    def test_canary_does_not_import_the_heavy_entry_point(self):
        """hart_intelligence starts VisionService and binds a socket.

        Measured 2026-08-19: importing it spawns VisionService and attempts
        `bind on 0.0.0.0:5460`.  A build-time canary must not have runtime
        side effects, so these two names are excluded even though both ARE
        real top-level modules.
        """
        self.assertNotIn('hart_intelligence', _canary_code())

    def test_criticality_is_flag_driven_not_a_constant(self):
        """A canary that can never fail the build cannot guard it.

        The hevolveai canaries use critical=<installed flag>; hart-backend
        hardcoded critical=False, so its impossible import stayed a warning
        for as long as it existed.
        """
        block = _hart_canary_block(_source())
        self.assertNotIn(
            'critical=False', block,
            'hart-backend canary hardcodes critical=False, so it can never '
            'fail the swap -- mirror the hevolveai pattern and gate on '
            'whether step 7b actually installed it')
        self.assertIn('critical=_hart_backend_installed', block)

    def test_step_8_runs_the_constant(self):
        """The checks above read HART_BACKEND_CANARY; this ties it to step 8."""
        self.assertIn('HART_BACKEND_CANARY', _hart_canary_block(_source()))

    def test_install_step_sets_the_flag_on_both_paths(self):
        """The flag must be False when 7b skips and True when it installs."""
        src = _source()
        start = src.index('step("7b. Installing hart-backend")')
        end = src.index('7c.', start)
        block = src[start:end]
        self.assertIn('_hart_backend_installed = False', block)
        self.assertIn('_hart_backend_installed = True', block)
        # the True assignment must be inside the install branch, i.e. after
        # the pip call, not unconditionally at the top
        self.assertLess(block.index('_hart_backend_installed = False'),
                        block.index('_hart_backend_installed = True'))


# ── The canary, run exactly as step 8 runs it, against layouts on disk ──
# Found 2026-09-14: `import core` alone passed an April (pre-08-30) install,
# because core/ predates the move. These run the real HART_BACKEND_CANARY in
# a bare interpreter (-S: no site-packages, no editable finders) whose only
# path is a site-packages tree built for the test.

def _run_canary(site_packages):
    env = {k: v for k, v in os.environ.items() if k not in ('PYTHONPATH', 'PYTHONHOME')}
    env.update(PYTHONPATH=str(site_packages), PYTHONNOUSERSITE='1')
    return subprocess.run([sys.executable, '-S', '-c', _canary_code()],
                          cwd=str(site_packages), env=env,
                          capture_output=True, text=True, timeout=60)


def _layout(root, *files):
    for rel in files:
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('')
    return root


def test_the_canary_passes_the_current_layout(tmp_path):
    result = _run_canary(_layout(tmp_path, 'core/__init__.py', 'hartos/__init__.py'))
    assert result.returncode == 0, result.stderr
    assert 'post-08-30 layout' in result.stdout


def test_the_canary_fails_the_april_flat_layout(tmp_path):
    """gpt4.1 at 3e9d4d2: core/ and flat root modules, no hartos/ package."""
    result = _run_canary(_layout(tmp_path, 'core/__init__.py', 'create_recipe.py'))
    assert result.returncode != 0


def test_the_canary_fails_flat_leftovers_beside_the_new_package(tmp_path):
    """The embed installed on 2026-09-14: hartos/ AND stale root copies."""
    result = _run_canary(_layout(tmp_path, 'core/__init__.py', 'hartos/__init__.py',
                                 'create_recipe.py'))
    assert result.returncode != 0
    assert 'flat layout' in result.stderr


if __name__ == '__main__':
    unittest.main()
