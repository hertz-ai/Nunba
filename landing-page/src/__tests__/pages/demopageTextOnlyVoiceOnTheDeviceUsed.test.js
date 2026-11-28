/**
 * An agent's message that arrives as text alone is spoken only on the device
 * that started its turn.
 *
 * Live on the installed build, 2026-11-24 16:44 IST (Cafe Flow, a turn sent
 * from the tablet, request 0507de59): the agent sent its question twice
 * during the turn (request ids 0507de59-...-intermediate-3185 and -6320).
 * Each arrived on the desktop page as text with no audio, and the page spoke
 * it itself (Piper synthesised at 16:44:25 and 16:44:56).  The tablet's clip
 * of the turn came at 16:45:00 and the desktop rightly skipped it
 * ("[TTS] Skipped another turn's clip"), so the owner heard the desktop say
 * it first and the tablet say it late.  The rule for pushed clips (owner
 * 2026-11-23, "Only the device you used", ttsGuards.shouldPlayPushedClip)
 * was never applied to the page's own speaking of a text-only message.
 *
 * Demopage's provider tree is not mountable here, so the text-only branch of
 * its pushed-message handler is cut out of Demopage.js and run as written,
 * with the real guard and the real turn record; what is counted is the
 * page's tts.speak calls.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');
const BRANCH = (() => {
  const start = '      if (hasText && !hasAudio) {';
  const a = SRC.indexOf(start);
  if (a < 0) throw new Error('the text-only branch was not found in Demopage.js');
  const b = SRC.indexOf('      if (hasAudio) {', a);
  if (b < 0) throw new Error('the end of the text-only branch was not found');
  return SRC.slice(a, b);
})();

const guards = require('../../utils/ttsGuards');
const {rememberOwnTurn} = require('../../utils/chatRetry');
const {repeatsShownMessage} = require('../../constants/chatBubble');
const clipPlayer = require('../../services/ttsClipPlayer');

const TABLET_TURN = '0507de59-6788-4b36-8a07-7a1ffed3c5f3';

function page({currentTurn = null, ttsEnabled = true, element = audioElement()} = {}) {
  const spoken = [];
  const shown = [];
  const timers = [];
  const scope = {
    claimForPage: clipPlayer.claimForPage,
    queueForTurn: clipPlayer.queueForTurn,
    getTtsAudioElement: () => element,
    speaksPushedText: guards.speaksPushedText,
    repeatsShownMessage, // the branch shows a message once (demopageReplyShowsOnce)
    ttsEnabled,
    tts: {isAvailable: true, speak: (text) => { spoken.push(text); return Promise.resolve(); }},
    requestIdRef: {current: currentTurn},
    setMessages: (fn) => { shown.push(...fn([]).map((m) => m.content)); },
    setAnimatingMessageIndex: () => {},
    setShouldScroll: () => {},
    setDuration: () => {},
    setWaitingText: () => {},
    setLoading: () => {},
    setIsRequestInFlight: () => {},
    // The page's audio race: callbacks run when the test says the race ended.
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout: () => {},
  };
  const names = Object.keys(scope);
  // eslint-disable-next-line no-new-func
  const run = new Function(...names, 'parsed', 'extractedText', 'hasText', 'hasAudio', BRANCH);
  return {
    spoken,
    shown,
    receive(requestId, text, extra = {}) {
      run(...names.map((n) => scope[n]), {request_id: requestId, text: [text], ...extra}, text, true, false);
    },
    raceEnds() {
      timers.splice(0).forEach((fn) => fn());
    },
  };
}

beforeEach(() => {
  try { window.localStorage.clear(); } catch (_) { /* no storage */ }
  clipPlayer._resetTtsClipPlayer();
});

function audioElement() {
  return {
    src: '', paused: true, ended: false, onended: null, onerror: null, played: [],
    play() { this.paused = false; this.ended = false; this.played.push(this.src); return Promise.resolve(); },
    finish() { this.paused = true; this.ended = true; if (this.onended) this.onended(); },
  };
}

