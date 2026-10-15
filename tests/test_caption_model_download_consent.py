"""The caption server's start downloads a missing 0.8B only with room for it
and the owner's yes (owner ruling 2026-10-15, amendment A25b).

start_caption_server (llama/llama_config.py) is what main.py's boot thread
and its 'vlm_caption.requested' subscriber run, and HARTOS's
Qwen08BBackend.ensure_running sends that event when a reel or a frame needs
the vision model.  When the 0.8B or its projector was missing, the start
downloaded it silently: no free-disk check, no consent, no progress (live
proof A13, finding D3).  Now, before a download it:

  1. checks the free disk where the download goes (the installer's models
     folder, core.platform_paths.free_bytes) against the 0.8B's catalog size
     (ModelPreset.size_bytes, read from HARTOS's MODEL_WEIGHT_BYTES), and
     refuses with a plain reason on the setup card when it does not fit --
     the owner is not asked for something that cannot fit;
  2. asks the owner through HARTOS's one capability consent card,
     capability_setup.ask_owner_for_setup, and downloads only on 'granted'.
     'asked', 'declined', 'unavailable' (and a consent that cannot be
     reached) download nothing, so the caller's fallback runs;
  3. shows the download on the existing setup_progress card.

These tests drive the REAL start_caption_server.  Mocked: the port probe
(nothing is running), the consent answer, the free-disk reading, the
installer's downloads, and the card's publisher.  The spawn is stopped at
its boundary: the installer finds no llama-server binary, so nothing is
launched.  HARTOS (the sibling checkout, put on the path below) is needed;
the tests skip without it.

    python -m pytest tests/test_caption_model_download_consent.py -q
"""
import logging
import os
import sys
import types

import pytest

_NUNBA = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _NUNBA not in sys.path:
    sys.path.insert(0, _NUNBA)
_HARTOS = os.path.normpath(os.path.join(_NUNBA, '..', 'HARTOS'))
if os.path.isdir(_HARTOS) and _HARTOS not in sys.path:
    sys.path.insert(0, _HARTOS)

consent = pytest.importorskip('integrations.agent_engine.capability_setup',
                              reason='HARTOS sibling not importable here')
lightweight = pytest.importorskip('integrations.vision.lightweight_backend',
                                  reason='HARTOS sibling not importable here')
catalog = pytest.importorskip('integrations.service_tools.model_catalog',
                              reason='HARTOS sibling not importable here')
platform_paths = pytest.importorskip('core.platform_paths',
                                     reason='HARTOS sibling not importable here')

from llama.llama_config import LlamaConfig  # noqa: E402
from llama.llama_installer import MODEL_PRESETS  # noqa: E402

PORT = 8081
PRESET = next(p for p in MODEL_PRESETS if '0.8B' in p.display_name)
#: The 0.8B's size in HARTOS's catalog table: what the free disk is checked against.
CATALOG_BYTES = catalog.model_weight_bytes(PRESET.file_name)
CAPABILITY = 'model:' + lightweight.Qwen08BBackend.CATALOG_ID
PLENTY = 50 * 10 ** 9


class Installer:
    """The installer at its download boundary.  ``model`` / ``mmproj``: is
    that file on disk.  download_model fetches both (as the real one does,
    reporting each MB to its progress callback); download_file_with_progress
    is what the real _download_mmproj_only calls.  find_llama_server finds
    no binary, so the start stops before any spawn."""

    def __init__(self, models_dir, *, model=False, mmproj=False):
        self.models_dir = models_dir
        self.have = {'model': model, 'mmproj': mmproj}
        self.calls = []

    def get_model_path(self, preset):
        return str(self.models_dir / preset.file_name) if self.have['model'] else None

    def get_mmproj_path(self, preset):
        return str(self.models_dir / preset.mmproj_file) if self.have['mmproj'] else None

    def download_model(self, preset, progress_callback=None):
        self.calls.append(('download_model', preset.file_name))
        for mb in range(0, 533 + 1):
            if progress_callback:
                progress_callback(mb, 533, f"Downloading model... {mb}MB / 533MB")
        for mb in range(0, 195 + 1):
            if progress_callback:
                progress_callback(mb, 195, f"Downloading vision projector... {mb}MB / 195MB")
        self.have['model'] = self.have['mmproj'] = True
        return True

    def download_file_with_progress(self, url, dest_path, progress_callback=None):
        self.calls.append(('download_file', url, str(dest_path)))
        self.have['mmproj'] = True

    def find_llama_server(self, **kwargs):
        self.calls.append(('find_llama_server',))
        return None

    def downloads(self):
        return [c for c in self.calls if c[0] in ('download_model', 'download_file')]

    def went_on_to_spawn(self):
        return ('find_llama_server',) in self.calls


