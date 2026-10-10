/* eslint-disable */
import React from 'react';
import {render, screen} from '@testing-library/react';

/**
 * realtimeService — a card on the user's OWN stream renders as its card.
 *
 * HARTOS liquid_ui_service.push_agent_ui has two legs.  The shell leg emits
 * {agent_id, component, user_id, msg_id} on `agent.ui.update`
 * (realtimeService.agentUiEnvelope.test.js).  The per-user leg, the only one
 * a node without a shell has (the cloud gateway the McGroce embed talks to),
 * publishes on the user's `chat.social` channel:
 *
 *   event: chat.social
 *   data:  {type: 'agent_ui_update', agent_id, component: {type, ...}, user_id}
 *
 * Measured 2026-10-10 with the real commerce tools and the real
 * push_agent_ui / MessageBus (HARTOS task #132): that is the exact frame, and
 * it carries no msg_id.  Two things went wrong with it here:
 *
 *   1. The envelope's own type is `agent_ui_update`, so the unwrap (which
 *      looked for the channel name `agent.ui.update`) left it whole, the
 *      overlay saw a type with no renderer and printed the raw JSON.
 *   2. With no msg_id the dedup key was a hash of type + agent id + message
 *      text, which does not look inside `component`: every card from the same
 *      agent inside the 10 s window after the first was dropped as a repeat
 *      (a search pushes three product cards in one go).
 *
 * One envelope rule for both legs: an A2UI envelope is known by its own type,
 * `agent_ui_update` or `agent.ui.update`, and dedup keys on the card.
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

/** The crossbar worker as realtimeService.attachWorker sees it. */
class FakeWorker {
  constructor() {
    this._listeners = [];
  }

  addEventListener(type, fn) {
    if (type === 'message') this._listeners.push(fn);
  }

  removeEventListener(type, fn) {
    this._listeners = this._listeners.filter((f) => f !== fn);
  }

  postMessage() {}

  /** The worker posting one message to the page. */
  _emit(data) {
    this._listeners.forEach((fn) => fn({data}));
  }
}

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

const SHOPPER = 'mcg-4242';

/** The per-user frame as push_agent_ui publishes it, byte for byte in shape:
 *  no msg_id, the card carries _ts and _agent_id. */
function perUserEnvelope(card, overrides) {
  return {
    type: 'agent_ui_update',
    agent_id: 'mcgroce',
    component: {
      type: 'product_card',
      name: 'Toned Milk 500 ml',
      price: 28.0,
      currency: 'INR',
      image: 'https://img.example/milk.png',
      image_url: 'https://img.example/milk.png',
      rating: null,
      description: 'Fresh toned milk',
      product_id: 101,
      category_id: 5,
      buy_action: 'cart.add',
      agent_id: 'mcgroce',
      _ts: 1791618793.7880187,
      _agent_id: 'mcgroce',
      ...card,
    },
    user_id: SHOPPER,
    ...overrides,
  };
}

/** A realtimeService with its own module state per test, or the module the
 *  overlay imports (`shared`). */
function openSse({shared = false} = {}) {
  let realtimeService;
  if (shared) {
    realtimeService = require('../../services/realtimeService').default;
  } else {
    jest.isolateModules(() => {
      realtimeService = require('../../services/realtimeService').default;
    });
  }
  realtimeService.setIdentity({userId: SHOPPER});
  const es = FakeEventSource.instances[0];
  es._simulateOpen();
  const seen = [];
  realtimeService.on('agent.ui.update', (p) => seen.push(p));
  return {realtimeService, es, seen};
}

