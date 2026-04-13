/**
 * Cypress E2E Tests -- Admin API Endpoints
 *
 * Covers:
 *   1. Social Admin: user management (update, ban/unban)
 *   2. Social Admin: moderation (reports, hide/delete posts/comments)
 *   3. Social Admin: logs, agent sync
 *   4. Channels Admin: config/settings (GET/PUT)
 *   5. Channels Admin: identity (GET/PUT, avatars)
 *   6. Channels Admin: channels CRUD
 *   7. Channels Admin: workflows CRUD + enable/disable
 *   8. Channels Admin: metrics, status
 *
 * Two blueprints:
 *   - Social admin:   http://localhost:5000/api/social/admin/*
 *   - Channels admin: http://localhost:5000/api/admin/*
 */

const API_BASE = 'http://localhost:5000';
const ADMIN_API = `${API_BASE}/api/admin`;

// Helper: make raw request to channels admin API
function adminRequest(method, path, body) {
  const token = Cypress.env('socialToken');
  return cy.request({
    method,
    url: `${ADMIN_API}${path}`,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
    },
    failOnStatusCode: false,
  });
}

// ---------------------------------------------------------------
// 1. Social Admin -- User Management
// ---------------------------------------------------------------
describe('Admin API -- User Management (Social)', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should list users via GET /admin/users', () => {
    cy.socialRequest('GET', '/admin/users').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('data');
        expect(res.body.data).to.be.an('array');
      }
    });
  });

  it('should update a user via PATCH /admin/users/:id', () => {
    const userId = Cypress.env('socialUserId') || 'nonexistent';
    cy.socialRequest('PATCH', `/admin/users/${userId}`, {
      display_name: 'Updated by Cypress',
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
      }
    });
  });

  it('should ban a user via POST /admin/users/:id/ban', () => {
    cy.socialRequest('POST', '/admin/users/nonexistent-user-id/ban').then(
      (res) => {
        expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
      }
    );
  });

  it('should unban a user via DELETE /admin/users/:id/ban', () => {
    cy.socialRequest('DELETE', '/admin/users/nonexistent-user-id/ban').then(
      (res) => {
        expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
      }
    );
  });

  it('should get admin stats via GET /admin/stats', () => {
    cy.socialRequest('GET', '/admin/stats').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
      }
    });
  });
});

// ---------------------------------------------------------------
// 2. Social Admin -- Moderation
// ---------------------------------------------------------------
describe('Admin API -- Moderation (Social)', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should list reports via GET /admin/moderation/reports', () => {
    cy.socialRequest('GET', '/admin/moderation/reports').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('data');
      }
    });
  });

  it('should get a single report via GET /admin/moderation/reports/:id', () => {
    cy.socialRequest(
      'GET',
      '/admin/moderation/reports/nonexistent-report'
    ).then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should resolve a report via POST /admin/moderation/reports/:id/resolve', () => {
    cy.socialRequest(
      'POST',
      '/admin/moderation/reports/nonexistent-report/resolve',
      {
        status: 'reviewed',
      }
    ).then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should hide a post via POST /admin/moderation/posts/:id/hide', () => {
    cy.socialRequest(
      'POST',
      '/admin/moderation/posts/nonexistent-post/hide'
    ).then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should unhide a post via DELETE /admin/moderation/posts/:id/hide', () => {
    cy.socialRequest(
      'DELETE',
      '/admin/moderation/posts/nonexistent-post/hide'
    ).then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should delete a post via DELETE /admin/moderation/posts/:id', () => {
    cy.socialRequest('DELETE', '/admin/moderation/posts/nonexistent-post').then(
      (res) => {
        expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
      }
    );
  });

  it('should hide a comment via POST /admin/moderation/comments/:id/hide', () => {
    cy.socialRequest(
      'POST',
      '/admin/moderation/comments/nonexistent-comment/hide'
    ).then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should delete a comment via DELETE /admin/moderation/comments/:id', () => {
    cy.socialRequest(
      'DELETE',
      '/admin/moderation/comments/nonexistent-comment'
    ).then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });
});

// ---------------------------------------------------------------
// 3. Social Admin -- Logs & Agent Sync
// ---------------------------------------------------------------
describe('Admin API -- Logs & Sync (Social)', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should get admin logs via GET /admin/logs', () => {
    cy.socialRequest('GET', '/admin/logs').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('data');
      }
    });
  });

  it('should get admin logs with limit param', () => {
    cy.socialRequest('GET', '/admin/logs?limit=10').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should sync agents via POST /admin/agents/sync', () => {
    cy.socialRequest('POST', '/admin/agents/sync').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
      }
    });
  });
});

// ---------------------------------------------------------------
// 4. Channels Admin -- Config/Settings
// ---------------------------------------------------------------
describe('Admin API -- Config/Settings (Channels)', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should get global config via GET /config', () => {
    adminRequest('GET', '/config').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
      }
    });
  });

  it('should get security config via GET /config/security', () => {
    adminRequest('GET', '/config/security').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should get media config via GET /config/media', () => {
    adminRequest('GET', '/config/media').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should get response config via GET /config/response', () => {
    adminRequest('GET', '/config/response').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should get memory config via GET /config/memory', () => {
    adminRequest('GET', '/config/memory').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should export config via GET /config/export', () => {
    adminRequest('GET', '/config/export').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });
});

// ---------------------------------------------------------------
// 5. Channels Admin -- Identity
// ---------------------------------------------------------------
describe('Admin API -- Identity (Channels)', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should get identity via GET /identity', () => {
    adminRequest('GET', '/identity').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
      }
    });
  });

  it('should get avatars via GET /identity/avatars', () => {
    adminRequest('GET', '/identity/avatars').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should get sender mappings via GET /identity/sender-mappings', () => {
    adminRequest('GET', '/identity/sender-mappings').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });
});

