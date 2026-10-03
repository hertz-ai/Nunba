/**
 * realtimeService.resilience.test.js — stream identity, rotation and the
 * worker attachment contract.
 *
 * Invariants under test:
 *   A) setIdentity({token}) with the same credential mode MUST NOT close the
 *      live EventSource (#211). A token refresh is a credential rotation, not
 *      an identity change.
 *   B) An identity change opens a NEW EventSource first, waits for its onopen,
 *      THEN closes the old one, so no broadcast lands in an empty broker.
 *   C) setIdentity() is the only way a stream is opened or re-keyed.  The
 *      crossbar worker is attached and detached separately and never opens,
 *      closes or re-keys the stream.
 *
 * Subject under test: landing-page/src/services/realtimeService.js
 */

const fs = require('fs');
const path = require('path');

class FakeEventSource {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.onopen = null;
    this.onerror = null;
    this.onmessage = null;
    this.closed = false;
    this._listeners = {};
    FakeEventSource.instances.push(this);
  }

  addEventListener(type, fn) {
    (this._listeners[type] = this._listeners[type] || []).push(fn);
  }

  removeEventListener() {}

  close() {
    this.closed = true;
    this.readyState = 2;
  }

  // Test helper — simulate the browser firing onopen
  _simulateOpen() {
    this.readyState = 1;
    if (this.onopen) this.onopen({});
  }

  // Test helper — simulate the browser firing onerror
  _simulateError() {
    if (this.onerror) this.onerror({});
  }

  // Test helper — a named frame, with the `id:` the server stamps on it
  _fire(name, payload, lastEventId = '') {
    (this._listeners[name] || []).forEach((fn) =>
      fn({data: JSON.stringify(payload), lastEventId}),
    );
  }

  // Test helper — an unnamed frame (the server's 'connected' hello)
  _message(payload, lastEventId = '') {
    if (this.onmessage) this.onmessage({data: JSON.stringify(payload), lastEventId});
  }

  static reset() {
    FakeEventSource.instances = [];
  }
}
FakeEventSource.instances = [];
global.EventSource = FakeEventSource;

// Same surface realtimeService uses on the real crossbar Worker.
class FakeWorker {
  constructor() {
    this._messageListeners = new Set();
    this.postMessage = jest.fn();
  }

  addEventListener(type, fn) {
    if (type === 'message') this._messageListeners.add(fn);
  }

  removeEventListener(type, fn) {
    if (type === 'message') this._messageListeners.delete(fn);
  }

  _emit(data) {
    this._messageListeners.forEach((fn) => fn({data}));
  }
}

const openStreams = () => FakeEventSource.instances.filter((es) => !es.closed);

beforeEach(() => {
  jest.resetModules();
  FakeEventSource.reset();
});

describe('#211 SSE resilience — token refresh', () => {
  test('token refresh on live SSE: does NOT close the existing connection', () => {
    const {default: realtimeService} = require('../../services/realtimeService');

    realtimeService.setIdentity({token: 'jwt-v1'});
    expect(FakeEventSource.instances).toHaveLength(1);
    const initial = FakeEventSource.instances[0];
    initial._simulateOpen();

    // Token refresh — silentGuestRefresh path
    realtimeService.setIdentity({token: 'jwt-v2'});

    expect(initial.closed).toBe(false);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  test('an identity without a token key leaves the cached token unchanged', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.setIdentity({token: 'jwt-original'});
    FakeEventSource.instances[0]._simulateOpen();

    realtimeService.setIdentity({});

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].closed).toBe(false);
  });
});

