"""The caption server's start downloads a missing 0.8B only with room for it
and the owner's yes (owner ruling 2026-10-15, amendment A25b).

start_caption_server (llama/llama_config.py) is what main.py's boot thread
and its 'vlm_caption.requested' subscriber run, and HARTOS's
Qwen08BBackend.ensure_running sends that event when a reel or a frame needs
the vision model.  When the 0.8B or its projector was missing, the start
downloaded it silently: no free-disk check, no consent, no progress (live
proof A13, finding D3).  Now, before a download it:

  1. checks the free disk where the download goes (the installer's models
     folder, core.platform_paths.free_bytes) against the catalog size of
     every file it would fetch -- the weights and the projector, from
     HARTOS's MODEL_WEIGHT_BYTES -- and refuses with a plain reason on the
     setup card when they do not fit; the owner is not asked for something
     that cannot fit;
  2. asks the owner through HARTOS's one capability consent card,
     capability_setup.ask_owner_for_setup, under the scope HARTOS names for
     this model (Qwen08BBackend.SETUP_CAPABILITY), and downloads only on
     'granted'.  'asked', 'declined', 'unavailable' (and a consent that
     cannot be reached) download nothing, so the caller's fallback runs;
  3. runs the installer's existing download_model, which fetches whichever
     of the two files is missing, shows it on the existing setup_progress
     card (a step per tenth, never dropping the installer's own failure
     line), keeps the per-port start lock fresh while it runs, and closes
     the card as done or as error with the reason.

The owner's yes on the card starts that download at once
(on_caption_setup_granted, main.py's consent.granted subscriber), not at
the next start.

These tests drive the REAL start_caption_server.  Mocked: the port probe,
the consent answer, the free-disk reading, the installer's downloads (or,
for the failure path, the network under the REAL download_model), and the
card's publisher.  The spawn is stopped at its boundary: the installer finds
no llama-server binary, so nothing is launched.  HARTOS (the sibling
checkout, put on the path below) is needed; the tests skip without it.

    python -m pytest tests/test_caption_model_download_consent.py -q
"""
import logging
import os
import sys
import time
import types
import urllib.error

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

import llama.llama_installer as installer_mod  # noqa: E402
from llama.llama_config import LlamaConfig  # noqa: E402
from llama.llama_installer import MODEL_PRESETS, LlamaInstaller  # noqa: E402

PORT = 8081
PRESET = next(p for p in MODEL_PRESETS if '0.8B' in p.display_name)
#: The catalog sizes the free disk is held to (HARTOS MODEL_WEIGHT_BYTES).
WEIGHTS = catalog.model_weight_bytes(PRESET.file_name)
PROJECTOR = catalog.model_weight_bytes(PRESET.mmproj_file)
BOTH = (WEIGHTS or 0) + (PROJECTOR or 0)
CAPABILITY = lightweight.Qwen08BBackend.SETUP_CAPABILITY
PLENTY = 50 * 10 ** 9


class Installer:
    """The installer at its download boundary.  ``model`` / ``mmproj``: is
    that file on disk.  download_model fetches whichever is missing, as the
    real one does, reporting each MB to its progress callback (``during``
    runs between the two); ``fail`` makes it fail as the real one does: one
    progress call (0, 0, 'Download failed: ...') and False.
    find_llama_server finds no binary, so the start stops before a spawn."""

    def __init__(self, models_dir, *, model=False, mmproj=False, fail=None, during=None):
        self.models_dir = models_dir
        self.have = {'model': model, 'mmproj': mmproj}
        self.fail = fail
        self.during = during
        self.calls = []
        self.fetched = []

    def get_model_path(self, preset):
        return str(self.models_dir / preset.file_name) if self.have['model'] else None

    def get_mmproj_path(self, preset):
        return str(self.models_dir / preset.mmproj_file) if self.have['mmproj'] else None

    def download_model(self, preset, progress_callback=None):
        self.calls.append(('download_model', preset.file_name))
        if self.fail:
            progress_callback(0, 0, f"Download failed: {self.fail}")
            return False
        for name, total, what in (('model', 533, 'model'), ('mmproj', 195, 'vision projector')):
            if self.have[name]:
                continue
            for mb in range(0, total + 1):
                progress_callback(mb, total, f"Downloading {what}... {mb}MB / {total}MB")
                if self.during and mb == total // 2:
                    self.during()
            self.have[name] = True
            self.fetched.append(name)
        progress_callback(533, 533, 'Download complete!')
        return True

    def find_llama_server(self, **kwargs):
        self.calls.append(('find_llama_server',))
        return None

    def downloads(self):
        return [c for c in self.calls if c[0] == 'download_model']

    def went_on_to_spawn(self):
        return ('find_llama_server',) in self.calls


