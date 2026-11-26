/**
 * The chat page's mic never sends what it hears while the agent's own voice
 * plays on this page, nor for a short tail after it stops, and what the
 * speech server holds when the voice starts is ended there and then (#289).
 *
 * Live 2026-11-26 on build #5 (agent 95568353503): the page's mic went deaf
 * at about 10:18:05 while the agent spoke, then for a 112.4 s reply from
 * 10:18:57.6.  Nothing reached the speech server until the reply ended at
 * about 10:20:50.  At 10:20:51.25 the server decoded a final of 8.448 s
 * (33 frames of 256 ms): about 28 frames of room audio it had held since the
 * mic went deaf, plus the frames sent the instant the voice stopped.
 * Whisper made 'Mm-hmm' of it, and the open mic sent that to the agent being
 * created as the parent's answer.  The gate (Demopage _useStreamingWhisper,
 * fed by ttsActiveRef) opened the instant playback stopped, and the
 * utterance held from before the voice stayed open across it.
 *
 * Now:
 *  - the gate stays shut for a tail after the voice stops: the frame being
 *    captured plus the latencies the audio graph reports, read from the live
 *    graph and logged at each stop (useSpeechRecognition.agentVoiceTailMs,
 *    hearsAgentVoice);
 *  - when the voice starts, the utterance the server holds is ended with the
 *    marker a stop already sends ({control:'final'}, openSttLink
 *    .endUtterance), so what was said before the voice is not joined to what
 *    is heard after it.
 *
 * The page's real _useStreamingWhisper and the render-body lines that feed
 * the gate are cut out of Demopage.js and RUN, with the real speech link,
 * fake sockets, a fake microphone and fake timers.
 */
const fs = require('fs');
const path = require('path');

const {
  openSttLink, sttConfigMessage, micTurnText, MIC_STOPPED_CUE, STT_RECONNECT_DELAYS_MS,
  STT_HELD_AUDIO_BYTES, agentVoiceTailMs, hearsAgentVoice,
} = require('../../hooks/useSpeechRecognition');

const PAGE = path.join(__dirname, '..', '..', 'pages', 'Demopage.js');
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
  send(data) { this.sent.push(data); }
  close() { this.readyState = 3; if (this.onclose) this.onclose({code: 1000, reason: ''}); }
}
FakeSocket.OPEN = 1;

// What the server got, in order: 'audio' for a frame, the control otherwise.
const received = (sock) => sock.sent.map((d) => (typeof d === 'string'
  ? (JSON.parse(d).control || JSON.parse(d).type) : 'audio'));
const framesSent = (sock) => received(sock).filter((d) => d === 'audio').length;
const ends = (sock) => received(sock).filter((d) => d === 'final').length;

// The page's microphone and audio graph, with the latencies it reports.
function fakeAudio({rate = 16000, outputLatency, baseLatency, inputLatency} = {}) {
  const track = {stop: jest.fn(),
    getSettings: () => (inputLatency === undefined ? {} : {latency: inputLatency})};
  const audio = {tracks: [track], processor: null};
  audio.stream = {getTracks: () => audio.tracks, getAudioTracks: () => audio.tracks};
  audio.AudioContext = class {
    constructor() {
      this.sampleRate = rate;
      this.destination = {};
      this.close = jest.fn();
      if (outputLatency !== undefined) this.outputLatency = outputLatency;
      if (baseLatency !== undefined) this.baseLatency = baseLatency;
    }
    createMediaStreamSource() { return {connect: jest.fn(), disconnect: jest.fn()}; }
    createScriptProcessor(size) {
      audio.processor = {bufferSize: size, connect: jest.fn(), disconnect: jest.fn(), onaudioprocess: null};
      return audio.processor;
    }
  };
  // One captured frame of the size the page asked for.
  audio.frame = () => {
    const samples = new Float32Array(audio.processor.bufferSize);
    audio.processor.onaudioprocess({inputBuffer: {getChannelData: () => samples}});
  };
  return audio;
}

const NAMES = ['fetch', 'navigator', 'window', 'effectiveUserId', 'micTurnText', 'unprompted',
  'setInputMessage', 'handleSendRef', 'openSttLink', 'sttConfigMessage',
  'recognitionRef', 'setIsRecording', 'micBusyRef', 'pushNotification', 'MIC_STOPPED_CUE',
  'ttsActiveRef', 'agentVoiceEndedAtRef', 'agentVoiceTailMs', 'hearsAgentVoice'];

// The playback state the page's render feeds the gate with.
const voiceState = () => ({ttsActiveRef: {current: false}, agentVoiceEndedAtRef: {current: null}});

