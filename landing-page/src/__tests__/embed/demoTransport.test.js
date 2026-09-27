/**
 * demoTransport — the offline demo agent produces the fragments HARTOS
 * commerce tools would, and reaches the host only through hart:action.
 *
 * Each test wires a real session + host bridge on a DOM element and a
 * scripted host (a tiny in-memory store) that answers the actions, exactly
 * as the McGroce SPA does.
 */

import {FLOATING_TYPES, INLINE_TYPES} from '../../constants/liquidFragments';
import {createSession} from '../../embed/embedSession';
import {HOST_EVENTS, createHostBridge} from '../../embed/hostBridge';
import {createDemoTransport, parseIntent} from '../../embed/transports/demoTransport';

const KNOWN_TYPES = new Set([...FLOATING_TYPES, ...INLINE_TYPES]);

const SHELF = [
  {sku: 'MLK-1', name: 'Heritage Milk 500 ml', price: 29, currency: 'INR'},
  {sku: 'PNR-1', name: 'Heritage Paneer 200 g', price: 88, currency: 'INR'},
  {sku: 'PNR-2', name: 'Amul Paneer 200 g', price: 90, currency: 'INR'},
];

function setup({host = true, hostTimeoutMs = 200, answers = {}} = {}) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const actions = [];
  const cart = new Map();
  const cartView = () => {
    const items = [...cart.values()];
    return {items, total: items.reduce((s, l) => s + l.price * l.qty, 0), currency: 'INR'};
  };
  if (host) {
    el.addEventListener(HOST_EVENTS.ACTION, (e) => {
      const {kind, payload, respond} = e.detail;
      actions.push({kind, payload});
      if (answers[kind]) return respond(answers[kind](payload));
      switch (kind) {
        case 'catalog.search': {
          const q = payload.q.toLowerCase().split(' ')[0];
          return respond({ok: true, data: {items: SHELF.filter((p) => p.name.toLowerCase().includes(q)).slice(0, payload.limit)}});
        }
        case 'cart.add': {
          const line = cart.get(payload.sku) || {sku: payload.sku, name: payload.name, price: payload.price, qty: 0};
          line.qty += payload.qty;
          cart.set(payload.sku, line);
          return respond({ok: true, data: {cart: cartView()}});
        }
        case 'payment.authorize':
          return respond({ok: true, data: {order_id: 'MG-9001', transaction_id: 'txn_1'}});
        default:
          return respond({ok: true, data: {id: 'x1'}});
      }
    });
  }
  const bridge = createHostBridge(el, {timeoutMs: hostTimeoutMs});
  const session = createSession({bridge});
  const floating = [];
  session.subscribeFloating((f) => floating.push(f));
  session.setTransport(createDemoTransport({sink: session.sink, delayMs: 0, hostTimeoutMs, storeName: 'Sri Balaji Stores'}));
  const inline = () => session.getState().timeline.filter((i) => i.kind === 'fragment').map((i) => i.fragment);
  const messages = () => session.getState().timeline.filter((i) => i.kind === 'msg');
  const allTypes = () => [...inline(), ...floating].map((f) => f.type);
  return {el, session, actions, floating, inline, messages, allTypes, cart};
}

describe('parseIntent', () => {
  test.each([
    ['add 2 milk', {intent: 'cart.add', qty: 2, query: 'milk'}],
    ['Add two packets of paneer to my cart', {intent: 'cart.add', qty: 2, query: 'paneer'}],
    ['find paneer', {intent: 'catalog.find', query: 'paneer'}],
    ["what's in my cart", {intent: 'cart.view'}],
    ['What’s in my cart?', {intent: 'cart.view'}],
    ['checkout', {intent: 'checkout'}],
    ['track my order', {intent: 'order.track'}],
    ['onboard my store Sri Balaji Stores in 600078', {intent: 'merchant.onboard', name: 'Sri Balaji Stores', pincode: '600078'}],
    ['add SKU Amul Butter 100g ₹56', {intent: 'sku.create', name: 'Amul Butter 100g', price: 56}],
    ['draft a Diwali campaign for my customers', {intent: 'campaign.draft', occasion: 'diwali'}],
    ['remove milk', {intent: 'cart.remove', qty: null, query: 'milk'}],
  ])('%s', (text, expected) => {
    expect(parseIntent(text)).toMatchObject(expected);
  });
});

