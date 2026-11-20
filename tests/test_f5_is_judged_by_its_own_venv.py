"""F5 is judged by the venv it installs into.

Review of Nunba 06dcbb3c (2026-11-17): F5 now installs into its own venv,
'f5_tts', but the check that decides whether F5 can run still used Nunba's
name 'f5'.  The venv plans are keyed by the HARTOS registry id, so
_is_venv_backend('f5') was False and _can_run_backend('f5') imported f5_tts
in the main interpreter, where it never imports, and cached False.  So:
  - TTSEngine never picked F5;
  - TTSLoader.load reported "f5 packages missing" right after a successful
    download;
  - the setup page judged F5 by its empty main-interpreter plan ("installed");
  - every later auto-install pass found F5 "not runnable", installed it again
    and played its test clip aloud again, because a passed handshake clears
    the failed-install latch.

Pinned here:
  - an engine name resolves to its registry id one way
    (package_installer.registry_engine_id);
  - 'f5' is a venv engine and is asked of the 'f5_tts' venv, never of the
    main interpreter;
  - an F5 that installed and passed its handshake is not installed again and
    its test clip is not played again;
  - a venv install drops the "cannot run" answers cached before it;
  - TTSLoader.load starts an engine the install gate finds runnable;
  - the setup page judges F5 by its venv;
  - F5's weights are fetched whether asked as 'f5' or 'f5_tts';
  - the synth hand-off asks the 'f5_tts' venv before starting F5;
  - a venv engine with no plan is told what to do and nothing more.

Nothing real is installed, downloaded, probed, played or locked: the venv
layer, the main-interpreter probe, the weights download, the file lock, the
handshake, the synth worker and the background thread are all stand-ins.
"""
import sys
import threading
import types
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

import tts._torch_probe as torch_probe
import tts.backend_venv as backend_venv
import tts.package_installer as pi
from tts import tts_engine as te

PLAN = ['torchaudio', 'f5-tts==1.1.7']


class _ThreadingRunNow:
    """The threading module as tts_engine sees it, except that a thread
    started for a background install runs at once, in this thread."""

    def __getattr__(self, name):
        return getattr(threading, name)

    class Thread:
        def __init__(self, target=None, **_kwargs):
            self._target = target

        def start(self):
            self._target()


@pytest.fixture
def machine(monkeypatch):
    """A desktop with a GPU where F5 is registered as HARTOS declares it: its
    own venv, 'f5_tts'.  Records every venv probe, main-interpreter probe,
    venv install and handshake."""
    seen = SimpleNamespace(installed=set(), venv_asked=[], main_asked=[],
                           venv_filled=[], handshakes=[])
    registry = {'f5_tts': SimpleNamespace(
        install_target='venv', required_package='f5_tts',
        tool_module=None, tool_worker_attr='_tool')}

    # The registry, as both modules read it.
    monkeypatch.setattr(pi, '_hartos_engine_registry', lambda: registry)
    monkeypatch.setattr(te, '_get_engine_registry', lambda: registry)
    monkeypatch.setattr(pi, 'BACKEND_VENV_PACKAGES', {'f5_tts': list(PLAN)})
    monkeypatch.setattr(pi, 'BACKEND_PACKAGES', {'f5': [], 'f5_tts': [], 'piper': []})
    monkeypatch.setattr(pi, 'is_package_installed', lambda name: False)

    # The two places "can it run" can be asked.
    def is_venv_healthy(name, probe_module=None):
        seen.venv_asked.append((name, probe_module))
        return name in seen.installed

    def check_backend_runnable(backend, required_pkg):
        seen.main_asked.append((backend, required_pkg))
        return False   # f5_tts never imports in the main interpreter

    monkeypatch.setattr(backend_venv, 'is_venv_healthy', is_venv_healthy)
    monkeypatch.setattr(torch_probe, 'check_backend_runnable', check_backend_runnable)

    # The install: venv, pip, weights, lock and progress cards.
    def install_into_venv(name, packages):
        seen.venv_filled.append((name, list(packages)))
        seen.installed.add(name)
        return True, f'installed {len(packages)} packages'

    held = set()

    def acquire(name):
        if name in held:
            return False
        held.add(name)
        return True

    monkeypatch.setattr(backend_venv, 'ensure_venv',
                        lambda name: f'C:/venvs/{name}/Scripts/python.exe')
    monkeypatch.setattr(backend_venv, 'install_into_venv', install_into_venv)
    monkeypatch.setattr(pi, '_acquire_file_lock', acquire)
    monkeypatch.setattr(pi, '_release_file_lock', held.discard)
    monkeypatch.setattr(pi, '_apply_post_install_patches', lambda backend: None)
    monkeypatch.setattr(pi, '_download_model_weights',
                        lambda backend, progress_cb=None: (True, 'weights ok'))
    monkeypatch.setattr(pi, 'make_chat_progress_callback',
                        lambda **_kw: (lambda message: None))
    monkeypatch.setattr(sys, 'path', list(sys.path))   # the cache reset may add to it

    # The handshake that plays a test clip aloud.
    handshake = types.ModuleType('tts.tts_handshake')

    def run_handshake(engine, backend, lang=None, timeout_s=60,
                      broadcast=True, play_audio=True, **_kw):
        seen.handshakes.append((backend, play_audio))
        return SimpleNamespace(ok=True, n_bytes=48000, err='', elapsed_s=1.0)

    handshake.run_handshake = run_handshake
    verified = types.ModuleType('tts.verified_synth')
    verified.Result = lambda **kw: SimpleNamespace(**kw)
    monkeypatch.setitem(sys.modules, 'tts.tts_handshake', handshake)
    monkeypatch.setitem(sys.modules, 'tts.verified_synth', verified)

    # The engine: GPU present, room for F5, CUDA known to work, class-wide
    # state as this test's own copies, background installs run at once.
    monkeypatch.setattr(te, 'threading', _ThreadingRunNow())
    monkeypatch.setattr(te, '_get_engine_capabilities', lambda b=None: {'vram_gb': 2.5})
    monkeypatch.setattr(te.TTSEngine, '_ensure_hw_detected', lambda self: None)
    monkeypatch.setattr(te.TTSEngine, '_vram_allows', lambda self, b: True)
    monkeypatch.setattr(te.TTSEngine, '_import_check_cache', {'_torch_cuda': True})
    monkeypatch.setattr(te.TTSEngine, '_auto_install_failed', set())
    monkeypatch.setattr(te.TTSEngine, '_auto_install_pending', set())

    eng = te.TTSEngine.__new__(te.TTSEngine)
    eng._language = 'en'
    eng._backends = {}
    eng._active_backend = te.BACKEND_NONE
    eng._demoted_backends = set()
    eng._demotion_meta = {}
    eng._consecutive_failures = {}
    eng.has_gpu = True
    eng._hw_detected = True
    seen.engine = eng

    pi._installing.clear()
    yield seen
    pi._installing.clear()


