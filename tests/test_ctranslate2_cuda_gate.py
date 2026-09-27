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


# ── "Never raises": anything that stops the answer reads False, and says why ──

@pytest.mark.parametrize('where', ['worker_python', 'run_bounded', 'result'])
def test_any_failure_to_answer_reads_as_not_usable_and_is_logged(
        monkeypatch, caplog, where):
    """The docstring promises "Never raises"; it caught only ImportError and
    OSError.  This gate runs on the boot path, so it must hold that."""
    import core.subprocess_safe as ss
    import core.venv_paths as vp

    def boom(*a, **k):
        raise RuntimeError(f'broken {where}')

    class _NoAttrs:
        pass

    monkeypatch.setattr(vp, 'venv_creator_python',
                        boom if where == 'worker_python' else (lambda: sys.executable))
    if where == 'run_bounded':
        monkeypatch.setattr(ss, 'run_bounded', boom)
    elif where == 'result':
        monkeypatch.setattr(ss, 'run_bounded', lambda cmd, timeout, **kw: _NoAttrs())
    else:
        monkeypatch.setattr(ss, 'run_bounded', lambda cmd, timeout, **kw: _Result(0))
    with caplog.at_level('WARNING', logger=pi.logger.name):
        assert pi.is_cuda_ctranslate2() is False
    said = ' '.join(r.getMessage() for r in caplog.records if r.levelname == 'WARNING')
    assert 'is_cuda_ctranslate2' in said
    if where != 'result':
        assert f'broken {where}' in said


# ── An install that cannot succeed is not retried every boot ─────────────────
#
# main.py's TTS warmup (every boot) and llama_installer.install_on_first_run
# ran `if has_nvidia_gpu() and not is_cuda_ctranslate2(): install_gpu_
# ctranslate2(...)`.  On a box where the CUDA libraries can never install
# (offline, pip failure, CUDA major mismatch, full disk) that re-ran pip for
# nvidia-cublas / cudnn on every boot and failed each time.  Now a failed
# install leaves a marker; the automatic callers skip, with a WARNING naming
# the reason, until the build or the worker interpreter changes; the setup
# wizard (the user asking) always retries.

@pytest.fixture
def ct2_env(monkeypatch, tmp_path):
    """install_gpu_ctranslate2 with its boundaries stubbed: an NVIDIA GPU, the
    file lock, pip, and the marker's home under tmp_path."""
    import types as _types
    monkeypatch.setattr(pi, '_INSTALL_LOCK_DIR', str(tmp_path / 'nunba'))
    monkeypatch.setattr(pi, '_acquire_file_lock', lambda name: True)
    monkeypatch.setattr(pi, '_release_file_lock', lambda name: None)
    monkeypatch.setattr(pi, 'has_nvidia_gpu', lambda: True)
    vm = _types.ModuleType('integrations.service_tools.vram_manager')
    vm.vram_manager = _types.SimpleNamespace(
        detect_gpu=lambda: {'cuda_available': True})
    monkeypatch.setitem(sys.modules, 'integrations.service_tools.vram_manager', vm)
    monkeypatch.setattr(pi, 'ensure_user_site_on_path', lambda: None)
    monkeypatch.setattr(pi, 'get_user_site_packages', lambda: str(tmp_path / 'site'))
    monkeypatch.setattr(pi, '_invalidate_import_cache', lambda: None)
    monkeypatch.setattr(pi, 'is_cuda_ctranslate2', lambda: False)
    build = {'id': 'build-A'}
    monkeypatch.setattr(pi, '_installed_build_id', lambda: build['id'])
    pip_calls = []

    def set_pip(ok, msg):
        def _run_pip(args, progress_cb=None, **kw):
            pip_calls.append(list(args))
            return ok, msg
        monkeypatch.setattr(pi, '_run_pip', _run_pip)

    return _types.SimpleNamespace(set_pip=set_pip, pip_calls=pip_calls,
                                  build=build, tmp=tmp_path)


_PIP_FAIL = ("ERROR: Could not find a version that satisfies the requirement "
             "nvidia-cudnn-cu12==9.* (from versions: none)")


def test_a_failed_install_is_not_retried_by_the_boot_gate(ct2_env, caplog):
    ct2_env.set_pip(False, _PIP_FAIL)
    assert pi.should_install_gpu_ctranslate2() is True       # nothing recorded yet
    ok, _ = pi.install_gpu_ctranslate2()
    assert ok is False
    assert os.path.isfile(pi._ct2_failure_marker_path())

    caplog.clear()                      # only the gate's own skip WARNING
    with caplog.at_level('WARNING', logger=pi.logger.name):
        assert pi.should_install_gpu_ctranslate2() is False
    said = [r.getMessage() for r in caplog.records if r.levelname == 'WARNING']
    assert len(said) == 1, said
    assert 'nvidia-cudnn-cu12==9.*' in said[0]
    assert pi._ct2_failure_marker_path() in said[0]


