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
import {DAEMON_REQUEST_PREFIX, isBackgroundRequest, isOtherTurnEnvelope} from '../../constants/chatBubble';

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
  expect(src.slice(status, thinking))
    .toMatch(/isOtherTurnEnvelope\(parsed\.request_id, requestIdRef\.current\)/);
  expect(src.slice(thinking, thinking + 1500))
    .toMatch(/isOtherTurnEnvelope\(parsed\.request_id, currentReqId\)/);
  const rules = src.match(/isOtherTurnEnvelope\(/g) || [];
  expect(rules.length).toBe(2); // the two trace branches; the player goes through ttsGuards
  expect(src).not.toMatch(/request_id !== requestIdRef\.current/);
  expect(src).not.toMatch(/!== cur(rent)?ReqId\)/);
});