describe("a text-only agent message is spoken only where its turn started", () => {
  test("the tablet turn's mid-turn sends are shown on the desktop but not spoken there", () => {
    const desktop = page({currentTurn: null});
    desktop.receive(`${TABLET_TURN}-intermediate-3185`, 'Hello! Thank you for choosing Cafe Flow.');
    desktop.receive(`${TABLET_TURN}-intermediate-6320`, 'Hello! Thank you for choosing Cafe Flow.');
    expect(desktop.spoken).toEqual([]);
    expect(desktop.shown).toHaveLength(2);
  });

  test('a send of a turn this page started is spoken here', () => {
    rememberOwnTurn('desk-turn-1');
    const desktop = page({currentTurn: 'desk-turn-1'});
    desktop.receive('desk-turn-1-intermediate-1', 'Which drink would you like?');
    expect(desktop.spoken).toEqual(['Which drink would you like?']);
  });

  test("another device's turn is not spoken even while this page is on a turn of its own", () => {
    rememberOwnTurn('desk-turn-2');
    const desktop = page({currentTurn: 'desk-turn-2'});
    desktop.receive(`${TABLET_TURN}-intermediate-3185`, 'Hello!');
    expect(desktop.spoken).toEqual([]);
  });

  test("a message of no person's turn is spoken as before", () => {
    const desktop = page({currentTurn: null});
    desktop.receive(undefined, 'Good morning!');
    expect(desktop.spoken).toEqual(['Good morning!']);
  });

  test('with the speaker off nothing is spoken, as before', () => {
    rememberOwnTurn('desk-turn-3');
    const desktop = page({currentTurn: 'desk-turn-3', ttsEnabled: false});
    desktop.receive('desk-turn-3-intermediate-1', 'Hi');
    expect(desktop.spoken).toEqual([]);
  });

  test("a background agent's message is spoken as before (proactive speech unchanged)", () => {
    // rv_5c8e Finding 1: with the device rule alone no device spoke a
    // reminder at all (the tablet plays clips only).  The owner, 2026-11-23:
    // proactive speech with no person's turn is unchanged.
    rememberOwnTurn('desk-turn-5');
    for (const current of [null, 'desk-turn-5']) {
      const desktop = page({currentTurn: current});
      desktop.receive('daemon_goal_7', 'Time for your practice!');
      desktop.receive('daemon_goal_7-intermediate-2', 'Shall we start?');
      expect(desktop.spoken).toEqual(['Time for your practice!', 'Shall we start?']);
    }
  });
});

describe('one rule for both kinds of voice', () => {
  test("a pushed clip and a text-only message of a person's turn get the same answer", () => {
    rememberOwnTurn('desk-turn-4');
    for (const [id, current] of [
      [`${TABLET_TURN}-intermediate-1`, null],
      [`${TABLET_TURN}-intermediate-1`, 'desk-turn-4'],
      ['desk-turn-4-intermediate-2', 'desk-turn-4'],
      ['', null],
    ]) {
      const clip = guards.shouldPlayPushedClip({generated_audio_url: '/tts/audio/x.wav', request_id: id}, current, true);
      expect(guards.speaksPushedText(id, current)).toBe(clip);
    }
  });

  test("a background turn's clip still never plays; its text is spoken, both as before", () => {
    const clip = guards.shouldPlayPushedClip(
      {generated_audio_url: '/tts/audio/x.wav', request_id: 'daemon_goal_7'}, 'desk-turn-4', true);
    expect(clip).toBe(false);
    expect(guards.speaksPushedText('daemon_goal_7', 'desk-turn-4')).toBe(true);
  });
});

// Owner, 2026-11-24: "a text reaching the tablet shd also get the audio
// delivered as and when it was fanned out isnt?"; 2026-11-27, after a demo
// turn whose questions were shown and never heard: "only final reply is ever
// spoke wtf we have send user to message as a tool, why are they not spoken".
// HARTOS now speaks each send as it is sent, its own clip under the send's id,
// and marks the message `voiced`.  The page leaves such a message to that clip
// (played by shouldPlayPushedClip, the same device rule), so it is heard once.
describe('a message HARTOS speaks itself is left to its clip', () => {
  test('a voiced send of a turn this page started is shown, not spoken by the page', () => {
    rememberOwnTurn('desk-turn-6');
    const desktop = page({currentTurn: 'desk-turn-6'});
    desktop.receive('desk-turn-6-intermediate-1', 'What is her name?', {voiced: true});
    expect(desktop.spoken).toEqual([]);
    expect(desktop.shown).toEqual(['What is her name?']);
    const clip = guards.shouldPlayPushedClip(
      {generated_audio_url: '/tts/audio/q.wav', request_id: 'desk-turn-6-intermediate-1'},
      'desk-turn-6', true);
    expect(clip).toBe(true);
  });

  test('a send without the mark is spoken by the page as before', () => {
    rememberOwnTurn('desk-turn-7');
    const desktop = page({currentTurn: 'desk-turn-7'});
    desktop.receive('desk-turn-7-intermediate-1', 'What is her name?', {voiced: false});
    desktop.receive('desk-turn-7-intermediate-2', 'And her age?');
    expect(desktop.spoken).toEqual(['What is her name?', 'And her age?']);
  });
});

