/**
 * The desktop owner's copy of another user's computer-use run never steers it.
 *
 * Review of HARTOS de3f89364 (ed08f5fc, 2026-09-27, CRITICAL): HARTOS sends
 * the desktop owner every step of a run another user started.  That copy
 * carried the other user's goal id, useComputerActivity.liveRunOf made it the
 * live run, and the owner's typed chat was POSTed to
 * /api/social/dashboard/agents/<their goal>/inject -- into someone else's
 * running agent.  HARTOS now sends the owner's copy with no goal id and
 * `disclosure_only: true`; liveRunOf must refuse it on the marker alone, so a
 * copy that still names a goal (an older HARTOS, a relay) cannot steer either.
 *
 * Driven through the real hook and the real VoiceOrbPage quick-prompt bar
 * (typed chat).  NunbaChatProvider reads `liveRun` from the same hook, so the
 * hook-level test covers its send path too.  The control test proves the
 * harness can see a steer: the run's own user's message does route to inject.
 */
import {act, fireEvent, render, renderHook, screen} from '@testing-library/react';
import React from 'react';

const handlers = {};
jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    on: (ev, fn) => { handlers[ev] = fn; return () => { delete handlers[ev]; }; },
    off: (ev) => { delete handlers[ev]; },
  },
}));
jest.mock('../../components/VoiceVisualizer', () => ({
  __esModule: true,
  default: () => <div data-testid="viz" />,
}));
jest.mock('../../config/apiBase', () => ({API_BASE_URL: ''}));
jest.mock('../../constants/events', () => ({NUNBA_CAMERA_CONSENT: 'evt'}));
jest.mock('qrcode.react', () => ({QRCodeSVG: () => null}));
jest.mock('../../services/socialApi', () => ({
  consentApi: {grant: jest.fn(() => Promise.resolve({})), decline: jest.fn(() => Promise.resolve({}))},
  notificationsApi: {markRead: jest.fn(() => Promise.resolve({}))},
}));

// eslint-disable-next-line import/first
import VoiceOrbPage from '../../components/VoiceOrb/VoiceOrbPage';
// eslint-disable-next-line import/first
import useComputerActivity, {liveRunOf} from '../../hooks/useComputerActivity';

// What HARTOS activity_stream sends: the run user's message, and the owner's
// disclosure copy of the same step (same msg_id).
const runStep = {
  type: 'computer_use.update', msg_id: 'computer-use:computer_use_r1:1:executing',
  user_id: 'guest-9', task_id: 'computer_use_r1', prompt_id: '42',
  agent_id: 'guest-goal', summary: 'Selecting a control', phase: 'executing',
  run_done: false, disclosure_only: false,
};
const ownerCopy = {...runStep, agent_id: '', disclosure_only: true};
// A copy that still names the goal but carries the marker.
const markedCopyWithGoal = {...runStep, disclosure_only: true};

beforeAll(() => {
  global.Audio = class {
    set preload(v) {}
    set src(v) {}
    set onloadedmetadata(v) {}
    set onerror(v) {}
  };
});

beforeEach(() => {
  Object.keys(handlers).forEach((k) => delete handlers[k]);
  delete window.pywebview;
  global.fetch = jest.fn(() => Promise.resolve({
    status: 200, json: () => Promise.resolve({success: true, response: 'ok'}),
  }));
});

test('liveRunOf never selects a disclosure-only copy, with or without a goal id', () => {
  expect(liveRunOf(ownerCopy)).toBeNull();
  expect(liveRunOf(markedCopyWithGoal)).toBeNull();
  expect(liveRunOf(runStep)).toBe(runStep); // the run's own user still steers
});

test('the hook shows the owner the step but gives no live run', () => {
  const {result} = renderHook(() => useComputerActivity());
  act(() => handlers['computer_use.update'](markedCopyWithGoal));
  expect(result.current.activity?.summary).toBe('Selecting a control');
  expect(result.current.liveRun).toBeNull();
});

async function typeAndSend(text) {
  fireEvent.change(screen.getByLabelText('Quick prompt'), {target: {value: text}});
  await act(async () => {
    fireEvent.click(screen.getByLabelText('Send prompt'));
  });
}

test.each([
  ['the owner copy', ownerCopy],
  ['a marked copy that still names the goal', markedCopyWithGoal],
])("typed chat after %s is ordinary chat, never an inject", async (_label, event) => {
  render(<VoiceOrbPage />);
  act(() => handlers['computer_use.update'](event));
  await typeAndSend('what is on my screen?');
  const urls = global.fetch.mock.calls.map((c) => String(c[0]));
  expect(urls).toEqual(['/chat']);
  expect(urls.some((u) => u.includes('/inject'))).toBe(false);
});

test('in the companion window the owner copy gives the bridge no goal id', async () => {
  const onPrompt = jest.fn(() => Promise.resolve('ok'));
  window.pywebview = {api: {on_companion_prompt: onPrompt, on_companion_presence: jest.fn()}};
  render(<VoiceOrbPage />);
  act(() => handlers['computer_use.update'](markedCopyWithGoal));
  await typeAndSend('hello');
  expect(onPrompt).toHaveBeenCalledTimes(1);
  expect(onPrompt.mock.calls[0][1].agent_id).toBeUndefined();
});

test('control: the run user\'s own message does route typed guidance to inject', async () => {
  render(<VoiceOrbPage />);
  act(() => handlers['computer_use.update'](runStep));
  await typeAndSend('click the blue button');
  const urls = global.fetch.mock.calls.map((c) => String(c[0]));
  expect(urls).toEqual(['/api/social/dashboard/agents/guest-goal/inject']);
});
