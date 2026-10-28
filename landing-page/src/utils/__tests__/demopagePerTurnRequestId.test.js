/**
 * Source guard: Demopage sends every chat turn through the tested helpers.
 *
 * The behaviour lives in two pure helpers with their own tests:
 *   - chatRetry.startTurn mints the turn's id (its message id, which is also
 *     its request_id, as NunbaChatProvider sends it) and makes it the current
 *     turn: __tests__/utils/chatRetry.test.js;
 *   - ttsGuards.shouldPlayPushedClip decides whether a server-pushed clip is
 *     this turn's: __tests__/utils/ttsGuards.test.js;
 *   - chatBubble.isOtherTurnEnvelope is the one rule under both:
 *     __tests__/constants/chatBubble.test.js.
 * Demopage is too large to render in a unit test, so this guard reads the
 * source and pins the wiring only: that handleSend starts a turn with the
 * helper and nothing else, posts that id, and that the clip decision is the
 * helper's answer, not a hand-written comparison.  Review of e578848d showed
 * why: with the mint inline, a one-expression change brought the page-wide
 * id back and every test still passed.
 *
 * Measured 2026-10-11: one page sent two voice turns 29 s apart under one id
 * (Demopage minted a uuid once per page and reused it), so the stale-turn
 * checks never separated them and the second turn's steps were appended to
 * the first's thinking container.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');
const UPLOAD = fs.readFileSync(path.join(__dirname, '..', 'attachmentUpload.js'), 'utf8');

describe('Demopage starts a turn per send', () => {
  test('the send starts the turn with the helper, and mints no id of its own', () => {
    expect(SRC).not.toMatch(/requestId \|\| uuidv4\(\)/);
    expect(SRC).not.toMatch(/makeMsgId\(/);
    const starts = SRC.match(/startTurn\(/g) || [];
    expect(starts).toEqual(['startTurn(']);
    expect(SRC).toMatch(/const msgId = startTurn\(requestIdRef\);/);
  });

  test('the turn\'s id is the page\'s current id and the id the POST carries', () => {
    const start = SRC.indexOf('const msgId = startTurn(requestIdRef);');
    const state = SRC.indexOf('setRequestId(msgId);', start);
    const post = SRC.indexOf('request_id: msgId,', start);
    expect(start).toBeGreaterThan(-1);
    expect(state).toBeGreaterThan(start);
    expect(post).toBeGreaterThan(state);
    // startTurn is the ref's only writer: no hand assignment and no
    // state-sync effect.  Such an effect wrote the state's value back after
    // a later send had already moved the ref on (two sends inside one
    // frame, measured on a copy in the review of d0cd9390), so for a moment
    // the ref named the previous turn.
    expect(SRC).not.toMatch(/requestIdRef\.current = /);
  });

  test('the send is the only writer of the page\'s request id', () => {
    const writes = SRC.match(/setRequestId\(/g) || [];
    expect(writes).toEqual(['setRequestId(']);
    // The upload flow used to hand the upload's id to the page, so the next
    // chat turn went out under it.  No server reads a chat turn's id against
    // an upload (the book row and its parse job carry the upload's own).
    expect(SRC).not.toMatch(/setRequestId,\s*\n/);
    expect(UPLOAD).not.toMatch(/setRequestId/);
  });

  test('the clip decision is the tested guard\'s answer', () => {
    const player = SRC.indexOf('const playPushedTts = useCallback(');
    expect(player).toBeGreaterThan(-1);
    expect(SRC.slice(player, player + 700))
      // The speaker toggle is the third argument (2026-10-21): the guard is
      // still the one decision, now including whether the user wants audio.
      .toMatch(/if \(!shouldPlayPushedClip\(data, requestIdRef\.current, ttsEnabledRef\.current\)\)/);
    expect(SRC).not.toMatch(/request_id !== requestIdRef\.current/);
  });
});
