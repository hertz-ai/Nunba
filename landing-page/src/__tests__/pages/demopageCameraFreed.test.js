/**
 * The agent page frees the camera on every way out of using it, so its LED
 * goes off (owner 2026-11-21: "camera release fix in nunba is not working",
 * the LED stays on after use).
 *
 * Two places in Demopage open the camera themselves:
 *   - video mode streams it at 5 fps for as long as the mode is on.  Its
 *     cleanup stops what frameStreamRef holds, but that is set only once the
 *     camera plays.  Video mode ending while the camera was starting (another
 *     mode picked, the page left, another user signed in) found nothing to
 *     stop, and the camera then played on with nobody to stop it.  A camera
 *     that opened but would not play was never stopped either, and on macOS
 *     a native camera that started after the mode ended was kept.
 *   - the snapshot button: a snapshot that failed after the camera opened
 *     left it on.
 *
 * Demopage's provider tree is not mountable here, so both are cut out of
 * Demopage.js (between the markers below) and run as written, with a camera
 * whose tracks record stop(), a video element whose play() the test settles,
 * and a stand-in socket.  React's part is played by hand: a render runs the
 * previous effect's cleanup, then the effect, and frameStreamRef is the one
 * ref every render shares.
 *
 * CAMERA_FREED_DEMOPAGE=<path> runs the same tests against another copy of
 * Demopage.js (the parent commit) to show they fail there.
 */
const fs = require('fs');
const path = require('path');

const PAGE = process.env.CAMERA_FREED_DEMOPAGE
  || path.join(__dirname, '..', '..', 'pages', 'Demopage.js');
const SRC = fs.readFileSync(PAGE, 'utf8');

function cut(start, end) {
  const a = SRC.indexOf(start);
  if (a < 0) throw new Error(`Demopage marker not found: ${start}`);
  const b = SRC.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`Demopage end marker not found after ${start}: ${end}`);
  return SRC.slice(a, b + end.length);
}

const VIDEO_MODE = cut(
  '// ── Video mode: stream webcam frames to VisionService at 5 FPS ──',
  '}, [mediaMode, effectiveUserId]);');
const SNAPSHOT = cut('const handleCameraCapture = async () => {', '\n  };');

const quiet = {log: () => {}, warn: () => {}, error: () => {}};

// A camera: each getUserMedia waits until the test grants or refuses it.
function camera() {
  const tracks = [];
  const asks = [];
  const getUserMedia = jest.fn(() => new Promise((resolve, reject) => {
    asks.push({resolve, reject});
  }));
  return {
    navigator: {mediaDevices: {getUserMedia}},
    tracks,
    grant() {
      const track = {
        readyState: 'live',
        stop() { this.readyState = 'ended'; },
      };
      tracks.push(track);
      asks.shift().resolve({getTracks: () => [track], getVideoTracks: () => [track]});
      return track;
    },
    refuse() {
      const err = new Error('Permission denied');
      err.name = 'NotAllowedError';
      asks.shift().reject(err);
    },
    live: () => tracks.filter((t) => t.readyState === 'live'),
  };
}

// The elements the page makes; play() waits until the test settles it.
function elements() {
  const videos = [];
  return {
    videos,
    document: {
      createElement(tag) {
        if (tag === 'video') {
          const plays = [];
          const video = {
            srcObject: null,
            muted: false,
            videoWidth: 640,
            videoHeight: 480,
            plays,
            play: () => new Promise((resolve, reject) => { plays.push({resolve, reject}); }),
            pause: () => {},
          };
          videos.push(video);
          return video;
        }
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => ({drawImage: () => {}}),
            toBlob: () => {},
            toDataURL: () => 'data:image/jpeg;base64,AAAA',
          };
        }
        throw new Error(`unexpected element ${tag}`);
      },
    },
    plays: (i) => videos[i].plays[0].resolve(),
    failsToPlay: (i) => videos[i].plays[0].reject(new Error('play() failed')),
  };
}

function socketClass(sockets) {
  return class FakeSocket {
    static OPEN = 1;

    constructor(url) {
      this.url = url;
      this.readyState = 0;
      this.sent = [];
      sockets.push(this);
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
      if (this.onclose) this.onclose({code: 1000});
    }
  };
}

// Demopage's video-mode effect, rendered by hand.
function videoModePage({win = {}} = {}) {
  const cam = camera();
  const els = elements();
  const sockets = [];
  const FakeSocket = socketClass(sockets);
  const frameStreamRef = {current: null};
  let cleanup = null;
  const runCleanup = () => {
    const c = cleanup;
    cleanup = null;
    if (c) c();
  };
  const names = ['useRef', 'useEffect', 'mediaMode', 'effectiveUserId', 'navigator',
    'document', 'WebSocket', 'window', 'localStorage', 'console', 'fetch'];
  const render = (mediaMode) => {
    runCleanup();
    let effect = null;
    // eslint-disable-next-line no-new-func
    new Function(...names, VIDEO_MODE)(
      () => frameStreamRef, (fn) => { effect = fn; }, mediaMode, '10202', cam.navigator,
      els.document, FakeSocket, win, {getItem: () => null}, quiet, jest.fn());
    const c = effect();
    cleanup = typeof c === 'function' ? c : null;
  };
  return {cam, els, sockets, render, unmount: runCleanup};
}

