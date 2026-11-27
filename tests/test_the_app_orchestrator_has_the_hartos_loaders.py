"""The app's orchestrator has the loaders HARTOS owns (design 1125, H3).

When the app asks first, Nunba's get_orchestrator builds the shared singleton,
and it registered only Nunba's four loaders (llm, tts, stt, vlm).  HARTOS
registered the speaker loader only when ITS get_orchestrator built the
singleton, so in the app process 'speaker' had no loader (live 2026-11-25: the
main process registered four loaders, and model_type=speaker appeared only
from the whisper worker).  Both now call HARTOS's one function,
register_hartos_loaders, which also registers the phonetic model's loader.

The catalog is a fake: no catalog file is read or written, and no loader
loads anything.  The imports sit at module level: the first import of HARTOS
loads transformers, which can take longer than one test's time limit.
"""
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import integrations.service_tools.model_orchestrator as hartos_mod  # noqa: E402
from integrations.audio.voiceprint import SpeakerLoader  # noqa: E402
from integrations.service_tools.phonetic_tool import PhoneticLoader  # noqa: E402

import models.orchestrator as nunba_mod  # noqa: E402


class _Catalog:
    """The two reads the orchestrator's scan makes, over no rows."""

    def list_all(self):
        return []

    def list_by_type(self, model_type):
        return []


def test_the_app_built_orchestrator_has_the_speaker_and_phonetic_loaders(monkeypatch):
    monkeypatch.setattr(hartos_mod, '_orchestrator_instance', None)
    monkeypatch.setattr(nunba_mod, '_loaders_registered', False)
    monkeypatch.setattr(nunba_mod, 'get_catalog', lambda: _Catalog())

    orch = nunba_mod.get_orchestrator()

    assert orch is hartos_mod._orchestrator_instance
    assert {'llm', 'tts', 'stt', 'vlm'} <= set(orch._loaders)
    assert isinstance(orch._loaders.get('speaker'), SpeakerLoader), sorted(orch._loaders)
    assert isinstance(orch._loaders.get('phonetic'), PhoneticLoader), sorted(orch._loaders)
