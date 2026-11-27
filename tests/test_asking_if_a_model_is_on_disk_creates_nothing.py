"""Asking whether a model is on disk creates nothing and detects no GPU.

rv_dlf on 5278cd79 (11-24): the catalog's downloaded flag comes from
LlamaLoader.is_downloaded, which built a LlamaInstaller for every row.  The
constructor made ~/.nunba/models and the llama.cpp parent folder and ran GPU
detection (~1.3 s), so one catalog scan created folders on a fresh install
and spent seconds detecting the same GPU again and again.

Owner 2026-11-24: "create if not present shd be automatic why are we asking
caller to pass this".  So nothing is passed and nothing is cached: the
constructor creates nothing, gpu_available is detected on its first read,
and the code that writes makes its own folder.  The one reader that leaned
on the constructor's folder (main.py's disk check) now asks the shared
free_bytes, which measures the nearest existing parent.

    python -m pytest tests/test_asking_if_a_model_is_on_disk_creates_nothing.py -q
"""
import ast
import io
import os
import types

import pytest

_NUNBA = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture
def detections(monkeypatch):
    """Every GPU detection, recorded instead of run."""
    from llama import llama_installer as li
    calls = []

    def _detect(os_name):
        calls.append(os_name)
        return 'none'

    monkeypatch.setattr(li.LlamaInstaller, 'detect_backend',
                        staticmethod(_detect))
    return calls


def _installer(root, models='models'):
    from llama.llama_installer import LlamaInstaller
    return LlamaInstaller(install_dir=str(root / 'llama.cpp'),
                          models_dir=str(root / models))


def test_building_an_installer_creates_no_folder_and_detects_no_gpu(
        tmp_path, detections):
    _installer(tmp_path)
    assert list(tmp_path.iterdir()) == [], 'the constructor wrote to disk'
    assert detections == [], 'the constructor detected the GPU'


def test_a_catalog_scan_creates_nothing_and_detects_no_gpu(
        tmp_path, detections):
    """rv_dlf's case: the loader asks once per row (every built-in preset)."""
    from llama.llama_installer import MODEL_PRESETS
    from models.orchestrator import LlamaLoader
    loader = LlamaLoader()
    rows = [types.SimpleNamespace(
                name=p.display_name,
                files={'model': p.file_name,
                       'local_dir': str(tmp_path / 'models')})
            for p in MODEL_PRESETS]
    answers = [loader.is_downloaded(row) for row in rows]
    assert answers == [False] * len(rows)
    assert list(tmp_path.iterdir()) == [], 'a read created a folder'
    assert detections == [], f'{len(detections)} GPU detections for reads'


def test_a_model_on_disk_still_reads_as_on_disk(tmp_path, detections):
    from llama.llama_installer import MODEL_PRESETS
    preset = MODEL_PRESETS[0]
    models = tmp_path / 'models'
    models.mkdir()
    names = [preset.file_name]
    if preset.has_vision and preset.mmproj_file:
        names.append(preset.mmproj_file)  # a vision model needs its projector
    for name in names:
        with open(models / name, 'wb') as f:
            f.truncate(200 * 1024 * 1024)  # above the 100 MB floor
    assert _installer(tmp_path).is_model_downloaded(preset) is True


def test_the_gpu_is_detected_once_on_first_read(tmp_path, detections):
    inst = _installer(tmp_path)
    assert inst.gpu_available == 'none'
    assert inst.gpu_available == 'none'
    assert len(detections) == 1


def test_a_download_makes_its_folder_as_it_writes(
        tmp_path, monkeypatch, detections):
    import urllib.request
    body = b'gguf-bytes'

    class _Response(io.BytesIO):
        headers = {'Content-Length': str(len(body))}

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            self.close()

    monkeypatch.setattr(urllib.request, 'urlopen',
                        lambda req, timeout=30: _Response(body))
    dest = tmp_path / 'models' / 'm.gguf'
    _installer(tmp_path).download_file_with_progress(
        'https://example.invalid/m.gguf', dest)
    assert dest.read_bytes() == body


def test_the_install_disk_check_measures_a_folder_not_made_yet(tmp_path):
    """main._gguf_install_files: a models folder the download has not made
    yet is measured, not refused (it raised 'could not inspect the
    configured Nunba model-storage volume')."""
    src = open(os.path.join(_NUNBA, 'main.py'), encoding='utf-8').read()
    fn = next(n for n in ast.parse(src).body
              if isinstance(n, ast.FunctionDef)
              and n.name == '_gguf_install_files')
    ns = {}
    exec(compile(ast.Module(body=[fn], type_ignores=[]), 'main.py', 'exec'),
         ns)
    target = tmp_path / 'not_made_yet' / 'models'
    got = ns['_gguf_install_files'](
        ['m-Q4_K_M.gguf'], '', {'m-Q4_K_M.gguf': 1024},
        {'gpu_available': False, 'vram_free_gb': 0, 'ram_free_gb': 64},
        target_dir=str(target))
    assert got.get('model') == 'm-Q4_K_M.gguf', got
    assert not target.exists(), 'measuring made the folder'
