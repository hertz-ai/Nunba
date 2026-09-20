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
let uiHandler = null;
const handlers = {};   // every other topic the page subscribes to
jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    on: (ev, fn) => {
      if (ev === 'tts') ttsHandler = fn;
      else if (ev === 'agent.ui.update') uiHandler = fn;
      else handlers[ev] = fn;
      return () => {};
    },
    off: () => { ttsHandler = null; },
  },
}));

jest.mock('../../components/VoiceVisualizer', () => ({
  __esModule: true,
  default: ({ isActive }) => <div data-testid="viz" data-active={isActive ? '1' : '0'} />,
}));

// The consent card is AgentOverlay's (one card, one API); its module pulls
// the social API client and a QR renderer that jsdom has no use for.
jest.mock('../../config/apiBase', () => ({API_BASE_URL: ''}));
jest.mock('../../constants/events', () => ({NUNBA_CAMERA_CONSENT: 'evt'}));
jest.mock('qrcode.react', () => ({QRCodeSVG: () => null}));
jest.mock('../../services/socialApi', () => ({
  consentApi: {
    grant: jest.fn(() => Promise.resolve({})),
    decline: jest.fn(() => Promise.resolve({})),
  },
  notificationsApi: {markRead: jest.fn(() => Promise.resolve({}))},
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
  uiHandler = null;
  try { localStorage.clear(); } catch (e) { /* noop */ }
});

// The ask integrations/vlm/safety.computer_control_block files while it waits
// (re-sent every 3 s with the same msg_id, up to 90 s); agent_name is the
// name HARTOS resolved where the ask was built (HARTOS 6d77030c1).
const ASK = {
  type: 'consent.request',
  msg_id: 'consent.request:row-1',
  consent_type: 'computer_control',
  scope: '*',
  agent_id: '79211163351',
  agent_name: 'Spider-Man',
  reason: '',
};

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

test('renders the existing computer-use projection without a new transport', () => {
  render(<VoiceOrbPage />);
  act(() => handlers['computer_use.update']({
    type: 'computer_use.update', task_id: 'computer_use_run_1',
    prompt_id: '42', agent_id: 'goal-42', summary: 'Selecting a control',
    phase: 'executing',
  }));
  expect(screen.getByText('Selecting a control')).toBeInTheDocument();
  expect(screen.getByTestId('voice-orb').dataset.active).toBe('1');
});

test('Ask HART injects guidance into the active HART context', async () => {
  const prompt = jest.fn(() => Promise.resolve('Guidance sent to the active HART.'));
  window.pywebview = {api: {on_companion_prompt: prompt}};
  try {
    render(<VoiceOrbPage />);
    act(() => handlers['computer_use.update']({
      type: 'computer_use.update', task_id: 'computer_use_run_1',
      prompt_id: '42', agent_id: 'goal-42', summary: 'Selecting a control',
      phase: 'executing',
    }));
    fireEvent.change(screen.getByLabelText('Quick prompt'), {target: {value: 'Use the safer option'}});
    fireEvent.submit(screen.getByLabelText('Quick prompt').closest('form'));
    await waitFor(() => expect(prompt).toHaveBeenCalledWith(
      'Use the safer option',
      expect.objectContaining({agent_id: 'goal-42', prompt_id: '42', task_id: 'computer_use_run_1'}),
    ));
  } finally {
    delete window.pywebview;
  }
});

describe('hosted in the desktop companion window', () => {
  // Owner 2026-09-15: the floating window exists only when an agent wants
  // to talk, and it morphs: the orb alone while the agent speaks, the card
  // (orb + quick prompt) only once the owner reaches for it, nothing when
  // idle.  Measured that day with the install's own pywebview: the window
  // cannot be see-through (a transparent WebView2 over an opaque form), so
  // the page tells the bridge WHAT to show and its CSS rect, and the bridge
  // clips the window to it ('orb' = the orb's rect, 'shown' = the card).
  let presence;
  const InertAudio = global.Audio;
  const realRect = Element.prototype.getBoundingClientRect;
  beforeEach(() => {
    // 'modern' so Date.now() advances with the timers: the page's idle
    // check compares Date.now() against its last interaction.
    jest.useFakeTimers('modern');
    presence = jest.fn();
    window.pywebview = { api: { on_companion_presence: presence } };
    // jsdom lays nothing out; give the (mocked) visualiser the box the real
    // one has inside the 220x310 window so the orb rect is measurable.
    Element.prototype.getBoundingClientRect = function rect() {
      if (this.dataset && this.dataset.testid === 'viz') {
        return { x: 40, y: 20, left: 40, top: 20, width: 140, height: 140, right: 180, bottom: 160 };
      }
      return realRect.call(this);
    };
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
    Element.prototype.getBoundingClientRect = realRect;
    jest.useRealTimers();
  });

  test('starts hidden: idle means no floating window', () => {
    render(<VoiceOrbPage />);
    act(() => { jest.advanceTimersByTime(1500); });
    expect(presence).toHaveBeenCalledWith('hidden', null);
    expect(presence).not.toHaveBeenCalledWith('orb', expect.anything());
    expect(presence).not.toHaveBeenCalledWith('shown', expect.anything());
    // and the page never applies the corner-peek transform when hosted
    expect(screen.getByTestId('voice-orb').style.transform).toBe('');
  });

  test('speaking shows the orb alone, then hides again once idle', () => {
    render(<VoiceOrbPage />);
    act(() => { jest.advanceTimersByTime(1500); });
    presence.mockClear();

    act(() => { if (ttsHandler) ttsHandler({ generated_audio_url: 'clip.mp3' }); });
    act(() => { jest.advanceTimersByTime(1100); });
    // The orb's own CSS rect, as a circle, in the page's viewport.
    expect(presence).toHaveBeenCalledWith('orb', expect.objectContaining({
      x: 40, y: 20, w: 140, h: 140, r: 70,
    }));
    expect(presence).not.toHaveBeenCalledWith('shown', expect.anything());

    // The clip probe never loads: the page's 3s fallback ends speaking, then
    // the idle window elapses and the page asks to hide again.  Stepped a
    // second at a time, like the real clock.
    presence.mockClear();
    const root = screen.getByTestId('voice-orb');
    for (let i = 0; i < 12; i++) act(() => { jest.advanceTimersByTime(1000); });
    expect(root.dataset.active).toBe('0');
    expect(root.dataset.away).toBe('1');
    expect(presence).toHaveBeenCalledWith('hidden', null);
  });

  test('reaching for the orb morphs it into the card', () => {
    render(<VoiceOrbPage />);
    act(() => { if (ttsHandler) ttsHandler({ generated_audio_url: 'clip.mp3' }); });
    act(() => { jest.advanceTimersByTime(1100); });
    presence.mockClear();

    fireEvent.mouseMove(window);
    act(() => { jest.advanceTimersByTime(50); });
    // The card is the whole page with rounded corners.
    expect(presence).toHaveBeenCalledWith('shown', expect.objectContaining({
      x: 0, y: 0, r: 24,
    }));
    const shape = presence.mock.calls.find((c) => c[0] === 'shown')[1];
    expect(shape.w).toBe(shape.vw);
    expect(shape.h).toBe(shape.vh);
  });

  // A HARTOS consent ask is an agent wanting to talk: it is the one thing
  // an autonomous agent stops for (owner 2026-09-15 (c): "if it is
  // autonomous it shd auto ask").  Measured 2026-09-15: the only consent
  // card, AgentOverlay's, is mounted in Demopage alone, and /voice-orb
  // mounts this page, so the floating window could never show an ask.
  describe('a consent ask', () => {
    const {consentApi} = require('../../services/socialApi');
    beforeEach(() => { consentApi.grant.mockClear(); consentApi.decline.mockClear(); });

    test('shows the card, by the agent\'s name, and raises the window', () => {
      render(<VoiceOrbPage />);
      act(() => { jest.advanceTimersByTime(1500); });
      presence.mockClear();

      act(() => { uiHandler(ASK); });
      act(() => { jest.advanceTimersByTime(50); });
      expect(screen.getByText('Spider-Man asks to control this computer.')).toBeInTheDocument();
      expect(screen.queryByText('79211163351')).not.toBeInTheDocument();
      expect(screen.getByRole('button', {name: "Don't allow Spider-Man"})).toBeInTheDocument();
      // The card needs the owner: the whole window, however idle it was.
      expect(presence).toHaveBeenCalledWith('shown', expect.objectContaining({x: 0, y: 0, r: 24}));
      expect(screen.getByTestId('voice-orb').dataset.presence).toBe('shown');
    });

    test('an ask with no name says "An agent"', () => {
      render(<VoiceOrbPage />);
      act(() => { uiHandler({...ASK, msg_id: 'consent.request:row-2', agent_name: undefined}); });
      expect(screen.getByText('An agent asks to control this computer.')).toBeInTheDocument();
    });

    test('the same ask re-sent while its card is up shows one card', () => {
      render(<VoiceOrbPage />);
      act(() => { uiHandler(ASK); uiHandler(ASK); uiHandler(ASK); });
      expect(screen.getAllByText('Spider-Man asks to control this computer.')).toHaveLength(1);
    });

    test('granting answers through the one consent API and lets the window go', async () => {
      jest.useRealTimers();
      render(<VoiceOrbPage />);
      act(() => { uiHandler(ASK); });
      fireEvent.click(screen.getByRole('button', {name: 'Allow ALL agents to control this computer'}));
      await waitFor(() => expect(consentApi.grant).toHaveBeenCalledWith({
        consent_type: 'computer_control', scope: '*',
      }));
      await waitFor(() =>
        expect(screen.queryByText('Spider-Man asks to control this computer.')).not.toBeInTheDocument());
      // Answered: the ask no longer holds the window open (the presence
      // effect runs after the dismiss, which arrives from the grant's promise).
      await waitFor(() =>
        expect(screen.getByTestId('voice-orb').dataset.presence).toBe('hidden'));
    });

    test('an answer given on another surface clears the ask and lets the window go', () => {
      // Owner 2026-09-15: giving consent in one place dismisses the ask on
      // every surface, for that user or the network guests.  HARTOS tells
      // every device (consent.granted / consent.revoked, the same fan-out
      // the ask rides); the companion reads it as the answer.
      render(<VoiceOrbPage />);
      act(() => { uiHandler(ASK); });
      act(() => { jest.advanceTimersByTime(50); });
      expect(screen.getByTestId('voice-orb').dataset.presence).toBe('shown');

      act(() => {
        handlers['consent.granted']({type: 'consent.granted',
          consent_type: 'computer_control', scope: '*', agent_id: null});
      });
      act(() => { jest.advanceTimersByTime(50); });
      expect(screen.queryByText('Spider-Man asks to control this computer.')).not.toBeInTheDocument();
      expect(screen.getByTestId('voice-orb').dataset.presence).toBe('hidden');
    });

    test('other agent UI (a notification card) does not reach the floating window', () => {
      render(<VoiceOrbPage />);
      act(() => { uiHandler({type: 'notification', agent_id: 'x', message: 'Digest ready'}); });
      expect(screen.queryByText('Digest ready')).not.toBeInTheDocument();
    });
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

test('renders live commentary when indicator step updates arrive', () => {
  render(<VoiceOrbPage />);
  act(() => {
    if (window.__onIndicatorStep) {
      window.__onIndicatorStep('Clicking the checkout button');
    }
  });
  expect(screen.getByText('LIVE COMMENTARY')).toBeInTheDocument();
  expect(screen.getByText('Clicking the checkout button')).toBeInTheDocument();
  expect(screen.getByTestId('voice-orb').dataset.active).toBe('1');
});

test('quick prompt attaches user_priority and priority: high', async () => {
  const prompt = jest.fn(() => Promise.resolve('Got guidance.'));
  window.pywebview = { api: { on_companion_prompt: prompt } };
  try {
    render(<VoiceOrbPage />);
    fireEvent.change(screen.getByLabelText('Quick prompt'), { target: { value: 'Prioritize this order' } });
    fireEvent.submit(screen.getByLabelText('Quick prompt').closest('form'));
    await waitFor(() => expect(prompt).toHaveBeenCalledWith(
      'Prioritize this order',
      expect.objectContaining({ priority: 'high', user_priority: true })
    ));
  } finally {
    delete window.pywebview;
  }
});

test('glass shell is scoped to hosted companion only (no regression for embedded/unhosted)', () => {
  // 1. Not hosted (e.g. embedded in browser/page): no glass shell card styling
  const { unmount } = render(<VoiceOrbPage />);
  const unhostedRoot = screen.getByTestId('voice-orb');
  expect(unhostedRoot.style.boxShadow).toBe('none');
  expect(unhostedRoot.style.border).toBeFalsy();
  expect(unhostedRoot.style.borderRadius).toBe('0');
  unmount();

  // 2. Hosted in standalone desktop companion: renders the frosted glass shell
  window.pywebview = { api: { on_companion_presence: jest.fn() } };
  try {
    render(<VoiceOrbPage />);
    const hostedRoot = screen.getByTestId('voice-orb');
    expect(hostedRoot.style.borderRadius).toBe('24px');
    expect(hostedRoot.style.border).toBeTruthy();
    expect(hostedRoot.style.boxShadow).toBeTruthy();
  } finally {
    delete window.pywebview;
  }
});
