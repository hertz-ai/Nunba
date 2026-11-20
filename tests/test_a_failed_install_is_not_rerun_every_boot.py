"""A voice engine whose install failed is not installed again at every boot.

MEASURED 2026-11-17 on the owner's desktop: NeuTTS's pip install failed at
107 boots in a row.  _bg_install remembered the failure only in
TTSEngine._auto_install_failed, a per-process set, so each boot's first
request (PASS 2's autonomous re-install of a demoted engine) ran the same
failing install again.

Now the failure goes onto the engine's catalog row (HARTOS
mark_setup_failed), which survives a restart, and the "already failed"
check reads that row.  An answer that tried nothing (another install holds
the lock, pip deferred to the next boot) is not remembered.

Real TTSEngine, real _try_auto_install_backend and _bg_install (run inline),
real HARTOS ModelCatalog on a temp file standing in for the boot's catalog;
only install_backend_full (pip) and the runnable probe are stubbed.
"""
import threading
import types

import pytest
from integrations.service_tools import model_catalog as mc
from integrations.service_tools.model_catalog import ModelCatalog, ModelEntry


@pytest.fixture
def boot(tmp_path, monkeypatch):
    """A fresh process: a new catalog read from the same file, a new failed
    set.  Returns a function that starts the next boot."""
    monkeypatch.setattr(mc, '_BUILD', ['build-A'])
    path = tmp_path / 'model_catalog.json'
    import models.catalog as nunba_catalog
    from tts import tts_engine as te

    def _next_boot():
        cat = ModelCatalog(catalog_path=str(path))
        if not cat.get('tts-neutts-air'):
            cat.register(ModelEntry(id='tts-neutts-air', name='NeuTTS', model_type='tts',
                                    supports_gpu=False, supports_cpu=True, ram_gb=1.0))
        monkeypatch.setattr(nunba_catalog, 'get_catalog', lambda: cat)
        te.TTSEngine._auto_install_pending = set()
        te.TTSEngine._auto_install_failed = set()
        te.TTSEngine._import_check_cache = {}
        engine = te.TTSEngine.__new__(te.TTSEngine)
        engine.has_gpu = False
        engine._ensure_hw_detected = lambda: None
        engine._vram_allows = lambda b: True
        engine._demoted_backends = set()
        engine._language = 'en'
        return engine, cat

    return _next_boot


@pytest.fixture
def installs(monkeypatch):
    """Count the pip installs, answer with `answer`, run the thread inline."""
    from tts import package_installer
    from tts import tts_engine as te
    state = {'calls': 0, 'answer': (False, 'pip: OSError [Errno 2] path too long')}

    def _install(backend, progress_cb=None):
        state['calls'] += 1
        return state['answer']

    monkeypatch.setattr(package_installer, 'install_backend_full', _install)
    monkeypatch.setattr(package_installer, 'make_chat_progress_callback', lambda job_type: None)
    monkeypatch.setattr(te, '_probe_backend_runnable', lambda backend, pkg: False)
    monkeypatch.setattr(te, '_get_engine_capabilities', lambda backend=None: {'vram_gb': 0})

    class _Inline:
        def __init__(self, target=None, daemon=None, name=None):
            self._target = target

        def start(self):
            self._target()

    monkeypatch.setattr(threading, 'Thread', _Inline)
    return state


def test_a_failed_install_is_not_run_again_at_the_next_boot(boot, installs):
    engine, _ = boot()
    engine._try_auto_install_backend('neutts_air')
    assert installs['calls'] == 1

    engine, cat = boot()
    engine._try_auto_install_backend('neutts_air')
    assert installs['calls'] == 1, 'the second boot ran the same failing install again'
    assert cat.get('tts-neutts-air').error == 'pip: OSError [Errno 2] path too long'


def test_an_install_that_tried_nothing_is_tried_again_at_the_next_boot(boot, installs):
    from tts.package_installer import INSTALL_IN_PROGRESS
    installs['answer'] = (False, INSTALL_IN_PROGRESS + 'neutts_air installation already in progress')
    engine, _ = boot()
    engine._try_auto_install_backend('neutts_air')

    engine, cat = boot()
    engine._try_auto_install_backend('neutts_air')
    assert installs['calls'] == 2
    assert cat.get('tts-neutts-air').error is None


def test_a_deferred_install_is_tried_again_at_the_next_boot(boot, installs):
    installs['answer'] = (False, 'Failed to install neucodec: deferred: live modules torch in user-site')
    engine, _ = boot()
    engine._try_auto_install_backend('neutts_air')

    engine, _ = boot()
    engine._try_auto_install_backend('neutts_air')
    assert installs['calls'] == 2


def test_a_newer_build_tries_the_failed_install_again(boot, installs, monkeypatch):
    engine, _ = boot()
    engine._try_auto_install_backend('neutts_air')

    monkeypatch.setattr(mc, '_BUILD', ['build-B'])
    engine, _ = boot()
    engine._try_auto_install_backend('neutts_air')
    assert installs['calls'] == 2


def test_an_install_that_raises_is_remembered_too(boot, installs, monkeypatch):
    from tts import package_installer

    def _raises(backend, progress_cb=None):
        installs['calls'] += 1
        raise RuntimeError('pip exited 1')

    monkeypatch.setattr(package_installer, 'install_backend_full', _raises)
    engine, _ = boot()
    engine._try_auto_install_backend('neutts_air')

    engine, cat = boot()
    engine._try_auto_install_backend('neutts_air')
    assert installs['calls'] == 1
    assert 'pip exited 1' in cat.get('tts-neutts-air').error
