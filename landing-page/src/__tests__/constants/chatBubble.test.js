/**
 * A background agent's thinking stays out of the main conversation.
 *
 * HARTOS 2fe6c82a6 delivers a daemon turn's traces to the goal's owner
 * (crossbar_publish.trace_audience) so the floating window can show them.
 * That puts them on the same topic as the owner's own turns.  Demopage's
 * filter compared request ids only once it HAD a turn: requestIdRef starts
 * null, so on a fresh launch every daemon trace would have been appended
 * under the last message in the chat.  The daemon id is the one field that
 * tells the two apart (HARTOS core.chat_client.DAEMON_PREFIX).
 */
import {DAEMON_REQUEST_PREFIX, isBackgroundRequest} from '../../constants/chatBubble';

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

test('both main-window trace branches drop a background turn before comparing ids', () => {
  // Source guard: Demopage cannot be rendered cheaply in jsdom.  Each of the
  // Status and Thinking branches must consult isBackgroundRequest, or a
  // fresh window (no turn yet) lets daemon traces into the conversation.
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', 'pages', 'Demopage.js'), 'utf8');
  const status = src.indexOf('parsed.action === CHAT_ACTION_STATUS');
  const thinking = src.indexOf('parsed.action === CHAT_ACTION_THINKING', status + 1);
  expect(status).toBeGreaterThan(-1);
  expect(thinking).toBeGreaterThan(status);
  expect(src.slice(status, thinking)).toMatch(/isBackgroundRequest\(statusReqId\)/);
  expect(src.slice(thinking, thinking + 1500)).toMatch(/isBackgroundRequest\(traceRequestId\)/);
});
