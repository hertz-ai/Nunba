/**
 * useSpeechRecognition — stopListening flushes a FINAL transcript.
 *
 * Regression guard for the long-standing streaming-STT bug: stopListening
 * closed the :8005 WebSocket WITHOUT sending {control:'final'}, so the server
 * never emitted is_final:true — the signal that drives onResult. Every short
 * utterance therefore looked broken (KidsLearning games never registered the
 * spoken word; chat dictation never finalized). This test mounts the hook with
 * mocked browser audio + WS primitives, starts a WS session, stops it, and
 * asserts the {control:'final'} flush was sent before the close.
 */
import {renderHook, act} from '@testing-library/react';

let lastWS = null;

class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.sent = [];
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    lastWS = this;
    // Open asynchronously so startWebSocketSTT's onopen Promise resolves.
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) this.onopen();
    }, 0);
  }
  send(data) { this.sent.push(data); }
  close() { this.readyState = 3; if (this.onclose) this.onclose(); }
}
MockWebSocket.OPEN = 1;

class MockAudioContext {
  constructor() { this.destination = {}; this.sampleRate = 16000; }
  createMediaStreamSource() { return {connect: () => {}}; }
  createScriptProcessor() {
    return {connect: () => {}, disconnect: () => {}, onaudioprocess: null};
  }
  close() {}
}

beforeAll(() => {
  global.WebSocket = MockWebSocket;
  global.AudioContext = MockAudioContext;
  Object.defineProperty(global.navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: async () => ({getTracks: () => [{stop: () => {}}]}),
    },
  });
});

// eslint-disable-next-line import/first
import useSpeechRecognition from '../../hooks/useSpeechRecognition';

const parsedControls = (ws) =>
  ws.sent
    .map((s) => {
      try { return JSON.parse(s); } catch (_) { return null; }
    })
    .filter(Boolean);

test('stopListening sends {control:final} before closing the WS', async () => {
  const {result} = renderHook(() => useSpeechRecognition());

  await act(async () => {
    await result.current.startListening({language: 'en'});
  });

  expect(lastWS).toBeTruthy();
  expect(lastWS.readyState).toBe(MockWebSocket.OPEN);

  act(() => {
    result.current.stopListening();
  });

  expect(parsedControls(lastWS)).toEqual(
    expect.arrayContaining([{control: 'final'}])
  );
});
