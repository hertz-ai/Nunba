/**
 * realtimeService.resilience.test.js — #211 SSE resilience.
 *
 * Two invariants under test:
 *   A) connect(newToken) MUST NOT close the live EventSource.  Token
 *      refresh is a credential rotation, not an identity change; the
 *      server already auth'd this connection at open time and routes
 *      events by the uid it bound to.
 *   B) init({userId: newUid}) when uid actually changes MUST open a
 *      NEW EventSource FIRST, await its onopen, THEN close the old.
 *      Eliminates the 3s SSE_RECONNECT_DELAY gap that previously
 *      dropped HARTOS broadcasts (especially TTS audio_url) when the
 *      broker had `client_count=0` during the swap.
 *
 * Subject under test: landing-page/src/services/realtimeService.js
 *   - connect(token)               (#211 — no _closeSSE on token change)
 *   - init({userId})               (#211 — calls _rotateSSE on uid change)
 *   - _rotateSSE()                 (#211 — overlap reconnect)
 */

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

  static reset() {
    FakeEventSource.instances = [];
  }
}
FakeEventSource.instances = [];
global.EventSource = FakeEventSource;

beforeEach(() => {
  jest.resetModules();
  FakeEventSource.reset();
});

describe('#211 SSE resilience — connect(token)', () => {
  test('token refresh on live SSE: does NOT close the existing connection', () => {
    const {default: realtimeService} = require('../../services/realtimeService');

    // Open the initial SSE
    realtimeService.connect('jwt-v1');
    expect(FakeEventSource.instances).toHaveLength(1);
    const initial = FakeEventSource.instances[0];
    initial._simulateOpen();
    expect(initial.closed).toBe(false);

    // Token refresh — silentGuestRefresh path
    realtimeService.connect('jwt-v2');

    // The original EventSource must still be open and live.
    expect(initial.closed).toBe(false);
    // No new EventSource was created — same connection, new token cached.
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  test('null/undefined token leaves cached _token unchanged', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.connect('jwt-original');
    FakeEventSource.instances[0]._simulateOpen();

    realtimeService.connect(null);
    realtimeService.connect(undefined);

    // Still no churn.
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].closed).toBe(false);
  });
});

describe('#211 SSE resilience — init({userId}) overlap rotate', () => {
  test('uid change: opens NEW SSE first, closes OLD only after new onopen', () => {
    const {default: realtimeService} = require('../../services/realtimeService');

    // Initial bind as 'guest' sentinel
    realtimeService.init(null, {userId: 'guest'});
    expect(FakeEventSource.instances).toHaveLength(1);
    const oldEs = FakeEventSource.instances[0];
    expect(oldEs.url).toMatch(/user_id=guest/);
    oldEs._simulateOpen();
    expect(oldEs.closed).toBe(false);

    // Real uid arrives (guestRegister returned per-guest UUID).
    realtimeService.init(null, {userId: 'd68c9dee'});

    // NEW EventSource is created immediately, but OLD is still live.
    expect(FakeEventSource.instances).toHaveLength(2);
    const newEs = FakeEventSource.instances[1];
    expect(newEs.url).toMatch(/user_id=d68c9dee/);
    expect(newEs.closed).toBe(false);
    expect(oldEs.closed).toBe(false);  // critical — overlap window

    // Server delivers an event for the new uid during overlap.
    // (Real broker keys subscribers by uid; both connections coexist
    // briefly, server routes each event to whichever matches.)

    // Fire newEs.onopen — this is when the swap completes.
    newEs._simulateOpen();

    // OLD closed, NEW is the live one.
    expect(oldEs.closed).toBe(true);
    expect(newEs.closed).toBe(false);
  });

  test('uid unchanged: no rotate, no churn', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.init(null, {userId: 'guest_abc'});
    FakeEventSource.instances[0]._simulateOpen();

    // Same uid again (e.g. session re-sync useEffect re-firing).
    realtimeService.init(null, {userId: 'guest_abc'});
    realtimeService.init(null, {userId: 'guest_abc'});

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].closed).toBe(false);
  });

  test('rotate when new EventSource fails to open: keeps OLD alive', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.init(null, {userId: 'guest'});
    const oldEs = FakeEventSource.instances[0];
    oldEs._simulateOpen();

    realtimeService.init(null, {userId: 'real-uid'});
    expect(FakeEventSource.instances).toHaveLength(2);
    const newEs = FakeEventSource.instances[1];

    // Simulate the new connection failing to establish.
    newEs._simulateError();

    // newEs was closed by the rotate's onerror handler.
    expect(newEs.closed).toBe(true);
    // OLD must still be live — multitenancy: events for 'guest' still
    // get delivered until the next rotate attempt succeeds.
    expect(oldEs.closed).toBe(false);
  });
});

describe('#211 SSE resilience — disconnect() still works', () => {
  test('explicit disconnect closes the live EventSource', () => {
    const {default: realtimeService} = require('../../services/realtimeService');
    realtimeService.connect('jwt-1');
    FakeEventSource.instances[0]._simulateOpen();

    realtimeService.disconnect();

    expect(FakeEventSource.instances[0].closed).toBe(true);
  });
});
