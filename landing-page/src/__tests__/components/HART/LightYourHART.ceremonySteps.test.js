/**
 * The ceremony drives HARTOS's onboarding session one step per server phase,
 * so the escape answer reaches the session's name prewarm.
 *
 * It used to send select_language and the two answers only.  HARTOS's
 * session (hartos/hart_onboarding.py) moves language -> greeting -> passion
 * -> ack_passion -> escape -> ack_escape -> pre_reveal -> reveal, so the
 * greeting branch swallowed the passion answer, the escape answer landed in
 * 'passion', the prewarm never ran, and the name came from a second path
 * (/api/hart/generate).  HARTOS's tests/unit/test_onboarding_reveal_latency.py
 * drives a real session with the same steps and checks the prewarm and the
 * reveal.
 *
 * This renders the real component with a stub server and records every step.
 */
import LightYourHART from '../../../components/HART/LightYourHART';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// jest.mock calls are hoisted above the imports.
jest.mock('../../../config/apiBase', () => ({ API_BASE_URL: '' }));
jest.mock('../../../services/socialApi', () => ({
  consentApi: { grant: jest.fn(() => Promise.resolve()), revoke: jest.fn(() => Promise.resolve()) },
}));
jest.mock('../../../hooks/useAuthSession', () => ({ applyHartSeal: jest.fn() }));
jest.mock('../../../components/VoiceVisualizer', () => () => null);

const REVEAL = {
  phase: 'reveal', hart_name: 'kazeran', hart_tag: '@kazeran',
  emoji_combo: 'x', candidates: ['zephyr'],
};

function stubServer({ revealOk = true } = {}) {
  const steps = [];
  const urls = [];
  global.fetch = jest.fn(async (url, opts = {}) => {
    urls.push(url);
    if (url === '/api/hart/advance') {
      const body = JSON.parse(opts.body);
      steps.push(body);
      // The 7th step is pre_reveal -> reveal on the server.
      if (steps.length === 7) {
        return revealOk
          ? { ok: true, json: async () => REVEAL }
          : { ok: false, json: async () => ({}) };
      }
      return { ok: true, json: async () => ({ phase: 'step' }) };
    }
    if (url === '/api/hart/seal') {
      return { ok: true, json: async () => ({ sealed: true }) };
    }
    // Voices, manifest, TTS: unavailable, so every line resolves at once.
    return { ok: false, json: async () => null, blob: async () => new Blob([]) };
  });
  return { steps, urls };
}

async function wait(ms) {
  for (let t = 0; t < ms; t += 100) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { jest.advanceTimersByTime(100); });
  }
}

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  localStorage.setItem('nunba_speech_consent', 'text_only');
  HTMLCanvasElement.prototype.getContext = () =>
    new Proxy({}, { get: (target, prop) => (prop in target ? target[prop] : () => {}) });
});

afterEach(() => {
  jest.useRealTimers();
  delete global.fetch;
});

async function answerBothQuestions() {
  render(<LightYourHART userId="" onComplete={jest.fn()} />);
  await wait(2500);                                   // darkness -> language
  fireEvent.click(screen.getByText('English'));
  await wait(5000);                                   // greeting -> passion
  fireEvent.click(screen.getByText('Building, Coding, Making'));
  await wait(2500);                                   // ack -> escape
  fireEvent.click(screen.getByText('Somewhere quiet and alone'));
}

test('every server phase gets its step, in order, under one session key', async () => {
  const { steps, urls } = stubServer();
  await answerBothQuestions();
  await wait(9000);                                   // ack, pre-reveal, reveal

  expect(steps.map((s) => [s.action, s.data && s.data.key])).toEqual([
    ['select_language', undefined],
    [null, undefined],                                // greeting -> passion
    ['answer', 'building_coding'],                    // passion -> ack_passion
    [null, undefined],                                // ack_passion -> escape
    ['answer', 'quiet_alone'],                        // escape -> ack_escape
    [null, undefined],                                // ack_escape -> pre_reveal
    [null, undefined],                                // pre_reveal -> reveal
  ]);
  const keys = new Set(steps.map((s) => s.user_id));
  expect(keys.size).toBe(1);
  expect([...keys][0]).toMatch(/^hart-ceremony-/);
  expect(urls).not.toContain('/api/hart/generate');
});

test('the escape answer goes out before the acknowledgement plays', async () => {
  const { steps } = stubServer();
  await answerBothQuestions();
  await wait(100);
  expect(steps).toHaveLength(5);
  expect(steps[4]).toMatchObject({ action: 'answer', data: { key: 'quiet_alone' } });
});

test('the revealed name and its backups come from the session reveal', async () => {
  const { urls, steps } = stubServer();
  await answerBothQuestions();
  await wait(14000);                                  // through to the seal

  const sealBodies = global.fetch.mock.calls
    .filter(([u]) => u === '/api/hart/seal')
    .map(([, o]) => JSON.parse(o.body).name);
  expect(sealBodies[0]).toBe('kazeran');
  expect(steps).toHaveLength(7);
  expect(urls).toContain('/api/hart/seal');
});

test('a failed reveal still shows a name', async () => {
  stubServer({ revealOk: false });
  await answerBothQuestions();
  await wait(14000);

  const sealBodies = global.fetch.mock.calls
    .filter(([u]) => u === '/api/hart/seal')
    .map(([, o]) => JSON.parse(o.body).name);
  expect(sealBodies.length).toBeGreaterThan(0);
  expect(sealBodies[0]).toBeTruthy();
});
