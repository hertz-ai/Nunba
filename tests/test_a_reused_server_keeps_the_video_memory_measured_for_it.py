"""A reused llama-server keeps the video memory this process measured for it.

The spawn path measures what a model really takes on the card (free VRAM
before the spawn minus free VRAM once the weights are in) and books that
under the ledger's 'llm' row; the file size is only its fallback.  The two
differ a lot: a mixture of experts run with --cpu-moe took 2.87 GiB of card
for a 21.19 GiB file, and the dense 4B took 4.62 GiB for a 2.712 GiB file
(server.log 11-17 11:42:39).

Nunba 1d352a71 taught the reuse branch of _do_start_server to book a reused
server's size, and it booked the FILE size every time, over whatever the
row held (review rv_nb1, M1).  Live 11-17 in one process: 10:54:27 the 2B
was spawned and measured at 2.910 GiB; 11:41:34 a switch to the 4B found
that 2B still serving and reused it.  With 1d352a71 that reuse turns the
row into 1.248 (the 2B's file); the reviewer's probe of it measured this.

Now a figure measured in this process for the served file is kept, and
the file size is booked only when nothing was measured for that file.

The network is stubbed: check_server_type decides which port looks alive,
requests.get answers /v1/models, and the orchestrator and VRAM ledger are
fakes.  The fake orchestrator's notify_loaded does to the ledger what
HARTOS's does (allocate('llm') books 0.0 when the row is missing and
leaves a present row alone).  Nothing is spawned, downloaded or written
outside pytest's tmp dir.
"""
import ast
import sys
import types
from unittest.mock import MagicMock, patch

import pytest

_PORT = 8080


class _Models:
    """A /v1/models answer naming ``model_id``."""

    status_code = 200

    def __init__(self, model_id):
        self._id = model_id

    def json(self):
        return {'object': 'list', 'data': [{'id': self._id, 'object': 'model'}]}


def _windows_path(preset):
    """llama-server names its model by the path it was started with."""
    return r'C:\Users\someone\.trueflow\models' + '\\' + preset.file_name


def _two_presets():
    """Two presets with weight files, found by what they are, not by name."""
    from llama.llama_installer import MODEL_PRESETS
    rows = [(i, p) for i, p in enumerate(MODEL_PRESETS) if p.file_name]
    assert len(rows) >= 2 and rows[0][1].file_name != rows[1][1].file_name
    return rows[0], rows[1]


def _measured_figure(preset):
    """A figure the card showed that is not the file size (the live 4B took
    4.62 GiB for a 2.712 GiB file: KV cache and buffers ride on top)."""
    from llama.llama_installer import model_size_gib
    return round(model_size_gib(preset) * 1.7 + 0.25, 3)


def _spawn_measured(ledger, gb, weight_path):
    """What the spawn path leaves after it measured ``gb`` for the file at
    ``weight_path``: written through its own writer where the code has one,
    else the bare row the spawn path used to write."""
    import llama.llama_config as lc
    writer = getattr(lc, 'book_llm_vram', None)
    if writer is None:
        ledger._allocations['llm'] = gb
    else:
        writer(ledger, gb, measured_file=weight_path)


def _forget_measurements():
    import llama.llama_config as lc
    writer = getattr(lc, 'book_llm_vram', None)
    if writer is not None:
        writer(types.SimpleNamespace(_allocations={}), 0.0)


@pytest.fixture(autouse=True)
def _nothing_measured_before_or_after():
    """The record is per process; no test sees another test's spawn."""
    _forget_measurements()
    yield
    _forget_measurements()


def _patched(cfg, served_id, ledger):
    """The stubs every start here runs under."""
    from llama.llama_config import LlamaConfig, ServerType

    orchestrator = MagicMock()
    # HARTOS notify_loaded -> _register_vram -> vram_manager.allocate('llm'):
    # a present row is left as it is; a missing one gets the budget, and
    # 'llm' has none, so 0.0.
    orchestrator.notify_loaded.side_effect = (
        lambda *a, **kw: ledger._allocations.setdefault('llm', 0.0))
    fake_module = types.ModuleType('models.orchestrator')
    fake_module.get_orchestrator = lambda: orchestrator

    def alive(port):
        if port == _PORT:
            return (ServerType.EXTERNAL_LLAMA, {'status': 'ok'})
        return (ServerType.NOT_RUNNING, None)

    def get(url, *a, **kw):
        if url.endswith('/v1/models'):
            return _Models(served_id)
        raise OSError('no network in this test')

    return [
        patch.object(cfg, 'check_server_type', side_effect=alive),
        patch('requests.get', side_effect=get),
        patch.object(LlamaConfig, '_propagate_llm_url'),
        patch.object(cfg, '_get_vram_manager', return_value=ledger),
        patch.dict(sys.modules, {'models.orchestrator': fake_module}),
        patch('llama.llama_config._find_live_llama_port', return_value=_PORT),
    ]


def _fresh_config(tmp_config_dir):
    """A NEW LlamaConfig, the way /api/llm/switch and the orchestrator's
    loader build one per call: what the spawn measured must survive it."""
    from llama.llama_config import LlamaConfig
    cfg = LlamaConfig(config_dir=tmp_config_dir)
    cfg.config['server_port'] = _PORT
    cfg.config['use_gpu'] = True
    cfg.installer = MagicMock(gpu_available='nvidia', binary_supports_gpu=True)
    return cfg