// rv_voice gap (c): HARTOS marked the message voiced, then its clip never came
// (the synthesis failed on the TTS worker), and nobody heard it.  The page
// waits the same audio race; no clip by then, it says the message itself, and
// a clip that comes later is not played, so it is heard once either way.
describe('a voiced message whose clip never comes is said by the page', () => {
  test('no clip by the end of the race: the page says it, once', () => {
    rememberOwnTurn('desk-turn-8');
    const desktop = page({currentTurn: 'desk-turn-8'});
    desktop.receive('desk-turn-8-intermediate-1', 'What is her name?', {voiced: true});
    expect(desktop.spoken).toEqual([]);
    desktop.raceEnds();
    expect(desktop.spoken).toEqual(['What is her name?']);
    expect(clipPlayer.playTtsClip(audioElement(), '/tts/audio/q.wav',
      {requestId: 'desk-turn-8-intermediate-1'})).toBe('spoken-by-page');
  });

  test('its clip came: the page leaves it to the clip', () => {
    rememberOwnTurn('desk-turn-9');
    const desktop = page({currentTurn: 'desk-turn-9'});
    desktop.receive('desk-turn-9-intermediate-1', 'What is her name?', {voiced: true});
    expect(clipPlayer.playTtsClip(audioElement(), '/tts/audio/q.wav',
      {requestId: 'desk-turn-9-intermediate-1'})).toBe('played');
    desktop.raceEnds();
    expect(desktop.spoken).toEqual([]);
  });

  test("another device's voiced message is still not said here", () => {
    rememberOwnTurn('desk-turn-10');
    const desktop = page({currentTurn: 'desk-turn-10'});
    desktop.receive(`${TABLET_TURN}-intermediate-1`, 'What is her name?', {voiced: true});
    desktop.raceEnds();
    expect(desktop.spoken).toEqual([]);
  });
});

// rv_voice R3-2: two sends back to back.  The race starts when the text comes,
// but send 2's clip waits behind send 1's synthesis, so past the race the page
// claimed send 2 while send 1's clip played and its own speech set the shared
// element's src: send 1 was cut mid-sentence.  The page's saying now waits its
// place in the turn.
describe("the page's own saying never cuts a clip of its turn", () => {
  test("send 2's race ends while send 1 is heard: it waits, its clip comes, the page says nothing", () => {
    rememberOwnTurn('desk-turn-11');
    const el = audioElement();
    const desktop = page({currentTurn: 'desk-turn-11', element: el});
    clipPlayer.playTtsClip(el, '/tts/audio/a1.wav', {requestId: 'desk-turn-11-intermediate-1'});
    desktop.receive('desk-turn-11-intermediate-2', 'And her age?', {voiced: true});
    desktop.raceEnds();
    expect(desktop.spoken).toEqual([]);
    expect(clipPlayer.playTtsClip(el, '/tts/audio/a2.wav',
      {requestId: 'desk-turn-11-intermediate-2'})).toBe('queued');
    el.finish();
    expect(desktop.spoken).toEqual([]);
    expect(el.played).toEqual(['/tts/audio/a1.wav', '/tts/audio/a2.wav']);
  });

  test("send 2's clip never comes: the page says it after send 1 ends, not over it", () => {
    rememberOwnTurn('desk-turn-12');
    const el = audioElement();
    const desktop = page({currentTurn: 'desk-turn-12', element: el});
    clipPlayer.playTtsClip(el, '/tts/audio/b1.wav', {requestId: 'desk-turn-12-intermediate-1'});
    desktop.receive('desk-turn-12-intermediate-2', 'And her age?', {voiced: true});
    desktop.raceEnds();
    expect(desktop.spoken).toEqual([]);
    el.finish();
    expect(desktop.spoken).toEqual(['And her age?']);
    expect(el.played).toEqual(['/tts/audio/b1.wav']);
  });
});
