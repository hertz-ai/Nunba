"""/api/hart/generate hands over a name within a bounded wait.

The ceremony POSTs /api/hart/generate once and shows nothing but a dark
screen until it answers.  The route called
hartos.hart_onboarding.generate_hart_name(use_llm=True), whose model path
makes up to three llama-server calls (30s socket timeout each) plus five 5s
cloud checks, with nothing bounding the whole.  Measured 2026-10-22 on a
CPU-only desktop: 270s on "Your secret name is..." while an agent plan held
the one llama-server slot, and 46s with the slot idle -- both ending in a
curated name anyway.

HARTOS's generate_hart_name_within gives the model a bounded wait, then
answers with the instant curated path, the same way the session reveal does.
"""

import os
import sys
import types

import pytest
from flask import Flask

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes.chatbot_routes import hart_generate  # noqa: E402

app = Flask(__name__)


@pytest.fixture
def fake_onboarding(monkeypatch):
    """Stand in for hartos.hart_onboarding and record how the route calls it."""
    calls = {}

    def _within(**kwargs):
        calls['within'] = kwargs
        return {'name': 'kazeran', 'candidates': ['kazeran'],
                'emoji_combo': '', 'hart_tag': '@kazeran'}

    def _unbounded(**kwargs):
        raise AssertionError('the route must not call the unbounded model path')

    mod = types.ModuleType('hartos.hart_onboarding')
    mod.HARTNameRegistry = type('HARTNameRegistry', (), {
        'get_all_names': staticmethod(lambda: {'taken'})})
    mod.generate_hart_name_within = _within
    mod.generate_hart_name = _unbounded
    try:
        import hartos  # noqa: F401
    except ImportError:
        pkg = types.ModuleType('hartos')
        pkg.__path__ = []
        monkeypatch.setitem(sys.modules, 'hartos', pkg)
    monkeypatch.setitem(sys.modules, 'hartos.hart_onboarding', mod)
    return calls


def test_route_uses_the_bounded_generator(fake_onboarding):
    with app.test_request_context('/api/hart/generate', method='POST', json={
            'language': 'ta', 'locale': 'ta_IN',
            'passion_key': 'building_coding', 'escape_key': 'nature_open'}):
        resp = hart_generate()
    assert resp.get_json()['name'] == 'kazeran'
    assert fake_onboarding['within'] == {
        'language': 'ta', 'passion_key': 'building_coding',
        'escape_key': 'nature_open', 'locale': 'ta_IN',
        'voice_transcript': '', 'existing_names': {'taken'}}


def test_route_leaves_the_wait_to_hartos(fake_onboarding):
    """One budget, owned by HARTOS (NAME_WAIT_S) -- not a second number here."""
    with app.test_request_context('/api/hart/generate', method='POST', json={}):
        hart_generate()
    assert 'wait_s' not in fake_onboarding['within']
