/**
 * Fragment routing — the web port of AgentOverlayBridge.handleAgentUIUpdate
 * (Hevolve_React_Native) and LiquidOverlay's draft replacement.
 */

import {
  FLOATING_TYPES, INLINE_TYPES, NAVIGATE_TYPES, fragmentMode, formatMoney, getComponentSummary,
} from '../../constants/liquidFragments';
import {fragmentsFromChatResponse, normalizeFragment, routeFragment} from '../../embed/a2uiAdapter';
import {replaceDraft} from '../../embed/embedSession';

function sinks() {
  const out = {navigate: [], floating: [], inline: []};
  return {
    out,
    sinks: {
      navigate: (x) => out.navigate.push(x),
      floating: (x) => out.floating.push(x),
      inline: (x) => out.inline.push(x),
    },
  };
}

describe('routing sets mirror AgentOverlayBridge.js', () => {
  test('FLOATING_TYPES', () => {
    expect([...FLOATING_TYPES].sort()).toEqual([
      'agent_action', 'approval', 'chart', 'code', 'list', 'lyrics', 'markdown', 'media',
      'meet_copilot', 'metric', 'notification', 'order_tracking', 'payment_status', 'progress',
    ]);
  });
  test('INLINE_TYPES', () => {
    expect([...INLINE_TYPES].sort()).toEqual(['cart', 'checkout', 'comparison', 'form', 'product_card']);
  });
  test('NAVIGATE_TYPES', () => {
    expect([...NAVIGATE_TYPES]).toEqual(['navigate']);
  });
  test('an unknown type floats (RN default branch)', () => {
    expect(fragmentMode('something_new')).toBe('floating');
    expect(fragmentMode(undefined)).toBe('floating');
  });
});

describe('routeFragment', () => {
  test.each([...INLINE_TYPES])('%s goes inline and raises a summary notification', (type) => {
    const {out, sinks: s} = sinks();
    const f = normalizeFragment({type, name: 'Milk', price: 30, currency: 'INR', items: [], total: 0, currency2: 'x'}, 'agent_1');
    expect(routeFragment(f, s)).toBe('inline');
    expect(out.inline).toEqual([f]);
    expect(out.floating).toHaveLength(1);
    expect(out.floating[0]).toMatchObject({
      type: 'notification', severity: 'info', message: getComponentSummary(f), _summaryOf: f._fid,
    });
    expect(out.navigate).toHaveLength(0);
  });

  test.each([...FLOATING_TYPES])('%s floats and nothing else', (type) => {
    const {out, sinks: s} = sinks();
    const f = normalizeFragment({type}, 'a');
    expect(routeFragment(f, s)).toBe('floating');
    expect(out.floating).toEqual([f]);
    expect(out.inline).toHaveLength(0);
  });

  test('navigate becomes a navigation + a brief notification, never a card', () => {
    const {out, sinks: s} = sinks();
    const f = normalizeFragment({type: 'navigate', target: '/cart', params: {a: 1}, title: 'Cart'}, 'shop');
    expect(routeFragment(f, s)).toBe('navigate');
    expect(out.navigate).toEqual([expect.objectContaining({target: '/cart', params: {a: 1}, title: 'Cart', transition: 'default'})]);
    expect(out.floating[0]).toMatchObject({type: 'notification', message: 'Navigating to Cart'});
    expect(out.inline).toHaveLength(0);
  });
});

describe('normalizeFragment', () => {
  test('flat payload', () => {
    const f = normalizeFragment({type: 'approval', agent_id: 'vision', action: 'x', msg_id: 'm1'});
    expect(f).toMatchObject({type: 'approval', _agent_id: 'vision', action: 'x', _fid: 'm1'});
  });
  test('wrapped {component} payload (emit_event shape)', () => {
    const f = normalizeFragment({agent_id: 'shop', msg_id: 'm2', component: {type: 'cart', items: [1]}});
    expect(f).toMatchObject({type: 'cart', items: [1], _agent_id: 'shop', msg_id: 'm2'});
  });
  test('realtime envelope type falls back to component_type', () => {
    const f = normalizeFragment({type: 'agent.ui.update', component_type: 'metric', value: 3});
    expect(f.type).toBe('metric');
  });
  test('garbage in, null out', () => {
    expect(normalizeFragment(null)).toBeNull();
    expect(normalizeFragment('x')).toBeNull();
  });
  test('chat_response.ui_components (processChatResponseUI path)', () => {
    const fs = fragmentsFromChatResponse({agent_id: 'a', ui_components: [{type: 'cart'}, null, {nope: 1}, {type: 'metric'}]});
    expect(fs.map((f) => f.type)).toEqual(['cart', 'metric']);
    expect(fs[0]._agent_id).toBe('a');
  });
});

describe('getComponentSummary', () => {
  test('INR reads as rupees; other currencies keep the RN shape', () => {
    expect(getComponentSummary({type: 'cart', items: [1, 2], total: 60, currency: 'INR'})).toBe('Cart: 2 items, ₹60');
    expect(getComponentSummary({type: 'checkout', total: 1234.5, currency: 'INR'})).toBe('Checkout: ₹1,234.50');
    expect(getComponentSummary({type: 'cart', items: [], total: 5})).toBe('Cart: 0 items, 5 Spark');
    expect(getComponentSummary({type: 'product_card', name: 'Paneer', price: 90, currency: 'INR'})).toBe('Paneer — ₹90');
  });
  test('the other RN cases', () => {
    expect(getComponentSummary({type: 'order_tracking', order_id: 'MG-1', status: 'Out for delivery'})).toBe('Order MG-1: Out for delivery');
    expect(getComponentSummary({type: 'approval', description: 'Pay ₹60'})).toBe('Approval: Pay ₹60');
    expect(getComponentSummary({type: 'payment_status', status: 'success'})).toBe('Payment success');
    expect(getComponentSummary({type: 'form', title: 'Onboard'})).toBe('Form: Onboard');
    expect(getComponentSummary({type: 'navigate', target: '/x'})).toBe('Navigate: /x');
    expect(getComponentSummary({type: 'zzz', message: 'hello'})).toBe('hello');
  });
  test('formatMoney passes a pre-formatted string through', () => {
    expect(formatMoney('₹56', 'INR')).toBe('₹56');
    expect(formatMoney('', 'INR')).toBe('');
  });
});

describe('replaceDraft (liquidOverlayStore.replaceDraft port)', () => {
  test('replaces the matching draft in place', () => {
    const t = [
      {kind: 'msg', id: 'u', role: 'user', text: 'hi'},
      {kind: 'msg', id: 'd', role: 'assistant', text: 'draft…', speculationId: 's1', isDraft: true},
    ];
    const next = replaceDraft(t, 's1', 'expert answer', 'expert');
    expect(next).toHaveLength(2);
    expect(next[1]).toMatchObject({id: 'd', text: 'expert answer', isDraft: false, source: 'expert'});
    expect(t[1].isDraft).toBe(true); // pure
  });
  test('no matching draft appends a new assistant message', () => {
    const next = replaceDraft([], 'nope', 'late answer');
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({role: 'assistant', text: 'late answer', source: 'expert'});
  });
  test('a finished (non-draft) bubble with the same id is not overwritten', () => {
    const t = [{kind: 'msg', id: 'd', role: 'assistant', text: 'done', speculationId: 's1', isDraft: false}];
    const next = replaceDraft(t, 's1', 'again');
    expect(next).toHaveLength(2);
    expect(next[0].text).toBe('done');
  });
});
