/**
 * The floating companion's show-rule, and the reasoning it is supposed to show.
 *
 * Owner's rule (2026-09-20): the window appears ONLY when an agent needs to
 * talk, or a ribbon indicator is up for a live computer-use step -- and while
 * it is up it shows the agent's live thinking alongside what it is doing.
 *
 * Two defects these pin:
 *
 * 1. TWO predicates for one concept.  `active` (VoiceOrbPage:393) tested
 *    `computerActivity?.phase === 'executing'`, while the presence decision
 *    96 lines below tested `Boolean(computerActivity)` -- ANY activity object,
 *    including a run that had already finished.  The loose one drove
 *    `interacting`, which opens the FULL card, so a stale run put the whole
 *    card on screen outside the rule.  Now both read VISIBLE_RUN_PHASES.
 *
 * 2. Thinking traces were on the wire and nothing here read them.  HARTOS
 *    publishes them on the chat envelope with CHAT_BUBBLE_PRIORITY +
 *    action='Thinking' (the same contract the main window's Thought-process
 *    Steps key on).  'Status' is canned spinner copy and must NOT surface.
 */
import { render, screen, act } from '@testing-library/react';
import React from 'react';

import { CHAT_ACTION_STATUS, CHAT_ACTION_THINKING, CHAT_BUBBLE_PRIORITY } from '../../constants/chatBubble';

const handlers = {};
jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    on: (ev, fn) => { handlers[ev] = fn; return () => { delete handlers[ev]; }; },
    off: (ev) => { delete handlers[ev]; },
  },
}));

// The computer-use projection is the thing under test, so it is driven
// directly rather than through NunbaChatProvider.
let mockActivity =null;
jest.mock('../../hooks/useComputerActivity', () => ({
  __esModule: true,
  default: () => ({activity: mockActivity, liveRun: null}),
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
}));

beforeAll(() => {
  global.Audio = class {
    set preload(v) {}
    set src(v) {}
    set onloadedmetadata(v) {}
    set onerror(v) {}
  };
});

beforeEach(() => {
  mockActivity =null;
  Object.keys(handlers).forEach((k) => delete handlers[k]);
});

// eslint-disable-next-line import/first
import VoiceOrbPage from '../../components/VoiceOrb/VoiceOrbPage';

const CARD = 'LIVE COMMENTARY';

function pushTrace(message, action = CHAT_ACTION_THINKING) {
  act(() => {
    handlers['chat.response']({
      priority: CHAT_BUBBLE_PRIORITY,
      action,
      message,
    });
  });
}

function pushIndicatorStep(text) {
  act(() => { window.__onIndicatorStep(text); });
}

// ── 1. the show-rule ───────────────────────────────────────────────

test('a FINISHED computer-use run does not open the commentary card', () => {
  // RED pre-fix: the presence decision read Boolean(computerActivity), and the
  // card's own gate read (computerActivity || indicatorStep) -- both true for
  // a run in any phase, so a completed run kept the card on screen.
  mockActivity ={phase: 'done', summary: 'Finished clicking around'};
  render(<VoiceOrbPage />);
  expect(screen.queryByText(CARD)).toBeNull();
  expect(screen.queryByText('Finished clicking around')).toBeNull();
});

test('an IDLE run with no phase does not open the commentary card', () => {
  mockActivity ={summary: 'nothing happening'};
  render(<VoiceOrbPage />);
  expect(screen.queryByText(CARD)).toBeNull();
});

test('an EXECUTING run does open it — the rule must not close too far', () => {
  mockActivity ={phase: 'executing', summary: 'Opening the invoice'};
  render(<VoiceOrbPage />);
  expect(screen.getByText(CARD)).toBeInTheDocument();
  expect(screen.getByText(/Opening the invoice/)).toBeInTheDocument();
});

test.each(['blocked', 'failed'])(
  'a %s run stays visible — a stuck agent must not go quiet', (phase) => {
    mockActivity ={phase, summary: 'Waiting on the login page'};
    render(<VoiceOrbPage />);
    expect(screen.getByText(CARD)).toBeInTheDocument();
  });

test('a ribbon indicator step opens it with no computer-use object at all', () => {
  render(<VoiceOrbPage />);
  pushIndicatorStep('Clicking the checkout button');
  expect(screen.getByText(CARD)).toBeInTheDocument();
  expect(screen.getByText(/Clicking the checkout button/)).toBeInTheDocument();
});

// ── 2. live thinking traces ────────────────────────────────────────

test('the page SUBSCRIBES to the chat envelope at all', () => {
  // RED pre-fix: VoiceOrbPage subscribed to 'tts' and 'agent.ui.update' only.
  // The traces were on the wire and the floating window never read them.
  render(<VoiceOrbPage />);
  expect(typeof handlers['chat.response']).toBe('function');
});

test('a Thinking trace renders under the step it belongs to', () => {
  mockActivity ={phase: 'executing', summary: 'Opening the invoice'};
  render(<VoiceOrbPage />);
  pushTrace('The total looks like it is on the second page');

  const trace = screen.getByTestId('companion-trace');
  expect(trace).toHaveTextContent('The total looks like it is on the second page');
  // and the action it is reasoning about is still shown above it
  expect(screen.getByText(/Opening the invoice/)).toBeInTheDocument();
});

test('a Status envelope is NOT shown as reasoning', () => {
  // 'Status' is the canned "analysing…" spinner copy.  The owner asked for the
  // agent's thinking, not the pipeline's captions.
  mockActivity ={phase: 'executing', summary: 'Opening the invoice'};
  render(<VoiceOrbPage />);
  pushTrace('Analysing your request', CHAT_ACTION_STATUS);
  expect(screen.queryByTestId('companion-trace')).toBeNull();
});

test('a non-reserved priority is NOT shown as reasoning', () => {
  mockActivity ={phase: 'executing', summary: 'Opening the invoice'};
  render(<VoiceOrbPage />);
  act(() => {
    handlers['chat.response']({priority: 1, action: CHAT_ACTION_THINKING, message: 'ordinary reply'});
  });
  expect(screen.queryByTestId('companion-trace')).toBeNull();
});

test('a trace is not echoed twice when it equals the step line', () => {
  render(<VoiceOrbPage />);
  pushIndicatorStep('Clicking the checkout button');
  pushTrace('Clicking the checkout button');
  // rendered once, as the step -- not again as its own reasoning row
  expect(screen.queryByTestId('companion-trace')).toBeNull();
  expect(screen.getByText(/Clicking the checkout button/)).toBeInTheDocument();
});
