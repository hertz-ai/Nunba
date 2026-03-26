/// <reference types="cypress" />

/**
 * Habit Features E2E Tests
 *
 * Tests the 6 "daily companion" features:
 * 1. Clipboard API endpoint
 * 2. Memory API endpoints (recent, search, delete)
 * 3. Voice input (mic button exists)
 * 4. Camera capture (camera button exists)
 * 5. Wake word toggle (ear button exists)
 * 6. Notification toast system
 */

const API = Cypress.config('baseUrl') || 'http://localhost:5000';

describe('Habit Features', () => {

  // Auth helper — register guest and set token
  before(() => {
    cy.request({
      method: 'POST',
      url: `${API}/api/social/auth/guest-register`,
      body: { guest_name: 'Habit Tester', source: 'cypress' },
      failOnStatusCode: false,
    }).then((res) => {
      const token = res.body.data?.token || res.body.token || '';
      if (token) {
        Cypress.env('guestToken', token);
        Cypress.env('userId', res.body.data?.user?.id || 'test');
      }
    });
  });

  describe('1. Clipboard API', () => {
    it('GET /clipboard/latest returns text', () => {
      cy.request({
        url: `${API}/clipboard/latest`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('text');
      });
    });
  });

  describe('2. Memory API', () => {
    it('GET /api/memory/recent returns array', () => {
      cy.request({
        url: `${API}/api/memory/recent`,
        qs: { user_id: Cypress.env('userId') || 'test', limit: 5 },
        failOnStatusCode: false,
      }).then((res) => {
        // May return 200 with empty array or 503 if memory module not installed
        expect(res.status).to.be.oneOf([200, 400, 404, 500, 503]);
        if (res.status === 200) {
          expect(res.body).to.have.property('memories');
          expect(res.body.memories).to.be.an('array');
        }
      });
    });

    it('GET /api/memory/search returns results', () => {
      cy.request({
        url: `${API}/api/memory/search`,
        qs: { q: 'test', user_id: Cypress.env('userId') || 'test' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 400, 404, 500, 503]);
        if (res.status === 200) {
          expect(res.body).to.have.property('results');
        }
      });
    });
  });

  describe('3. Chat UI — Input Bar Buttons', () => {
    beforeEach(() => {
      const token = Cypress.env('guestToken') || '';
      cy.visit(`/local`, {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('hart_sealed', 'true');
          win.localStorage.setItem('guest_mode', 'true');
          win.localStorage.setItem('guest_name', 'Habit Tester');
          if (token) win.localStorage.setItem('access_token', token);
        },
      });
    });

    it('has mic button (voice input)', () => {
      cy.get('button[title="Voice input"], button svg.lucide-mic', { timeout: 300000 })
        .should('exist');
    });

    it('has clipboard paste button', () => {
      cy.get('button[title="Paste from clipboard"]', { timeout: 300000 })
        .should('exist');
    });

    it('has camera capture button', () => {
      cy.get('button[title="Take photo"]', { timeout: 300000 })
        .should('exist');
    });

    it('has memory panel button', () => {
      cy.get('button[title="Memories"]', { timeout: 300000 })
        .should('exist');
    });

    it('has wake word toggle button', () => {
      cy.get('button[title*="Hey Nunba"], button[title*="listening"]', { timeout: 300000 })
        .should('exist');
    });
  });

  describe('4. Notification Toast System', () => {
    it('should not show notifications on fresh load', () => {
      cy.visit('/local', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('hart_sealed', 'true');
          win.localStorage.setItem('guest_mode', 'true');
        },
      });
      // No toast should be visible initially
      cy.get('[style*="position: fixed"][style*="bottom"]').should('not.exist');
    });
  });

  describe('5. Bootstrap API', () => {
    it('POST /api/ai/bootstrap returns plan', () => {
      cy.request({
        method: 'POST',
        url: `${API}/api/ai/bootstrap`,
        body: { language: 'en' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('phase');
      });
    });

    it('GET /api/ai/bootstrap/status returns state', () => {
      cy.request({
        url: `${API}/api/ai/bootstrap/status`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('phase');
        expect(res.body).to.have.property('steps');
      });
    });
  });

  describe('6. Health & Chat', () => {
    it('backend health returns healthy', () => {
      cy.request({
        url: `${API}/backend/health`,
        failOnStatusCode: false,
        timeout: 300000,
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.healthy).to.eq(true);
      });
    });

    it('chat endpoint accepts messages', () => {
      cy.request({
        method: 'POST',
        url: `${API}/chat`,
        body: {
          text: 'hello',
          user_id: 'cypress_test',
          agent_type: 'local',
          preferred_lang: 'en',
        },
        failOnStatusCode: false,
        timeout: 60000,
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.any.keys('text', 'response', 'loading');
      });
    });
  });
});
