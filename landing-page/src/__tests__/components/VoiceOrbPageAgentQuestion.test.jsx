/**
 * The floating window asks an agent's question when the main page is not in
 * front: "<Agent> asks ... Open / Later", as it asks for consent today.
 *
 * Owner, 2026-11-25 (design_1125 A): "just like how we used to ask consent
 * earlier".  Before this, an agent's question (a HARTOS person_ask card) never
 * reached the floating window: with Nunba in the background it was a card
 * inside the hidden page, with nothing on screen.  Open brings the main
 * window forward on that agent's chat, where the question is (the host's
 * on_companion_open_ask); Later puts it off here only; ask.answered (from
 * any surface) takes it away.  Whether the window is on screen at all stays
 * the host's gate (desktop/main_page_presence.py).
 *
 * realtimeService and VoiceVisualizer are mocked, as in VoiceOrbPage.test.jsx.
 */
import {render, screen, act, fireEvent} from '@testing-library/react';
import React from 'react';

let uiHandler = null;
const handlers = {};
jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    on: (ev, fn) => {
      if (ev === 'agent.ui.update') uiHandler = fn;
      else handlers[ev] = fn;
      return () => {};
    },
    off: () => {},
  },
}));
jest.mock('../../components/VoiceVisualizer', () => ({
  __esModule: true,
  default: ({isActive}) => <div data-testid="viz" data-active={isActive ? '1' : '0'} />,
}));
jest.mock('../../config/apiBase', () => ({API_BASE_URL: ''}));
jest.mock('../../constants/events', () => ({NUNBA_CAMERA_CONSENT: 'evt'}));
jest.mock('qrcode.react', () => ({QRCodeSVG: () => null}));
jest.mock('../../services/socialApi', () => ({
  consentApi: {grant: jest.fn(() => Promise.resolve({})), decline: jest.fn(() => Promise.resolve({}))},
  notificationsApi: {markRead: jest.fn(() => Promise.resolve({}))},
  dashboardApi: {steer: jest.fn(() => Promise.resolve({success: true}))},
}));

beforeAll(() => {
  global.Audio = class {
    set preload(v) {}
    set src(v) {}
    set onloadedmetadata(v) {}
    set onerror(v) {}
  };
});

// eslint-disable-next-line import/first
import VoiceOrbPage from '../../components/VoiceOrb/VoiceOrbPage';

const ASK = 'c0ffee00c0ffee00c0ffee00c0ffee00';
// The card HARTOS person_ask sends for the speech agent's question.
const QUESTION = {
  type: 'form',
  msg_id: ASK,
  ask_id: ASK,
  agent_id: '95568353503',
  prompt_id: '95568353503',
  title: 'Agent Speech Buddy asks you',
  description: 'So the lesson calls the child by the name they answer to.',
  fields: [{name: 'home_name', type: 'text', label: 'What does the family call the child at home?'}],
  agent_name: 'Speech Buddy',
  agent_asker: 'Agent Speech Buddy',
};

let openAsk;
beforeEach(() => {
  uiHandler = null;
  openAsk = jest.fn();
  window.pywebview = {api: {on_companion_open_ask: openAsk}};
});
afterEach(() => {
  delete window.pywebview;
  try { localStorage.clear(); } catch (e) { /* noop */ }
});

test("the floating window asks the agent's question, naming the agent", () => {
  render(<VoiceOrbPage />);
  act(() => uiHandler(QUESTION));
  const card = screen.getByTestId('companion-question');
  expect(card.textContent).toContain('Agent Speech Buddy asks');
  expect(card.textContent).toContain('What does the family call the child at home?');
  expect(screen.getByRole('button', {name: 'Open'})).toBeInTheDocument();
  expect(screen.getByRole('button', {name: 'Later'})).toBeInTheDocument();
  // The window shows the whole card, as for a consent ask: born hidden in
  // the companion, a card nobody can see would ask nothing.
  expect(screen.getByTestId('voice-orb').getAttribute('data-presence')).toBe('shown');
});

test("Open brings the main window to that agent's chat at the question", () => {
  render(<VoiceOrbPage />);
  act(() => uiHandler(QUESTION));
  fireEvent.click(screen.getByRole('button', {name: 'Open'}));
  expect(openAsk).toHaveBeenCalledWith('95568353503', ASK, 'Speech Buddy');
  expect(screen.queryByTestId('companion-question')).toBeNull();
});

test('an answer on any surface takes the question away', () => {
  render(<VoiceOrbPage />);
  act(() => uiHandler(QUESTION));
  act(() => handlers['ask.answered']({type: 'ask.answered', ask_id: ASK}));
  expect(screen.queryByTestId('companion-question')).toBeNull();
});

test('Later puts the question off here, and it comes back', () => {
  jest.useFakeTimers();
  try {
    render(<VoiceOrbPage />);
    act(() => uiHandler(QUESTION));
    fireEvent.click(screen.getByRole('button', {name: 'Later'}));
    expect(screen.queryByTestId('companion-question')).toBeNull();
    act(() => { jest.advanceTimersByTime(5 * 60 * 1000 + 1000); });
    expect(screen.getByTestId('companion-question')).toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});

test('the same question sent again shows once', () => {
  render(<VoiceOrbPage />);
  act(() => uiHandler(QUESTION));
  act(() => uiHandler({...QUESTION}));
  expect(screen.getAllByTestId('companion-question')).toHaveLength(1);
});

test('a card that is not a question (or asks for a secret) is not asked here', () => {
  render(<VoiceOrbPage />);
  act(() => uiHandler({type: 'toast', msg_id: 't-1', message: 'Saved'}));
  act(() => uiHandler({...QUESTION, ask_id: 'b'.repeat(32), msg_id: 'b'.repeat(32),
    fields: [{name: 'password', type: 'password', label: 'Your password?'}]}));
  expect(screen.queryByTestId('companion-question')).toBeNull();
});
