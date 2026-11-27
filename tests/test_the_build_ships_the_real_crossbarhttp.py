"""The bundle's Crossbar publisher is crossbarhttp3's, never a stub.

Measured 2026-11-23 on the installed app and the source python-embed:
python-embed/Lib/site-packages/crossbarhttp/ held only an __init__.py whose
Client.publish returned {"ok": True} and sent nothing.  It came from
Hevolve_Database (commit 327daff added a top-level crossbarhttp/ package and
setup.py's find_packages() shipped it), which setup_freeze_nunba.py
pip-installs into python-embed with --target --upgrade after everything else,
so it replaced the real package.  HARTOS bound it as its Crossbar client, and
every relayed push (a consent ask, a person ask to a phone whose app is
closed) read as sent and never left the desktop.

The build now checks what it ships after the sibling installs and puts
crossbarhttp3 back (or fails the build, naming why).
"""
import os
import sys
import tempfile
import unittest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_ROOT, 'scripts'))

import deps  # noqa: E402

_SETUP = os.path.join(_ROOT, 'scripts', 'setup_freeze_nunba.py')

# The stub as python-embed carried it (byte-for-byte the class body).
STUB = '''class Client:
    def __init__(self, url=None, *args, **kwargs):
        self.url = url
    def publish(self, *a, **k): return {"ok": True}
    def call(self, *a, **k):    return {"ok": True, "result": None}
    def close(self):            return True
'''
# crossbarhttp3 1.1's own __init__.py
REAL_INIT = '''from .crossbarhttp import (
    Client, ClientBadHost, ClientBadUrl, ClientBaseException,
    ClientCallRuntimeError, ClientMissingParams, ClientNoCalleeRegistered,
    ClientSignatureError
)
'''


def _write(path, text=''):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(text)


class TestWhatTheBuildShipsAsCrossbarhttp(unittest.TestCase):

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.sp = self._tmp.name

    def tearDown(self):
        self._tmp.cleanup()

    def test_the_stub_python_embed_carried_is_not_the_real_package(self):
        _write(os.path.join(self.sp, 'crossbarhttp', '__init__.py'), STUB)
        self.assertFalse(deps.crossbarhttp_is_real(self.sp))

    def test_crossbarhttp3_is_the_real_package(self):
        _write(os.path.join(self.sp, 'crossbarhttp', '__init__.py'), REAL_INIT)
        _write(os.path.join(self.sp, 'crossbarhttp', 'crossbarhttp.py'), 'class Client: pass\n')
        self.assertTrue(deps.crossbarhttp_is_real(self.sp))

    def test_a_stub_init_over_the_real_module_is_not_the_real_package(self):
        # a plain pip install of the old Hevolve_Database over crossbarhttp3
        # writes only the __init__: `from crossbarhttp import Client` is the stub
        _write(os.path.join(self.sp, 'crossbarhttp', '__init__.py'), STUB)
        _write(os.path.join(self.sp, 'crossbarhttp', 'crossbarhttp.py'), 'class Client: pass\n')
        self.assertFalse(deps.crossbarhttp_is_real(self.sp))

    def test_no_crossbarhttp_at_all_is_not_the_real_package(self):
        self.assertFalse(deps.crossbarhttp_is_real(self.sp))


class TestTheBuildRepairsItAfterTheSiblingInstalls(unittest.TestCase):

    def _src(self):
        with open(_SETUP, encoding='utf-8') as fh:
            return fh.read()

    def test_the_check_runs_after_hevolve_database_is_installed(self):
        src = self._src()
        siblings = src.index("('Hevolve_Database', 'hevolve-database')")
        loop = src.index('for _sib_dir, _pkg_name in _sibling_deps:', siblings)
        check = src.index('_ship_the_real_crossbarhttp(_embed_sp)', loop)
        self.assertLess(loop, check)

    def _helper(self):
        src = self._src()
        start = src.index('def _ship_the_real_crossbarhttp(')
        end = src.index('# ── end crossbarhttp check ──', start)
        calls = []

        class R:
            returncode, stdout, stderr = 0, '', ''

        def run(cmd, **kw):
            calls.append(cmd)
            if ns['_heal']:
                _write(os.path.join(self.sp, 'crossbarhttp', '__init__.py'), REAL_INIT)
                _write(os.path.join(self.sp, 'crossbarhttp', 'crossbarhttp.py'), '')
            return R()

        ns = {'os': os, 'sys': sys, 'deps': deps, '_heal': True,
              'subprocess': type('S', (), {'run': staticmethod(run)})}
        exec(src[start:end], ns)  # noqa: S102 - fixture, not user input
        return ns, calls

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.sp = self._tmp.name

    def tearDown(self):
        self._tmp.cleanup()

    def test_a_stub_is_replaced_by_the_pinned_crossbarhttp3(self):
        _write(os.path.join(self.sp, 'crossbarhttp', '__init__.py'), STUB)
        ns, calls = self._helper()
        ns['_ship_the_real_crossbarhttp'](self.sp)
        (cmd,) = calls
        self.assertIn(f"crossbarhttp3=={deps.CORE_DEPS['crossbarhttp3']}", cmd)
        self.assertIn('--force-reinstall', cmd)
        self.assertEqual(cmd[cmd.index('--target') + 1], self.sp)
        self.assertTrue(deps.crossbarhttp_is_real(self.sp))

    def test_the_build_fails_loudly_when_it_cannot_ship_the_real_one(self):
        _write(os.path.join(self.sp, 'crossbarhttp', '__init__.py'), STUB)
        ns, _ = self._helper()
        ns['_heal'] = False
        with self.assertRaises(SystemExit) as e:
            ns['_ship_the_real_crossbarhttp'](self.sp)
        self.assertIn('crossbarhttp3', str(e.exception))

    def test_the_real_package_is_left_alone(self):
        _write(os.path.join(self.sp, 'crossbarhttp', '__init__.py'), REAL_INIT)
        _write(os.path.join(self.sp, 'crossbarhttp', 'crossbarhttp.py'), '')
        ns, calls = self._helper()
        ns['_ship_the_real_crossbarhttp'](self.sp)
        self.assertEqual(calls, [])


if __name__ == '__main__':
    unittest.main()