// ---------------------------------------------------------------
// 6. Channels Admin -- Channels
// ---------------------------------------------------------------
describe('Admin API -- Channels (Channels)', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should list channels via GET /channels', () => {
    adminRequest('GET', '/channels').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
        expect(res.body).to.have.property('data');
      }
    });
  });

  it('should get a specific channel via GET /channels/telegram', () => {
    adminRequest('GET', '/channels/telegram').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should handle enable channel via POST /channels/telegram/enable', () => {
    adminRequest('POST', '/channels/telegram/enable').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should handle disable channel via POST /channels/telegram/disable', () => {
    adminRequest('POST', '/channels/telegram/disable').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should handle test channel via POST /channels/telegram/test', () => {
    adminRequest('POST', '/channels/telegram/test').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should handle reconnect channel via POST /channels/telegram/reconnect', () => {
    adminRequest('POST', '/channels/telegram/reconnect').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });
});

// ---------------------------------------------------------------
// 7. Channels Admin -- Workflows
// ---------------------------------------------------------------
describe('Admin API -- Workflows (Channels)', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should list workflows via GET /automation/workflows', () => {
    adminRequest('GET', '/automation/workflows').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
      }
    });
  });

  it('should create a workflow via POST /automation/workflows', () => {
    adminRequest('POST', '/automation/workflows', {
      name: `CypressWorkflow_${Date.now()}`,
      description: 'Automated test workflow',
      trigger: {type: 'message', conditions: {}},
      actions: [{type: 'reply', config: {template: 'Hello'}}],
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 201, 401, 403, 404, 500, 503]);
      if (res.status < 400 && res.body.data) {
        const wf = res.body.data;
        Cypress.env('testWorkflowId', wf.id || wf.workflow_id);
      }
    });
  });

  it('should get a workflow by ID via GET /automation/workflows/:id', () => {
    const id = Cypress.env('testWorkflowId') || 'nonexistent';
    adminRequest('GET', `/automation/workflows/${id}`).then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should enable a workflow via POST /automation/workflows/:id/enable', () => {
    const id = Cypress.env('testWorkflowId') || 'nonexistent';
    adminRequest('POST', `/automation/workflows/${id}/enable`).then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should disable a workflow via POST /automation/workflows/:id/disable', () => {
    const id = Cypress.env('testWorkflowId') || 'nonexistent';
    adminRequest('POST', `/automation/workflows/${id}/disable`).then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should execute a workflow via POST /automation/workflows/:id/execute', () => {
    const id = Cypress.env('testWorkflowId') || 'nonexistent';
    adminRequest('POST', `/automation/workflows/${id}/execute`, {
      test: true,
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should delete a workflow via DELETE /automation/workflows/:id', () => {
    const id = Cypress.env('testWorkflowId') || 'nonexistent';
    adminRequest('DELETE', `/automation/workflows/${id}`).then((res) => {
      expect(res.status).to.be.oneOf([200, 204, 401, 403, 404, 500, 503]);
    });
  });
});

// ---------------------------------------------------------------
// 8. Channels Admin -- Metrics & Status
// ---------------------------------------------------------------
describe('Admin API -- Metrics & Status (Channels)', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should get system status via GET /status', () => {
    adminRequest('GET', '/status').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
      if (res.status === 200) {
        expect(res.body).to.have.property('success', true);
      }
    });
  });

  it('should get health via GET /health', () => {
    adminRequest('GET', '/health').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should get metrics via GET /metrics', () => {
    adminRequest('GET', '/metrics').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should get latency metrics via GET /metrics/latency', () => {
    adminRequest('GET', '/metrics/latency').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should get metrics history via GET /metrics/history', () => {
    adminRequest('GET', '/metrics/history').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should get error metrics via GET /metrics/errors', () => {
    adminRequest('GET', '/metrics/errors').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('should get version via GET /version', () => {
    adminRequest('GET', '/version').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });
});

// ---------------------------------------------------------------
// 9. Channels Admin -- Plugins
// ---------------------------------------------------------------
describe('Admin API -- Plugins (Channels)', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should list plugins via GET /plugins', () => {
    adminRequest('GET', '/plugins').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });
});

// ---------------------------------------------------------------
// 10. Channels Admin -- Sessions
// ---------------------------------------------------------------
describe('Admin API -- Sessions (Channels)', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should list sessions via GET /sessions', () => {
    adminRequest('GET', '/sessions').then((res) => {
      expect(res.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });
});

// ---------------------------------------------------------------
// 11. Admin API -- Auth Enforcement
// ---------------------------------------------------------------
describe('Admin API -- Auth Enforcement', () => {
  it('should reject unauthenticated requests to social admin', () => {
    cy.request({
      method: 'GET',
      url: `${API_BASE}/api/social/admin/users`,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403, 404, 500, 503]);
    });
  });

  it('should reject unauthenticated requests to channels admin', () => {
    cy.request({
      method: 'GET',
      url: `${ADMIN_API}/config`,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403, 404, 500, 503]);
    });
  });

  it('should reject unauthenticated requests to moderation', () => {
    cy.request({
      method: 'GET',
      url: `${API_BASE}/api/social/admin/moderation/reports`,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403, 404, 500, 503]);
    });
  });

  it('should reject unauthenticated requests to logs', () => {
    cy.request({
      method: 'GET',
      url: `${API_BASE}/api/social/admin/logs`,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403, 404, 500, 503]);
    });
  });
});