@pytest.fixture
def box(tmp_path, monkeypatch):
    """One start's world: answers for consent and free disk, a record of
    what was asked, measured and shown on the setup card."""
    monkeypatch.delenv('HEVOLVE_VLM_CAPTION_PORT', raising=False)
    w = types.SimpleNamespace(answer='granted', free=PLENTY, asked=[], measured=[],
                              cards=[], running=False, owner='owner-1',
                              models=tmp_path / 'models', config_dir=tmp_path)
    w.models.mkdir()
    monkeypatch.setattr(LlamaConfig, 'check_server_running',
                        lambda self, port=None: w.running)

    def ask(capability, *, reason):
        w.asked.append((capability, reason))
        if isinstance(w.answer, Exception):
            raise w.answer
        return w.answer
    monkeypatch.setattr(consent, 'ask_owner_for_setup', ask)
    monkeypatch.setattr(consent, 'setup_owner', lambda: w.owner)

    def free_bytes(path):
        w.measured.append(str(path))
        if isinstance(w.free, Exception):
            raise w.free
        return w.free
    monkeypatch.setattr(platform_paths, 'free_bytes', free_bytes)

    realtime = types.ModuleType('integrations.social.realtime')
    realtime.publish_event = lambda topic, data, user_id='': w.cards.append((topic, data))
    monkeypatch.setitem(sys.modules, 'integrations.social.realtime', realtime)

    def config(installer):
        cfg = LlamaConfig.__new__(LlamaConfig)
        cfg.config_dir = tmp_path
        cfg.config = {}
        cfg.installer = installer
        return cfg
    w.config = config
    w.start = lambda installer: config(installer).start_caption_server(port=PORT)
    w.lock = tmp_path / f'.caption_server_starting.{PORT}.lock'
    return w


def _steps(box):
    """The setup card's steps, in order (topic setup_progress only)."""
    assert all(topic == 'setup_progress' for topic, _ in box.cards), box.cards
    return [data for _, data in box.cards]


def _gb(n):
    return f'{n / 1e9:.1f} GB'


# ── the owner's yes ──────────────────────────────────────────────────────

@pytest.mark.parametrize('answer', ['asked', 'declined', 'unavailable'])
def test_no_download_without_the_owners_yes(box, answer):
    """The model is missing and fits, the owner has not said yes: nothing
    is downloaded, nothing is launched, and the start says False, so the
    caller's fallback runs.  The ask is the one consent card, under the
    scope HARTOS names for this model (the one the reel reads back)."""
    box.answer = answer
    inst = Installer(box.models)
    assert box.start(inst) is False
    assert inst.downloads() == []
    assert not inst.went_on_to_spawn()
    assert [c for c, _ in box.asked] == [CAPABILITY]
    assert CAPABILITY == 'model:' + lightweight.Qwen08BBackend.CATALOG_ID


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


