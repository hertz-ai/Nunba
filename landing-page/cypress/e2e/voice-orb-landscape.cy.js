/**
 * #592 — the voice orb must actually fill the media column in LANDSCAPE.
 *
 * WHY DOM-MEASURED AND NOT EYEBALLED: a PrintWindow screenshot silently cropped
 * 31% earlier today and manufactured two false UI bugs on this very component
 * (see memory/feedback_printwindow_dpi_trap.md). Layout claims come from
 * getBoundingClientRect, never from a picture.
 *
 * THE REGRESSION THIS PINS. Demopage sizes the orb as
 *     Math.min(innerWidth * 0.28, innerHeight * 0.68)
 * and passes canvasMax="100%" (72780cd4, 2026-06-24). Before that the orb was
 * hard-capped at 160/200px, so on a wide window it rendered as a dot in a large
 * empty column. A 2026-08-03 screenshot of the SHIPPED build measured ~180px in
 * a 2557px-wide window — i.e. the installed app still had the pre-72780cd4 cap,
 * because the SPA is frozen into the bundle by setup_freeze_nunba.py:656 and an
 * npm build alone never reaches it.
 *
 * The assertion is deliberately a RATIO, not a pixel count: it must hold at any
 * landscape size and must fail for the old constant cap.
 */

const APP = Cypress.env('APP_URL') || 'http://localhost:5000';

/** Landscape desktop. 0.28 * 1920 = 537.6 -> the constraining dimension. */
const W = 1920;
const H = 1080;

const seedHart = (win) => {
  // Agent.js:285 gates on hartSealed <- useAuthSession.js:118 reads
  // localStorage 'hart_sealed'. Without this we measure the first-run language
  // picker and the orb is simply absent — which a naive spec reads as "pass".
  win.localStorage.setItem('hart_sealed', 'true');
  win.localStorage.setItem('hart_language', 'en');
  win.localStorage.setItem('hart_name', 'CypressProbe');
  win.localStorage.setItem('hart_emoji', '✨');
  win.localStorage.setItem('guest_mode', 'true');
  win.localStorage.setItem('guest_user_id', 'cypress-592-probe');
  // Audio Only -> the VoiceVisualizer branch (mediaMode === 'audio').
  win.localStorage.setItem('mediaMode', 'audio');
};

const stub = () => {
  cy.intercept('GET', '**/api/social/peers', {statusCode: 200, body: {success: true, peers: [], count: 0, remote_count: 0}});
  cy.intercept('GET', '**/backend/health', {statusCode: 200, body: {status: 'ok'}});
};

describe('#592 voice orb fills the media column in landscape', () => {
  beforeEach(() => {
    stub();
    cy.viewport(W, H);
    cy.visit(`${APP}/local`, {failOnStatusCode: false, onBeforeLoad: seedHart});
  });

  it('renders the orb canvas at a usable fraction of the viewport', () => {
    // The orb is a <canvas> inside the media column.
    cy.get('canvas', {timeout: 20000}).should('exist');

    cy.get('canvas').then(($c) => {
      // Pick the largest canvas — other canvases (charts) may exist.
      let best = null;
      $c.each((_i, el) => {
        const r = el.getBoundingClientRect();
        if (!best || r.width * r.height > best.width * best.height) best = r;
      });

      const report = {
        viewport: {w: W, h: H},
        orb: {w: Math.round(best.width), h: Math.round(best.height)},
        widthRatio: +(best.width / W).toFixed(4),
        expectedMin: 0.15,
        oldCappedPx: 200,
      };
      cy.writeFile('cypress/reports/592-orb-landscape.json', report);
      cy.log(JSON.stringify(report));

      // Old behaviour: a constant 160-200px cap => ratio ~0.10 at 1920.
      // New behaviour: min(0.28*1920, 0.68*1080) = 537.6 => ratio ~0.28.
      // 0.15 sits cleanly between the two, so this fails on the old cap and
      // passes on the fix without being brittle about exact px.
      expect(
        best.width,
        `orb ${Math.round(best.width)}px in a ${W}px viewport — the pre-72780cd4 build capped it at ~160-200px`,
      ).to.be.greaterThan(W * 0.15);

      // Square: the 80% canvasMax on a non-square column used to distort it.
      const aspect = best.width / best.height;
      expect(aspect, `orb aspect ${aspect.toFixed(3)} — should be square`).to.be.closeTo(1, 0.08);
    });
  });

  it('composer is dark, not the cream #fff8ea (#233 revert guard)', () => {
    cy.get('textarea[placeholder="Message..."]', {timeout: 20000})
      .should('exist')
      .then(($t) => {
        const bg = getComputedStyle($t[0]).backgroundColor;
        // #fff8ea === rgb(255, 248, 234)
        expect(bg, `composer background ${bg}`).to.not.eq('rgb(255, 248, 234)');
        // and it should be genuinely dark
        const m = bg.match(/\d+/g).map(Number);
        const lum = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
        expect(lum, `composer luminance ${lum.toFixed(3)} — should be a dark surface`).to.be.lessThan(0.5);
      });
  });
});
