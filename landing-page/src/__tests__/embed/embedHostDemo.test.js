/**
 * public/embed-host-demo.html — the host fixture McGroce's demo mirrors.
 *
 * Loads the real page markup and its real host script into jsdom, registers
 * <hart-agent>, and drives the acceptance line from PLAN §8 WP-I:
 * "add 2 milk" emits hart:action cart.add and lands in the HOST's cart.
 */

const fs = require('fs');
const path = require('path');

const PAGE = path.resolve(__dirname, '..', '..', '..', 'public', 'embed-host-demo.html');

async function waitFor(check, timeout = 8000) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const v = check();
    if (v) return v;
    if (Date.now() - start > timeout) throw new Error('waitFor timed out');
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 20));
  }
}

describe('embed-host-demo.html', () => {
  const html = fs.readFileSync(PAGE, 'utf-8');

  test('is a mobile-ready page that mounts every surface', () => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.doctype && doc.doctype.name).toBe('html');
    expect(doc.querySelector('meta[name="viewport"]').getAttribute('content')).toContain('viewport-fit=cover');
    const surfaces = Array.from(doc.querySelectorAll('hart-agent')).map((a) => a.getAttribute('surface'));
    expect(surfaces.sort()).toEqual(['assistant', 'marketing', 'merchant-onboarding', 'overlay', 'voice']);
  });

  // Mounts the whole React/MUI Liquid UI: 17 s under vitest (`npm run
  // test:embed`, which CI runs), over 250 s cold under the CRA jest runner and
  // past its timeout.  `vi` exists only under vitest.
  const mountsUnderVitest = typeof vi === 'undefined' ? test.skip : test;
  mountsUnderVitest('"add 2 milk" emits hart:action cart.add and fills the host cart', async () => {
    const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script id="host-script">'));
    const hostScript = html.slice(
      html.indexOf('<script id="host-script">') + '<script id="host-script">'.length,
      html.indexOf('</script>', html.indexOf('<script id="host-script">')));
    document.body.innerHTML = body;
    // eslint-disable-next-line no-new-func
    new Function(hostScript)();
    await import('../../embed/index');

    const agent = document.getElementById('agent');
    expect(agent.shadowRoot).toBeTruthy();
    const seen = [];
    const spy = (e) => seen.push(e.detail.kind);
    document.addEventListener('hart:action', spy);
    await agent.send('add 2 milk');
    document.removeEventListener('hart:action', spy);

    expect(seen).toEqual(['catalog.search', 'cart.add']);
    const demo = window.__hostDemo;
    await waitFor(() => demo.cart['MLK-AAV-500']);
    expect(demo.cart['MLK-AAV-500'].qty).toBe(2);
    expect(document.getElementById('cart-count').textContent).toBe('2');
    expect(document.getElementById('cart-btn').getAttribute('aria-label')).toBe('Cart, 2 items');
    // The host pushed its cart back as context: the agent reads host truth.
    expect(agent.context.cart.total).toBe(60);
  }, 30000);
});
