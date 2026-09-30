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
    # The card the gate shows on a skipped boot goes through HARTOS's
    # publish_event (the boundary): recorded here, never the real bus.
    cards = []
    rt = _types.ModuleType('integrations.social.realtime')
    rt.publish_event = lambda topic, data: cards.append((topic, data))
    monkeypatch.setitem(sys.modules, 'integrations.social.realtime', rt)
    monkeypatch.setattr(pi, '_ct2_card_shown', False)        # a fresh process
    pip_calls = []

    def set_pip(ok, msg):
        def _run_pip(args, progress_cb=None, **kw):
            pip_calls.append(list(args))
            return ok, msg
        monkeypatch.setattr(pi, '_run_pip', _run_pip)

    return _types.SimpleNamespace(set_pip=set_pip, pip_calls=pip_calls,
                                  build=build, tmp=tmp_path, cards=cards)


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


# ── The marker is not sticky (review of 16a10a30) ────────────────────────────
#
# One temporary failure (offline, index down, pip stall) must not switch GPU
# speech off for the life of a build; a source run (no build to update) must
# retry too; and a skipped boot must say so on a card, not in a log only.

def test_a_recorded_failure_expires_after_a_day(ct2_env, monkeypatch):
    ct2_env.set_pip(False, _PIP_FAIL)
    pi.install_gpu_ctranslate2()
    recorded_at = pi.time.time()
    monkeypatch.setattr(pi.time, 'time',
                        lambda: recorded_at + pi._CT2_FAILURE_TTL_S - 60)
    assert pi.should_install_gpu_ctranslate2() is False
    monkeypatch.setattr(pi.time, 'time',
                        lambda: recorded_at + pi._CT2_FAILURE_TTL_S + 1)
    assert pi.should_install_gpu_ctranslate2() is True


def test_a_marker_with_no_time_does_not_block(ct2_env):
    """Markers written before the expiry existed carry no at_epoch."""
    import json
    os.makedirs(os.path.dirname(pi._ct2_failure_marker_path()), exist_ok=True)
    with open(pi._ct2_failure_marker_path(), 'w') as fh:
        json.dump({'reason': 'x', 'at': '2026-09-28 04:00:00',
                   **pi._ct2_install_context()}, fh)
    assert pi.should_install_gpu_ctranslate2() is True


@pytest.mark.parametrize('msg', [
    # _run_pip's own words for an attempt that never ran pip
    'python-embed not found',
    "deferred: live modules ['ctranslate2'] in user-site",
])
def test_an_attempt_that_never_ran_pip_is_not_recorded(ct2_env, msg):
    ct2_env.set_pip(False, msg)
    pi.install_gpu_ctranslate2()
    assert not os.path.exists(pi._ct2_failure_marker_path())
    assert pi.should_install_gpu_ctranslate2() is True


# Review of e5351913 (REJECTED): leaving these unrecorded ran pip on every
# boot -- 6 of 6 simulated boots for a constraint refusal, 900 s each, and on
# an air-gapped box every boot.  Every attempt that ran pip is recorded; the
# 24 h expiry bounds a temporary one.
@pytest.mark.parametrize('msg', [
    _PIP_FAIL,                                   # no wheel for this platform
    'ERROR: Could not install packages due to an OSError: [Errno 28] '
    'No space left on device',                   # full disk
    "pip stalled — no output for 120s after 'nvidia-cudnn-cu12'. Check network / mirror.",
    'pip timed out after 900s',
    # offline: pip retries, then gives up
    "WARNING: Retrying (Retry(total=4)) after connection broken by "
    "'NewConnectionError(...: Failed to establish a new connection)'\n"
    "ERROR: Could not find a version that satisfies the requirement "
    "nvidia-cublas-cu12 (from versions: none)",
    'ERROR: Could not install packages due to an OSError: '
    "HTTPSConnectionPool(host='pypi.org', port=443): Read timed out.",
    # refused by HARTOS's own pins (the --constraint file): this build's call
    'ERROR: Cannot install ctranslate2 because these package versions have '
    'conflicting dependencies.\nThe conflict is caused by:\n'
    '    ctranslate2 4.6.0 depends on numpy>=2\n'
    '    The user requested (constraint) numpy<2.0.0,>=1.25.0',
])
def test_every_attempt_that_ran_pip_is_recorded(ct2_env, msg):
    ct2_env.set_pip(False, msg)
    pi.install_gpu_ctranslate2()
    assert os.path.isfile(pi._ct2_failure_marker_path())
    assert pi.should_install_gpu_ctranslate2() is False


