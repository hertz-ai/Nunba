/**
 * hostBridge — the <hart-agent> ⇄ host contract (PLAN §6).
 *
 * Behavioural: a real EventTarget, real CustomEvents, a host that answers
 * the way the McGroce SPA does.  Framework-agnostic (runs under vitest and
 * the CRA jest runner): only describe/test/expect.
 */

import {
  ACTION_KINDS, HOST_EVENTS, createHostBridge,
} from '../../embed/hostBridge';

function hostElement() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('hostBridge.request', () => {
  test('emits hart:action with kind, requestId and payload, bubbling and composed', async () => {
    const el = hostElement();
    const bridge = createHostBridge(el, {timeoutMs: 500});
    const seen = [];
    const onAction = (e) => {
      seen.push(e);
      el.dispatchEvent(new CustomEvent(HOST_EVENTS.ACTION_RESULT, {
        detail: {requestId: e.detail.requestId, ok: true, data: {cartCount: 2}},
      }));
    };
    document.addEventListener(HOST_EVENTS.ACTION, onAction);
    const res = await bridge.request('cart.add', {sku: 'MLK', qty: 2});
    document.removeEventListener(HOST_EVENTS.ACTION, onAction);

    expect(seen).toHaveLength(1);
    expect(seen[0].bubbles).toBe(true);
    expect(seen[0].composed).toBe(true);
    expect(seen[0].detail.kind).toBe('cart.add');
    expect(seen[0].detail.payload).toEqual({sku: 'MLK', qty: 2});
    expect(typeof seen[0].detail.requestId).toBe('string');
    expect(res).toEqual({ok: true, data: {cartCount: 2}});
    expect(bridge.pendingCount).toBe(0);
    bridge.destroy();
  });

  test('a result dispatched on window settles the request', async () => {
    const el = hostElement();
    const bridge = createHostBridge(el, {timeoutMs: 500});
    el.addEventListener(HOST_EVENTS.ACTION, (e) => {
      window.dispatchEvent(new CustomEvent(HOST_EVENTS.ACTION_RESULT, {
        detail: {requestId: e.detail.requestId, ok: true, data: 'w'},
      }));
    });
    await expect(bridge.request('catalog.search', {q: 'milk'})).resolves.toEqual({ok: true, data: 'w'});
    bridge.destroy();
  });

  test('respond() answers synchronously from the listener', async () => {
    const el = hostElement();
    const bridge = createHostBridge(el, {timeoutMs: 500});
    el.addEventListener(HOST_EVENTS.ACTION, (e) => e.detail.respond({ok: true, data: 7}));
    await expect(bridge.request('checkout.start', {})).resolves.toEqual({ok: true, data: 7});
    bridge.destroy();
  });

  test('a host refusal resolves ok:false with the host message (never throws)', async () => {
    const el = hostElement();
    const bridge = createHostBridge(el, {timeoutMs: 500});
    el.addEventListener(HOST_EVENTS.ACTION, (e) => e.detail.respond({ok: false, error: 'Out of stock'}));
    const res = await bridge.request('cart.add', {sku: 'X'});
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Out of stock');
    bridge.destroy();
  });

  test('no answer resolves a timeout error', async () => {
    const el = hostElement();
    const bridge = createHostBridge(el, {timeoutMs: 20});
    const res = await bridge.request('cart.add', {});
    expect(res).toMatchObject({ok: false, code: 'timeout'});
    expect(bridge.pendingCount).toBe(0);
    bridge.destroy();
  });

  test('a result for another request id is ignored', async () => {
    const el = hostElement();
    const bridge = createHostBridge(el, {timeoutMs: 40});
    el.addEventListener(HOST_EVENTS.ACTION, () => {
      el.dispatchEvent(new CustomEvent(HOST_EVENTS.ACTION_RESULT, {
        detail: {requestId: 'someone-else', ok: true},
      }));
    });
    const res = await bridge.request('cart.add', {});
    expect(res.code).toBe('timeout');
    bridge.destroy();
  });

  test('destroy settles every pending request', async () => {
    const el = hostElement();
    const bridge = createHostBridge(el, {timeoutMs: 5000});
    const p = bridge.request('payment.authorize', {amount: 60});
    bridge.destroy();
    await expect(p).resolves.toMatchObject({ok: false, code: 'destroyed'});
  });
});

describe('contract constants', () => {
  test('the action kinds are exactly the pinned PLAN §6 set', () => {
    expect([...ACTION_KINDS].sort()).toEqual([
      'campaign.draft', 'cart.add', 'cart.remove', 'cart.update', 'catalog.search',
      'checkout.start', 'merchant.onboard', 'merchant.sku.upsert', 'payment.authorize',
    ]);
  });

  test('event names', () => {
    expect(HOST_EVENTS).toEqual({
      READY: 'hart:ready',
      ACTION: 'hart:action',
      ACTION_RESULT: 'hart:action-result',
      NAVIGATE: 'hart:navigate',
      MESSAGE: 'hart:message',
      ERROR: 'hart:error',
    });
  });
});
