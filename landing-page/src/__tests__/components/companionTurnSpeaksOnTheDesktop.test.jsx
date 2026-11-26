/**
 * A quick prompt typed into the floating companion is a turn of this
 * desktop, so its reply's voice plays on the desktop: once.
 *
 * Owner 2026-11-23: "Only the device you used".  HARTOS publishes a turn's
 * spoken reply to every device of the person, tagged with the turn's request
 * id, and the desktop page plays only the turns it started
 * (utils/ttsGuards.shouldPlayPushedClip, Nunba 79df4713).  The companion's
 * quick prompt (VoiceOrbPage's InputBar) sent /chat with no request id: the
 * server minted one, the clip carried it, no window of the desktop knew it,
 * and the desktop's own companion turn went silent.
 *
 * Two windows of one app: the companion (/voice-orb) sends and plays no
 * audio; the main window (Demopage) plays the clip.  They are two JavaScript
 * realms that share one WebView2 profile and one origin
 * (app.py: webview.start(storage_path=..., private_mode=False); both load
 * http://localhost:<port>), so what they share is localStorage and nothing
 * else.  Here the companion is the real VoiceOrbPage, driven through its
 * quick-prompt bar, and the main window is Demopage's pushed-clip player
 * (playPushedTts) cut out of Demopage.js and run with its own copy of the
 * guard, the turn record and the clip player (jest.isolateModules): only
 * localStorage carries the companion's turn across, as in the app.  The
 * "[TTS] Clip played" log line, the live baseline, is what is counted.
 */
import {act, fireEvent, render, screen} from '@testing-library/react';
import React from 'react';

jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {on: () => () => {}, off: () => {}},
}));
jest.mock('../../components/VoiceVisualizer', () => ({
  __esModule: true,
  default: () => <div data-testid="viz" />,
}));
jest.mock('../../config/apiBase', () => ({API_BASE_URL: ''}));
jest.mock('../../constants/events', () => ({NUNBA_CAMERA_CONSENT: 'evt'}));
jest.mock('qrcode.react', () => ({QRCodeSVG: () => null}));
jest.mock('../../services/socialApi', () => ({
  consentApi: {grant: jest.fn(() => Promise.resolve({})), decline: jest.fn(() => Promise.resolve({}))},
  notificationsApi: {markRead: jest.fn(() => Promise.resolve({}))},
  dashboardApi: {steer: jest.fn(() => Promise.resolve({success: true}))},
}));

// eslint-disable-next-line import/first
import VoiceOrbPage from '../../components/VoiceOrb/VoiceOrbPage';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');
const PLAYER = (() => {
  const a = SRC.indexOf('const playPushedTts = useCallback(');
  if (a < 0) throw new Error('playPushedTts not found');
  const end = '\n  }, []);';
  return SRC.slice(a, SRC.indexOf(end, a) + end.length);
})();

const bindable = (scope) => Object.keys(scope)
  .filter((n) => n !== 'default' && /^[A-Za-z_$][\w$]*$/.test(n));

// The main window: its own module memory, its own current turn.
function desktopWindow() {
  const logs = [];
  const el = {
    loads: [], set src(v) { this.loads.push(v); }, get src() { return ''; },
    play() { return Promise.resolve(); },
  };
  let mods;
  jest.isolateModules(() => {
    mods = {
      guards: require('../../utils/ttsGuards'),
      player: require('../../services/ttsClipPlayer'),
      retry: require('../../utils/chatRetry'),
    };
  });
  const requestIdRef = {current: null};
  const scope = {
    stopLiveAvatar: () => false, // utils/liveAvatar: the page's cut code stops a live avatar reply (none here)
    ...mods.guards,
    ...mods.player,
    getTtsAudioElement: () => el,
    useCallback: (fn) => fn,
    console: {log: (...a) => logs.push(a.join(' ')), warn: () => {}, error: () => {}},
    document: {addEventListener: () => {}, removeEventListener: () => {}},
    requestIdRef,
    ttsEnabledRef: {current: true},
    audioRef: {current: null},
    setIsPlayingResponse: () => {},
  };
  const names = bindable(scope);
  // eslint-disable-next-line no-new-func
  const playPushedTts = new Function(...names, `${PLAYER}\nreturn playPushedTts;`)(
    ...names.map((n) => scope[n]));
  return {
    playPushedTts,
    // A send in the main window (Demopage.handleSend's startTurn).
    send: () => mods.retry.startTurn(requestIdRef),
    played: () => logs.filter((l) => l.startsWith('[TTS] Clip played')).length,
  };
}

// The id HARTOS tags the turn's clip with: the client's own when it sent
// one in the form a client may name a turn by (core.phone_chat
// settle_request_id: [A-Za-z0-9_-]{8,64}), else a fresh one of its own.
let minted = 0;
const CLIENT_ID = /^[A-Za-z0-9_-]{8,64}$/;
const turnOfClip = (sent) => (
  typeof sent === 'string' && CLIENT_ID.test(sent) ? sent : `${Date.now()}${minted++}`);