def test_a_node_with_nobody_to_ask_says_how_to_fix_it(box, caplog):
    """Review of be748369 (minor): with no owner (HEVOLVE_OWNER_USER_ID
    unset) the 0.8B is never fetched here, and the log now carries
    capability_setup.NO_OWNER_REMEDY, the actionable text, instead of
    'nobody to ask, or consent could not be reached'."""
    box.answer, box.owner = 'unavailable', None
    with caplog.at_level(logging.INFO, logger='NunbaLlamaConfig'):
        assert box.start(Installer(box.models)) is False
    assert any(consent.NO_OWNER_REMEDY in r.getMessage() for r in caplog.records)


# ── room on the disk ─────────────────────────────────────────────────────

def test_the_projector_has_a_catalog_size():
    """The need is read from the one table, and the projector is in it."""
    assert WEIGHTS and PROJECTOR, (WEIGHTS, PROJECTOR)


@pytest.mark.parametrize('free, asked', [(BOTH - 1, False), (BOTH, True)],
                         ids=['one_byte_short_of_both', 'exactly_both'])
def test_the_need_is_the_weights_and_the_projector(box, free, asked):
    """Review of be748369 (Medium): the check held the disk to the weights
    alone, so a box with room for the weights but not for both was asked
    and its download could fill the disk.  The need is now both files'
    catalog sizes: one byte short of the pair is refused before anyone is
    asked, exactly the pair is asked.  Fails on be748369 (the weights alone
    were the need)."""
    box.free = free
    box.answer = 'asked'
    box.start(Installer(box.models))
    assert bool(box.asked) is asked


@pytest.mark.parametrize('free, asked', [(PROJECTOR - 1, False), (PROJECTOR, True)],
                         ids=['one_byte_short', 'exactly_the_projector'])
def test_only_the_projector_missing_needs_only_the_projectors_room(box, free, asked):
    """Review of be748369 (minor): with the weights here, the need is the
    projector's own size, not the weights' 0.56 GB."""
    box.free = free
    box.answer = 'asked'
    box.start(Installer(box.models, model=True))
    assert bool(box.asked) is asked


def test_low_disk_is_refused_with_a_plain_reason(box, caplog):
    """Not enough free disk for both files: the owner is not asked (a yes
    could only end in a full disk), nothing is downloaded, and the setup
    card -- one terminal error step -- says how much is needed, where, and
    how much there is."""
    box.free = 100_000_000
    inst = Installer(box.models)
    with caplog.at_level(logging.WARNING, logger='NunbaLlamaConfig'):
        assert box.start(inst) is False
    assert inst.downloads() == [] and box.asked == []
    (step,) = _steps(box)
    assert step['job_type'] == 'vlm_caption'
    assert step['status'] == 'error' and step['complete'] is True
    assert _gb(BOTH) in step['message'] and '0.1 GB' in step['message']
    assert str(box.models) in step['message']
    assert any(_gb(BOTH) in r.getMessage() for r in caplog.records)


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


# ── the download ─────────────────────────────────────────────────────────

def test_granted_with_room_runs_the_existing_download(box):
    """Room for both files and the owner's yes: the installer's existing
    download_model fetches the 0.8B and its projector, the progress shows on
    the setup card (a step per tenth, not one per MB), the card closes as
    done, and the start goes on to launch the server."""
    inst = Installer(box.models)
    box.start(inst)
    assert inst.downloads() == [('download_model', PRESET.file_name)]
    assert inst.fetched == ['model', 'mmproj']
    assert inst.went_on_to_spawn()
    capability, reason = box.asked[0]
    assert capability == CAPABILITY
    assert PRESET.display_name in reason and 'Download' in reason and _gb(BOTH) in reason
    steps = _steps(box)
    assert {s['job_type'] for s in steps} == {'vlm_caption'}
    assert steps[0]['status'] == 'loading' and not steps[0]['complete']
    assert any('MB / 533MB' in s['message'] for s in steps), 'no download progress shown'
    assert any('MB / 195MB' in s['message'] for s in steps), 'no projector progress shown'
    assert len(steps) <= 30, f'{len(steps)} card steps: one per MB floods the card'
    assert steps[-1]['status'] == 'done' and steps[-1]['complete'] is True
    assert sum(bool(s['complete']) for s in steps) == 1


