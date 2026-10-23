"""What python-embed must contain, and what it must never carry.

Both defects here were found by importing every hevolveai module inside the
FROZEN bundle (163 discovered, 161 clean) and by byte-accounting the shipped
tree -- not by reading code.

1. sounddevice was declared in CORE_DEPS but not EMBED_DEPS.  CORE_DEPS feeds
   the cx_Freeze lib/; python-embed subprocesses run with PYTHONNOUSERSITE=1
   (app.py:61) and cannot see lib/.  So hevolveai's two audio modules died at
   runtime with ModuleNotFoundError while every other module imported fine.
   CORE_DEPS' own comment records the identical bug one layer up ("imported
   by app.py without ever being declared here, so a fresh install silently
   lacked it").

2. hevolveai/server/logs/ -- 79 files, 59 MB of rotated WAMP publisher logs
   dated 2026-01-16/17 -- rode the sibling copy into python-embed and into the
   installer.  That is the entire +9.5 MB the 2026-08-19 23:07 build gained
   despite dropping 147 dead cp310 .pyd.
"""
import os
import sys
import unittest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_ROOT, 'scripts'))

import deps  # noqa: E402


class TestEmbedDepsCoverAnythingPythonEmbedImports(unittest.TestCase):

    def test_sounddevice_is_in_embed_deps(self):
        """python-embed cannot reach CORE_DEPS -- PYTHONNOUSERSITE=1."""
        self.assertIn(
            'sounddevice', deps.EMBED_DEPS,
            'hevolveai.embodied_ai.inference.audio_stream and '
            'embodied_learner import sounddevice from inside python-embed; '
            'a CORE_DEPS-only declaration is invisible there')

    def test_the_two_pins_cannot_drift(self):
        """One version literal, referenced -- never two that can diverge."""
        self.assertEqual(deps.EMBED_DEPS['sounddevice'],
                         deps.CORE_DEPS['sounddevice'])

    def test_embed_deps_pin_is_not_a_second_literal(self):
        """Guard the DRY form, not just today's equal values."""
        src_path = os.path.join(_ROOT, 'scripts', 'deps.py')
        with open(src_path, encoding='utf-8') as fh:
            src = fh.read()
        start = src.index('EMBED_DEPS = {')
        body = src[start:src.index('\n}', start)]
        self.assertIn('"sounddevice": CORE_DEPS["sounddevice"]', body)


class TestRuntimeLogsNeverEnterTheBundle(unittest.TestCase):

    def _ignore_heavy_patterns(self):
        path = os.path.join(_ROOT, 'scripts', 'setup_freeze_nunba.py')
        with open(path, encoding='utf-8') as fh:
            src = fh.read()
        start = src.index('_IGNORE_HEAVY = _shutil.ignore_patterns(')
        end = src.index(')', src.index("'*.sqlite3-journal'", start))
        return src[start:end]

    def test_log_directory_is_excluded(self):
        self.assertIn("'logs'", self._ignore_heavy_patterns())

    def test_rotated_logs_are_excluded(self):
        """fnmatch's '*.log' does NOT match 'foo.log.1'.

        Four of the five biggest offenders were rotated siblings at the 10 MB
        cap (wamp_publisher_20260117.log.1 .. .4), so a bare '*.log' would
        have left 40 of the 59 MB in place -- exactly the trap that made
        '*.db' miss '*.db-shm'.
        """
        block = self._ignore_heavy_patterns()
        self.assertIn("'*.log'", block)
        self.assertIn("'*.log.[0-9]'", block)

    def test_patterns_actually_match_the_real_offenders(self):
        """Run fnmatch over the exact filenames measured in the bundle."""
        import fnmatch
        pats = ['logs', '*.log', '*.log.[0-9]', '*.log.[0-9][0-9]']
        offenders = [
            'wamp_publisher_20260117.log',
            'wamp_publisher_20260117.log.1',
            'wamp_publisher_20260117.log.4',
            'wamp_publisher_20260116.log',
            'logs',
        ]
        for name in offenders:
            self.assertTrue(
                any(fnmatch.fnmatch(name, p) for p in pats),
                f'{name!r} would still be copied into python-embed')

    def test_source_files_are_not_swept_up(self):
        """The exclusion must not eat real package content."""
        import fnmatch
        pats = ['logs', '*.log', '*.log.[0-9]', '*.log.[0-9][0-9]']
        keep = ['logger.py', 'logging_config.py', 'catalog.json',
                'free_energy.cp312-win_amd64.pyd', '__init__.py',
                'dialog.py', 'blog.md']
        for name in keep:
            self.assertFalse(
                any(fnmatch.fnmatch(name, p) for p in pats),
                f'{name!r} must NOT be excluded')


