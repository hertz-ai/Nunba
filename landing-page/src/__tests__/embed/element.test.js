/**
 * <hart-agent> — the custom element end to end in jsdom: registration,
 * attributes, the host contract, shared sessions, and the lazily-loaded
 * Liquid UI (sheet, inline fragment cards, floating AP2 approval).
 */

import {contrastRatio} from '../../embed/embedTheme';
import '../../embed/index';

const SHELF = [
  {sku: 'MLK-1', name: 'Heritage Milk 500 ml', price: 29, currency: 'INR'},
];

async function waitFor(check, {timeout = 8000, interval = 20} = {}) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let value;
    try {
      value = check();
    } catch {
      value = null;
    }
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error('waitFor timed out');
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, interval));
  }
}

function mount(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
}

const actions = [];
function hostListener(e) {
  const {kind, payload, respond} = e.detail;
  actions.push({kind, payload});
  if (kind === 'catalog.search') respond({ok: true, data: {items: SHELF}});
  else if (kind === 'cart.add') {
    respond({ok: true, data: {cart: {items: [{sku: payload.sku, name: payload.name, qty: payload.qty, price: payload.price}], total: payload.price * payload.qty, currency: 'INR'}}});
  } else if (kind === 'payment.authorize') respond({ok: true, data: {order_id: 'MG-7'}});
  else respond({ok: true});
}

beforeAll(() => document.addEventListener('hart:action', hostListener));
afterAll(() => document.removeEventListener('hart:action', hostListener));
beforeEach(() => {
  actions.length = 0;
});
afterEach(() => {
  document.body.innerHTML = '';
});

describe('<hart-agent> element', () => {
  test('is registered and announces hart:ready with its surface', () => {
    const ready = [];
    const onReady = (e) => ready.push(e.detail);
    document.addEventListener('hart:ready', onReady);
    mount('<hart-agent demo surface="assistant" session="t1"></hart-agent>');
    document.removeEventListener('hart:ready', onReady);
    expect(customElements.get('hart-agent')).toBeTruthy();
    expect(ready).toEqual([{surface: 'assistant', demo: true, session: 't1'}]);
  });

  test('the orb is a labelled, collapsed button; overlay has no orb', () => {
    const host = mount(`
      <hart-agent demo agent-name="McGroce" session="t2"></hart-agent>
      <hart-agent demo surface="overlay" session="t2"></hart-agent>`);
    const [a, o] = host.querySelectorAll('hart-agent');
    const orb = a.shadowRoot.querySelector('button.hart-orb');
    expect(orb.getAttribute('aria-label')).toBe('Ask McGroce');
    expect(orb.getAttribute('aria-expanded')).toBe('false');
    expect(orb.getAttribute('aria-haspopup')).toBe('dialog');
    expect(o.shadowRoot.querySelector('.hart-dock').hidden).toBe(true);
    expect(a.shadowRoot.querySelector('[aria-live="polite"]')).toBeTruthy();
    expect(a.shadowRoot.querySelector('[aria-live="assertive"]')).toBeTruthy();
  });

  test('"add 2 milk" via send() emits hart:action cart.add to the host', async () => {
    const host = mount('<hart-agent demo surface="voice" session="t3"></hart-agent>');
    const el = host.querySelector('hart-agent');
    await el.send('add 2 milk');
    const add = actions.find((a) => a.kind === 'cart.add');
    expect(add.payload).toMatchObject({sku: 'MLK-1', qty: 2});
  });

  test('elements with the same session share one conversation and one floating stack', async () => {
    const host = mount(`
      <hart-agent demo session="t4"></hart-agent>
      <hart-agent demo surface="voice" session="t4"></hart-agent>
      <hart-agent demo surface="overlay" session="t4"></hart-agent>
      <hart-agent demo session="other"></hart-agent>`);
    const [a, v, o, x] = host.querySelectorAll('hart-agent');
    expect(a._session).toBe(v._session);
    expect(a._session).toBe(o._session);
    expect(a._session).not.toBe(x._session);
    // the overlay surface outranks orb surfaces for the floating stack
    expect(a._session.getState().floatingOwner).toBe(o._hid);
    v.setContext({page: 'pdp'});
    expect(a.context).toMatchObject({page: 'pdp'});
  });

  test('getToken is a property only: never reflected into the DOM', () => {
    const host = mount('<hart-agent gateway-url="/agent" session="t5"></hart-agent>');
    const el = host.querySelector('hart-agent');
    el.getToken = async () => 'secret-jwt';
    expect(el.outerHTML).not.toContain('secret-jwt');
    expect(el._session.auth.getToken).toBe(el.getToken);
    expect(el.isDemo).toBe(false);
  });

  test('the host brand colour becomes an accent that dark text reads on (≥ 7:1)', () => {
    const host = mount(`<hart-agent demo session="t6" theme='{"brand":"#01b0a8","accent":"#f05f40"}'></hart-agent>`);
    const root = host.querySelector('hart-agent').shadowRoot.querySelector('.hart-root');
    const accent = root.style.getPropertyValue('--hart-accent');
    const ink = root.style.getPropertyValue('--hart-ink');
    expect(accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio(accent, ink)).toBeGreaterThanOrEqual(7);
  });

  test('open() loads the Liquid sheet; a suggestion renders the cart fragment inline and announces it', async () => {
    const host = mount('<hart-agent demo agent-name="McGroce" session="t7"></hart-agent>');
    const el = host.querySelector('hart-agent');
    const sr = el.shadowRoot;
    el.open();
    expect(sr.querySelector('button.hart-orb').getAttribute('aria-expanded')).toBe('true');
    const sheet = await waitFor(() => sr.querySelector('[data-testid="hart-sheet"]'));
    expect(sheet.getAttribute('role')).toBe('dialog');
    const chip = await waitFor(() => Array.from(sr.querySelectorAll('button')).find((b) => b.textContent === 'Add 2 milk'));
    chip.click();
    const card = await waitFor(() => sr.querySelector('[data-fragment-type="cart"]'));
    expect(card.textContent).toContain('Heritage Milk 500 ml');
    expect(card.textContent).toContain('₹58');
    await waitFor(() => /Cart: 1 items, ₹58|Added 2/.test(sr.querySelector('[aria-live="polite"]').textContent));
    el.close();
    expect(sr.querySelector('button.hart-orb').getAttribute('aria-expanded')).toBe('false');
    await waitFor(() => sheet.getAttribute('data-open') === 'false');
    expect(sheet.getAttribute('aria-hidden')).toBe('true');
  }, 30000);

  test('checkout: the AP2 approval floats; tapping Pay asks the host to authorize', async () => {
    const host = mount(`
      <hart-agent demo session="t8"></hart-agent>
      <hart-agent demo surface="overlay" session="t8"></hart-agent>`);
    const [a, o] = host.querySelectorAll('hart-agent');
    await a.send('add 2 milk');
    await a.send('checkout');
    const pay = await waitFor(() => Array.from(o.shadowRoot.querySelectorAll('button'))
      .find((b) => /^Pay ₹58$/.test(b.textContent)));
    expect(actions.some((x) => x.kind === 'payment.authorize')).toBe(false);
    pay.click();
    await waitFor(() => actions.find((x) => x.kind === 'payment.authorize'));
    const auth = actions.find((x) => x.kind === 'payment.authorize');
    expect(auth.payload).toMatchObject({amount: 58, currency: 'INR'});
    await waitFor(() => o.shadowRoot.textContent.includes('Order MG-7'));
  }, 30000);
});
