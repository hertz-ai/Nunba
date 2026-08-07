/**
 * #627 — the orb must re-size when the ORIENTATION changes, not only when the
 * component remounts.
 *
 * USER REPRO (2026-08-07, live on the CI-nightly install): portrait →
 * landscape → mode audio→video→audio → back to portrait ⇒ the orb renders at
 * a landscape-era size, overflowing the portrait pane and clipping at the
 * window edge.  Repeating the mode switch while staying portrait remounts
 * VoiceVisualizer and the orb becomes contained — i.e. the SIZE PIPELINE is
 * correct on mount and stale on resize.  "The resize is not resizing the
 * orb" (user's words).
 *
 * INVARIANT under test — after ANY viewport change, with or without mode
 * churn:  the orb canvas fits inside the viewport and inside its wrapper.
 * This is deliberately a property, not a pixel value, so it holds at every
 * geometry and cannot go stale with tuning.
 *
 * Reports numbers BEFORE asserting (same discipline as
 * voice-orb-landscape.cy.js) so a failure names the geometry instead of just
 * "too big".
 */

const APP = Cypress.env('APP_URL') || 'http://localhost:5000';

const LANDSCAPE = {w: 1920, h: 1080};
const PORTRAIT = {w: 646, h: 1327};   // the user's live window, from the screenshot

const seedHart = (win) => {
  win.localStorage.setItem('hart_sealed', 'true');
  win.localStorage.setItem('hart_language', 'en');
  win.localStorage.setItem('hart_name', 'CypressProbe');
  win.localStorage.setItem('hart_emoji', '✨');
  win.localStorage.setItem('guest_mode', 'true');
  win.localStorage.setItem('guest_user_id', 'cypress-627-probe');
  win.localStorage.setItem('nunba_media_mode', 'audio');
};

const stub = () => {
  cy.intercept('GET', '**/api/social/peers', {statusCode: 200, body: {success: true, peers: [], count: 0, remote_count: 0}});
  cy.intercept('GET', '**/backend/health', {statusCode: 200, body: {status: 'ok'}});
};

/** Largest visible canvas = the orb. */
const orbRect = (doc) => {
  let best = null;
  doc.querySelectorAll('canvas').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (!best || r.width * r.height > best.rect.width * best.rect.height)) {
      best = {el, rect: r};
    }
  });
  return best;
};

const snapshot = (doc, vw, vh, label) => {
  const orb = orbRect(doc);
  if (!orb) return {label, vw, vh, orb: null};
  const r = orb.rect;
  const wrap = orb.el.parentElement ? orb.el.parentElement.getBoundingClientRect() : null;
  return {
    label, vw, vh,
    orb: {l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height)},
    wrapper: wrap && {l: Math.round(wrap.left), r: Math.round(wrap.right), w: Math.round(wrap.width), h: Math.round(wrap.height)},
    overflowsViewportPx: Math.round(Math.max(0, r.right - vw, r.bottom - vh, -r.left, -r.top)),
  };
};

const assertLiveBundle = () =>
  cy.document().then((doc) => {
    const el = [...doc.querySelectorAll('script[src]')].find((s) => /main\.[0-9a-f]{6,}\.js/.test(s.src));
    expect(el, 'a main.<hash>.js bundle should be on the page').to.exist;
    const path = new URL(el.src).pathname;
    return cy.request({url: `${APP}${path}`, failOnStatusCode: false}).then((res) => {
      expect(res.status, `page executes ${path}; server must serve it (see #592)`).to.eq(200);
    });
  });

describe('#627 orb re-sizes on orientation change', () => {
  it('user sequence: landscape + mode churn, then portrait — orb must fit', () => {
    stub();
    const shots = [];

    // 1. Landscape, audio (the default seed).
    cy.viewport(LANDSCAPE.w, LANDSCAPE.h);
    cy.visit(`${APP}/local`, {failOnStatusCode: false, onBeforeLoad: seedHart});
    cy.get('canvas', {timeout: 30000}).should('exist');
    assertLiveBundle();
    cy.document().then((doc) => shots.push(snapshot(doc, LANDSCAPE.w, LANDSCAPE.h, 'landscape/audio')));

    // 2. Mode churn in landscape: audio → video → audio (the user's steps).
    cy.get('select[aria-label="Display mode"]').select('video', {force: true});
    cy.wait(600);
    cy.get('select[aria-label="Display mode"]').select('audio', {force: true});
    cy.get('canvas', {timeout: 30000}).should('exist');
    cy.wait(600);
    cy.document().then((doc) => shots.push(snapshot(doc, LANDSCAPE.w, LANDSCAPE.h, 'landscape/after-mode-churn')));

    // 3. Back to portrait WITHOUT reload — the step the user says breaks it.
    cy.viewport(PORTRAIT.w, PORTRAIT.h);
    cy.wait(900);   // give RO/resize listeners + any transition time to settle
    cy.document().then((doc) => shots.push(snapshot(doc, PORTRAIT.w, PORTRAIT.h, 'portrait/after-churn+resize')));

    // 4. Control: pure resize back to landscape and again to portrait,
    //    no mode churn — discriminates "resize alone" from "churn needed".
    cy.viewport(LANDSCAPE.w, LANDSCAPE.h);
    cy.wait(900);
    cy.document().then((doc) => shots.push(snapshot(doc, LANDSCAPE.w, LANDSCAPE.h, 'landscape/pure-resize')));
    cy.viewport(PORTRAIT.w, PORTRAIT.h);
    cy.wait(900);
    cy.document().then((doc) => shots.push(snapshot(doc, PORTRAIT.w, PORTRAIT.h, 'portrait/pure-resize')));

    cy.then(() => {
      cy.writeFile('cypress/reports/627-orb-orientation.json', {shots}).then(() => {
        cy.log(JSON.stringify(shots));
        const bad = shots.filter((s) => s.orb && s.overflowsViewportPx > 2);
        expect(
          bad.map((s) => `${s.label}: orb ${s.orb.w}x${s.orb.h} at x[${s.orb.l},${s.orb.r}] overflows by ${s.overflowsViewportPx}px`).join(' | '),
          'orb canvas must fit the viewport after every orientation change',
        ).to.eq('');
        // And it must fit the wrapper it lives in (the wrapper is the pane).
        const spill = shots.filter((s) => s.orb && s.wrapper
          && (s.orb.w - s.wrapper.w > 2 || s.orb.h - s.wrapper.h > 2));
        expect(
          spill.map((s) => `${s.label}: orb ${s.orb.w}x${s.orb.h} in wrapper ${s.wrapper.w}x${s.wrapper.h}`).join(' | '),
          'orb canvas must fit its wrapper after every orientation change',
        ).to.eq('');
      });
    });
  });
});
