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
    """The spawn's booking decision, through the REAL rule.

    This used to be a four-line copy of the rule, pinned to the source by a
    string match; the copy passed while the spawn measured nothing (#110).
    It now calls llama_config.spawn_vram_delta_gb, the function the spawn
    itself calls.
    """
    from llama.llama_config import spawn_vram_delta_gb
    measured = spawn_vram_delta_gb(vram_before, vram_after)
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


class TestTheReadsAreFresh:
    """#110, MEASURED: both reads went through get_free_vram(), which returns
    detect_gpu()'s memoized sample, so before and after were the SAME number
    and the delta was always 0.0 -- no residency was ever recorded. Each read
    must force a new sample, the way _get_ctx_size already does
    (refresh_gpu_info(force=True), with the 117-second-stale measurement
    recorded there)."""

    class _MemoVM:
        """A vram manager whose plain read is a memo: only a forced
        refresh takes a new sample."""

        def __init__(self, samples):
            self._samples = list(samples)
            self._memo = self._samples.pop(0)
            self.forced = 0

        def refresh_gpu_info(self, force=False):
            if force:
                self.forced += 1
                self._memo = self._samples.pop(0)
            return {'free_gb': self._memo}

        def get_free_vram(self):
            return self._memo

    def test_each_read_takes_a_new_sample(self):
        from llama.llama_config import fresh_free_vram_gb
        vm = self._MemoVM([7.9, 7.60, 4.73])      # memo is stale 7.9
        before = fresh_free_vram_gb(vm)
        after = fresh_free_vram_gb(vm)
        assert (before, after) == (7.60, 4.73)
        assert vm.forced == 2

    def test_the_spawn_delta_is_real_through_fresh_reads(self):
        from llama.llama_config import fresh_free_vram_gb
        vm = self._MemoVM([7.60, 7.60, 4.73])
        booked, measured = book(fresh_free_vram_gb(vm),
                                fresh_free_vram_gb(vm), file_gb=21.19)
        assert measured == 2.87 and booked == 2.87

    def test_the_spawn_calls_the_fresh_read_not_the_memo(self):
        """test_source_guard_*: the two spawn reads are the regression
        this file exists for; a behavioural test of _do_start_server would
        have to spawn llama-server."""
        import ast
        src = open(os.path.join(_NUNBA, 'llama', 'llama_config.py'),
                   encoding='utf-8').read()
        fn = next(n for n in ast.walk(ast.parse(src))
                  if isinstance(n, ast.FunctionDef)
                  and n.name == '_do_start_server')
        calls = [n.func.attr if isinstance(n.func, ast.Attribute)
                 else getattr(n.func, 'id', '')
                 for n in ast.walk(fn) if isinstance(n, ast.Call)]
        assert calls.count('fresh_free_vram_gb') >= 2, calls
        assert 'spawn_vram_delta_gb' in calls


class TestTheRecordIsKeyedByFile:
    """record_residency needs a model id; the spawn holds a path. Four
    places match a preset to a row using three different rules (#112), so
    the spawn uses none of them -- it asks by weight file, which is a key."""

    def test_the_lookup_resolves_a_spawn_path(self):
        import threading

        from integrations.service_tools.model_catalog import ModelCatalog, ModelEntry, ModelType
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

        from integrations.service_tools.model_catalog import ModelCatalog, ModelEntry, ModelType
        c = ModelCatalog.__new__(ModelCatalog)
        c._entries, c._populators = {}, {}
        c._lock = threading.RLock()
        for mid in ('a', 'b'):
            c._entries[mid] = ModelEntry(id=mid, name=mid,
                                         model_type=ModelType.LLM,
                                         files={'model': 'same.gguf'})
        assert c.get_by_weight_file('same.gguf') is None


class TestTheAfterReadWaitsForTheWeights:
    """MEASURED 2026-09-24 16:50:12 on the installed 8e151d10: the spawn
    logged "alive but loading model (HTTP 503) ... Server started
    successfully (took 0.5s)" -- check_server_running counts a loading
    server as started (on purpose, for the watchdog) -- and the post-spawn
    read 0.1 s later booked "llm = 0.130GiB (measured; file is 2.712GiB)"
    for a dense 4B. The after-read must wait until the weights are in."""

    def _cfg(self, statuses):
        from llama.llama_config import LlamaConfig, ServerType
        cfg = LlamaConfig.__new__(LlamaConfig)
        seq = list(statuses)

        def fake_type(port):
            s = seq.pop(0) if len(seq) > 1 else seq[0]
            if s is None:
                return ServerType.NOT_RUNNING, None
            return ServerType.EXTERNAL_LLAMA, {'status': s}
        cfg.check_server_type = fake_type
        return cfg

    def test_waits_through_loading_until_the_model_serves(self, monkeypatch):
        import llama.llama_config as lc
        monkeypatch.setattr(lc.time, 'sleep', lambda s: None)
        cfg = self._cfg(['loading', 'loading', 'ok'])
        assert cfg._wait_until_serving(8080, timeout=10) is True

    def test_a_model_still_loading_at_the_deadline_is_not_measured(self, monkeypatch):
        import llama.llama_config as lc
        clock = iter(range(0, 1000))
        monkeypatch.setattr(lc.time, 'sleep', lambda s: None)
        monkeypatch.setattr(lc.time, 'time', lambda: float(next(clock)))
        cfg = self._cfg(['loading'])
        assert cfg._wait_until_serving(8080, timeout=5) is False

    def test_a_dead_server_is_not_measured(self, monkeypatch):
        import llama.llama_config as lc
        clock = iter(range(0, 1000))
        monkeypatch.setattr(lc.time, 'sleep', lambda s: None)
        monkeypatch.setattr(lc.time, 'time', lambda: float(next(clock)))
        cfg = self._cfg([None])
        assert cfg._wait_until_serving(8080, timeout=5) is False

    def test_the_spawn_gates_the_after_read_on_serving(self):
        """test_source_guard_*: the after-read in _do_start_server must be
        preceded by the serving wait; the spawn itself can't be driven here."""
        import ast
        src = open(os.path.join(_NUNBA, 'llama', 'llama_config.py'),
                   encoding='utf-8').read()
        fn = next(n for n in ast.walk(ast.parse(src))
                  if isinstance(n, ast.FunctionDef)
                  and n.name == '_do_start_server')
        calls = [(n.lineno, n.func.attr if isinstance(n.func, ast.Attribute)
                  else getattr(n.func, 'id', ''))
                 for n in ast.walk(fn) if isinstance(n, ast.Call)]
        waits = [ln for ln, name in calls if name == '_wait_until_serving']
        deltas = [ln for ln, name in calls if name == 'spawn_vram_delta_gb']
        assert waits and deltas and min(waits) < min(deltas), calls
