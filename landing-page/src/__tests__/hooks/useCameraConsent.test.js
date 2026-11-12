/**
 * useCameraConsent / useConsentedCameraStream: the page's camera stream
 * follows the owner's camera consent kept in HARTOS, so one yes is the only
 * gate, and exactly one mounted surface streams for a person.
 *
 * Owner, 2026-11-09: "consent ask shd be the only gate and when consented it
 * shd work without any additional asks for vision captioning etc".
 * Measured on the desktop: the agent page (/local) never listened for the
 * camera answer, and NunbaChatProvider kept it in sessionStorage, so a yes
 * was forgotten at the next launch while HARTOS never asked again; the
 * speech-therapy agent's camera tool found no frame 28 times on 2026-11-07.
 * Review 2026-11-09 (hartos-16): /social/agent/:id/chat mounts the panel's
 * provider beside the page, so both streamed for the same person.
 *
 * The real hooks; only their inputs are replaced: the consent list (what
 * HARTOS answers, in the shape the page's client returns it), the realtime
 * stream (what HARTOS announces), and the camera streamer, which records
 * what each mounted surface asks of it.
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
// One entry per mounted surface, in mount order: what it last asked the
// camera streamer to do.
const mockStreams = new Map();
jest.mock('../../hooks/useCameraFrameStream', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: function useCameraFrameStreamRecorder(opts) {
      const me = React.useRef({});
      mockStreams.set(me.current, opts);
      React.useEffect(() => () => { mockStreams.delete(me.current); }, []);
    },
  };
});

// eslint-disable-next-line import/first
import {NUNBA_CAMERA_CONSENT} from '../../constants/events';
// eslint-disable-next-line import/first
import useCameraConsent, {useConsentedCameraStream} from '../../hooks/useCameraConsent';

// eslint-disable-next-line import/first
import {act, render, renderHook, waitFor} from '@testing-library/react';
// eslint-disable-next-line import/first
import React from 'react';

// What socialApi.consentApi.list resolves to: the axios interceptor returns
// the body, and consent_api answers _ok({'consents': [...], 'count'}).
const reply = (consents) => ({success: true, data: {consents, count: consents.length}});
const GRANTED = reply([{consent_type: 'camera_capture', granted: true, revoked_at: null}]);
const NONE = reply([]);

function fire(evt, payload) {
  (mockHandlers[evt] || []).forEach((cb) => cb(payload));
}

function signedIn() {
  localStorage.setItem('access_token', 'owner-token');
}

function card(approved) {
  window.dispatchEvent(new CustomEvent(NUNBA_CAMERA_CONSENT, {detail: {approved}}));
}

const streaming = () => [...mockStreams.values()].filter((o) => o.enabled);

function Surface({userId, paused}) {
  useConsentedCameraStream(userId, {paused});
  return null;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mockList.mockReset();
  mockStreams.clear();
  Object.keys(mockHandlers).forEach((k) => delete mockHandlers[k]);
});

describe('useCameraConsent: the answer HARTOS keeps', () => {
  test('a camera consent on file starts the camera, with no card this session', async () => {
    signedIn();
    mockList.mockResolvedValue(GRANTED);
    const {result} = renderHook(() => useCameraConsent('10202'));
    await waitFor(() => expect(result.current).toBe(true));
    // The privacy page's own list, live rows only, and a boot 404 stays off
    // the error banner.  (consentApi.list itself never caches.)
    expect(mockList).toHaveBeenCalledWith(
      {consent_type: 'camera_capture', active_only: true},
      {silentError: [404]});
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
    await act(async () => { card(true); });
    expect(result.current).toBe(true);
    await act(async () => { card(false); });
    expect(result.current).toBe(false);
  });

  test('without a sign-in nothing is read (a 401 would end a guest session)', () => {
    mockList.mockResolvedValue(GRANTED);
    const {result} = renderHook(() => useCameraConsent('guest-1'));
    expect(mockList).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  test("a guest's yes on the card lasts the tab's session, as it did before", async () => {
    // A guest has nothing to read back, so the yes is kept where the chat
    // panel used to keep it; a remount (a page change) still streams.
    const first = renderHook(() => useCameraConsent('guest-1'));
    await act(async () => { card(true); });
    first.unmount();
    const again = renderHook(() => useCameraConsent('guest-1'));
    expect(again.result.current).toBe(true);
    await act(async () => { card(false); });
    again.unmount();
    expect(renderHook(() => useCameraConsent('guest-1')).result.current).toBe(false);
  });

  test("a signed-in person's camera follows HARTOS, not a session flag", async () => {
    signedIn();
    sessionStorage.setItem('nunba_camera_consent', 'true');
    mockList.mockResolvedValue(NONE);
    const {result} = renderHook(() => useCameraConsent('10202'));
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });
});

describe('useConsentedCameraStream: one stream per person', () => {
  test('consent on file: the surface streams the camera for its person', async () => {
    signedIn();
    mockList.mockResolvedValue(GRANTED);
    render(<Surface userId="10202" />);
    await waitFor(() => expect(streaming()).toHaveLength(1));
    expect(streaming()[0]).toEqual({enabled: true, userId: '10202', channel: 'camera'});
  });

  test('no consent: nothing streams', async () => {
    signedIn();
    mockList.mockResolvedValue(NONE);
    render(<Surface userId="10202" />);
    await waitFor(() => expect(mockList).toHaveBeenCalled());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(mockStreams.size).toBe(1);
    expect(streaming()).toHaveLength(0);
  });

  test('the agent page beside the chat panel: one stream, and the other takes over', async () => {
    signedIn();
    mockList.mockResolvedValue(GRANTED);
    const panel = render(<Surface userId="10202" />);
    render(<Surface userId="10202" />);
    await waitFor(() => expect(streaming()).toHaveLength(1));
    expect(mockStreams.size).toBe(2);
    const [first] = [...mockStreams.values()];
    expect(first.enabled).toBe(true);
    panel.unmount();
    await waitFor(() => expect(streaming()).toHaveLength(1));
    expect(mockStreams.size).toBe(1);
  });

  test('video mode sends its own frames: no surface streams through here', async () => {
    signedIn();
    mockList.mockResolvedValue(GRANTED);
    render(<Surface userId="10202" />);
    const page = render(<Surface userId="10202" paused />);
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(streaming()).toHaveLength(0);
    // Leaving video mode: the page's paused claim goes, and one stream resumes.
    page.rerender(<Surface userId="10202" paused={false} />);
    await waitFor(() => expect(streaming()).toHaveLength(1));
  });

  test('two people: each has a stream of their own', async () => {
    signedIn();
    mockList.mockResolvedValue(GRANTED);
    render(<Surface userId="10202" />);
    render(<Surface userId="20303" />);
    await waitFor(() => expect(streaming()).toHaveLength(2));
    expect(streaming().map((o) => o.userId).sort()).toEqual(['10202', '20303']);
  });
});

// ── Both chat surfaces call the one hook ─────────────────────────────────
// Demopage is too large to mount here; the decision is the hook's, tested
// above.  Pinned below: the page asks the hook, paused in video mode.
describe('the agent page streams through the one hook', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../pages/Demopage.js'), 'utf8');

  test('for the user its frames are filed under, paused in video mode', () => {
    expect(src).toMatch(
      /useConsentedCameraStream\(effectiveUserId, \{paused: mediaMode === 'video'\}\);/);
  });

  test('and has no camera streamer of its own beside it', () => {
    expect(src).not.toMatch(/useCameraFrameStream\(/);
  });
});
