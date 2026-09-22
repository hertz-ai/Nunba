r"""A model's weight size is ONE fact, in ONE unit, kept in ONE table.

WHAT WAS FRAGMENTED (audited 2026-09-22, both repos)

The same nine weight sizes were typed out twice --

    Nunba   llama/llama_installer.py          MODEL_PRESETS[].size_mb
    HARTOS  integrations/service_tools/
            model_catalog.py                  _populate_llm_models._llms[5]

-- with byte-identical literals (550, 1100, 1340, 2910, 6113, 18022,
22733, 22630, 22938).  MEASURED provenance: Nunba's table carries them
since 96661414e (2026-03-16, the first Nunba commit); HARTOS's copy
gained them in 80c703b6c (2026-07-27).  Nunba wrote them first, but
HARTOS's copy is the one whose docstring already CLAIMS the role --

    "This catalog is the SINGLE SOURCE OF TRUTH for which chat models
     exist. ... and Nunba kept a fourth list of its own."

-- a declaration without a guard, so the fourth list simply stayed.
The import direction settles where the survivor lives: Nunba imports
HARTOS (``models/catalog.py`` imports ``integrations.service_tools.
model_catalog`` at module scope), HARTOS never imports Nunba (MEASURED:
zero hits for ``ModelPreset`` anywhere in the HARTOS tree).  So the one
table lives in HARTOS and Nunba consumes it.

AND THE UNIT WAS NOT ONE UNIT.  ``size_mb`` was a hand-typed literal
whose meaning changed row to row.  MEASURED against every .gguf on this
box (2026-09-22):

    file                                      literal   bytes         MiB      MB(dec)
    Qwen3.5-4B-UD-Q4_K_XL.gguf                  2910   2,912,109,728  2777.2   2912.1
    Qwen3.5-2B-UD-Q4_K_XL.gguf                  1340   1,339,752,704  1277.7   1339.8
    Qwen3.5-0.8B-UD-Q4_K_XL.gguf                 550     558,772,480   532.9    558.8
    Qwen3-VL-2B-Instruct-UD-Q4_K_XL.gguf        1500   1,129,709,248  1077.4   1129.7

The 4B and 2B rows are decimal MB (copied from HuggingFace's listing).
The 1500 row matches NEITHER reading -- it is 39% over the MiB figure
and 33% over the decimal one, i.e. simply wrong.  The large rows were
typed the other way and carry their author's arithmetic in the comment
(``6113,  # 5.97 GB`` -> 6113/1024 = 5.97, so MiB).  One field, three
vocabularies, and no single divisor correct for all of them.

WHAT EVERY CONSUMER ACTUALLY MEANT.  Audited call site by call site,
the answer is unanimous -- MiB:

    llama_config      ``preset.size_mb <= diag['compute_budget_mb']``
                      where ``budget_mb = int(free_vram * 1024)``   -> MiB
    ai_installer      ``p.size_mb <= budget_mb``
                      where ``budget_mb = (vram - 1.5) * 1024``     -> MiB
    main / catalog    ``size_mb / 1024.0`` compared against free_gb
                      from nvidia-smi MiB / 1024, i.e. GiB          -> MiB
    llama_installer   ``size_mb * 1024 * 1024`` for expected bytes  -> MiB

So the readers were right and the literal was wrong.  The fix stores
BYTES -- the one unit-free reading, measured from the file wherever one
exists -- and exposes ``size_mb`` as the exact MiB view of it.  Every
existing consumer then becomes correct with no change to its arithmetic,
and ``model_size_bytes`` is the single conversion everything routes
through.

WHAT THE UNIT ERROR COST (live 2026-09-22 08:15:49): ``_derive_ctx_size``
subtracted 2910/1024 = 2.841797 from a free-VRAM reading that is
genuinely GiB.  The weights were overstated by 0.1297 GiB, remaining came
to 1.998203 against a ``>= 2.0`` gate, and n_ctx pinned at 4096 for the
life of the process -- under the measured 8026-token tool schema, so
every agentic turn 400'd.  A 133 MB unit error cost half the context
window.
"""
import ast
import os
import sys

import pytest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

BYTES_PER_MIB = 1024 ** 2
BYTES_PER_GIB = 1024 ** 3

