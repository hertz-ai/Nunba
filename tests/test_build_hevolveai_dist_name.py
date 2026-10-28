"""build.py asks pip for HevolveAI under the name HevolveAI publishes.

Measured in a build on 2026-10-21 (no local hevolveai sibling, so the GitHub
fallback ran):

    > pip install -c ... embodied-ai@git+https://github.com/hertz-ai/HevolveAI.git@main
    WARNING: Generating metadata for package embodied-ai produced metadata for
             project name hevolveai. Fix your #egg=embodied-ai fragments.
    Discarding ...: Requested hevolveai from git+...@main has inconsistent
             name: expected 'embodied-ai', but metadata has 'hevolveai'
    ERROR: No matching distribution found for embodied-ai (unavailable)

The repo's distribution is `hevolveai` -- the name every other Nunba lookup
already uses (setup_freeze_nunba._sibling_deps, the hevolveai-*.dist-info
sanitizer, app.py).  pip refuses a direct URL whose metadata name differs
from the one requested, and run_command(check=False) let the build carry on
without it.
"""
import importlib.util
import os
import unittest

from packaging.requirements import Requirement

_SCRIPTS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts')


def _load_build_module():
    spec = importlib.util.spec_from_file_location(
        'nunba_build_script_hevolveai', os.path.join(_SCRIPTS, 'build.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestHevolveaiFallbackRequestsTheRealName(unittest.TestCase):

    def _fallback_requirement(self):
        build = _load_build_module()
        commands = []
        build.run_command = lambda cmd, *a, **k: commands.append(cmd) or False
        build._torch_constraints_file = lambda: None
        real_exists = build.os.path.exists
        build.os.path.exists = lambda p: (
            False if p.endswith('setup.py') else real_exists(p))
        try:
            build._install_embodied_ai('python')
        finally:
            build.os.path.exists = real_exists
        self.assertEqual(len(commands), 1, 'expected only the GitHub fallback')
        return Requirement(commands[0][-1])

    def test_fallback_asks_for_hevolveai(self):
        self.assertEqual(self._fallback_requirement().name, 'hevolveai')

    def test_fallback_still_points_at_the_hevolveai_repo(self):
        self.assertEqual(self._fallback_requirement().url,
                         'git+https://github.com/hertz-ai/HevolveAI.git@main')


if __name__ == '__main__':
    unittest.main()
