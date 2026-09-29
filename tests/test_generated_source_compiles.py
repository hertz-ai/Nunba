"""Python programs kept in string constants compile, and do what they say.

A program inside a string literal is invisible to py_compile, ruff and every
import: nothing parses it until the child that runs it.  SITECUSTOMIZE_SOURCE
runs at the start of EVERY python-embed interpreter (every TTS / STT / VLM
worker), so one syntax error there breaks every spawn, and it is dense with
escaped backslashes ("D:\\\\" in the literal is "D:\\" in the file) where an
invalid escape is only a SyntaxWarning today and an error in a later Python.

Found by the question "which constants hold Python that a child runs or a
file receives": python -c arguments and written-out sources, in Nunba:
  scripts/rebuild_python_embed.py  SITECUSTOMIZE_SOURCE (written as a file)
                                   HART_BACKEND_CANARY (python -c)
  tts/package_installer.py         _CT2_CUDA_PROBE (python -c)
HARTOS's equivalents are in tests/unit/test_generated_source_compiles.py.
"""
import json
import os
import subprocess
import sys
import warnings

import pytest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from scripts import rebuild_python_embed as rpe  # noqa: E402
from tts import package_installer as pi  # noqa: E402

SOURCES = {
    'rebuild_python_embed.SITECUSTOMIZE_SOURCE': rpe.SITECUSTOMIZE_SOURCE,
    'rebuild_python_embed.HART_BACKEND_CANARY': rpe.HART_BACKEND_CANARY,
    'package_installer._CT2_CUDA_PROBE': pi._CT2_CUDA_PROBE,
}


@pytest.mark.parametrize('name', sorted(SOURCES))
def test_the_program_compiles_with_no_syntax_warning(name):
    with warnings.catch_warnings():
        warnings.simplefilter('error', SyntaxWarning)
        compile(SOURCES[name], name, 'exec')


def _run_sitecustomize(tmp_path, d_root=None):
    """Write the hook the way the build does, then run it in a fresh child
    whose home holds a ~/.nunba/site-packages, and report what it did.

    ``d_root``: run it with its D: drive root pointed at this folder instead
    (a test harness change to the copy the child runs, so the D: branch can
    be exercised without a D: drive)."""
    sp_dir = tmp_path / 'embed' / 'Lib' / 'site-packages'
    sp_dir.mkdir(parents=True)
    path = rpe.write_sitecustomize(str(sp_dir))
    if d_root is not None:
        text = open(path, encoding='utf-8').read()
        real = '_nunba_root_d = os.path.join("D:\\\\", ".nunba")'
        assert text.count(real) == 1
        open(path, 'w', encoding='utf-8').write(
            text.replace(real, f'_nunba_root_d = {str(d_root)!r}'))
    home = tmp_path / 'home'
    nunba_sp = home / '.nunba' / 'site-packages'
    nunba_sp.mkdir(parents=True)
    probe = (
        "import json, runpy, sys\n"
        "g = runpy.run_path(sys.argv[1])\n"
        "print(json.dumps({'path': sys.path, 'd': g['_nunba_sp_d'],"
        " 'home_sp': g['_nunba_sp']}))\n"
    )
    env = {**os.environ, 'HOME': str(home), 'USERPROFILE': str(home)}
    out = subprocess.run([sys.executable, '-W', 'error::SyntaxWarning', '-c',
                          probe, path],
                         capture_output=True, text=True, env=env, timeout=60)
    assert out.returncode == 0, out.stderr
    return json.loads(out.stdout.strip().splitlines()[-1]), str(nunba_sp)


def test_the_written_sitecustomize_puts_the_user_site_first(tmp_path):
    ran, nunba_sp = _run_sitecustomize(tmp_path)
    assert ran['home_sp'] == nunba_sp
    assert ran['path'][0] == nunba_sp


def test_the_written_sitecustomize_names_the_d_drive_site_with_one_backslash(tmp_path):
    ran, _ = _run_sitecustomize(tmp_path)
    assert ran['d'] == os.path.join('D:\\', '.nunba', 'site-packages')


# Review of efab9501 (SECURITY): the D: site went to sys.path[0] for every
# worker, and anyone who can log on can write into a drive-root folder.

def test_a_d_site_anyone_may_write_is_not_on_the_path(tmp_path):
    from tts._private_dir import make_private_dir
    d_root = tmp_path / 'dshared'
    (d_root / 'site-packages').mkdir(parents=True)
    if sys.platform == 'win32':
        subprocess.run(['icacls', str(d_root), '/grant', '*S-1-5-11:(OI)(CI)M'],
                       capture_output=True, timeout=30)
    else:
        os.chmod(d_root, 0o777)
    ran, _ = _run_sitecustomize(tmp_path, d_root=d_root)
    assert str(d_root / 'site-packages') not in ran['path']


def test_a_private_d_site_goes_after_the_home_site(tmp_path):
    from tts._private_dir import make_private_dir
    d_root = tmp_path / 'dprivate'
    assert make_private_dir(str(d_root))
    (d_root / 'site-packages').mkdir()
    ran, nunba_sp = _run_sitecustomize(tmp_path, d_root=d_root)
    assert ran['path'][0] == nunba_sp
    assert ran['path'][1] == str(d_root / 'site-packages')


def test_the_hook_carries_the_one_private_dir_check():
    """Embedded from tts/_private_dir.py, not a second copy."""
    with open(rpe._PRIVATE_DIR_SOURCE_PATH, encoding='utf-8') as fh:
        assert fh.read() in rpe.SITECUSTOMIZE_SOURCE