def test_boots_after_an_offline_failure_run_pip_once_a_day(ct2_env, monkeypatch):
    """Six boots across a day on an air-gapped box: pip runs on the first and
    again only once the record has expired."""
    ct2_env.set_pip(False, 'pip timed out after 900s')
    t0 = pi.time.time()
    for hours in (0, 1, 5, 12, 23, 25):
        monkeypatch.setattr(pi.time, 'time', lambda h=hours: t0 + h * 3600)
        monkeypatch.setattr(pi, '_ct2_card_shown', False)      # a new process
        if pi.should_install_gpu_ctranslate2():
            pi.install_gpu_ctranslate2()
    assert len(ct2_env.pip_calls) == 2


def test_a_skipped_boot_shows_the_gpu_speech_off_card(ct2_env):
    ct2_env.set_pip(False, _PIP_FAIL)
    pi.install_gpu_ctranslate2()
    assert ct2_env.cards == []                   # the install reports itself

    assert pi.should_install_gpu_ctranslate2() is False
    assert len(ct2_env.cards) == 1
    topic, card = ct2_env.cards[0]
    assert topic == 'setup_progress'
    assert card['type'] == 'setup_progress'
    assert card['job_type'] == 'cuda_ctranslate2'
    assert card['complete'] is True
    assert card['message'].startswith('GPU speech is off: ')
    assert 'nvidia-cudnn-cu12==9.*' in card['message']
    # Only what will really happen: nothing retries on demand, and the gate
    # runs only at a start (main.py's warm-up, the first-run installer), so
    # the card names the next start after the record expires (24 h from a
    # failure just recorded); a Nunba that stays up does not retry.
    assert card['message'].endswith(
        'It will be tried again at the next start, after about 24 h.')
    assert 'automatically' not in card['message']
    assert 'AI setup' not in card['message']
    # SetupProgressCard reads a step whose message says 'failed' as a
    # finished, failed job: no spinner, and the dismiss control shows.
    assert 'failed' in card['message']


def test_the_card_is_shown_once_per_failure_not_every_boot(ct2_env, monkeypatch):
    ct2_env.set_pip(False, _PIP_FAIL)
    pi.install_gpu_ctranslate2()
    for _boot in range(3):
        monkeypatch.setattr(pi, '_ct2_card_shown', False)      # a new process
        assert pi.should_install_gpu_ctranslate2() is False
    assert len(ct2_env.cards) == 1

    # A new failure (after the record expired) is a new card.
    t0 = pi.time.time()
    monkeypatch.setattr(pi.time, 'time', lambda: t0 + pi._CT2_FAILURE_TTL_S + 1)
    monkeypatch.setattr(pi, '_ct2_card_shown', False)
    assert pi.should_install_gpu_ctranslate2() is True
    pi.install_gpu_ctranslate2()
    monkeypatch.setattr(pi, '_ct2_card_shown', False)
    assert pi.should_install_gpu_ctranslate2() is False
    assert len(ct2_env.cards) == 2


def test_the_card_is_never_shown_twice_in_one_boot(ct2_env, monkeypatch):
    """Even when the marker cannot record that it was shown."""
    ct2_env.set_pip(False, _PIP_FAIL)
    pi.install_gpu_ctranslate2()
    import core.file_cache as fc

    def refuse(*a, **k):
        raise OSError('read-only')

    monkeypatch.setattr(fc, 'atomic_json_write', refuse)
    assert pi.should_install_gpu_ctranslate2() is False
    assert pi.should_install_gpu_ctranslate2() is False       # llama first-run
    assert len(ct2_env.cards) == 1


def test_the_card_says_how_long_is_left(ct2_env, monkeypatch):
    ct2_env.set_pip(False, _PIP_FAIL)
    pi.install_gpu_ctranslate2()
    t0 = pi.time.time()
    monkeypatch.setattr(pi.time, 'time', lambda: t0 + 20 * 3600)
    assert pi.should_install_gpu_ctranslate2() is False
    assert ct2_env.cards[0][1]['message'].endswith(
        'at the next start, after about 4 h.')


def test_no_card_when_nothing_was_skipped(ct2_env, monkeypatch):
    assert pi.should_install_gpu_ctranslate2() is True       # will install
    monkeypatch.setattr(pi, 'is_cuda_ctranslate2', lambda: True)
    assert pi.should_install_gpu_ctranslate2() is False      # already usable
    assert ct2_env.cards == []


@pytest.mark.parametrize('build_id, promises_update', [
    ('source', False),
    ('build:abc', True),
])
def test_the_skip_says_when_it_is_tried_again(ct2_env, caplog, build_id,
                                              promises_update):
    ct2_env.build['id'] = build_id
    ct2_env.set_pip(False, _PIP_FAIL)
    pi.install_gpu_ctranslate2()
    caplog.clear()
    with caplog.at_level('WARNING', logger=pi.logger.name):
        assert pi.should_install_gpu_ctranslate2() is False
    said = ' '.join(r.getMessage() for r in caplog.records)
    assert 'tried again at the next start after about 24 h' in said
    assert 'AI setup' not in said
    assert ('after an update' in said) is promises_update