# ── one way to name an engine ────────────────────────────────────────

def test_an_engine_name_resolves_to_its_registry_id_one_way():
    assert pi.registry_engine_id('f5') == 'f5_tts'
    assert pi.registry_engine_id('chatterbox_multilingual') == 'chatterbox_ml'
    assert pi.registry_engine_id('f5_tts') == 'f5_tts'
    assert pi.registry_engine_id('indic_parler') == 'indic_parler'


# ── whether F5 can run ───────────────────────────────────────────────

def test_f5_by_its_nunba_name_is_an_engine_with_its_own_venv(machine):
    assert te._is_venv_backend('f5') is True


def test_the_registry_name_and_a_main_interpreter_engine_keep_their_answers(machine):
    assert te._is_venv_backend('f5_tts') is True
    assert te._is_venv_backend('piper') is False


def test_whether_f5_can_run_is_asked_of_the_f5_tts_venv_never_the_main_interpreter(machine):
    machine.installed.add('f5_tts')
    assert machine.engine._can_run_backend('f5') is True
    assert machine.venv_asked == [('f5_tts', 'f5_tts')]
    assert machine.main_asked == []


def test_an_installed_f5_whose_handshake_passed_is_not_installed_or_played_again(machine):
    eng = machine.engine
    # Not installed yet: one install starts and its test clip plays once.
    assert eng._try_auto_install_backend('f5') is False
    assert machine.venv_filled == [('f5_tts', PLAN)]
    assert machine.handshakes == [('f5', True)]
    # The next pass (PASS 2, TTSLoader.load) finds it runnable and stops there.
    assert eng._try_auto_install_backend('f5') is True
    assert machine.venv_filled == [('f5_tts', PLAN)]
    assert machine.handshakes == [('f5', True)]
    assert machine.main_asked == []


def test_a_venv_install_drops_the_cannot_run_answer_cached_before_it(machine):
    te.TTSEngine._import_check_cache['venv:f5'] = False   # judged before the install
    ok, msg = pi.install_backend_full('f5')
    assert ok is True, msg
    assert 'venv:f5' not in te.TTSEngine._import_check_cache


# ── TTSLoader.load ───────────────────────────────────────────────────

def _f5_entry():
    from models.catalog import ModelEntry
    return ModelEntry(id='tts-f5-tts', name='F5-TTS', model_type='tts',
                      files={'package': 'f5_tts'}, repo_id='SWivid/F5-TTS',
                      disk_gb=2.0, capabilities={})


