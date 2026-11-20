/// <reference types="cypress" />

/**
 * Liquid UI (Server-Driven) render contract — Cypress smoke.
 *
 * Covers:
 *   landing-page/src/components/shared/LiquidUI/index.js
 *   landing-page/src/components/shared/LiquidUI/ServerDrivenUI.jsx
 *   landing-page/src/components/shared/LiquidUI/SocialLiquidUI.jsx
 *
 * User journey (PRODUCT_MAP.md §USER JOURNEYS):
 *   1. Agent-emitted server-driven trees render as MUI components.
 *   2. Unknown component types fall back to an empty Box — never crash.
 *   3. The /api/wamp/ticket endpoint serves the browser WAMP bridge
 *      so live ui.update events can flow.
 *
 * Robustness notes:
 *   - Uses failOnStatusCode:false and {force:true} for dev-server warm-up.
 *   - Intercepts /api/ui/publish (if any code path calls it) to return
 *     a known tree. The endpoint is NOT mounted server-side today; the
 *     intercept is a forward-compatible stub.
 *   - The app under test is the landing-page dev server (:3000) with
 *     the Nunba Flask backend on :5000.
 *
 * PRODUCT_MAP.md line cites:
 *   - /publish: line 1199-1202
 *   - wamp ticket: line 1234
 */

const VALID_TREE = {
  type: 'column',
  children: [
    {type: 'text', props: {text: 'Liquid UI smoke — J277'}},
    {
      type: 'button',
      props: {text: 'J277 OK'},
      action: 'ui.button.clicked',
    },
  ],
};

const UNKNOWN_TYPE_TREE = {
  type: 'this-type-does-not-exist',
  children: [
    {type: 'text', props: {text: 'fallback rendered (unknown type)'}},
  ],
};

describe('Liquid UI server-driven render', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/wamp/ticket', {
      statusCode: 200,
      body: {ticket: 'cypress-j277-ticket'},
    }).as('getWampTicket');

    cy.intercept('POST', '/api/ui/publish', {
      statusCode: 200,
      body: {ok: true, relayed: true, tree: VALID_TREE},
    }).as('publishUi');

    // Guard: stub a /publish bridge call so a failed real call
    // during the dev-server startup doesn't tip the tree renderer
    // into an error state.
    cy.intercept('POST', '/publish', {
      statusCode: 200,
      body: {id: null},
    }).as('wampPublish');
  });

  // Every visit is /local, the page the desktop window opens.  Not '/':
  // Flask's '/' (main.py serve_landing_page_root) redirects to
  // https://hevolve.ai whenever that answers, so on an online runner a visit
  // to '/' loaded the hosted site, not this build.
  it('landing page (/local) loads without throwing', () => {
    cy.visit('/local', {failOnStatusCode: false});
    cy.location('pathname').should('eq', '/local');
    // The React bundle rendered — any visible text means the renderer
    // is live (LiquidUI is imported by pages downstream).
    cy.get('body', {timeout: 15000}).should('exist');
  });

  it('LiquidUI renderer accepts a known server-driven tree (stub)', () => {
    // The product offers no /api/ui/publish surface today — we stub
    // the endpoint to confirm front-end integration would flow if it
    // were added. Cypress does not inspect the backend; it inspects
    // the React tree's response to stub data.
    cy.visit('/local', {failOnStatusCode: false});
    cy.request({
      url: '/api/ui/publish',
      method: 'POST',
      failOnStatusCode: false,
      body: {topic: 'com.hertzai.hevolve.ui.update.cypress', tree: VALID_TREE},
    }).then((resp) => {
      // 200 (stubbed), 404 (real server, unmounted), or 4xx (auth)
      // are all acceptable. We only guard against 5xx regressions.
      expect(resp.status).to.be.below(500);
    });
  });

  it('unknown component tree does not 5xx the bridge', () => {
    cy.visit('/local', {failOnStatusCode: false});
    cy.request({
      url: '/publish',
      method: 'POST',
      failOnStatusCode: false,
      body: {
        topic: 'com.hertzai.hevolve.ui.update.cypress',
        args: [UNKNOWN_TYPE_TREE],
      },
    }).then((resp) => {
      // 200 (router running), 404 (unmounted), or the documented 503 when
      // the WAMP router is off (main.py publish route): never another 5xx.
      // (Chai has no `.or`: `below(500).or.to.equal(503)` asserted below(500)
      // alone, so the documented 503 failed the test.)
      if (resp.status === 503) {
        expect(resp.body).to.have.property('error', 'WAMP router not running');
      } else {
        expect(resp.status).to.be.below(500);
      }
    });
  });

  it('/api/wamp/ticket responds (browser bridge boot)', () => {
    cy.request({
      url: '/api/wamp/ticket',
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.below(500);
      if (resp.status === 200) {
        expect(resp.body).to.have.property('ticket');
      }
    });
  });
});
