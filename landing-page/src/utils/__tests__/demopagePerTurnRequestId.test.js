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
 * source and pins the wiring only: that each send (handleSend first) starts
 * a turn with the helper and nothing else, posts that id, and that the clip decision is the
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
    // Every turn the page starts is a send (handleSend; and the creation
    // loop's next step, the original task once the agent is built and an
    // executed plan, which sent no id until the companion follow-up of
    // 79df4713), each a fresh turn through the helper and nothing else.
    const starts = SRC.match(/startTurn\(/g) || [];
    // handleSend's own start: a typed or prompted send takes the turn; an
    // open-mic final is minted without taking it (see the last describe).
    const sends = SRC.match(
      /const \w+ = (?:openMic \? mintHeardTurn\(\) : )?startTurn\(requestIdRef\);/g) || [];
    expect(starts.length).toBeGreaterThan(0);
    expect(sends).toHaveLength(starts.length);
    expect(SRC).toMatch(/const msgId = openMic \? mintHeardTurn\(\) : startTurn\(requestIdRef\);/);
  });

  test('the turn\'s id is the page\'s current id and the id the POST carries', () => {
    const start = SRC.indexOf('const msgId = openMic ? mintHeardTurn() : startTurn(requestIdRef);');
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
    // Each write is the turn a send just started, on the line after it.
    const writes = SRC.match(/setRequestId\(/g) || [];
    const paired = SRC.match(
      /const (\w+) = (?:openMic \? mintHeardTurn\(\) : )?startTurn\(requestIdRef\);[^\n]*\n\s*(?:if \(!openMic\) )?setRequestId\(\1\);/g) || [];
    // ...or an open-mic final taking the turn through the tested helper,
    // whose answer guards the write on the same line.
    const promoted = SRC.match(
      /promoteHeardTurn\(requestIdRef, (?:clipTurnOf\([^)]+\)|[^)]+)\)\) setRequestId\(/g) || [];
    expect(writes.length).toBeGreaterThan(0);
    expect(paired.length + promoted.length).toBe(writes.length);
    // The upload flow used to hand the upload's id to the page, so the next
    // chat turn went out under it.  No server reads a chat turn's id against
    // an upload (the book row and its parse job carry the upload's own).
    expect(SRC).not.toMatch(/setRequestId,\s*\n/);
    expect(UPLOAD).not.toMatch(/setRequestId/);
  });

  test('the clip decision is the tested guard\'s answer', () => {
    const player = SRC.indexOf('const playPushedTts = useCallback(');
    expect(player).toBeGreaterThan(-1);
    expect(SRC.slice(player, player + 1200))
      // The speaker toggle is the third argument (2026-10-21): the guard is
      // still the one decision, now including whether the user wants audio.
      .toMatch(/if \(!shouldPlayPushedClip\(data, requestIdRef\.current, ttsEnabledRef\.current\)\)/);
    expect(SRC).not.toMatch(/request_id !== requestIdRef\.current/);
  });
});

describe('an open-mic final takes the turn only when HARTOS treats it as one', () => {
  // Review of cbaa6e68 (rv_voice, 2026-11-28): mintHeardTurn/promoteHeardTurn
  // had no caller in the page, so room speech mid-turn became the current
  // turn at once and the agent's remaining clips were skipped as "another
  // turn's" (276 of 515 clips live).  The helpers' behaviour is tested in
  // __tests__/utils/chatRetry.test.js; this pins that the page calls them.
  // It reads the source: handleSend itself is not driven here.
  test('the open-mic send mints without taking the turn or moving the worker id', () => {
    expect(SRC).toMatch(/import \{[^}]*\bmintHeardTurn\b[^}]*\bpromoteHeardTurn\b[^}]*\} from '..\/utils\/chatRetry'/);
    expect(SRC).toMatch(/const msgId = openMic \? mintHeardTurn\(\) : startTurn\(requestIdRef\);\s*\n\s*if \(!openMic\) setRequestId\(msgId\);/);
  });

  test('its clip, its first trace and its addressed reply each promote it', () => {
    const player = SRC.indexOf('const playPushedTts = useCallback(');
    const guard = SRC.indexOf('shouldPlayPushedClip(data, requestIdRef.current', player);
    const clip = SRC.indexOf('promoteHeardTurn(requestIdRef, clipTurnOf(data.request_id))', player);
    expect(clip).toBeGreaterThan(player);
    expect(clip).toBeLessThan(guard);          // before the clip is judged

    const trace = SRC.indexOf('promoteHeardTurn(requestIdRef, clipTurnOf(parsed.request_id))');
    const traceGate = SRC.indexOf('if (isOtherTurnEnvelope(parsed.request_id, currentReqId))');
    expect(trace).toBeGreaterThan(-1);
    expect(trace).toBeLessThan(traceGate);     // before the trace is judged

    expect(SRC).toMatch(/if \(openMic && !notAddressed && promoteHeardTurn\(requestIdRef, msgId\)\) setRequestId\(msgId\);/);

    // rv_voice on 873f5a06: a send's clip and text name the turn with a
    // send mark after it ('<turn>-intermediate-<n>'), so the exact id never
    // promoted.  Every envelope promotion goes through clipTurnOf, and a
    // send's text promotes before its speech is judged.
    expect(SRC).not.toMatch(/promoteHeardTurn\(requestIdRef, (?:data|parsed)\.request_id\)/);
    const sendText = SRC.indexOf('speaksPushedText(parsed.request_id, requestIdRef.current)');
    expect(SRC.lastIndexOf('promoteHeardTurn(requestIdRef, clipTurnOf(parsed.request_id))', sendText))
      .toBeGreaterThan(traceGate);
  });

  test('a pipeline status line does not promote it', () => {
    // Status stages are published before the agent has judged who was
    // spoken to; only its own reasoning, a clip or an addressed reply count.
    const status = SRC.indexOf('parsed.action === CHAT_ACTION_STATUS');
    const thinking = SRC.indexOf('parsed.action === CHAT_ACTION_THINKING');
    expect(SRC.slice(status, thinking)).not.toMatch(/promoteHeardTurn/);
  });
});
