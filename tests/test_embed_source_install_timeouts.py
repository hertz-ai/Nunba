"""The two source-tree pip installs must get the heavy-install timeout.

MEASURED 2026-08-20.  A full build aborted here:

    Building wheel for hart-backend (pyproject.toml): still running...
    FATAL: TimeoutExpired: ... timed out after 120.0 seconds
    Rebuild ABORTED - atomic swap NOT performed.

Timed standalone on a quiescent box the same install is 84s (rc=0, wheel
8.74 MB) -- so 120s left a 36-SECOND margin.  Step 7a/7b run immediately
after ~1.5 GB of package writes plus the hevolveai Cython rebuild, with
the OS scanner walking every new file, and that margin does not survive
it.  Both wheels are built FROM A SOURCE TREE (pip must build a wheel,
not unpack one), which is the slowest install shape in the whole script.

Why 600 and not some new number: rebuild_python_embed.py already uses
timeout=600 for every other heavy install (the torch/embed/tts wheel
installs).  These two were the only heavy steps left at 120 -- so this
adopts the file's OWN existing convention rather than inventing a
constant.  hevolveai (7a) has the identical defect and only passed on
2026-08-20 because its wheel is 1.15 MB against hart-backend's 8.74 MB;
fixing one and leaving the twin would just move the outage.

The failure mode is why this is guarded: a timeout here is not a slow
build, it is a HARD ABORT that ships nothing.
"""
import ast
import os
import unittest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_SCRIPT = os.path.join(_ROOT, 'scripts', 'rebuild_python_embed.py')

# The value the script already uses for its other heavy installs.
HEAVY_INSTALL_TIMEOUT = 600


def _source_tree_pip_installs():
    """Every run([...pip install <src>...], timeout=N) call in the script.

    A source-tree install is one whose install target is a NAME (the
    resolved source dir variable), not a string literal package spec --
    that is exactly what makes pip build a wheel instead of fetching one.
    Returns [(lineno, timeout_or_None, target_name)].
    """
    with open(_SCRIPT, encoding='utf-8') as fh:
        tree = ast.parse(fh.read(), filename=_SCRIPT)

    found = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        if not (isinstance(node.func, ast.Name) and node.func.id == 'run'):
            continue
        if not node.args or not isinstance(node.args[0], ast.List):
            continue
        parts = node.args[0].elts
        literals = [e.value for e in parts
                    if isinstance(e, ast.Constant) and isinstance(e.value, str)]
        if 'pip' not in literals or 'install' not in literals:
            continue
        # elts[0] is ALWAYS the interpreter -- exclude it BY POSITION, not
        # by name.  Matching on the name 'python_exe' let line 522 through
        # as a false positive: there the interpreter is `venv_python` and
        # the real targets are the literals "cython"/"setuptools"/"wheel",
        # i.e. ordinary PyPI wheels on a 180s timeout, not a source build.
        targets = [e.id for e in parts[1:] if isinstance(e, ast.Name)]
        if not targets:
            continue
        timeout = None
        for kw in node.keywords:
            if kw.arg == 'timeout' and isinstance(kw.value, ast.Constant):
                timeout = kw.value.value
        found.append((node.lineno, timeout, targets[0]))
    return found


class TestSourceTreeInstallTimeouts(unittest.TestCase):

    def test_both_source_installs_are_discovered(self):
        """Guard the guard -- if the AST walk finds nothing it proves nothing."""
        calls = _source_tree_pip_installs()
        self.assertGreaterEqual(
            len(calls), 2,
            'expected the hevolveai (7a) and hart-backend (7b) source '
            f'installs; AST found {calls!r}')

    def test_every_source_install_gets_the_heavy_timeout(self):
        for lineno, timeout, target in _source_tree_pip_installs():
            with self.subTest(line=lineno, target=target):
                self.assertIsNotNone(
                    timeout,
                    f'{_SCRIPT}:{lineno} pip install {target} has no timeout')
                self.assertGreaterEqual(
                    timeout, HEAVY_INSTALL_TIMEOUT,
                    f'{_SCRIPT}:{lineno} installs {target} from a source '
                    f'tree with timeout={timeout}. Measured 84s idle, but it '
                    f'runs after ~1.5 GB of writes + a Cython rebuild and '
                    f'exceeded 120s on 2026-08-20, hard-aborting the build. '
                    f'Use {HEAVY_INSTALL_TIMEOUT} like the other heavy '
                    f'installs in this file.')

    def test_heavy_timeout_matches_what_the_script_already_uses(self):
        """HEAVY_INSTALL_TIMEOUT is not a new constant -- pin that the
        script really does use 600 elsewhere, so this test can never
        drift into asserting a value nothing else agrees with."""
        with open(_SCRIPT, encoding='utf-8') as fh:
            src = fh.read()
        self.assertIn(f'timeout={HEAVY_INSTALL_TIMEOUT}', src)


if __name__ == '__main__':
    unittest.main()
