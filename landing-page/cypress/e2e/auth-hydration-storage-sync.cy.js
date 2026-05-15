/// <reference types="cypress" />

/**
 * Auth-Hydration Storage-Sync E2E
 *
 * Verifies the cloud→companion→localStorage hydration path added by
 * `useStorageSync` (App.js) + the `/api/storage/set` DB upsert.
 *
 * Scenario:
 *   1. /api/storage/get/<key> returns cloud values (mocked) for
 *      access_token, user_id, email, agentname.
 *   2. Page loads with EMPTY localStorage.
 *   3. `useStorageSync` fires once on mount, calls /api/storage/get/*
 *      for each key, and populates localStorage matching the
 *      `Agent.js:94-106` URL-param handler keyset.
 *
 * The hook is the inverse of the omniparser-gui webview-reload-with-
 * token-in-URL trick: now that Nunba IS the companion, localStorage
 * is hydrated directly from companion storage rather than via a
 * cloud-route remount.  This test guards against regression of that
 * inverse.
 */

const CLOUD_USER = {
  access_token: 'cypress-cloud-jwt-token',
  user_id: '10202',
  email: 'Sales@hertzai.com',
  agentname: 'Hevolve',
};

function interceptStorageGet(values) {
  // Companion serves /api/storage/get/<key> from user_data.json.
  // We intercept all 4 keys so the hook's serial loop completes.
  for (const key of ['access_token', 'user_id', 'email', 'agentname']) {
    cy.intercept('GET', `/api/storage/get/${key}`, {
      statusCode: 200,
      body: {data: values[key] ?? null, success: true},
    }).as(`storage_get_${key}`);
  }
}

describe('auth-hydration: useStorageSync', () => {
  beforeEach(() => {
    // Companion-status probe runs on a 3s interval inside the
    // crossbarWorker and isn't relevant to this test — return a
    // generic "operational" so other components don't error.
    cy.intercept('GET', '/status', {
      statusCode: 200,
      body: {status: 'operational', device_id: 'cypress', log_file: ''},
    });
  });

  it('populates localStorage from companion storage when keys are empty', () => {
    interceptStorageGet(CLOUD_USER);

    cy.visit('/local', {
      onBeforeLoad(win) {
        // Empty localStorage so useStorageSync's idempotency guard
        // doesn't short-circuit.
        win.localStorage.clear();
      },
    });

    // Wait for all 4 GETs (the serial loop in useStorageSync).
    cy.wait('@storage_get_access_token');
    cy.wait('@storage_get_user_id');
    cy.wait('@storage_get_email');
    cy.wait('@storage_get_agentname');

    // localStorage should now have the Agent.js URL-param keyset.
    cy.window().then((win) => {
      expect(win.localStorage.getItem('access_token')).to.eq(
        CLOUD_USER.access_token
      );
      expect(win.localStorage.getItem('hevolve_access_id')).to.eq(
        CLOUD_USER.user_id
      );
      expect(win.localStorage.getItem('guest_user_id')).to.eq(
        CLOUD_USER.user_id
      );
      expect(win.localStorage.getItem('social_user_id')).to.eq(
        CLOUD_USER.user_id
      );
      expect(win.localStorage.getItem('guest_mode')).to.eq('true');
      expect(win.localStorage.getItem('guest_name_verified')).to.eq('true');
      expect(win.localStorage.getItem('agentname')).to.eq(
        CLOUD_USER.agentname
      );

      // Encrypted keys must NOT be set (Agent.js:194 expects CryptoJS).
      expect(win.localStorage.getItem('user_id')).to.be.null;
      expect(win.localStorage.getItem('email_address')).to.be.null;
    });
  });

  it('is a no-op when localStorage already has an access_token', () => {
    interceptStorageGet(CLOUD_USER);

    cy.visit('/local', {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem('access_token', 'pre-existing-in-page-token');
        win.localStorage.setItem('guest_user_id', 'pre-existing-user');
      },
    });

    // Give the effect a tick.  If the guard works, NO /api/storage/get
    // calls should fire at all.
    cy.wait(200);

    cy.window().then((win) => {
      expect(win.localStorage.getItem('access_token')).to.eq(
        'pre-existing-in-page-token'
      );
      expect(win.localStorage.getItem('guest_user_id')).to.eq(
        'pre-existing-user'
      );
    });

    // Confirm the intercepts were NOT consumed (Cypress doesn't have
    // a direct "was intercept called?" assertion — but if the hook
    // fired we'd see calls in cy.state). Instead assert no Agent.js
    // keyset was overwritten beyond what we set above.
    cy.window().then((win) => {
      expect(win.localStorage.getItem('social_user_id')).to.be.null;
      expect(win.localStorage.getItem('guest_mode')).to.be.null;
    });
  });

  it('does nothing when storage returns null token (no cloud signin yet)', () => {
    interceptStorageGet({
      access_token: null,
      user_id: null,
      email: null,
      agentname: null,
    });

    cy.visit('/local', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });

    cy.wait('@storage_get_access_token');
    cy.wait('@storage_get_user_id');
    cy.wait('@storage_get_email');
    cy.wait('@storage_get_agentname');

    cy.window().then((win) => {
      // Trigger condition (token AND user_id both present) was not
      // met — no localStorage mutation happens.
      expect(win.localStorage.getItem('access_token')).to.be.null;
      expect(win.localStorage.getItem('guest_user_id')).to.be.null;
      expect(win.localStorage.getItem('hevolve_access_id')).to.be.null;
    });
  });
});
