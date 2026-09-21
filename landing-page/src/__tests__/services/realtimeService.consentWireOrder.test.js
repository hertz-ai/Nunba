/**
 * realtimeService — the ask survives what the SERVER actually sends.
 *
 * realtimeService.consentRequest.test.js fires ONE hand-written
 * 'notification' frame and passes.  The server does not send one frame.
 * Captured 2026-09-21 by standing in for broadcast_sse_event and calling
 * the real ConsentService.request_consent, one ask puts TWO frames on the
 * wire, in this order, carrying the SAME msg_id:
 *
 *   1. event 'chat.social'   {type:'consent.request', msg_id, ...}
 *   2. event 'notification'  {user_id, msg_id, type:'consent.request', ...}
 *
 * The shared msg_id is deliberate: _emit passes a stable id so a re-ask
 * collapses to one card.  But _dispatchSocialPayload calls _isDuplicate
 * FIRST, so the second frame is dropped as a duplicate of the first.  The
 * card therefore depends entirely on the FIRST frame being routed, and no
 * test covered that frame at all.
 *
 * The owner reported 2026-09-21 that the floating consent card never
 * displayed, while the server log showed targeted=2 delivered queues for
 * the right user.  These tests pin the wire order so that gap cannot
 * reopen: a change that makes the first frame stop routing would leave the
 * old single-frame test green.
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

  /** The browser delivering a named SSE event.  A name with no registered
   *  listener is DROPPED, exactly as EventSource does. */
  _fire(name, payload) {
    (this._listeners[name] || []).forEach((fn) =>
      fn({data: JSON.stringify(payload)}),
    );
  }

  hasListener(name) {
    return (this._listeners[name] || []).length > 0;
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
  realtimeService.on('agent.ui.update', (p) => seen.push(p));
  return {es, seen};
}

const MSG_ID = 'consent.request:c3aef06d-119d-4f5b-8f01-6eb967c01e3d';

/** Frame 1, verbatim from the capture. */
function chatSocialFrame() {
  return {
    type: 'consent.request',
    msg_id: MSG_ID,
    consent_type: 'device_access',
    agent_id: null,
    scope: `device:${'ab'.repeat(32)}`,
    reason: 'A phone calling itself "Test" asks to use this computer\'s agents from the network.',
    requester_name: 'Test',
    requester_fingerprint: 'abab abab abab abab',
    user_id: 'owner-1',
  };
}

/** Frame 2, verbatim from the capture.  Same msg_id as frame 1. */
function notificationFrame() {
  return {
    user_id: 'owner-1',
    msg_id: MSG_ID,
    type: 'consent.request',
    consent_type: 'device_access',
    agent_id: null,
    scope: `device:${'ab'.repeat(32)}`,
    reason: 'A phone calling itself "Test" asks to use this computer\'s agents from the network.',
    requester_name: 'Test',
    requester_fingerprint: 'abab abab abab abab',
  };
}

describe('the ask survives the real wire order', () => {
  test('both frames in order still raise exactly one card', () => {
    const {es, seen} = openSse();
    es._fire('chat.social', chatSocialFrame());
    es._fire('notification', notificationFrame());

    expect(seen).toHaveLength(1);
    expect(seen[0].type).toBe('consent.request');
    expect(seen[0].consent_type).toBe('device_access');
    expect(seen[0].requester_fingerprint).toBe('abab abab abab abab');
  });

  test('the FIRST frame alone raises the card', () => {
    // The one that matters.  Whatever follows shares its msg_id and is
    // deduped, so if chat.social ever stops routing, nothing renders and
    // the single-frame test stays green.
    const {es, seen} = openSse();
    es._fire('chat.social', chatSocialFrame());
    expect(seen).toHaveLength(1);
  });

  test('the second frame alone would also have raised it', () => {
    // Proves the two are interchangeable, so the order is not load-bearing
    // for correctness -- only for which one gets deduped.
    const {es, seen} = openSse();
    es._fire('notification', notificationFrame());
    expect(seen).toHaveLength(1);
  });

  test('every event name the server sends has a listener registered', () => {
    // EventSource silently discards a named event with no listener, which
    // this file's siblings already document twice (chat.response 2026-05-14,
    // the camera card 2026-08-22).  The server also emits a frame NAMED
    // 'consent.request' via the event-bus leg; if that were ever the only
    // frame, nothing would arrive at all.
    const {es} = openSse();
    ['chat.social', 'notification', 'agent.ui.update'].forEach((name) => {
      expect(es.hasListener(name)).toBe(true);
    });
  });

  test('a re-ask outside the dedupe window raises the card again', () => {
    // request_consent re-emits the SAME msg_id on every poll so a UI that
    // connected late still gets the card.  That only works if the dedupe
    // eventually lets one through.
    const {es, seen} = openSse();
    es._fire('chat.social', chatSocialFrame());
    const realNow = Date.now;
    Date.now = () => realNow() + 10 * 60 * 1000;
    try {
      es._fire('chat.social', chatSocialFrame());
    } finally {
      Date.now = realNow;
    }
    expect(seen).toHaveLength(2);
  });
});
