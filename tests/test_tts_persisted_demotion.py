"""Persisted-TTS-demotion round-trip + self-healing tests.

Bug context — 2026-05-07
------------------------
The TTS ladder in ``tts/tts_engine.py:_select_backend_for_language``
walks a quality-ordered preference list and skips backends in
``_demoted_backends`` (failure-circuit-breaker, Fix B 2026-04-28).
Demotion was SESSION-ONLY: each new boot started ``_demoted_backends``
empty and re-burned 3 failures on a deterministically-broken top
engine before the ladder advanced again. User question (verbatim):

  > which TTS is selected and worked gets selected by default forever
  > until a new things comes along? a last worked TTS gets already
  > check how that works or in place now

Naive answer ("persist the last-worked engine") locks the user out of
better engines that arrive later. Right answer is to persist the
NEGATIVE finding instead: the ladder still walks top-down on every
boot (so newly-installed top engines are picked up automatically),
and persistence merely suppresses known-bad rungs until self-healing
kicks in.

Self-healing axes (any one resets a demotion):
  * TTL — ``_DEMOTION_TTL_SECONDS`` (7 days)
  * Schema bump — ``_TTS_STATE_SCHEMA`` differs → wipe all
  * Hub-install completion → ``clear_persisted_demotions()``
  * Admin reset endpoint → ``clear_persisted_demotions()``

These tests exercise the persistence helpers behaviorally (file IO
through a tmp_path, monkeypatched ``_get_tts_state_path``). They do
NOT touch any real backend / GPU / pip — `auto_init=False` skips the
heavy init path so the suite runs in any environment.
"""
from __future__ import annotations

import json
import os
import time

import pytest

# ────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────


@pytest.fixture
def state_path(tmp_path, monkeypatch):
    """Redirect the persisted-state file to a per-test tmp dir.

    Patches BOTH the bound name in ``tts.tts_engine`` (used by the
    instance methods) so every read/write goes through the tmp dir.
    """
    p = tmp_path / 'tts_state.json'
    from tts import tts_engine as _te

    monkeypatch.setattr(_te, '_get_tts_state_path', lambda: str(p))
    return p


@pytest.fixture
def fresh_engine(monkeypatch):
    """Return a TTSEngine with auto_init disabled so __init__ doesn't
    try to detect hardware / load any backend.

    The ``_load_persisted_demotions`` call IS still wired into
    __init__ (that's the whole point of these tests), so each fixture
    invocation hydrates from whatever the state_path fixture wrote
    just before.
    """
    from tts.tts_engine import TTSEngine
    return TTSEngine(auto_init=False)


# ────────────────────────────────────────────────────────────────────
# 1. FT — Round-trip: demote, save, fresh instance hydrates
# ────────────────────────────────────────────────────────────────────


def test_round_trip_demotion_survives_restart(state_path):
    """A backend demoted by ``_record_backend_failure`` reaching the
    threshold must be loaded back into ``_demoted_backends`` by the
    next instance's ``__init__``. Without this the ladder would
    re-burn 3 failures on every boot."""
    from tts.tts_engine import BACKEND_CHATTERBOX_TURBO, TTSEngine

    eng = TTSEngine(auto_init=False)
    # Drive 3 failures — the threshold — so demotion fires + persists.
    for _ in range(3):
        eng._record_backend_failure(BACKEND_CHATTERBOX_TURBO)

    assert BACKEND_CHATTERBOX_TURBO in eng._demoted_backends
    assert state_path.exists(), (
        "_record_backend_failure crossing the threshold must have "
        "written tts_state.json — it didn't"
    )

    # Fresh instance — simulates next boot.
    eng2 = TTSEngine(auto_init=False)
    assert BACKEND_CHATTERBOX_TURBO in eng2._demoted_backends, (
        "fresh instance did not hydrate the persisted demotion — the "
        "ladder will re-burn 3 failures on every boot"
    )
    assert eng2._is_demoted(BACKEND_CHATTERBOX_TURBO)


# ────────────────────────────────────────────────────────────────────
# 2. NFT — TTL expiry: stale entries are dropped on hydrate
# ────────────────────────────────────────────────────────────────────


