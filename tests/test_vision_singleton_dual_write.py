"""Drift guard for the VisionService singleton dual-storage contract.

Three storage locations exist for historical layering reasons (Nunba's
boot can't pay the 5-15s ``import hart_intelligence_entry`` cost on the
critical path — see ``routes/chatbot_routes.py`` comment block above
``_VISION_SERVICE_CACHE``).  The contract:

  1. Every WRITE goes through ``_set_vision_service(svc)`` and mirrors
     to all 3 locations atomically.
  2. Every READ goes through ``_get_vision_service()`` and walks all 3
     in priority order (cache → _hie → __main__), self-healing by
     mirroring the first non-None find to the other two.
  3. Writers in main.py and models/orchestrator.py both call the
     canonical helper — no direct location pokes.

These tests will fail loudly if any of those guarantees regress.
"""
import sys
import types

import pytest


@pytest.fixture
def isolated_singleton(monkeypatch):
    """Snapshot + restore the 3 storage locations around each test.

    Avoids cross-test pollution since the singleton is process-global.
    """
    from routes import chatbot_routes as cr

    snap_cache = cr._VISION_SERVICE_CACHE[0]
    snap_main = getattr(sys.modules.get('__main__'), '_vision_service',
                        '__UNSET__')
    snap_hie = getattr(sys.modules.get('hart_intelligence_entry'),
                       '_vision_service', '__UNSET__')

    yield cr

    cr._VISION_SERVICE_CACHE[0] = snap_cache
    main_mod = sys.modules.get('__main__')
    if main_mod is not None:
        if snap_main == '__UNSET__':
            if hasattr(main_mod, '_vision_service'):
                try:
                    delattr(main_mod, '_vision_service')
                except AttributeError:
                    pass
        else:
            main_mod._vision_service = snap_main
    hie = sys.modules.get('hart_intelligence_entry')
    if hie is not None:
        if snap_hie == '__UNSET__':
            if hasattr(hie, '_vision_service'):
                try:
                    delattr(hie, '_vision_service')
                except AttributeError:
                    pass
        else:
            hie._vision_service = snap_hie


class _SentinelSvc:
    """Marker object — identity is what we assert on."""

    def __init__(self, label):
        self.label = label

    def __repr__(self):
        return f'_SentinelSvc({self.label!r})'


def _install_fake_hie_module():
    """Ensure ``sys.modules['hart_intelligence_entry']`` exists so the
    helper can mirror to it.  Real import would pull langchain_classic
    + 9 other heavy modules — we just need a stub for the test.
    """
    if 'hart_intelligence_entry' not in sys.modules:
        sys.modules['hart_intelligence_entry'] = types.ModuleType(
            'hart_intelligence_entry')


# ── _set_vision_service mirrors to all 3 storage locations ───────────

def test_set_writes_cache_main_and_hie(isolated_singleton):
    """The canonical writer must populate every location exposed to
    every reader chain in the codebase."""
    cr = isolated_singleton
    _install_fake_hie_module()

    svc = _SentinelSvc('canonical')
    cr._set_vision_service(svc)

    assert cr._VISION_SERVICE_CACHE[0] is svc, "cache slot must hold svc"
    assert sys.modules['__main__']._vision_service is svc, \
        "__main__._vision_service must hold svc"
    assert sys.modules['hart_intelligence_entry']._vision_service is svc, \
        "hart_intelligence_entry._vision_service must hold svc"


def test_set_with_none_clears_all_three(isolated_singleton):
    """Passing None must clear every location — shutdown / forced-rebuild
    semantics require it."""
    cr = isolated_singleton
    _install_fake_hie_module()

    svc = _SentinelSvc('to_be_cleared')
    cr._set_vision_service(svc)
    cr._set_vision_service(None)

    assert cr._VISION_SERVICE_CACHE[0] is None
    assert sys.modules['__main__']._vision_service is None
    assert sys.modules['hart_intelligence_entry']._vision_service is None


def test_set_skips_hie_when_module_not_loaded(isolated_singleton):
    """If ``hart_intelligence_entry`` isn't already imported, the writer
    must NOT force-import it (would cost 5-15s on the boot path).  The
    write to cache + __main__ still succeeds."""
    cr = isolated_singleton
    # Pop the real module if present so we can prove the no-import
    # behavior — restoration handled by isolated_singleton fixture.
    real_hie = sys.modules.pop('hart_intelligence_entry', None)
    try:
        svc = _SentinelSvc('no_hie')
        cr._set_vision_service(svc)

        assert cr._VISION_SERVICE_CACHE[0] is svc
        assert sys.modules['__main__']._vision_service is svc
        assert 'hart_intelligence_entry' not in sys.modules, \
            "writer must NOT force-import hart_intelligence_entry"
    finally:
        if real_hie is not None:
            sys.modules['hart_intelligence_entry'] = real_hie