describe('#211 SSE resilience — overlap rotate', () => {
  test('uid change: opens NEW SSE first, closes OLD only after new onopen', () => {
    const {default: realtimeService} = require('../../services/realtimeService');

    realtimeService.setIdentity({userId: 'guest'});
    expect(FakeEventSource.instances).toHaveLength(1);
    const oldEs = FakeEventSource.instances[0];
    expect(oldEs.url).toMatch(/user_id=guest/);
    oldEs._simulateOpen();

    realtimeService.setIdentity({userId: 'd68c9dee'});

    expect(FakeEventSource.instances).toHaveLength(2);
    const newEs = FakeEventSource.instances[1];
    expect(newEs.url).toMatch(/user_id=d68c9dee/);
    expect(oldEs.closed).toBe(false); // overlap window

    newEs._simulateOpen();

    expect(oldEs.closed).toBe(true);
    expect(newEs.closed).toBe(false);
  });

  test('uid unchanged: no rotate, no churn', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.setIdentity({userId: 'guest_abc'});
    FakeEventSource.instances[0]._simulateOpen();

    realtimeService.setIdentity({userId: 'guest_abc'});
    realtimeService.setIdentity({userId: 'guest_abc'});

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].closed).toBe(false);
  });

  test('rotate when new EventSource fails to open: keeps OLD alive', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.setIdentity({userId: 'guest'});
    const oldEs = FakeEventSource.instances[0];
    oldEs._simulateOpen();

    realtimeService.setIdentity({userId: 'real-uid'});
    const newEs = FakeEventSource.instances[1];
    newEs._simulateError();

    expect(newEs.closed).toBe(true);
    expect(oldEs.closed).toBe(false);
  });

  test('a new stream base rotates onto that base', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.setIdentity({userId: 'u1', sseBase: 'http://a/api/social'});
    const first = FakeEventSource.instances[0];
    expect(first.url).toMatch(/^http:\/\/a\/api\/social\/events\/stream/);
    first._simulateOpen();

    realtimeService.setIdentity({userId: 'u1', sseBase: 'http://b/api/social'});

    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.instances[1].url).toMatch(/^http:\/\/b\/api\/social\/events\/stream/);
  });
});

describe('SSE resilience — disconnect()', () => {
  test('explicit disconnect closes the live EventSource', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.setIdentity({token: 'jwt-1'});
    FakeEventSource.instances[0]._simulateOpen();

    realtimeService.disconnect();

    expect(FakeEventSource.instances[0].closed).toBe(true);
  });
});

describe('computer-use commentary SSE channel', () => {
  test('registers the existing chat.social named event on the one SSE source', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.setIdentity({userId: 'local-user'});
    const source = FakeEventSource.instances[0];

    expect(source._listeners['chat.social']).toHaveLength(1);
    expect(source._listeners.notification).toHaveLength(1);
    expect(FakeEventSource.instances).toHaveLength(1);
  });
});

describe('canonical credential-mode transitions', () => {
  test('explicit guest mode rotates off a cached cloud token without a delivery gap', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.setIdentity({userId: 'cloud-user', token: 'opaque-cloud-token'});
    const cloudEs = FakeEventSource.instances[0];
    cloudEs._simulateOpen();

    realtimeService.setIdentity({userId: 'guest-uuid', token: null});

    expect(FakeEventSource.instances).toHaveLength(2);
    const guestEs = FakeEventSource.instances[1];
    expect(guestEs.url).toMatch(/user_id=guest-uuid/);
    expect(guestEs.url).not.toMatch(/[?&]token=/);
    expect(cloudEs.closed).toBe(false);

    guestEs._simulateOpen();
    expect(cloudEs.closed).toBe(true);
    expect(guestEs.closed).toBe(false);
  });

  // Measured live 2026-10-03 on /local (bundle main.378a478c.js): the stream
  // opened with no identity, the real identity arrived while it was still
  // connecting, and the server registered `uid=guest` for good while every
  // /chat from the page was user 10202 -- so the page never received its own
  // reply audio.
  test('identity that arrives while the first stream is still connecting rotates it', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.setIdentity({});
    expect(FakeEventSource.instances).toHaveLength(1);
    const anonEs = FakeEventSource.instances[0];
    expect(anonEs.url).toMatch(/user_id=guest/);

    realtimeService.setIdentity({userId: '10202', token: 'tok'});

    expect(FakeEventSource.instances).toHaveLength(2);
    const ownEs = FakeEventSource.instances[1];
    expect(ownEs.url).toMatch(/[?&]token=tok/);
    expect(ownEs.url).toMatch(/user_id=10202/);

    ownEs._simulateOpen();
    expect(anonEs.closed).toBe(true);
    expect(ownEs.closed).toBe(false);
  });

  test('a second identity change supersedes the first pending stream', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.setIdentity({userId: 'guest'});
    const guestEs = FakeEventSource.instances[0];

    realtimeService.setIdentity({userId: 'A'});
    realtimeService.setIdentity({userId: 'B', token: 'tok'});
    const [, aEs, bEs] = FakeEventSource.instances;
    expect(aEs.closed).toBe(true);

    // A late open from the superseded stream must not become the live one.
    aEs._simulateOpen();
    bEs._simulateOpen();
    expect(openStreams()).toEqual([bEs]);
    expect(guestEs.closed).toBe(true);
  });

  test('disconnect also closes a stream still waiting to replace the old one', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.setIdentity({userId: 'guest'});
    realtimeService.setIdentity({userId: '10202', token: 'tok'});
    const pendingEs = FakeEventSource.instances[1];

    realtimeService.disconnect();
    pendingEs._simulateOpen();

    expect(openStreams()).toEqual([]);
  });

  test('disconnect clears the previous bearer before a local guest reconnect', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.setIdentity({token: 'opaque-cloud-token'});
    FakeEventSource.instances[0]._simulateOpen();

    realtimeService.disconnect();
    realtimeService.setIdentity({userId: 'guest-uuid'});

    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.instances[1].url).toMatch(/user_id=guest-uuid/);
    expect(FakeEventSource.instances[1].url).not.toMatch(/[?&]token=/);
  });
});