def _load(can_run_answers, gate_answer):
    from models.orchestrator import TTSLoader
    loader = TTSLoader()
    entry = _f5_entry()
    started = []
    worker = SimpleNamespace(_get_or_start=lambda: started.append(True))
    engine = MagicMock()
    engine._can_run_backend.side_effect = list(can_run_answers)
    engine._try_auto_install_backend.return_value = gate_answer
    with patch('tts.tts_engine.TTSEngine', return_value=engine), \
            patch.object(loader, '_get_tool_worker', return_value=worker):
        result = loader.load(entry, 'gpu')
    return result, entry, started, engine


def test_a_load_whose_install_gate_finds_f5_runnable_starts_it():
    # The cached answer predates the download; the gate's live probe says runnable.
    result, entry, started, engine = _load([False, True], gate_answer=True)
    assert result is True, entry.error
    assert entry.error is None
    assert started == [True]
    engine._try_auto_install_backend.assert_called_once_with('f5')


def test_a_load_whose_install_gate_starts_an_install_reports_it_and_starts_nothing():
    result, entry, started, engine = _load([False], gate_answer=False)
    assert result is False
    assert entry.error == 'f5 packages missing'
    assert started == []
    assert engine._can_run_backend.call_count == 1


# ── the setup page ───────────────────────────────────────────────────

def test_the_setup_page_reports_an_f5_not_set_up_as_not_installed_with_its_plan_missing(machine):
    status = pi.get_backend_status()['f5']
    assert status['installed'] is False
    assert status['packages_missing'] == PLAN
    assert status.get('venv_backed') is True


def test_the_setup_page_reports_an_installed_f5_by_the_f5_tts_venv(machine):
    machine.installed.add('f5_tts')
    status = pi.get_backend_status()['f5']
    assert status['installed'] is True
    assert status.get('venv_backed') is True
    assert ('f5', None) not in machine.venv_asked


# ── F5's weights ─────────────────────────────────────────────────────

@pytest.fixture
def hub(monkeypatch):
    fetched = []
    fake = types.ModuleType('huggingface_hub')
    fake.snapshot_download = lambda repo_id, **_kw: fetched.append(repo_id)
    monkeypatch.setitem(sys.modules, 'huggingface_hub', fake)
    monkeypatch.setattr(pi, '_is_hf_model_cached', lambda model_id: False)
    return fetched


def test_f5_weights_are_fetched_when_asked_by_the_registry_id(hub):
    ok, msg = pi._download_model_weights('f5_tts')
    assert ok is True, msg
    assert hub == ['SWivid/F5-TTS']


def test_f5_weights_are_still_fetched_when_asked_by_the_nunba_name(hub):
    ok, msg = pi._download_model_weights('f5')
    assert ok is True, msg
    assert hub == ['SWivid/F5-TTS']


# ── the synth hand-off ───────────────────────────────────────────────

@pytest.fixture
def hand_off(machine, monkeypatch, tmp_path):
    spoken = []

    class _Worker:
        """The subprocess adapter's place: no worker process starts."""

        def __init__(self, engine_id):
            self.engine_id = engine_id

        def synthesize(self, text, output_path=None, language=None, **_kw):
            spoken.append(self.engine_id)
            with open(output_path, 'wb') as fh:
                fh.write(b'\0' * 20000)
            return output_path

    class _SilentPiper:
        def synthesize(self, *_a, **_kw):
            spoken.append('piper')
            return None

    monkeypatch.setattr(te, '_SubprocessTTSBackend', _Worker)
    monkeypatch.setattr(te, '_get_lang_preference', lambda language: [te.BACKEND_F5])
    monkeypatch.setattr(te, '_capable_backends_for',
                        lambda language: frozenset({te.BACKEND_F5, te.BACKEND_PIPER}))
    machine.engine._backends = {te.BACKEND_PIPER: _SilentPiper()}
    out = str(tmp_path / 'line.wav')
    return machine, spoken, out


def test_the_hand_off_starts_f5_when_its_f5_tts_venv_is_healthy(hand_off):
    machine, spoken, out = hand_off
    machine.installed.add('f5_tts')
    assert machine.engine._synthesize_with_fallback('Hello there', out, None, 'en') == out
    assert spoken == ['f5_tts']


def test_the_hand_off_does_not_start_f5_while_its_f5_tts_venv_is_missing(hand_off):
    machine, spoken, out = hand_off
    machine.engine._synthesize_with_fallback('Hello there', out, None, 'en')
    assert 'f5_tts' not in spoken


# ── a venv engine with no plan ───────────────────────────────────────

def test_a_venv_engine_with_no_plan_is_told_to_get_one_in_the_registry(machine, monkeypatch):
    monkeypatch.setattr(pi, 'BACKEND_VENV_PACKAGES', {})
    ok, msg = pi.install_backend_packages('f5')
    assert ok is False
    assert 'nothing was installed' in msg
    assert 'pip_install_plan in the HARTOS engine registry' in msg
    assert 'Set it up by its HARTOS engine id' not in msg
