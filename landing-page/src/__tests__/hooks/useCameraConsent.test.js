/**
 * useCameraConsent: the page's camera stream follows the owner's camera
 * consent kept in HARTOS, so one yes is the only gate.
 *
 * Owner, 2026-11-09: "consent ask shd be the only gate and when consented it
 * shd work without any additional asks for vision captioning etc".
 * Measured on the desktop: the agent page (/local) never listened for the
 * camera answer, and NunbaChatProvider kept it in sessionStorage, so a yes
 * was forgotten at the next launch while HARTOS never asked again; the
 * speech-therapy agent's camera tool found no frame 28 times on 2026-11-07.
 *
 * The real hook; only its two inputs are replaced: the consent list (what
 * HARTOS answers) and the realtime stream (what HARTOS announces).
 */
const mockHandlers = {};
jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    on: (evt, cb) => {
      (mockHandlers[evt] = mockHandlers[evt] || []).push(cb);
      return () => {
        mockHandlers[evt] = (mockHandlers[evt] || []).filter((f) => f !== cb);
      };
    },
  },
}));
const mockList = jest.fn();
jest.mock('../../services/socialApi', () => ({
  __esModule: true,
  consentApi: {list: (...args) => mockList(...args)},
}));

// eslint-disable-next-line import/first
import {NUNBA_CAMERA_CONSENT} from '../../constants/events';
// eslint-disable-next-line import/first
import useCameraConsent from '../../hooks/useCameraConsent';

// eslint-disable-next-line import/first
import {act, renderHook, waitFor} from '@testing-library/react';

const GRANTED = {consents: [{consent_type: 'camera_capture', granted: true, revoked_at: null}]};
const NONE = {consents: []};

function fire(evt, payload) {
  (mockHandlers[evt] || []).forEach((cb) => cb(payload));
}

function signedIn() {
  localStorage.setItem('access_token', 'owner-token');
}

beforeEach(() => {
  localStorage.clear();
  mockList.mockReset();
  Object.keys(mockHandlers).forEach((k) => delete mockHandlers[k]);
});

test('a camera consent on file starts the camera, with no card this session', async () => {
  signedIn();
  mockList.mockResolvedValue(GRANTED);
  const {result} = renderHook(() => useCameraConsent('10202'));
  await waitFor(() => expect(result.current).toBe(true));
  // The privacy page's own list, live rows only, a boot 404 stays off the
  // error banner, and HARTOS is asked every time (never a cached answer).
  expect(mockList).toHaveBeenCalledWith(
    {consent_type: 'camera_capture', active_only: true},
    {silentError: [404], cache: false});
});

test('no consent on file: the camera stays off', async () => {
  signedIn();
  mockList.mockResolvedValue(NONE);
  const {result} = renderHook(() => useCameraConsent('10202'));
  await waitFor(() => expect(mockList).toHaveBeenCalled());
  expect(result.current).toBe(false);
});

test('a yes given on another surface reaches this page', async () => {
  signedIn();
  mockList.mockResolvedValue(NONE);
  const {result} = renderHook(() => useCameraConsent('10202'));
  await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));
  mockList.mockResolvedValue(GRANTED);
  await act(async () => { fire('consent.granted', {consent_type: 'camera_capture'}); });
  await waitFor(() => expect(result.current).toBe(true));
});

test('a no given anywhere stops the camera', async () => {
  signedIn();
  mockList.mockResolvedValue(GRANTED);
  const {result} = renderHook(() => useCameraConsent('10202'));
  await waitFor(() => expect(result.current).toBe(true));
  mockList.mockResolvedValue(NONE);
  await act(async () => { fire('consent.revoked', {consent_type: 'camera_capture'}); });
  await waitFor(() => expect(result.current).toBe(false));
});

test('an answer about another consent does not read the camera again', async () => {
  signedIn();
  mockList.mockResolvedValue(NONE);
  renderHook(() => useCameraConsent('10202'));
  await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));
  await act(async () => { fire('consent.granted', {consent_type: 'screen_capture'}); });
  expect(mockList).toHaveBeenCalledTimes(1);
});

test('the page loaded before HARTOS could answer: the reconnect reads again', async () => {
  signedIn();
  const notYet = Object.assign(new Error('HTTP 404'), {response: {status: 404}});
  mockList.mockRejectedValueOnce(notYet);
  const {result} = renderHook(() => useCameraConsent('10202'));
  await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));
  expect(result.current).toBe(false);
  mockList.mockResolvedValue(GRANTED);
  await act(async () => { fire('connected', {connected: true, transport: 'sse'}); });
  await waitFor(() => expect(result.current).toBe(true));
});

test('a read that gets no answer keeps what is known', async () => {
  signedIn();
  mockList.mockResolvedValue(GRANTED);
  const {result} = renderHook(() => useCameraConsent('10202'));
  await waitFor(() => expect(result.current).toBe(true));
  mockList.mockRejectedValue(new Error('Network Error'));
  await act(async () => { fire('connected', {connected: true}); });
  expect(result.current).toBe(true);
});

test("the card's answer in this window counts at once", async () => {
  const {result} = renderHook(() => useCameraConsent('10202'));
  await act(async () => {
    window.dispatchEvent(new CustomEvent(NUNBA_CAMERA_CONSENT, {detail: {approved: true}}));
  });
  expect(result.current).toBe(true);
  await act(async () => {
    window.dispatchEvent(new CustomEvent(NUNBA_CAMERA_CONSENT, {detail: {approved: false}}));
  });
  expect(result.current).toBe(false);
});

test('without a sign-in nothing is read (a 401 would end a guest session)', () => {
  mockList.mockResolvedValue(GRANTED);
  const {result} = renderHook(() => useCameraConsent('guest-1'));
  expect(mockList).not.toHaveBeenCalled();
  expect(result.current).toBe(false);
});

// ── The agent page (/local) streams on the consent too ───────────────────
// Demopage is too large to mount here; its own behaviour is the hook's,
// pinned above.  What is pinned below is that the page asks the hook and
// streams on its answer, outside video mode (which streams its own frames).
describe('the agent page follows the camera consent', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../pages/Demopage.js'), 'utf8');

  test('it reads the consent for the user its frames are filed under', () => {
    expect(src).toMatch(/const cameraConsented = useCameraConsent\(effectiveUserId\);/);
  });

  test('it streams camera frames while the consent is on file', () => {
    expect(src).toMatch(
      /useCameraFrameStream\(\{\s*enabled: cameraConsented && mediaMode !== 'video',\s*userId: effectiveUserId,\s*channel: 'camera',\s*\}\)/);
  });
});
