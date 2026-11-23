/**
 * A turn's voice plays only on the device that started it.
 *
 * Owner 2026-11-23, asked which device speaks a reply when the tablet and
 * the desktop are both open: "Only the device you used".  HARTOS publishes a
 * turn's spoken reply to every device of the person, tagged with the turn's
 * request id (hart_intelligence_entry._tts_synthesize_and_publish, from
 * _chat_reply, with the id the client sent).  Measured on the installed
 * build at ~18:30 IST: the desktop page logged "[TTS] Clip played" for the
 * tablet's turns bc4ed03d, f25d90c5 and e90d9af5, so with three devices and
 * the desktop in the room the desktop spoke every child turn.  The Android
 * half is RN cc2dd6161 (ChatBubble.playsVoiceOf); this is the page's.
 *
 * The rule (utils/ttsGuards.shouldPlayPushedClip, mirroring playsVoiceOf):
 * a clip whose turn (its request id cut at '-intermediate') is a person's
 * turn plays only when this page started that turn (utils/chatRetry
 * turnsStartedHere: every turn Demopage or the Social panel sent, every ask
 * this window answered, and the desktop's turns sent, kept across a reload
 * as RN keeps keyID).  A clip of no person's turn ('', None, 'null', undefined)
 * plays as before; a background agent's (daemon_) is skipped as before.  The
 * reply's text still shows on every device: only the voice is gated.
 *
 * Demopage's provider tree is not mountable here, so its pushed-clip player
 * (playPushedTts) is cut out of Demopage.js and run as written with the real
 * guard, turn record and clip player, and the "[TTS] Clip played" log line,
 * the live baseline, is what is counted.
 */
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

function desktopPage({turn = null} = {}) {
  const logs = [];
  const el = {
    loads: [], set src(v) { this.loads.push(v); }, get src() { return ''; },
    play() { return Promise.resolve(); },
  };
  const scope = {
    ...require('../../utils/ttsGuards'),
    ...require('../../services/ttsClipPlayer'),
    getTtsAudioElement: () => el,
    useCallback: (fn) => fn,
    console: {log: (...a) => logs.push(a.join(' ')), warn: () => {}, error: () => {}},
    document: {addEventListener: () => {}, removeEventListener: () => {}},
    requestIdRef: {current: turn},
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
    played: () => logs.filter((l) => l.startsWith('[TTS] Clip played')).length,
    loads: () => el.loads,
  };
}

const clip = (requestId, url) => ({action: 'TTS', generated_audio_url: url, request_id: requestId});

beforeEach(() => {
  jest.resetModules();
  localStorage.clear();
});

