"""
Parametric ModelCatalog entry matrix — every entry validated.

Discovers all entries dynamically. Tests every model across all types
(LLM, TTS, STT, VLM, AUDIO_GEN, VIDEO_GEN) for required fields,
valid ranges, and type-specific invariants.
"""
import os
import sys

import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from integrations.service_tools.model_catalog import ModelType

from models.catalog import get_catalog

_catalog = get_catalog()
ALL_ENTRIES = _catalog.list_all()
ENTRY_IDS = [e.id for e in ALL_ENTRIES]


# ==========================================================================
# 1. Required Fields (every entry)
# ==========================================================================
@pytest.mark.parametrize('entry', ALL_ENTRIES, ids=ENTRY_IDS)
def test_has_id(entry):
    assert entry.id, "Entry must have an id"

@pytest.mark.parametrize('entry', ALL_ENTRIES, ids=ENTRY_IDS)
def test_has_name(entry):
    assert entry.name, f"{entry.id}: missing name"

@pytest.mark.parametrize('entry', ALL_ENTRIES, ids=ENTRY_IDS)
def test_has_model_type(entry):
    assert entry.model_type is not None, f"{entry.id}: missing model_type"

@pytest.mark.parametrize('entry', ALL_ENTRIES, ids=ENTRY_IDS)
def test_has_backend(entry):
    assert entry.backend, f"{entry.id}: missing backend"


# ==========================================================================
# 2. Numeric Ranges (every entry)
# ==========================================================================
@pytest.mark.parametrize('entry', ALL_ENTRIES, ids=ENTRY_IDS)
def test_vram_non_negative(entry):
    assert entry.vram_gb >= 0, f"{entry.id}: vram {entry.vram_gb} < 0"

@pytest.mark.parametrize('entry', ALL_ENTRIES, ids=ENTRY_IDS)
def test_quality_score_bounded(entry):
    assert 0.0 <= entry.quality_score <= 1.0, f"{entry.id}: quality {entry.quality_score}"

@pytest.mark.parametrize('entry', ALL_ENTRIES, ids=ENTRY_IDS)
def test_speed_score_bounded(entry):
    assert 0.0 <= entry.speed_score <= 1.0, f"{entry.id}: speed {entry.speed_score}"

@pytest.mark.parametrize('entry', ALL_ENTRIES, ids=ENTRY_IDS)
def test_priority_positive(entry):
    assert entry.priority >= 0, f"{entry.id}: priority {entry.priority}"


# ==========================================================================
# 3. Boolean Fields (every entry)
# ==========================================================================
@pytest.mark.parametrize('entry', ALL_ENTRIES, ids=ENTRY_IDS)
def test_supports_gpu_is_bool(entry):
    assert isinstance(entry.supports_gpu, bool), f"{entry.id}: supports_gpu not bool"

@pytest.mark.parametrize('entry', ALL_ENTRIES, ids=ENTRY_IDS)
def test_supports_cpu_is_bool(entry):
    assert isinstance(entry.supports_cpu, bool), f"{entry.id}: supports_cpu not bool"

@pytest.mark.parametrize('entry', ALL_ENTRIES, ids=ENTRY_IDS)
def test_auto_load_is_bool(entry):
    assert isinstance(entry.auto_load, bool), f"{entry.id}: auto_load not bool"


# ==========================================================================
# 4. Tags (every entry)
# ==========================================================================
@pytest.mark.parametrize('entry', ALL_ENTRIES, ids=ENTRY_IDS)
def test_tags_is_list(entry):
    assert isinstance(entry.tags, list), f"{entry.id}: tags not list"

@pytest.mark.parametrize('entry', ALL_ENTRIES, ids=ENTRY_IDS)
def test_has_local_tag(entry):
    assert 'local' in entry.tags, f"{entry.id}: missing 'local' tag"


# ==========================================================================
# 5. Type-Specific Rules
# ==========================================================================
LLM_ENTRIES = [e for e in ALL_ENTRIES if e.model_type == ModelType.LLM]
TTS_ENTRIES = [e for e in ALL_ENTRIES if e.model_type == ModelType.TTS]
STT_ENTRIES = [e for e in ALL_ENTRIES if e.model_type == ModelType.STT]

if LLM_ENTRIES:
    LLM_IDS = [e.id for e in LLM_ENTRIES]

    @pytest.mark.parametrize('entry', LLM_ENTRIES, ids=LLM_IDS)
    def test_llm_backend_is_llama_cpp(entry):
        assert entry.backend == 'llama.cpp', f"{entry.id}: LLM backend must be llama.cpp"

    @pytest.mark.parametrize('entry', LLM_ENTRIES, ids=LLM_IDS)
    def test_llm_has_repo_id(entry):
        assert entry.repo_id, f"{entry.id}: LLM must have repo_id"
        assert '/' in entry.repo_id, f"{entry.id}: repo_id must be org/name"

    @pytest.mark.parametrize('entry', LLM_ENTRIES, ids=LLM_IDS)
    def test_llm_id_starts_with_llm(entry):
        assert entry.id.startswith('llm-'), f"{entry.id}: LLM id must start with llm-"

    @pytest.mark.parametrize('entry', LLM_ENTRIES, ids=LLM_IDS)
    def test_llm_vram_under_25gb(entry):
        assert entry.vram_gb <= 25.0, f"{entry.id}: {entry.vram_gb}GB exceeds 24GB GPU"


# ==========================================================================
# 6. Collection-Level Invariants
# ==========================================================================
def test_at_least_15_entries():
    assert len(ALL_ENTRIES) >= 15

def test_all_ids_unique():
    ids = [e.id for e in ALL_ENTRIES]
    assert len(ids) == len(set(ids)), f"Duplicate IDs: {[x for x in ids if ids.count(x)>1]}"

def test_has_llm_entries():
    assert len(LLM_ENTRIES) >= 2

def test_has_tts_entries():
    assert len(TTS_ENTRIES) >= 1

def test_has_stt_entries():
    assert len(STT_ENTRIES) >= 1

def test_at_most_one_auto_load_per_type():
    """Only one model per type should auto-load."""
    from collections import Counter
    auto_loads = Counter(str(e.model_type) for e in ALL_ENTRIES if e.auto_load)
    for mtype, count in auto_loads.items():
        assert count <= 1, f"Type {mtype} has {count} auto-load models"