describe('crossbar worker attachment never touches the stream', () => {
  test('attaching a worker opens no stream', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.attachWorker(new FakeWorker());
    expect(FakeEventSource.instances).toHaveLength(0);
  });

  // The worker's connection status used to open the stream with whatever
  // identity was cached -- `guest` before the provider had set one, or the
  // old owner after disconnect().
  test('worker connection status opens no stream', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    const worker = new FakeWorker();
    realtimeService.attachWorker(worker);

    worker._emit({type: 'CONNECTION_STATUS', payload: 'Connected'});
    worker._emit({type: 'CONNECTION_STATUS', payload: 'Disconnected'});

    expect(FakeEventSource.instances).toHaveLength(0);
  });

  test('worker connection status does not reopen a stream closed by disconnect', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    const worker = new FakeWorker();
    realtimeService.attachWorker(worker);
    realtimeService.setIdentity({userId: 'u1', token: 'tok'});
    realtimeService.disconnect();

    worker._emit({type: 'CONNECTION_STATUS', payload: 'Disconnected'});

    expect(openStreams()).toEqual([]);
  });

  test('worker social events reach subscribers', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    const worker = new FakeWorker();
    realtimeService.attachWorker(worker);
    const cb = jest.fn();
    realtimeService.on('agent_message', cb);

    worker._emit({type: 'SOCIAL_EVENT', payload: {type: 'agent_message', msg_id: 'm1'}});

    expect(cb).toHaveBeenCalledTimes(1);
  });

  // disconnect() is the stream's auth boundary.  It used to also strip the
  // chat page's worker listener, silently cutting its cloud events.
  test('disconnect keeps the attached worker delivering', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    const worker = new FakeWorker();
    realtimeService.attachWorker(worker);
    realtimeService.setIdentity({userId: 'u1'});
    const cb = jest.fn();
    realtimeService.on('agent_message', cb);

    realtimeService.disconnect();
    worker._emit({type: 'SOCIAL_EVENT', payload: {type: 'agent_message', msg_id: 'm2'}});

    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('a detached worker no longer delivers and no longer counts as connected', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    const worker = new FakeWorker();
    realtimeService.attachWorker(worker);
    worker._emit({type: 'CONNECTION_STATUS', payload: 'Connected'});
    expect(realtimeService.connected).toBe(true);
    const cb = jest.fn();
    realtimeService.on('agent_message', cb);

    realtimeService.detachWorker(worker);
    worker._emit({type: 'SOCIAL_EVENT', payload: {type: 'agent_message', msg_id: 'm3'}});

    expect(cb).not.toHaveBeenCalled();
    expect(realtimeService.connected).toBe(false);
  });

  test('detaching a worker that is not attached changes nothing', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    const current = new FakeWorker();
    realtimeService.attachWorker(current);
    const cb = jest.fn();
    realtimeService.on('agent_message', cb);

    realtimeService.detachWorker(new FakeWorker());
    current._emit({type: 'SOCIAL_EVENT', payload: {type: 'agent_message', msg_id: 'm4'}});

    expect(cb).toHaveBeenCalledTimes(1);
  });

  // The chat page replaces its worker whenever the signed-in user changes.
  // Subscribers registered before that kept listening to the terminated one.
  test('subscribers keep receiving after the worker is replaced', () => {
    const {
      default: realtimeService, subscribeChatNew, subscribeCommunity,
    } = require('../../services/realtimeService');
    const first = new FakeWorker();
    realtimeService.attachWorker(first);
    const onChat = jest.fn();
    const onCommunity = jest.fn();
    subscribeChatNew(onChat);
    subscribeCommunity('c1', onCommunity);

    realtimeService.detachWorker(first);
    const second = new FakeWorker();
    realtimeService.attachWorker(second);
    second._emit({
      type: 'DATA_RECEIVED',
      payload: {sourceTopic: 'com.hertzai.hevolve.chat.new.u1', data: {msg_id: 'x'}},
    });
    second._emit({type: 'COMMUNITY_EVENT', payload: {communityId: 'c1', type: 'presence'}});
    first._emit({
      type: 'DATA_RECEIVED',
      payload: {sourceTopic: 'com.hertzai.hevolve.chat.new.u1', data: {msg_id: 'y'}},
    });

    expect(onChat).toHaveBeenCalledTimes(1);
    expect(onChat).toHaveBeenCalledWith({msg_id: 'x'});
    expect(onCommunity).toHaveBeenCalledTimes(1);
  });

  test('a subscriber registered before any worker receives once one attaches', () => {
    const {default: realtimeService, subscribeEncounterMatch} =
      require('../../services/realtimeService');
    const onMatch = jest.fn();
    subscribeEncounterMatch(onMatch);

    const worker = new FakeWorker();
    realtimeService.attachWorker(worker);
    worker._emit({
      type: 'DATA_RECEIVED',
      payload: {sourceTopic: 'com.hevolve.encounter.match.u1', data: {id: 7}},
    });

    expect(onMatch).toHaveBeenCalledWith({id: 7});
  });
});