def test_only_the_projector_missing_and_granted_fetches_only_the_projector(box):
    """The weights are here: download_model fetches the projector alone
    (its own skip of a file that is present), with its progress shown."""
    inst = Installer(box.models, model=True)
    box.start(inst)
    assert inst.fetched == ['mmproj']
    assert inst.went_on_to_spawn()
    steps = _steps(box)
    assert any('MB / 195MB' in s['message'] for s in steps)
    assert steps[-1]['status'] == 'done'


def test_only_the_projector_missing_and_refused_starts_without_vision(box):
    """The weights are here, the projector is not, the owner said no: the
    projector is not downloaded and the start goes on without it (the 0.8B
    on this port also serves text)."""
    box.answer = 'declined'
    inst = Installer(box.models, model=True)
    box.start(inst)
    assert inst.downloads() == []
    assert inst.went_on_to_spawn()
    assert [c for c, _ in box.asked] == [CAPABILITY]


def test_nothing_missing_measures_and_asks_nothing(box):
    """The common case is unchanged: both files here, no disk reading, no
    card of either kind, straight on to the launch."""
    inst = Installer(box.models, model=True, mmproj=True)
    box.start(inst)
    assert box.measured == [] and box.asked == [] and box.cards == []
    assert inst.downloads() == []
    assert inst.went_on_to_spawn()


def test_a_failed_download_closes_the_card_as_an_error_with_the_reason(box):
    """Review of be748369 (Critical): the installer reports a failure that
    comes before the first byte as progress (0, 0, 'Download failed: ...'),
    and the per-tenth throttle dropped it.  It is shown, and the card closes
    as an error that carries it; nothing is launched without the weights."""
    inst = Installer(box.models, fail='<urlopen error [Errno 11001] getaddrinfo failed>')
    assert box.start(inst) is False
    assert not inst.went_on_to_spawn()
    steps = _steps(box)
    assert any(s['message'].startswith('Download failed:') for s in steps), steps
    assert steps[-1]['status'] == 'error' and steps[-1]['complete'] is True
    assert 'getaddrinfo failed' in steps[-1]['message']


@pytest.fixture
def real_installer(box, monkeypatch):
    """Nunba's REAL LlamaInstaller, kept to a scratch models folder: its
    lookups see no other folder (no sibling project, no HF cache, no
    catalog), its network is ``box.network`` (urlopen), and it finds no
    llama-server, so nothing is spawned."""
    monkeypatch.setattr(installer_mod, 'SIBLING_MODEL_DIRS', [])
    monkeypatch.setattr(installer_mod, '_HF_CACHE_DIR', box.models / 'no-hf-cache')
    import models.catalog as nunba_catalog
    monkeypatch.setattr(nunba_catalog, 'get_catalog',
                        lambda: (_ for _ in ()).throw(RuntimeError('no catalog here')))
    monkeypatch.setattr(LlamaInstaller, 'find_llama_server', lambda self, **kw: None)

    def offline(*a, **kw):
        raise urllib.error.URLError('[Errno 11001] getaddrinfo failed')
    monkeypatch.setattr(installer_mod.urllib.request, 'urlopen', offline)
    inst = LlamaInstaller(models_dir=str(box.models))
    inst.default_models_dir = box.models
    return inst


def test_the_real_download_models_offline_failure_reaches_the_card(box, real_installer):
    """Review of be748369: drive the REAL download_model's failure path
    (offline before the first byte).  The card shows the installer's own
    'Download failed: ...' line and ends as an error naming it; the start
    says False and the caller's fallback runs."""
    assert box.config(real_installer).start_caption_server(port=PORT) is False
    steps = _steps(box)
    failed = [s for s in steps if s['message'].startswith('Download failed:')]
    assert failed and 'getaddrinfo failed' in failed[0]['message'], steps
    assert steps[-1]['status'] == 'error' and steps[-1]['complete'] is True
    assert 'getaddrinfo failed' in steps[-1]['message']
    assert not (box.models / PRESET.file_name).exists()


