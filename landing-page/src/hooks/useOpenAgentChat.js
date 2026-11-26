/**
 * useOpenAgentChat: the main page opens an agent's chat when the floating
 * window's Open asks for it (design_1125 A).
 *
 * The floating window asks an agent's question when the main page is not in
 * front ("<Agent> asks ... Open / Later", owner 2026-11-25: "just like how
 * we used to ask consent earlier").  Its Open calls the host
 * (app.py on_companion_open_ask), which brings this window forward and
 * raises OPEN_AGENT_CHAT_EVENT here (desktop/companion_open_ask.py builds
 * that script; the two names are the same string).  The page goes to the
 * agent's chat with its id in the URL (agentPath; the one resolver prefers
 * the id), and AgentOverlay moves that agent's open asks into its chat once
 * the chat is in front, so the question is there.
 */
import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';

import {agentPath} from '../utils/agentSlug';

export const OPEN_AGENT_CHAT_EVENT = 'nunba:open-agent-chat';

// A card names its agent only when HARTOS titled it with the agent; the id
// alone opens the chat, the slug is then a placeholder the resolver passes.
const NO_NAME = 'agent';

export default function useOpenAgentChat() {
  const navigate = useNavigate();
  useEffect(() => {
    function onOpen(event) {
      const detail = (event && event.detail) || {};
      const id = detail.prompt_id;
      if (id === undefined || id === null || String(id) === '') return;
      navigate(agentPath({name: detail.agent_name || NO_NAME, prompt_id: id}));
    }
    window.addEventListener(OPEN_AGENT_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_AGENT_CHAT_EVENT, onOpen);
  }, [navigate]);
}