def _reuse(tmp_config_dir, served_id, ledger):
    cfg = _fresh_config(tmp_config_dir)
    stubs = _patched(cfg, served_id, ledger)
    for s in stubs:
        s.start()
    try:
        assert cfg._do_start_server(model_preset=None) is True
    finally:
        for s in reversed(stubs):
            s.stop()
    return ledger._allocations.get('llm')


def test_a_booking_measured_for_the_served_file_is_kept(tmp_config_dir):
    """The regression.  The spawn measured the model; a later start that
    reuses the same server must not write the file size over it."""
    (_, preset), _ = _two_presets()
    ledger = types.SimpleNamespace(_allocations={})
    measured = _measured_figure(preset)
    _spawn_measured(ledger, measured, _windows_path(preset))

    booked = _reuse(tmp_config_dir, _windows_path(preset), ledger)

    assert booked == measured, (
        f'the measured {measured} GiB was replaced by {booked!r} GiB on reuse')


def test_every_presets_measured_booking_is_kept(tmp_config_dir):
    """Not one model's luck: whichever preset is served, its measured figure
    stands (the 35B-A3B mixture of experts measured 2.87 GiB went to 22.20,
    its file size, on an 8 GB card)."""
    from llama.llama_installer import MODEL_PRESETS
    for preset in [p for p in MODEL_PRESETS if p.file_name]:
        _forget_measurements()
        ledger = types.SimpleNamespace(_allocations={})
        measured = _measured_figure(preset)
        _spawn_measured(ledger, measured, '/opt/models/' + preset.file_name)
        booked = _reuse(tmp_config_dir, _windows_path(preset), ledger)
        assert booked == measured, (preset.display_name, measured, booked)


def test_a_failed_switch_keeps_the_measured_booking_of_the_model_still_serving(
        tmp_config_dir):
    """The live 11:41:34 path.  The served model was spawned and measured in
    this process; a switch to another model finds it still serving (a fresh
    config holds no handle to stop it), reuses it, and reports the switch
    failed.  The measured row stays."""
    (_, served), (asked_index, _) = _two_presets()
    ledger = types.SimpleNamespace(_allocations={})
    measured = _measured_figure(served)
    _spawn_measured(ledger, measured, _windows_path(served))

    cfg = _fresh_config(tmp_config_dir)
    stubs = _patched(cfg, _windows_path(served), ledger)
    for s in stubs:
        s.start()
    try:
        switched = cfg.switch_model(asked_index)
    finally:
        for s in reversed(stubs):
            s.stop()

    assert switched is False
    assert ledger._allocations.get('llm') == measured


def test_with_nothing_measured_the_file_size_is_booked(tmp_config_dir):
    from llama.llama_installer import model_size_gib
    (_, preset), _ = _two_presets()
    ledger = types.SimpleNamespace(_allocations={})

    booked = _reuse(tmp_config_dir, _windows_path(preset), ledger)

    assert booked == pytest.approx(model_size_gib(preset))
    assert booked > 0.0


def test_a_booking_measured_for_another_model_is_replaced(tmp_config_dir):
    """The row was measured for a model that is no longer served: it says
    nothing about this one, so this one's file size is booked."""
    from llama.llama_installer import model_size_gib
    (_, served), (_, other) = _two_presets()
    ledger = types.SimpleNamespace(_allocations={})
    _spawn_measured(ledger, _measured_figure(other), _windows_path(other))

    booked = _reuse(tmp_config_dir, _windows_path(served), ledger)

    assert booked == pytest.approx(model_size_gib(served))


def test_a_measured_row_another_writer_changed_since_is_booked_afresh(
        tmp_config_dir):
    """auto_setup writes its own preset's file size into the row after
    start_server returns.  Once the row no longer holds the measured
    figure, the measurement is not claimed for it: the served file's size
    is booked."""
    from llama.llama_installer import model_size_gib
    (_, served), (_, other) = _two_presets()
    ledger = types.SimpleNamespace(_allocations={})
    _spawn_measured(ledger, _measured_figure(served), _windows_path(served))
    ledger._allocations['llm'] = model_size_gib(other)

    booked = _reuse(tmp_config_dir, _windows_path(served), ledger)

    assert booked == pytest.approx(model_size_gib(served))


def test_the_spawn_books_through_the_writer_that_remembers_the_file():
    """test_source_guard_spawn_booking: the spawn itself cannot be driven
    here (it would start llama-server).  Its booking must name the file it
    measured, and only when it measured, or a later reuse cannot tell a
    measured row from a file-size one."""
    import llama.llama_config as lc
    src = open(lc.__file__, encoding='utf-8').read()
    fn = next(n for n in ast.walk(ast.parse(src))
              if isinstance(n, ast.FunctionDef)
              and n.name == '_do_start_server')
    calls = [n for n in ast.walk(fn)
             if isinstance(n, ast.Call)
             and getattr(n.func, 'id', '') == 'book_llm_vram']
    named = [ast.unparse(k.value) for c in calls for k in c.keywords
             if k.arg == 'measured_file']
    assert any('model_path' in m and '_measured_gb' in m for m in named), (
        'the spawn path does not tell book_llm_vram which file it measured: '
        f'{named!r}')
