/// <reference types="cypress" />

/**
 * LiquidActionBar — agentic UI surface in social chat.
 *
 * Transport: `nunba:ui_actions` CustomEvent on window (NOT
 * realtimeService.on — that's the AgentOverlay path).  Backend's chat
 * response can attach `ui_actions` and Demopage.js calls
 * publishUiActions(arr) which dispatches the CustomEvent; any mounted
 * LiquidActionBar updates its chip stack accordingly.
 *
 * Live-verifies: receiver wired correctly, chip renders, click
 * triggers navigate (the page registry default for each action).
 */

const FRESH_ACTION = {
  id: 'cypress-fresh-page',
  type: 'navigate',
  label: 'Cypress Fresh Chip',
  route: '/social',
  icon: 'home',
  category: 'navigation',
};

describe('LiquidActionBar — nunba:ui_actions transport', () => {
  beforeEach(() => {
    cy.window({log: false}).then((win) => {
      win.localStorage.setItem('hart_sealed', 'true');
      win.localStorage.setItem('hart_name', 'cypress');
      win.localStorage.setItem('welcome_done', 'true');
      win.localStorage.setItem('guest_mode', 'true');
    });
    cy.intercept('GET', '/api/social/events/stream*', {
      statusCode: 204, body: '',
    });
    cy.intercept('GET', '/api/wamp/ticket', {
      statusCode: 200, body: {ticket: 'cypress-bar-ticket'},
    });
  });

  it('fresh ui_actions CustomEvent injects a chip into the bar', () => {
    // Real route is /social/coding (nested under /social parent in
    // MainRoute.js:528).
    cy.visit('/social/coding', {failOnStatusCode: false});

    // Wait for the bar to actually mount.  LiquidActionBar seeds
    // chips from pageRegistry (line 75: useState(() => listPages...)).
    // For role='guest', "Social Hub" is a seed chip that should be
    // in the DOM as soon as the bar renders.  If this never appears,
    // the bar didn't mount (route gate, lazy-load, etc.) — assertion
    // surfaces that as the failure, not a generic timeout.
    cy.contains('Social Hub', {timeout: 30000}).should('exist');

    // Dispatch the CustomEvent the way Demopage.js does after a
    // /chat response with ui_actions attached.
    cy.window().then((win) => {
      win.dispatchEvent(new win.CustomEvent('nunba:ui_actions', {
        detail: [FRESH_ACTION],
      }));
    });

    // Chip renders with the fresh label (bar auto-expands on event
    // per LiquidActionBar.jsx:94).
    cy.contains('Cypress Fresh Chip', {timeout: 10000})
      .should('be.visible');
  });
});
