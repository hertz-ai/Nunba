/**
 * The rules under "one turn is heard once, and shown once"
 * (pages/demopageTurnSpokenOnce.test.js runs them inside Demopage):
 *
 *   chatBubble.turnIdOf / isTurnSend  the turn a request id names, cut as
 *                                     HARTOS cuts it (crossbar_publish
 *                                     ._note_turn_send: partition on
 *                                     '-intermediate', a turn in front)
 *   chatBubble.isShownInTurn          a turn's reply and a send of it, same words
 *   ttsClipPlayer.claimSpeech         the window's one record of what it said
 *   ttsClipPlayer.clipKey             one clip, however its url is written
 *   ttsGuards.isSpokenByTurnClip      a send the server stamped turn_voiced
 *   ttsGuards.claimLocalReplySpeech   a reply spoken here vs a clip of its turn
 */
import {isShownInTurn, isTurnSend, turnIdOf, TURN_SEND_MARK} from '../../constants/chatBubble';
import {claimSpeech, clipKey, playTtsClip, _resetTtsClipPlayer} from '../../services/ttsClipPlayer';
import {claimLocalReplySpeech, isSendOfPendingTurn, isSpokenByTurnClip, shouldSpeakPushedText} from '../../utils/ttsGuards';

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

describe('a reply and a send of its turn with the same words', () => {
  const send = (extra = {}) => ({type: 'assistant', content: 'Well  done!\n', turnId: 't1',
    turnSend: true, ...extra});
  const reply = (extra = {}) => ({type: 'assistant', content: 'Well done!', turnId: 't1',
    turnReply: true, ...extra});

  test('the reply after a send of its turn repeats it (whitespace aside)', () => {
    expect(isShownInTurn([send()], reply())).toBe(true);
  });

  test('a send after the reply repeats it only when the server says it was sent in the turn', () => {
    expect(isShownInTurn([reply()], send({turnVoiced: true}))).toBe(true);
    expect(isShownInTurn([reply()], send())).toBe(false);
  });

  test('two sends never repeat each other, stamped or not', () => {
    expect(isShownInTurn([send()], send())).toBe(false);
    expect(isShownInTurn([send({turnVoiced: true})], send({turnVoiced: true}))).toBe(false);
  });

  test('never across turns, for a row with no turn, on other words or another type', () => {
    expect(isShownInTurn([send()], reply({turnId: 't2'}))).toBe(false);
    expect(isShownInTurn([send({turnId: undefined})], reply({turnId: undefined}))).toBe(false);
    expect(isShownInTurn([send()], reply({content: 'Well'}))).toBe(false);
    expect(isShownInTurn([send()], reply({content: '  '}))).toBe(false);
    expect(isShownInTurn([send({type: 'user'})], reply())).toBe(false);
  });

  test('two msg_ids must be the same one; one side without a msg_id still matches', () => {
    expect(isShownInTurn([send({msgId: 'a'})], reply({msgId: 'b'}))).toBe(false);
    expect(isShownInTurn([send({msgId: 'a'})], reply({msgId: 'a'}))).toBe(true);
    expect(isShownInTurn([send({msgId: 'a'})], reply())).toBe(true);
  });
});

describe('one clip, however its url is written', () => {
  test('the phone bundle\'s absolute url and the page\'s path are one key', () => {
    expect(clipKey('http://192.168.0.5:5000/tts/audio/x.wav')).toBe(clipKey('/tts/audio/x.wav'));
    expect(clipKey('https://node.example/tts/audio/x.wav')).toBe('clip:/tts/audio/x.wav');
    expect(clipKey('/tts/audio/y.wav')).not.toBe(clipKey('/tts/audio/x.wav'));
    expect(clipKey('')).toBe('');
    expect(clipKey(undefined)).toBe('');
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
  const stamped = (rid) => ({request_id: rid, turn_voiced: true});

  test('only a send the server stamped turn_voiced, of a person\'s turn', () => {
    expect(isSpokenByTurnClip(stamped('msg_1-intermediate'))).toBe(true);
    expect(isSpokenByTurnClip(stamped('msg_1-intermediate-2'))).toBe(true);
    expect(isSpokenByTurnClip(stamped('daemon_g1-intermediate'))).toBe(false);
    expect(isSpokenByTurnClip(stamped('msg_1'))).toBe(false);
    expect(isSpokenByTurnClip(stamped(''))).toBe(false);
    expect(isSpokenByTurnClip(null)).toBe(false);
  });

  test('without the stamp, whatever the id says, it is not (review of 4fef48aa)', () => {
    expect(isSpokenByTurnClip({request_id: 'msg_1-intermediate'})).toBe(false);
    expect(isSpokenByTurnClip({request_id: 'msg_1-intermediate-4821'})).toBe(false);
    expect(isSpokenByTurnClip({request_id: '10202_342-intermediate'})).toBe(false);
    expect(isSpokenByTurnClip({request_id: 'msg_1-intermediate', turn_voiced: 'true'})).toBe(false);
  });

  test('a send of the turn the page still waits on: the page knows without the stamp', () => {
    expect(isSendOfPendingTurn({request_id: 'msg_1-intermediate-3'}, 'msg_1')).toBe(true);
    expect(isSendOfPendingTurn({request_id: 'msg_1-intermediate-3'}, null)).toBe(false);
    expect(isSendOfPendingTurn({request_id: 'msg_2-intermediate'}, 'msg_1')).toBe(false);
    expect(isSendOfPendingTurn({request_id: 'msg_1'}, 'msg_1')).toBe(false);
    expect(isSendOfPendingTurn({request_id: 'daemon_g-intermediate'}, 'daemon_g')).toBe(false);
    expect(shouldSpeakPushedText({request_id: 'msg_1-intermediate', msg_id: 'q1'}, 1, 'msg_1')).toBe(false);
    expect(shouldSpeakPushedText({request_id: 'msg_1-intermediate', msg_id: 'q2'}, 1, null)).toBe(true);
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