def test_a_new_build_retries(ct2_env):
    ct2_env.set_pip(False, _PIP_FAIL)
    pi.install_gpu_ctranslate2()
    assert pi.should_install_gpu_ctranslate2() is False
    ct2_env.build['id'] = 'build-B'
    assert pi.should_install_gpu_ctranslate2() is True


def test_another_worker_interpreter_retries(ct2_env, monkeypatch):
    import core.venv_paths as vp
    monkeypatch.setattr(vp, 'venv_creator_python', lambda: 'C:/old/python.exe')
    ct2_env.set_pip(False, _PIP_FAIL)
    pi.install_gpu_ctranslate2()
    assert pi.should_install_gpu_ctranslate2() is False
    monkeypatch.setattr(vp, 'venv_creator_python', lambda: 'C:/new/python.exe')
    assert pi.should_install_gpu_ctranslate2() is True


def test_the_user_asking_retries_and_a_success_clears_the_marker(ct2_env):
    ct2_env.set_pip(False, _PIP_FAIL)
    pi.install_gpu_ctranslate2()
    assert pi.should_install_gpu_ctranslate2() is False

    ct2_env.set_pip(True, 'Successfully installed nvidia-cudnn-cu12-9.1')
    ok, _ = pi.install_gpu_ctranslate2()          # the wizard calls it directly
    assert ok is True
    assert len(ct2_env.pip_calls) == 2
    assert not os.path.exists(pi._ct2_failure_marker_path())
    assert pi.should_install_gpu_ctranslate2() is True


def test_an_install_that_was_deferred_leaves_no_marker(ct2_env):
    ct2_env.set_pip(False, "deferred: live modules ['ctranslate2'] in user-site")
    pi.install_gpu_ctranslate2()
    assert not os.path.exists(pi._ct2_failure_marker_path())


def test_a_lock_held_elsewhere_leaves_no_marker(ct2_env, monkeypatch):
    monkeypatch.setattr(pi, '_acquire_file_lock', lambda name: False)
    ct2_env.set_pip(False, _PIP_FAIL)
    pi.install_gpu_ctranslate2()
    assert ct2_env.pip_calls == []
    assert not os.path.exists(pi._ct2_failure_marker_path())


def test_the_gate_is_false_when_the_runtime_is_already_usable(ct2_env, monkeypatch):
    ct2_env.set_pip(False, _PIP_FAIL)
    pi.install_gpu_ctranslate2()
    monkeypatch.setattr(pi, 'is_cuda_ctranslate2', lambda: True)
    assert pi.should_install_gpu_ctranslate2() is False
    assert not os.path.exists(pi._ct2_failure_marker_path())   # stale record dropped


def test_the_gate_is_false_without_an_nvidia_gpu(ct2_env, monkeypatch):
    monkeypatch.setattr(pi, 'has_nvidia_gpu', lambda: False)
    assert pi.should_install_gpu_ctranslate2() is False


def test_an_unreadable_marker_does_not_block(ct2_env):
    os.makedirs(os.path.dirname(pi._ct2_failure_marker_path()), exist_ok=True)
    with open(pi._ct2_failure_marker_path(), 'w') as fh:
        fh.write('{not json')
    assert pi.should_install_gpu_ctranslate2() is True


def test_the_gate_never_raises(ct2_env, monkeypatch, caplog):
    def boom():
        raise RuntimeError('nvidia-smi exploded')
    monkeypatch.setattr(pi, 'has_nvidia_gpu', boom)
    with caplog.at_level('WARNING', logger=pi.logger.name):
        assert pi.should_install_gpu_ctranslate2() is False
    assert any('nvidia-smi exploded' in r.getMessage() for r in caplog.records)


def test_the_build_id_is_the_installed_build_info(monkeypatch, tmp_path):
    exe = tmp_path / 'Nunba.exe'
    exe.write_text('')
    monkeypatch.setattr(sys, 'frozen', True, raising=False)
    monkeypatch.setattr(sys, 'executable', str(exe))
    (tmp_path / 'BUILD_INFO.txt').write_text('BUILD_SHA=aaa\n')
    first = pi._installed_build_id()
    (tmp_path / 'BUILD_INFO.txt').write_text('BUILD_SHA=bbb\n')
    assert pi._installed_build_id() != first


def test_first_run_install_skips_a_recorded_failure(ct2_env, monkeypatch):
    """llama_installer.install_on_first_run goes through the same gate."""
    from llama import llama_installer as li
    ct2_env.set_pip(False, _PIP_FAIL)
    pi.install_gpu_ctranslate2()
    calls = []
    monkeypatch.setattr(pi, 'install_gpu_ctranslate2',
                        lambda **kw: calls.append(kw) or (False, 'x'))

    class _Inst:
        def install_llama_cpp(self, cb):
            return True

        def download_model(self, preset, cb):
            return False

    monkeypatch.setattr(li, 'LlamaInstaller', _Inst)
    li.install_on_first_run()
    assert calls == []
    ct2_env.build['id'] = 'build-B'
    li.install_on_first_run()
    assert len(calls) == 1
