"""setup_freeze_nunba.find_hevolve_modules takes lib/'s root modules from the
sibling HARTOS, never from the stale hartos_backend_src clone when the
sibling exists.

Measured 2026-09-15 on build 1001: pip's lookup resolved nothing mid-build,
so the old pip -> clone -> sibling order froze hart_intelligence_entry from
the gpt4.1 clone (3e9d4d2, 2026-04-23) into lib/, under a python-embed that
carried the current sibling.  The content check caught it: the frozen .pyc
had BOOKPARSING_API and lacked BookParseError.

setup_freeze_nunba.py runs cx_Freeze at import, so the function under test is
lifted out of the file with ast and exec'd on its own: the REAL code runs
against a tmp_path layout, and each source is given a distinguishable body.
"""
import ast
import importlib.util
import os
import types

import pytest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_FREEZE = os.path.join(_ROOT, 'scripts', 'setup_freeze_nunba.py')

MODULES = ('hart_intelligence_entry', 'asgi')


def _find_hevolve_modules(fake_file):
    """The real find_hevolve_modules, with __file__ pointing into a tmp tree."""
    with open(_FREEZE, encoding='utf-8') as fh:
        tree = ast.parse(fh.read())
    node = next(n for n in tree.body
                if isinstance(n, ast.FunctionDef) and n.name == 'find_hevolve_modules')
    ns = {'os': os, '__file__': fake_file, 'print': lambda *a, **k: None}
    exec(compile(ast.Module(body=[node], type_ignores=[]), _FREEZE, 'exec'), ns)
    return ns['find_hevolve_modules']


def _write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')


@pytest.fixture
def layout(tmp_path, monkeypatch):
    """tmp/Nunba as cwd, with scripts/, a stale clone, and the module list at
    the CI _deps path (so a test may leave the sibling tmp/HARTOS absent)."""
    nunba = tmp_path / 'Nunba'
    _write(nunba / '_deps' / 'HARTOS' / 'pyproject.toml',
           '[tool.setuptools]\npy-modules = [\n    "hart_intelligence_entry",\n    "asgi",\n]\n')
    for m in MODULES:
        _write(nunba / 'hartos_backend_src' / f'{m}.py', f'SOURCE = "clone"  # {m}\n')
    (nunba / 'scripts').mkdir(parents=True)
    monkeypatch.chdir(nunba)
    return types.SimpleNamespace(nunba=nunba, hartos=tmp_path / 'HARTOS',
                                 fake_file=str(nunba / 'scripts' / 'setup_freeze_nunba.py'))


def _make_sibling(layout):
    for m in MODULES:
        _write(layout.hartos / f'{m}.py', f'SOURCE = "sibling"  # {m}\n')


def _sources(found):
    """{module: 'sibling' | 'clone' | 'pip'} read from the chosen file's body."""
    out = {}
    for src, dst in found:
        with open(src, encoding='utf-8') as fh:
            out[os.path.basename(dst)[:-3]] = fh.read().split('"')[1]
    return out


def test_the_sibling_wins_over_the_clone_and_pip(layout, monkeypatch):
    _make_sibling(layout)
    pip_dir = layout.nunba / '.venv' / 'site-packages'
    for m in MODULES:
        _write(pip_dir / f'{m}.py', f'SOURCE = "pip"  # {m}\n')

    def fake_find_spec(name):
        return importlib.util.spec_from_file_location(name, str(pip_dir / f'{name}.py'))
    monkeypatch.setattr(importlib.util, 'find_spec', fake_find_spec)

    found = _find_hevolve_modules(layout.fake_file)()
    assert _sources(found) == {m: 'sibling' for m in MODULES}
    assert {dst for _, dst in found} == {os.path.join('lib', f'{m}.py') for m in MODULES}


def test_pip_before_the_clone_when_there_is_no_sibling(layout, monkeypatch):
    """Without a sibling checkout (a CI box), pip's copy still beats the clone."""
    assert not layout.hartos.exists()
    pip_dir = layout.nunba / '.venv' / 'site-packages'
    _write(pip_dir / 'asgi.py', 'SOURCE = "pip"  # asgi\n')

    def fake_find_spec(name):
        path = pip_dir / f'{name}.py'
        return importlib.util.spec_from_file_location(name, str(path)) if path.is_file() else None
    monkeypatch.setattr(importlib.util, 'find_spec', fake_find_spec)

    found = _find_hevolve_modules(layout.fake_file)()
    assert _sources(found) == {'asgi': 'pip', 'hart_intelligence_entry': 'clone'}


def test_the_clone_is_the_last_resort(layout, monkeypatch):
    monkeypatch.setattr(importlib.util, 'find_spec', lambda name: None)
    assert not layout.hartos.exists()
    found = _find_hevolve_modules(layout.fake_file)()
    assert _sources(found) == {m: 'clone' for m in MODULES}
