/**
 * Source guard: every chat turn Demopage sends carries its own request id.
 *
 * Demopage is too large to render in a unit test, so this reads the source
 * and pins what the behavioural tests in __tests__/constants/chatBubble.test.js
 * (isOtherTurnEnvelope) rely on:
 *   1. the turn's request id IS its message id (chatRetry.makeMsgId, which
 *      NunbaChatProvider already sends as request_id), minted at the send,
 *      never carried over from the previous turn or from an upload;
 *   2. the live ref the envelope readers consult is set in the same breath,
 *      not one render later in the state effect, so the turn's first trace
 *      is judged against this turn;
 *   3. the POST carries that id.
 * Measured 2026-10-11: one page sent two voice turns 29 s apart under one id
 * (Demopage minted `requestId || uuidv4()` once per page), so the stale-turn
 * checks never separated them and the second turn's steps were appended to
 * the first's thinking container.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');
const UPLOAD = fs.readFileSync(path.join(__dirname, '..', 'attachmentUpload.js'), 'utf8');

describe('Demopage mints a request id per turn', () => {
  test('the id is the turn\'s message id, and nothing is carried over from the previous turn', () => {
    expect(SRC).not.toMatch(/requestId \|\| uuidv4\(\)/);
    const mints = SRC.match(/const generatedRequestId = msgId;/g) || [];
    expect(mints.length).toBe(1);
  });

  test('the ref the envelope readers consult is set at the send, before the POST', () => {
    const mint = SRC.indexOf('const generatedRequestId = msgId;');
    const ref = SRC.indexOf('requestIdRef.current = generatedRequestId;', mint);
    const post = SRC.indexOf('request_id: generatedRequestId,', mint);
    expect(mint).toBeGreaterThan(-1);
    expect(ref).toBeGreaterThan(mint);
    expect(post).toBeGreaterThan(ref);
  });

  test('the send is the only writer of the page\'s request id', () => {
    const writes = SRC.match(/setRequestId\(/g) || [];
    expect(writes).toEqual(['setRequestId(']);
    expect(SRC).toMatch(/setRequestId\(generatedRequestId\)/);
    // The upload flow used to hand the upload's id to the page, so the next
    // chat turn went out under it.  No server reads a chat turn's id against
    // an upload (the book row and its parse job carry the upload's own).
    expect(SRC).not.toMatch(/setRequestId,\s*\n/);
    expect(UPLOAD).not.toMatch(/setRequestId/);
  });
});