def test_expired_entry_is_dropped_on_hydrate(state_path):
    """Persisted entries past ``expires_at`` must NOT pollute
    ``_demoted_backends``. Self-heals transient causes (driver flap,
    weights mid-download) without admin intervention."""
    from tts.tts_engine import _TTS_STATE_SCHEMA, TTSEngine

    now = time.time()
    state_path.write_text(json.dumps({
        'schema': _TTS_STATE_SCHEMA,
        'updated_at': now - 86400,
        'demoted': {
            'chatterbox_turbo': {
                'first_demoted_at': now - 86400 * 30,
                'expires_at': now - 60,    # expired 1 minute ago
                'failures_at_demotion': 3,
            },
            'f5': {
                'first_demoted_at': now - 60,
                'expires_at': now + 86400,  # still alive
                'failures_at_demotion': 3,
            },
        },
    }))

    eng = TTSEngine(auto_init=False)
    assert 'chatterbox_turbo' not in eng._demoted_backends, (
        "expired entry was hydrated — TTL is broken"
    )
    assert 'f5' in eng._demoted_backends, (
        "live entry was incorrectly dropped"
    )


# ────────────────────────────────────────────────────────────────────
# 3. NFT — Schema mismatch wipes everything
# ────────────────────────────────────────────────────────────────────


def test_schema_mismatch_drops_all_demotions(state_path):
    """A schema bump means the persistence layout we no longer
    understand. Drop everything; the next demotion rewrites in the
    current schema. Covers ladder restructuring across Nunba versions."""
    from tts.tts_engine import _TTS_STATE_SCHEMA, TTSEngine

    now = time.time()
    state_path.write_text(json.dumps({
        'schema': _TTS_STATE_SCHEMA + 99,  # future / wrong
        'demoted': {
            'chatterbox_turbo': {
                'first_demoted_at': now,
                'expires_at': now + 86400,
                'failures_at_demotion': 3,
            },
        },
    }))

    eng = TTSEngine(auto_init=False)
    assert eng._demoted_backends == set(), (
        "schema mismatch should drop all demotions — got "
        f"{eng._demoted_backends!r}"
    )


# ────────────────────────────────────────────────────────────────────
# 4. NFT — Piper is never persisted, even if a stale file demands it
# ────────────────────────────────────────────────────────────────────


def test_piper_never_hydrated_even_if_persisted(state_path):
    """Piper is the absolute CPU last-resort. Demoting it would leave
    the engine with no backend. ``_record_backend_failure`` already
    guards Piper from in-memory demotion; the persistence layer must
    refuse to hydrate it too in case a future bug or hand-edit puts
    it in the file."""
    from tts.tts_engine import _TTS_STATE_SCHEMA, BACKEND_PIPER, TTSEngine

    now = time.time()
    state_path.write_text(json.dumps({
        'schema': _TTS_STATE_SCHEMA,
        'demoted': {
            BACKEND_PIPER: {
                'first_demoted_at': now,
                'expires_at': now + 86400,
                'failures_at_demotion': 3,
            },
        },
    }))

    eng = TTSEngine(auto_init=False)
    assert BACKEND_PIPER not in eng._demoted_backends, (
        "Piper was hydrated as demoted — a stale file must never be "
        "able to disable the absolute fallback"
    )


def test_piper_never_persisted_on_save(state_path):
    """If something reaches into ``_demoted_backends`` and adds Piper
    directly (test, future bug, manual debug), ``_save_persisted_demotions``
    must refuse to serialise it so the disk file never holds Piper."""
    from tts.tts_engine import BACKEND_PIPER, TTSEngine

    eng = TTSEngine(auto_init=False)
    eng._demoted_backends.add(BACKEND_PIPER)
    eng._demoted_backends.add('chatterbox_turbo')
    eng._save_persisted_demotions()

    assert state_path.exists()
    written = json.loads(state_path.read_text())
    assert BACKEND_PIPER not in written['demoted'], (
        "Piper leaked into the persisted file — the save filter is broken"
    )
    assert 'chatterbox_turbo' in written['demoted']


# ────────────────────────────────────────────────────────────────────
# 5. FT — clear_persisted_demotions clears all
# ────────────────────────────────────────────────────────────────────


