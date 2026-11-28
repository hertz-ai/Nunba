"""The speech loader says a row is on disk only when that row's model is.

Owner, 2026-11-24: "on a fresh install what gets auto setup shd be tested,
it shd be sensible defaults with single source of truth of what exists in
disk, what was setup already".

The catalog's downloaded flag for every speech row comes from
``STTLoader.is_downloaded``.  It answered "is the faster_whisper package
importable" for every row, so faster-whisper medium (never fetched) and
Moonshine base (never fetched) read as on disk, while the question "which
speech model is actually here" was answered twice more inside whisper_tool.
Live 2026-11-24 on the owner's desktop: the pick was a model that was not on
disk, the recognizer fell back to Whisper base, and Whisper small and medium
sat unused in ~/.hevolve/models/stt.

The loader now answers from the row's own files, through the two checks
whisper_tool already owns (the HF cache for faster-whisper sizes, the
extracted folder for sherpa-onnx models), and only when the row's engine
package is importable.  No third check is written here.

The model folder is a pytest tmp_path and the HF cache answer is a fixed
set, so nothing in the person's home is read or written.
"""
import importlib.util
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import integrations.service_tools.whisper_tool as wt
import pytest

from models.orchestrator import STTLoader


@pytest.fixture
def disk(tmp_path, monkeypatch):
    """A speech model folder and an HF cache the test controls."""
    monkeypatch.setattr(wt, '_get_stt_dir', lambda: tmp_path)
    cached_sizes = set()
    monkeypatch.setattr(wt, '_faster_whisper_model_cached',
                        lambda size: size in cached_sizes)

    def put_sherpa(key):
        cfg = wt._SHERPA_MODELS[key]
        folder = tmp_path / cfg['dir']
        folder.mkdir(parents=True, exist_ok=True)
        for name in cfg['files'].values():
            (folder / name).write_bytes(b'x')

    return SimpleNamespace(put_sherpa=put_sherpa, cached_sizes=cached_sizes,
                           root=tmp_path)


def _packages(*installed):
    """find_spec answering for the engine packages only."""
    real = importlib.util.find_spec

    def find_spec(name, *a, **kw):
        if name in ('faster_whisper', 'sherpa_onnx'):
            return MagicMock() if name in installed else None
        return real(name, *a, **kw)
    return patch('importlib.util.find_spec', side_effect=find_spec)


def _row(row_id):
    return SimpleNamespace(id=row_id, model_type='stt')


def test_a_sherpa_whisper_on_disk_reads_downloaded(disk):
    disk.put_sherpa('whisper-small')
    with _packages('faster_whisper', 'sherpa_onnx'):
        assert STTLoader().is_downloaded(_row('stt-sherpa-whisper-small')) is True


def test_a_sherpa_whisper_not_on_disk_reads_not_downloaded(disk):
    disk.put_sherpa('whisper-small')
    with _packages('faster_whisper', 'sherpa_onnx'):
        assert STTLoader().is_downloaded(_row('stt-sherpa-whisper-medium')) is False


def test_a_half_extracted_sherpa_folder_reads_not_downloaded(disk):
    disk.put_sherpa('whisper-medium')
    cfg = wt._SHERPA_MODELS['whisper-medium']
    (disk.root / cfg['dir'] / cfg['files']['encoder']).unlink()
    with _packages('faster_whisper', 'sherpa_onnx'):
        assert STTLoader().is_downloaded(_row('stt-sherpa-whisper-medium')) is False


def test_a_faster_whisper_size_never_fetched_reads_not_downloaded(disk):
    """The live case: the package is installed, the medium weights are not."""
    disk.cached_sizes.add('base')
    with _packages('faster_whisper', 'sherpa_onnx'):
        assert STTLoader().is_downloaded(_row('stt-faster-whisper-medium')) is False


def test_a_cached_faster_whisper_size_reads_downloaded(disk):
    disk.cached_sizes.add('base')
    with _packages('faster_whisper'):
        assert STTLoader().is_downloaded(_row('stt-faster-whisper-base')) is True


def test_weights_without_their_engine_read_not_downloaded(disk):
    """Files alone are not a working model: the row's engine must import."""
    disk.put_sherpa('whisper-small')
    disk.cached_sizes.add('base')
    with _packages():
        assert STTLoader().is_downloaded(_row('stt-sherpa-whisper-small')) is False
        assert STTLoader().is_downloaded(_row('stt-faster-whisper-base')) is False


def test_a_row_no_engine_knows_reads_not_downloaded(disk):
    with _packages('faster_whisper', 'sherpa_onnx'):
        assert STTLoader().is_downloaded(_row('stt-unknown-engine')) is False
