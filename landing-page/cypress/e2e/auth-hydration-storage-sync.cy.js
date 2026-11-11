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

// What the hook reads, in order (useStorageSync.js): the first-run reset
// marker, then STORAGE_KEYS (the four sign-in keys and the four HART
// identity keys), one at a time.  It writes localStorage only after the
// last read, so every key is answered here and assertions wait for the
// written value (it can take several seconds on a busy runner).
const READ_KEYS = [
  'hart_reset_on_first_run',
  'access_token', 'user_id', 'email', 'agentname',
  'hart_sealed', 'hart_name', 'hart_emoji', 'hart_language',
];

// A JWT-shaped token: the hook tells a guest JWT (payload username
// guest_...) from a cloud one by its payload (isGuestJwt).
function makeJwt(payload) {
  const b64 = (o) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({alg: 'HS256', typ: 'JWT'})}.${b64(payload)}.c2ln`;
}

const CLOUD_TOKEN = makeJwt({username: 'sales@hertzai.com'});
const GUEST_TOKEN = makeJwt({username: 'guest_5_abc'});
const USER = {user_id: '10202', email: 'Sales@hertzai.com', agentname: 'Hevolve'};

function interceptStorageGet(values) {
  for (const key of READ_KEYS) {
    cy.intercept('GET', `/api/storage/get/${key}`, {
      statusCode: 200,
      body: {data: values[key] ?? null, success: true},
    }).as(`storage_get_${key}`);
  }
}

const ls = (key) => cy.window().its('localStorage').invoke('getItem', key);

describe('auth-hydration: useStorageSync', () => {
  beforeEach(() => {
    // Companion-status probe runs on a 3s interval inside the
    // crossbarWorker and isn't relevant to this test — return a
    // generic "operational" so other components don't error.
    cy.intercept('GET', '/status', {
      statusCode: 200,
      body: {status: 'operational', device_id: 'cypress', log_file: ''},
    });
    // The page checks its token with /auth/me; a 401 makes axiosFactory
    // clear it (clearAccessTokenForExpiry), measured with the made-up tokens
    // here.  These tests are about the hook, so the token is accepted.
    cy.intercept('GET', '**/api/social/auth/me*', {
      statusCode: 200,
      body: {success: true, data: {id: USER.user_id, username: 'cypress', role: 'flat'}},
    });
  });

  it('hydrates a cloud sign-in: token, encrypted user id and email', () => {
    interceptStorageGet({access_token: CLOUD_TOKEN, ...USER});
    cy.visit('/local', {onBeforeLoad: (win) => win.localStorage.clear()});
    cy.wait('@storage_get_hart_language');

    ls('access_token').should('eq', CLOUD_TOKEN);
    // user_id and email_address are stored encrypted (encryption.js), never raw.
    ls('user_id').should('be.a', 'string').and('not.eq', USER.user_id);
    ls('email_address').should('be.a', 'string').and('not.eq', USER.email);
    ls('agentname').should('eq', USER.agentname);
    ls('pending_cloud_user_id').should('be.null');
  });

  it('hydrates a guest sign-in as a guest, never as a cloud session', () => {
    interceptStorageGet({access_token: GUEST_TOKEN, ...USER});
    cy.visit('/local', {onBeforeLoad: (win) => win.localStorage.clear()});
    cy.wait('@storage_get_hart_language');

    ls('access_token').should('eq', GUEST_TOKEN);
    ls('guest_mode').should('eq', 'true');
    ls('hevolve_access_id').should('eq', USER.user_id);
    ls('social_user_id').should('eq', USER.user_id);
    // A guest's user id must not be encrypted into the cloud key
    // (useStorageSync's isGuestJwt rationale).
    ls('user_id').should('be.null');
  });

  it('is a no-op for the sign-in keyset when localStorage already has an access_token', () => {
    // A real token (cy.socialAuth): a made-up one is refused by the
    // server's authenticated routes, and every 401 clears it (axiosFactory),
    // which is not what this test is about.  Storage offers a different
    // token; the hook must not take it.
    cy.socialAuth().then(({access_token: token}) => {
      interceptStorageGet({access_token: CLOUD_TOKEN, ...USER});
      cy.visit('/local', {
        onBeforeLoad(win) {
          win.localStorage.clear();
          win.localStorage.setItem('access_token', token);
          win.localStorage.setItem('guest_user_id', 'pre-existing-user');
        },
      });
      // That branch only tops up: the reset marker, then the encrypted-blob
      // backfill (user_id, email).
      cy.wait('@storage_get_email');
      ls('access_token').should('eq', token);
    });
    ls('guest_user_id').should('eq', 'pre-existing-user');
    ls('social_user_id').should('be.null');
    ls('hevolve_access_id').should('be.null');
  });

  it('writes no identity when storage has no sign-in (no cloud signin yet)', () => {
    interceptStorageGet({});
    cy.visit('/local', {onBeforeLoad: (win) => win.localStorage.clear()});
    cy.wait('@storage_get_hart_language');
    cy.wait(1000); // the hook's last write, if any, follows its last read

    // Keys only this hook writes.  (guest_user_id is not one: the page's
    // own guest identity sets it, measured at ~8 s on /local.)
    ls('hevolve_access_id').should('be.null');
    ls('social_user_id').should('be.null');
    ls('pending_cloud_user_id').should('be.null');
    ls('user_id').should('be.null');
  });
});
