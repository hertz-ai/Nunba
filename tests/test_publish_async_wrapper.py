"""This node's thinking-trace wrapper around HARTOS's publish_async forwards
``skip_crossbar``.

HARTOS's publish_async is the one publisher (Reel Studio amendment A9 e).
``skip_crossbar=True`` is its own flag: it keeps a message on the node's own
legs (LOCAL, SSE and her own devices over PeerLink) and off central's
crossbar.  A finished reel is pushed that way, because the push names her
clients (decision U4(d); HARTOS core.peer_link.crossbar_publish
.publish_agent_message).

The adapter's loader (routes.hartos_backend_adapter._attempt_hartos_init)
replaces hart_intelligence.publish_async with a wrapper that also feeds
_capture_thinking.  publish_agent_message finds its publisher on the
hart_intelligence facade (core.safe_hartos_attr reads it first), so every
reel push goes through that wrapper.  A wrapper that takes only
(topic, message, timeout) raises on the flag, so on a real desktop every
reel push was reported undelivered.

The wrapper must:
  * forward the flag when it is set, so the push reaches HARTOS's publisher
    with it;
  * call the publisher exactly as before for every other message
    (topic, message, timeout; no new keyword), and still keep the
    priority-49 thinking traces;
  * against a publisher that predates the flag, still take every other
    message, and fail a skip_crossbar push (HARTOS reports it undelivered)
    rather than publish it without the flag.

Faked boundaries: the hart_intelligence module (its app, and a
publish_async with HARTOS's signature that records each call), and the
flat-layout create_recipe / reuse_recipe modules (absent since the
2026-08-30 layout).  _attempt_hartos_init, drain_thinking_traces and HARTOS's
publish_agent_message, publish_thinking_trace and safe_hartos_attr are the
real code.

    python -m pytest tests/test_publish_async_wrapper.py -q
"""
import inspect
import os
import sys
import types

import pytest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from core.peer_link.crossbar_publish import (  # noqa: E402
    publish_agent_message,
    publish_thinking_trace,
)

import routes.hartos_backend_adapter as hba  # noqa: E402

pytestmark = pytest.mark.timeout(60)

XID = 'ab' * 32
#: One reel as HARTOS's reel job pushes it (plan rev 2, 4.2(f)).
REEL = {'kind': 'video', 'xid': XID, 'sha256': XID, 'mime': 'video/mp4',
        'size': 1234, 'reel_id': 'r1', 'prompt_id': '42', 'request_id': 'rid-1'}
CHAT_TOPIC = 'com.hertzai.hevolve.chat.u7'


def _hartos_signature(topic, message, timeout=2.0, skip_crossbar=False):
    """HARTOS's publish_async signature (pinned in HARTOS by
    tests/unit/test_served_by_is_one_rule.py)."""


def _signature_before_the_flag(topic, message, timeout=2.0):
    """publish_async before it took skip_crossbar, and the shape of HARTOS's
    recipe-module delegates (hartos/create_recipe.py, reuse_recipe.py)."""


class Publisher:
    """A publisher with a real signature that records how it was called.

    It refuses a call its signature does not take, with the TypeError the
    real function would raise."""

    def __init__(self, signature_of):
        self._signature = inspect.signature(signature_of)
        self.calls = []

    def __call__(self, *args, **kwargs):
        bound = self._signature.bind(*args, **kwargs)
        self.calls.append((args, kwargs, dict(bound.arguments)))


@pytest.fixture
def load_hartos(monkeypatch):
    """Run the adapter's real loader against a fake hart_intelligence whose
    publish_async is ``publisher``; the adapter's load state is restored
    afterwards.  The flat-layout recipe modules are absent unless a test
    puts them in place."""
    for name, value in (('_hartos_initialized', False),
                        ('_hartos_backend_available', False),
                        ('_hevolve_app', None),
                        ('_active_tier', 'unknown')):
        monkeypatch.setattr(hba, name, value)
    monkeypatch.setitem(sys.modules, 'create_recipe', None)
    monkeypatch.setitem(sys.modules, 'reuse_recipe', None)

    def load(publisher):
        facade = types.ModuleType('hart_intelligence')
        facade.app = object()
        facade.publish_async = publisher
        monkeypatch.setitem(sys.modules, 'hart_intelligence', facade)
        assert hba._attempt_hartos_init() is True
        assert facade.publish_async is not publisher, 'the loader installed no wrapper'
        return facade
    return load