// The server stamps every frame `id: <epoch>-<seq>` and replays what a stream
// missed when it reopens with ?since=<id> (main.py REPLAY).
describe('resume from the last frame id', () => {
  const since = (es) => new URL(es.url, 'http://x').searchParams.get('since');

  test('a fresh page asks for no replay', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.setIdentity({userId: 'u1'});
    expect(since(FakeEventSource.instances[0])).toBeNull();
  });

  test('a reconnect after an error resumes from the last id it saw', () => {
    jest.useFakeTimers();
    try {
      const {default: realtimeService} = require('../../services/realtimeService');
      realtimeService.setIdentity({userId: 'u1'});
      const first = FakeEventSource.instances[0];
      first._simulateOpen();
      first._message({type: 'connected', resume: 'ep-5'});
      first._fire('chat.response', {msg_id: 'r1', text: 'hi'}, 'ep-7');

      first._simulateError();
      jest.advanceTimersByTime(3000);

      expect(FakeEventSource.instances).toHaveLength(2);
      expect(since(FakeEventSource.instances[1])).toBe('ep-7');
    } finally {
      jest.useRealTimers();
    }
  });

  // The new identity's frames went to nobody until its stream opened; the
  // page's first id bounds the replay to what happened while it was open.
  test('an identity switch resumes the new identity from the page start', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.setIdentity({userId: 'guest'});
    const guestEs = FakeEventSource.instances[0];
    guestEs._simulateOpen();
    guestEs._message({type: 'connected', resume: 'ep-3'});
    guestEs._fire('notification', {msg_id: 'n1'}, 'ep-4');

    realtimeService.setIdentity({userId: '10202', token: 'tok'});

    expect(since(FakeEventSource.instances[1])).toBe('ep-3');
  });

  test('a frame replayed on the next stream is dispatched once', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    const seen = jest.fn();
    realtimeService.on('chat.response', seen);
    realtimeService.setIdentity({userId: 'guest'});
    const oldEs = FakeEventSource.instances[0];
    oldEs._simulateOpen();
    oldEs._fire('chat.response', {msg_id: 'r9', text: 'once'}, 'ep-9');

    realtimeService.setIdentity({userId: '10202'});
    const newEs = FakeEventSource.instances[1];
    newEs._simulateOpen();
    // Past the 10s msg_id window: only the frame id can catch this copy.
    const realNow = Date.now;
    Date.now = () => realNow() + 10 * 60 * 1000;
    try {
      newEs._fire('chat.response', {msg_id: 'r9', text: 'once'}, 'ep-9');
    } finally {
      Date.now = realNow;
    }

    expect(seen).toHaveBeenCalledTimes(1);
  });

  // Review of 3e536fb4 (B1): the new stream's hello carried the last id the
  // server recorded for ANY user.  Marked as seen, it made the old stream's
  // real frame with that id -- still on its way -- look like a duplicate.
  test("the hello's resume point never swallows a real frame", () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    const seen = jest.fn();
    realtimeService.on('chat.response', seen);
    realtimeService.setIdentity({userId: 'guest'});
    const oldEs = FakeEventSource.instances[0];
    oldEs._simulateOpen();

    realtimeService.setIdentity({userId: '10202'});
    const newEs = FakeEventSource.instances[1];
    // With the id on the hello too (an older server's shape): the client must
    // still not mark it seen.  Without it this test passed on 3e536fb4.
    newEs._message({type: 'connected', resume: 'E-10'}, 'E-10');
    oldEs._fire('chat.response', {msg_id: 'r10', text: 'late'}, 'E-10');

    expect(seen).toHaveBeenCalledTimes(1);
  });

  // Review of 3e536fb4 (M1): a token refresh is not an identity change, so
  // the next reconnect resumes from the last id, not the page start.
  test('a token refresh keeps resuming from the last id', () => {
    jest.useFakeTimers();
    try {
      const {default: realtimeService} = require('../../services/realtimeService');
      realtimeService.setIdentity({userId: 'u1', token: 't1'});
      const es = FakeEventSource.instances[0];
      es._simulateOpen();
      es._message({type: 'connected', resume: 'ep-1'});
      es._fire('chat.response', {msg_id: 'r400'}, 'ep-400');
      es._fire('chat.response', {msg_id: 'r500'}, 'ep-500');

      realtimeService.setIdentity({userId: 'u1', token: 't2'});
      expect(FakeEventSource.instances).toHaveLength(1);
      es._simulateError();
      jest.advanceTimersByTime(3000);

      expect(since(FakeEventSource.instances[1])).toBe('ep-500');
    } finally {
      jest.useRealTimers();
    }
  });

  test('frames without an id (an older server) are still delivered', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    const seen = jest.fn();
    realtimeService.on('chat.response', seen);
    realtimeService.setIdentity({userId: 'u1'});
    const es = FakeEventSource.instances[0];
    es._simulateOpen();
    es._fire('chat.response', {msg_id: 'a'});
    es._fire('chat.response', {msg_id: 'b'});

    expect(seen).toHaveBeenCalledTimes(2);
  });
});