# ── The gate's own branches (review of 0f6171f1, P2) ─────────────────────────

def test_hartos_core_not_importable_reads_as_not_usable(monkeypatch, caplog):
    import core.subprocess_safe as ss
    ran = []
    monkeypatch.setattr(ss, 'run_bounded',
                        lambda cmd, timeout, **kw: ran.append(cmd) or _Result(0))
    monkeypatch.setitem(sys.modules, 'core.venv_paths', None)   # import raises
    with caplog.at_level('WARNING', logger=pi.logger.name):
        assert pi.is_cuda_ctranslate2() is False
    assert ran == []
    assert any('HARTOS core not importable' in r.getMessage()
               for r in caplog.records if r.levelname == 'WARNING')


def test_the_child_is_asked_for_this_platforms_libraries(monkeypatch, worker_python):
    """The real table, not a one-key stand-in: a lookup of another platform's
    key would ask for libraries this OS can never load."""
    table = pi._CT2_CUDA_LIBRARIES
    assert sys.platform in table and len(table) > 1
    assert len({tuple(v) for v in table.values()}) == len(table)
    import core.subprocess_safe as ss
    argv = []
    monkeypatch.setattr(ss, 'run_bounded',
                        lambda cmd, timeout, **kw: argv.append(list(cmd)) or _Result(0))
    assert pi.is_cuda_ctranslate2() is True
    assert argv[0][:2] == [worker_python, '-c']
    assert argv[0][3:] == list(table[sys.platform])


# ── After the install, the worker python reaches the CUDA runtime (P1) ───────
#
# install_gpu_ctranslate2 pip-installs nvidia-cublas-cu12 / nvidia-cudnn-cu12
# into ~/.nunba/site-packages/nvidia/{cublas,cudnn}/bin.  The worker (and the
# gate's child) run on python-embed, whose sitecustomize put only torch/lib on
# PATH.  Measured in review: with torch/lib off PATH and those dirs on disk,
# the gate read False ("Could not find module cublas64_12.dll"); with them on
# PATH, True.  So on a box whose torch/lib carries no cuBLAS the install
# succeeded and the gate still read False, and the boot installed again.

def _embed_hook_env(monkeypatch, tmp_path):
    """A home whose ~/.nunba/site-packages holds the installed nvidia dirs
    (stand-in DLLs), the embed's site-packages to write the generated hook
    into, and a fake ctranslate2 reporting one device."""
    import glob
    import shutil

    from scripts.rebuild_python_embed import write_sitecustomize
    home = tmp_path / 'home'
    user_sp = home / '.nunba' / 'site-packages'
    src = glob.glob(os.path.join(sys.base_prefix, 'DLLs', 'libffi*.dll'))[0]
    names, dirs = [], []
    for lib in ('cublas', 'cudnn'):
        d = user_sp / 'nvidia' / lib / 'bin'
        d.mkdir(parents=True)
        name = f'hart_standin_{lib}.dll'
        shutil.copy(src, d / name)
        names.append(name)
        dirs.append(str(d))
    embed_sp = tmp_path / 'python-embed' / 'Lib' / 'site-packages'
    embed_sp.mkdir(parents=True)
    ct2 = tmp_path / 'ct2'
    ct2.mkdir()
    monkeypatch.setenv('USERPROFILE', str(home))
    monkeypatch.setenv('HOME', str(home))
    monkeypatch.setattr(pi, '_CT2_CUDA_LIBRARIES', {sys.platform: tuple(names)})
    return {'hook': lambda: write_sitecustomize(str(embed_sp)),
            'embed_sp': str(embed_sp), 'ct2': _fake_ctranslate2(ct2, 1),
            'dirs': dirs, 'names': names, 'user_sp': user_sp}


@pytest.mark.skipif(sys.platform != 'win32',
                    reason="python-embed's hook wires Windows DLL dirs")
def test_after_the_install_the_gate_reads_usable_through_the_embed_hook(
        monkeypatch, tmp_path, worker_python):
    env = _embed_hook_env(monkeypatch, tmp_path)
    # Control: the same box without the hook cannot reach the libraries.
    monkeypatch.setenv('PYTHONPATH', env['ct2'])
    assert pi.is_cuda_ctranslate2() is False

    written = env['hook']()
    assert os.path.isfile(written)
    monkeypatch.setenv('PYTHONPATH', env['embed_sp'] + os.pathsep + env['ct2'])
    assert pi.is_cuda_ctranslate2() is True