def _thoughts(request_id):
    return [t['text'] for t in hba.drain_thinking_traces(request_id)]


def test_a_reel_push_reaches_hartos_with_its_flag(load_hartos):
    """The push publish_agent_message makes for a finished reel reaches
    HARTOS's publisher with skip_crossbar set, so it stays off the crossbar."""
    publisher = Publisher(_hartos_signature)
    load_hartos(publisher)
    assert publish_agent_message(text='Your reel is ready', user_id='u7',
                                 request_id='rid-1', prompt_id='42',
                                 media=[REEL], skip_crossbar=True) is True, (
        'the wrapper refused the flag, so the reel push was reported undelivered')
    assert len(publisher.calls) == 1
    _args, _kwargs, bound = publisher.calls[0]
    assert bound['topic'] == CHAT_TOPIC
    assert bound['skip_crossbar'] is True
    assert bound['message']['media'] == [REEL]
    assert bound['message']['text'] == ['Your reel is ready']


def test_every_other_message_reaches_hartos_as_before(load_hartos):
    """A message without the flag: the publisher gets (topic, message,
    timeout) and no new keyword, and its thinking trace is kept."""
    publisher = Publisher(_hartos_signature)
    load_hartos(publisher)
    hba.drain_thinking_traces('rid-think')
    assert publish_thinking_trace(text='Reading her clips', user_id='u7',
                                  request_id='rid-think') is True
    assert publish_agent_message(text='hi', user_id='u7', request_id='rid-2',
                                 prompt_id='42') is True
    assert [(args[0], len(args), kwargs) for args, kwargs, _ in publisher.calls] == [
        (CHAT_TOPIC, 3, {}), (CHAT_TOPIC, 3, {})]
    assert [args[2] for args, _, _ in publisher.calls] == [2.0, 2.0]
    assert _thoughts('rid-think') == [['Reading her clips']]


def test_against_a_publisher_without_the_flag_a_reel_push_fails_closed(load_hartos):
    """A HARTOS that predates the flag still gets every other message; a
    reel push is reported undelivered and never reaches that publisher
    without its flag (which would send it over the crossbar)."""
    publisher = Publisher(_signature_before_the_flag)
    load_hartos(publisher)
    assert publish_agent_message(text='hi', user_id='u7', request_id='rid-2',
                                 prompt_id='42') is True
    assert publish_agent_message(text='Your reel is ready', user_id='u7',
                                 request_id='rid-1', prompt_id='42',
                                 media=[REEL], skip_crossbar=True) is False
    assert [bound['message']['text'] for _, _, bound in publisher.calls] == [['hi']]


@pytest.mark.parametrize('name', ['create_recipe', 'reuse_recipe'])
def test_a_flat_layout_recipe_module_gets_the_same_wrapper(load_hartos, monkeypatch, name):
    """Where a flat-layout recipe module is importable, its publish_async
    (topic, message, timeout) gets the same wrapper: called as before, its
    thinking traces kept."""
    delegate = Publisher(_signature_before_the_flag)
    module = types.ModuleType(name)
    module.publish_async = delegate
    monkeypatch.setitem(sys.modules, name, module)
    load_hartos(Publisher(_hartos_signature))
    assert module.publish_async is not delegate, 'no wrapper on ' + name
    hba.drain_thinking_traces('rid-recipe')
    thought = {'priority': 49, 'action': 'Thinking', 'request_id': 'rid-recipe',
               'text': ['Step 2']}
    module.publish_async(CHAT_TOPIC, thought)
    assert [(args, kwargs) for args, kwargs, _ in delegate.calls] == [
        ((CHAT_TOPIC, thought, 2.0), {})]
    assert _thoughts('rid-recipe') == [['Step 2']]
