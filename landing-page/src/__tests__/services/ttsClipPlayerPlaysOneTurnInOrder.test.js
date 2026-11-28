/**
 * One turn's clips play in order; another turn's clip replaces them.
 *
 * Owner, 2026-11-24: "a text reaching the tablet shd also get the audio
 * delivered as and when it was fanned out isnt?"  Owner, 2026-11-27, after a
 * demo turn whose questions were shown and never heard: "only final reply is
 * ever spoke wtf we have send user to message as a tool, why are they not
 * spoken".  HARTOS now speaks each message an agent sends during a turn as it
 * is sent, each its own clip under the send's id ('<turn>-intermediate-<n>'),
 * then the turn's reply under the turn's id.  The page loads every clip into
 * ONE shared element, and assigning src cuts the clip playing, so the second
 * question would have cut the first (hartos-17's blocker on the design).
 *
 * Real: services/ttsClipPlayer.playTtsClip with constants/chatBubble.turnIdOf.
 * Faked: the audio element (src, paused/ended, play, onended).
 */
import { playTtsClip, _resetTtsClipPlayer } from '../../services/ttsClipPlayer';

const TURN = 'msg_1795789738216_6i39gd';

function element() {
  const el = {
    src: '',
    paused: true,
    ended: false,
    played: [],
    onended: null,
    onerror: null,
    play() {
      this.paused = false;
      this.ended = false;
      this.played.push(this.src);
      return Promise.resolve();
    },
    finish() {
      this.paused = true;
      this.ended = true;
      if (this.onended) this.onended();
    },
  };
  return el;
}

beforeEach(() => _resetTtsClipPlayer());

test("a second send of the turn waits for the first to end, then plays", () => {
  const el = element();
  const ends = [];
  expect(playTtsClip(el, '/tts/audio/q1.wav',
    { requestId: `${TURN}-intermediate-1`, onEnd: () => ends.push('q1') }, 1000)).toBe('played');
  expect(playTtsClip(el, '/tts/audio/q2.wav',
    { requestId: `${TURN}-intermediate-2`, onEnd: () => ends.push('q2') }, 1100)).toBe('queued');
  expect(el.played).toEqual(['/tts/audio/q1.wav']);
  el.finish();
  expect(ends).toEqual(['q1']);
  expect(el.played).toEqual(['/tts/audio/q1.wav', '/tts/audio/q2.wav']);
  el.finish();
  expect(ends).toEqual(['q1', 'q2']);
});

test("the turn's reply waits behind its sends, in the order they came", () => {
  const el = element();
  playTtsClip(el, '/a.wav', { requestId: `${TURN}-intermediate-1` }, 1);
  playTtsClip(el, '/b.wav', { requestId: `${TURN}-intermediate-2` }, 2);
  expect(playTtsClip(el, '/reply.wav', { requestId: TURN }, 3)).toBe('queued');
  el.finish();
  el.finish();
  expect(el.played).toEqual(['/a.wav', '/b.wav', '/reply.wav']);
});

test('a newer turn replaces the clip playing and drops what waited', () => {
  const el = element();
  playTtsClip(el, '/old1.wav', { requestId: `${TURN}-intermediate-1` }, 1);
  playTtsClip(el, '/old2.wav', { requestId: `${TURN}-intermediate-2` }, 2);
  expect(playTtsClip(el, '/new.wav', { requestId: 'msg_next_turn' }, 3)).toBe('played');
  expect(el.src).toBe('/new.wav');
  el.finish();
  expect(el.played).toEqual(['/old1.wav', '/new.wav']);
});

test('the same clip delivered twice (SSE and WAMP) is a duplicate, playing or waiting', () => {
  const el = element();
  playTtsClip(el, '/a.wav', { requestId: `${TURN}-intermediate-1` }, 1);
  playTtsClip(el, '/b.wav', { requestId: `${TURN}-intermediate-2` }, 2);
  expect(playTtsClip(el, '/a.wav', { requestId: `${TURN}-intermediate-1` }, 3)).toBe('duplicate');
  expect(playTtsClip(el, '/b.wav', { requestId: `${TURN}-intermediate-2` }, 4)).toBe('duplicate');
  el.finish();
  el.finish();
  expect(el.played).toEqual(['/a.wav', '/b.wav']);
});