// Demopage's snapshot handler, as written.
function snapshotPage() {
  const cam = camera();
  const els = elements();
  const setUserImage = jest.fn();
  const pushNotification = jest.fn();
  // eslint-disable-next-line no-new-func
  const handleCameraCapture = new Function(
    'navigator', 'document', 'setUserImage', 'pushNotification',
    `${SNAPSHOT}\nreturn handleCameraCapture;`,
  )(cam.navigator, els.document, setUserImage, pushNotification);
  return {cam, els, setUserImage, pushNotification, handleCameraCapture};
}

// Let the promise chains the page started settle.
const settle = async () => {
  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('video mode frees the camera on every way out', () => {
  test('on, the camera streams to VisionService; off, it is freed and the stream says so', async () => {
    const page = videoModePage();
    page.render('video');
    page.cam.grant();
    await settle();
    page.els.plays(0);
    await settle();
    expect(page.cam.live()).toHaveLength(1);
    expect(page.sockets).toHaveLength(1);
    page.sockets[0].open();
    expect(page.sockets[0].sent).toEqual(['10202', 'video_start']);

    page.render('audio');
    expect(page.cam.live()).toHaveLength(0);
    expect(page.sockets[0].sent).toContain('video_stop');
  });

  test('another mode picked while the camera starts: the camera is freed', async () => {
    const page = videoModePage();
    page.render('video');
    page.cam.grant();
    await settle();
    page.render('audio');          // the camera has opened, not played yet
    page.els.plays(0);
    await settle();
    expect(page.cam.live()).toHaveLength(0);
    expect(page.sockets).toHaveLength(0);
  });

  test('the page left while the camera starts: the camera is freed', async () => {
    const page = videoModePage();
    page.render('video');
    page.cam.grant();
    await settle();
    page.unmount();
    page.els.plays(0);
    await settle();
    expect(page.cam.live()).toHaveLength(0);
  });

  test('back in video mode: only this visit\'s camera runs, and leaving frees it', async () => {
    const page = videoModePage();
    page.render('video');
    const first = page.cam.grant();
    await settle();
    page.render('text');
    page.render('video');
    page.els.plays(0);              // the first visit's camera plays late
    await settle();
    const second = page.cam.grant();
    await settle();
    page.els.plays(1);
    await settle();
    expect(first.readyState).toBe('ended');
    expect(page.cam.live()).toEqual([second]);

    page.render('audio');
    expect(page.cam.live()).toHaveLength(0);
  });

  test('a camera that opens but will not play is freed', async () => {
    const page = videoModePage();
    page.render('video');
    page.cam.grant();
    await settle();
    page.els.failsToPlay(0);
    await settle();
    expect(page.cam.live()).toHaveLength(0);
  });

  test('a camera that opens after video mode ended is freed at once', async () => {
    const page = videoModePage();
    page.render('video');
    page.render('audio');
    page.cam.grant();
    await settle();
    expect(page.cam.live()).toHaveLength(0);
  });

  describe('the native camera (macOS, where the browser camera is refused)', () => {
    const nativeWindow = () => {
      const starts = [];
      const api = {
        native_camera_start: jest.fn(() => new Promise((resolve) => { starts.push(resolve); })),
        native_camera_stop: jest.fn(() => Promise.resolve('ok')),
      };
      return {win: {pywebview: {api}}, api, starts};
    };

    test('it starts while video mode is on, and leaving the mode stops it', async () => {
      const native = nativeWindow();
      const page = videoModePage({win: native.win});
      page.render('video');
      page.cam.refuse();
      await settle();
      expect(native.api.native_camera_start).toHaveBeenCalledWith('10202');
      native.starts[0]('ok');
      await settle();
      expect(native.api.native_camera_stop).not.toHaveBeenCalled();
      page.render('audio');
      expect(native.api.native_camera_stop).toHaveBeenCalledTimes(1);
    });

    test('it finishes starting after video mode ended: it is stopped', async () => {
      const native = nativeWindow();
      const page = videoModePage({win: native.win});
      page.render('video');
      page.cam.refuse();
      await settle();
      page.render('audio');         // the native camera is still starting
      native.starts[0]('ok');
      await settle();
      expect(native.api.native_camera_stop).toHaveBeenCalledTimes(1);
    });

    test('the browser camera is refused after video mode ended: no native camera starts', async () => {
      const native = nativeWindow();
      const page = videoModePage({win: native.win});
      page.render('video');
      page.render('audio');
      page.cam.refuse();
      await settle();
      expect(native.api.native_camera_start).not.toHaveBeenCalled();
    });
  });
});

describe('the snapshot button frees the camera however it ends', () => {
  test('a photo: taken, and the camera freed', async () => {
    const page = snapshotPage();
    const done = page.handleCameraCapture();
    page.cam.grant();
    await settle();
    page.els.plays(0);
    await done;
    expect(page.setUserImage).toHaveBeenCalledWith('data:image/jpeg;base64,AAAA');
    expect(page.cam.live()).toHaveLength(0);
  });

  test('the camera opens but will not play: freed, and the person told', async () => {
    const page = snapshotPage();
    const done = page.handleCameraCapture();
    page.cam.grant();
    await settle();
    page.els.failsToPlay(0);
    await done;
    expect(page.setUserImage).not.toHaveBeenCalled();
    expect(page.pushNotification).toHaveBeenCalledWith(
      {type: 'warning', message: 'Camera not available'});
    expect(page.cam.live()).toHaveLength(0);
  });
});