describe('only the device you used speaks a turn', () => {
  test('the tablet\'s turns logged as played on the desktop page are not played here', () => {
    const page = desktopPage({turn: null});
    ['bc4ed03d', 'f25d90c5', 'e90d9af5'].forEach((rid, i) => {
      page.playPushedTts(clip(rid, `/tts/audio/tab${i}.wav`));
    });
    expect(page.played()).toBe(0);
    expect(page.loads()).toEqual([]);
  });

  test('a desktop turn plays once (both transports deliver it)', () => {
    const {startTurn} = require('../../utils/chatRetry');
    const ref = {current: null};
    const rid = startTurn(ref);
    const page = desktopPage({turn: ref.current});
    page.playPushedTts(clip(rid, '/tts/audio/d0.wav'));
    page.playPushedTts(clip(rid, '/tts/audio/d0.wav'));
    expect(page.played()).toBe(1);
  });

  test('a tablet turn is not played even while the page is on a turn of its own', () => {
    const {startTurn} = require('../../utils/chatRetry');
    const ref = {current: null};
    startTurn(ref);
    const page = desktopPage({turn: ref.current});
    page.playPushedTts(clip('f25d90c5', '/tts/audio/tab.wav'));
    expect(page.played()).toBe(0);
  });

  test('a clip of no person\'s turn plays as before (proactive speech)', () => {
    const page = desktopPage({turn: null});
    page.playPushedTts(clip('', '/tts/audio/p1.wav'));
    page.playPushedTts(clip(undefined, '/tts/audio/p2.wav'));
    page.playPushedTts(clip('None', '/tts/audio/p3.wav'));
    page.playPushedTts(clip('null', '/tts/audio/p4.wav'));
    expect(page.played()).toBe(4);
  });

  test('a background agent\'s clip is skipped as before', () => {
    const page = desktopPage({turn: null});
    page.playPushedTts(clip('daemon_goal_1', '/tts/audio/g.wav'));
    expect(page.played()).toBe(0);
  });

  test('a reload mid-turn keeps the last turn sent: its clip still plays on the reloaded page', () => {
    const {startTurn} = require('../../utils/chatRetry');
    const rid = startTurn({current: null});
    jest.resetModules();                       // a new page: the module's memory is gone
    const reloaded = desktopPage({turn: null});
    reloaded.playPushedTts(clip(rid, '/tts/audio/d1.wav'));
    expect(reloaded.played()).toBe(1);
  });

  test('a turn of the agent\'s ask answered in this window plays here', () => {
    const {rememberOwnTurn} = require('../../utils/chatRetry');
    rememberOwnTurn('a1b2c3d4e5f6', {last: false});
    const page = desktopPage({turn: null});
    page.playPushedTts(clip('a1b2c3d4e5f6', '/tts/audio/ask.wav'));
    expect(page.played()).toBe(1);
  });

  test('a send of a turn this page started is its turn (cut at -intermediate)', () => {
    const {shouldPlayPushedClip} = require('../../utils/ttsGuards');
    const {startTurn} = require('../../utils/chatRetry');
    const rid = startTurn({current: null});
    const data = (r) => ({generated_audio_url: '/x.wav', request_id: r});
    expect(shouldPlayPushedClip(data(`${rid}-intermediate-4821`), null, true)).toBe(true);
    expect(shouldPlayPushedClip(data('f25d90c5-intermediate'), null, true)).toBe(false);
  });
});

describe('the turn record', () => {
  test('startTurn, the page\'s one minting of a turn, records it, and the turns sent survive a reload', () => {
    const {startTurn, turnsStartedHere} = require('../../utils/chatRetry');
    const a = startTurn({current: null});
    const b = startTurn({current: null});
    expect([...turnsStartedHere()]).toEqual(expect.arrayContaining([a, b]));
    jest.resetModules();
    const fresh = require('../../utils/chatRetry');
    // Every turn sent, not only the last (review of 79df4713 + ac152433:
    // one slot silenced the earlier turn's reply after a reload).
    expect([...fresh.turnsStartedHere()]).toEqual([a, b]);
    expect(fresh.lastTurnStartedHere()).toBe(b);
  });

  test('a storage that throws leaves the page working on the turns it holds', () => {
    const {startTurn, turnsStartedHere} = require('../../utils/chatRetry');
    const setItem = Storage.prototype.setItem;
    const getItem = Storage.prototype.getItem;
    Storage.prototype.setItem = () => { throw new Error('blocked'); };
    Storage.prototype.getItem = () => { throw new Error('blocked'); };
    try {
      const a = startTurn({current: null});
      expect(turnsStartedHere().has(a)).toBe(true);
    } finally {
      Storage.prototype.setItem = setItem;
      Storage.prototype.getItem = getItem;
    }
  });
});

describe('every surface of the page records its own turns', () => {
  test('the Social panel records the turn it sends; an ask answered here is recorded', () => {
    const PROVIDER = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'Social',
      'shared', 'NunbaChat', 'NunbaChatProvider.jsx'), 'utf8');
    const OVERLAY = fs.readFileSync(path.join(__dirname, '..', '..', 'components',
      'AgentOverlay', 'AgentOverlay.jsx'), 'utf8');
    const send = PROVIDER.indexOf('const msgId = makeMsgId();');
    expect(PROVIDER.indexOf('rememberOwnTurn(msgId);', send)).toBeGreaterThan(send);
    const answer = OVERLAY.indexOf('async function answerAsk(askId, answer) {');
    expect(OVERLAY.slice(answer, answer + 400)).toMatch(/rememberOwnTurn\(askId, \{ last: false \}\)/);
  });
});
