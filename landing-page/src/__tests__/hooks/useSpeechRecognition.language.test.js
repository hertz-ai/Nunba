/**
 * useSpeechRecognition — which language each STT path is told (2026-09-16).
 *
 * Owner: "STT ... does not work for all languages".  The chat mic pinned the
 * local Whisper stream to hart_language ('en' on the owner's box) through
 * {type:'config', language}, so Tamil or Hindi spoken to it was decoded as
 * English.  The streaming server (whisper_tool._stt_stream_handler) treats a
 * config WITHOUT a language as "detect per utterance", which is what a chat
 * mic wants.  The kids' games are English by design and keep pinning 'en'.
 * The browser fallback (Web Speech) cannot detect, so it is told the
 * person's preferred language, else the browser's own.
 */
import {renderHook, act} from '@testing-library/react';

let lastWS = null;
let wsShouldFail = false;
let lastRecognition = null;

class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    lastWS = this;
    setTimeout(() => {
      if (wsShouldFail) {
        this.readyState = 3;
        if (this.onerror) this.onerror(new Event('error'));
        return;
      }
      this.readyState = 1;
      if (this.onopen) this.onopen();
    }, 0);
  }
  send(data) { this.sent.push(data); }
  close() { this.readyState = 3; if (this.onclose) this.onclose(); }
}
MockWebSocket.OPEN = 1;

class MockRecognition {
  constructor() { this.lang = undefined; lastRecognition = this; }
  start() { if (this.onstart) this.onstart(); }
  stop() {}
}

class MockAudioContext {
  constructor() { this.destination = {}; this.sampleRate = 16000; }
  createMediaStreamSource() { return {connect: () => {}}; }
  createScriptProcessor() {
    return {connect: () => {}, disconnect: () => {}, onaudioprocess: null};
  }
  close() {}
}

global.WebSocket = MockWebSocket;
global.AudioContext = MockAudioContext;
// The hook captures window.webkitSpeechRecognition at import time, so the
// globals are set before the (non-hoisted) require below.
window.webkitSpeechRecognition = MockRecognition;
Object.defineProperty(global.navigator, 'mediaDevices', {
  configurable: true,
  value: {getUserMedia: async () => ({getTracks: () => [{stop: () => {}}]})},
});
Object.defineProperty(global.navigator, 'language', {configurable: true, value: 'de-DE'});

// eslint-disable-next-line global-require
const {default: useSpeechRecognition, sttConfigMessage} = require('../../hooks/useSpeechRecognition');

beforeEach(() => {
  lastWS = null;
  lastRecognition = null;
  wsShouldFail = false;
});

const configSent = (ws) => ws.sent
  .map((s) => { try { return JSON.parse(s); } catch (_) { return null; } })
  .find((m) => m && m.type === 'config');

test('sttConfigMessage carries a language only when one is pinned', () => {
  expect(sttConfigMessage()).toEqual({type: 'config'});
  expect(sttConfigMessage(null)).toEqual({type: 'config'});
  expect(sttConfigMessage('ta')).toEqual({type: 'config', language: 'ta'});
});

test('the chat mic (no pinned language) leaves the local Whisper to detect the language', async () => {
  const {result} = renderHook(() => useSpeechRecognition());
  await act(async () => {
    await result.current.startListening({preferredLanguage: 'en'});
  });
  expect(lastWS).toBeTruthy();
  const cfg = configSent(lastWS);
  expect(cfg).toEqual({type: 'config'});
  expect(cfg).not.toHaveProperty('language');
});

test('a pinned language (the kids games) is sent to the local Whisper', async () => {
  const {result} = renderHook(() => useSpeechRecognition({language: 'en'}));
  await act(async () => {
    await result.current.startListening();
  });
  expect(configSent(lastWS)).toEqual({type: 'config', language: 'en'});
});

test('the browser fallback takes the preferred language when nothing is pinned', async () => {
  wsShouldFail = true;
  const {result} = renderHook(() => useSpeechRecognition());
  await act(async () => {
    await result.current.startListening({preferredLanguage: 'hi'});
  });
  expect(lastRecognition).toBeTruthy();
  expect(lastRecognition.lang).toBe('hi');
});

test('the browser fallback takes the pinned language over the preference, else the browser language', async () => {
  wsShouldFail = true;
  const pinned = renderHook(() => useSpeechRecognition({language: 'en'}));
  await act(async () => {
    await pinned.result.current.startListening({preferredLanguage: 'hi'});
  });
  expect(lastRecognition.lang).toBe('en');

  const bare = renderHook(() => useSpeechRecognition());
  await act(async () => {
    await bare.result.current.startListening();
  });
  expect(lastRecognition.lang).toBe('de-DE');
});