test("with nothing playing, a clip of the same turn plays at once", () => {
  const el = element();
  playTtsClip(el, '/a.wav', { requestId: `${TURN}-intermediate-1` }, 1);
  el.finish();
  expect(playTtsClip(el, '/b.wav', { requestId: `${TURN}-intermediate-2` }, 2)).toBe('played');
  expect(el.played).toEqual(['/a.wav', '/b.wav']);
});

test('a clip with no request id replaces as every clip did before', () => {
  const el = element();
  playTtsClip(el, '/a.wav', {}, 1);
  expect(playTtsClip(el, '/b.wav', {}, 2)).toBe('played');
  expect(el.src).toBe('/b.wav');
});

test('a clip that fails to load lets the next one of its turn play', () => {
  const el = element();
  playTtsClip(el, '/bad.wav', { requestId: `${TURN}-intermediate-1` }, 1);
  playTtsClip(el, '/good.wav', { requestId: `${TURN}-intermediate-2` }, 2);
  el.paused = true;
  el.onerror();
  expect(el.played).toEqual(['/bad.wav', '/good.wav']);
});

// rv_voice F11: the same words sent twice in a turn are two messages, and
// HARTOS's TTS cache hands both the same file.  A url-only check dropped the
// second; the duplicate is the same clip for the SAME message.
test('the same words sent twice in a turn are heard twice', () => {
  const el = element();
  expect(playTtsClip(el, '/tts/ready.wav', { requestId: `${TURN}-intermediate-1` }, 1)).toBe('played');
  expect(playTtsClip(el, '/tts/ready.wav', { requestId: `${TURN}-intermediate-2` }, 2)).toBe('queued');
  el.finish();
  expect(el.played).toEqual(['/tts/ready.wav', '/tts/ready.wav']);
});

// rv_voice F7: a reply's live face pauses the shared element, so while the
// turn's messages are still being said the page hears the reply after them.
test("the turn is speaking while one of its clips plays or waits, and not after", () => {
  const { turnIsSpeaking } = require('../../services/ttsClipPlayer');
  const el = element();
  expect(turnIsSpeaking(el, TURN)).toBe(false);
  playTtsClip(el, '/a.wav', { requestId: `${TURN}-intermediate-1` }, 1);
  playTtsClip(el, '/b.wav', { requestId: `${TURN}-intermediate-2` }, 2);
  expect(turnIsSpeaking(el, TURN)).toBe(true);
  expect(turnIsSpeaking(el, 'msg_other_turn')).toBe(false);
  el.finish();
  expect(turnIsSpeaking(el, TURN)).toBe(true);
  el.finish();
  expect(turnIsSpeaking(el, TURN)).toBe(false);
});

// rv_voice gap (c): a voiced message whose clip never came is said by the page;
// a clip that came first keeps it, and a clip that comes after the page spoke
// is not played, so the message is heard once either way.
test('the page takes over a message only when no clip came for it', () => {
  const { claimForPage } = require('../../services/ttsClipPlayer');
  const el = element();
  playTtsClip(el, '/q1.wav', { requestId: `${TURN}-intermediate-1` }, 1);
  expect(claimForPage(`${TURN}-intermediate-1`)).toBe(false);
  expect(claimForPage(`${TURN}-intermediate-2`)).toBe(true);
  expect(playTtsClip(el, '/q2.wav', { requestId: `${TURN}-intermediate-2` }, 2)).toBe('spoken-by-page');
  el.finish();
  expect(el.played).toEqual(['/q1.wav']);
});

