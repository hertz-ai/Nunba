/**
 * The main page opens an agent's chat when the floating window's Open asks
 * for it (design_1125 A).
 *
 * The floating window's Open on an agent's question calls the host
 * (app.py on_companion_open_ask), which brings the main window forward and
 * raises OPEN_AGENT_CHAT_EVENT in it (desktop/companion_open_ask.py).  The
 * page then goes to that agent's chat, the agent's id in the URL
 * (utils/agentSlug.agentPath, the one resolver prefers the id), and the
 * question is there: AgentOverlay moves an agent's open asks into its chat
 * when that chat is in front.
 */
import React from 'react';
import {render, act} from '@testing-library/react';
import {MemoryRouter, useLocation} from 'react-router-dom';

import useOpenAgentChat, {OPEN_AGENT_CHAT_EVENT} from '../../hooks/useOpenAgentChat';

let where = null;
function Page() {
  useOpenAgentChat();
  const location = useLocation();
  where = `${location.pathname}${location.search}`;
  return null;
}

function open(detail) {
  act(() => { window.dispatchEvent(new CustomEvent(OPEN_AGENT_CHAT_EVENT, {detail})); });
}

beforeEach(() => { where = null; });

test("Open goes to that agent's chat, its id in the URL", () => {
  render(<MemoryRouter initialEntries={['/local']}><Page /></MemoryRouter>);
  open({prompt_id: '95568353503', ask_id: 'c0ffee', agent_name: 'Speech Buddy'});
  expect(where).toBe('/agents/speech-buddy?id=95568353503');
});

test("a question whose card names no agent still opens the agent's chat by its id", () => {
  render(<MemoryRouter initialEntries={['/local']}><Page /></MemoryRouter>);
  open({prompt_id: '95568353503', ask_id: 'c0ffee'});
  expect(where).toMatch(/^\/agents\/[^?]+\?id=95568353503$/);
});

test('an Open that names no agent goes nowhere', () => {
  render(<MemoryRouter initialEntries={['/local']}><Page /></MemoryRouter>);
  open({ask_id: 'c0ffee'});
  expect(where).toBe('/local');
});