def test_clear_all_persisted_demotions(state_path):
    """``clear_persisted_demotions(None)`` is the hub-install /
    admin-reset hook. Must drop every entry and return the count."""
    from tts.tts_engine import TTSEngine

    eng = TTSEngine(auto_init=False)
    eng._demoted_backends.update({'chatterbox_turbo', 'f5', 'kokoro'})
    eng._save_persisted_demotions()
    assert state_path.exists()

    cleared = TTSEngine.clear_persisted_demotions()
    assert cleared == 3

    written = json.loads(state_path.read_text())
    assert written['demoted'] == {}, (
        "clear_persisted_demotions(None) left rows behind"
    )

    # And a fresh instance hydrates nothing.
    eng2 = TTSEngine(auto_init=False)
    assert eng2._demoted_backends == set()


def test_clear_one_persisted_demotion(state_path):
    """Targeted clear leaves siblings intact."""
    from tts.tts_engine import TTSEngine

    eng = TTSEngine(auto_init=False)
    eng._demoted_backends.update({'chatterbox_turbo', 'f5', 'kokoro'})
    eng._save_persisted_demotions()

    cleared = TTSEngine.clear_persisted_demotions('f5')
    assert cleared == 1

    written = json.loads(state_path.read_text())
    remaining = set(written['demoted'].keys())
    assert remaining == {'chatterbox_turbo', 'kokoro'}


def test_clear_when_no_state_file_returns_zero(state_path):
    """No file → no work → no error."""
    from tts.tts_engine import TTSEngine

    assert not state_path.exists()
    assert TTSEngine.clear_persisted_demotions() == 0
    assert TTSEngine.clear_persisted_demotions('chatterbox_turbo') == 0


def test_clear_unknown_backend_returns_zero(state_path):
    """Clearing a backend that isn't demoted is a no-op (returns 0),
    not an error — admin tooling must be idempotent."""
    from tts.tts_engine import TTSEngine

    eng = TTSEngine(auto_init=False)
    eng._demoted_backends.add('chatterbox_turbo')
    eng._save_persisted_demotions()

    assert TTSEngine.clear_persisted_demotions('nonexistent_backend') == 0
    written = json.loads(state_path.read_text())
    assert 'chatterbox_turbo' in written['demoted'], (
        "unrelated entry was disturbed by clear of a non-demoted backend"
    )


# ────────────────────────────────────────────────────────────────────
# 6. NFT — Failure under threshold does NOT persist (no premature wear)
# ────────────────────────────────────────────────────────────────────


def test_under_threshold_failures_do_not_persist(state_path):
    """Persistence should only fire when demotion fires (i.e. at the
    failure threshold). 1-2 failures must NOT touch disk — that
    avoids file IO on every transient hiccup."""
    from tts.tts_engine import BACKEND_CHATTERBOX_TURBO, TTSEngine

    eng = TTSEngine(auto_init=False)
    eng._record_backend_failure(BACKEND_CHATTERBOX_TURBO)
    eng._record_backend_failure(BACKEND_CHATTERBOX_TURBO)
    # 2 failures — below threshold — no persistence yet.
    assert not state_path.exists(), (
        "tts_state.json was written before the demotion threshold — "
        "wasted disk IO on every transient failure"
    )

    eng._record_backend_failure(BACKEND_CHATTERBOX_TURBO)
    # 3 failures — threshold crossed — persistence should fire.
    assert state_path.exists(), (
        "threshold-crossing failure did NOT persist demotion — the "
        "negative-finding cache is dead"
    )


# ────────────────────────────────────────────────────────────────────
# 7. NFT — Atomic write: the on-disk file is always parseable JSON
# ────────────────────────────────────────────────────────────────────


def test_save_uses_atomic_replace(state_path, monkeypatch):
    """``_save_persisted_demotions`` must write to a temp file then
    ``os.replace`` so a crash mid-write cannot leave a half-written
    file. Verify by asserting that no ``tts_state.*.tmp`` siblings
    are leaked into the directory after a successful save."""
    from tts.tts_engine import TTSEngine

    eng = TTSEngine(auto_init=False)
    eng._demoted_backends.add('chatterbox_turbo')
    eng._save_persisted_demotions()

    siblings = [
        f.name for f in state_path.parent.iterdir()
        if f.name != state_path.name
    ]
    assert not siblings, (
        f"atomic save left temp file siblings: {siblings!r}"
    )

    # And the produced file is parseable JSON with the expected shape.
    parsed = json.loads(state_path.read_text())
    assert parsed['schema'] == 1
    assert 'chatterbox_turbo' in parsed['demoted']