@pytest.fixture
def box(tmp_path, monkeypatch):
    """One start's world: answers for consent and free disk, a record of
    what was asked, measured and shown on the setup card."""
    monkeypatch.delenv('HEVOLVE_VLM_CAPTION_PORT', raising=False)
    monkeypatch.setattr(LlamaConfig, 'check_server_running',
                        lambda self, port=None: False)
    w = types.SimpleNamespace(answer='granted', free=PLENTY, asked=[], measured=[],
                              cards=[], models=tmp_path / 'models')
    w.models.mkdir()

    def ask(capability, *, reason):
        w.asked.append((capability, reason))
        if isinstance(w.answer, Exception):
            raise w.answer
        return w.answer
    monkeypatch.setattr(consent, 'ask_owner_for_setup', ask)

    def free_bytes(path):
        w.measured.append(str(path))
        if isinstance(w.free, Exception):
            raise w.free
        return w.free
    monkeypatch.setattr(platform_paths, 'free_bytes', free_bytes)

    realtime = types.ModuleType('integrations.social.realtime')
    realtime.publish_event = lambda topic, data, user_id='': w.cards.append((topic, data))
    monkeypatch.setitem(sys.modules, 'integrations.social.realtime', realtime)

    def start(installer):
        cfg = LlamaConfig.__new__(LlamaConfig)
        cfg.config_dir = tmp_path
        cfg.config = {}
        cfg.installer = installer
        return cfg.start_caption_server(port=PORT)
    w.start = start
    return w


def _steps(box):
    """The setup card's steps, in order (topic setup_progress only)."""
    assert all(topic == 'setup_progress' for topic, _ in box.cards), box.cards
    return [data for _, data in box.cards]


@pytest.mark.parametrize('answer', ['asked', 'declined', 'unavailable'])
def test_no_download_without_the_owners_yes(box, answer):
    """The model is missing and fits, the owner has not said yes: nothing
    is downloaded, nothing is launched, and the start says False, so the
    caller's fallback runs.  The ask is the one consent card, scoped to
    this model's catalog row."""
    box.answer = answer
    inst = Installer(box.models)
    assert box.start(inst) is False
    assert inst.downloads() == []
    assert not inst.went_on_to_spawn()
    assert [c for c, _ in box.asked] == [CAPABILITY]


@pytest.mark.parametrize('broken', ['raises', 'not_importable'])
def test_a_consent_that_cannot_be_reached_downloads_nothing(box, monkeypatch, broken):
    """No answer is not a yes: a consent check that raises, or HARTOS's
    consent module missing, downloads nothing."""
    if broken == 'raises':
        box.answer = RuntimeError('consent store unreachable')
    else:
        monkeypatch.setitem(sys.modules, 'integrations.agent_engine.capability_setup', None)
    inst = Installer(box.models)
    assert box.start(inst) is False
    assert inst.downloads() == []


