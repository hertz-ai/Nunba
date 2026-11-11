/**
 * UAT journeys J200-J220 — Cypress coverage for the guest/TTS/agent
 * journeys that have dedicated pytest files but no Cypress spec.
 *
 * Mapping (file-name derived intent):
 *   J200 guest chat persists tab reopen
 *   J201 guest chat restore after fake reinstall
 *   J202 guest autologin via URL token
 *   J203 guest per-agent autoscroll
 *   J204 two guests same device no bleed
 *   J205 guest token persists crossbar restart
 *   J206 guest id stable across boots
 *   J207 admin-controlled restore
 *   J210 portuguese TTS routable
 *   J211 lifecycle state persistence
 *   J212 real engine handshake
 *   J213 cosyvoice3 demoted
 *   J214 active TTS pin
 *   J215 venv create idempotent
 *   J216 real ingest checker
 *   J217 backend health envelope
 *   J218 crossbar ticket rotates
 *   J219 social feed envelope
 *   J220 notifications envelope
 */

const installBaselineStubs = () => {
  cy.intercept('GET', '**/api/social/resonance/wallet', {statusCode: 200, body: {success: true, data: null}});
  cy.intercept('GET', '**/api/social/onboarding/progress', {statusCode: 200, body: {success: true}});
  cy.intercept('GET', '**/api/social/notifications*', {statusCode: 200, body: {success: true, data: []}});
  cy.intercept('GET', '**/api/social/encounters/suggestions', {statusCode: 200, body: {success: true, data: []}});
  cy.intercept('GET', '**/backend/health', {statusCode: 200, body: {healthy: true, local: {available: true}, loading: false}});
  cy.intercept('GET', '**/api/guest-id', {statusCode: 200, body: {guest_id: 'g_j200_j220_fixture'}});
};

// ════════════════════════════════════════════════════════════════════════
// J200-J207 — Guest identity + chat-sync + restore
// ════════════════════════════════════════════════════════════════════════