// rv_voice R3-1/R3-2: one turn's speech is one queue.  A face plays in the
// video element, not the audio element, so the player is told when a face
// starts and ends; the page's own saying of a message holds the turn until it
// is said.  Nothing of a turn is said over another part of it.
describe('one turn: clips, faces and the page\'s own speech, in order', () => {
  const player = () => require('../../services/ttsClipPlayer');

  test('a clip of the turn that comes while its face plays waits for the face', () => {
    const { faceStarted, faceEnded, turnIsSpeaking } = player();
    const el = element();
    faceStarted(`${TURN}-intermediate-1`);
    expect(turnIsSpeaking(el, TURN)).toBe(true);
    expect(playTtsClip(el, '/q2.wav', { requestId: `${TURN}-intermediate-2` }, 1)).toBe('queued');
    expect(el.played).toEqual([]);
    faceEnded(`${TURN}-intermediate-1`);
    expect(el.played).toEqual(['/q2.wav']);
  });

  test('a face of the turn waits behind the clip being said, then starts', () => {
    const { queueForTurn, faceStarted } = player();
    const el = element();
    const started = [];
    playTtsClip(el, '/q1.wav', { requestId: `${TURN}-intermediate-1` }, 1);
    expect(queueForTurn(el, TURN, () => { started.push('face'); faceStarted(TURN); })).toBe('queued');
    expect(started).toEqual([]);
    el.finish();
    expect(started).toEqual(['face']);
  });

  test("a face of another turn starts at once and drops what the last turn had waiting", () => {
    const { queueForTurn } = player();
    const el = element();
    const ran = [];
    playTtsClip(el, '/a1.wav', { requestId: `${TURN}-intermediate-1` }, 1);
    playTtsClip(el, '/a2.wav', { requestId: `${TURN}-intermediate-2` }, 2);
    expect(queueForTurn(el, 'msg_next_turn', () => ran.push('next'))).toBe('ran');
    expect(ran).toEqual(['next']);
    el.finish();
    expect(el.played).toEqual(['/a1.wav']);
  });

  test("the page's own saying holds the turn until it is said", async () => {
    const { queueForTurn, turnIsSpeaking } = player();
    const el = element();
    let said;
    const saying = new Promise((resolve) => { said = resolve; });
    expect(queueForTurn(el, `${TURN}-intermediate-1`, () => saying)).toBe('ran');
    expect(turnIsSpeaking(el, TURN)).toBe(true);
    expect(playTtsClip(el, '/q2.wav', { requestId: `${TURN}-intermediate-2` }, 1)).toBe('queued');
    expect(el.played).toEqual([]);
    said();
    await saying;
    await Promise.resolve();
    expect(el.played).toEqual(['/q2.wav']);
  });

  test('a step that says nothing lets the turn go on at once', () => {
    const { queueForTurn } = player();
    const el = element();
    playTtsClip(el, '/q1.wav', { requestId: `${TURN}-intermediate-1` }, 1);
    queueForTurn(el, `${TURN}-intermediate-2`, () => undefined);
    playTtsClip(el, '/q3.wav', { requestId: `${TURN}-intermediate-3` }, 2);
    el.finish();
    expect(el.played).toEqual(['/q1.wav', '/q3.wav']);
  });

  test('a stopped face (the person cut in) starts nothing more of its turn', () => {
    const { faceStarted, faceEnded } = player();
    const el = element();
    faceStarted(`${TURN}-intermediate-1`);
    playTtsClip(el, '/q2.wav', { requestId: `${TURN}-intermediate-2` }, 1);
    faceEnded(`${TURN}-intermediate-1`, { stopped: true });
    expect(el.played).toEqual([]);
  });

  test("a face that could not start hands its place to its own audio, ahead of what waits", () => {
    const { faceStarted, faceEnded } = player();
    const el = element();
    faceStarted(`${TURN}-intermediate-1`);
    playTtsClip(el, '/q2.wav', { requestId: `${TURN}-intermediate-2` }, 1);
    faceEnded(`${TURN}-intermediate-1`, { stopped: true }); // its stream failed
    expect(playTtsClip(el, '/q1.wav', { requestId: `${TURN}-intermediate-1` }, 2)).toBe('played');
    el.finish();
    expect(el.played).toEqual(['/q1.wav', '/q2.wav']);
  });

  test('a face that came keeps the page from saying the message; after the page said it, the face is not played', () => {
    const { faceCameFor, claimForPage } = player();
    expect(faceCameFor(`${TURN}-intermediate-1`)).toBe(true);
    expect(claimForPage(`${TURN}-intermediate-1`)).toBe(false);
    expect(claimForPage(`${TURN}-intermediate-2`)).toBe(true);
    expect(faceCameFor(`${TURN}-intermediate-2`)).toBe(false);
  });
});
