/**
 * Whose turn an envelope belongs to.
 *
 * A background agent's thinking stays out of the main conversation: HARTOS
 * 2fe6c82a6 delivers a daemon turn's traces to the goal's owner
 * (crossbar_publish.trace_audience) so the floating window can show them.
 * That puts them on the same topic as the owner's own turns.  Demopage's
 * filter compared request ids only once it HAD a turn: requestIdRef starts
 * null, so on a fresh launch every daemon trace would have been appended
 * under the last message in the chat.  The daemon id is the one field that
 * tells the two apart (HARTOS core.chat_client.DAEMON_PREFIX).
 *
 * An earlier turn's envelope stays out too, once the page has sent a newer
 * one.  That rule was inert while a page minted one request id and kept it
 * for every later turn (measured 2026-10-11: two voice turns 29 s apart
 * reached HARTOS under one id, and the second's steps were appended to the
 * first's container); each turn now carries its own id, and the one rule
 * below is what every envelope reader in the main window consults.
 */
import {
  DAEMON_REQUEST_PREFIX, isBackgroundRequest, isOtherTurnEnvelope, repeatsShownMessage,
} from '../../constants/chatBubble';

import fs from 'fs';
import path from 'path';

test('the prefix mirrors HARTOS core.chat_client.DAEMON_PREFIX', () => {
  expect(DAEMON_REQUEST_PREFIX).toBe('daemon_');
});

test('a daemon turn is background', () => {
  expect(isBackgroundRequest('daemon_goal_20260412_235046_b18bba6f')).toBe(true);
});

test.each([
  ['a person turn uuid', 'c0ffee00-1111-2222-3333-444455556666'],
  ['the legacy placeholder', '123456'],
  ['empty', ''],
  ['missing', undefined],
  ['null', null],
  ['a number', 42],
  ['the word inside, not a prefix', 'goal_daemon_1'],
])('%s is not background', (_label, id) => {
  expect(isBackgroundRequest(id)).toBe(false);
});

describe('isOtherTurnEnvelope: whose turn an envelope belongs to', () => {
  // Two turns of one page, each with its own id (chatRetry.makeMsgId).
  const first = 'msg_1760160492473_k3j9x1';
  const second = 'msg_1760160521422_a1b2c3';

  test('the current turn\'s envelope is this turn\'s', () => {
    expect(isOtherTurnEnvelope(second, second)).toBe(false);
  });

  test('an earlier turn\'s envelope is another turn\'s once a newer turn was sent', () => {
    // The 11:38 case: the first turn's late steps and audio, arriving while
    // the second turn is current, no longer land under the second turn.
    expect(isOtherTurnEnvelope(first, second)).toBe(true);
  });

  test('a background agent\'s envelope is another turn\'s, with or without a turn of our own', () => {
    expect(isOtherTurnEnvelope('daemon_goal_20260412_235046_b18bba6f', second)).toBe(true);
    expect(isOtherTurnEnvelope('daemon_goal_20260412_235046_b18bba6f', null)).toBe(true);
  });

  test.each([
    ['missing', undefined],
    ['null', null],
    ['empty', ''],
  ])('an envelope with no id (%s) cannot be told apart, so it is this turn\'s', (_label, id) => {
    expect(isOtherTurnEnvelope(id, second)).toBe(false);
  });

  test('a literal id that is not this turn\'s is another turn\'s, placeholders included', () => {
    // The renderer substitutes 'unknown' for a missing id in its log lines
    // and container keys only; the rule is given the raw id and treats any
    // other literal as another turn's.
    expect(isOtherTurnEnvelope('unknown', second)).toBe(true);
    expect(isOtherTurnEnvelope('123456', second)).toBe(true);
  });

  test('before the page has a turn of its own, a person\'s envelope is let through', () => {
    expect(isOtherTurnEnvelope(first, null)).toBe(false);
    expect(isOtherTurnEnvelope(first, undefined)).toBe(false);
  });
});

