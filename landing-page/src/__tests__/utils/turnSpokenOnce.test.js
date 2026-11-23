/**
 * The rules under "one turn is heard once, and shown once"
 * (pages/demopageTurnSpokenOnce.test.js runs them inside Demopage):
 *
 *   chatBubble.turnIdOf / isTurnSend  the turn a request id names, cut as
 *                                     HARTOS cuts it (crossbar_publish
 *                                     ._note_turn_send: partition on
 *                                     '-intermediate', a turn in front)
 *   chatBubble.isShownInTurn          the same words, the same turn
 *   ttsClipPlayer.claimSpeech         the window's one record of what it said
 *   ttsGuards.isSpokenByTurnClip      a send the turn's clip says
 *   ttsGuards.claimLocalReplySpeech   a reply spoken here vs a clip of its turn
 */
import {isShownInTurn, isTurnSend, turnIdOf, TURN_SEND_MARK} from '../../constants/chatBubble';
import {claimSpeech, playTtsClip, _resetTtsClipPlayer} from '../../services/ttsClipPlayer';
import {claimLocalReplySpeech, isSpokenByTurnClip, shouldSpeakPushedText} from '../../utils/ttsGuards';

function fakeAudio() {
  return {
    loads: [],
    set src(v) { this.loads.push(v); },
    get src() { return this.loads[this.loads.length - 1] || ''; },
    play() { return Promise.resolve(); },
  };
}

beforeEach(() => _resetTtsClipPlayer());

describe('the turn a request id names', () => {
  test.each([
    ['msg_1_ab-intermediate', 'msg_1_ab', true],          // CREATE
    ['msg_1_ab-intermediate-3', 'msg_1_ab', true],        // REUSE
    ['daemon_g1-intermediate', 'daemon_g1', true],        // a goal turn's send
    ['msg_1_ab', 'msg_1_ab', false],                      // the turn itself
    ['-intermediate', '', false],                         // no turn in front
    ['', '', false],
    [undefined, '', false],
    [42, '', false],
  ])('%p -> turn %p, send %p', (rid, turn, sent) => {
    expect(turnIdOf(rid)).toBe(turn);
    expect(isTurnSend(rid)).toBe(sent);
  });

  test('the mark is HARTOS\'s', () => {
    expect(TURN_SEND_MARK).toBe('-intermediate');
  });
});

describe('the same words, the same turn', () => {
  const rows = [
    {type: 'user', content: 'Hi', turnId: 't1'},
    {type: 'assistant', content: 'Well  done!\n', turnId: 't1'},
    {type: 'assistant', content: 'No turn here'},
  ];

  test('matched on turn, type and words (whitespace aside)', () => {
    expect(isShownInTurn(rows, {type: 'assistant', content: 'Well done!', turnId: 't1'})).toBe(true);
  });

  test('never across turns, never for a row with no turn, never on other words', () => {
    expect(isShownInTurn(rows, {type: 'assistant', content: 'Well done!', turnId: 't2'})).toBe(false);
    expect(isShownInTurn(rows, {type: 'assistant', content: 'No turn here'})).toBe(false);
    expect(isShownInTurn(rows, {type: 'assistant', content: 'No turn here', turnId: ''})).toBe(false);
    expect(isShownInTurn(rows, {type: 'assistant', content: 'Hi', turnId: 't1'})).toBe(false);
    expect(isShownInTurn(rows, {type: 'assistant', content: 'Well', turnId: 't1'})).toBe(false);
    expect(isShownInTurn(rows, {type: 'assistant', content: '  ', turnId: 't1'})).toBe(false);
  });
});

describe('what the window already said', () => {
  test('a key is said once inside the window, again after it', () => {
    expect(claimSpeech('msg:a', 1000)).toBe(true);
    expect(claimSpeech('msg:a', 2000)).toBe(false);
    expect(claimSpeech('msg:a', 1000 + 31000)).toBe(true);
  });

  test('an empty key is never recorded', () => {
    expect(claimSpeech('', 1000)).toBe(true);
    expect(claimSpeech('', 1000)).toBe(true);
  });

  test('a turn may have two clips (a draft\'s, then the expert reply\'s): both play', () => {
    const el = fakeAudio();
    expect(playTtsClip(el, '/tts/audio/draft.wav', {}, 1000, 't1')).toBe('played');
    expect(playTtsClip(el, '/tts/audio/expert.wav', {}, 2000, 't1')).toBe('played');
    expect(el.loads).toEqual(['/tts/audio/draft.wav', '/tts/audio/expert.wav']);
  });
});

describe('a send the turn\'s clip says', () => {
  test('a person\'s turn\'s sends; never a goal turn\'s, a turn\'s own id, or none', () => {
    expect(isSpokenByTurnClip('msg_1-intermediate')).toBe(true);
    expect(isSpokenByTurnClip('msg_1-intermediate-2')).toBe(true);
    expect(isSpokenByTurnClip('daemon_g1-intermediate')).toBe(false);
    expect(isSpokenByTurnClip('msg_1')).toBe(false);
    expect(isSpokenByTurnClip('')).toBe(false);
    expect(isSpokenByTurnClip(undefined)).toBe(false);
  });

  test('a pushed message is spoken once per window by its msg_id', () => {
    const msg = {text: ['Say ba.'], request_id: 'daemon_g1-intermediate', msg_id: 'm1'};
    expect(shouldSpeakPushedText(msg, 1000)).toBe(true);
    expect(shouldSpeakPushedText(msg, 1500)).toBe(false);
    expect(shouldSpeakPushedText({...msg, msg_id: 'm2'}, 1600)).toBe(true);
    expect(shouldSpeakPushedText({text: ['Hi']}, 1700)).toBe(true);
    expect(shouldSpeakPushedText({text: ['Hi']}, 1800)).toBe(true);
    expect(shouldSpeakPushedText(null)).toBe(false);
  });
});

describe('a reply spoken here and a clip of its turn', () => {
  test('the reply spoken here first: the turn\'s clip is not played after it', () => {
    const el = fakeAudio();
    expect(claimLocalReplySpeech('t1', 1000)).toBe(true);
    expect(playTtsClip(el, '/tts/audio/t1.wav', {}, 2000, 't1')).toBe('duplicate');
    expect(el.loads).toEqual([]);
  });

  test('the turn\'s clip first: the reply is not spoken here after it', () => {
    const el = fakeAudio();
    expect(playTtsClip(el, '/tts/audio/t1.wav', {}, 1000, 't1')).toBe('played');
    expect(claimLocalReplySpeech('t1', 2000)).toBe(false);
  });

  test('another turn is untouched either way', () => {
    const el = fakeAudio();
    claimLocalReplySpeech('t1', 1000);
    expect(playTtsClip(el, '/tts/audio/t2.wav', {}, 1500, 't2')).toBe('played');
    expect(claimLocalReplySpeech('t3', 1600)).toBe(true);
    expect(claimLocalReplySpeech('', 1700)).toBe(true);
  });
});