# MEASURED 2026-09-22 — every .gguf present on this box, byte-exact.
MEASURED_BYTES = {
    'Qwen3.5-4B-UD-Q4_K_XL.gguf':           2_912_109_728,
    'Qwen3.5-2B-UD-Q4_K_XL.gguf':           1_339_752_704,
    'Qwen3.5-0.8B-UD-Q4_K_XL.gguf':           558_772_480,
    'Qwen3-VL-2B-Instruct-UD-Q4_K_XL.gguf': 1_129_709_248,
}

# The literals that were typed twice, once per repo.  Neither table may
# state them again.
DUPLICATED_LITERALS = ('550', '1100', '1340', '2910', '6113',
                       '18022', '22733', '22630', '22938')

FAKE_MODEL_PATH = os.path.join('C:\\', 'models', 'fake-measured.gguf')


def _preset_for(file_name):
    from llama.llama_installer import MODEL_PRESETS
    for p in MODEL_PRESETS:
        if p.file_name == file_name:
            return p
    raise AssertionError(f'no preset ships {file_name}')


# ══════════════════════════════════════════════════════════════════
# 1. ONE TABLE — the literals live in HARTOS, and nowhere twice
# ══════════════════════════════════════════════════════════════════

def test_the_weight_table_lives_in_hartos():
    """HARTOS is the only repo both can import, so it holds the table."""
    from integrations.service_tools.model_catalog import (
        MODEL_WEIGHT_BYTES,
        model_weight_bytes,
    )

    assert MODEL_WEIGHT_BYTES, 'the canonical weight table is empty'
    assert model_weight_bytes('Qwen3.5-4B-UD-Q4_K_XL.gguf') == 2_912_109_728


def test_every_nunba_preset_resolves_through_that_one_table():
    """A Nunba row that is not in the table would be a second source."""
    from integrations.service_tools.model_catalog import MODEL_WEIGHT_BYTES

    from llama.llama_installer import MODEL_PRESETS

    missing = [p.file_name for p in MODEL_PRESETS
               if p.file_name not in MODEL_WEIGHT_BYTES]
    assert missing == [], (
        f'these presets carry a size the canonical table does not know, so '
        f'their number had to be typed locally: {missing}'
    )


def test_neither_repo_restates_the_duplicated_literals():
    """The nine numbers appear in the table and in no other table.

    Guards the exact regression this change undoes: two tables holding
    byte-identical literals four months apart.
    """
    import inspect

    from integrations.service_tools.model_catalog import ModelCatalog

    import llama.llama_installer as installer_mod

    hartos_ladder = inspect.getsource(ModelCatalog._populate_llm_models)
    restated = [lit for lit in DUPLICATED_LITERALS if lit in hartos_ladder]
    assert restated == [], (
        f'HARTOS _populate_llm_models still states weight literals {restated} '
        f'instead of reading MODEL_WEIGHT_BYTES'
    )

    tree = ast.parse(inspect.getsource(installer_mod))
    preset_literals = set()
    for node in ast.walk(tree):
        if not isinstance(node, ast.Assign):
            continue
        if not any(isinstance(t, ast.Name) and t.id == 'MODEL_PRESETS'
                   for t in node.targets):
            continue
        for sub in ast.walk(node.value):
            if isinstance(sub, ast.Constant) and isinstance(sub.value, int):
                preset_literals.add(str(sub.value))
    clash = sorted(preset_literals & set(DUPLICATED_LITERALS))
    assert clash == [], (
        f'Nunba MODEL_PRESETS still hard-codes weight literals {clash}; they '
        f'belong to MODEL_WEIGHT_BYTES in HARTOS'
    )


def test_the_two_populators_spell_the_llama_backend_the_same_way():
    """One runtime, one name.

    HARTOS's LLM rows said ``llama_cpp`` and Nunba's said ``llama.cpp``.  Only
    the second is in ``BACKENDS``, in ``TORCHLESS_BACKENDS`` or in
    ``ModelEntry._DOWNLOADED_BACKENDS``, so the underscore spelling silently
    (a) named a backend the registry does not define, (b) answered True to
    ``backend_requires_torch`` — which is what makes a box download multi-GB
    CUDA PyTorch for a runtime that never imports it — and (c) skipped the
    ``files['model']`` validation that lets an undownloadable row be refused.

    MEASURED on the owner's persisted catalogue 2026-09-21: the SAME file,
    Qwen3.5-4B-UD-Q4_K_XL.gguf, registered under two ids with two backends,
    two disk_gb (2.8 / 2.84) and two vram_gb (2.8 / 3.8).
    """
    import inspect

    from integrations.service_tools.model_catalog import (
        BACKENDS,
        ModelCatalog,
        backend_requires_torch,
    )

    src = inspect.getsource(ModelCatalog._populate_llm_models)
    assert "backend='llama_cpp'" not in src, (
        "the LLM ladder still registers the unregistered 'llama_cpp' spelling"
    )
    assert "backend='llama.cpp'" in src
    assert 'llama.cpp' in BACKENDS
    assert backend_requires_torch('llama.cpp') is False


