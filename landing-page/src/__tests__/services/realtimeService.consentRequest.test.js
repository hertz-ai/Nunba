/**
 * realtimeService — a HARTOS consent ask reaches the agent overlay.
 *
 * AgentOverlay renders only what realtimeService emits on
 * 'agent.ui.update'.  _dispatchSocialPayload sent a typed payload there
 * only when it carried an agent_id, so an ask for every agent never
 * showed: the screen-capture ask (VisionService, agent_id None) and a
 * computer-control ask from an agent that could not be identified.
 *
 * HARTOS integrations/social/realtime.on_notification delivers the ask
 * as SSE event 'notification' with {user_id, msg_id, **ask}, where the
 * ask is {type: 'consent.request', consent_type, agent_id, scope, reason}.
 */

class FakeEventSource {
  constructor(url) {
    this.url = url;
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
  }

  _simulateOpen() {
    if (this.onopen) this.onopen({});
  }

  // The browser delivering a named SSE event.
  _fire(name, payload) {
    (this._listeners[name] || []).forEach((fn) =>
      fn({data: JSON.stringify(payload)}),
    );
  }
}
FakeEventSource.instances = [];
global.EventSource = FakeEventSource;

beforeEach(() => {
  jest.resetModules();
  FakeEventSource.instances = [];
});

function openSse() {
  const {default: realtimeService} = require('../../services/realtimeService');
  realtimeService.init(null, {userId: 'owner-1'});
  const es = FakeEventSource.instances[0];
  es._simulateOpen();
  const seen = [];
  realtimeService.on('agent.ui.update', (payload) => seen.push(payload));
  return {es, seen};
}

function ask(overrides) {
  return {
    user_id: 'owner-1',
    msg_id: 'consent.request:row-1',
    type: 'consent.request',
    consent_type: 'screen_capture',
    agent_id: null,
    scope: '*',
    reason: '',
    ...overrides,
  };
}

describe('consent.request reaches agent.ui.update', () => {
  test('an ask for every agent (no agent_id) reaches the overlay', () => {
    const {es, seen} = openSse();
    es._fire('notification', ask());

    expect(seen).toHaveLength(1);
    expect(seen[0].type).toBe('consent.request');
    expect(seen[0].consent_type).toBe('screen_capture');
  });

  test('an ask naming an agent reaches the overlay once', () => {
    const {es, seen} = openSse();
    es._fire('notification', ask({
      consent_type: 'computer_control',
      agent_id: '88659566083',
    }));

    expect(seen).toHaveLength(1);
  });

  test('the same ask re-sent inside the dedupe window reaches it once', () => {
    const {es, seen} = openSse();
    es._fire('notification', ask());
    es._fire('notification', ask());

    expect(seen).toHaveLength(1);
  });

  test('a plain notification still does not reach the overlay', () => {
    const {es, seen} = openSse();
    es._fire('notification', {
      user_id: 'owner-1',
      msg_id: 'n-1',
      title: 'Hello',
      message: 'World',
    });

    expect(seen).toHaveLength(0);
  });
});
