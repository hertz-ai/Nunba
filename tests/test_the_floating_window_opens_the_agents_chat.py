"""The floating window's Open on an agent's question opens that agent's chat.

design_1125 A (owner 2026-11-25, "just like how we used to ask consent
earlier"): the floating window asks an agent's question when the main page
is not in front, and Open brings the main window forward on that agent's
chat, at the question.  app.py's companion js_api (on_companion_open_ask)
shows the main window and runs the script built here in it; the main page's
hook (landing-page/src/hooks/useOpenAgentChat.js) listens for the event it
raises and goes to the agent's chat.

The values come from a card an agent wrote, so the script carries them as
JSON: none can end the string or add a statement in the main window.

Pure: imports desktop.companion_open_ask only, never app.py, a model or a
server.

    python -m pytest tests/test_the_floating_window_opens_the_agents_chat.py -q
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from desktop.companion_open_ask import OPEN_AGENT_CHAT_EVENT, open_agent_chat_script  # noqa: E402

HEAD = f'window.dispatchEvent(new CustomEvent({json.dumps(OPEN_AGENT_CHAT_EVENT)}, {{detail: '
TAIL = '}));'


def _detail(script):
    assert script.startswith(HEAD) and script.endswith(TAIL), script
    return json.loads(script[len(HEAD):-len(TAIL)])


def test_the_event_names_the_agent_and_the_question():
    assert OPEN_AGENT_CHAT_EVENT == 'nunba:open-agent-chat'   # the page hook's name
    script = open_agent_chat_script(95568353503, 'c0ffee', 'Speech Buddy')
    assert _detail(script) == {'prompt_id': '95568353503', 'ask_id': 'c0ffee',
                               'agent_name': 'Speech Buddy'}


def test_what_an_agent_wrote_stays_data_in_the_main_window():
    hostile = '"});alert(1);// \n</script>'
    script = open_agent_chat_script('42', hostile, hostile)
    assert _detail(script) == {'prompt_id': '42', 'ask_id': hostile, 'agent_name': hostile}
    assert ' ' not in script and '\n' not in script


def test_nothing_known_is_sent_as_none():
    assert _detail(open_agent_chat_script(None, None, None)) == {
        'prompt_id': None, 'ask_id': None, 'agent_name': None}
