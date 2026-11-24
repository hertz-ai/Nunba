/**
 * The chat page's own mic stops cleanly and says so when its socket is gone.
 *
 * Owner 2026-11-24: the chat mic's speech socket died at 14:39, the button
 * kept showing Stop, nothing reconnected, and everything said from 15:00 to
 * 15:06 was lost.  Since c89714b1 the page's mic (Demopage
 * _useStreamingWhisper) streams through the shared link
 * (useSpeechRecognition.openSttLink).  rv_c897 found that what the PAGE does
 * on the link's give-up and on stop was pinned only by reading its source.
 *
 * Here the page's real _useStreamingWhisper is cut out of Demopage.js and
 * RUN, with the real link, fake sockets, a fake microphone and fake timers:
 *   - a socket that closes and does not come back stops the microphone,
 *     turns the button off, frees the mic for the next start, and tells the
 *     person;
 *   - Stop asks the server for the last words, sends what they were, closes,
 *     and never reconnects or warns;
 *   - a signed-in person's id labels their voice window, a guest sends none;
 *   - a mic the page opened tells the server to end utterances at a pause.
 *
 * OPEN_MIC_DEMOPAGE=<path> runs the same tests against another copy of
 * Demopage.js (a mutant) to show they fail there.
 */
const fs = require('fs');
const path = require('path');

const {
  openSttLink, sttConfigMessage, micTurnText, MIC_STOPPED_CUE, STT_RECONNECT_DELAYS_MS,
} = require('../../hooks/useSpeechRecognition');

const PAGE = process.env.OPEN_MIC_DEMOPAGE
  || path.join(__dirname, '..', '..', 'pages', 'Demopage.js');
const SRC = fs.readFileSync(PAGE, 'utf8');

function cut(src, start, end) {
  const a = src.indexOf(start);
  if (a < 0) throw new Error(`Demopage marker not found: ${start}`);
  const b = src.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`Demopage end marker not found after ${start}: ${end}`);
  return src.slice(a, b);
}

let sockets = [];

class FakeSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    sockets.push(this);
  }
  open() { this.readyState = 1; if (this.onopen) this.onopen(); }
  serverClose(code = 1011, reason = 'keepalive ping timeout') {
    this.readyState = 3;
    if (this.onclose) this.onclose({code, reason});
  }
  say(text, isFinal) { if (this.onmessage) this.onmessage({data: JSON.stringify({text, is_final: isFinal})}); }
  send(data) { this.sent.push(data); }
  close() { this.readyState = 3; if (this.onclose) this.onclose({code: 1000, reason: ''}); }
}
FakeSocket.OPEN = 1;

const controls = (sock) => sock.sent.filter((d) => typeof d === 'string').map((s) => JSON.parse(s));

// The page's microphone and audio graph, recording what was torn down.
function fakeAudio() {
  const audio = {tracks: [{stop: jest.fn()}], processor: null, source: null, ctx: null};
  audio.stream = {getTracks: () => audio.tracks};
  audio.AudioContext = class {
    constructor() { this.sampleRate = 16000; this.destination = {}; this.close = jest.fn(); audio.ctx = this; }
    createMediaStreamSource() { audio.source = {connect: jest.fn(), disconnect: jest.fn()}; return audio.source; }
    createScriptProcessor() {
      audio.processor = {connect: jest.fn(), disconnect: jest.fn(), onaudioprocess: null};
      return audio.processor;
    }
  };
  return audio;
}

const NAMES = ['fetch', 'navigator', 'window', 'effectiveUserId', 'micTurnText', 'unprompted',
  'notAddressed', 'setInputMessage', 'handleSendRef', 'openSttLink', 'sttConfigMessage',
  'recognitionRef', 'setIsRecording', 'micBusyRef', 'pushNotification', 'MIC_STOPPED_CUE',
  'ttsActiveRef'];

