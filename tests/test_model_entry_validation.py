"""ModelEntry.validate() — reject un-downloadable entries at the PRODUCER.

2026-08-15, live: POST /api/admin/models accepted

    {"id": "Qwen3.8-27B-UD-Q4_K_XL.gguf", "model_type": "llm",
     "backend": "llama.cpp", "files": {},
     "repo_id": "unsloth/Qwen3.8-27B-UD-Q4_K_XL.gguf"}

and returned 200 {"success": true}.  The entry persisted to
model_catalog.json.  Only LATER, at download time, did it fail:

    NunbaModelOrchestrator - ERROR - LLM download: no preset for
    Qwen3.8-27B-UD-Q4_K_XL.gguf

because models/orchestrator.py::_entry_to_preset returns None when
files['model'] is empty — the one condition that makes a llama.cpp entry
permanently un-downloadable.  The producer was more permissive than its
consumer, so the UI reported success for a model that could never work,
and every retry failed identically off the persisted row.
"""
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from models.catalog import ModelEntry


def _entry(**over):
    base = {
        'id': 'llm-test', 'name': 'Test', 'model_type': 'llm',
        'backend': 'llama.cpp', 'source': 'huggingface',
        'repo_id': 'unsloth/Qwen3.5-27B-GGUF',
        'files': {'model': 'Qwen3.5-27B-UD-Q4_K_XL.gguf'},
    }
    base.update(over)
    return ModelEntry.from_dict(base)


class TestModelEntryValidation:

    def test_healthy_llama_entry_validates_clean(self):
        assert _entry().validate() == []

    def test_empty_files_is_rejected(self):
        """The exact shape that broke: llama.cpp entry with files={}."""
        problems = _entry(files={}).validate()
        assert problems, 'llama.cpp entry with no files[model] must be rejected'
        assert any('files' in p and 'model' in p for p in problems), problems

    def test_repo_id_that_is_actually_a_filename_is_rejected(self):
        """'unsloth/Qwen3.8-27B-UD-Q4_K_XL.gguf' is a FILE, not an HF repo.
        A repo id never ends in .gguf, so this can never resolve."""
        problems = _entry(repo_id='unsloth/Qwen3.8-27B-UD-Q4_K_XL.gguf').validate()
        assert problems, 'a repo_id ending in .gguf must be rejected'
        assert any('repo_id' in p for p in problems), problems

    def test_the_exact_live_broken_entry_is_rejected(self):
        """Replay of the persisted row from model_catalog.json."""
        broken = ModelEntry.from_dict({
            'id': 'Qwen3.8-27B-UD-Q4_K_XL.gguf',
            'name': 'Qwen3.8-27B-UD-Q4_K_XL.gguf',
            'model_type': 'llm', 'backend': 'llama.cpp',
            'source': 'huggingface', 'files': {},
            'repo_id': 'unsloth/Qwen3.8-27B-UD-Q4_K_XL.gguf',
        })
        assert broken.validate(), 'the live broken entry must not validate'

    def test_non_download_backends_are_not_forced_to_carry_files(self):
        """An api/in_process model has nothing to download — the rule must
        not fire for it, or it would block valid registrations."""
        assert _entry(backend='api', source='api', repo_id='',
                      files={}).validate() == []