test('every envelope reader in the main window consults the one rule', () => {
  // Source guard: Demopage cannot be rendered cheaply in jsdom.  The Status
  // and Thinking branches must each ask isOtherTurnEnvelope with the RAW id
  // and the live ref (the clip player asks through ttsGuards.
  // shouldPlayPushedClip, guarded in utils/__tests__/demopagePerTurnRequestId),
  // and none may compare request ids by hand: a second copy of the rule is
  // how the daemon case was missed before (a fresh window, no turn yet, let
  // daemon traces into the conversation).
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');
  const status = src.indexOf('parsed.action === CHAT_ACTION_STATUS');
  const thinking = src.indexOf('parsed.action === CHAT_ACTION_THINKING', status + 1);
  expect(status).toBeGreaterThan(-1);
  expect(thinking).toBeGreaterThan(status);
  // The whole condition, so a flipped rule (`if (!isOtherTurnEnvelope(`)
  // fails here: review of d0cd9390 showed the unanchored match let that
  // mutant through with every test green.
  expect(src.slice(status, thinking))
    .toMatch(/if \(isOtherTurnEnvelope\(parsed\.request_id, requestIdRef\.current\)\) \{/);
  expect(src.slice(thinking, thinking + 1500))
    .toMatch(/if \(isOtherTurnEnvelope\(parsed\.request_id, currentReqId\)\) \{/);
  const rules = src.match(/isOtherTurnEnvelope\(/g) || [];
  expect(rules.length).toBe(2); // the two trace branches; the player goes through ttsGuards
  expect(src).not.toMatch(/request_id !== requestIdRef\.current/);
  expect(src).not.toMatch(/!== cur(rent)?ReqId\)/);
});

describe("repeatsShownMessage: an agent's line shows once (RN ChatBubble.shouldDrop)", () => {
  // An agent row as the page keeps it: its turn's request id, its push's own
  // msg_id when it was pushed, its words.
  const row = (requestId, content, msgId) => ({
    type: 'assistant', requestId, content, ...(msgId ? {msgId} : {}),
  });

  test('a reply after the send it repeats is a copy (the live 14:59 turn)', () => {
    expect(repeatsShownMessage(row('msg_1795685299811_zbw1jq', 'Hello! What is your name?'),
      [row('msg_1795685299811_zbw1jq-intermediate-9485', 'Hello! What is your name?', 'a1')])).toBe(true);
  });

  test('a send after the reply it repeats is a copy (an SSE replay brings the push late)', () => {
    expect(repeatsShownMessage(row('rid-intermediate-4821', 'Twinkle twinkle.', 'm1'),
      [row('rid', 'Twinkle twinkle.')])).toBe(true);
  });

  test('every row of the turn is read, not only the last', () => {
    expect(repeatsShownMessage(row('rid', 'Say cat.'), [
      row('rid-intermediate-1', 'Say cat.', 'm1'),
      row('rid-intermediate-2', 'Well done!', 'm2'),
    ])).toBe(true);
  });

  test('the spaces around the words do not make another message', () => {
    expect(repeatsShownMessage(row('rid', ' Say cat. '), [row('rid-intermediate-1', 'Say cat.', 'm1')])).toBe(true);
  });

  test('a reply and a send of one turn are one message whatever their msg ids', () => {
    // A deferred turn's answer is pushed under the turn's own id with its own
    // msg_id (sub J #288 D1 (c)); every publish has its own (publish_async).
    expect(repeatsShownMessage(row('rid', 'Again!', 'm2'),
      [row('rid-intermediate-1111', 'Again!', 'm1')])).toBe(true);
    expect(repeatsShownMessage(row('rid-intermediate-1111', 'Again!', 'm1'),
      [row('rid', 'Again!', 'm2')])).toBe(true);
  });

  test('the reply arriving twice under its own id is one message', () => {
    expect(repeatsShownMessage(row('r1', 'Your reel is ready.'),
      [row('r1', 'Your reel is ready.', 'm1')])).toBe(true);
    expect(repeatsShownMessage(row('r1', 'Shall I post it?'),
      [row('r1', 'Your reel is ready.', 'm1')])).toBe(false);
  });

  test("two replies under the turn's own id with their own msg ids are two messages", () => {
    expect(repeatsShownMessage(row('rid', 'Again!', 'm2'), [row('rid', 'Again!', 'm1')])).toBe(false);
  });

  test('two pushed sends of a turn in the same words are never copies (a reminder)', () => {
    expect(repeatsShownMessage(row('rid-intermediate-2222', 'Time to practise!'),
      [row('rid-intermediate-1111', 'Time to practise!')])).toBe(false);
    expect(repeatsShownMessage(row('rid-intermediate', 'Time to practise!'),
      [row('rid-intermediate-1111', 'Time to practise!')])).toBe(false);
    expect(repeatsShownMessage(row('rid-intermediate-1111', 'Again!', 'm1'),
      [row('rid-intermediate-2222', 'Again!', 'm2')])).toBe(false);
  });

  test('the same msg id is one message, however it came', () => {
    // Two legs of one push more than 60 s apart (handleDataReceived's map
    // forgets): a send, a background agent's send, and one with no turn.
    expect(repeatsShownMessage(row('rid-intermediate-1111', 'Again!', 'm1'),
      [row('rid-intermediate-1111', 'Again!', 'm1')])).toBe(true);
    expect(repeatsShownMessage(row('daemon_goal_7-intermediate-2', 'Shall we start?', 'm5'),
      [row('daemon_goal_7-intermediate-2', 'Shall we start?', 'm5')])).toBe(true);
    expect(repeatsShownMessage(row(undefined, 'Good morning!', 'm6'),
      [row(undefined, 'Good morning!', 'm6')])).toBe(true);
  });

  test('the same words in another turn are never a copy', () => {
    expect(repeatsShownMessage(row('rid8-intermediate-3', 'Well done!', 'm9'),
      [row('rid7', 'Well done!')])).toBe(false);
    expect(repeatsShownMessage(row('rid8', 'Well done!'),
      [row('rid7-intermediate-1', 'Well done!', 'm1')])).toBe(false);
    expect(repeatsShownMessage(row('-intermediate-2', 'Hi', 'm2'),
      [row('-intermediate-1', 'Hi', 'm1'), row('', 'Hi')])).toBe(false);
    expect(repeatsShownMessage(row(undefined, 'Hi'), [row(undefined, 'Hi')])).toBe(false);
  });

  test('a message with no words is never matched across requests', () => {
    expect(repeatsShownMessage(row('rid', ''), [row('rid-intermediate-1', '', 'm1')])).toBe(false);
    expect(repeatsShownMessage({type: 'assistant', requestId: 'rid'},
      [row('rid-intermediate-1', 'Hi', 'm1')])).toBe(false);
  });

  test("only an agent's message is held back, and only by an agent's row", () => {
    // The person's words mirrored from another device (chat.new) show even
    // when the agent said them in that turn: the child repeats "Arjun".
    expect(repeatsShownMessage({type: 'user', requestId: 'rid', content: 'Arjun'},
      [row('rid-intermediate-1', 'Arjun', 'm1')])).toBe(false);
    expect(repeatsShownMessage(row('rid', 'Arjun'),
      [{type: 'user', requestId: 'rid', content: 'Arjun'}])).toBe(false);
    expect(repeatsShownMessage(row('rid', 'Done.', 'm1'),
      [{type: 'thinking_container', requestId: 'rid', msgId: 'm1', content: 'Done.'}])).toBe(false);
  });

  test('a row saved before rows kept a request id is never matched', () => {
    expect(repeatsShownMessage(row('rid', 'Hello!'), [{type: 'assistant', content: 'Hello!'}])).toBe(false);
  });

  test('nothing to compare is never a copy', () => {
    expect(repeatsShownMessage(null, [row('rid', 'Hi')])).toBe(false);
    expect(repeatsShownMessage(row('rid', 'Hi'), undefined)).toBe(false);
    expect(repeatsShownMessage(row('rid', 'Hi'), [null, undefined])).toBe(false);
  });
});
