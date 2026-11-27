"""The floating window's Open on an agent's question (design_1125 A).

Owner, 2026-11-25: the floating window asks an agent's question when the
main page is not in front, "just like how we used to ask consent earlier",
and Open brings the main window forward on that agent's chat, at the
question.  app.py's companion js_api (on_companion_open_ask) shows the main
window and runs the script built here in it; the main page's hook
(landing-page/src/hooks/useOpenAgentChat.js) listens for OPEN_AGENT_CHAT_EVENT
(the same string there) and goes to the agent's chat.

The values come from a card an agent wrote, so the script carries them as
JSON (ASCII only, so U+2028 and U+2029 are escaped too): none can end the
string or add a statement in the main window.
"""
import json

#: The event the main page's useOpenAgentChat hook listens for.
OPEN_AGENT_CHAT_EVENT = 'nunba:open-agent-chat'


def _text(value):
    return None if value is None else str(value)


def open_agent_chat_script(prompt_id, ask_id=None, agent_name=None) -> str:
    """The script that opens agent ``prompt_id``'s chat in the main window,
    at question ``ask_id``; ``agent_name`` names the chat's URL."""
    detail = json.dumps({'prompt_id': _text(prompt_id), 'ask_id': _text(ask_id),
                         'agent_name': _text(agent_name)}, ensure_ascii=True)
    return (f'window.dispatchEvent(new CustomEvent({json.dumps(OPEN_AGENT_CHAT_EVENT)}, '
            f'{{detail: {detail}}}));')
