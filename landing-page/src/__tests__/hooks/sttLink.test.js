/**
 * A mic keeps its speech socket for as long as it is on (owner 2026-11-24).
 *
 * On the installed Nunba that day the chat mic's socket to the local Whisper
 * (ws://127.0.0.1:8005) closed at 14:39 with nothing on screen: the button kept
 * showing Stop, nothing reconnected, and everything the owner said from 15:00
 * to 15:06 was lost ("I see stop which means nunba is still listening isnt").
 *
 * Pinned here: openSttLink, the one socket every streaming mic uses (the chat
 * page's own mic and useSpeechRecognition), reconnects a socket that was
 * working, holds the audio said meanwhile and sends it in order, sends its
 * config again on every open, stops on finish() without reconnecting, gives up
 * after its retries and says so, and never retries a socket that never opened
 * (the caller falls back at once).  The hook stays listening across a
 * reconnect and tells the person when the socket does not come back.  The chat
 * page's mic streams through the link, not a socket of its own.
 */
import {renderHook, act} from '@testing-library/react';
import fs from 'fs';
import path from 'path';

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
  send(data) { this.sent.push(data); }
  close() { this.readyState = 3; if (this.onclose) this.onclose({code: 1000, reason: ''}); }
}
FakeSocket.OPEN = 1;

class FakeAudioContext {
  constructor() { this.destination = {}; this.sampleRate = 16000; }
  createMediaStreamSource() { return {connect: () => {}, disconnect: () => {}}; }
  createScriptProcessor() { return {connect: () => {}, disconnect: () => {}, onaudioprocess: null}; }
  close() {}
}

beforeAll(() => {
  global.WebSocket = FakeSocket;
  global.AudioContext = FakeAudioContext;
  Object.defineProperty(global.navigator, 'mediaDevices', {
    configurable: true,
    value: {getUserMedia: async () => ({getTracks: () => [{stop: () => {}}]})},
  });
});

beforeEach(() => {
  sockets = [];
  jest.useFakeTimers();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  console.warn.mockRestore();
});

// eslint-disable-next-line import/first
import useSpeechRecognition, {
  openSttLink, sttConfigMessage, STT_RECONNECT_DELAYS_MS, STT_HELD_AUDIO_BYTES, MIC_STOPPED_CUE,
} from '../../hooks/useSpeechRecognition';

const frame = (n, size = 8) => new Uint8Array(size).fill(n).buffer;
const frames = (sock) => sock.sent.filter((d) => typeof d !== 'string').map((b) => new Uint8Array(b)[0]);
const controls = (sock) => sock.sent.filter((d) => typeof d === 'string').map((s) => JSON.parse(s));

