/**
 * Route smoke — every desktop-served SPA route must render SOMETHING real.
 *
 * WHY: the 2026-08-07 full-functionality drive needed a repeatable way to
 * prove "every page opens, none show the error banner" against a LIVE
 * backend.  Interactive-browser sweeps kept dying to machine load; a spec
 * survives retries and leaves a report.  This is deliberately a SMOKE, not a
 * feature test: it asserts the route mounts and does not crash — feature
 * depth belongs to the per-page specs.
 *
 * Assertions per route:
 *   - the SPA shell mounted (root has children, body text is non-trivial)
 *   - no ApiErrorBanner ("Something's off on our end" — app.py boot-stub /
 *     crashed-fetch surface, see task #621)
 *   - no React error overlay / "Aw, Snap" emptiness
 *
 * Routes come from MainRoute.js.  Marketing/payment/cloud-auth pages are
 * excluded on purpose: they are cloud surfaces (Kong/central) that a desktop
 * flat node serves as shells but cannot back.
 *
 * Report: cypress/reports/route-smoke.json — route, text length, ms to
 * mount, error-banner flag.  REPORTS BEFORE ASSERTING (house discipline).
 */

const APP = Cypress.env('APP_URL') || Cypress.config('baseUrl') || 'http://127.0.0.1:5000';

const ROUTES = [
  '/local',
  '/agents',
  '/voice-orb',
  '/social',
  '/admin',
  '/admin/models',
  '/admin/channels',
  '/admin/agents',
  '/admin/agent-dashboard',
  '/admin/task-ledger',
  '/admin/web-research',
  '/admin/workflows',
  '/admin/network-nodes',
  '/admin/providers',
  '/admin/settings',
  '/admin/identity',
  '/admin/update-control',
];

const seedHart = (win) => {
  win.localStorage.setItem('hart_sealed', 'true');
  win.localStorage.setItem('hart_language', 'en');
  win.localStorage.setItem('hart_name', 'RouteSmoke');
  win.localStorage.setItem('hart_emoji', '✨');
  win.localStorage.setItem('guest_mode', 'true');
  win.localStorage.setItem('guest_user_id', 'cypress-route-smoke');
  win.localStorage.setItem('nunba_media_mode', 'audio');
};

describe('route smoke — every desktop route mounts without the error banner', () => {
  const results = [];

  ROUTES.forEach((route) => {
    it(`${route} mounts`, () => {
      const t0 = Date.now();
      cy.visit(`${APP}${route}`, {failOnStatusCode: false, onBeforeLoad: seedHart});
      // The shell always serves; the question is whether React mounted the
      // route.  #root gaining children is the mount signal.
      cy.get('#root', {timeout: 30000}).children().should('have.length.greaterThan', 0);
      cy.document().then((doc) => {
        const text = doc.body.innerText || '';
        const row = {
          route,
          ms: Date.now() - t0,
          textLen: text.length,
          errorBanner: /Something's off on our end|Try refreshing/.test(text),
        };
        results.push(row);
        cy.log(JSON.stringify(row));
        expect(row.errorBanner, `${route} shows the ApiErrorBanner`).to.eq(false);
        expect(row.textLen, `${route} rendered no visible text`).to.be.greaterThan(20);
      });
    });
  });

  after(() => {
    cy.writeFile('cypress/reports/route-smoke.json', {app: APP, results});
  });
});
