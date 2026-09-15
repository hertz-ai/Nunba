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

describe('hosted in the desktop companion window', () => {
  // Owner 2026-09-15: the floating window exists only when an agent wants
  // to talk. Idle = no window at all (the page tells the bridge 'hidden');
  // the agent speaking = window shown. Measured on 89096d49 the page's
  // corner "peek" (translate + scale(.5)) inside a fixed 220x310 window
  // was an opaque black rectangle with the orb shrunk to a dot.
  let presence;
  const InertAudio = global.Audio;
  beforeEach(() => {
    // 'modern' so Date.now() advances with the timers: the page's idle
    // check compares Date.now() against its last interaction.
    jest.useFakeTimers('modern');
    presence = jest.fn();
    window.pywebview = { api: { on_companion_presence: presence } };
    // A clip whose metadata never loads: the page's 3s fallback sizes the
    // speaking window, so speaking actually ends in this test.
    global.Audio = class {
      set preload(v) {}
      set src(v) {}
      set onloadedmetadata(v) {}
      set onerror(fn) { setTimeout(fn, 0); }
    };
  });
  afterEach(() => {
    delete window.pywebview;
    global.Audio = InertAudio;
    jest.useRealTimers();
  });

  test('starts hidden: idle means no floating window', () => {
    render(<VoiceOrbPage />);
    act(() => { jest.advanceTimersByTime(1500); });
    expect(presence).toHaveBeenCalledWith('hidden');
    expect(presence).not.toHaveBeenCalledWith('shown');
    // and the page never applies the corner-peek transform when hosted
    expect(screen.getByTestId('voice-orb').style.transform).toBe('');
  });

  test('shows when the agent speaks, hides again once idle', () => {
    render(<VoiceOrbPage />);
    act(() => { jest.advanceTimersByTime(1500); });
    presence.mockClear();

    act(() => { if (ttsHandler) ttsHandler({ generated_audio_url: 'clip.mp3' }); });
    act(() => { jest.advanceTimersByTime(1100); });
    expect(presence).toHaveBeenCalledWith('shown');

    // The clip probe never loads: the page's 3s fallback ends speaking, then
    // the idle window elapses and the page asks to hide again.  Stepped a
    // second at a time, like the real clock.
    presence.mockClear();
    const root = screen.getByTestId('voice-orb');
    for (let i = 0; i < 12; i++) act(() => { jest.advanceTimersByTime(1000); });
    expect(root.dataset.active).toBe('0');
    expect(root.dataset.away).toBe('1');
    expect(presence).toHaveBeenCalledWith('hidden');
  });
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