class TestWindowsReservedNamesNeverStopTheSiblingCopy(unittest.TestCase):
    """A file named like a Windows device must not reach copytree.

    Measured 2026-09-23: the build died at the HARTOS sibling copy with
      shutil.Error: [('...\\HARTOS\\nul', '...\\hart-freeze-pkg-...\\HARTOS\\nul',
                      '[WinError 87] The parameter is incorrect')]
    HARTOS/nul was a 1,906-byte diff written by a shell `> nul` from a POSIX
    shell, which creates a real file instead of discarding output.  It is
    gitignored (HARTOS .gitignore:60), so git never shows it, but copytree
    walks the tree, not the index.  Windows cannot open a path whose last
    component is a device name (CON PRN AUX NUL COM1-9 LPT1-9, any case,
    with or without an extension), so one stray file stopped every build.

    These run the REAL _IGNORE_HEAVY built from setup_freeze_nunba.py's own
    source, not a copy of its pattern list.
    """

    @staticmethod
    def _real_ignore():
        import ast
        import shutil
        path = os.path.join(_ROOT, 'scripts', 'setup_freeze_nunba.py')
        with open(path, encoding='utf-8') as fh:
            tree = ast.parse(fh.read())
        wanted = ('_WIN_RESERVED_PATTERNS', '_IGNORE_HEAVY')
        found = {}
        for node in ast.walk(tree):
            if (isinstance(node, ast.Assign) and len(node.targets) == 1
                    and isinstance(node.targets[0], ast.Name)
                    and node.targets[0].id in wanted):
                found[node.targets[0].id] = node
        missing = [w for w in wanted if w not in found]
        if missing:
            raise AssertionError(f'setup_freeze_nunba.py defines no {missing}')
        ns = {'_shutil': shutil}
        for name in wanted:
            exec(compile(ast.Module(body=[found[name]], type_ignores=[]),
                         path, 'exec'), ns)
        return ns['_IGNORE_HEAVY']

    def test_device_names_are_ignored_in_any_case_and_with_extensions(self):
        ignore = self._real_ignore()
        names = ['nul', 'NUL', 'Nul', 'nul.txt', 'con', 'CON.log', 'prn',
                 'aux', 'aux.py', 'com1', 'COM9', 'lpt1', 'LPT9.txt']
        ignored = ignore('HARTOS', names)
        for name in names:
            self.assertIn(name, ignored,
                          f'{name!r} would reach copytree and fail on Windows')

    def test_ordinary_names_that_merely_start_like_a_device_are_kept(self):
        ignore = self._real_ignore()
        keep = ['null_check.py', 'nullable.json', 'console.py', 'contrib',
                'auxiliary.py', 'printer.py', 'com.py', 'com10', 'lpt',
                'compose.yaml', 'core', 'config.json', '__init__.py']
        ignored = ignore('HARTOS', keep)
        self.assertEqual(sorted(set(keep) & set(ignored)), [],
                         'real package content must not be excluded')