describe('openSttLink', () => {
  test('sends its config on open, then the frames', () => {
    const link = openSttLink('ws://x', {config: sttConfigMessage(undefined, {continuous: true})});
    link.send(frame(1));
    sockets[0].open();
    link.send(frame(2));
    expect(controls(sockets[0])).toEqual([{type: 'config', continuous: true}]);
    expect(frames(sockets[0])).toEqual([1, 2]);
  });

  test('a working socket that closes comes back, with what was said meanwhile, in order', () => {
    const link = openSttLink('ws://x', {config: {type: 'config'}});
    sockets[0].open();
    link.send(frame(1));
    sockets[0].serverClose();
    link.send(frame(2));
    link.send(frame(3));
    jest.advanceTimersByTime(STT_RECONNECT_DELAYS_MS[0]);
    expect(sockets).toHaveLength(2);
    sockets[1].open();
    link.send(frame(4));
    // The config first, then what was held, then the new frame: the server
    // reads the config before any audio of the reopened stream.
    const order = sockets[1].sent.map((d) => (typeof d === 'string' ? JSON.parse(d).type : new Uint8Array(d)[0]));
    expect(order).toEqual(['config', 2, 3, 4]);
  });

  test('finish asks for the last words and does not reconnect', () => {
    const then = jest.fn();
    const link = openSttLink('ws://x', {});
    sockets[0].open();
    link.finish(500, then);
    expect(controls(sockets[0])).toContainEqual({control: 'final'});
    jest.advanceTimersByTime(500);
    expect(then).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(60000);
    expect(sockets).toHaveLength(1);
  });

  test('a socket that never opened is not retried: the caller falls back at once', () => {
    const onGiveUp = jest.fn();
    openSttLink('ws://x', {onGiveUp});
    sockets[0].serverClose(1006, '');
    expect(onGiveUp).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(60000);
    expect(sockets).toHaveLength(1);
  });

  test('after its retries it gives up once and says so', () => {
    const onGiveUp = jest.fn();
    const link = openSttLink('ws://x', {onGiveUp});
    sockets[0].open();
    sockets[0].serverClose();
    for (const delay of STT_RECONNECT_DELAYS_MS) {
      jest.advanceTimersByTime(delay);
      sockets[sockets.length - 1].serverClose(1006, '');
    }
    expect(onGiveUp).toHaveBeenCalledTimes(1);
    expect(sockets).toHaveLength(1 + STT_RECONNECT_DELAYS_MS.length);
    link.send(frame(9));
    jest.advanceTimersByTime(60000);
    expect(sockets).toHaveLength(1 + STT_RECONNECT_DELAYS_MS.length);
  });

  test('a reconnect that cannot even build a socket gives up once and says so', () => {
    const onGiveUp = jest.fn();
    openSttLink('ws://x', {onGiveUp});
    sockets[0].open();
    sockets[0].serverClose();
    const Working = global.WebSocket;
    global.WebSocket = function Refused() { throw new Error('The operation is insecure'); };
    global.WebSocket.OPEN = 1;
    try {
      jest.advanceTimersByTime(STT_RECONNECT_DELAYS_MS[0]);
      jest.advanceTimersByTime(60000);
    } finally {
      global.WebSocket = Working;
    }
    expect(onGiveUp).toHaveBeenCalledTimes(1);
    expect(sockets).toHaveLength(1);
  });

  test('held audio is bounded: the oldest goes first', () => {
    const link = openSttLink('ws://x', {});
    sockets[0].open();
    sockets[0].serverClose();
    const size = STT_HELD_AUDIO_BYTES / 4;
    for (let n = 1; n <= 6; n += 1) link.send(frame(n, size));
    jest.advanceTimersByTime(STT_RECONNECT_DELAYS_MS[0]);
    sockets[1].open();
    expect(frames(sockets[1])).toEqual([3, 4, 5, 6]);
  });
});

describe('sttConfigMessage', () => {
  test('a push-to-talk mic says nothing about staying open', () => {
    expect(sttConfigMessage()).toEqual({type: 'config'});
    expect(sttConfigMessage('ta')).toEqual({type: 'config', language: 'ta'});
  });
});

describe('useSpeechRecognition over the link', () => {
  const start = async (result) => {
    let started;
    await act(async () => {
      started = result.current.startListening({language: 'en'});
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => { sockets[0].open(); await started; });
  };

  test('keeps listening across a reconnect', async () => {
    const {result} = renderHook(() => useSpeechRecognition());
    await start(result);
    expect(result.current.isListening).toBe(true);
    act(() => { sockets[0].serverClose(); });
    expect(result.current.isListening).toBe(true);
    act(() => { jest.advanceTimersByTime(STT_RECONNECT_DELAYS_MS[0]); });
    act(() => { sockets[1].open(); });
    expect(result.current.isListening).toBe(true);
    expect(result.current.error).toBe(null);
  });

  test('tells the person when the socket does not come back', async () => {
    const onError = jest.fn();
    const {result} = renderHook(() => useSpeechRecognition({onError}));
    await start(result);
    act(() => { sockets[0].serverClose(); });
    for (const delay of STT_RECONNECT_DELAYS_MS) {
      act(() => {
        jest.advanceTimersByTime(delay);
        sockets[sockets.length - 1].serverClose(1006, '');
      });
    }
    expect(result.current.isListening).toBe(false);
    expect(result.current.error).toBe(MIC_STOPPED_CUE);
    expect(onError).toHaveBeenCalledWith(MIC_STOPPED_CUE);
  });
});

describe('the chat page mic', () => {
  test('source guard: streams through the shared link, not a socket of its own', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../pages/Demopage.js'), 'utf8');
    const start = src.indexOf('const _useStreamingWhisper = async');
    const end = src.indexOf('const _useWebSpeech = ', start);
    expect(start).toBeGreaterThan(-1);
    const body = src.slice(start, end);
    expect(body).toContain('openSttLink(');
    expect(body).not.toContain('new WebSocket(');
    expect(body).toContain('continuous: unprompted');
  });
});