@pytest.mark.skipif(sys.platform != 'win32',
                    reason="python-embed's hook wires Windows DLL dirs")
def test_the_installed_runtime_wins_over_another_copy_already_on_path(
        monkeypatch, tmp_path, worker_python):
    """A cuBLAS / cuDNN of the same name already on the system PATH (a CUDA
    Toolkit, another app's copy) must not shadow what the install put in
    ~/.nunba: the hook prepends the nvidia dirs.  The stand-in elsewhere on
    PATH here is not a loadable DLL, so reaching it first reads False."""
    env = _embed_hook_env(monkeypatch, tmp_path)
    elsewhere = tmp_path / 'system_cuda_bin'
    elsewhere.mkdir()
    for name in env['names']:
        (elsewhere / name).write_bytes(b'not a dll')
    monkeypatch.setenv('PATH', str(elsewhere) + os.pathsep + os.environ['PATH'])
    env['hook']()
    monkeypatch.setenv('PYTHONPATH', env['embed_sp'] + os.pathsep + env['ct2'])
    assert pi.is_cuda_ctranslate2() is True

@pytest.mark.skipif(sys.platform != 'win32',
                    reason="python-embed's hook wires Windows DLL dirs")
def test_the_embed_hook_serves_both_windows_loaders_and_keeps_torch_first(
        monkeypatch, tmp_path, worker_python):
    """PATH serves ctranslate2's plain LoadLibrary; add_dll_directory serves
    loaders that search only the default dirs (ctypes' own default).  A
    torch/lib that already works keeps its place ahead of the nvidia dirs, so
    a box that decodes today resolves the same DLLs after this change."""
    import json
    import subprocess
    env = _embed_hook_env(monkeypatch, tmp_path)
    torch_lib = env['user_sp'] / 'torch' / 'lib'
    torch_lib.mkdir(parents=True)
    env['hook']()
    monkeypatch.setenv('PYTHONPATH', env['embed_sp'])
    child = (
        "import ctypes, json, os, sys\n"
        "path = os.environ['PATH'].split(os.pathsep)\n"
        "ok = []\n"
        "for n in sys.argv[1:]:\n"
        "    try:\n"
        "        ctypes.CDLL(n)\n"
        "        ok.append(n)\n"
        "    except OSError:\n"
        "        pass\n"
        "print(json.dumps({'path': path, 'default_dirs_loaded': ok}))\n"
    )
    out = subprocess.run([worker_python, '-c', child, *env['names']],
                         capture_output=True, text=True, timeout=60)
    assert out.returncode == 0, out.stderr
    got = json.loads(out.stdout.strip().splitlines()[-1])
    norm = [os.path.normcase(os.path.normpath(p)) for p in got['path']]
    want = [os.path.normcase(os.path.normpath(d)) for d in env['dirs']]
    tl = os.path.normcase(os.path.normpath(str(torch_lib)))
    assert tl in norm
    for d in want:
        assert d in norm, (d, norm[:5])
        assert norm.index(tl) < norm.index(d)
    assert got['default_dirs_loaded'] == env['names']


def test_every_build_writes_the_current_embed_hook(monkeypatch, tmp_path):
    """build.py rebuilds python-embed only when EMBED_DEPS change (Gate A), so
    a hook change alone would ship the snapshot's old hook.  The build writes
    the generated hook into the embed on every run, before the ACL pass."""
    # Order is load-bearing: importing scripts.build is what puts scripts/ on
    # sys.path, and `deps` only resolves after that.  isort would hoist it.
    from scripts import build  # noqa: I001
    from scripts import rebuild_python_embed as rpe
    import deps
    root = tmp_path / 'repo'
    (root / 'scripts').mkdir(parents=True)
    embed_sp = root / 'python-embed' / 'Lib' / 'site-packages'
    embed_sp.mkdir(parents=True)
    (embed_sp / 'sitecustomize.py').write_text('# an old snapshot hook\n')
    (root / 'python-embed.hash').write_text('HASH')
    monkeypatch.setattr(build, '__file__', str(root / 'scripts' / 'build.py'))
    monkeypatch.setattr(deps, 'compute_embed_deps_hash', lambda: 'HASH')
    monkeypatch.setattr(deps, 'missing_embed_packages', lambda sp: [])
    monkeypatch.chdir(tmp_path)

    class _Stop(Exception):
        pass

    def acl(path):
        raise _Stop(path)

    monkeypatch.setattr(build, 'normalize_embed_acl', acl)
    with pytest.raises(_Stop):
        build.build_windows(sys.executable)
    with open(embed_sp / 'sitecustomize.py', encoding='utf-8') as fh:
        assert fh.read() == rpe.SITECUSTOMIZE_SOURCE