// The page with its mic open (the mic the page opens by itself).
async function chatPage(graph, voice = voiceState()) {
  const audio = fakeAudio(graph);
  const values = {
    fetch: async () => ({ok: true, json: async () => ({url: 'ws://127.0.0.1:8005'})}),
    navigator: {mediaDevices: {getUserMedia: async () => audio.stream}},
    window: {AudioContext: audio.AudioContext},
    effectiveUserId: '42',
    micTurnText,
    unprompted: true,
    setInputMessage: () => {},
    handleSendRef: {current: () => {}},
    openSttLink,
    sttConfigMessage,
    recognitionRef: {current: null},
    setIsRecording: () => {},
    micBusyRef: {current: true},
    pushNotification: () => {},
    MIC_STOPPED_CUE,
    ttsActiveRef: voice.ttsActiveRef,
    agentVoiceEndedAtRef: voice.agentVoiceEndedAtRef,
    agentVoiceTailMs,
    hearsAgentVoice,
  };
  const tier = cut(SRC, 'const _useStreamingWhisper = async () => {', 'const _useWebSpeech = () => {');
  // eslint-disable-next-line no-new-func
  const start = new Function(...NAMES, `${tier}\nreturn _useStreamingWhisper;`)(
    ...NAMES.map((n) => values[n]));
  expect(await start()).toBe(true);
  sockets[0].open();
  return {audio, voice, sock: sockets[0]};
}

// The render-body lines that feed the gate, run as a React render would,
// with the page's playback state at that render.
function render(voice, {isSpeaking = false, isPlayingResponse = false} = {}) {
  const feed = cut(SRC, '// Keep the echo-cancellation gate fed', '// ── Manual retry for failed messages ──');
  // eslint-disable-next-line no-new-func
  new Function('tts', 'isPlayingResponse', 'ttsActiveRef', 'agentVoiceEndedAtRef', feed)(
    {isSpeaking}, isPlayingResponse, voice.ttsActiveRef, voice.agentVoiceEndedAtRef);
}

beforeAll(() => { global.WebSocket = FakeSocket; });

beforeEach(() => {
  sockets = [];
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-26T04:50:00Z'));
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  console.log.mockRestore();
  console.warn.mockRestore();
});

describe('the tail after the agent stops speaking', () => {
  test('is the frame being captured plus the latency the audio graph reports', () => {
    expect(agentVoiceTailMs({frameSamples: 4096, sampleRate: 16000})).toBe(256);
    expect(agentVoiceTailMs({frameSamples: 4096, sampleRate: 16000,
      outputLatencyS: 0.04, inputLatencyS: 0.01})).toBeCloseTo(306, 6);
    expect(agentVoiceTailMs({frameSamples: 4096, sampleRate: 48000})).toBeCloseTo(85.333, 2);
  });

  test('a latency the browser does not report counts as nothing', () => {
    for (const unknown of [undefined, null, NaN, -1, 'x']) {
      expect(agentVoiceTailMs({frameSamples: 4096, sampleRate: 16000,
        outputLatencyS: unknown, inputLatencyS: unknown})).toBe(256);
    }
    expect(agentVoiceTailMs()).toBe(0);
  });

  test('the voice, and the tail after it, are heard as the agent', () => {
    expect(hearsAgentVoice(true, null, 5000, 300)).toBe(true);
    expect(hearsAgentVoice(false, null, 5000, 300)).toBe(false);
    expect(hearsAgentVoice(false, 5000, 5299, 300)).toBe(true);
    expect(hearsAgentVoice(false, 5000, 5300, 300)).toBe(false);
  });
});

describe('the speech link ends an utterance and stays open', () => {
  const frame = (n) => new Uint8Array(8).fill(n).buffer;

  test('the end marker goes after the frames before it, and later frames still flow', () => {
    const link = openSttLink('ws://x', {config: {type: 'config'}});
    sockets[0].open();
    link.send(frame(1));
    link.endUtterance();
    link.send(frame(2));
    expect(received(sockets[0])).toEqual(['config', 'audio', 'final', 'audio']);
    expect(sockets[0].readyState).toBe(1);
  });

  test('while the socket is down the marker is held in order and sent on reopen', () => {
    const link = openSttLink('ws://x', {config: {type: 'config'}});
    sockets[0].open();
    sockets[0].serverClose();
    link.send(frame(1));
    link.endUtterance();
    link.send(frame(2));
    jest.advanceTimersByTime(STT_RECONNECT_DELAYS_MS[0]);
    sockets[1].open();
    expect(received(sockets[1])).toEqual(['config', 'audio', 'final', 'audio']);
  });

  test('a held marker does not break the cap on held audio', () => {
    const link = openSttLink('ws://x', {config: {type: 'config'}});
    sockets[0].open();
    sockets[0].serverClose();
    link.endUtterance();
    const big = () => new Uint8Array(STT_HELD_AUDIO_BYTES / 4).buffer;
    for (let i = 0; i < 8; i += 1) link.send(big());
    jest.advanceTimersByTime(STT_RECONNECT_DELAYS_MS[0]);
    sockets[1].open();
    const audioBytes = sockets[1].sent.filter((d) => typeof d !== 'string')
      .reduce((n, b) => n + b.byteLength, 0);
    expect(audioBytes).toBeLessThanOrEqual(STT_HELD_AUDIO_BYTES);
    expect(audioBytes).toBeGreaterThan(0);
  });

  test('a finished link sends no marker', () => {
    const link = openSttLink('ws://x', {});
    sockets[0].open();
    link.finish(0);
    const before = sockets[0].sent.length;
    link.endUtterance();
    expect(sockets[0].sent).toHaveLength(before);
  });
});

