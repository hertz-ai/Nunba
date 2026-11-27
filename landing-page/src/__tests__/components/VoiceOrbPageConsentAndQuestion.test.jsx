/**
 * A consent ask AND an agent's question both reach the floating window.
 *
 * Owner, 2026-11-26 (~09:40 IST): "Are the consents and questions no more
 * appearing in floating window after our change to show in chat window, I
 * noticed this?"  Consents reached it (VoiceOrbPage's consent.request card);
 * an agent's question (a HARTOS person_ask card) never did on any build, so
 * with Nunba in the background the question was a card inside the hidden
 * page and nothing was on screen (design_1125 A).
 *
 * Here the page side: both kinds arrive on the one agent.ui.update channel,
 * the consent card takes the window first (the one thing an autonomous agent
 * stops for), the question waits behind it and shows when the consent is
 * answered, and the page asks the host for the whole card ('shown') while
 * either waits.  The host side, that a 'shown' request is on screen once the
 * main page has reported it is not in front (and hidden while it is), is
 * tests/test_main_page_presence.py (CompanionPresenceApplier).
 *
 * realtimeService and VoiceVisualizer are mocked, as in VoiceOrbPage.test.jsx.
 */
import {render, screen, act} from '@testing-library/react';
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

// The ask integrations/vlm/safety.computer_control_block files while it waits.
const CONSENT = {
  type: 'consent.request',
  msg_id: 'consent.request:row-1',
  consent_type: 'computer_control',
  scope: '*',
  agent_id: '79211163351',
  agent_name: 'Spider-Man',
  reason: '',
};
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
const CONSENT_TEXT = 'Agent Spider-Man asks to control this computer.';

let presence;
beforeEach(() => {
  jest.useFakeTimers('modern');
  uiHandler = null;
  presence = jest.fn();
  window.pywebview = {api: {on_companion_presence: presence, on_companion_open_ask: jest.fn()}};
});
afterEach(() => {
  delete window.pywebview;
  jest.useRealTimers();
  try { localStorage.clear(); } catch (e) { /* noop */ }
});

function lastPresence() {
  const calls = presence.mock.calls;
  return calls.length ? calls[calls.length - 1][0] : null;
}

function settle() {
  act(() => { jest.advanceTimersByTime(1100); });
}

test('a question, then a consent: the consent takes the window, the question waits and shows after it', () => {
  render(<VoiceOrbPage />);
  settle();
  expect(lastPresence()).toBe('hidden');

  act(() => uiHandler(QUESTION));
  settle();
  expect(screen.getByTestId('companion-question').textContent).toContain('Agent Speech Buddy asks');
  expect(lastPresence()).toBe('shown');

  act(() => uiHandler(CONSENT));
  settle();
  expect(screen.getByText(CONSENT_TEXT)).toBeInTheDocument();
  expect(screen.queryByTestId('companion-question')).toBeNull();
  expect(lastPresence()).toBe('shown');

  // The consent is answered on any surface: the question is next.
  act(() => {
    handlers['consent.granted']({type: 'consent.granted',
      consent_type: 'computer_control', scope: '*', agent_id: null});
  });
  settle();
  expect(screen.queryByText(CONSENT_TEXT)).not.toBeInTheDocument();
  expect(screen.getByTestId('companion-question').textContent)
    .toContain('What does the family call the child at home?');
  expect(lastPresence()).toBe('shown');

  // The question is answered on any surface: nothing waits, the window goes.
  act(() => handlers['ask.answered']({type: 'ask.answered', ask_id: ASK}));
  settle();
  expect(screen.queryByTestId('companion-question')).toBeNull();
  expect(lastPresence()).toBe('hidden');
});

test('a consent, then a question: both are asked, one at a time, and the window stays up between them', () => {
  render(<VoiceOrbPage />);
  settle();
  act(() => uiHandler(CONSENT));
  act(() => uiHandler(QUESTION));
  settle();
  expect(screen.getByText(CONSENT_TEXT)).toBeInTheDocument();
  expect(screen.queryByTestId('companion-question')).toBeNull();
  expect(lastPresence()).toBe('shown');
  presence.mockClear();

  act(() => {
    handlers['consent.granted']({type: 'consent.granted',
      consent_type: 'computer_control', scope: '*', agent_id: null});
  });
  settle();
  expect(screen.getByTestId('companion-question')).toBeInTheDocument();
  // Never hidden between the two: the question holds the window the consent had.
  expect(presence.mock.calls.map((c) => c[0])).not.toContain('hidden');
  expect(screen.getByTestId('voice-orb').dataset.presence).toBe('shown');
});