# ────────────────────────────────────────────────────────────────────
# 8. NFT — Corrupt file does not block init
# ────────────────────────────────────────────────────────────────────


def test_corrupt_state_file_does_not_block_init(state_path):
    """A truncated / hand-edited / partially-overwritten state file
    must NOT raise during engine init. Worst case is "we lost the
    cache" — never "TTS won't initialise"."""
    from tts.tts_engine import TTSEngine

    state_path.write_text('{ this is not json ')

    # Must not raise.
    eng = TTSEngine(auto_init=False)
    assert eng._demoted_backends == set()


def test_missing_demoted_key_does_not_block_init(state_path):
    """File exists, schema matches, but no ``demoted`` key — must
    hydrate empty without raising."""
    from tts.tts_engine import _TTS_STATE_SCHEMA, TTSEngine

    state_path.write_text(json.dumps({'schema': _TTS_STATE_SCHEMA}))
    eng = TTSEngine(auto_init=False)
    assert eng._demoted_backends == set()


# ────────────────────────────────────────────────────────────────────
# 9. NFT — Persisted failures_at_demotion is restored to counter
# ────────────────────────────────────────────────────────────────────


def test_hydrate_seeds_consecutive_failures_counter(state_path):
    """On hydrate, ``_consecutive_failures[backend]`` is seeded from
    the persisted ``failures_at_demotion`` so the in-session view is
    consistent (a hydrated-demoted backend already 'looks' like 3
    failures happened)."""
    from tts.tts_engine import _TTS_STATE_SCHEMA, TTSEngine

    now = time.time()
    state_path.write_text(json.dumps({
        'schema': _TTS_STATE_SCHEMA,
        'demoted': {
            'chatterbox_turbo': {
                'first_demoted_at': now,
                'expires_at': now + 86400,
                'failures_at_demotion': 5,
            },
        },
    }))

    eng = TTSEngine(auto_init=False)
    assert eng._consecutive_failures.get('chatterbox_turbo') == 5


# ────────────────────────────────────────────────────────────────────
# 8. Regression — a later save must not restart an older entry's TTL
# ────────────────────────────────────────────────────────────────────


def test_save_keeps_an_older_entrys_original_timestamps(state_path):
    """``_save_persisted_demotions`` used to write ``now`` and
    ``now + TTL`` for EVERY entry on every save.  Demoting one more
    backend, or a hydrate that dropped one expired row, restarted the
    7-day clock of all the others, so a demotion written for a cause
    long since fixed never expired (seven engines carried the identical
    first_demoted_at, the time of the LAST save)."""
    import time

    from tts.tts_engine import TTSEngine

    t0 = time.time() - 5 * 86400
    state_path.write_text(json.dumps({
        'schema': 1,
        'updated_at': t0,
        'demoted': {'kokoro': {
            'first_demoted_at': t0,
            'expires_at': t0 + 7 * 86400,
            'failures_at_demotion': 1,
        }},
    }))

    eng = TTSEngine(auto_init=False)
    assert 'kokoro' in eng._demoted_backends   # hydrated
    eng._demoted_backends.add('f5')            # a new demotion
    eng._save_persisted_demotions()

    written = json.loads(state_path.read_text())['demoted']
    assert written['kokoro']['first_demoted_at'] == pytest.approx(t0)
    assert written['kokoro']['expires_at'] == pytest.approx(t0 + 7 * 86400)
    assert written['f5']['first_demoted_at'] > t0 + 4 * 86400   # new row is now


# ────────────────────────────────────────────────────────────────────
# 10. An install that ran and failed is not re-run on every boot
# ────────────────────────────────────────────────────────────────────
#
# Measured on a Windows box without long-path support, 2026-11-12..16: every
# boot re-ran `pip install neutts[all]` for NeuTTS Air (3 attempts, ~3 min)
# and failed the same way ("Windows Long Path support"), 9 times in 5 days.
# The "already failed" record (_auto_install_failed) lived only in memory,
# so each new process started without it.  It is now kept in tts_state.json
# beside the demotions, for the build it failed on, for a day.