# ── _get_vision_service walks 3 locations and self-heals ─────────────

def test_get_returns_cache_first_no_module_lookup(isolated_singleton):
    """When the cache is populated, the reader must NOT consult either
    module — fast-path is the whole point of having a cache."""
    cr = isolated_singleton
    svc = _SentinelSvc('cached')
    cr._VISION_SERVICE_CACHE[0] = svc

    # Set OTHER instances in the module slots to prove the reader
    # ignored them.
    main_mod = sys.modules.get('__main__')
    main_mod._vision_service = _SentinelSvc('main_distractor')
    _install_fake_hie_module()
    sys.modules['hart_intelligence_entry']._vision_service = \
        _SentinelSvc('hie_distractor')

    assert cr._get_vision_service() is svc


def test_get_walks_hie_when_cache_empty(isolated_singleton):
    """Cache empty + _hie has instance → reader must return _hie's
    instance AND heal the other 2 locations."""
    cr = isolated_singleton
    _install_fake_hie_module()

    svc = _SentinelSvc('hie_canonical')
    cr._VISION_SERVICE_CACHE[0] = None
    main_mod = sys.modules.get('__main__')
    if hasattr(main_mod, '_vision_service'):
        main_mod._vision_service = None
    sys.modules['hart_intelligence_entry']._vision_service = svc

    got = cr._get_vision_service()

    assert got is svc, "must return _hie's instance"
    assert cr._VISION_SERVICE_CACHE[0] is svc, "cache must be self-healed"
    assert main_mod._vision_service is svc, "__main__ must be self-healed"


def test_get_walks_main_when_cache_and_hie_empty(isolated_singleton):
    """Cache empty + _hie empty + __main__ has instance → reader must
    return __main__'s instance AND heal cache + _hie."""
    cr = isolated_singleton
    _install_fake_hie_module()

    svc = _SentinelSvc('main_canonical')
    cr._VISION_SERVICE_CACHE[0] = None
    sys.modules['hart_intelligence_entry']._vision_service = None
    sys.modules['__main__']._vision_service = svc

    got = cr._get_vision_service()

    assert got is svc, "must return __main__'s instance"
    assert cr._VISION_SERVICE_CACHE[0] is svc, "cache must be self-healed"
    assert sys.modules['hart_intelligence_entry']._vision_service is svc, \
        "_hie must be self-healed"


def test_get_returns_none_when_all_empty(isolated_singleton):
    """No instance anywhere → None.  No exception, no creation."""
    cr = isolated_singleton
    _install_fake_hie_module()

    cr._VISION_SERVICE_CACHE[0] = None
    sys.modules['__main__']._vision_service = None
    sys.modules['hart_intelligence_entry']._vision_service = None

    assert cr._get_vision_service() is None


# ── Crash-recovery scenario: stale __main__ + live _hie ──────────────

def test_crash_recovery_prefers_hie_over_stale_main(isolated_singleton):
    """The bug we're guarding against: main.py wrote the dead instance
    to __main__ + cache at boot; orchestrator.py recreated and wrote
    the live instance to _hie.  Pre-fix reader returned the dead cached
    instance forever.  Post-fix reader must walk _hie first and heal
    cache + __main__ to the live instance."""
    cr = isolated_singleton
    _install_fake_hie_module()

    dead = _SentinelSvc('dead_boot_instance')
    live = _SentinelSvc('live_recovered_instance')

    # Simulate the bug state: __main__ + cache hold the dead instance,
    # _hie holds the recovered one (orchestrator.py:701 path).
    sys.modules['__main__']._vision_service = dead
    sys.modules['hart_intelligence_entry']._vision_service = live
    cr._VISION_SERVICE_CACHE[0] = None  # cache was cleared / never written

    got = cr._get_vision_service()

    assert got is live, "must prefer _hie (live) over stale __main__"
    assert cr._VISION_SERVICE_CACHE[0] is live, \
        "cache must reflect the live instance"
    assert sys.modules['__main__']._vision_service is live, \
        "__main__ must be healed to the live instance"
