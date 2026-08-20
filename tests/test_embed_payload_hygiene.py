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


if __name__ == '__main__':
    unittest.main()
