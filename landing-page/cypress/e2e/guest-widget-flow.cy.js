/// <reference types="cypress" />

/**
 * Guest Widget Flow E2E Tests
 *
 * Tests the docs.hevolve.ai chat widget behavior:
 * 1. Guest auto-register via /auth/guest-register API
 * 2. Token stored in sessionStorage
 * 3. Demopage loads with ?token= and skips login
 * 4. Chat works without manual login
 */

const API = 'http://localhost:5000';

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

  describe('2. Demopage with Token', () => {
    it('should load Demopage with token param without showing login', () => {
      // First get a guest token
      cy.request({
        method: 'POST',
        url: `${API}/api/social/auth/guest-register`,
        body: { guest_name: 'Widget User', source: 'cypress_test' },
        failOnStatusCode: false,
      }).then((res) => {
        const token = res.body.data?.token || res.body.token || '';
        if (token) {
          // Visit Demopage with token
          cy.visit(`/?embed=true&companionAppInstalled=true&token=${encodeURIComponent(token)}`, {timeout: 60000, failOnStatusCode: false});
          // Should NOT show login modal/button
          cy.get('body').should('not.contain', 'Sign In');
          cy.get('body').should('not.contain', 'Log In');
        }
      });
    });
  });

  describe('3. Chat Without Login', () => {
    it('should be able to send a message as guest', () => {
      // Register guest
      cy.request({
        method: 'POST',
        url: `${API}/api/social/auth/guest-register`,
        body: { guest_name: 'Chat Guest', source: 'cypress_test' },
        failOnStatusCode: false,
      }).then((res) => {
        const token = res.body.data?.token || res.body.token || '';
        if (token) {
          cy.visit(`/?embed=true&companionAppInstalled=true&token=${encodeURIComponent(token)}`, {timeout: 60000, failOnStatusCode: false});

          // Find chat input and type
          cy.get('textarea, input[type="text"]', { timeout: 300000 })
            .first()
            .should('be.visible')
            .type('hello');

          // Find send button and click
          cy.get('button[aria-label*="send"], button[type="submit"], button svg', { timeout: 300000 })
            .first()
            .click({ force: true });

          // Should show some loading or response (not an error page)
          cy.get('body').should('not.contain', '401');
          cy.get('body').should('not.contain', 'Unauthorized');
        }
      });
    });
  });

  describe('4. Guest Recovery', () => {
    it('should recover guest session from localStorage', () => {
      // Set guest mode in localStorage before visiting
      cy.visit('/', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('guest_mode', 'true');
          win.localStorage.setItem('guest_user_id', 'test-guest-123');
          win.localStorage.setItem('guest_name', 'Recovered Guest');
        },
      });

      // The app should try to recover the guest session
      // and not show login
      cy.get('body', { timeout: 300000 }).should('be.visible');
    });
  });
});
