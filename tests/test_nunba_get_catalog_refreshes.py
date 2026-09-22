"""Nunba's get_catalog refreshes a non-empty catalogue, like HARTOS's does.

HARTOS 20cf5ad1c removed `if not list_all()` from HARTOS's get_catalog: a
node that had ever written a catalogue never learned about a model shipped
afterwards. models/catalog.py kept its own copy of that guard -- populate
only when empty, otherwise loop the app populators by hand, skipping the
built-in ones. MEASURED 2026-09-23 on a copy of the owner's live catalogue
with tts-piper removed (a model "shipped after the file was written"):

    HARTOS get_catalog: tts-piper back: True
    Nunba  get_catalog: tts-piper back: False

So whichever process opened the catalogue through Nunba first never saw it.

The two halves ship together, as in HARTOS (task #88, "two bugs cancel"):
Nunba's populators ask `already_registered` (which CLAIMS the entry during
a populate) instead of `catalog.get`, so the refresh's stale sweep cannot
take an entry a populator skipped to preserve the owner's edits.

Driven through the real get_catalog against a tmp catalogue file; only the
file path is pinned.
"""
import integrations.service_tools.model_catalog as _hartos_mod
import pytest


@pytest.fixture
def fresh_singleton(monkeypatch, tmp_path):
    import models.catalog as nunba_cat
    path = str(tmp_path / 'model_catalog.json')
    orig = _hartos_mod.ModelCatalog

    class Pinned(orig):
        def __init__(self, catalog_path=None):
            super().__init__(catalog_path=path)

    monkeypatch.setattr(_hartos_mod, 'ModelCatalog', Pinned)
    monkeypatch.setattr(nunba_cat, 'ModelCatalog', Pinned)

    def reset():
        _hartos_mod._catalog_instance = None
        nunba_cat._populators_registered = False

    saved = _hartos_mod._catalog_instance
    reset()
    yield nunba_cat, reset, path
    _hartos_mod._catalog_instance = saved
    nunba_cat._populators_registered = False


def _boot(nunba_cat, reset):
    reset()
    cat = nunba_cat.get_catalog()
    cat._save()
    return {e.id for e in cat.list_all()}


def _drop(path, model_id):
    import json
    d = json.load(open(path, encoding='utf-8'))
    d['models'] = [m for m in d['models'] if m['id'] != model_id]
    json.dump(d, open(path, 'w', encoding='utf-8'))


def test_a_model_shipped_after_the_file_was_written_appears(fresh_singleton):
    nunba_cat, reset, path = fresh_singleton
    first = _boot(nunba_cat, reset)
    assert 'tts-piper' in first, 'fixture: a built-in HARTOS populator ships tts-piper'
    _drop(path, 'tts-piper')          # the file predates tts-piper
    second = _boot(nunba_cat, reset)
    assert 'tts-piper' in second, (
        'a non-empty catalogue opened through Nunba never learned about a '
        'model shipped after it was written')


def test_the_refresh_costs_nothing_already_there(fresh_singleton):
    """The half that makes the other one safe: refreshing must not sweep an
    entry a populator skipped because it already existed -- Nunba's own
    LLM presets and media entries included."""
    nunba_cat, reset, path = fresh_singleton
    first = _boot(nunba_cat, reset)
    assert any(i.startswith('llm-') for i in first)
    assert 'audio_gen-acestep' in first
    second = _boot(nunba_cat, reset)
    third = _boot(nunba_cat, reset)
    assert first - second == set(), f'lost on refresh: {sorted(first - second)}'
    assert second == third, 'a refresh with nothing new must change nothing'
