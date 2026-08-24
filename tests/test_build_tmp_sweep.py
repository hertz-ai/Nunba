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


def _load(name, printer=None):
    """Execute the real region from the build script — never a copy.

    Loading the ACTUAL source (rather than reimplementing the logic here) is
    what makes these tests able to catch a NameError in it: an early draft of
    the age guard referenced a `_time_mod` that does not exist in that scope,
    which only a real execution surfaces.
    """
    with open(_SETUP, encoding='utf-8') as fh:
        src = fh.read()
    start = src.index("        _PKG_TMP_PREFIX = ")
    end = src.index('        def _pip_install_sibling(', start)
    body = '\n'.join(ln[8:] if ln.startswith('        ') else ln
                     for ln in src[start:end].splitlines())
    # The region ends with a bare _sweep_stale_pkg_tmp() call.  Drop it so
    # importing the helpers does not sweep the developer's real TEMP.
    body = body.replace('\n_sweep_stale_pkg_tmp()', '\npass')
    ns = {'os': os, '_shutil': __import__('shutil'), '_tempfile': tempfile,
          'print': printer or (lambda *a, **k: None)}
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


class TestSweepCannotEatARunningBuild(unittest.TestCase):
    """The sweep is the one part of this fix that can cause a WORSE bug.

    Deleting another build's IN-USE staging dir mid-build would be far worse
    than the leak.  build.py does hold a BUILD-LOCK, but it also prints
    "could not write lock ...; proceeding without lock" and continues when the
    lock cannot be written, and setup_freeze_nunba.py can be run directly
    without build.py at all — so the sweep must be safe on its own terms.
    """

    def setUp(self):
        self._prefix = _load('_PKG_TMP_PREFIX')
        self._min_age = _load('_PKG_TMP_MIN_AGE_S')
        self._sweep = _load('_sweep_stale_pkg_tmp')

    def _seed(self, root, name, age_s):
        import time
        p = os.path.join(root, name)
        os.makedirs(p)
        with open(os.path.join(p, 'payload.bin'), 'w') as fh:
            fh.write('x' * 1024)
        t = time.time() - age_s
        os.utime(p, (t, t))
        return p

    def _sweep_in(self, root):
        real = tempfile.gettempdir
        tempfile.gettempdir = lambda: root
        try:
            self._sweep()
        finally:
            tempfile.gettempdir = real

    def test_a_fresh_dir_is_never_swept(self):
        """A dir younger than the guard belongs to a build that may be live."""
        with tempfile.TemporaryDirectory() as root:
            live = self._seed(root, self._prefix + 'live0000', 60)
            self._sweep_in(root)
            self.assertTrue(os.path.isdir(live),
                            'sweep deleted a staging dir a running build could '
                            'still be using')

    def test_an_old_dir_is_swept(self):
        with tempfile.TemporaryDirectory() as root:
            old = self._seed(root, self._prefix + 'old00000',
                             self._min_age + 3600)
            self._sweep_in(root)
            self.assertFalse(os.path.exists(old))

    def test_guard_is_longer_than_any_real_build(self):
        """765s compile / well under an hour end to end, measured 2026-08-19."""
        self.assertGreaterEqual(self._min_age, 2 * 60 * 60)

    def test_foreign_dirs_are_untouched(self):
        with tempfile.TemporaryDirectory() as root:
            other = self._seed(root, 'pip-build-env-abc', self._min_age + 3600)
            tmpx = self._seed(root, 'tmpxyz123', self._min_age + 3600)
            self._sweep_in(root)
            self.assertTrue(os.path.isdir(other))
            self.assertTrue(os.path.isdir(tmpx))

    def test_sweep_executes_without_a_name_error(self):
        """Executes the shipped code as-is — catches NameError/typos in it.

        An earlier draft of the age guard called `_time_mod.time()`, a name
        that does not exist in that scope.  Every static check passed; only
        running it finds that.  `_now = _t.time()` is evaluated before the
        loop, so an EMPTY dir still exercises it — no reason to point this at
        the developer's real TEMP and delete things as a side effect of
        running the test suite.
        """
        with tempfile.TemporaryDirectory() as empty:
            self._sweep_in(empty)


class TestCleanupCannotBreakTheBuildItProtects(unittest.TestCase):
    """_rmtree_loudly runs in a `finally`. If it raised it would MASK the
    real exception from the install it was cleaning up after."""

    def test_it_swallows_a_hard_failure_and_reports_false(self):
        msgs = []
        rmtree_loudly = _load('_rmtree_loudly', printer=lambda *a, **k: msgs.append(' '.join(map(str, a))))
        with tempfile.TemporaryDirectory() as base:
            tree = os.path.join(base, 'locked')
            os.makedirs(tree)
            held = open(os.path.join(tree, 'busy.bin'), 'w')  # noqa: SIM115
            held.write('x')
            held.flush()
            try:
                # An open handle makes this undeletable on Windows.  Whatever
                # the platform does, the call must RETURN, never raise.
                result = rmtree_loudly(tree, 'package staging')
            finally:
                held.close()
        self.assertIn(result, (True, False))
        if result is False:
            self.assertTrue(any(tree in m for m in msgs),
                            'a failed cleanup must NAME the path it left behind '
                            '— silence is what let 36 builds leak 2.2 GB')

    def test_a_file_path_does_not_raise(self):
        rmtree_loudly = _load('_rmtree_loudly')
        with tempfile.TemporaryDirectory() as base:
            f = os.path.join(base, 'not-a-dir')
            with open(f, 'w') as fh:
                fh.write('x')
            self.assertIn(rmtree_loudly(f, 'test'), (True, False))


if __name__ == '__main__':
    unittest.main()
