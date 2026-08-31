"""The drift guard build.py has cited since 2026-06-08 but which never existed.

build.py syncs a fixed list of HARTOS package dirs into python-embed's
site-packages. Every Python package at the HARTOS repo root that ships to
users MUST be in that list, or a fix landing inside it silently never
reaches an install (the hevolvearmor incident: a loader fix sat in HARTOS
for 24h while installs stayed broken, because the dir wasn't listed).

This imports the real constant from scripts/build.py and compares it with
the real HARTOS tree — no source grepping.
"""
import importlib.util
import os
import sys
import unittest

_SCRIPTS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts')
_HARTOS = os.path.abspath(os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'HARTOS'))


def _load_build_module():
    spec = importlib.util.spec_from_file_location(
        'nunba_build_script', os.path.join(_SCRIPTS, 'build.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestHartosSyncListDrift(unittest.TestCase):
    """build.py's HARTOS_SYNC_PACKAGES vs the actual HARTOS repo."""

    @classmethod
    def setUpClass(cls):
        cls.build = _load_build_module()
        cls.sync_list = list(cls.build.HARTOS_SYNC_PACKAGES)

    def test_constant_exists_and_is_nonempty(self):
        self.assertTrue(self.sync_list,
                        'HARTOS_SYNC_PACKAGES missing or empty in build.py')

    def test_core_security_integrations_always_listed(self):
        # The three load-bearing packages every install needs.
        for pkg in ('core', 'security', 'integrations', 'hartos'):
            self.assertIn(pkg, self.sync_list,
                          '%s absent from HARTOS_SYNC_PACKAGES — fixes '
                          'inside it will never reach an install' % pkg)

    @unittest.skipUnless(os.path.isdir(_HARTOS), 'HARTOS sibling clone absent')
    def test_every_shipped_hartos_package_is_in_the_sync_list(self):
        """A package dir at HARTOS root that is importable Python and not
        explicitly dev-only must be synced. This is the drift the
        hevolvearmor incident proved can happen silently."""
        DEV_ONLY = {
            'tests', 'docs', 'scripts', 'deploy', 'nixos', 'prompts',
            'agent_data', 'venv', 'venv311', 'build', 'node_modules',
            '.github', '.git', 'claw_native', 'agent-ledger-opensource',
            'hart_backend.egg-info', '.pycharm_plugin', 'static',
            'hevolve_database',  # synced only when the sibling clone exists
        }
        missing = []
        for entry in sorted(os.listdir(_HARTOS)):
            full = os.path.join(_HARTOS, entry)
            if not os.path.isdir(full) or entry in DEV_ONLY or entry.startswith('.'):
                continue
            flat = os.path.isfile(os.path.join(full, '__init__.py'))
            nested = os.path.isfile(os.path.join(full, entry, '__init__.py'))
            if (flat or nested) and entry not in self.sync_list:
                missing.append(entry)
        self.assertEqual(
            missing, [],
            'HARTOS package dirs missing from build.py HARTOS_SYNC_PACKAGES '
            '(fixes inside them silently never ship): %s' % missing)

    @unittest.skipUnless(os.path.isdir(_HARTOS), 'HARTOS sibling clone absent')
    def test_sync_list_names_exist_in_hartos(self):
        """The reverse direction: a listed dir that no longer exists is
        dead weight and hides a rename that broke the sync."""
        overrides = getattr(self.build, 'HARTOS_SYNC_PATH_OVERRIDES', {})
        ghosts = [p for p in self.sync_list
                  if p != 'hevolve_database'  # optional sibling, may be absent
                  and not os.path.isdir(
                      os.path.join(_HARTOS, overrides.get(p, p)))]
        self.assertEqual(ghosts, [],
                         'HARTOS_SYNC_PACKAGES entries with no matching '
                         'HARTOS dir: %s' % ghosts)


if __name__ == '__main__':
    unittest.main()
