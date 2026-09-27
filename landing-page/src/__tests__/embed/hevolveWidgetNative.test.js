/**
 * public/hevolve-widget.js — HevolveWidget v2 `embedMode: 'native'` mounts
 * <hart-agent> (one widget, no second embed) and relays its events.
 */

const fs = require('fs');
const path = require('path');

const WIDGET = path.resolve(__dirname, '..', '..', '..', 'public', 'hevolve-widget.js');

describe('HevolveWidget native mode', () => {
  beforeAll(async () => {
    await import('../../embed/index');
    // eslint-disable-next-line no-new-func
    new Function(fs.readFileSync(WIDGET, 'utf-8'))();
  });

  test('mounts <hart-agent> with the config as attributes; the token stays a property', () => {
    const getToken = async () => 'jwt-secret';
    const w = window.HevolveWidget.init({
      embedMode: 'native', surface: 'voice', gatewayUrl: '/agent', promptId: 'mcgroce_shopper',
      theme: {brand: '#01b0a8'}, position: 'bottom-left', getToken,
    });
    const el = w.element;
    expect(el.tagName).toBe('HART-AGENT');
    expect(el.isConnected).toBe(true);
    expect(el.getAttribute('surface')).toBe('voice');
    expect(el.getAttribute('gateway-url')).toBe('/agent');
    expect(el.getAttribute('prompt-id')).toBe('mcgroce_shopper');
    expect(JSON.parse(el.getAttribute('theme'))).toEqual({brand: '#01b0a8'});
    expect(el.getToken).toBe(getToken);
    expect(el.outerHTML).not.toContain('jwt-secret');
    w.destroy();
    expect(el.isConnected).toBe(false);
  });

  test('send() drives the agent and host actions reach on("action")', async () => {
    const w = window.HevolveWidget.init({embedMode: 'native', demo: true, surface: 'voice'});
    const kinds = [];
    w.on('action', (d) => {
      kinds.push(d.kind);
      d.respond({ok: true, data: d.kind === 'catalog.search'
        ? {items: [{sku: 'M1', name: 'Milk 500 ml', price: 30}]} : {}});
    });
    await w.element.send('add 2 milk');
    expect(kinds).toEqual(['catalog.search', 'cart.add']);
    w.destroy();
  });
});
