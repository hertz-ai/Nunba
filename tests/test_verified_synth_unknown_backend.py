"""A TTS probe failure for a backend name the engine does not know must
not file an agent self-heal goal.

Measured cause (gui_app.log 2026-09-22..26): TTSLoader asked for
'neuair' (a mangled 'tts-neutts-air'; loader fixed in 1334099d).  The
engine could not create it, verified_synth's deep-probe surfaced
"Backend 'neuair' unreachable", and _surface_backend_exception filed a
tts.probe goal with agent_remediation=True.  The goal could never
succeed: no backend of that name exists, and repair_backend_venv rejects
unknown names.  It stayed alive for days, spending local-LLM turns.

Contract pinned here:
  * a name TTSEngine can build (piper + every _BACKEND_TO_REGISTRY_KEY
    key) still files an agent goal, as before;
  * any other name still writes the .err sidecar and still reaches
    error_advice (logged, Sentry), but with agent_remediation=False;
  * TTSEngine._create_backend and the predicate agree on every name.
"""
from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock, patch

import pytest

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)


def _surface(backend, tmp_path):
    """Run the real _surface_backend_exception with error_advice mocked
    and the sidecar pointed at tmp_path.  Returns (calls, sidecar)."""
    from tts import verified_synth

    calls = []

    def fake_handle_exception(exc, *, category, severity,
                              agent_remediation, context=None):
        calls.append({'exc': exc, 'category': category,
                      'severity': severity,
                      'agent_remediation': agent_remediation,
                      'context': context or {}})

    fake_ea = MagicMock()
    fake_ea.handle_exception = fake_handle_exception
    sidecar = tmp_path / f"tts_{backend}.err"
    with patch.dict(sys.modules, {'core.error_advice': fake_ea}), \
            patch.object(verified_synth, '_backend_err_log_path',
                         return_value=str(sidecar)):
        try:
            raise RuntimeError(f"Backend {backend!r} unreachable via deep-probe")
        except RuntimeError as e:
            verified_synth._surface_backend_exception(backend, e)
    return calls, sidecar


@pytest.mark.parametrize('name', ['neuair', 'chatterbox-turbo', 'f5_tts',
                                  'xv2', 'fake', ''])
def test_unknown_backend_files_no_agent_goal(name, tmp_path):
    calls, sidecar = _surface(name, tmp_path)
    assert len(calls) == 1, "error_advice must still see the failure"
    assert calls[0]['category'] == 'tts.probe'
    assert calls[0]['agent_remediation'] is False, (
        f"{name!r} is not a backend TTSEngine can build; a self-heal goal "
        f"for it can never succeed")
    assert calls[0]['context']['backend'] == name
    assert sidecar.exists() and 'unreachable' in sidecar.read_text('utf-8')


def _engine_backends():
    from tts.tts_engine import BACKEND_PIPER, _BACKEND_TO_REGISTRY_KEY
    return [BACKEND_PIPER, *_BACKEND_TO_REGISTRY_KEY]


@pytest.mark.parametrize('name', _engine_backends())
def test_known_backend_still_files_agent_goal(name, tmp_path):
    calls, sidecar = _surface(name, tmp_path)
    assert len(calls) == 1
    assert calls[0]['agent_remediation'] is True
    assert calls[0]['severity'] == 'high'
    assert calls[0]['context']['backend'] == name
    assert sidecar.exists()


def test_neutts_air_is_a_known_backend(tmp_path):
    """The name the fixed loader now sends must keep self-heal on."""
    calls, _ = _surface('neutts_air', tmp_path)
    assert calls[0]['agent_remediation'] is True


def test_engine_unimportable_keeps_agent_goal(tmp_path):
    """If tts.tts_engine cannot be imported the name cannot be judged;
    keep the prior behaviour (file the goal) rather than drop it."""
    with patch.dict(sys.modules, {'tts.tts_engine': None}):
        calls, _ = _surface('neuair', tmp_path)
    assert calls[0]['agent_remediation'] is True


@pytest.mark.parametrize('name', _engine_backends() + ['neuair', 'f5_tts',
                                                       'luxtts', 'none', ''])
def test_create_backend_agrees_with_predicate(name):
    """One rule: _create_backend refuses exactly the names the predicate
    calls unknown (the subprocess adapter is mocked; nothing spawns)."""
    from tts import tts_engine
    eng = tts_engine.TTSEngine.__new__(tts_engine.TTSEngine)
    with patch.object(tts_engine, '_SubprocessTTSBackend',
                      side_effect=lambda key: ('subprocess', key)), \
            patch.object(tts_engine, '_get_engine_registry', return_value={}):
        built = tts_engine.TTSEngine._create_backend(eng, name)
    assert (built is not None) is tts_engine._is_engine_backend(name)


def test_verify_backend_synth_unknown_name_end_to_end(tmp_path):
    """The live chain: synth returns no path, the deep-probe cannot
    create 'neuair', and the surfaced failure files no agent goal."""
    from tts import tts_engine, verified_synth

    class Engine:
        _backends: dict = {}

        def verify_synth_via_backend(self, backend, text, path, language=None):
            return None

        def _create_backend(self, backend):
            return tts_engine.TTSEngine._create_backend(self, backend)

    calls = []
    fake_ea = MagicMock()
    fake_ea.handle_exception = (
        lambda exc, *, category, severity, agent_remediation, context=None:
        calls.append(agent_remediation))
    with patch.dict(sys.modules, {'core.error_advice': fake_ea}), \
            patch.object(verified_synth, '_backend_err_log_path',
                         return_value=str(tmp_path / 'x.err')):
        r = verified_synth.verify_backend_synth(Engine(), 'neuair', timeout_s=10)
    assert r.ok is False
    assert calls == [False]
