/* eslint-disable */
import React from 'react';
import {render, screen} from '@testing-library/react';

/**
 * realtimeService — the HARTOS A2UI envelope renders as its CARD.
 *
 * Owner ruling 2026-09-26: on the desktop, Liquid UI IS the Demopage agent
 * component.  HARTOS now registers one LiquidUIService in the backend
 * process, and its agent_ui_update emits on the EventBus, which the SSE
 * bridge delivers as:
 *
 *   event: agent.ui.update
 *   data:  {agent_id, component: {type, title, message, ...}, user_id, msg_id}
 *
 * That is the ENVELOPE Android's AutobahnConnectionManager already unwraps
 * (it reads kwargs.component).  realtimeService forwarded it to AgentOverlay
 * whole, so the overlay saw type 'agent.ui.update' (the channel name), hit
 * no renderer, and would have printed the raw JSON.  These tests pin the
 * unwrap: the overlay receives the component, flat, exactly the shape every
 * other agent card already arrives in.
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

  /** The browser delivering a named SSE event. */
  _fire(name, payload) {
    (this._listeners[name] || []).forEach((fn) =>
      fn({data: JSON.stringify(payload)}),
    );
  }
}
FakeEventSource.instances = [];
global.EventSource = FakeEventSource;

jest.mock('../../config/apiBase', () => ({
  API_BASE_URL: '',
  SOCIAL_API_URL: '/api/social',
}));
jest.mock('../../constants/events', () => ({NUNBA_CAMERA_CONSENT: 'evt'}));
jest.mock('qrcode.react', () => ({QRCodeSVG: () => null}));
jest.mock('../../services/socialApi', () => ({
  consentApi: {grant: jest.fn(() => Promise.resolve({}))},
  notificationsApi: {markRead: jest.fn(() => Promise.resolve({}))},
}));

beforeEach(() => {
  FakeEventSource.instances = [];
});

/** Exactly what HARTOS LiquidUIService.agent_ui_update hands the EventBus,
 *  as Nunba main.broadcast_sse_event serialises it. */
function envelope(overrides) {
  return {
    agent_id: 'model_ready',
    component: {
      type: 'notification',
      title: 'Capability Ready',
      message: 'the vision model is ready',
      severity: 'success',
      _ts: 1790000000.5,
      _agent_id: 'model_ready',
    },
    user_id: 'owner-1',
    msg_id: 'a2ui-envelope-1',
    ...overrides,
  };
}

/** A realtimeService with its own module state (dedup map, EventSource)
 *  per test.  `shared` instead takes the module every other import in this
 *  file sees, which is what the overlay subscribes to. */
function openSse({shared = false} = {}) {
  let realtimeService;
  if (shared) {
    realtimeService = require('../../services/realtimeService').default;
  } else {
    jest.isolateModules(() => {
      realtimeService = require('../../services/realtimeService').default;
    });
  }
  realtimeService.setIdentity({userId: 'owner-1'});
  const es = FakeEventSource.instances[0];
  es._simulateOpen();
  const seen = [];
  const bell = [];
  realtimeService.on('agent.ui.update', (p) => seen.push(p));
  realtimeService.on('notification', (p) => bell.push(p));
  return {realtimeService, es, seen, bell};
}

describe('the A2UI envelope reaches the overlay as its component', () => {
  test('the overlay receives the component flat, not the envelope', () => {
    const {es, seen} = openSse();
    es._fire('agent.ui.update', envelope());

    expect(seen).toHaveLength(1);
    expect(seen[0].type).toBe('notification');
    expect(seen[0].title).toBe('Capability Ready');
    expect(seen[0].message).toBe('the vision model is ready');
    // The envelope's identity rides along: the dedup key, the pushing
    // agent and the person it is for.
    expect(seen[0].msg_id).toBe('a2ui-envelope-1');
    expect(seen[0].agent_id).toBe('model_ready');
    expect(seen[0].user_id).toBe('owner-1');
    expect(seen[0].component).toBeUndefined();
  });

  test("a card's own user_id survives the unwrap; the envelope's only fills a gap", () => {
    // Review of HARTOS a0ecafe09 / Nunba 53927f85: the unwrap overwrote a
    // card's own user_id with the envelope's.  A card can name its subject
    // (the camera consent card's user_id is what the overlay hands
    // NUNBA_CAMERA_CONSENT), so, like agent_id, the card's value wins.
    const {es, seen} = openSse();
    es._fire('agent.ui.update', envelope({
      msg_id: 'uid-own',
      component: {type: 'approval', action: 'enable_camera',
        user_id: 'subject-9'},
    }));
    es._fire('agent.ui.update', envelope({msg_id: 'uid-gap'}));
    expect(seen).toHaveLength(2);
    expect(seen[0].user_id).toBe('subject-9');
    expect(seen[1].user_id).toBe('owner-1');
  });

  test('an agent card is not also re-announced on its own type channel', () => {
    // A notification CARD from an agent belongs to the overlay only.  Were
    // it also emitted as 'notification', every listener on that channel
    // (the notifications bell, its sub-type dispatch) would receive an
    // agent card it did not ask for.
    const {es, bell} = openSse();
    es._fire('agent.ui.update', envelope());
    expect(bell).toHaveLength(0);
  });

  test('the same envelope twice is one card (msg_id dedup survives the unwrap)', () => {
    const {es, seen} = openSse();
    es._fire('agent.ui.update', envelope());
    es._fire('agent.ui.update', envelope());
    expect(seen).toHaveLength(1);
  });

  test('a flat agent card on the channel is untouched', () => {
    // Pre-existing producers send the card flat; the unwrap must not
    // disturb them.
    const {es, seen} = openSse();
    es._fire('agent.ui.update', {
      type: 'approval', agent_id: 'vision', action: 'enable_camera',
      msg_id: 'flat-1', user_id: 'owner-1',
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].type).toBe('approval');
    expect(seen[0].action).toBe('enable_camera');
  });

  test('only the agent.ui.update channel is unwrapped', () => {
    // A frame on another channel that happens to carry a `component` field
    // is that channel's event, not an agent card.
    const {es, seen, bell} = openSse();
    es._fire('notification', {
      type: 'notification', title: 'Build finished', msg_id: 'n-1',
      user_id: 'owner-1', component: {type: 'card', title: 'inner'},
    });
    expect(bell).toHaveLength(1);
    expect(bell[0].title).toBe('Build finished');
    expect(seen.filter((p) => p.title === 'inner')).toHaveLength(0);
  });

  test('the Demopage agent component RENDERS the pushed card', async () => {
    // The overlay and this test must share ONE realtimeService and ONE React.
    const {es} = openSse({shared: true});
    const {default: AgentOverlay} =
      require('../../components/AgentOverlay/AgentOverlay');
    render(<AgentOverlay navigate={jest.fn()} />);

    es._fire('agent.ui.update', envelope({msg_id: 'a2ui-render-1'}));

    expect(await screen.findByText('Capability Ready')).toBeInTheDocument();
    expect(await screen.findByText('the vision model is ready'))
      .toBeInTheDocument();
    // Not the raw envelope printed by the overlay's fallback branch.
    expect(screen.queryByText(/"component"/)).toBeNull();
    // First import of the overlay (MUI) is slow when the suite runs beside
    // others; 5 s timed out under a parallel run.  Measured 2026-09-27 on
    // one desktop, identical code, back to back: 14 s, 15 s, 42 s, 52 s,
    // 54 s.  30 s sat inside that spread and failed about half the runs,
    // so the cap sits well above it: a timeout here means a hang, not MUI.
  }, 120000);
});