const clip = (requestId, url) => ({action: 'TTS', generated_audio_url: url, request_id: requestId});

beforeAll(() => {
  global.Audio = class {
    set preload(v) {}
    set src(v) {}
    set onloadedmetadata(v) {}
    set onerror(v) {}
  };
});

beforeEach(() => {
  localStorage.clear();
  delete window.pywebview;
  global.fetch = jest.fn(() => Promise.resolve({
    status: 200, json: () => Promise.resolve({success: true, response: 'ok'}),
  }));
});

async function typeAndSend(text) {
  fireEvent.change(screen.getByLabelText('Quick prompt'), {target: {value: text}});
  await act(async () => {
    fireEvent.click(screen.getByLabelText('Send prompt'));
  });
}

// The request id of the companion's one /chat send, by the bridge or by fetch.
function companionBridge() {
  const onPrompt = jest.fn(() => Promise.resolve('ok'));
  window.pywebview = {api: {on_companion_prompt: onPrompt, on_companion_presence: jest.fn()}};
  return () => onPrompt.mock.calls.map((c) => (c[1] || {}).request_id);
}
function companionFetch() {
  return () => global.fetch.mock.calls
    .filter((c) => String(c[0]) === '/chat')
    .map((c) => JSON.parse(c[1].body).request_id);
}

describe('the companion\'s quick prompt is a turn of this desktop', () => {
  test.each([
    ['through the pywebview bridge', companionBridge],
    ['through fetch, with no bridge', companionFetch],
  ])('%s: it names its turn, and the clip plays once on the main window', async (_l, via) => {
    const sentIds = via();
    const desktop = desktopWindow();
    render(<VoiceOrbPage />);
    await typeAndSend('what is the weather?');

    const sent = sentIds();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatch(CLIENT_ID);
    const rid = turnOfClip(sent[0]);
    desktop.playPushedTts(clip(rid, '/tts/audio/c0.wav'));     // WAMP
    desktop.playPushedTts(clip(rid, '/tts/audio/c0.wav'));     // and SSE
    expect(desktop.played()).toBe(1);
  });

  test.each([
    ['through the pywebview bridge', companionBridge],
    ['through fetch, with no bridge', companionFetch],
  ])('%s: it plays even while the main window is on an earlier turn of its own', async (_l, via) => {
    const sentIds = via();
    const desktop = desktopWindow();
    desktop.send();                                            // typed in the main window first
    render(<VoiceOrbPage />);
    await typeAndSend('and tomorrow?');

    const rid = turnOfClip(sentIds()[0]);
    desktop.playPushedTts(clip(rid, '/tts/audio/c1.wav'));
    desktop.playPushedTts(clip(`${rid}-intermediate-7`, '/tts/audio/c1b.wav'));
    expect(desktop.played()).toBe(2);
  });

  test('each quick prompt is a turn of its own', async () => {
    const sentIds = companionBridge();
    render(<VoiceOrbPage />);
    await typeAndSend('one');
    await typeAndSend('two');
    const [a, b] = sentIds();
    expect(a).toMatch(CLIENT_ID);
    expect(b).toMatch(CLIENT_ID);
    expect(a).not.toBe(b);
  });

  test('a turn typed in the main window after the companion\'s: the companion\'s late clip does not speak over it (case 3)', async () => {
    const sentIds = companionBridge();
    const desktop = desktopWindow();
    render(<VoiceOrbPage />);
    await typeAndSend('first, from the companion');
    const companionTurn = turnOfClip(sentIds()[0]);
    const pageTurn = desktop.send();
    desktop.playPushedTts(clip(companionTurn, '/tts/audio/late.wav'));
    desktop.playPushedTts(clip(pageTurn, '/tts/audio/now.wav'));
    expect(desktop.played()).toBe(1);
  });

  test('control: another device\'s turn still does not play on the desktop after a companion turn', async () => {
    companionBridge();
    const desktop = desktopWindow();
    render(<VoiceOrbPage />);
    await typeAndSend('hello');
    desktop.playPushedTts(clip('f25d90c5', '/tts/audio/tablet.wav'));
    desktop.send();
    desktop.playPushedTts(clip('bc4ed03d', '/tts/audio/tablet2.wav'));
    expect(desktop.played()).toBe(0);
  });
});

