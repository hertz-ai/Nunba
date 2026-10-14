/**
 * realtimeService — every named SSE event a component subscribes to is
 * registered on the EventSource.
 *
 * EventSource delivers `event: <name>` frames only to a listener registered
 * for that exact name; onmessage never sees them.  Two events HARTOS sends
 * under their own name had subscribers and no registration, so the
 * subscribers could never fire over SSE:
 *   - 'notification.read'  (NotificationBell: unread badge drops on every
 *     open device)
 *   - 'capability_update'  (Demopage: "voice/vision is ready" toast)
 * Neither payload carries msg_id/request_id/id, so the dedupe key is a
 * content hash; it must still tell two different events apart.
 */

class FakeEventSource {
  constructor(url) {
    this.url = url;
    this.onopen = null;
    this.onerror = null;
    this.onmessage = null;
    this._listeners = {};
    FakeEventSource.instances.push(this);
  }

  addEventListener(type, fn) {
    (this._listeners[type] = this._listeners[type] || []).push(fn);
  }

  removeEventListener() {}

  close() {}

  _simulateOpen() {
    if (this.onopen) this.onopen({});
  }

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
  realtimeService.setIdentity({userId: 'owner-1'});
  const es = FakeEventSource.instances[0];
  es._simulateOpen();
  return {es, realtimeService};
}

describe('named SSE events with component subscribers', () => {
  test('notification.read reaches its subscriber', () => {
    const {es, realtimeService} = openSse();
    const seen = [];
    realtimeService.on('notification.read', (p) => seen.push(p));

    es._fire('notification.read', {user_id: 'owner-1', ids: ['n1', 'n2']});

    expect(seen).toHaveLength(1);
    expect(seen[0].ids).toEqual(['n1', 'n2']);
  });

  test('capability_update reaches its subscriber', () => {
    const {es, realtimeService} = openSse();
    const seen = [];
    realtimeService.on('capability_update', (p) => seen.push(p));

    es._fire('capability_update', {
      capability: 'tts', status: 'ready', name: 'kokoro',
    });

    expect(seen).toHaveLength(1);
    expect(seen[0].capability).toBe('tts');
  });

  test('two different mark-read batches inside the window both arrive', () => {
    const {es, realtimeService} = openSse();
    const seen = [];
    realtimeService.on('notification.read', (p) => seen.push(p));

    es._fire('notification.read', {user_id: 'owner-1', ids: ['n1']});
    es._fire('notification.read', {user_id: 'owner-1', ids: ['n2']});

    expect(seen.map((p) => p.ids[0])).toEqual(['n1', 'n2']);
  });

  test('two different capabilities ready inside the window both arrive', () => {
    const {es, realtimeService} = openSse();
    const seen = [];
    realtimeService.on('capability_update', (p) => seen.push(p));

    es._fire('capability_update', {
      capability: 'tts', status: 'ready', name: 'kokoro',
    });
    es._fire('capability_update', {
      capability: 'stt', status: 'ready', name: 'whisper',
    });

    expect(seen.map((p) => p.capability)).toEqual(['tts', 'stt']);
  });

  test('the same capability event re-sent inside the window arrives once', () => {
    const {es, realtimeService} = openSse();
    const seen = [];
    realtimeService.on('capability_update', (p) => seen.push(p));
    const evt = {capability: 'tts', status: 'ready', name: 'kokoro'};

    es._fire('capability_update', evt);
    es._fire('capability_update', evt);

    expect(seen).toHaveLength(1);
  });
});