# ══════════════════════════════════════════════════════════════════
# 2. ONE UNIT — bytes stored, MiB derived
# ══════════════════════════════════════════════════════════════════

@pytest.mark.parametrize('file_name,expected', sorted(MEASURED_BYTES.items()))
def test_measured_rows_carry_the_files_exact_byte_count(file_name, expected):
    """Four rows have files on this box; their size is not an estimate."""
    preset = _preset_for(file_name)
    assert preset.size_bytes == expected


def test_size_mb_is_the_exact_mib_view_of_the_byte_count():
    """The name says MB; every consumer means MiB.  Make that true.

    2910 was the decimal-MB reading.  The file is 2777 MiB, and 2777 is
    what ``<= compute_budget_mb`` (itself ``free_vram * 1024``) must be
    compared against.
    """
    from llama.llama_installer import model_size_gib

    preset = _preset_for('Qwen3.5-4B-UD-Q4_K_XL.gguf')

    assert preset.size_mb == round(2_912_109_728 / BYTES_PER_MIB)   # 2777
    assert preset.size_mb != 2910, (
        'still the decimal-MB literal, which overstates the weights by '
        '4.8% against every MiB budget in the codebase'
    )
    # The BYTE count is the exact one; size_mb is a rounded VIEW of it, so
    # the GiB figure the VRAM decisions use comes from the bytes, never from
    # re-dividing the view (that would round twice).
    assert model_size_gib(preset) == pytest.approx(2.712114, abs=1e-6)
    assert preset.size_mb / 1024.0 == pytest.approx(2.712114, abs=0.001)


def test_the_qwen3_vl_2b_literal_matched_neither_unit():
    """1500 was not MB and not MiB — it was wrong.  Measuring replaces it."""
    preset = _preset_for('Qwen3-VL-2B-Instruct-UD-Q4_K_XL.gguf')

    assert preset.size_bytes == 1_129_709_248
    assert 1500 / (preset.size_bytes / BYTES_PER_MIB) > 1.35, (
        'the old literal was >35% over the true MiB figure; if this ratio '
        'fell, the measurement changed and the docstring needs revisiting'
    )


def test_unmeasured_rows_declare_the_unit_they_were_typed_in():
    """9B/27B/35B have no file on this box — NOT CHECKED.

    Their literals are kept as ESTIMATES, converted from the unit their
    author used (``6113,  # 5.97 GB`` is 6113/1024, i.e. MiB).  The table
    must say so per row, so nobody later mistakes an estimate for a
    measurement.
    """
    from integrations.service_tools.model_catalog import MODEL_WEIGHT_BYTES

    for file_name, (nbytes, provenance) in MODEL_WEIGHT_BYTES.items():
        assert isinstance(nbytes, int) and nbytes > 0, file_name
        assert provenance, f'{file_name} declares no provenance'
        if file_name in MEASURED_BYTES:
            assert provenance.startswith('measured'), file_name
            assert nbytes == MEASURED_BYTES[file_name], file_name
        else:
            assert provenance.startswith('estimate'), file_name
            # An estimate must name the unit it was typed in.
            assert ('MiB' in provenance or 'MB' in provenance), (
                f'{file_name} is an estimate but does not say in which unit '
                f'its literal was written: {provenance!r}'
            )


