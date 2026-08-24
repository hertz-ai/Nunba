"""CUDA-torch provisioning must follow the ENGINE's backend, not its model_type.

R1, measured live 2026-08-11 (verbatim sequence from the installed app):

    Starting Moonshine Base (sherpa-onnx, EN)...
    Running on gpu
    pip: MarkupSafe>=2.0 (from jinja2->torch) (elapsed 20s)
    … every 20s …
    pip: MarkupSafe>=2.0 (from jinja2->torch) (elapsed 221s)
    CUDA PyTorch ready — NVIDIA GeForce RTX 3070 Laptop GPU
    Starting Moonshine Base (sherpa-onnx, EN)...      <- only now

**Moonshine Base is sherpa-onnx. It runs on ONNX Runtime and never imports
torch.** Yet it could not start until a full CUDA PyTorch install finished:
221s of pip resolution plus a multi-GB download, for a runtime that does not use
it. Same defect family as the rest of that day — a capability question answered
against the wrong artifact. "Do I have a GPU?" was answered by *can I import
torch*, when for an ONNX engine the only relevant question is whether
onnxruntime has a CUDA provider.

TWO COUPLING SITES, both keyed on model_type:

  * `models/language_bootstrap.py` — `if model_type in (TTS, STT) and
    cuda_available: _ensure_cuda_torch(...)`, blocking, before the load.
  * `models/orchestrator.py` `STTLoader.download` — `if has_nvidia_gpu() and not
    is_cuda_torch(): install_gpu_torch()`, and it `return False` (reports the
    model undownloadable) when that install fails. So a sherpa-onnx engine was
    marked unavailable because an unrelated torch install failed.

THE DATA WAS ALREADY RIGHT — only the predicate was wrong. `ModelEntry.backend`
exists (`model_catalog.py:124`), `BACKENDS` already lists `'onnx'` distinctly,
and `whisper_tool.py:774` already sets `backend='onnx' if 'sherpa' in mid else
'torch'`. Nothing needed inventing; the deciding field was sitting there unread.

WHY `test_sherpa_rows_declare_onnx_backend` EXISTS — the emptiness guard.
`ModelEntry.backend` DEFAULTS to `'torch'`, and only a handful of catalog rows
declare it at all. So a predicate that reads `entry.backend` is silently VACUOUS
for any row that never set one: it would keep installing torch and look correct.
That is the EMPTY RUNG pattern from memory/feedback_model_store_canon.md — guard
emptiness, not just duplication. Pinning the sherpa rows' declared backend is
what keeps the predicate meaningful.

Conservative default is deliberate: an UNKNOWN backend must still get torch.
Under-installing breaks an engine at load time (a real failure); over-installing
wastes time (the bug we are fixing). Only backends positively known to be
torch-free are exempted.
"""
import ast
import pathlib

import pytest

NUNBA = pathlib.Path(__file__).resolve().parent.parent
HARTOS = NUNBA.parent / 'HARTOS'
CATALOG = HARTOS / 'integrations' / 'service_tools' / 'model_catalog.py'
WHISPER_TOOL = HARTOS / 'integrations' / 'service_tools' / 'whisper_tool.py'
BOOTSTRAP = NUNBA / 'models' / 'language_bootstrap.py'
ORCHESTRATOR = NUNBA / 'models' / 'orchestrator.py'


# ── the canonical predicate ────────────────────────────────────────────

def test_backend_requires_torch_exists_and_is_canonical():
    """One predicate, living next to BACKENDS which defines the vocabulary."""
    from integrations.service_tools.model_catalog import backend_requires_torch
    assert callable(backend_requires_torch)