class TestAVirtualenvNeverEntersTheSiblingCopy(unittest.TestCase):
    """A virtualenv is skipped by what it IS, not by what it is called.

    Measured 2026-10-21: the build sat in the HARTOS sibling copy with 18,614
    files of HARTOS/venv-hart/ (2.5 GB, ~43k files) already copied to %TEMP%.
    _IGNORE_HEAVY names 'venv', 'venv311' and '.venv'; fnmatch matches whole
    names, so 'venv-hart' fell outside the list.  Every virtualenv carries
    pyvenv.cfg at its root, so that is the test -- the same one HARTOS's code
    hash uses (security/node_integrity._is_foreign_tree).

    These run the REAL _ignore_staging from setup_freeze_nunba.py through a
    real copytree.
    """

    @staticmethod
    def _real_ignore():
        import ast
        import shutil
        path = os.path.join(_ROOT, 'scripts', 'setup_freeze_nunba.py')
        with open(path, encoding='utf-8') as fh:
            tree = ast.parse(fh.read())
        wanted = ('_WIN_RESERVED_PATTERNS', '_IGNORE_HEAVY', '_ignore_staging')
        found = {}
        for node in ast.walk(tree):
            if (isinstance(node, ast.Assign) and len(node.targets) == 1
                    and isinstance(node.targets[0], ast.Name)
                    and node.targets[0].id in wanted):
                found[node.targets[0].id] = node
            elif isinstance(node, ast.FunctionDef) and node.name in wanted:
                found[node.name] = node
        missing = [w for w in wanted if w not in found]
        if missing:
            raise AssertionError(f'setup_freeze_nunba.py defines no {missing}')
        ns = {'_shutil': shutil, 'os': os}
        for name in wanted:
            exec(compile(ast.Module(body=[found[name]], type_ignores=[]),
                         path, 'exec'), ns)
        return ns['_ignore_staging']

    def _copy(self, layout):
        import shutil
        import tempfile
        base = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, base, True)
        src = os.path.join(base, 'HARTOS')
        for rel in layout:
            p = os.path.join(src, *rel.split('/'))
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, 'w') as fh:
                fh.write('x')
        dst = os.path.join(base, 'copy')
        shutil.copytree(src, dst, ignore=self._real_ignore(), symlinks=True)
        return dst

    def test_a_virtualenv_under_any_name_is_not_copied(self):
        dst = self._copy([
            'venv-hart/pyvenv.cfg',
            'venv-hart/Lib/site-packages/torch/__init__.py',
            'env_py312/pyvenv.cfg',
            'core/__init__.py',
        ])
        self.assertFalse(os.path.exists(os.path.join(dst, 'venv-hart')))
        self.assertFalse(os.path.exists(os.path.join(dst, 'env_py312')))
        self.assertTrue(os.path.isfile(os.path.join(dst, 'core', '__init__.py')))

    def test_a_package_that_merely_looks_like_a_venv_is_kept(self):
        """No pyvenv.cfg, no exclusion: the name alone proves nothing."""
        dst = self._copy([
            'venv_tools/__init__.py',
            'integrations/venvs/__init__.py',
        ])
        self.assertTrue(os.path.isfile(
            os.path.join(dst, 'venv_tools', '__init__.py')))
        self.assertTrue(os.path.isfile(
            os.path.join(dst, 'integrations', 'venvs', '__init__.py')))

    def test_the_name_patterns_still_apply(self):
        # Device names are pinned by the class above; a real 'nul' cannot be
        # created on Windows, so it has no place in a real-copytree fixture.
        dst = self._copy(['.venv/x.py', 'agent_data/a.db-shm',
                          'core/__init__.py'])
        self.assertFalse(os.path.exists(os.path.join(dst, '.venv')))
        self.assertFalse(os.path.exists(
            os.path.join(dst, 'agent_data', 'a.db-shm')))

    def test_the_sibling_copy_uses_it(self):
        path = os.path.join(_ROOT, 'scripts', 'setup_freeze_nunba.py')
        with open(path, encoding='utf-8') as fh:
            src = fh.read()
        start = src.index('def _pip_install_sibling(')
        body = src[start:src.index('for _sib_dir, _pkg_name in _sibling_deps',
                                   start)]
        self.assertIn('ignore=_ignore_staging', body)


if __name__ == '__main__':
    unittest.main()