def test_the_start_lock_stays_fresh_while_the_download_runs(box):
    """Review of be748369 (Medium): the download runs with the per-port
    start lock held, and HARTOS's START_LOCK_STALE_S (120 s) ages that lock
    by its mtime, so a download longer than that let a second start remove
    the 'stale' lock and fetch the same file again.  The download's progress
    keeps the lock's mtime current."""
    stale = lightweight.Qwen08BBackend.START_LOCK_STALE_S
    ages = []

    def midway():
        # Halfway through the weights: age the lock as a long download would
        # leave it.  Halfway through the projector, ~360 progress steps
        # later: read its age, as a second start (or HARTOS) would.
        if not ages:
            old = time.time() - 10 * stale
            os.utime(box.lock, (old, old))
            ages.append(None)
        else:
            ages.append(time.time() - os.path.getmtime(box.lock))

    inst = Installer(box.models, during=midway)
    box.start(inst)
    assert inst.fetched == ['model', 'mmproj']
    assert len(ages) == 2 and ages[1] < stale, ages
    assert not box.lock.exists(), 'the lock outlived the start'


# ── the owner's yes starts it ────────────────────────────────────────────

def _grant(scope=CAPABILITY, consent_type=None):
    return {'user_id': 'owner-1', 'agent_id': None, 'scope': scope,
            'consent_type': consent_type or consent.SETUP_CONSENT_TYPE}


@pytest.mark.parametrize('data, ours', [
    (_grant(), True),
    (_grant(scope='tts:f5_tts'), False),
    (_grant(consent_type='camera'), False),
    ({}, False),
    (None, False),
], ids=['this_models_setup', 'another_capability', 'another_consent', 'empty', 'none'])
def test_only_the_yes_to_this_model_is_taken(data, ours):
    """main.py's consent.granted subscriber acts only on the owner's yes to
    setting this model up: the capability_setup consent under
    Qwen08BBackend.SETUP_CAPABILITY."""
    assert LlamaConfig.caption_setup_granted(data) is ours


def test_the_yes_starts_the_download_and_the_server_now(box):
    """Review of be748369 (Medium): Allow on the card started nothing; the
    download waited for the next boot or the next reel's start.  Now the
    yes runs the start at once: the download (the gate reads the yes) and
    the launch."""
    inst = Installer(box.models)
    # start_caption_server's own answer: False here, at the spawn boundary
    # (this box's installer finds no llama-server).
    assert box.config(inst).on_caption_setup_granted() is False
    assert inst.fetched == ['model', 'mmproj']
    assert inst.went_on_to_spawn()


def test_a_yes_while_the_model_serves_text_fetches_its_projector(box):
    """Review of be748369 (Medium): the 0.8B was started without its
    projector (no yes then) and serves text.  Every later start returned at
    'already running' and never asked again, so the yes did nothing until
    Nunba restarted.  Now the yes fetches the projector at once; the server
    already running is not restarted (it serves draft-first chat), and the
    card says images are read from its next start."""
    box.running = True
    inst = Installer(box.models, model=True)
    assert box.config(inst).on_caption_setup_granted() is True
    assert inst.fetched == ['mmproj']
    assert not inst.went_on_to_spawn()
    done = _steps(box)[-1]
    assert done['status'] == 'done' and 'next start' in done['message']


def test_a_yes_with_nothing_missing_while_serving_does_nothing(box):
    box.running = True
    inst = Installer(box.models, model=True, mmproj=True)
    assert box.config(inst).on_caption_setup_granted() is True
    assert inst.downloads() == [] and box.asked == [] and box.cards == []