def test_a_measured_row_agrees_with_the_file_when_one_is_present():
    """If the .gguf is on this box, the table must match it byte for byte.

    This is the only test here that can go red because reality moved
    (a re-quantised upload).  That is the point: it fails loudly rather
    than letting a stale literal drift back into the decisions.
    """
    from pathlib import Path

    from integrations.service_tools.model_catalog import MODEL_WEIGHT_BYTES

    search = [Path.home() / '.nunba' / 'models',
              Path.home() / '.trueflow' / 'models']
    checked = 0
    for file_name, (nbytes, _prov) in MODEL_WEIGHT_BYTES.items():
        for d in search:
            f = d / file_name
            if f.exists():
                assert f.stat().st_size == nbytes, (
                    f'{file_name}: table says {nbytes}, disk says '
                    f'{f.stat().st_size}'
                )
                checked += 1
                break
    # The weights are a property of THIS box, not of the repo: under the
    # fake HOME the suite runs with (memory: nunba tests need a fake home)
    # and on CI there is no .gguf to compare against.  "Found 0" is then
    # "nothing to check", not a failure -- the byte comparison above is
    # the assertion, and it ran for every file that was present.  This
    # used to demand `checked >= 4`, which encoded one machine's model
    # directory into the test and went red under the fake HOME
    # (measured 2026-09-22: 0 found, 4 expected).
    if checked == 0:
        pytest.skip('no MODEL_WEIGHT_BYTES .gguf present under this HOME; '
                    'nothing to compare')


# ══════════════════════════════════════════════════════════════════
# 3. ONE CONVERSION — model_size_bytes, and model_size_gib on top
# ══════════════════════════════════════════════════════════════════

@pytest.fixture
def sized_file(monkeypatch):
    """Make FAKE_MODEL_PATH stat as 2,912,109,728 bytes without writing it.

    Patching the stat rather than writing 2.9 GB to a laptop disk to test
    a division — see memory/feedback_disk_full_voids_live_runs.md.
    """
    real_getsize, real_exists = os.path.getsize, os.path.exists
    monkeypatch.setattr(os.path, 'getsize',
                        lambda p: 2_912_109_728 if str(p) == FAKE_MODEL_PATH
                        else real_getsize(p))
    monkeypatch.setattr(os.path, 'exists',
                        lambda p: True if str(p) == FAKE_MODEL_PATH
                        else real_exists(p))
    return FAKE_MODEL_PATH


def test_model_size_bytes_measures_the_file_when_it_exists(sized_file):
    from llama.llama_installer import model_size_bytes

    preset = _preset_for('Qwen3.5-2B-UD-Q4_K_XL.gguf')   # table says 1.33 GB
    assert model_size_bytes(preset, model_path=sized_file) == 2_912_109_728


def test_model_size_bytes_falls_back_to_the_tables_estimate():
    from llama.llama_installer import model_size_bytes

    preset = _preset_for('Qwen3.5-4B-UD-Q4_K_XL.gguf')
    assert model_size_bytes(preset, model_path=None) == 2_912_109_728


def test_model_size_gib_is_defined_as_bytes_over_gib(sized_file):
    """GiB is a VIEW of the one byte count, not a second conversion."""
    from llama.llama_installer import model_size_bytes, model_size_gib

    preset = _preset_for('Qwen3.5-4B-UD-Q4_K_XL.gguf')
    for path in (sized_file, None):
        assert model_size_gib(preset, model_path=path) == (
            model_size_bytes(preset, model_path=path) / BYTES_PER_GIB)


def test_a_duck_typed_preset_with_only_size_mb_still_converts():
    """Catalog-reconstructed and test-stub presets carry only size_mb.

    They must route through the SAME conversion, reading the field as the
    MiB it has always been meant to be.
    """
    from llama.llama_installer import model_size_bytes

    class _OnlySizeMb:
        size_mb = 4096

    assert model_size_bytes(_OnlySizeMb()) == 4096 * BYTES_PER_MIB


def test_the_completeness_gate_uses_the_true_byte_count(monkeypatch):
    """get_model_path's 90% floor must be 90% of the MEASURED size.

    It used ``size_mb * 1024 * 1024`` — a third vocabulary — which read
    2910 as MiB and demanded 2,746,220,544 bytes of a file that is
    2,912,109,728.  The docstring blamed "4-7% preset estimate drift";
    2910/2777.2 = 1.0478 is exactly the MB-to-MiB ratio.
    """
    import models.catalog as _mc
    from llama.llama_installer import LlamaInstaller

    preset = _preset_for('Qwen3.5-4B-UD-Q4_K_XL.gguf')
    seen = []
    # Keep this a unit test: the real get_catalog() populates every
    # subsystem (TTS/STT/VLM), which imports torch and friends.  The
    # threshold arithmetic is what is under test.
    monkeypatch.setattr(_mc, 'get_catalog',
                        lambda: (_ for _ in ()).throw(RuntimeError('no catalog')))
    monkeypatch.setattr(LlamaInstaller, '_is_gguf_complete',
                        staticmethod(lambda path, min_bytes: seen.append(min_bytes) or False))
    monkeypatch.setattr(LlamaInstaller, '_find_file_in_dirs',
                        lambda self, name, min_size=1000: seen.append(min_size) or None)

    LlamaInstaller().get_model_path(preset)

    assert seen, 'no completeness threshold was computed at all'
    assert max(seen) == int(2_912_109_728 * 0.90)


