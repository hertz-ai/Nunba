/// <reference types="cypress" />

/**
 * Agent Consent — TRUE E2E (no mocks, no intercepts)
 *
 * Exercises the real backend round-trip:
 *   1. POST /agents/contact with {agent_id, user_id, reason} →
 *      returns {request_id, requires_consent, agent_name} AND
 *      fires `on_notification(target_user_id, {type:
 *      'agent_contact_request', ...})` which broadcasts via SSE +
 *      WAMP to the target user's subscribed clients.
 *   2. POST /agents/contact/respond with {request_id, action} →
 *      returns {success: true, agent_id, message, reason} on
 *      accept; clears the pending_contacts entry.
 *
 * Hits the running Nunba Flask on http://localhost:5000 directly
 * via cy.request — bypasses dev-server / React entirely.  This is
 * the unmocked confirmation that the bidirectional consent path
 * the React modal triggers is alive end-to-end.
 *
 * Handler: routes/chatbot_routes.py:3666 (request) +
 *          routes/chatbot_routes.py:3759 (respond).
 *
 * Storage: `_pending_contacts` dict in chatbot_routes.py:3664.
 */

const NUNBA_BASE = 'http://localhost:5000';
const TARGET_USER = '10202';

describe('agent consent E2E (live Nunba)', () => {
  it('full round-trip: contact → consent prompt → accept → success', () => {
    // ── Step 1: agent initiates contact ─────────────────────────
    const reason = `Cypress E2E test — ${Date.now()}`;
    cy.request({
      method: 'POST',
      url: `${NUNBA_BASE}/agents/contact`,
      headers: {'Content-Type': 'application/json'},
      body: {
        agent_id: 'claude_orchestrator',
        user_id: TARGET_USER,
        reason,
        message: 'Authorize WhatsApp onboarding outreach via the hive.',
      },
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body).to.have.property('request_id');
      expect(resp.body.request_id).to.match(/^[a-f0-9-]+$/i);
      expect(resp.body).to.have.property('requires_consent');
      expect(resp.body.agent_name).to.be.a('string');

      const requestId = resp.body.request_id;

      // ── Step 2: user accepts ───────────────────────────────────
      cy.request({
        method: 'POST',
        url: `${NUNBA_BASE}/agents/contact/respond`,
        headers: {'Content-Type': 'application/json'},
        body: {request_id: requestId, action: 'accept'},
      }).then((acceptResp) => {
        expect(acceptResp.status).to.eq(200);
        expect(acceptResp.body).to.deep.include({
          success: true,
          agent_id: 'claude_orchestrator',
        });
        expect(acceptResp.body.reason).to.eq(reason);

        // ── Step 3: replay accept → still 200, status stays
        // "accept" until the 1-hour cleanup sweep (chatbot_routes.py
        // :3795-3799 keeps the entry for an hour so a duplicate
        // response from a flaky network doesn't break).
        cy.request({
          method: 'POST',
          url: `${NUNBA_BASE}/agents/contact/respond`,
          headers: {'Content-Type': 'application/json'},
          body: {request_id: requestId, action: 'accept'},
        }).then((replayResp) => {
          expect(replayResp.status).to.eq(200);
          expect(replayResp.body.success).to.eq(true);
          expect(replayResp.body.agent_id).to.eq('claude_orchestrator');
        });
      });
    });
  });

  it('deny path: contact → respond deny → success without agent_id forward', () => {
    cy.request({
      method: 'POST',
      url: `${NUNBA_BASE}/agents/contact`,
      headers: {'Content-Type': 'application/json'},
      body: {
        agent_id: 'claude_orchestrator',
        user_id: TARGET_USER,
        reason: 'Cypress deny path',
      },
    }).then((resp) => {
      const requestId = resp.body.request_id;
      cy.request({
        method: 'POST',
        url: `${NUNBA_BASE}/agents/contact/respond`,
        headers: {'Content-Type': 'application/json'},
        body: {request_id: requestId, action: 'deny'},
      }).then((denyResp) => {
        expect(denyResp.status).to.eq(200);
        expect(denyResp.body).to.deep.include({
          success: true,
          denied: true,
          agent_id: 'claude_orchestrator',
        });
      });
    });
  });

  it('rejects unknown request_id with 404', () => {
    cy.request({
      method: 'POST',
      url: `${NUNBA_BASE}/agents/contact/respond`,
      headers: {'Content-Type': 'application/json'},
      body: {request_id: 'nonexistent-id', action: 'accept'},
      failOnStatusCode: false,
    }).its('status').should('eq', 404);
  });

  it('rejects invalid action with 400', () => {
    // Need a real pending request_id for this — bad action only triggers
    // 400 AFTER the request_id lookup passes.
    cy.request({
      method: 'POST',
      url: `${NUNBA_BASE}/agents/contact`,
      headers: {'Content-Type': 'application/json'},
      body: {
        agent_id: 'claude_orchestrator',
        user_id: TARGET_USER,
        reason: 'Cypress invalid-action path',
      },
    }).then((resp) => {
      cy.request({
        method: 'POST',
        url: `${NUNBA_BASE}/agents/contact/respond`,
        headers: {'Content-Type': 'application/json'},
        body: {request_id: resp.body.request_id, action: 'maybe'},
        failOnStatusCode: false,
      }).then((badResp) => {
        expect(badResp.status).to.eq(400);
        expect(badResp.body.error).to.match(/action/i);
        // Clean up the pending entry so it doesn't leak across runs.
        cy.request({
          method: 'POST',
          url: `${NUNBA_BASE}/agents/contact/respond`,
          headers: {'Content-Type': 'application/json'},
          body: {request_id: resp.body.request_id, action: 'deny'},
          failOnStatusCode: false,
        });
      });
    });
  });

  it('rejects POST without agent_id+user_id with 400', () => {
    cy.request({
      method: 'POST',
      url: `${NUNBA_BASE}/agents/contact`,
      headers: {'Content-Type': 'application/json'},
      body: {agent_id: '', user_id: ''},
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(400);
      expect(resp.body).to.have.property('error');
    });
  });
});