// The page's state, stubbed; `start()` runs the page's own function.
function chatPage({unprompted = false, userId = '42'} = {}) {
  const audio = fakeAudio();
  const page = {
    audio,
    composer: [],
    sent: [],
    recording: [],
    toasts: [],
    recognitionRef: {current: null},
    micBusyRef: {current: true},
  };
  const values = {
    fetch: async () => ({ok: true, json: async () => ({url: 'ws://127.0.0.1:8005'})}),
    navigator: {mediaDevices: {getUserMedia: async () => audio.stream}},
    window: {AudioContext: audio.AudioContext},
    effectiveUserId: userId,
    micTurnText,
    unprompted,
    notAddressed: () => {},
    setInputMessage: (v) => page.composer.push(v),
    handleSendRef: {current: () => page.sent.push(page.composer[page.composer.length - 1])},
    openSttLink,
    sttConfigMessage,
    recognitionRef: page.recognitionRef,
    setIsRecording: (v) => page.recording.push(v),
    micBusyRef: page.micBusyRef,
    pushNotification: (n) => page.toasts.push(n),
    MIC_STOPPED_CUE,
    ttsActiveRef: {current: false},
  };
  const tier = cut(SRC, 'const _useStreamingWhisper = async () => {', 'const _useWebSpeech = () => {');
  // eslint-disable-next-line no-new-func
  const useStreamingWhisper = new Function(...NAMES, `${tier}\nreturn _useStreamingWhisper;`)(
    ...NAMES.map((n) => values[n]));
  page.start = useStreamingWhisper;
  return page;
}

beforeAll(() => { global.WebSocket = FakeSocket; });

beforeEach(() => {
  sockets = [];
  jest.useFakeTimers();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  console.warn.mockRestore();
});

const started = async (page) => {
  const ok = await page.start();
  expect(ok).toBe(true);
  expect(sockets).toHaveLength(1);
  sockets[0].open();
  return page;
};

describe('the chat page mic', () => {
  test('a socket that does not come back stops the mic and tells the person', async () => {
    const page = await started(chatPage());
    expect(page.recording).toEqual([true]);

    sockets[0].serverClose();
    for (const delay of STT_RECONNECT_DELAYS_MS) {
      jest.advanceTimersByTime(delay);
      sockets[sockets.length - 1].serverClose(1006, '');
    }

    expect(page.recording).toEqual([true, false]);
    expect(page.toasts).toEqual([{type: 'warning', message: MIC_STOPPED_CUE}]);
    expect(page.audio.tracks[0].stop).toHaveBeenCalled();
    expect(page.audio.processor.disconnect).toHaveBeenCalled();
    expect(page.audio.ctx.close).toHaveBeenCalled();
    expect(page.micBusyRef.current).toBe(false);
    expect(page.recognitionRef.current).toBe(null);
    jest.advanceTimersByTime(60000);
    expect(sockets).toHaveLength(1 + STT_RECONNECT_DELAYS_MS.length);
  });

  test('a socket that comes back keeps the mic on, with no warning', async () => {
    const page = await started(chatPage());
    sockets[0].serverClose();
    jest.advanceTimersByTime(STT_RECONNECT_DELAYS_MS[0]);
    sockets[1].open();
    expect(page.recording).toEqual([true]);
    expect(page.toasts).toEqual([]);
    expect(page.audio.tracks[0].stop).not.toHaveBeenCalled();
  });

  test('Stop asks for the last words, sends them, and never reconnects or warns', async () => {
    const page = await started(chatPage());
    page.recognitionRef.current.stop();
    expect(controls(sockets[0])).toContainEqual({control: 'final'});
    expect(page.audio.tracks[0].stop).toHaveBeenCalled();

    sockets[0].say('hello there', true);
    jest.advanceTimersByTime(500);
    expect(page.sent).toEqual(['hello there']);
    expect(page.recording).toEqual([true, false]);

    jest.advanceTimersByTime(60000);
    expect(sockets).toHaveLength(1);
    expect(page.toasts).toEqual([]);
  });

  test('a signed-in person labels their voice window; a guest sends no id', async () => {
    await started(chatPage({userId: '42'}));
    expect(sockets[0].url).toBe('ws://127.0.0.1:8005?user_id=42');
    sockets = [];
    await started(chatPage({userId: 'guest'}));
    expect(sockets[0].url).toBe('ws://127.0.0.1:8005');
  });

  test('a mic the page opened asks the server to end utterances at a pause', async () => {
    await started(chatPage({unprompted: true}));
    expect(controls(sockets[0])[0]).toEqual({type: 'config', continuous: true});
    sockets = [];
    await started(chatPage({unprompted: false}));
    expect(controls(sockets[0])[0]).toEqual({type: 'config'});
  });
});
