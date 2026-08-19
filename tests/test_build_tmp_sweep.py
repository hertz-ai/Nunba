"""The freeze build must not leak its package-staging temp dirs.

MEASURED 2026-08-19 in %TEMP%: 36 orphaned ``hart-freeze-pkg-*`` directories
totalling 2,237.8 MB, oldest dated 2026-08-04 — one per build, accumulating
for 15 days.

The cleanup existed the whole time: ``shutil.rmtree(_tmp, ignore_errors=True)``
in a ``finally``.  It could not work, and could not report that it did not:

  * git marks its object store read-only, copytree preserves that, and Windows
    refuses to delete a read-only file.  Diagnosed on a real orphan:
    PermissionError [WinError 5] on ``.git/objects/00/03e7a5...`` with
    3721 of 3721 files read-only.
  * ``.git`` is kept ON PURPOSE (setuptools_scm needs it to stamp the version),
    so this is not avoidable by copying less.
  * ``ignore_errors=True`` swallowed the PermissionError, so 36 consecutive
    builds "cleaned up" successfully while deleting nothing.

Retrying alone does NOT fix it — verified against the real orphans: a plain
rmtree with 3 attempts swept 2 of 36.  The read-only bit must be cleared first;
with that pre-pass the same run swept 34 of 34 and freed 2,237.8 MB.
"""
import os
import stat
import tempfile
import unittest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_SETUP = os.path.join(_ROOT, 'scripts', 'setup_freeze_nunba.py')


def _load(name):
    with open(_SETUP, encoding='utf-8') as fh:
        src = fh.read()
    start = src.index('        def _rmtree_loudly(')
    end = src.index('        def _pip_install_sibling(', start)
    body = '\n'.join(ln[8:] if ln.startswith('        ') else ln
                     for ln in src[start:end].splitlines())
    ns = {'os': os, '_shutil': __import__('shutil'), '_tempfile': tempfile,
          '_PKG_TMP_PREFIX': 'hart-freeze-pkg-', 'print': lambda *a, **k: None}
    exec(body, ns)  # noqa: S102 - fixture
    return ns[name]


class TestReadOnlyTreesAreRemovable(unittest.TestCase):
    """The regression is specifically read-only files, as git produces."""

    def _make_readonly_tree(self, root):
        deep = os.path.join(root, 'HARTOS', '.git', 'objects', '00')
        os.makedirs(deep)
        p = os.path.join(deep, '03e7a5f7d34f0203d8ebae6d5c8dd82652a4f5')
        with open(p, 'w') as fh:
            fh.write('x')
        os.chmod(p, stat.S_IREAD)   # exactly what git does
        return p

    def test_plain_rmtree_fails_on_this_tree(self):
        """Proves the fixture reproduces the real failure, not a strawman."""
        import shutil
        with tempfile.TemporaryDirectory() as base:
            tree = os.path.join(base, 'tree')
            os.makedirs(tree)
            f = self._make_readonly_tree(tree)
            with self.assertRaises(PermissionError):
                shutil.rmtree(tree)
            os.chmod(f, stat.S_IWRITE)   # let TemporaryDirectory clean up

    def test_rmtree_loudly_removes_it(self):
        rmtree_loudly = _load('_rmtree_loudly')
        with tempfile.TemporaryDirectory() as base:
            tree = os.path.join(base, 'tree')
            os.makedirs(tree)
            self._make_readonly_tree(tree)
            self.assertTrue(rmtree_loudly(tree, 'test'))
            self.assertFalse(os.path.exists(tree))

    def test_missing_path_is_success_not_an_error(self):
        rmtree_loudly = _load('_rmtree_loudly')
        self.assertTrue(rmtree_loudly(
            os.path.join(tempfile.gettempdir(), 'no-such-dir-xyz'), 'test'))


class TestCleanupCannotSilentlySwallowFailure(unittest.TestCase):

    def test_staging_cleanup_does_not_use_ignore_errors(self):
        """ignore_errors=True is what let 36 builds leak 2.2 GB unnoticed."""
        with open(_SETUP, encoding='utf-8') as fh:
            src = fh.read()
        start = src.index('def _pip_install_sibling(')
        end = src.index('for _sib_dir, _pkg_name in _sibling_deps', start)
        body = src[start:end]
        self.assertNotIn('ignore_errors=True', body)
        self.assertIn('_rmtree_loudly(_tmp', body)

    def test_sweep_runs_before_any_staging_dir_is_created(self):
        """Stale dirs from earlier builds must be reclaimed even if this
        build's own cleanup loses a race."""
        with open(_SETUP, encoding='utf-8') as fh:
            src = fh.read()
        self.assertLess(src.index('_sweep_stale_pkg_tmp()'),
                        src.index('def _pip_install_sibling('))

    def test_sweep_only_touches_our_own_prefix(self):
        with open(_SETUP, encoding='utf-8') as fh:
            src = fh.read()
        start = src.index('def _sweep_stale_pkg_tmp(')
        # Anchor on the INVOCATION line, not the bare name: `def
        # _sweep_stale_pkg_tmp():` itself contains '_sweep_stale_pkg_tmp()',
        # so searching for that collapsed the slice to 'def ' and the
        # assertion failed against nothing.
        end = src.index('\n        _sweep_stale_pkg_tmp()', start)
        self.assertIn('startswith(_PKG_TMP_PREFIX)', src[start:end])


if __name__ == '__main__':
    unittest.main()
