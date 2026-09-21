/**
 * The glass look is ONE definition, and both Nunba surfaces paint it.
 *
 * The frosted glass used to be written out three times with three different
 * sets of numbers — the HART OS shell (HARTOS theme_service.py, canonical),
 * the floating companion window (VoiceOrbPage) and the agent overlay cards
 * (AgentOverlay).  It is CSS in a webview, identical on Windows, macOS and
 * Linux, so there is nothing to fork.  `src/theme/hartGlass.js` now carries
 * the canonical values and both surfaces draw from it.
 *
 * Pinned here:
 *   1. the token values ARE the HARTOS canonical ones (theme_service.py:131-132,
 *      emitted at :452-463): blur 20px, saturation 180%, radius 16px,
 *      panel opacity 0.65, glass rgb 18,19,28;
 *   2. every derived CSS string is built from those numbers, not restated;
 *   3. the rendered companion window carries exactly the token's glass;
 *   4. the rendered overlay card carries exactly the token's glass;
 *   5. the companion keeps radius 24 as its documented exception, and that
 *      same number is what it reports as the native window clip (see
 *      hartGlass.js and tests/test_restart_minimize.py's shape mapping).
 *
 * That the components READ the module rather than happening to agree with it
 * is pinned separately, in VoiceOrbAgentOverlayGlassSource.test.jsx — without
 * it a hardcoded literal matching today's token would pass (3) and (4)
 * forever.
 */
import {render, screen, act, fireEvent} from '@testing-library/react';
import React from 'react';

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
  // jsdom has no media element; the orb probes clip duration on a 'tts' push.
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
import {
  COMPANION_CARD_RADIUS, COMPANION_GLASS_SURFACE, HART_GLASS, HART_GLASS_SURFACE,
} from '../../theme/hartGlass';
import socialTokens from '../../theme/socialTokens';
import {DEFAULT_THEME_CONFIG} from '../../theme/themePresets';
/* eslint-enable import/first */

/** Mount AgentOverlay and return a sender for agent.ui.update payloads. */
function mountOverlay() {
  const handlers = {};
  const rt = require('../../services/realtimeService').default;
  rt.on = jest.fn((topic, cb) => {
    handlers[topic] = cb;
    return () => {};
  });
  render(<AgentOverlay navigate={jest.fn()} />);
  return (payload) => act(() => handlers['agent.ui.update'](payload));
}

/**
 * The overlay card is a MUI Box, so emotion puts its glass in a stylesheet,
 * not inline.  Walk up from the message to the first ancestor jsdom reports
 * a border-radius for — that is the card.  (Measured: jsdom round-trips
 * background / border / border-radius / box-shadow through emotion, but
 * drops backdrop-filter, so that one is pinned on the inline-styled orb.)
 */
function overlayCardOf(messageText) {
  let node = screen.getByText(messageText);
  while (node && node !== document.body) {
    const cs = window.getComputedStyle(node);
    if (cs.borderRadius) return cs;
    node = node.parentElement;
  }
  throw new Error('no glass card found above the overlay message');
}

const flat = (s) => String(s).replace(/\s/g, '');

