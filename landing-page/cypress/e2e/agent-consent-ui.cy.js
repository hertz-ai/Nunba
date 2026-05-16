/// <reference types="cypress" />

/**
 * Agent Consent UI E2E
 *
 * Verifies the existing consent flow that App.js + AgentContactRequest
 * already implement.  An incoming `agent_contact_request` event with
 * `requires_consent: true` opens the Instagram-style modal at top of
 * screen with Accept / Deny buttons.  Clicking Accept fires
 * `POST /agents/contact/respond` with `{request_id, action: 'accept'}`;
 * Deny posts `action: 'deny'`.  This is the canonical bidirectional
 * consent path we should be using to capture user consent from a
 * client device — pushing through `realtimeService` (SSE/WAMP)
 * surfaces the modal regardless of whether the receiving client is
 * the localhost browser, an Android app via crossbar, or any other
 * subscribed device sharing the same user_id.
 *
 * The realtimeService singleton is exposed on window as
 * `__realtimeService` in non-production builds (see
 * realtimeService.js bottom of file).
 */

const CONSENT_REQUEST = {
  request_id: 'req-consent-e2e-001',
  agent_id: 'claude_orchestrator',
  agent_name: 'Claude Orchestrator',
  reason:
    'Authorize WhatsApp onboarding outreach via the hive — reach 10K users via seeded marketing goals.',
  requires_consent: true,
};

describe('agent consent UI', () => {
  beforeEach(() => {
    // Block companion-status noise so the test stays deterministic.
    cy.intercept('GET', '/status', {
      statusCode: 200,
      body: {status: 'operational', device_id: 'cypress', log_file: ''},
    });
    // Block storage GETs (useStorageSync side effect of mount).
    cy.intercept('GET', '/api/storage/get/*', {
      statusCode: 200,
      body: {data: null, success: true},
    });
  });

  it('opens AgentContactRequest modal on agent_contact_request emit', () => {
    cy.visit('/local', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });

    // realtimeService is exposed for dev/test in non-production builds.
    // Wait until App.js's useEffect has registered the listener.
    cy.window().should((win) => {
      const listeners = win.__realtimeService?._listeners?.get(
        'agent_contact_request'
      );
      expect(listeners).to.exist;
      expect(listeners.size).to.be.greaterThan(0);
    });

    cy.window().then((win) => {
      win.__realtimeService._emit('agent_contact_request', CONSENT_REQUEST);
    });

    // Modal renders (mounted) with the agent name + reason.  The
    // MUI Slide wrapper may keep the dialog momentarily off-screen
    // during animation, so we assert "exists in DOM" rather than
    // "visible in viewport".
    cy.contains(CONSENT_REQUEST.agent_name, {timeout: 8000}).should('exist');
    cy.contains('wants to talk to you').should('exist');
    cy.contains(CONSENT_REQUEST.reason).should('exist');

    // Accept and Deny buttons exist + are enabled.
    cy.contains('button', 'Accept').should('exist').and('not.be.disabled');
    cy.contains('button', 'Deny').should('exist').and('not.be.disabled');
  });

  it('Accept click POSTs {request_id, action: accept} to /agents/contact/respond', () => {
    cy.intercept('POST', '**/agents/contact/respond', (req) => {
      expect(req.body).to.deep.eq({
        request_id: CONSENT_REQUEST.request_id,
        action: 'accept',
      });
      req.reply({
        statusCode: 200,
        body: {success: true, agent_id: CONSENT_REQUEST.agent_id},
      });
    }).as('consentAccept');

    cy.visit('/local', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });

    cy.window().should((win) => {
      const listeners = win.__realtimeService?._listeners?.get(
        'agent_contact_request'
      );
      expect(listeners).to.exist;
      expect(listeners.size).to.be.greaterThan(0);
    });

    cy.window().then((win) => {
      win.__realtimeService._emit('agent_contact_request', CONSENT_REQUEST);
    });

    cy.contains('button', 'Accept', {timeout: 8000}).click({force: true});

    cy.wait('@consentAccept').its('response.statusCode').should('eq', 200);

    // Modal dismisses after response.
    cy.contains(CONSENT_REQUEST.agent_name).should('not.exist');

    // active_agent_id is persisted (App.js:74) — the .then() chain
    // runs after the response, may be async with React batching;
    // .should retries until the assertion passes or times out.
    cy.window().should((win) => {
      expect(win.localStorage.getItem('active_agent_id')).to.eq(
        CONSENT_REQUEST.agent_id
      );
    });
  });

  it('Deny click POSTs {request_id, action: deny} to /agents/contact/respond', () => {
    cy.intercept('POST', '**/agents/contact/respond', (req) => {
      expect(req.body).to.deep.eq({
        request_id: CONSENT_REQUEST.request_id,
        action: 'deny',
      });
      req.reply({statusCode: 200, body: {success: true}});
    }).as('consentDeny');

    cy.visit('/local', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });

    cy.window().should((win) => {
      const listeners = win.__realtimeService?._listeners?.get(
        'agent_contact_request'
      );
      expect(listeners).to.exist;
      expect(listeners.size).to.be.greaterThan(0);
    });

    cy.window().then((win) => {
      win.__realtimeService._emit('agent_contact_request', CONSENT_REQUEST);
    });

    cy.contains('button', 'Deny', {timeout: 8000}).click({force: true});

    cy.wait('@consentDeny').its('response.statusCode').should('eq', 200);

    cy.contains(CONSENT_REQUEST.agent_name).should('not.exist');

    // active_agent_id is NOT set on deny.
    cy.window().then((win) => {
      expect(win.localStorage.getItem('active_agent_id')).to.be.null;
    });
  });

  it('ignores agent_contact_request when requires_consent is false', () => {
    cy.visit('/local', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });

    cy.window().then((win) => {
      win.__realtimeService._emit('agent_contact_request', {
        ...CONSENT_REQUEST,
        requires_consent: false,
      });
    });

    // Modal does NOT render — App.js:43 guards on requires_consent.
    cy.wait(500);
    cy.contains(CONSENT_REQUEST.agent_name).should('not.exist');
    cy.contains('wants to talk to you').should('not.exist');
  });
});
