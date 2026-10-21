"""A weight file is complete by HARTOS's one rule, not a copy kept here.

LlamaInstaller.get_model_path decides whether a model is on disk: its weight
file must hold at least 90% of the registered size (never under 100 MB) and
start with the GGUF magic.  That rule lived here as a floor in get_model_path
and a private _is_gguf_complete, while HARTOS's own 0.8B lookup took any file
of the right name -- two answers to one question about the same file (review
of HARTOS 77a8b166b).  The registered size was HARTOS's already
(model_catalog.MODEL_WEIGHT_BYTES, read through model_size_bytes), so the
rule now lives beside it, model_catalog.gguf_min_bytes / gguf_complete, and
get_model_path asks it.

Real installer, real files in a temp dir, the real rule.  A test preset is
registered at 1000 bytes and the rule's 100 MB floor is set to 0, so whole
weights are a kilobyte rather than half a gigabyte.  These tests need HARTOS
(the sibling checkout, put on the path below) and skip without it.

    python -m pytest tests/test_weight_file_complete_is_hartos_rule.py -q
"""
import os
import sys

import pytest

_NUNBA = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _NUNBA not in sys.path:
    sys.path.insert(0, _NUNBA)
_HARTOS = os.path.normpath(os.path.join(_NUNBA, '..', 'HARTOS'))
if os.path.isdir(_HARTOS) and _HARTOS not in sys.path:
    sys.path.insert(0, _HARTOS)

#: A name no real folder holds, so the walk across ~/.nunba, ~/.trueflow,
#: ~/.ollama and the HuggingFace cache finds only what a test writes.
NAME = 'Nunba-completeness-rule-test.gguf'


@pytest.fixture
def rule(monkeypatch):
    """HARTOS's completeness rule, its floor scaled to 0; the catalog step of
    get_model_path off (the real get_catalog populates every subsystem)."""
    mc = pytest.importorskip('integrations.service_tools.model_catalog',
                             reason='HARTOS sibling not importable here')
    import models.catalog as nunba_catalog
    monkeypatch.setattr(nunba_catalog, 'get_catalog',
                        lambda: (_ for _ in ()).throw(RuntimeError('no catalog')))
    monkeypatch.setattr(mc, 'GGUF_MIN_BYTES', 0)
    return mc


@pytest.fixture
def setup(tmp_path, monkeypatch):
    """(installer whose models folder is tmp, a preset registered at 1000
    bytes, the path its weights go to).  The GPU probe (nvidia-smi, wmic) is
    answered 'none': it has nothing to do with whether a file is whole."""
    from llama.llama_installer import LlamaInstaller, ModelPreset
    monkeypatch.setattr(LlamaInstaller, 'detect_backend',
                        staticmethod(lambda os_name=None: 'none'))
    installer = LlamaInstaller(install_dir=str(tmp_path / 'llama'),
                               models_dir=str(tmp_path / 'models'))
    preset = ModelPreset('Completeness test', 'org/test-GGUF', NAME, size_bytes=1000)
    return installer, preset, installer.models_dir / NAME


def _weights(path, size, magic=b'GGUF'):
    path.write_bytes(magic + b'\0' * (size - len(magic)))
    return path


@pytest.mark.parametrize('size', [1000, 900], ids=['whole', 'exactly_90pct'])
def test_weights_the_rule_calls_whole_are_found(rule, setup, size):
    installer, preset, path = setup
    _weights(path, size)
    assert installer.get_model_path(preset) == str(path)


@pytest.mark.parametrize('size, magic', [(899, b'GGUF'), (1000, b'<htm')],
                         ids=['one_byte_short_of_90pct', 'not_a_gguf'])
def test_weights_the_rule_refuses_are_not_found(rule, setup, size, magic):
    installer, preset, path = setup
    _weights(path, size, magic)
    assert installer.get_model_path(preset) is None


def test_get_model_path_asks_hartos_rule(rule, setup, monkeypatch):
    """The floor and the check are HARTOS's: what they answer is what
    get_model_path does.  Fails if a private floor or magic read comes back
    (the floor here is 7 bytes, which no copy of 90%-of-1000 would give)."""
    installer, preset, path = setup
    _weights(path, 1000)
    floors, checks = [], []
    monkeypatch.setattr(rule, 'gguf_min_bytes',
                        lambda expected: floors.append(expected) or 7)
    monkeypatch.setattr(rule, 'gguf_complete',
                        lambda p, min_bytes=0: checks.append(
                            (os.path.basename(str(p)), min_bytes)) or True)
    assert installer.get_model_path(preset) == str(path)
    assert floors == [1000], 'the registered size did not reach the one rule'
    assert checks == [(NAME, 7)], 'the file was not judged by the one rule'


def test_without_hartos_rule_no_file_is_vouched_complete(rule, setup, monkeypatch):
    """No fallback copy of the rule: where HARTOS's model_catalog cannot be
    imported, get_model_path finds nothing (an error in the log), even for
    whole weights."""
    installer, preset, path = setup
    _weights(path, 1000)
    monkeypatch.setitem(sys.modules, 'integrations.service_tools.model_catalog', None)
    assert installer.get_model_path(preset) is None
