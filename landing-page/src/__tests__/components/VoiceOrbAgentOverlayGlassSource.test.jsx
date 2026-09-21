/**
 * Both glass surfaces READ the one token module — the consolidation itself.
 *
 * Its sibling (VoiceOrbAgentOverlayGlass.test.jsx) pins that the rendered
 * glass equals the canonical values.  That alone would keep passing if a
 * component quietly re-typed the same literals, which is exactly the drift
 * this change removes.  So here `src/theme/hartGlass` is swapped for
 * sentinel values and both surfaces are rendered: if the sentinels reach the
 * DOM, the component read the module; if a literal survives anywhere, the
 * canonical value shows up instead and the assertion fails.
 *
 * Whole-file mock (not jest.isolateModules): re-requiring a component inside
 * an isolated registry gives it a second React copy, whose hook dispatcher
 * react-dom never sets — measured here as "Cannot read properties of null
 * (reading 'useState')".
 */
import {render, screen, act} from '@testing-library/react';
import React from 'react';

const SENTINEL = {
  background: 'rgba(1, 2, 3, 0.11)',
  backdropFilter: 'blur(3px) saturate(111%)',
  border: '1px solid rgba(4, 5, 6, 0.07)',
  boxShadow: '0 1px 2px rgba(7, 8, 9, 0.05)',
};
const SENTINEL_RADIUS = '7px';
const SENTINEL_COMPANION_RADIUS = 9;

jest.mock('../../theme/hartGlass', () => {
  // Re-stated inside the factory: jest hoists it above the consts above.
  const s = {
    background: 'rgba(1, 2, 3, 0.11)',
    backdropFilter: 'blur(3px) saturate(111%)',
    border: '1px solid rgba(4, 5, 6, 0.07)',
    boxShadow: '0 1px 2px rgba(7, 8, 9, 0.05)',
  };
  const surface = {
    ...s, WebkitBackdropFilter: s.backdropFilter, borderRadius: '7px',
  };
  return {
    __esModule: true,
    HART_GLASS: {
      blur: 3, saturation: 111, radius: 7, panelOpacity: 0.11,
      tintRgb: '1, 2, 3', borderColor: 'rgba(4, 5, 6, 0.07)', ...s,
    },
    HART_GLASS_SURFACE: surface,
    COMPANION_CARD_RADIUS: 9,
    COMPANION_GLASS_SURFACE: {...surface, borderRadius: '9px'},
    default: {},
  };
});

jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {on: jest.fn(() => () => {}), off: jest.fn()},
}));
jest.mock('../../components/VoiceVisualizer', () => ({
  __esModule: true,
  default: () => <div data-testid="viz" />,
}));
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

beforeAll(() => {
  global.Audio = class {
    set preload(v) {}
    set src(v) {}
    set onloadedmetadata(v) {}
    set onerror(v) {}
  };
});

/* eslint-disable import/first */
import AgentOverlay from '../../components/AgentOverlay/AgentOverlay';
import VoiceOrbPage from '../../components/VoiceOrb/VoiceOrbPage';
/* eslint-enable import/first */

const flat = (s) => String(s).replace(/\s/g, '');

test('VoiceOrbPage takes its glass from the token module, not from a literal', () => {
  window.pywebview = {api: {on_companion_presence: jest.fn()}};
  try {
    render(<VoiceOrbPage />);
    const shell = screen.getByTestId('voice-orb').style;
    expect(shell.background).toBe(SENTINEL.background);
    expect(shell.backdropFilter).toBe(SENTINEL.backdropFilter);
    expect(flat(shell.border)).toBe(flat(SENTINEL.border));
    expect(flat(shell.boxShadow)).toBe(flat(SENTINEL.boxShadow));
    expect(shell.borderRadius).toBe(`${SENTINEL_COMPANION_RADIUS}px`);
  } finally {
    delete window.pywebview;
  }
});

test('the companion window shape uses the module\'s radius too', () => {
  const presence = jest.fn();
  window.pywebview = {api: {on_companion_presence: presence}};
  jest.useFakeTimers('modern');
  try {
    render(<VoiceOrbPage />);
    act(() => { window.dispatchEvent(new MouseEvent('mousemove')); });
    act(() => { jest.advanceTimersByTime(50); });
    const shown = presence.mock.calls.find((c) => c[0] === 'shown');
    expect(shown).toBeTruthy();
    expect(shown[1].r).toBe(SENTINEL_COMPANION_RADIUS);
  } finally {
    delete window.pywebview;
    jest.useRealTimers();
  }
});

test('AgentOverlay takes its glass from the token module, not from a literal', () => {
  const handlers = {};
  const rt = require('../../services/realtimeService').default;
  rt.on = jest.fn((topic, cb) => {
    handlers[topic] = cb;
    return () => {};
  });
  render(<AgentOverlay navigate={jest.fn()} />);
  act(() => handlers['agent.ui.update']({
    type: 'notification', title: 'Digest', message: 'Sentinel card',
  }));

  let node = screen.getByText('Sentinel card');
  let card = null;
  while (node && node !== document.body) {
    const cs = window.getComputedStyle(node);
    if (cs.borderRadius) { card = cs; break; }
    node = node.parentElement;
  }
  expect(card).toBeTruthy();
  expect(flat(card.background)).toBe(flat(SENTINEL.background));
  expect(flat(card.border)).toBe(flat(SENTINEL.border));
  expect(flat(card.boxShadow)).toBe(flat(SENTINEL.boxShadow));
  expect(card.borderRadius).toBe(SENTINEL_RADIUS);
});