// ── 1 + 2: the tokens are the canonical HARTOS values ───────────────────
describe('the glass tokens mirror the HARTOS canonical values', () => {
  test("the raw numbers are theme_service.py's emitted shell defaults", () => {
    expect(HART_GLASS.blur).toBe(20);
    expect(HART_GLASS.saturation).toBe(180);
    expect(HART_GLASS.radius).toBe(16);
    expect(HART_GLASS.panelOpacity).toBe(0.65);
    expect(flat(HART_GLASS.tintRgb)).toBe('18,19,28');
  });

  test('every CSS string is built from those numbers, not restated', () => {
    // Re-derive from the raw values: a hand-edited string that drifts from
    // the numbers fails here.
    const {blur, saturation, panelOpacity, tintRgb, borderColor} = HART_GLASS;
    expect(HART_GLASS.backdropFilter)
      .toBe(`blur(${blur}px) saturate(${saturation}%)`);
    expect(HART_GLASS.background).toBe(`rgba(${tintRgb}, ${panelOpacity})`);
    expect(HART_GLASS.border).toBe(`1px solid ${borderColor}`);
    expect(HART_GLASS_SURFACE.borderRadius).toBe(`${HART_GLASS.radius}px`);
    // The spreadable surface is the same look, nothing re-typed.
    expect(HART_GLASS_SURFACE.background).toBe(HART_GLASS.background);
    expect(HART_GLASS_SURFACE.backdropFilter).toBe(HART_GLASS.backdropFilter);
    expect(HART_GLASS_SURFACE.WebkitBackdropFilter).toBe(HART_GLASS.backdropFilter);
    expect(HART_GLASS_SURFACE.border).toBe(HART_GLASS.border);
    expect(HART_GLASS_SURFACE.boxShadow).toBe(HART_GLASS.boxShadow);
  });

  test('the companion surface is the canonical glass with only its own radius', () => {
    expect(COMPANION_CARD_RADIUS).toBe(24);
    expect(COMPANION_GLASS_SURFACE.borderRadius).toBe('24px');
    // Same properties, same values — the radius is the ONLY thing that
    // differs.  A second literal sneaking into the companion fails here.
    expect(Object.keys(COMPANION_GLASS_SURFACE).sort())
      .toEqual(Object.keys(HART_GLASS_SURFACE).sort());
    Object.keys(HART_GLASS_SURFACE)
      .filter((k) => k !== 'borderRadius')
      .forEach((k) => expect(COMPANION_GLASS_SURFACE[k]).toBe(HART_GLASS_SURFACE[k]));
  });

  // The same three numbers were also typed out in the default theme preset
  // and in the social glass mixin's blur default.  They now come from the
  // one module, so "HART Default" cannot drift from the shell.
  test('the default theme preset takes its shell glass from the same module', () => {
    expect(DEFAULT_THEME_CONFIG.shell).toEqual({
      panel_opacity: HART_GLASS.panelOpacity,
      blur_radius: HART_GLASS.blur,
      border_radius: HART_GLASS.radius,
    });
    expect(DEFAULT_THEME_CONFIG.glass.blur_radius).toBe(HART_GLASS.blur);
  });

  test('the social glass mixins fall back to the same canonical blur', () => {
    // An un-configured theme: the mixins' own opacity ladder still applies,
    // but the blur they start from is the canonical one.
    const bareTheme = {
      palette: {
        background: {paper: '#1A1932'},
        divider: 'rgba(255,255,255,0.12)',
        common: {white: '#fff'},
      },
      custom: {},
    };
    expect(socialTokens.glass.surface(bareTheme).backdropFilter)
      .toBe(`blur(${HART_GLASS.blur}px)`);
    expect(socialTokens.glass.elevated(bareTheme).backdropFilter)
      .toBe(`blur(${HART_GLASS.blur + 4}px)`);
    expect(socialTokens.glass.subtle(bareTheme).backdropFilter)
      .toBe(`blur(${HART_GLASS.blur - 8}px)`);
  });
});

// ── 3: the companion window paints the token's glass ────────────────────
describe('the floating companion window', () => {
  afterEach(() => { delete window.pywebview; });

  test('paints the canonical glass, with its own documented radius', () => {
    window.pywebview = {api: {on_companion_presence: jest.fn()}};
    render(<VoiceOrbPage />);
    const shell = screen.getByTestId('voice-orb').style;

    expect(shell.background).toBe(HART_GLASS.background);
    expect(shell.backdropFilter).toBe(HART_GLASS.backdropFilter);
    expect(flat(shell.border)).toBe(flat(HART_GLASS.border));
    expect(flat(shell.boxShadow)).toBe(flat(HART_GLASS.boxShadow));
    // 24, not the canonical 16: this radius is the native window clip.
    expect(shell.borderRadius).toBe(`${COMPANION_CARD_RADIUS}px`);
  });

  test('un-hosted it stays bare — the glass is the companion window only', () => {
    render(<VoiceOrbPage />);
    const shell = screen.getByTestId('voice-orb').style;
    expect(shell.background).toBe('transparent');
    expect(shell.backdropFilter).toBeFalsy();
    expect(shell.boxShadow).toBe('none');
  });
});

// ── 4: the overlay card paints the same token's glass ───────────────────
describe('the agent overlay card', () => {
  test('paints the canonical glass at the canonical radius', () => {
    const send = mountOverlay();
    send({type: 'notification', title: 'Digest', message: 'Digest ready'});
    const card = overlayCardOf('Digest ready');

    // jsdom normalises whitespace inside rgba(); compare normalised.
    expect(flat(card.background)).toBe(flat(HART_GLASS.background));
    expect(flat(card.border)).toBe(flat(HART_GLASS.border));
    expect(flat(card.boxShadow)).toBe(flat(HART_GLASS.boxShadow));
    expect(card.borderRadius).toBe(HART_GLASS_SURFACE.borderRadius);
  });
});

// ── 5: the companion's radius still drives the native window clip ───────
test('the companion reports its documented radius as the window shape', () => {
  jest.useFakeTimers('modern');
  const presence = jest.fn();
  window.pywebview = {api: {on_companion_presence: presence}};
  try {
    render(<VoiceOrbPage />);
    // The owner reaching for it opens the whole card; that card rect is what
    // desktop/platform_utils.set_window_shape cuts the window to.
    fireEvent.mouseMove(window);
    act(() => { jest.advanceTimersByTime(50); });
    const shown = presence.mock.calls.find((c) => c[0] === 'shown');
    expect(shown).toBeTruthy();
    expect(shown[1].r).toBe(COMPANION_CARD_RADIUS);
  } finally {
    delete window.pywebview;
    jest.useRealTimers();
  }
});
