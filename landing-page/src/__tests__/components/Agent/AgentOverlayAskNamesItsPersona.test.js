/* eslint-disable */
/**
 * An agent's question card says which agent asks and the persona it is for.
 *
 * Owner, 2026-11-25: "my computer desktop is child personna, where are we
 * showing the persona with agent name to user in chat screen?"  HARTOS
 * person_ask now puts on every question card the asking agent's name
 * (agent_name, agent_asker: the lookup that titles the card, the keys a
 * consent card carries) and the persona of the person it is for (persona,
 * to_persona; design_1125 B).  The badge read agent_name / agent_asker,
 * which a question card did not carry, so a question showed no badge.
 */

import React from 'react';
import {render, screen, act} from '@testing-library/react';

jest.mock('../../../services/realtimeService', () => ({
  __esModule: true,
  default: {on: jest.fn(() => () => {}), off: jest.fn()},
}));
jest.mock('../../../config/apiBase', () => ({API_BASE_URL: ''}));
jest.mock('../../../constants/events', () => ({NUNBA_CAMERA_CONSENT: 'evt'}));
jest.mock('qrcode.react', () => ({QRCodeSVG: () => null}));
jest.mock('../../../services/socialApi', () => ({
  consentApi: {grant: jest.fn(), decline: jest.fn()},
  notificationsApi: {markRead: jest.fn(() => Promise.resolve({}))},
  chatApi: {vaultStore: jest.fn()},
  agentFormApi: {submit: jest.fn(() => Promise.resolve({}))},
}));

const {default: AgentOverlay} = require('../../../components/AgentOverlay/AgentOverlay');

const ASK = 'c0ffee00c0ffee00c0ffee00c0ffee00';
// The card HARTOS person_ask sends the child's account for the speech agent.
const CARD = {
  type: 'form',
  msg_id: ASK,
  ask_id: ASK,
  agent_id: '95568353503',
  prompt_id: '95568353503',
  title: 'Agent Speech Buddy asks you',
  description: 'So the lesson calls the child by the name they answer to.',
  fields: [{name: 'home_name', type: 'text',
    label: 'What does the family call the child at home?'}],
  agent_name: 'Speech Buddy',
  agent_asker: 'Agent Speech Buddy',
  persona: 'Child',
  to_persona: 'Child',
};

function mountOverlay() {
  const handlers = {};
  const rt = require('../../../services/realtimeService').default;
  rt.on = jest.fn((topic, cb) => {
    handlers[topic] = cb;
    return () => {};
  });
  render(<AgentOverlay navigate={jest.fn()} />);
  return (payload) => act(() => { handlers['agent.ui.update'](payload); });
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('the badge says which agent asks and the persona the question is for', () => {
  const deliver = mountOverlay();
  deliver(CARD);
  expect(screen.getByText('Agent Speech Buddy · Child')).toBeInTheDocument();
});

test('a card for a person with no persona placed shows the agent alone, as before', () => {
  const deliver = mountOverlay();
  const {persona, to_persona, ...card} = CARD;
  deliver({...card, msg_id: 'b'.repeat(32), ask_id: 'b'.repeat(32)});
  expect(screen.getByText('Agent Speech Buddy')).toBeInTheDocument();
  expect(screen.queryByText(/·/)).toBeNull();
});

test('a card that names no agent still shows no badge, as before', () => {
  const deliver = mountOverlay();
  const {agent_name, agent_asker, ...card} = CARD;
  deliver({...card, msg_id: 'c'.repeat(32), ask_id: 'c'.repeat(32)});
  expect(screen.queryByText(/· Child/)).toBeNull();
});
