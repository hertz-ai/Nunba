"""The floating companion's quick prompt reaches /chat under the turn id the
companion minted.

Owner 2026-11-23: "Only the device you used".  A turn's spoken reply plays
only on the device that started the turn: HARTOS tags the clip with the
turn's request id, and the desktop page plays the turns it recorded as its
own (landing-page utils/ttsGuards.shouldPlayPushedClip, Nunba 79df4713).
The companion (VoiceOrbPage) now mints and records its turn's id and hands
it to this bridge in `context`; the bridge (app.py on_companion_prompt) built
its /chat body from the text alone, so the server minted an id no window of
the desktop knew and the companion's own turn went silent.

on_companion_prompt is a method of a class defined inside app.py's startup
code, so it is not importable: it is taken out of app.py by its AST and run
as written, with `requests` replaced by a recorder (no network) and the
module names it reads (`args`, `logger`) given.
"""
import ast
import logging
import sys
import textwrap
import types
from pathlib import Path

APP_PY = Path(__file__).resolve().parents[1] / 'app.py'


def _bridge():
    tree = ast.parse(APP_PY.read_text(encoding='utf-8'), filename=str(APP_PY))
    found = [n for n in ast.walk(tree)
             if isinstance(n, ast.FunctionDef) and n.name == 'on_companion_prompt']
    assert len(found) == 1, 'on_companion_prompt not found once in app.py'
    src = textwrap.dedent(ast.get_source_segment(
        APP_PY.read_text(encoding='utf-8'), found[0], padded=False))
    ns = {'args': types.SimpleNamespace(port=5099),
          'logger': logging.getLogger('test_companion_prompt')}
    exec(compile(src, str(APP_PY), 'exec'), ns)  # noqa: S102 - app.py's own code
    return ns['on_companion_prompt']


class _Requests(types.ModuleType):
    """Stands in for `requests`: records each POST, answers 200."""

    class Timeout(Exception):
        pass

    def __init__(self):
        super().__init__('requests')
        self.posts = []

    def post(self, url, json=None, timeout=None):
        self.posts.append({'url': url, 'json': json})
        return types.SimpleNamespace(status_code=200, text='',
                                     json=lambda: {'response': 'ok'})


def _send(text, context):
    fake = _Requests()
    real = sys.modules.get('requests')
    sys.modules['requests'] = fake
    try:
        reply = _bridge()(None, text, context)
    finally:
        if real is None:
            sys.modules.pop('requests', None)
        else:
            sys.modules['requests'] = real
    return reply, fake.posts


def test_the_turn_id_the_companion_minted_goes_with_the_prompt():
    reply, posts = _send('what is the weather?',
                         {'priority': 'high', 'user_priority': True,
                          'request_id': 'msg_1763900000000_ab12cd'})
    assert reply == 'ok'
    assert len(posts) == 1
    assert posts[0]['url'] == 'http://127.0.0.1:5099/chat'
    assert posts[0]['json']['request_id'] == 'msg_1763900000000_ab12cd'
    assert posts[0]['json']['text'] == 'what is the weather?'
    assert posts[0]['json']['source'] == 'companion_input_bar'


def test_a_prompt_with_no_turn_id_is_sent_as_before():
    for context in (None, {}, {'priority': 'high'}, {'request_id': ''},
                    {'request_id': None}, {'request_id': 7}):
        _, posts = _send('hello', context)
        assert len(posts) == 1
        assert 'request_id' not in posts[0]['json'], context
        assert posts[0]['json'] == {'text': 'hello', 'source': 'companion_input_bar'}
