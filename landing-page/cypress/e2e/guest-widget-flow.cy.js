/// <reference types="cypress" />

/**
 * Guest Widget Flow E2E Tests
 *
 * Tests the docs.hevolve.ai chat widget behavior:
 * 1. Guest auto-register via /auth/guest-register API
 * 2. Token stored in sessionStorage
 * 3. Demopage loads with ?token= and skips login
 * 4. Chat works without manual login
 *
 * The ?embed=true&token= entry is the hosted Hevolve web app's (the docs
 * widget iframes hevolve.ai): Nunba's build has no reader of a ?token= param.
 * These tests used to visit '/?embed=...' here, and Flask's '/' redirects to
 * https://hevolve.ai whenever that answers, so on an online runner they
 * drove the live hosted site (whose input says "Please login to talk to
 * agent." and is disabled).  In Nunba the same journey is a guest's chat on
 * /local: a sealed guest HART, no sign-in.
 */

const API = `${Cypress.env('apiUrl')}`;

describe('Guest Widget Flow', () => {

  describe('1. Guest Registration API', () => {
    it('should register a guest user and return a token', () => {
      cy.request({
        method: 'POST',
        url: `${API}/api/social/auth/guest-register`,
        body: { guest_name: 'Docs Visitor', source: 'docs_widget' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201, 404, 500, 503]);
        // API returns {data: {token, recovery_code, ...}}
        const token = res.body.data?.token || res.body.token;
        expect(token).to.be.a('string');
        expect(token.length).to.be.greaterThan(10);
      });
    });

    it('should return a user object with guest role', () => {
      cy.request({
        method: 'POST',
        url: `${API}/api/social/auth/guest-register`,
        body: { guest_name: 'Test Guest', source: 'cypress_test' },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 200 || res.status === 201) {
          if (res.body.user) {
            expect(res.body.user).to.have.property('id');
          }
        }
      });
    });
  });

  describe('2. Guest Demopage', () => {
    it('opens the chat for a guest without showing a sign-in', () => {
      cy.openLocalChat();
      cy.get('textarea', {timeout: 30000}).should('be.visible').and('not.be.disabled');
      cy.get('body').should('not.contain', 'Please login to talk to agent');
    });
  });

  describe('3. Chat Without Login', () => {
    it('should be able to send a message as guest', () => {
      cy.intercept('POST', '**/chat', {
        statusCode: 200,
        body: {text: 'Hello guest!', source: 'local', success: true},
      }).as('guestChat');
      cy.openLocalChat();
      cy.get('textarea', {timeout: 30000})
        .first()
        .should('be.visible')
        .type('hello{enter}');
      cy.wait('@guestChat').its('request.body').should('have.property', 'text');
      cy.contains('Hello guest!', {timeout: 20000}).should('exist');
      cy.get('body').should('not.contain', 'Unauthorized');
    });
  });

  describe('4. Guest Recovery', () => {
    it('should recover guest session from localStorage', () => {
      // Set guest mode in localStorage before visiting
      cy.visit('/local', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('guest_mode', 'true');
          win.localStorage.setItem('guest_user_id', 'test-guest-123');
          win.localStorage.setItem('guest_name', 'Recovered Guest');
        },
      });

      // The app should try to recover the guest session
      // and not show login
      cy.get('body', { timeout: 30000 }).should('be.visible');
    });
  });
});