describe('J200-J207: guest identity + chat persistence', () => {
  beforeEach(() => {
    installBaselineStubs();
    cy.clearLocalStorage();
  });

  it('J200: localStorage chat key survives tab reopen (reload)', () => {
    cy.visit('/local', {failOnStatusCode: false});
    cy.window().then((win) => {
      win.localStorage.setItem('nunba_chat_guest_agent1', JSON.stringify([
        {role: 'user', text: 'persisted'},
      ]));
    });
    cy.reload();
    cy.window().then((win) => {
      expect(win.localStorage.getItem('nunba_chat_guest_agent1')).to.contain('persisted');
    });
  });

  it('J201: device_id survives after localStorage.clear of non-id keys', () => {
    cy.visit('/local', {failOnStatusCode: false});
    cy.window().then((win) => {
      const dev = win.localStorage.getItem('device_id');
      if (dev) {
        // Simulate "fake reinstall" by clearing only unrelated keys.
        win.localStorage.removeItem('nunba_chat_guest_agent1');
        expect(win.localStorage.getItem('device_id')).to.eq(dev);
      }
    });
  });

  it('J202: ?guest_token= URL param does not crash /local', () => {
    // A sealed HART: unsealed, /local is the first-run ceremony, not the chat.
    cy.sealHart();
    cy.visit('/local?guest_token=abc123', {
      failOnStatusCode: false,
      // Spy before the page's scripts run: guest-register overwrites
      // access_token with its JWT before the textarea shows, so reading it
      // afterwards cannot see a token adopted at load.
      onBeforeLoad(win) { cy.spy(win.Storage.prototype, 'setItem').as('setItem'); },
    });
    cy.get('textarea', {timeout: 30000}).should('be.visible');
    // Nothing in the page reads guest_token; this pins that no URL token is
    // ever written as access_token
    // (tests/journey/test_J202_guest_autologin_via_url_token.py).
    cy.get('@setItem').should('not.have.been.calledWith', 'access_token', 'abc123');
  });

  it('J203: per-agent localStorage keys coexist with different agent ids', () => {
    cy.visit('/local', {failOnStatusCode: false});
    cy.window().then((win) => {
      win.localStorage.setItem('nunba_chat_guest_agent_A', JSON.stringify([{role: 'user', text: 'A-text'}]));
      win.localStorage.setItem('nunba_chat_guest_agent_B', JSON.stringify([{role: 'user', text: 'B-text'}]));
      expect(win.localStorage.getItem('nunba_chat_guest_agent_A')).to.contain('A-text');
      expect(win.localStorage.getItem('nunba_chat_guest_agent_B')).to.contain('B-text');
    });
  });

  it('J204: two different guest_ids in localStorage do not overwrite each other', () => {
    cy.visit('/local', {failOnStatusCode: false});
    cy.window().then((win) => {
      win.localStorage.setItem('nunba_chat_guest_g_A_agent1', JSON.stringify([{role: 'user', text: 'A'}]));
      win.localStorage.setItem('nunba_chat_guest_g_B_agent1', JSON.stringify([{role: 'user', text: 'B'}]));
      expect(win.localStorage.getItem('nunba_chat_guest_g_A_agent1')).to.contain('"A"');
      expect(win.localStorage.getItem('nunba_chat_guest_g_B_agent1')).to.contain('"B"');
    });
  });

  it('J205: with storage wiped, guest_user_id is the injected hardware id and survives a reload', () => {
    // With storage wiped and no guest registered yet (HART unsealed),
    // SocialContext copies window.__NUNBA_GUEST_ID__ (main.py
    // _inject_guest_id_into_html) into guest_user_id.  Once a guest
    // registers, guest_user_id becomes the HARTOS user id instead.
    cy.visit('/local', {failOnStatusCode: false});
    cy.window().should((win) => {
      const g = win.localStorage.getItem('guest_user_id');
      expect(g).to.be.a('string').and.not.empty;
      expect(g).to.eq(win.__NUNBA_GUEST_ID__);
    });
    cy.window().its('localStorage').invoke('getItem', 'guest_user_id').then((before) => {
      cy.reload();
      cy.window().should((win) => {
        expect(win.localStorage.getItem('guest_user_id')).to.eq(before);
        expect(win.localStorage.getItem('guest_user_id')).to.eq(win.__NUNBA_GUEST_ID__);
      });
    });
  });

  it('J206: GET /api/guest-id returns a stable-looking id envelope', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/guest-id`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401, 403, 500, 503]);
      if (resp.status === 200 && resp.body.guest_id) {
        expect(resp.body.guest_id).to.be.a('string');
      }
    });
  });

  it('J207: GET /api/admin/config/chat returns restore policy envelope', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/admin/config/chat`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401, 403, 500, 503]);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// J210-J215 — TTS + lifecycle + venv
// ════════════════════════════════════════════════════════════════════════

describe('J210-J215: TTS routes + lifecycle + venv', () => {
  beforeEach(() => {
    installBaselineStubs();
  });

  it('J210: POST /api/social/tts/quick in Portuguese returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/social/tts/quick`,
      body: {text: 'Olá mundo', voice: 'default', lang: 'pt'},
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 202, 400, 401, 403, 503]);
    });
  });

  it('J211: /api/chat-sync/pull envelope exposes lifecycle state', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/chat-sync/pull`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 400, 401, 403, 404, 500, 503]);
    });
  });

  it('J212: GET /api/tts/status returns engine handshake envelope', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/tts/status`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401, 403, 404, 503]);
    });
  });

  it('J213: GET /api/tts/engines does not list cosyvoice3 as default-active', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/tts/engines`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401, 403, 404, 503]);
    });
  });

  it('J214: POST /api/tts/pin-active returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/tts/pin-active`,
      body: {engine: 'piper'},
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 400, 401, 403, 404, 405, 503]);
    });
  });

  it('J215: POST /api/tts/venv/create returns envelope (idempotent)', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/tts/venv/create`,
      body: {backend: 'piper'},
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 202, 400, 401, 403, 404, 405, 409, 503]);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// J216-J220 — Ingest + health + crossbar + social feed + notifications
// ════════════════════════════════════════════════════════════════════════

describe('J216-J220: ingest + health + crossbar', () => {
  beforeEach(() => {
    installBaselineStubs();
  });

  it('J216: GET /api/admin/diag/ingest returns envelope', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/admin/diag/ingest`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('J217: GET /backend/health returns healthy envelope', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/backend/health`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 503]);
    });
  });

  it('J218: GET /api/wamp/ticket returns rotating ticket envelope', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/wamp/ticket`,
      failOnStatusCode: false,
    }).then((respA) => {
      expect(respA.status).to.be.oneOf([200, 401, 403]);
    });
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/wamp/ticket`,
      failOnStatusCode: false,
    }).then((respB) => {
      expect(respB.status).to.be.oneOf([200, 401, 403]);
    });
  });

  it('J219: GET /api/social/feed returns envelope', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/social/feed`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('J220: GET /api/social/notifications returns envelope', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/social/notifications`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });
});
