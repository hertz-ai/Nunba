"""What a model costs on this card is measured, not taken from its size.

The spawn used to book the FILE SIZE as the VRAM reservation:

    vm._allocations['llm'] = model_size_gib(preset, ...)

That is a fair stand-in while llama.cpp puts every weight in VRAM. It
stopped being one the moment --cpu-moe shipped (Nunba ed44d60d): a
mixture of experts runs its experts from system RAM, so Tiel-Coder-35B-A3B
costs 2.87 GiB of an 8 GB card for a 21.19 GiB file -- the booking
overstated it by about 7x.

Per-process VRAM cannot be read from the driver on this platform:
`nvidia-smi --query-compute-apps=pid,used_memory` returns [N/A] on Windows
WDDM. So the only source is a DELTA around the spawn -- free before, free
once the server answers /health -- which is how the 2.87 GiB figure was
obtained in the first place.

These tests pin the arithmetic and, more importantly, the guards: a
polluted delta must leave today's behaviour untouched rather than book a
wrong number durably.

    python -m pytest tests/test_spawn_records_residency.py -q
"""
import os
import sys

import pytest

_NUNBA = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
for _p in (_NUNBA, os.path.join(os.path.dirname(_NUNBA), 'HARTOS')):
    if _p not in sys.path:
        sys.path.insert(0, _p)


def book(vram_before, vram_after, file_gb):
    """The spawn's booking decision, as written in llama_config.

    Reproduced here rather than imported because it lives inside a 700-line
    method that spawns a subprocess; what is under test is the RULE, and
    the rule is four lines. If those four lines change in the source and
    not here, the source is no longer what this file claims to pin -- the
    guard against that is test_the_rule_matches_the_source below.
    """
    measured = None
    if vram_before is not None and vram_after is not None:
        delta = vram_before - vram_after
        if 0.05 < delta < 512:
            measured = round(delta, 3)
    return (measured if measured else file_gb), measured


class TestTheMeasurementWins:
    def test_a_moe_books_what_it_took_not_what_it_weighs(self):
        """The case that motivated this. 8 GB card, free goes 7.60 -> 4.73
        while a 21.19 GiB file loads with --cpu-moe."""
        booked, measured = book(7.60, 4.73, file_gb=21.19)
        assert measured == 2.87
        assert booked == 2.87

    def test_a_dense_model_books_about_its_file_size_anyway(self):
        """No regression for the common case: when llama.cpp does put
        every weight in VRAM, the delta and the file size agree, so the
        change is invisible."""
        booked, measured = book(7.60, 4.79, file_gb=2.80)
        assert measured == pytest.approx(2.81, abs=0.01)
        assert booked == pytest.approx(2.81, abs=0.01)


class TestAPollutedDeltaChangesNothing:
    """The delta is taken across a window in which other processes are
    free to allocate and release. A bad number must not be booked, and
    must never be recorded durably -- the next spawn measures again."""

    @pytest.mark.parametrize('before,after,why', [
        (7.60, 9.00, 'another process RELEASED during the window'),
        (7.60, 7.60, 'no change at all -- CPU-only spawn'),
        (7.60, 7.58, 'below the 0.05 floor -- noise, not a model'),
        (None, 4.73, 'pre-spawn read failed'),
        (7.60, None, 'post-spawn read failed'),
    ])
    def test_falls_back_to_the_file_size(self, before, after, why):
        booked, measured = book(before, after, file_gb=21.19)
        assert measured is None, why
        assert booked == 21.19, why

    def test_an_absurd_delta_is_refused(self):
        """A 600 GiB delta is not a model on an 8 GB card."""
        booked, measured = book(700.0, 100.0, file_gb=21.19)
        assert measured is None and booked == 21.19


class TestTheRuleMatchesTheSource:
    """A behavioural test of a reproduced rule is only worth what its
    correspondence to the source is worth. This asserts the source still
    contains the bounds and the fallback this file pins -- if someone
    changes the floor, the ceiling or the `or model_gb` fallback, this
    fails and points at the drift."""

    def test_source_still_has_the_bounds_and_fallback(self):
        src = open(os.path.join(_NUNBA, 'llama', 'llama_config.py'),
                   encoding='utf-8').read()
        assert '0.05 < _delta < 512' in src, 'delta bounds changed'
        assert '_measured_gb if _measured_gb else model_gb' in src, \
            'the fall-back-to-file-size rule changed'
        assert '_vram_before = None' in src, 'pre-spawn read removed'


class TestTheRecordIsKeyedByFile:
    """record_residency needs a model id; the spawn holds a path. Four
    places match a preset to a row using three different rules (#112), so
    the spawn uses none of them -- it asks by weight file, which is a key."""

    def test_the_lookup_resolves_a_spawn_path(self):
        import threading

        from integrations.service_tools.model_catalog import (
            ModelCatalog, ModelEntry, ModelType)
        c = ModelCatalog.__new__(ModelCatalog)
        c._entries, c._populators = {}, {}
        c._lock = threading.RLock()
        c._entries['tiel'] = ModelEntry(
            id='tiel', name='Tiel-Coder 35B', model_type=ModelType.LLM,
            backend='llama.cpp',
            files={'model': 'Tiel-Coder-35B-A3B-MTP-UD-Q4_K_XL.gguf'})

        spawn_path = (r'F:\hevolve\models'
                      r'\Tiel-Coder-35B-A3B-MTP-UD-Q4_K_XL.gguf')
        entry = c.get_by_weight_file(spawn_path)
        assert entry is not None and entry.id == 'tiel'

        c.record_residency(entry.id, vram_gb=2.87,
                           weight_file=os.path.basename(spawn_path))
        assert c.residency('tiel')['vram_gb'] == 2.87

    def test_no_single_owner_means_no_record(self):
        """Two rows claiming one file (#107) -> unknown, not a guess."""
        import threading

        from integrations.service_tools.model_catalog import (
            ModelCatalog, ModelEntry, ModelType)
        c = ModelCatalog.__new__(ModelCatalog)
        c._entries, c._populators = {}, {}
        c._lock = threading.RLock()
        for mid in ('a', 'b'):
            c._entries[mid] = ModelEntry(id=mid, name=mid,
                                         model_type=ModelType.LLM,
                                         files={'model': 'same.gguf'})
        assert c.get_by_weight_file('same.gguf') is None
