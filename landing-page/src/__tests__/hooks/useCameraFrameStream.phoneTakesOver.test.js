/**
 * The page holds the desktop camera only while it is used (owner 2026-11-13,
 * before the AIC demo: "zoom call also demands that nunba relinquishes the
 * camera gracefully"; the phone on a gimbal is the camera).
 *
 *   - no camera before the socket to VisionService is open;
 *   - "video_pause" (the person's phone streams its camera here) frees the
 *     camera and the page asks "video_paused" every PAUSED_HEARTBEAT_MS;
 *   - "video_resume" (the phone stopped) takes the camera back;
 *   - a closed socket (vision service stopped, eye button) frees the camera
 *     and the socket is tried again after RECONNECT_MS.
 *
 * Before: the camera was opened first and held until the page unmounted,
 * whatever the socket or the phone did.
 */
import {renderHook, act} from '@testing-library/react';

const sockets = [];
let autoOpen = true;

class FakeSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    this.onopen = null;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
    sockets.push(this);
    if (autoOpen) setTimeout(() => this.open(), 0);
  }

  open() {
    this.readyState = 1;
    if (this.onopen) this.onopen({});
  }

  send(data) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    if (this.onclose) this.onclose({});
  }

  // what the service says
  says(text) {
    this.onmessage({data: text});
  }
}
FakeSocket.OPEN = 1;

const track = {stop: jest.fn()};
const stream = {getTracks: () => [track]};

beforeEach(() => {
  jest.useFakeTimers();
  sockets.length = 0;
  autoOpen = true;
  track.stop.mockClear();
  global.WebSocket = FakeSocket;
  Object.defineProperty(global.navigator, 'mediaDevices', {
    configurable: true,
    value: {getUserMedia: jest.fn(() => Promise.resolve(stream))},
  });
  window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
  global.fetch = jest.fn(() => Promise.resolve({ok: false}));
});

afterEach(() => {
  jest.useRealTimers();
});

// eslint-disable-next-line import/first
import useCameraFrameStream, {
  PAUSED_HEARTBEAT_MS,
  RECONNECT_MS,
} from '../../hooks/useCameraFrameStream';

// Run due timers and let the promise chains they start settle.
const tick = async (ms = 0) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    for (let i = 0; i < 10; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.resolve();
    }
  });
};

const gum = () => navigator.mediaDevices.getUserMedia;

describe('useCameraFrameStream frees the camera when it is not used', () => {
  test('no camera before the socket is open', async () => {
    autoOpen = false;
    const {unmount} = renderHook(() =>
      useCameraFrameStream({enabled: true, userId: '10202'}));
    await tick(0);
    expect(sockets.length).toBe(1);
    expect(gum()).not.toHaveBeenCalled();
    sockets[0].open();
    await tick(0);
    expect(gum()).toHaveBeenCalledTimes(1);
    unmount();
  });

  test('"video_pause" frees the camera and the page asks to resume', async () => {
    const {unmount} = renderHook(() =>
      useCameraFrameStream({enabled: true, userId: '10202'}));
    await tick(0);
    await tick(0);
    expect(gum()).toHaveBeenCalledTimes(1);
    expect(track.stop).not.toHaveBeenCalled();

    await act(async () => { sockets[0].says('video_pause'); });
    expect(track.stop).toHaveBeenCalled();

    await tick(PAUSED_HEARTBEAT_MS);
    expect(sockets[0].sent).toContain('video_paused');
    expect(gum()).toHaveBeenCalledTimes(1);
    unmount();
  });

  test('"video_resume" takes the camera back and stops asking', async () => {
    const {unmount} = renderHook(() =>
      useCameraFrameStream({enabled: true, userId: '10202'}));
    await tick(0);
    await tick(0);
    await act(async () => { sockets[0].says('video_pause'); });
    await act(async () => { sockets[0].says('video_resume'); });
    await tick(0);
    expect(gum()).toHaveBeenCalledTimes(2);

    const asked = sockets[0].sent.filter((m) => m === 'video_paused').length;
    await tick(PAUSED_HEARTBEAT_MS * 2);
    expect(sockets[0].sent.filter((m) => m === 'video_paused').length).toBe(asked);
    unmount();
  });

  test('a closed socket frees the camera; the socket is tried again', async () => {
    const {unmount} = renderHook(() =>
      useCameraFrameStream({enabled: true, userId: '10202'}));
    await tick(0);
    await tick(0);
    expect(gum()).toHaveBeenCalledTimes(1);

    await act(async () => { sockets[0].close(); });
    expect(track.stop).toHaveBeenCalled();
    expect(sockets.length).toBe(1);

    await tick(RECONNECT_MS);
    expect(sockets.length).toBe(2);
    // the new socket's open was queued while the clock advanced
    await act(async () => { jest.runOnlyPendingTimers(); });
    await tick(0);
    expect(gum()).toHaveBeenCalledTimes(2);
    unmount();
  });

  test('unmount frees everything and tries nothing more', async () => {
    const {unmount} = renderHook(() =>
      useCameraFrameStream({enabled: true, userId: '10202'}));
    await tick(0);
    await tick(0);
    unmount();
    expect(track.stop).toHaveBeenCalled();
    await tick(RECONNECT_MS * 2);
    expect(sockets.length).toBe(1);
  });
});