describe('one retry at a time', () => {
  // Review of bf57124e: a failed rotation scheduled a retry, a newer identity
  // rotated at once, and the stale retry rotated again 3s later.
  test('a newer identity cancels the retry of a failed rotation', () => {
    jest.useFakeTimers();
    try {
      const {default: realtimeService} = require('../../services/realtimeService');
      realtimeService.setIdentity({userId: 'guest'});
      FakeEventSource.instances[0]._simulateOpen();
      realtimeService.setIdentity({userId: 'A'});
      FakeEventSource.instances[1]._simulateError();

      realtimeService.setIdentity({userId: 'B'});
      expect(FakeEventSource.instances).toHaveLength(3);
      jest.advanceTimersByTime(3000);

      expect(FakeEventSource.instances).toHaveLength(3);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('worker topic subscriptions follow the worker', () => {
  const subscribesTo = (worker, type) =>
    worker.postMessage.mock.calls.map(([m]) => m).filter((m) => m.type === type);

  test('a community subscription is re-sent to a replacement worker', () => {
    const {default: realtimeService, subscribeCommunity} =
      require('../../services/realtimeService');
    const first = new FakeWorker();
    realtimeService.attachWorker(first);
    subscribeCommunity('c1', jest.fn());
    realtimeService.detachWorker(first);

    const second = new FakeWorker();
    realtimeService.attachWorker(second);

    expect(subscribesTo(second, 'COMMUNITY_SUBSCRIBE'))
      .toEqual([{type: 'COMMUNITY_SUBSCRIBE', payload: {communityId: 'c1'}}]);
  });

  test('a subscription made before any worker is sent when one attaches', () => {
    const {default: realtimeService, subscribeCommunity} =
      require('../../services/realtimeService');
    subscribeCommunity('c2', jest.fn());

    const worker = new FakeWorker();
    realtimeService.attachWorker(worker);

    expect(subscribesTo(worker, 'COMMUNITY_SUBSCRIBE')).toHaveLength(1);
  });

  test('a released subscription is not re-sent', () => {
    const {default: realtimeService, subscribeCommunity} =
      require('../../services/realtimeService');
    const unsubscribe = subscribeCommunity('c3', jest.fn());
    unsubscribe();

    const worker = new FakeWorker();
    realtimeService.attachWorker(worker);

    expect(subscribesTo(worker, 'COMMUNITY_SUBSCRIBE')).toEqual([]);
  });

  test('re-attaching the same worker sends nothing twice', () => {
    const {default: realtimeService, subscribeCommunity} =
      require('../../services/realtimeService');
    subscribeCommunity('c4', jest.fn());
    const worker = new FakeWorker();
    realtimeService.attachWorker(worker);
    realtimeService.attachWorker(worker);

    expect(subscribesTo(worker, 'COMMUNITY_SUBSCRIBE')).toHaveLength(1);
  });

  test('game sessions ride the same worker wiring', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    const {default: game} = require('../../services/gameRealtimeService');
    const onMove = jest.fn();
    expect(game.isAvailable()).toBe(false);
    game.subscribe('s1', onMove);

    const worker = new FakeWorker();
    realtimeService.attachWorker(worker);
    expect(game.isAvailable()).toBe(true);
    expect(subscribesTo(worker, 'GAME_SUBSCRIBE'))
      .toEqual([{type: 'GAME_SUBSCRIBE', payload: {sessionId: 's1'}}]);
    worker._emit({type: 'GAME_EVENT', payload: {sessionId: 's1', type: 'move'}});
    expect(onMove).toHaveBeenCalledTimes(1);

    realtimeService.detachWorker(worker);
    expect(game.isAvailable()).toBe(false);
    expect(game.publish('s1', {type: 'move'})).toBe(false);
  });
});

// One owner per concern, enforced on the source rather than hoped for.
describe('single owner of the stream identity', () => {
  const SRC = path.resolve(__dirname, '../..');

  function sourceFiles(dir) {
    return fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === '__tests__' ? [] : sourceFiles(full);
      }
      return /\.(js|jsx)$/.test(entry.name) ? [full] : [];
    });
  }

  function callersOf(pattern) {
    return sourceFiles(SRC)
      .filter((file) => pattern.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC, file).split(path.sep).join('/'))
      .sort();
  }

  test('only RealtimeProvider and the embed transport set the identity', () => {
    expect(callersOf(/\.setIdentity\(/)).toEqual([
      'contexts/RealtimeContext.js',
      'embed/transports/gatewayTransport.js',
    ]);
  });

  test('only the chat page attaches and detaches the crossbar worker', () => {
    expect(callersOf(/\.(attachWorker|detachWorker)\(/)).toEqual(['pages/Demopage.js']);
  });

  test('the removed combined entry points have no callers', () => {
    expect(callersOf(/realtimeService\.(init|connect)\(|\brt\.(init|connect)\(/)).toEqual([]);
  });

  // The game service had its own listener on the chat page's worker, bound
  // once and never moved to a replacement worker.
  test('the game service binds no worker listener of its own', () => {
    expect(callersOf(/initGameRealtime/)).toEqual([]);
    const game = fs.readFileSync(path.join(SRC, 'services/gameRealtimeService.js'), 'utf8');
    expect(game).not.toMatch(/addEventListener|postMessage/);
  });
});
