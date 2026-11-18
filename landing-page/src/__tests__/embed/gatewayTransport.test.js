/**
 * gatewayTransport's approval door: an agent's ask (HARTOS person_ask) is
 * answered with its id; an ordinary card's decision keeps its own shape.
 *
 * Review of Nunba 8d2b0c54 (claude-autostart-71, 2026-10-31): decide() posted
 * {agent_id, action, decision, approved} for an ask card too, so the card
 * closed and the ask stayed open, never answered.
 */

import {createGatewayTransport} from '../../embed/transports/gatewayTransport';

const ASK = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

function transport(status = 200, body = {status: 'ok'}) {
  const posted = [];
  const fetchImpl = jest.fn((url, init) => {
    posted.push({url, init, body: JSON.parse(init.body)});
    return Promise.resolve({ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body)});
  });
  const t = createGatewayTransport({
    sink: {request: jest.fn(() => Promise.resolve({ok: true}))},
    gatewayUrl: '/agent',
    getToken: async () => 'tok-person',
    fetchImpl,
    realtime: {on: jest.fn(() => () => {}), off: jest.fn()},
  });
  return {t, posted};
}

test("an ask's yes is its answer, sent with the ask's id and the person's token", async () => {
  const {t, posted} = transport(200, {status: 'ok', ask_id: ASK});
  const res = await t.handleAction('approval.decide', {
    type: 'approval', ask_id: ASK, agent_id: '342', action: 'post_the_reel', decision: 'approve'});
  expect(res.ok).toBe(true);
  expect(posted).toHaveLength(1);
  expect(posted[0].url).toBe('/agent/api/agent/approval');
  expect(posted[0].body).toEqual({ask_id: ASK, answer: {decision: 'approve'}});
  expect(posted[0].init.headers.Authorization).toBe('Bearer tok-person');
});

test("an ask's no is answered the same way", async () => {
  const {t, posted} = transport();
  await t.handleAction('approval.decide', {ask_id: ASK, decision: 'deny'});
  expect(posted.map((p) => p.body)).toEqual([{ask_id: ASK, answer: {decision: 'deny'}}]);
});

test('Later on an ask answers nothing: it stays open on her other surfaces', async () => {
  const {t, posted} = transport();
  const res = await t.handleAction('approval.decide', {ask_id: ASK, decision: 'later'});
  expect(res.ok).toBe(true);
  expect(posted).toHaveLength(0);
});

test('a refused answer keeps the card up with the reason', async () => {
  const {t} = transport(409, {status: 'error', reason: 'already_answered'});
  const res = await t.handleAction('approval.decide', {ask_id: ASK, decision: 'approve'});
  expect(res.ok).toBe(false);
  expect(res.code).toBe('http_409');
});

test("an ordinary card's decision keeps its shape", async () => {
  const {t, posted} = transport();
  await t.handleAction('approval.decide', {agent_id: '7', action: 'game_sound:eng-01:bgm', decision: 'deny'});
  expect(posted.map((p) => p.body)).toEqual([
    {agent_id: '7', action: 'game_sound:eng-01:bgm', decision: 'deny', approved: false}]);
});
