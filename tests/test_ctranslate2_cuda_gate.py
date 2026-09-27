"""is_cuda_ctranslate2 asks the worker's interpreter, and asks the right question.

Live, 2026-09-25..27 (gui_app.log, RTX 3070 box), every boot:
    "STT: GPU detected -- installing CUDA ctranslate2 for GPU whisper..."
    "install deferred: ['ctranslate2'] are loaded in this process AND present
     in user-site"
    "CUDA ctranslate2 install failed (STT stays on CPU): deferred: ..."
Two defects in the gate that guards that install (main.py, llama_installer):
  * it tested ``'cuda' in ctranslate2.get_supported_compute_types('cuda')``.
    A set of compute TYPES never holds the device name (measured on the
    installed python-embed: {'bfloat16', 'float16', ..., 'int8_float32'},
    'cuda' in it False, get_cuda_device_count() 1), so it read "no CUDA" on
    every box and the install was attempted on every boot;
  * it imported ctranslate2 into this process to ask, which is exactly what
    makes _run_pip defer an install of ctranslate2.

So the question now goes to the interpreter the STT worker runs on
(core.venv_paths.venv_creator_python), in a child process: a CUDA device, and
the cuBLAS / cuDNN libraries loadable the way ctranslate2 loads them.

Behavioural: the real function; the child is either mocked at run_bounded (the
process boundary) or run for real against a fake ctranslate2 on PYTHONPATH.
"""
import os
import sys
import textwrap

import pytest

from tts import package_installer as pi


class _Result:
    def __init__(self, returncode, stdout='', stderr='', timed_out=False):
        self.returncode = returncode
        self.stdout, self.stderr, self.timed_out = stdout, stderr, timed_out


@pytest.fixture
def worker_python(monkeypatch):
    import core.venv_paths as vp
    monkeypatch.setattr(vp, 'venv_creator_python', lambda: sys.executable)
    return sys.executable


def test_the_gate_never_imports_ctranslate2_into_this_process(monkeypatch, worker_python):
    seen = []

    class _Recorder:
        def find_spec(self, fullname, path=None, target=None):
            if fullname.split('.')[0] == 'ctranslate2':
                seen.append(fullname)
            return None

    monkeypatch.delitem(sys.modules, 'ctranslate2', raising=False)
    monkeypatch.setattr(sys, 'meta_path', [_Recorder()] + sys.meta_path)
    import core.subprocess_safe as ss
    monkeypatch.setattr(ss, 'run_bounded', lambda cmd, timeout, **kw: _Result(0))

    assert pi.is_cuda_ctranslate2() is True
    assert seen == [], 'importing ctranslate2 here makes _run_pip defer its install'


def test_the_worker_python_answers_and_its_exit_code_is_the_answer(monkeypatch, worker_python):
    calls = []
    import core.subprocess_safe as ss

    def _run(rc):
        def run_bounded(cmd, timeout, **kw):
            calls.append((list(cmd), timeout))
            return _Result(rc, stderr='OSError: cublas64_12.dll')
        return run_bounded

    monkeypatch.setattr(ss, 'run_bounded', _run(0))
    assert pi.is_cuda_ctranslate2() is True
    monkeypatch.setattr(ss, 'run_bounded', _run(1))
    assert pi.is_cuda_ctranslate2() is False
    for cmd, timeout in calls:
        assert cmd[:2] == [worker_python, '-c']
        assert timeout > 0


@pytest.mark.parametrize('failure', ['timeout', 'spawn'])
def test_a_child_that_cannot_answer_reads_as_not_usable(monkeypatch, worker_python, failure):
    import core.subprocess_safe as ss

    def run_bounded(cmd, timeout, **kw):
        if failure == 'spawn':
            raise OSError('cannot spawn')
        return _Result(-1, timed_out=True)

    monkeypatch.setattr(ss, 'run_bounded', run_bounded)
    assert pi.is_cuda_ctranslate2() is False


def test_no_worker_python_reads_as_not_usable(monkeypatch):
    import core.subprocess_safe as ss
    import core.venv_paths as vp
    monkeypatch.setattr(vp, 'venv_creator_python', lambda: None)
    monkeypatch.setattr(ss, 'run_bounded', lambda cmd, timeout, **kw: _Result(0))
    assert pi.is_cuda_ctranslate2() is False


# ── the child for real, against a fake ctranslate2 ───────────────────────────

def _fake_ctranslate2(tmp_path, device_count):
    """A ctranslate2 that reports ``device_count`` devices and, like the real
    one, every compute type EXCEPT the device name."""
    (tmp_path / 'ctranslate2.py').write_text(textwrap.dedent(f'''
        def get_cuda_device_count():
            return {device_count}
        def get_supported_compute_types(device):
            return {{'float16', 'int8', 'int8_float16', 'float32'}}
    '''))
    return str(tmp_path)


def test_real_child_no_cuda_device_is_not_usable(monkeypatch, tmp_path, worker_python):
    monkeypatch.setenv('PYTHONPATH', _fake_ctranslate2(tmp_path, 0))
    assert pi.is_cuda_ctranslate2() is False


def test_real_child_a_device_without_cublas_is_not_usable(monkeypatch, tmp_path, worker_python):
    # The live case: a CUDA device is there, the cuBLAS library is not
    # reachable.  A PATH holding only an empty dir makes the library
    # unreachable here the same way.
    empty = tmp_path / 'empty'
    empty.mkdir()
    monkeypatch.setenv('PYTHONPATH', _fake_ctranslate2(tmp_path, 1))
    monkeypatch.setenv('PATH', str(empty))
    monkeypatch.setenv('LD_LIBRARY_PATH', str(empty))
    assert pi.is_cuda_ctranslate2() is False


@pytest.fixture
def loadable_libraries(monkeypatch, tmp_path):
    """Stand-ins for the CUDA libraries that DO load (the test box need not
    have CUDA).  On Windows the stand-in is reachable ONLY through PATH --
    where torch/lib puts cuBLAS for the worker -- so the child must search
    PATH the way ctranslate2's own load does."""
    if sys.platform == 'win32':
        import glob
        import shutil
        libdir = tmp_path / 'libdir'
        libdir.mkdir()
        src = glob.glob(os.path.join(sys.base_prefix, 'DLLs', 'libffi*.dll'))[0]
        shutil.copy(src, libdir / 'hart_standin_cublas.dll')
        monkeypatch.setenv('PATH', str(libdir) + os.pathsep + os.environ['PATH'])
        stand_in = 'hart_standin_cublas.dll'
    else:
        import ctypes.util
        stand_in = ctypes.util.find_library('c')
    monkeypatch.setattr(pi, '_CT2_CUDA_LIBRARIES', {sys.platform: (stand_in,)})


def test_real_child_a_device_and_every_library_is_usable(
        monkeypatch, tmp_path, worker_python, loadable_libraries):
    monkeypatch.setenv('PYTHONPATH', _fake_ctranslate2(tmp_path, 1))
    assert pi.is_cuda_ctranslate2() is True


def test_real_child_libraries_without_a_device_are_not_usable(
        monkeypatch, tmp_path, worker_python, loadable_libraries):
    monkeypatch.setenv('PYTHONPATH', _fake_ctranslate2(tmp_path, 0))
    assert pi.is_cuda_ctranslate2() is False