describe("a card on the user's own chat.social stream", () => {
  test('reaches the overlay as its card, not as the envelope', () => {
    const {es, seen} = openSse();
    es._fire('chat.social', perUserEnvelope());

    expect(seen).toHaveLength(1);
    expect(seen[0].type).toBe('product_card');
    expect(seen[0].name).toBe('Toned Milk 500 ml');
    expect(seen[0].agent_id).toBe('mcgroce');
    expect(seen[0].user_id).toBe(SHOPPER);
    expect(seen[0].component).toBeUndefined();
  });

  test('every card from one agent inside the dedup window is shown', () => {
    // commerce_search_catalog pushes up to three product cards in one call,
    // and two cart changes seconds apart push two cart cards that differ in
    // nothing the old hash read (no name, no message): only their push time.
    const {es, seen} = openSse();
    es._fire('chat.social', perUserEnvelope({name: 'Milk 0', product_id: 100, _ts: 1791618793.1}));
    es._fire('chat.social', perUserEnvelope({name: 'Milk 1', product_id: 101, _ts: 1791618793.2}));
    es._fire('chat.social', perUserEnvelope({name: 'Milk 2', product_id: 102, _ts: 1791618793.3}));
    const cart = (total, ts) => perUserEnvelope({
      type: 'cart', name: undefined, price: undefined, product_id: undefined,
      items: [{item_id: 1, name: 'Milk', quantity: total / 28, price: 28}],
      total, checkout_action: 'checkout.start', _ts: ts,
    });
    es._fire('chat.social', cart(28, 1791618795.0));
    es._fire('chat.social', cart(56, 1791618796.0));

    expect(seen.filter((c) => c.type === 'product_card').map((c) => c.name))
      .toEqual(['Milk 0', 'Milk 1', 'Milk 2']);
    expect(seen.filter((c) => c.type === 'cart').map((c) => c.total)).toEqual([28, 56]);
  });

  test('one push on both transports is one card', () => {
    // HARTOS MessageBus.publish sends one per-user push down two legs with
    // different shapes: the SSE leg (_route_sse) carries the dict as is, the
    // crossbar leg (_route_crossbar) stamps the bus msg_id on its copy
    // (data.setdefault('msg_id', ...)).  The page gets both, from the stream
    // and from the worker; the same card, the same _ts, one with an id.
    const {realtimeService, es, seen} = openSse();
    const worker = new FakeWorker();
    realtimeService.attachWorker(worker);

    es._fire('chat.social', perUserEnvelope());
    worker._emit({type: 'SOCIAL_EVENT',
      payload: perUserEnvelope({}, {msg_id: '3f2a9c1e5b7d4e60'})});

    expect(seen).toHaveLength(1);
    expect(seen[0].name).toBe('Toned Milk 500 ml');
  });

  test('the same stream frame twice is one card', () => {
    const {es, seen} = openSse();
    es._fire('chat.social', perUserEnvelope());
    es._fire('chat.social', perUserEnvelope());

    expect(seen).toHaveLength(1);
  });

  test('a chat.social frame that is not an envelope is untouched', () => {
    // Computer-use commentary travels on the same channel with no component.
    const {realtimeService, es, seen} = openSse();
    const ribbon = [];
    realtimeService.on('computer_use.update', (p) => ribbon.push(p));
    es._fire('chat.social', {
      type: 'computer_use.update', msg_id: 'computer-use:t1:1:executing',
      agent_id: 'c23d388c', text: 'Opening the browser', user_id: SHOPPER,
    });

    expect(ribbon).toHaveLength(1);
    expect(ribbon[0].text).toBe('Opening the browser');
    // It names an agent, so it is also announced to the overlay as before,
    // but whole: nothing is unwrapped from it.
    expect(seen.filter((p) => p.component !== undefined)).toHaveLength(0);
    expect(seen.filter((p) => p.type === 'computer_use.update')).toHaveLength(1);
  });

  test('the Demopage agent component RENDERS the per-user card', async () => {
    // The overlay and this test must share ONE realtimeService and ONE React.
    const {es} = openSse({shared: true});
    const {default: AgentOverlay} =
      require('../../components/AgentOverlay/AgentOverlay');
    render(<AgentOverlay navigate={jest.fn()} />);

    es._fire('chat.social', perUserEnvelope({name: 'Paneer 200 g', product_id: 7}));

    expect(await screen.findByText('Paneer 200 g')).toBeInTheDocument();
    // Not the raw envelope printed by the overlay's fallback branch.
    expect(screen.queryByText(/"component"/)).toBeNull();
    // The first import of the overlay (MUI) measured 14-54 s on this desktop
    // (realtimeService.agentUiEnvelope.test.js); the cap sits above that.
  }, 120000);
});
