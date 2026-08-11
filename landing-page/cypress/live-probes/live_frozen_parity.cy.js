/**
 * Live DOM verification of the parity work against the RUNNING FROZEN BUILD.
 *
 * Run against the frozen app on :5000, not the dev server:
 *   npx cypress run --spec cypress/e2e/live_frozen_parity.cy.js \
 *     --config baseUrl=http://127.0.0.1:5000 \
 *     --env expectedBundle=main.<hash>.js
 *
 * STEP 0 IS THE BUNDLE-HASH GATE, and it runs first on purpose.
 *
 * A previous session recorded a "ROOT CAUSE PROVEN" that was measured against a
 * browser-CACHED STALE bundle — the page had loaded a main.*.js filename that
 * existed nowhere on disk, so every number gathered from that DOM described dead
 * code (memory: task #592). The lesson is that asserting the loaded asset hash
 * matches the built one is step 0 of any live UI measurement, not an epilogue.
 * If this first test fails, treat every other result in this file as void.
 *
 * The hash is passed in via --env rather than hardcoded so the spec stays valid
 * across rebuilds: the caller supplies what the build produced.
 */

const expectedBundle = Cypress.env('expectedBundle');

const loadedMainBundles = (win) =>
  Array.from(win.document.querySelectorAll('script[src]'))
    .map((s) => s.getAttribute('src'))
    .filter((s) => /main\.[a-f0-9]+\.js$/.test(s));

describe('STEP 0 — bundle identity gate', () => {
  it('serves exactly the bundle the build produced', () => {
    expect(expectedBundle, 'pass --env expectedBundle=main.<hash>.js').to.be.a('string');
    cy.visit('/download', {failOnStatusCode: false});
    cy.window().then((win) => {
      const loaded = loadedMainBundles(win);
      cy.log(`loaded bundles: ${JSON.stringify(loaded)}`);
      expect(loaded, 'exactly one main bundle').to.have.length(1);
      expect(loaded[0]).to.contain(expectedBundle);
    });
  });
});

describe('Parity A — /download is not a dead end (live)', () => {
  beforeEach(() => cy.visit('/download', {failOnStatusCode: false}));

  it('renders the shared scaffold: a real header and footer', () => {
    cy.get('header').should('exist');
    cy.contains('download nunba').should('be.visible');
  });

  it('offers a way back — home link targets the in-app root "/"', () => {
    // Pre-fix there was no header at all, so no such link existed.
    cy.get('header a[href="/"]').should('have.length.at.least', 1);
  });

  it('does NOT link /local — that is a mode switch, not a home', () => {
    cy.get('header').find('a[href="/local"]').should('have.length', 0);
  });

  it('keeps all three installer links', () => {
    cy.get('a[href*="Nunba_Setup.exe"], a[href*="Nunba_Setup.dmg"], a[href*="AppImage"]')
      .should('have.length', 3);
  });
});

describe('Parity D+E — provenance badges render from the live backend', () => {
  it('shows "On your machine" and "Hive" badges sourced from /prompts origin', () => {
    // The backend was measured returning 7 agents: 4 origin=local, 3 origin=hive.
    // This asserts the FRONTEND actually paints that authoritative field.
    cy.request('/prompts').then((res) => {
      const prompts = res.body.prompts || [];
      const origins = new Set(prompts.map((p) => p.origin));
      cy.log(`live origins: ${JSON.stringify([...origins])}`);
      expect(origins.has('local'), 'backend sends origin=local').to.be.true;

      cy.visit('/agents', {failOnStatusCode: false});
      cy.get('.agent-card', {timeout: 30000}).should('have.length.at.least', 1);
      cy.get('.agent-card__origin').should('have.length.at.least', 1);
      cy.contains('.agent-card__origin', 'On your machine').should('exist');
      if (origins.has('hive')) {
        cy.contains('.agent-card__origin', 'Hive').should('exist');
      }
    });
  });

  it('never paints a badge for an agent with no origin', () => {
    // Every rendered badge must carry one of the three known labels — a badge
    // with any other text would mean something is inferring provenance.
    cy.visit('/agents', {failOnStatusCode: false});
    cy.get('.agent-card', {timeout: 30000}).should('have.length.at.least', 1);
    cy.get('.agent-card__origin').each(($b) => {
      expect(['On your machine', 'Peer node', 'Hive']).to.include($b.text().trim());
    });
  });
});

describe('KNOWN DEFECT #642 — agent deep links 404 at the server', () => {
  it('documents that /agents/<slug> does not reach the SPA', () => {
    // Not a wish: this pins the CURRENT measured behaviour so the eventual fix
    // has a red-to-green transition. spa_fallback.py SPA_PAGE_OVERRIDES holds
    // only the exact '/agents', so the declared SPA route /agents/:agentName
    // (MainRoute.js:542) falls through to the API 404.
    cy.request({url: '/agents/hart-coder', failOnStatusCode: false}).then((res) => {
      expect(res.status).to.eq(404);
      expect(JSON.stringify(res.body)).to.contain('API endpoint not found');
    });
    // …while the childless page still works, which is the asymmetry.
    cy.request({url: '/agents', failOnStatusCode: false})
      .its('status').should('eq', 200);
  });
});
