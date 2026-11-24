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

const TABLET_TURN = '0507de59-6788-4b36-8a07-7a1ffed3c5f3';

function page({currentTurn = null, ttsEnabled = true} = {}) {
  const spoken = [];
  const shown = [];
  const scope = {
    speaksPushedText: guards.speaksPushedText,
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
    setTimeout: () => 0,
    clearTimeout: () => {},
  };
  const names = Object.keys(scope);
  // eslint-disable-next-line no-new-func
  const run = new Function(...names, 'parsed', 'extractedText', 'hasText', 'hasAudio', BRANCH);
  return {
    spoken,
    shown,
    receive(requestId, text) {
      run(...names.map((n) => scope[n]), {request_id: requestId, text: [text]}, text, true, false);
    },
  };
}

beforeEach(() => {
  try { window.localStorage.clear(); } catch (_) { /* no storage */ }
});

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