def test_granted_with_room_runs_the_existing_download(box):
    """Room for the catalog size (exactly enough) and the owner's yes: the
    installer's existing download_model fetches the 0.8B, its progress
    shows on the setup card (a step per tenth, not one per MB), the card
    closes as done, and the start goes on to launch the server."""
    box.free = CATALOG_BYTES
    inst = Installer(box.models)
    box.start(inst)
    assert inst.downloads() == [('download_model', PRESET.file_name)]
    assert inst.went_on_to_spawn()
    capability, reason = box.asked[0]
    assert capability == CAPABILITY
    assert PRESET.display_name in reason and 'Download' in reason
    steps = _steps(box)
    assert {s['job_type'] for s in steps} == {'vlm_caption'}
    assert steps[0]['status'] == 'loading' and not steps[0]['complete']
    assert any('MB / 533MB' in s['message'] for s in steps), 'no download progress shown'
    assert len(steps) <= 30, f'{len(steps)} card steps: one per MB floods the card'
    assert steps[-1]['status'] == 'done' and steps[-1]['complete'] is True
    assert sum(bool(s['complete']) for s in steps) == 1


def test_low_disk_is_refused_with_a_plain_reason(box, caplog):
    """Not enough free disk for the catalog size: the owner is not asked
    (a yes could only end in a full disk), nothing is downloaded, and the
    setup card says how much is needed, where, and how much there is."""
    box.free = 100_000_000
    inst = Installer(box.models)
    with caplog.at_level(logging.WARNING, logger='NunbaLlamaConfig'):
        assert box.start(inst) is False
    assert inst.downloads() == [] and box.asked == []
    need_gb = f'{CATALOG_BYTES / 1e9:.1f} GB'
    (step,) = _steps(box)
    assert step['status'] == 'error' and step['complete'] is True
    assert need_gb in step['message'] and '0.1 GB' in step['message']
    assert str(box.models) in step['message']
    assert any(need_gb in r.getMessage() for r in caplog.records)


@pytest.mark.parametrize('free, asked', [(CATALOG_BYTES - 1, False), (CATALOG_BYTES, True)],
                         ids=['one_byte_short', 'exactly_the_catalog_size'])
def test_the_disk_need_is_the_catalog_size(box, free, asked):
    """The number the free disk is held to is the 0.8B's size in HARTOS's
    catalog table (model_weight_bytes), not a copy: one byte short is
    refused before anyone is asked, exactly that much is asked."""
    box.free = free
    box.answer = 'asked'
    box.start(Installer(box.models))
    assert bool(box.asked) is asked


def test_the_disk_is_measured_where_the_download_goes(box):
    box.answer = 'asked'
    inst = Installer(box.models)
    box.start(inst)
    assert box.measured == [str(inst.models_dir)]


def test_an_unreadable_disk_is_refused(box):
    """Fail closed: a free-disk reading that fails is not room."""
    box.free = OSError('drive not ready')
    inst = Installer(box.models)
    assert box.start(inst) is False
    assert inst.downloads() == [] and box.asked == []
    (step,) = _steps(box)
    assert step['status'] == 'error' and step['complete'] is True


def test_only_the_projector_missing_and_refused_starts_without_vision(box):
    """The weights are here, the projector is not, the owner said no: the
    projector is not downloaded and the start goes on without it, as it
    did when a projector download failed (the 0.8B on this port also
    serves text)."""
    box.answer = 'declined'
    inst = Installer(box.models, model=True)
    box.start(inst)
    assert inst.downloads() == []
    assert inst.went_on_to_spawn()
    assert [c for c, _ in box.asked] == [CAPABILITY]


def test_only_the_projector_missing_and_granted_fetches_only_the_projector(box):
    """The existing _download_mmproj_only runs (the repo's file name, the
    model-specific local name); the weights are not fetched again."""
    inst = Installer(box.models, model=True)
    box.start(inst)
    assert inst.downloads() == [(
        'download_file',
        f'https://huggingface.co/{PRESET.repo_id}/resolve/main/{PRESET.mmproj_source_file}',
        str(box.models / PRESET.mmproj_file))]
    assert inst.went_on_to_spawn()
    assert _steps(box)[-1]['status'] == 'done'


def test_nothing_missing_measures_and_asks_nothing(box):
    """The common case is unchanged: both files here, no disk reading, no
    card of either kind, straight on to the launch."""
    inst = Installer(box.models, model=True, mmproj=True)
    box.start(inst)
    assert box.measured == [] and box.asked == [] and box.cards == []
    assert inst.downloads() == []
    assert inst.went_on_to_spawn()
