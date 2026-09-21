/**
 * The companion page must notice pywebview when it arrives LATE.
 *
 * Measured on the running install 2026-09-21 (Nunba 16b74b92): the floating
 * window was a plain black rectangle with the quick-prompt pill shoved off
 * its right edge, and `[COMPANION] presence` appeared 0 times in the whole
 * log while the window was up.
 *
 * One line causes all three.  VoiceOrbPage held
 *
 *     const hosted = useRef(inCompanion());          // !!window.pywebview
 *
 * captured at FIRST RENDER and never revisited.  pywebview injects
 * `window.pywebview` asynchronously and announces it with 'pywebviewready' --
 * the page already listens for that event to re-send presence, so the late
 * arrival was known -- but nothing ever re-read `hosted`.  When React mounts
 * first, `hosted` is false forever, and then:
 *
 *   - the shell renders background:'transparent' instead of the glass, so the
 *     window's own background_color '#000000' is what the owner sees;
 *   - `shellPeek` (peeked && !hosted) turns on the BROWSER affordance
 *     translate(118px,46px) scale(.5), which is what pushed the pill right and
 *     clipped it;
 *   - the presence effect early-returns on `if (!hosted.current)`, so
 *     on_companion_presence is never called and the window never morphs.
 *
 * Every pre-existing VoiceOrbPage test sets window.pywebview BEFORE render, so
 * none of them can see this.  These mount first and inject after, which is the
 * real order.
 */
import { render, screen, act } from '@testing-library/react';
import React from 'react';

const handlers = {};
jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    on: (ev, fn) => { handlers[ev] = fn; return () => { delete handlers[ev]; }; },
    off: (ev) => { delete handlers[ev]; },
  },
}));

jest.mock('../../hooks/useComputerActivity', () => ({
  __esModule: true,
  default: () => ({activity: null, liveRun: null}),
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

let presence;
beforeEach(() => {
  Object.keys(handlers).forEach((k) => delete handlers[k]);
  presence = jest.fn();
  delete window.pywebview;              // mount OUTSIDE the companion first
});
afterEach(() => { delete window.pywebview; });

// The component import must come AFTER the jest.mock calls and the Audio stub
// above, so it is deliberately out of import order.
// eslint-disable-next-line import/first, import/order
import VoiceOrbPage from '../../components/VoiceOrb/VoiceOrbPage';

/** What pywebview actually does, in the order it does it. */
function pywebviewArrivesLate() {
  act(() => {
    window.pywebview = {api: {on_companion_presence: presence}};
    window.dispatchEvent(new Event('pywebviewready'));
  });
}

test('presence reaches the bridge when pywebview lands after mount', () => {
  // RED pre-fix: hosted was captured false at mount, the presence effect
  // early-returned, and this mock was never called however long we waited.
  render(<VoiceOrbPage />);
  expect(presence).not.toHaveBeenCalled();   // nothing to talk to yet — correct

  pywebviewArrivesLate();

  expect(presence).toHaveBeenCalled();
});

test('the glass shell replaces the bare transparent background once hosted', () => {
  // RED pre-fix: every glass property stayed at its un-hosted fallback, so the
  // window's own background_color '#000000' was the whole card -- the black
  // rectangle.
  //
  // Asserted on borderRadius/border, NOT on `background`: jsdom's CSS parser
  // cannot hold a linear-gradient() in the background shorthand, so
  // style.background reads 'transparent' even when hosted and the assertion
  // would fail against CORRECT code.  Measured while building this file.
  // borderRadius and border are plain values jsdom keeps, and they come off
  // the same `hosted` ternary, so they discriminate the same state.
  render(<VoiceOrbPage />);
  const shell = screen.getByTestId('voice-orb');
  // borderRadius is the one glass property jsdom round-trips cleanly.
  // `border: none` serialises to '' and the gradient background is dropped
  // entirely, so neither of those can carry the assertion -- measured, not
  // assumed.  Radius comes off the same `hosted` ternary as the rest, so
  // 0 -> CARD_RADIUS discriminates exactly the state under test.
  expect(['0', '0px']).toContain(shell.style.borderRadius);

  pywebviewArrivesLate();

  expect(shell.style.borderRadius).toBe('24px');      // CARD_RADIUS
});

test('the browser peek transform never applies inside the companion', () => {
  // RED pre-fix: shellPeek = peeked && !hosted, so the companion inherited the
  // web shell's corner-peek translate(118px,46px) scale(.5).  That offset is
  // what pushed the quick-prompt pill past the right edge and clipped it.
  render(<VoiceOrbPage />);
  pywebviewArrivesLate();

  const shell = screen.getByTestId('voice-orb');
  expect(shell.style.transform || '').not.toContain('118px');
});