describe('the chat page mic', () => {
  test('sends nothing while the agent speaks on this page', async () => {
    const {audio, voice, sock} = await chatPage();
    render(voice, {isSpeaking: true});
    audio.frame();
    audio.frame();
    expect(framesSent(sock)).toBe(0);
  });

  test('the frame being captured as the voice stops is not sent (10:20:51, Mm-hmm)', async () => {
    const {audio, voice, sock} = await chatPage();
    render(voice, {isPlayingResponse: true});
    audio.frame();
    render(voice, {isPlayingResponse: false});   // the 112 s reply ended
    jest.advanceTimersByTime(200);                // inside one 256 ms frame
    audio.frame();
    expect(framesSent(sock)).toBe(0);
  });

  test('speech after the tail is sent at once', async () => {
    const {audio, voice, sock} = await chatPage();
    render(voice, {isSpeaking: true});
    render(voice, {isSpeaking: false});
    jest.advanceTimersByTime(256);
    audio.frame();
    expect(framesSent(sock)).toBe(1);
  });

  test('the tail grows by the latencies the graph reports', async () => {
    const {audio, voice, sock} = await chatPage({outputLatency: 0.05, inputLatency: 0.02});
    render(voice, {isPlayingResponse: true});
    render(voice, {isPlayingResponse: false});
    jest.advanceTimersByTime(300);                // 256 + 50 + 20 ms not yet passed
    audio.frame();
    expect(framesSent(sock)).toBe(0);
    jest.advanceTimersByTime(30);
    audio.frame();
    expect(framesSent(sock)).toBe(1);
  });

  test('each stop logs the tail it uses', async () => {
    const {audio, voice} = await chatPage({baseLatency: 0.01});
    render(voice, {isSpeaking: true});
    render(voice, {isSpeaking: false});
    audio.frame();
    audio.frame();
    const said = console.log.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('mic stays deaf'));
    expect(said).toHaveLength(1);
    expect(said[0]).toContain('266 ms');
  });

  test('with no voice at all every frame is sent and nothing is ended', async () => {
    const {audio, sock} = await chatPage();
    audio.frame();
    audio.frame();
    expect(framesSent(sock)).toBe(2);
    expect(ends(sock)).toBe(0);
  });

  test('what the server holds when the voice starts is ended then, never after it', async () => {
    // MUST A (hartos-17): frames, then the voice starts, then it ends, then
    // a frame.  The utterance open before the voice is ended once, before
    // anything heard after the voice reaches the server.
    const {audio, voice, sock} = await chatPage();
    audio.frame();
    audio.frame();                                // the person, before the agent speaks
    render(voice, {isPlayingResponse: true});
    audio.frame();
    audio.frame();                                // during the reply: nothing sent
    render(voice, {isPlayingResponse: false});
    jest.advanceTimersByTime(256);
    audio.frame();                                // after the tail
    expect(received(sock)).toEqual(['config', 'audio', 'audio', 'final', 'audio']);
  });

  test('a mic that sent nothing before the voice ends nothing', async () => {
    const {audio, voice, sock} = await chatPage();
    render(voice, {isSpeaking: true});
    audio.frame();
    render(voice, {isSpeaking: false});
    jest.advanceTimersByTime(256);
    audio.frame();
    expect(received(sock)).toEqual(['config', 'audio']);
  });
});

describe('the render-body feed', () => {
  test('notes when the voice stops, once', () => {
    const voice = voiceState();
    render(voice, {isSpeaking: true});
    expect(voice.ttsActiveRef.current).toBe(true);
    expect(voice.agentVoiceEndedAtRef.current).toBe(null);
    render(voice, {isSpeaking: false});
    const stoppedAt = voice.agentVoiceEndedAtRef.current;
    expect(stoppedAt).toBe(Date.now());
    jest.advanceTimersByTime(5000);
    render(voice, {});                            // a later render, still quiet
    expect(voice.agentVoiceEndedAtRef.current).toBe(stoppedAt);
    expect(voice.ttsActiveRef.current).toBe(false);
  });
});