// Review of 79df4713 + ac152433 (REJECTED): the desktop kept one turn in
// localStorage, the last sent, so an earlier turn of the desktop that had
// not been spoken yet went silent where origin/main played it.  The desktop
// keeps the turns it sent as a bounded list, which every window and a
// reload read.
describe('every turn this desktop sent is kept, not only the last', () => {
  test('case 1: the page idle, two quick prompts, the first one\'s clip lands after the second was sent: it plays', async () => {
    const sentIds = companionBridge();
    const desktop = desktopWindow();
    render(<VoiceOrbPage />);
    await typeAndSend('first');
    await typeAndSend('second');
    const [c1, c2] = sentIds().map(turnOfClip);
    desktop.playPushedTts(clip(c1, '/tts/audio/c1.wav'));
    desktop.playPushedTts(clip(c2, '/tts/audio/c2.wav'));
    expect(desktop.played()).toBe(2);
  });

  test('case 2: the page sends two turns, reloads, then the first one\'s clip lands: it plays', () => {
    const before = desktopWindow();
    const m1 = before.send();
    before.send();
    const reloaded = desktopWindow();          // a new realm: no memory, no current turn
    reloaded.playPushedTts(clip(m1, '/tts/audio/m1.wav'));
    expect(reloaded.played()).toBe(1);
  });

  test('the list is bounded: the newest 50 turns sent, the oldest dropped', () => {
    const before = desktopWindow();
    const ids = Array.from({length: 55}, () => before.send());
    const {SENT_TURNS_KEY} = require('../../utils/chatRetry');
    expect(JSON.parse(localStorage.getItem(SENT_TURNS_KEY))).toEqual(ids.slice(-50));
    const reloaded = desktopWindow();
    reloaded.playPushedTts(clip(ids[0], '/tts/audio/a0.wav'));    // dropped
    reloaded.playPushedTts(clip(ids[5], '/tts/audio/a5.wav'));
    reloaded.playPushedTts(clip(ids[54], '/tts/audio/a54.wav'));
    expect(reloaded.played()).toBe(2);
  });

  test('a store that throws on every read and write: the page still speaks its own turn, and only its own', () => {
    const setItem = Storage.prototype.setItem;
    const getItem = Storage.prototype.getItem;
    Storage.prototype.setItem = () => { throw new Error('blocked'); };
    Storage.prototype.getItem = () => { throw new Error('blocked'); };
    try {
      const desktop = desktopWindow();
      const m1 = desktop.send();
      desktop.playPushedTts(clip(m1, '/tts/audio/m1.wav'));
      desktop.playPushedTts(clip('f25d90c5', '/tts/audio/tablet.wav'));
      expect(desktop.played()).toBe(1);
    } finally {
      Storage.prototype.setItem = setItem;
      Storage.prototype.getItem = getItem;
    }
  });

  test('a store holding something that is not a list of turns is read as no turns', () => {
    const {SENT_TURNS_KEY} = require('../../utils/chatRetry');
    ['{not json', '"msg_1_abc"', '{"a":1}', '[1, null, "  "]'].forEach((junk) => {
      localStorage.setItem(String(SENT_TURNS_KEY), junk);
      const desktop = desktopWindow();
      desktop.playPushedTts(clip('f25d90c5', '/tts/audio/tablet.wav'));
      const m1 = desktop.send();
      desktop.playPushedTts(clip(m1, `/tts/audio/${junk.length}.wav`));
      expect(desktop.played()).toBe(1);
    });
  });
});

describe('every page-side chat send names its turn', () => {
  // Every chatApi.chat call of the page sends a request id and records the
  // turn (chatRetry.startTurn, or makeMsgId + rememberOwnTurn in the Social
  // panel): a send without one gets a server-minted id no window knows, and
  // its reply is never spoken on the device that sent it.
  const read = (...p) => fs.readFileSync(path.join(__dirname, '..', '..', ...p), 'utf8');
  const callsOf = (src) => {
    const out = [];
    let i = src.indexOf('chatApi.chat({');
    while (i >= 0) {
      let depth = 0;
      let j = src.indexOf('{', i);
      for (; j < src.length; j += 1) {
        if (src[j] === '{') depth += 1;
        else if (src[j] === '}') { depth -= 1; if (depth === 0) break; }
      }
      out.push(src.slice(i, j + 1));
      i = src.indexOf('chatApi.chat({', j);
    }
    return out;
  };

  test.each([
    [['pages', 'Demopage.js'], 4],
    [['components', 'Social', 'shared', 'NunbaChat', 'NunbaChatProvider.jsx'], 1],
  ])('%j: each chatApi.chat call sends request_id', (file, count) => {
    const calls = callsOf(read(...file));
    expect(calls).toHaveLength(count);
    calls.forEach((call) => expect(call).toMatch(/\brequest_id:/));
  });

  test('each of Demopage\'s sends starts its turn as handleSend does (chatRetry.startTurn)', () => {
    const src = read('pages', 'Demopage.js');
    callsOf(src).forEach((call) => {
      const id = (call.match(/\brequest_id: (\w+)/) || [])[1];
      expect(id).toBeTruthy();
      expect(src).toContain(`const ${id} = startTurn(requestIdRef);`);
    });
  });
});