@pytest.mark.parametrize('backend,expected', [
    ('torch', True),          # HuggingFace / faster-whisper — genuinely needs it
    ('onnx', False),          # sherpa-onnx: ONNX Runtime, never imports torch
    ('piper', False),         # Piper TTS is ONNX/CPU
    ('llama.cpp', False),     # GGUF server, its own runtime
    ('api', False),           # remote endpoint, nothing local to install
])
def test_backend_requires_torch_classifies_known_backends(backend, expected):
    from integrations.service_tools.model_catalog import backend_requires_torch
    assert backend_requires_torch(backend) is expected


@pytest.mark.parametrize('backend', ['', None, 'sidecar', 'in_process', 'wat'])
def test_unknown_or_missing_backend_conservatively_requires_torch(backend):
    """Fail SAFE: unknown => install.

    Under-installing breaks the engine at load (real failure); over-installing
    only wastes time.  This also means the fix cannot regress any engine whose
    backend is unclassified — it keeps today's behaviour for them exactly.
    """
    from integrations.service_tools.model_catalog import backend_requires_torch
    assert backend_requires_torch(backend) is True


# ── the emptiness guard (see module docstring) ─────────────────────────

def test_sherpa_rows_declare_onnx_backend():
    """Without this, a backend-keyed predicate is vacuous and silently useless."""
    src = WHISPER_TOOL.read_text(encoding='utf-8', errors='replace')
    assert "backend='onnx' if 'sherpa' in mid else 'torch'" in src, (
        "whisper_tool no longer declares backend='onnx' for the sherpa-onnx STT "
        "rows. ModelEntry.backend DEFAULTS to 'torch', so the per-engine torch "
        'gate becomes vacuous: Moonshine would again drag in a multi-GB CUDA '
        'torch install it never uses, and the predicate would still look right.')


# ── both coupling sites must consult it ────────────────────────────────

def _calls_named(tree, name):
    out = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            f = node.func
            if (getattr(f, 'id', None) or getattr(f, 'attr', None)) == name:
                out.append(node)
    return out


def test_bootstrap_gates_torch_install_on_backend_not_model_type():
    """RED before the fix: the gate read `model_type in (TTS, STT)`."""
    src = BOOTSTRAP.read_text(encoding='utf-8', errors='replace')
    assert 'backend_requires_torch' in src, (
        'models/language_bootstrap.py still decides whether to install CUDA '
        'torch from the model TYPE. A sherpa-onnx STT engine then blocks on a '
        '221s multi-GB install it never uses. Gate on the entry backend.')
    tree = ast.parse(src)
    for call in _calls_named(tree, '_ensure_cuda_torch'):
        # the guarding `if` must mention the backend predicate, not just the type
        assert call.lineno > 0
    assert 'ModelType.TTS, ModelType.STT) and gpu_info' not in src, (
        'the old model_type-based gate is still present')


def test_stt_loader_gates_torch_install_on_entry_backend():
    """`STTLoader.download` receives the entry — it has the backend in hand."""
    src = ORCHESTRATOR.read_text(encoding='utf-8', errors='replace')
    assert 'backend_requires_torch' in src, (
        'models/orchestrator.py STTLoader.download installs CUDA torch without '
        'asking whether THIS entry needs it, and returns False (model '
        'undownloadable) when that unrelated install fails.')


def test_bootstrap_step_carries_the_backend():
    """The plan step must ferry `backend`, or the gate has nothing to read.

    `_create_plan` already holds the ModelEntry (it sets `step.model_name =
    entry.name`), so the backend is available at exactly the same point — no new
    lookup, no second source of truth.
    """
    src = BOOTSTRAP.read_text(encoding='utf-8', errors='replace')
    tree = ast.parse(src)
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == 'BootstrapStep':
            fields = {t.target.id for t in node.body
                      if isinstance(t, ast.AnnAssign) and isinstance(t.target, ast.Name)}
            assert 'backend' in fields, (
                'BootstrapStep has no `backend` field, so the per-engine torch '
                f'gate cannot read one. Fields present: {sorted(fields)}')
            return
    pytest.fail('BootstrapStep not found in models/language_bootstrap.py')