describe('shopper intents', () => {
  test('"add 2 milk": searches the host catalog, emits cart.add, renders the cart inline', async () => {
    const t = setup();
    await t.session.send('add 2 milk');
    expect(t.actions.map((a) => a.kind)).toEqual(['catalog.search', 'cart.add']);
    expect(t.actions[1].payload).toMatchObject({sku: 'MLK-1', qty: 2, name: 'Heritage Milk 500 ml', price: 29});
    const [cart] = t.inline();
    expect(cart.type).toBe('cart');
    expect(cart.total).toBe(58);
    expect(cart.currency).toBe('INR');
    expect(cart.items[0]).toMatchObject({name: 'Heritage Milk 500 ml', qty: 2, price: '₹58'});
    // RN parity: the inline card also raises a summary notification.
    expect(t.floating.find((f) => f._summaryOf === cart._fid).message).toBe('Cart: 1 items, ₹58');
    // The draft bubble was replaced in place (speculation_id), not stacked.
    const assistant = t.messages().filter((m) => m.role === 'assistant');
    expect(assistant).toHaveLength(1);
    expect(assistant[0].isDraft).toBe(false);
    expect(assistant[0].text).toMatch(/Added 2 × Heritage Milk 500 ml/);
  });

  test('a newer cart supersedes the older snapshot', async () => {
    const t = setup();
    await t.session.send('add 2 milk');
    await t.session.send('add 1 paneer');
    const carts = t.inline().filter((f) => f.type === 'cart');
    expect(carts.map((c) => !!c.superseded)).toEqual([true, false]);
  });

  test('"find paneer": up to three product cards from the host shelf', async () => {
    const t = setup();
    await t.session.send('find paneer');
    const cards = t.inline();
    expect(cards.map((c) => c.type)).toEqual(['product_card', 'product_card']);
    expect(cards[0]).toMatchObject({name: 'Heritage Paneer 200 g', price: 88, currency: 'INR', buy_action: 'cart.add', sku: 'PNR-1'});
  });

  test('a product card "Add" goes through the host cart', async () => {
    const t = setup();
    await t.session.send('find paneer');
    const res = await t.session.act('cart.add', {sku: 'PNR-2', name: 'Amul Paneer 200 g', price: 90, qty: 1});
    expect(res.ok).toBe(true);
    expect(t.actions.at(-1)).toEqual({kind: 'cart.add', payload: expect.objectContaining({sku: 'PNR-2', qty: 1})});
  });

  test('"what\'s in my cart" reads the HOST cart from context', async () => {
    const t = setup();
    t.session.setContext({cart: {items: [{sku: 'A', name: 'Atta 5 kg', qty: 1, price: 265}], total: 265, currency: 'INR'}});
    await t.session.send("what's in my cart");
    const [cart] = t.inline();
    expect(cart).toMatchObject({type: 'cart', total: 265});
    expect(cart.items[0].name).toBe('Atta 5 kg');
  });

  test('"checkout": checkout inline + AP2 approval floating; approving emits payment.authorize', async () => {
    const t = setup();
    await t.session.send('add 2 milk');
    await t.session.send('checkout');
    const checkout = t.inline().find((f) => f.type === 'checkout');
    const approval = t.floating.find((f) => f.type === 'approval');
    expect(checkout).toMatchObject({total: 58, currency: 'INR'});
    expect(approval.action).toMatch(/^ap2_pay:/);
    expect(approval.description).toBe('Pay ₹58 to Sri Balaji Stores for 2 items.');
    // Nothing is charged before the person approves.
    expect(t.actions.map((a) => a.kind)).not.toContain('payment.authorize');

    const res = await t.session.act('approval.decide', {...approval, decision: 'approve'});
    expect(res.ok).toBe(true);
    const pay = t.actions.find((a) => a.kind === 'payment.authorize');
    expect(pay.payload).toMatchObject({amount: 58, currency: 'INR', merchant: 'Sri Balaji Stores'});
    expect(pay.payload.mandate.cart_hash).toMatch(/^[0-9a-f]{8}$/);
    expect(t.floating.find((f) => f.type === 'payment_status')).toMatchObject({status: 'success', amount: '₹58'});
    expect(t.floating.find((f) => f.type === 'order_tracking')).toMatchObject({order_id: 'MG-9001'});

    // The paid checkout card and the old cart snapshot stop being actionable.
    expect(t.inline().find((f) => f.type === 'checkout')).toMatchObject({paid: true, order_id: 'MG-9001'});
    expect(t.inline().find((f) => f.type === 'cart')).toMatchObject({superseded: true, ordered: true});

    // A mandate is single-use.
    const again = await t.session.act('approval.decide', {...approval, decision: 'approve'});
    expect(again.ok).toBe(false);
  });

  test('a declined payment shows an error status and keeps the cart', async () => {
    const t = setup({answers: {'payment.authorize': () => ({ok: false, error: 'UPI declined.'})}});
    await t.session.send('add 2 milk');
    await t.session.send('checkout');
    const approval = t.floating.find((f) => f.type === 'approval');
    const res = await t.session.act('checkout.confirm', {approval_action: approval.action});
    expect(res.ok).toBe(false);
    expect(t.floating.find((f) => f.type === 'payment_status')).toMatchObject({status: 'error'});
    expect(t.messages().at(-1).tone).toBe('error');
  });

  test('checkout with an empty cart says so, without an approval', async () => {
    const t = setup();
    await t.session.send('checkout');
    expect(t.floating.some((f) => f.type === 'approval')).toBe(false);
    expect(t.messages().at(-1).text).toMatch(/cart is empty/);
  });

  test('"track my order": an order_tracking fragment with steps', async () => {
    const t = setup();
    await t.session.send('track my order');
    const track = t.floating.find((f) => f.type === 'order_tracking');
    expect(track.steps.map((s) => s.label)).toEqual(['Order placed', 'Accepted by store', 'Out for delivery', 'Delivered']);
    expect(track.steps.filter((s) => s.current)).toHaveLength(1);
  });

  test('no host on the page: falls back to the labelled demo shelf', async () => {
    const t = setup({host: false, hostTimeoutMs: 15});
    await t.session.send('add 2 milk');
    const [cart] = t.inline();
    expect(cart.type).toBe('cart');
    expect(cart.items[0].name).toMatch(/Milk/);
    expect(t.session.getState().transportLabel).toBe('Demo agent · offline');
  });
});

