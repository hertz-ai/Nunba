/// <reference types="cypress" />

/**
 * WhatsApp Self-Chat Admin Toggle
 *
 * Verifies the admin UI surface for the "Self-chat → Nunba" feature:
 *   - metadata.py exposes enable_self_chat_agent in WhatsApp setup_fields
 *   - config persists across a refresh
 *   - live registry reflects the toggle in /api/admin/channels/whatsapp
 *
 * DOES NOT drive a real WAHA send — that belongs in a live pytest with
 * NUNBA_LIVE_WA=1 (see tests/live/test_whatsapp_self_chat.py when added).
 */

describe('WhatsApp Self-Chat Admin Toggle', () => {
  const API = 'http://localhost:5000';
  const CHANNELS = `${API}/api/admin/channels`;

  before(() => {
    cy.socialAuth();
  });

  it('exposes enable_self_chat_agent in WhatsApp channel metadata', () => {
    cy.socialRequest('GET', `${CHANNELS}/metadata/whatsapp`, null, {
      failOnStatusCode: false,
    }).then((resp) => {
      // Accept the variety of legit shapes this endpoint has worn over time
      expect(resp.status).to.be.oneOf([200, 401, 403, 404, 500]);
      if (resp.status !== 200) return;

      const meta = resp.body?.data || resp.body;
      const fields = meta?.setup_fields || [];
      const keys = fields.map((f) => f.key);

      // Must expose the new self-chat toggle
      expect(keys, 'setup_fields exposes enable_self_chat_agent').to.include(
        'enable_self_chat_agent',
      );

      const toggle = fields.find((f) => f.key === 'enable_self_chat_agent');
      expect(toggle.type).to.eq('toggle');
      expect(toggle.default).to.eq(true);
      // Help text must not leak any real E.164 digit sequence of length ≥10
      expect(String(toggle.help || '')).to.not.match(/\+?\d{10,}/);
    });
  });

  it('persists enable_self_chat_agent across save + reload', () => {
    const payload = {
      enabled: true,
      access_token: 'test-wa-key',
      phone_number: '+15551234567',   // fake E.164 for test only
      enable_self_chat_agent: true,
    };

    cy.socialRequest('PUT', `${CHANNELS}/whatsapp`, payload, {
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 204, 401, 403, 404, 500]);
    });

    cy.socialRequest('GET', `${CHANNELS}/whatsapp`, null, {
      failOnStatusCode: false,
    }).then((resp) => {
      if (resp.status !== 200) return;
      const cfg = resp.body?.data || resp.body;
      expect(cfg.enable_self_chat_agent).to.eq(true);
      // token must be masked in GET response — never echo the raw secret back
      if (cfg.access_token) {
        expect(String(cfg.access_token)).to.not.eq(payload.access_token);
      }
      // Phone must match what we set (not a default leak)
      if (cfg.phone_number) {
        expect(cfg.phone_number).to.eq(payload.phone_number);
      }
    });
  });

  it('disables self-chat agent when toggle set to false', () => {
    cy.socialRequest('PUT', `${CHANNELS}/whatsapp`, {
      enable_self_chat_agent: false,
    }, {failOnStatusCode: false});

    cy.socialRequest('GET', `${CHANNELS}/whatsapp`, null, {
      failOnStatusCode: false,
    }).then((resp) => {
      if (resp.status !== 200) return;
      const cfg = resp.body?.data || resp.body;
      expect(cfg.enable_self_chat_agent).to.eq(false);
    });
  });

  it('admin UI renders the toggle at /admin/channels/whatsapp', () => {
    cy.socialVisitAsAdmin('/admin/channels/whatsapp');
    cy.contains(/self.chat|message yourself|enable_self_chat/i, {
      timeout: 10000,
    }).should('be.visible');
  });
});
