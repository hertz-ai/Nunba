"""python-embed's packages must be loadable by python-embed's own ABI.

Measured 2026-10-21 on an installer built on a dev box:

* The build venv was Python 3.11 while python-embed (and CI) are 3.12.  The
  frozen app appends python-embed's site-packages to its path, so it could not
  load the cp312 extension modules: no LangChain chat (uuid_utils), no Piper
  TTS (onnxruntime), and acceptance (9/9) and validation (64/64) still passed.
* A 3.11 build had pip-installed ctranslate2 into python-embed with only
  `_ext.cp311-win_amd64.pyd`.  Every later build said "ctranslate2 already
  present", the post-build copy dropped the cp311 file, and the installed
  app's faster-whisper failed with "module 'ctranslate2' has no attribute
  'StorageView'": voice input transcribed nothing.

These tests pin the two guards: a build refuses to run when its ABI differs
from python-embed's, and "already present" means loadable by python-embed.
"""
import os
import sys
import tempfile
import unittest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_SETUP = os.path.join(_ROOT, 'scripts', 'setup_freeze_nunba.py')


def _src():
    with open(_SETUP, encoding='utf-8') as fh:
        return fh.read()


def _helpers():
    """The helper block, without executing the build."""
    src = _src()
    start = src.index('# ── Embed ABI helpers')
    end = src.index('# ── end embed ABI helpers ──', start)
    ns = {'os': os, 'sys': sys}
    exec(src[start:end], ns)  # noqa: S102 - fixture, not user input
    return ns


def _touch(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').close()


class TestModulesWithoutAbiBuild(unittest.TestCase):

    def setUp(self):
        self.h = _helpers()
        self.tmp = tempfile.mkdtemp()

    def test_ctranslate2_with_only_a_cp311_ext_is_not_loadable_by_cp312(self):
        pkg = os.path.join(self.tmp, 'ctranslate2')
        _touch(os.path.join(pkg, '__init__.py'))
        _touch(os.path.join(pkg, '_ext.cp311-win_amd64.pyd'))
        self.assertEqual(self.h['_modules_without_abi_build'](pkg, 'cp312'), ['_ext'])

    def test_a_cp312_build_beside_it_is_loadable(self):
        pkg = os.path.join(self.tmp, 'ctranslate2')
        _touch(os.path.join(pkg, '_ext.cp311-win_amd64.pyd'))
        _touch(os.path.join(pkg, '_ext.cp312-win_amd64.pyd'))
        self.assertEqual(self.h['_modules_without_abi_build'](pkg, 'cp312'), [])

    def test_a_pure_python_package_is_loadable(self):
        pkg = os.path.join(self.tmp, 'faster_whisper')
        _touch(os.path.join(pkg, '__init__.py'))
        _touch(os.path.join(pkg, 'transcribe.py'))
        self.assertEqual(self.h['_modules_without_abi_build'](pkg, 'cp312'), [])

    def test_nested_modules_are_found(self):
        pkg = os.path.join(self.tmp, 'pkg')
        _touch(os.path.join(pkg, 'sub', 'fast.cp310-win_amd64.pyd'))
        self.assertEqual(self.h['_modules_without_abi_build'](pkg, 'cp312'),
                         [os.path.join('sub', 'fast')])

    def test_unknown_abi_or_missing_dir_reports_nothing(self):
        pkg = os.path.join(self.tmp, 'ctranslate2')
        _touch(os.path.join(pkg, '_ext.cp311-win_amd64.pyd'))
        self.assertEqual(self.h['_modules_without_abi_build'](pkg, None), [])
        self.assertEqual(self.h['_modules_without_abi_build'](
            os.path.join(self.tmp, 'absent'), 'cp312'), [])

    def test_this_python_tag(self):
        self.assertEqual(self.h['_abi_tag_of_this_python'](),
                         f'cp{sys.version_info.major}{sys.version_info.minor}')


class TestBuildGuards(unittest.TestCase):

    def test_a_build_whose_abi_differs_from_python_embed_stops(self):
        src = _src()
        block = src[src.index('_pre_embed_abi = _abi_tag_of_embedded_python('):]
        block = block[:block.index('if os.path.isdir(_embed_sp):')]
        self.assertIn('_pre_embed_abi != _abi_tag_of_this_python()', block)
        self.assertIn('sys.exit(1)', block)

    def test_already_present_means_loadable_and_a_stale_copy_is_replaced(self):
        src = _src()
        loop = src[src.index('for _pkg_label, _pip_name, _import_name, _extra_args in _tts_deps:'):]
        loop = loop[:loop.index('_r = subprocess.run(_pip_cmd')]
        self.assertIn('_modules_without_abi_build(_check_path, _pre_embed_abi)', loop)
        self.assertIn('if _present and not _unloadable:', loop)
        self.assertIn('"--upgrade"', loop)

    def test_one_orphan_rule(self):
        """The post-build copy's orphan warning asks the shared helper."""
        src = _src()
        start = src.index('def _ignore_unloadable')
        end = src.index('shutil.copytree(_src_embed', start)
        body = src[start:end]
        self.assertIn('_wrong_abi_orphan(n, names, _embed_abi)', body)
        self.assertNotIn('same_abi', body)


if __name__ == '__main__':
    unittest.main()