# ══════════════════════════════════════════════════════════════════
# 4. THE CATALOG ROUND TRIP — preset -> entry -> preset
# ══════════════════════════════════════════════════════════════════

@pytest.mark.timeout(300)
def test_the_catalog_round_trip_preserves_the_byte_count_exactly():
    """populate -> ModelEntry -> _entry_to_preset must not lose the size.

    It used to go out through ``disk_gb = round(size_mb / 1024.0, 1)`` and
    come back through ``size_mb = int(round(disk_gb * 1024))`` — one
    decimal place of GiB, so 2910 returned as 2867.  43 MiB evaporated on
    every catalog-driven load.
    """
    import tempfile

    from integrations.service_tools.model_catalog import ModelCatalog

    from models.catalog import ModelType, populate_llm_presets
    from models.orchestrator import _entry_to_preset

    tmp = tempfile.NamedTemporaryFile(suffix='.json', delete=False)
    tmp.close()
    catalog = ModelCatalog(catalog_path=tmp.name)
    populate_llm_presets(catalog)

    source = _preset_for('Qwen3.5-4B-UD-Q4_K_XL.gguf')
    entry = next(e for e in catalog.list_by_type(ModelType.LLM)
                 if e.files.get('model') == source.file_name)

    assert _entry_to_preset(entry).size_bytes == source.size_bytes


@pytest.mark.timeout(300)
def test_an_entry_without_a_byte_count_still_derives_from_disk_gb():
    """Back-compat: user-registered + admin-UI entries carry only disk_gb.

    They keep the documented ``int(round(disk_gb * 1024))`` behaviour, and
    that number is MiB — which is what disk_gb * 1024 has always produced.
    """
    from integrations.service_tools.model_catalog import ModelEntry, ModelType

    from models.orchestrator import _entry_to_preset

    entry = ModelEntry(id='llm-x', name='X', model_type=ModelType.LLM,
                       files={'model': 'x.gguf'}, repo_id='org/x',
                       disk_gb=1.5, backend='llama.cpp')
    preset = _entry_to_preset(entry)
    assert preset.size_mb == 1536
    assert preset.size_bytes == 1536 * BYTES_PER_MIB


# ══════════════════════════════════════════════════════════════════
# 5. SOURCE GUARD — no new hand-rolled conversion
# ══════════════════════════════════════════════════════════════════

# Every module that reads a ModelPreset.  llama_installer is excluded: it
# IS the conversion module.
_PRESET_CONSUMERS = (
    'main.py',
    'llama/llama_config.py',
    'llama/llama_health_endpoint.py',
    'models/catalog.py',
    'models/orchestrator.py',
    'desktop/ai_installer.py',
    'routes/chatbot_routes.py',
)
_SCALE_CONSTANTS = (1024, 1024.0, 1048576, 1_000_000, 1e6)


def _mentions_size_mb(node):
    return any(isinstance(n, ast.Attribute) and n.attr == 'size_mb'
               for n in ast.walk(node))


def test_no_module_rolls_its_own_size_conversion():
    """``size_mb / 1024`` and ``size_mb * 1024 * 1024`` are how this got
    fragmented: six sites picked a divisor, a seventh picked a multiplier,
    and each one silently asserted a unit the table did not guarantee.

    AST, not regex, so the prose in the docstrings that EXPLAINS the bug
    does not trip its own guard.
    """
    offenders = []
    for rel in _PRESET_CONSUMERS:
        path = os.path.join(PROJECT_ROOT, rel)
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as fh:
            tree = ast.parse(fh.read(), filename=rel)
        for node in ast.walk(tree):
            if not isinstance(node, ast.BinOp):
                continue
            if not isinstance(node.op, (ast.Div, ast.Mult)):
                continue
            if not _mentions_size_mb(node.left):
                continue
            if (isinstance(node.right, ast.Constant)
                    and node.right.value in _SCALE_CONSTANTS):
                offenders.append(f'{rel}:{node.lineno}')

    assert offenders == [], (
        f'these sites convert a preset size by hand instead of calling '
        f'llama_installer.model_size_bytes / model_size_gib: {offenders}'
    )
