/**
 * VoiceOrbPage — the standalone floating voice presence.
 *
 * Behaviour under test:
 *   - defaults to the 'viz' skin (renders the visualiser);
 *   - reflects the agent SPEAKING when a canonical realtimeService 'tts' push
 *     arrives — WITHOUT playing the audio (presence only);
 *   - honours the admin 'hart_orb_skin' = 'character' setting.
 * realtimeService + VoiceVisualizer are mocked (the latter touches canvas /
 * AudioContext which jsdom lacks); this keeps the test on the orb's own wiring.
 */
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

let ttsHandler = null;
jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    on: (ev, fn) => { if (ev === 'tts') ttsHandler = fn; },
    off: () => { ttsHandler = null; },
  },
}));

jest.mock('../../components/VoiceVisualizer', () => ({
  __esModule: true,
  default: ({ isActive }) => <div data-testid="viz" data-active={isActive ? '1' : '0'} />,
}));

// jsdom has no real media element; stub Audio so the duration probe is inert.
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

afterEach(() => {
  ttsHandler = null;
  try { localStorage.clear(); } catch (e) { /* noop */ }
});

test('defaults to the visualiser skin', () => {
  render(<VoiceOrbPage />);
  expect(screen.getByTestId('voice-orb').dataset.skin).toBe('viz');
  expect(screen.getByTestId('viz')).toBeInTheDocument();
});

test('reflects speaking on a tts push (presence only — no playback)', async () => {
  render(<VoiceOrbPage />);
  expect(screen.getByTestId('voice-orb').dataset.active).toBe('0');

  act(() => { if (ttsHandler) ttsHandler({ generated_audio_url: 'clip.mp3' }); });

  await waitFor(() =>
    expect(screen.getByTestId('voice-orb').dataset.active).toBe('1'));
});

test('honours the admin character-skin setting', () => {
  localStorage.setItem('hart_orb_skin', 'character');
  render(<VoiceOrbPage />);
  expect(screen.getByTestId('voice-orb').dataset.skin).toBe('character');
  // character skin shows the face, not the visualiser
  expect(screen.queryByTestId('viz')).not.toBeInTheDocument();
});

test('clicking the orb calls the companion bridge (bring app forward)', () => {
  const onClick = jest.fn();
  window.pywebview = { api: { on_companion_click: onClick } };
  try {
    render(<VoiceOrbPage />);
    // the orb wrapper is the clickable parent of the (mocked) visualiser
    fireEvent.click(screen.getByTestId('viz').parentElement);
    expect(onClick).toHaveBeenCalledTimes(1);
  } finally {
    delete window.pywebview;
  }
});
