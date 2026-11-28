"""The active voice is pinned under the name HARTOS's lifecycle manager
tracks it by, so the voice spoken last outlives its worker's idle timer.

WHAT WENT WRONG (live walk, 23 Nov 2026, installed Nunba, local 4B)
  set_language pinned the active voice (J214) as 'tts_mms_tts', its VRAM
  budget name: "J214: pinned active TTS 'tts_mms_tts' (pressure_evict_only=
  True, tracked=False)".  The lifecycle tracks the voice as 'tts-mms-tts'
  (its catalog id), so the pin was a hint nothing read, and the mms_tts
  worker stopped itself after 300 s idle (17:03:27).  A voice the boot
  warm-up started was cold again five minutes later.

THE RULE
  TTSEngine._get_lifecycle_name names the voice by tts_router's one rule
  (_engine_id_to_catalog_id), the name the orchestrator registers it by and
  the worker's idle timer looks its pin up by.  The voice spoken last keeps
  its worker through idle time; the voice it leaves does not, and memory
  pressure still ends the hold.  Piper (no worker) is never pinned.

Real TTSEngine.set_language / _pin_active_tts_backend, the real HARTOS
ModelLifecycleManager, and the real mms_tts ToolWorker object; stand-ins
only for its worker process, the pressure readings and the selector's picks.

    python -m pytest tests/test_the_active_voice_is_pinned_under_its_tracked_name.py -q
"""
import os
import sys
import time
import types

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import pytest  # noqa: E402

IDLE = 300.0


class _Process:
    def __init__(self):
        self.alive = True

    def is_alive(self):
        return self.alive

    def stop(self, timeout=5.0):
        self.alive = False


@pytest.fixture
def node(monkeypatch):
    from integrations.service_tools import mms_tts_tool
    from integrations.service_tools import model_lifecycle as ml

    from tts import tts_engine as mod

    mgr = ml.ModelLifecycleManager()
    mgr._models.clear()
    mgr._persisted_hints.clear()
    pressure = {'vram': False, 'ram': False}
    monkeypatch.setattr(mgr, '_detect_vram_pressure', lambda: pressure['vram'])
    monkeypatch.setattr(mgr, '_detect_ram_pressure', lambda: pressure['ram'])
    monkeypatch.setattr(ml, '_lifecycle_manager', mgr)

    picks = {'en': mod.BACKEND_PIPER, 'ta': mod.BACKEND_MMS_TTS}
    monkeypatch.setattr(mod.TTSEngine, '_select_backend_for_language',
                        lambda self, language='en': picks[mod._normalize_lang(language)])
    eng = mod.TTSEngine.__new__(mod.TTSEngine)
    eng._language = 'en'
    eng._active_backend = mod.BACKEND_PIPER
    # Both voices loaded: set_language switches at once, no background load.
    eng._backends = {mod.BACKEND_PIPER: object(), mod.BACKEND_MMS_TTS: object()}

    tool = mms_tts_tool._tool
    monkeypatch.setattr(tool, '_worker', _Process())
    monkeypatch.setattr(tool, '_release_vram', lambda: None)

    def idle_past_timeout():
        """The mms_tts worker, alive and idle 301 s, reaches its idle timer."""
        if tool._worker is None:
            tool._worker = _Process()
        monkeypatch.setattr(tool, 'idle_timeout', IDLE)
        tool._last_used = time.monotonic() - (IDLE + 1)
        tool._on_idle()
        if tool._idle_timer is not None:
            tool._idle_timer.cancel()
            tool._idle_timer = None
        return tool._worker is not None

    return types.SimpleNamespace(mod=mod, mgr=mgr, eng=eng, pressure=pressure,
                                 survives=idle_past_timeout)


def _pinned(mgr):
    with mgr._lock:
        state = mgr._models.get('tts-mms-tts')
        if state is not None:
            return state.pressure_evict_only
        return mgr._persisted_hints.get('tts-mms-tts', {}).get('pressure_evict_only')


def test_the_voice_is_named_as_the_lifecycle_tracks_it(node):
    mod = node.mod
    assert mod.TTSEngine._get_lifecycle_name(mod.BACKEND_MMS_TTS) == 'tts-mms-tts'
    assert mod.TTSEngine._get_lifecycle_name(mod.BACKEND_PIPER) is None
    node.eng.set_language('ta')
    assert _pinned(node.mgr) is True
    with node.mgr._lock:
        assert 'tts_mms_tts' not in node.mgr._persisted_hints
        assert 'tts_mms_tts' not in node.mgr._models


def test_the_voice_spoken_last_outlives_its_idle_timer(node):
    node.eng.set_language('ta')
    assert node.survives(), 'the active Tamil voice stopped after 301 s idle'


def test_the_voice_left_behind_is_let_go(node):
    node.eng.set_language('ta')
    node.eng.set_language('en')
    assert _pinned(node.mgr) is False
    assert not node.survives()


def test_memory_pressure_still_ends_the_hold(node):
    node.eng.set_language('ta')
    node.pressure['ram'] = True
    assert not node.survives()