@pytest.fixture
def install_state(monkeypatch):
    """Fresh class-level install bookkeeping for each test (it is shared by
    every TTSEngine in the process, and other tests leave entries in it)."""
    from tts.tts_engine import TTSEngine

    monkeypatch.setattr(TTSEngine, '_auto_install_failed', set())
    monkeypatch.setattr(TTSEngine, '_auto_install_failed_meta', {},
                        raising=False)
    monkeypatch.setattr(TTSEngine, '_auto_install_pending', set())
    return TTSEngine


def _new_process(engine_cls):
    """What a restart does to the class-level sets: they start empty."""
    engine_cls._auto_install_failed = set()
    engine_cls._auto_install_failed_meta = {}
    engine_cls._auto_install_pending = set()


_LONG_PATH_FAILURE = (
    "venv install failed: pip install 'neutts[all]' failed after 3 attempts: "
    "rc=1 tail=\"...ChatAttachmentsListItemThumbnailFile.svelte'\n"
    "HINT: This error might have occurred since this system does not have "
    "Windows Long Path support enabled.\n\n\"")


def _run_background_install(eng, backend, monkeypatch, result):
    """Drive the real _try_auto_install_backend -> _bg_install path with
    install_backend_full answering ``result``, and wait for it to finish."""
    from tts import package_installer as _pi
    from tts import tts_engine as _te

    monkeypatch.setattr(_te, '_get_engine_capabilities',
                        lambda b=None: {'vram_gb': 0})
    monkeypatch.setattr(_te.TTSEngine, '_get_required_package',
                        classmethod(lambda cls, b: 'neutts'))
    monkeypatch.setattr(_te, '_probe_backend_runnable', lambda b, p: False)
    monkeypatch.setattr(_pi, 'make_chat_progress_callback',
                        lambda **kw: None)
    monkeypatch.setattr(_pi, 'install_backend_full',
                        lambda b, progress_cb=None: result)

    assert eng._try_auto_install_backend(backend) is False
    deadline = time.time() + 10
    while backend in _te.TTSEngine._auto_install_pending:
        assert time.time() < deadline, 'background install never finished'
        time.sleep(0.02)


def test_failed_install_is_not_rerun_after_restart(
        state_path, install_state, monkeypatch):
    from tts import package_installer as _pi
    from tts import tts_engine as _te

    eng = _te.TTSEngine(auto_init=False)
    _run_background_install(eng, 'neutts_air', monkeypatch,
                            (False, _LONG_PATH_FAILURE))

    written = json.loads(state_path.read_text())
    row = written['install_failed']['neutts_air']
    assert 'Long Path' in row['reason']
    assert row['expires_at'] > time.time()

    # Next boot: a new process, a new engine (TTSLoader.load builds one).
    _new_process(_te.TTSEngine)
    called = []
    monkeypatch.setattr(_pi, 'install_backend_full',
                        lambda b, progress_cb=None: called.append(b))
    eng2 = _te.TTSEngine(auto_init=False)
    assert 'neutts_air' in _te.TTSEngine._auto_install_failed, (
        'the failed install was not remembered across the restart, so the '
        'boot runs the same failing pip install again')
    assert eng2._try_auto_install_backend('neutts_air') is False
    assert 'neutts_air' not in _te.TTSEngine._auto_install_pending
    assert called == []


def test_install_in_progress_elsewhere_is_not_a_failure(
        state_path, install_state, monkeypatch):
    """Another installer holding the lock is not a failure of this box."""
    from tts import tts_engine as _te
    from tts.package_installer import INSTALL_IN_PROGRESS

    eng = _te.TTSEngine(auto_init=False)
    _run_background_install(
        eng, 'neutts_air', monkeypatch,
        (False, INSTALL_IN_PROGRESS + 'neutts_air installation already in progress'))

    written = json.loads(state_path.read_text()) if state_path.exists() else {}
    assert 'neutts_air' not in written.get('install_failed', {})


def test_install_failure_on_another_build_is_retried(
        state_path, install_state):
    """An update may fix what failed, so a failure recorded for another
    build does not hold."""
    from tts.tts_engine import _TTS_STATE_SCHEMA, TTSEngine

    now = time.time()
    state_path.write_text(json.dumps({
        'schema': _TTS_STATE_SCHEMA,
        'demoted': {},
        'install_failed': {'neutts_air': {
            'failed_at': now - 60, 'expires_at': now + 3600,
            'build': 'build:not-this-one', 'reason': 'x'}},
    }))

    TTSEngine(auto_init=False)
    assert 'neutts_air' not in TTSEngine._auto_install_failed