describe('merchant intents', () => {
  test('"onboard my store Sri Balaji Stores in 600078": a pre-filled form, validated, then merchant.onboard', async () => {
    const t = setup();
    await t.session.send('onboard my store Sri Balaji Stores in 600078');
    const [form] = t.inline();
    expect(form.type).toBe('form');
    const byName = Object.fromEntries(form.fields.map((f) => [f.name, f]));
    expect(byName.display_name.value).toBe('Sri Balaji Stores');
    expect(byName.zip.value).toBe('600078');

    const bad = await t.session.act('form.submit', {action: form.action, form, values: {display_name: 'Sri Balaji Stores', zip: '600078'}});
    expect(bad.ok).toBe(false);
    expect(Object.keys(bad.fieldErrors).sort()).toEqual(['email', 'phone']);
    expect(t.actions.some((a) => a.kind === 'merchant.onboard')).toBe(false);

    const good = await t.session.act('form.submit', {action: form.action, form, values: {
      display_name: 'Sri Balaji Stores', zip: '600078', phone: '98400 12345', email: 'owner@sribalaji.in', delivery_radius_km: '4',
    }});
    expect(good.ok).toBe(true);
    const onboard = t.actions.find((a) => a.kind === 'merchant.onboard');
    expect(onboard.payload).toMatchObject({display_name: 'Sri Balaji Stores', zip: '600078', delivery_radius_km: 4});
    expect(t.floating.find((f) => f.type === 'agent_action')).toMatchObject({status: 'completed'});
  });

  test('"add SKU Amul Butter 100g ₹56": a product preview + approval; approving upserts the SKU', async () => {
    const t = setup();
    await t.session.send('add SKU Amul Butter 100g ₹56');
    const preview = t.inline().find((f) => f.type === 'product_card');
    expect(preview).toMatchObject({name: 'Amul Butter 100g', price: 56, currency: 'INR'});
    expect(preview.buy_action).toBeUndefined();
    const approval = t.floating.find((f) => f.type === 'approval');
    expect(approval.description).toBe('Amul Butter 100g at ₹56 in Dairy.');
    await t.session.act('approval.decide', {...approval, decision: 'approve'});
    const upsert = t.actions.find((a) => a.kind === 'merchant.sku.upsert');
    expect(upsert.payload).toMatchObject({name: 'Amul Butter 100g', price_inr: 56, category: 'Dairy'});
  });

  test('"draft a Diwali campaign for my customers": an editable draft, saved via campaign.draft, never sent', async () => {
    const t = setup();
    await t.session.send('draft a Diwali campaign for my customers');
    const form = t.inline().find((f) => f.type === 'form');
    expect(form.title).toBe('Diwali campaign');
    const values = Object.fromEntries(form.fields.map((f) => [f.name, f.value]));
    expect(values.message).toMatch(/Diwali/);
    expect(values.message).toMatch(/Sri Balaji Stores/);
    expect(t.floating.find((f) => f.type === 'metric')).toMatchObject({label: 'Estimated reach'});
    await t.session.act('form.submit', {action: form.action, form, values});
    const draft = t.actions.find((a) => a.kind === 'campaign.draft');
    expect(draft.payload.title).toBe('Diwali Dhamaka');
    expect(t.messages().at(-1).text).toMatch(/draft/);
  });
});

test('the demo agent never invents a fragment type', async () => {
  const t = setup();
  const script = [
    'add 2 milk', 'find paneer', "what's in my cart", 'checkout', 'track my order',
    'onboard my store Sri Balaji Stores in 600078', 'add SKU Amul Butter 100g ₹56',
    'draft a Diwali campaign for my customers', 'hello',
  ];
  for (const line of script) {
    // eslint-disable-next-line no-await-in-loop
    await t.session.send(line);
  }
  const approval = t.floating.find((f) => f.type === 'approval' && f.action.startsWith('ap2_pay:'));
  await t.session.act('approval.decide', {...approval, decision: 'approve'});
  const types = new Set(t.allTypes());
  types.forEach((type) => expect(KNOWN_TYPES.has(type)).toBe(true));
  expect(types.size).toBeGreaterThanOrEqual(9);
});
