/**
 * utils/liveAvatar: one live talking-avatar reply at a time, stoppable from the page's one
 * stop, never started before its buffer rule allows, and never leaving a reply unheard.
 *
 * The buffer rule: buffered ahead >= remaining * (1/(rate*0.85) - 1) + 0.3 s, so playback
 * never catches the generator mid-sentence; a whole buffered stream plays at once; an unknown
 * speed holds rather than guesses.
 */
import {NO_DATA_S, neededAhead, startLiveAvatar, stopLiveAvatar} from '../../utils/liveAvatar';

describe('neededAhead', () => {
  it('starts at once (0.3 s) when generation is comfortably faster than real time', () => {
    expect(neededAhead(10, 2.0, false)).toBeCloseTo(0.3, 5);
  });

  it('waits long enough to cover the rest when generation is slower than real time', () => {
    expect(neededAhead(10, 1.0, false)).toBeCloseTo(10 * (1 / 0.85 - 1) + 0.3, 5);
  });

  it('needs more buffer the more of the reply is left', () => {
    expect(neededAhead(20, 0.8, false)).toBeGreaterThan(neededAhead(5, 0.8, false));
  });

  it('holds when the speed is unknown', () => {
    expect(neededAhead(5, null, false)).toBe(Infinity);
  });

  it('plays straight away once the whole stream is buffered', () => {
    expect(neededAhead(5, null, true)).toBe(0.02);
    expect(neededAhead(0, 0.5, false)).toBe(0.02);
  });
});

// ── fakes: MediaSource, the agent's <video>, fetch ───────────────────────────────────────
// Closer to a browser than a stub: the MediaSource opens a tick after it is attached (as
// 'sourceopen' does), appends complete a tick later with `updating` set meanwhile, and the
// element can fire events of its PREVIOUS source after the new one is set.

class FakeSourceBuffer extends EventTarget {
  constructor(video) {
    super();
    this.updating = false;
    this.video = video;
  }

  appendBuffer(bytes) {
    this.updating = true;
    setTimeout(() => {
      this.video.bufferedEnd += bytes.length / 10; // 10 bytes = 1 s of media
      this.updating = false;
      this.dispatchEvent(new Event('updateend'));
    }, 0);
  }
}

let lastMS;
class FakeMediaSource extends EventTarget {
  static isTypeSupported() {
    return true;
  }

  constructor() {
    super();
    this.readyState = 'closed';
    this.ended = false;
    lastMS = this;
    setTimeout(() => {
      this.readyState = 'open';
      this.dispatchEvent(new Event('sourceopen'));
    }, 0);
  }

  addSourceBuffer() {
    this.sb = new FakeSourceBuffer(this.video);
    return this.sb;
  }

  endOfStream() {
    this.ended = true;
    this.readyState = 'ended';
  }
}

function fakeVideo(url) {
  const v = new EventTarget();
  Object.assign(v, {
    autoplay: true,
    muted: true,
    paused: true,
    currentTime: 0,
    isConnected: true,
    bufferedEnd: 0,
    src: url || '',
    play: jest.fn(() => {
      v.paused = false;
      v.dispatchEvent(new Event('play'));
      return Promise.resolve();
    }),
    pause: jest.fn(() => {
      v.paused = true;
    }),
  });
  Object.defineProperty(v, 'buffered', {
    get: () => ({length: v.bufferedEnd > 0 ? 1 : 0, end: () => v.bufferedEnd}),
  });
  return v;
}

function streamOf(chunks, {failAfter = null} = {}) {
  let i = 0;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: () => {
          if (failAfter !== null && i >= failAfter) return Promise.reject(new Error('relay timed out'));
          if (i >= chunks.length) return Promise.resolve({done: true});
          return Promise.resolve({done: false, value: chunks[i++]});
        },
      }),
    },
  };
}

const neverEnding = () => ({ok: true, body: {getReader: () => ({read: () => new Promise(() => {})})}});

const flush = async (n = 20) => {
  for (let k = 0; k < n; k++) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
    jest.advanceTimersByTime(1);
  }
};

const STREAM = '/avatar/live/abcdef012345.mp4';