def test_expired_install_failure_is_retried(state_path, install_state):
    from tts.tts_engine import _TTS_STATE_SCHEMA, TTSEngine, _installed_build

    now = time.time()
    state_path.write_text(json.dumps({
        'schema': _TTS_STATE_SCHEMA,
        'install_failed': {'neutts_air': {
            'failed_at': now - 2 * 86400, 'expires_at': now - 60,
            'build': _installed_build(), 'reason': 'x'}},
    }))

    TTSEngine(auto_init=False)
    assert 'neutts_air' not in TTSEngine._auto_install_failed


def test_clear_also_forgets_a_failed_install(state_path, install_state,
                                             monkeypatch):
    """The hub-install / admin reset hook gives a failed install a fresh
    chance too, on disk and in this process."""
    from tts.tts_engine import TTSEngine

    eng = TTSEngine(auto_init=False)
    _run_background_install(eng, 'neutts_air', monkeypatch,
                            (False, _LONG_PATH_FAILURE))
    assert 'neutts_air' in TTSEngine._auto_install_failed

    assert TTSEngine.clear_persisted_demotions('neutts_air') == 1
    written = json.loads(state_path.read_text())
    assert 'neutts_air' not in written.get('install_failed', {})
    assert 'neutts_air' not in TTSEngine._auto_install_failed


def test_failed_install_survives_an_unrelated_demotion_save(
        state_path, install_state, monkeypatch):
    """tts_state.json has one writer; a later demotion save must keep the
    install failure it already holds."""
    from tts.tts_engine import TTSEngine

    eng = TTSEngine(auto_init=False)
    _run_background_install(eng, 'neutts_air', monkeypatch,
                            (False, _LONG_PATH_FAILURE))
    eng._demoted_backends.add('kokoro')
    eng._save_persisted_demotions()

    written = json.loads(state_path.read_text())
    assert 'kokoro' in written['demoted']
    assert 'neutts_air' in written['install_failed']


def test_install_failure_save_keeps_the_live_engines_demotions(
        state_path, install_state, monkeypatch):
    """The failure is recorded on the engine TTSLoader.load built at boot,
    ~3 min after it read the file.  Saving from that engine's own demoted
    set erased what the live engine (get_tts_engine) demoted meanwhile."""
    from tts import tts_engine as _te

    live = _te.TTSEngine(auto_init=False)
    monkeypatch.setattr(_te, '_engine', live)
    boot = _te.TTSEngine(auto_init=False)      # TTSLoader.load's engine
    live._demoted_backends.add('kokoro')       # demoted while pip runs
    live._save_persisted_demotions()

    _run_background_install(boot, 'neutts_air', monkeypatch,
                            (False, _LONG_PATH_FAILURE))

    written = json.loads(state_path.read_text())
    assert 'kokoro' in written['demoted'], (
        "the boot engine's save erased the live engine's demotion")
    assert 'neutts_air' in written['install_failed']


def test_verified_install_drops_the_failure_record(
        state_path, install_state, monkeypatch):
    """Once the record lapses and the install is run again and verified,
    the record leaves the file too, not just memory."""
    import types

    from tts import tts_engine as _te
    from tts import tts_handshake as _hs

    eng = _te.TTSEngine(auto_init=False)
    _run_background_install(eng, 'neutts_air', monkeypatch,
                            (False, _LONG_PATH_FAILURE))
    assert 'neutts_air' in json.loads(state_path.read_text())['install_failed']

    _te.TTSEngine._auto_install_failed.discard('neutts_air')  # lapsed
    monkeypatch.setattr(_hs, 'run_handshake', lambda *a, **k:
                        types.SimpleNamespace(ok=True, n_bytes=48000,
                                              err='', elapsed_s=1.0))
    _run_background_install(eng, 'neutts_air', monkeypatch, (True, 'Ready'))

    written = json.loads(state_path.read_text())
    assert 'neutts_air' not in written.get('install_failed', {})
    assert 'neutts_air' not in _te.TTSEngine._auto_install_failed