describe('the live player', () => {
  const realMS = window.MediaSource;
  const realFetch = global.fetch;
  const realCreate = URL.createObjectURL;
  const realRevoke = URL.revokeObjectURL;
  let deletes;

  beforeEach(() => {
    jest.useFakeTimers();
    window.MediaSource = FakeMediaSource;
    URL.createObjectURL = jest.fn(() => 'blob:' + Math.random());
    URL.revokeObjectURL = jest.fn();
    deletes = [];
    localStorage.removeItem('nunba_avatar_rate');
  });
  afterEach(() => {
    stopLiveAvatar();
    jest.useRealTimers();
    window.MediaSource = realMS;
    global.fetch = realFetch;
    URL.createObjectURL = realCreate;
    URL.revokeObjectURL = realRevoke;
    localStorage.removeItem('nunba_avatar_rate');
  });

  const fetchWith = (stream) => {
    global.fetch = jest.fn((url, opts = {}) => {
      if (opts.method === 'DELETE') {
        deletes.push(url);
        return Promise.resolve({ok: true});
      }
      return Promise.resolve(typeof stream === 'function' ? stream() : stream);
    });
  };
  const start = (cbs = {}, seconds = 4) => {
    const p = startLiveAvatar({streamUrl: STREAM, seconds});
    const v = fakeVideo(p.url);
    lastMS.video = v;
    p.attach(v, cbs);
    return {p, v};
  };

  it('gives no player without a stream, MSE, or H.264 + AAC, so the reply is heard', () => {
    expect(startLiveAvatar({streamUrl: '', seconds: 4})).toBeNull();
    window.MediaSource = undefined;
    expect(startLiveAvatar({streamUrl: STREAM, seconds: 4})).toBeNull();
    window.MediaSource = {isTypeSupported: () => false};
    expect(startLiveAvatar({streamUrl: STREAM, seconds: 4})).toBeNull();
  });

  it("turns the element's autoplay off and undoes anyone else's play()", () => {
    fetchWith(neverEnding);
    const {v} = start();
    expect(v.autoplay).toBe(false);
    expect(v.muted).toBe(false);
    v.pause.mockClear();
    v.play(); // e.g. a canplay listener left behind by the idle video
    expect(v.pause).toHaveBeenCalled();
    expect(v.paused).toBe(true);
  });

  it("stopLiveAvatar (the page's one stop) silences it, tells the server, lets go, and says so", () => {
    fetchWith(neverEnding);
    const onStop = jest.fn();
    const onEnd = jest.fn();
    const onFail = jest.fn();
    const {p, v} = start({onEnd, onFail, onStop});
    expect(stopLiveAvatar()).toBe(true);
    expect(v.pause).toHaveBeenCalled();
    expect(v.muted).toBe(true);
    expect(deletes).toEqual([STREAM]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(p.url);
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();
    expect(onFail).not.toHaveBeenCalled();
    expect(p.active).toBe(false);
    expect(stopLiveAvatar()).toBe(false); // nothing left playing
  });

  it('a new reply stops the one before it', () => {
    fetchWith(neverEnding);
    const onStop = jest.fn();
    const first = startLiveAvatar({streamUrl: '/avatar/live/aaaaaaaaaaaa.mp4', seconds: 4});
    first.attach(fakeVideo(first.url), {onStop});
    startLiveAvatar({streamUrl: '/avatar/live/bbbbbbbbbbbb.mp4', seconds: 4});
    expect(deletes).toEqual(['/avatar/live/aaaaaaaaaaaa.mp4']);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('a late event of the previous source does not end the new reply', () => {
    fetchWith(neverEnding);
    const onFail = jest.fn();
    const {v} = start({onFail});
    v.dispatchEvent(new Event('emptied')); // queued by the src change, before sourceopen
    v.dispatchEvent(new Event('error'));
    expect(onFail).not.toHaveBeenCalled();
  });

  it('an element the page removed is stopped and never played again', async () => {
    fetchWith(streamOf([new Uint8Array(50)]));
    const onStop = jest.fn();
    const {v} = start({onStop});
    await flush();
    v.isConnected = false;
    v.play.mockClear();
    jest.advanceTimersByTime(500);
    expect(v.play).not.toHaveBeenCalled();
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('holds while a slow stream cannot cover the rest, and plays the whole stream once it is in', async () => {
    localStorage.setItem('nunba_avatar_rate', '0.9'); // a little slower than real time, remembered
    let release;
    const gate = new Promise((r) => { release = r; });
    let i = 0;
    fetchWith(() => ({
      ok: true,
      body: {
        getReader: () => ({
          read: () => {
            i += 1;
            if (i === 1) return Promise.resolve({done: false, value: new Uint8Array(10)});
            return gate.then(() => ({done: true}));
          },
        }),
      },
    }));
    const {v} = start({}, 20);
    await flush(8);
    jest.advanceTimersByTime(1000); // ten decision ticks with 1 s buffered, 19 s still to come
    expect(v.play).not.toHaveBeenCalled(); // at 0.9x it would catch the generator: hold
    release();
    await flush(20); // the stream ended: what is buffered is all of it
    jest.advanceTimersByTime(250); // the next decision ticks (every 100 ms)
    expect(v.play).toHaveBeenCalled();
  });

  it('a stream that fails before any of it arrived falls back to the audio, once, and stops the server', async () => {
    fetchWith(streamOf([], {failAfter: 0}));
    const onFail = jest.fn();
    const onEnd = jest.fn();
    const {v} = start({onEnd, onFail});
    await flush();
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();
    expect(deletes).toEqual([STREAM]);
    v.dispatchEvent(new Event('error'));
    expect(onFail).toHaveBeenCalledTimes(1);
  });

  it('a stream cut after some of it arrived plays what came, then ends, and stops the server', async () => {
    fetchWith(streamOf([new Uint8Array(30)], {failAfter: 1}));
    const onFail = jest.fn();
    const onEnd = jest.fn();
    const {v} = start({onEnd, onFail}, 10);
    await flush(30);
    expect(lastMS.ended).toBe(true); // the buffered 3 s play out
    expect(deletes).toEqual([STREAM]);
    expect(onFail).not.toHaveBeenCalled();
    v.dispatchEvent(new Event('ended'));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('a stream that ends with nothing playable is heard instead', async () => {
    fetchWith(streamOf([]));
    const onFail = jest.fn();
    start({onFail});
    await flush();
    expect(onFail).toHaveBeenCalledTimes(1);
  });

  it('a first fragment that comes after a face crop of a few seconds still shows the face', async () => {
    let send;
    const first = new Promise((r) => { send = r; });
    let i = 0;
    fetchWith(() => ({
      ok: true,
      body: {
        getReader: () => ({
          read: () => {
            i += 1;
            if (i === 1) return first; // the face crop and first block take 3 s
            if (i === 2) return Promise.resolve({done: false, value: new Uint8Array(60)});
            return Promise.resolve({done: true});
          },
        }),
      },
    }));
    const onFail = jest.fn();
    const {v} = start({onFail}, 8);
    await flush();
    jest.advanceTimersByTime(3000); // nothing yet: no verdict before NO_DATA_S
    expect(onFail).not.toHaveBeenCalled();
    send({done: false, value: new Uint8Array(20)});
    await flush(40);
    jest.advanceTimersByTime(250); // the next decision ticks (every 100 ms)
    expect(onFail).not.toHaveBeenCalled(); // its speed is measured from the first data on
    expect(v.play).toHaveBeenCalled();
  });

  it('no data within NO_DATA_S: the reply is heard', async () => {
    fetchWith(neverEnding);
    const onFail = jest.fn();
    start({onFail});
    await flush();
    jest.advanceTimersByTime((NO_DATA_S + 1) * 1000);
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(deletes).toEqual([STREAM]);
  });

  it('a whole stream that arrived is not stopped on the server', async () => {
    fetchWith(streamOf([new Uint8Array(40)]));
    const onEnd = jest.fn();
    const {v} = start({onEnd});
    await flush(30);
    v.dispatchEvent(new Event('ended'));
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(deletes).toEqual([]);
  });
});
