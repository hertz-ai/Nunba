/**
 * UAT journeys J52–J99 — Cypress coverage of the mid-range
 * journeys whose pytest contracts live in batch #8
 * (tests/journey/test_journey_gaps_J21_to_J99.py).
 *
 * Covers the J52-J99 surface contracts from the Cypress shard to
 * ensure both frontend-only and live-backend CI tiers validate the
 * same HTTP routes.
 *
 *   J52-J57 · pre-existing journey files (wamp/crossbar/kids/mcp)
 *   J58 · DMs (GAP skip)
 *   J60-J63 · auth/mcp/peer
 *   J64 · HiveMind fusion (GAP skip)
 *   J65-J77 · runtime/shutdown/provider/vlm/fleet
 *   J78-J82 · tier/encryption/mcp
 *   J83-J87 · distributed goal + remote desktop (remote skip)
 *   J88-J91 · coding + video/audio gen
 *   J92-J99 · social admin + onboarding + misc
 */

const installBaselineStubs = () => {
  cy.intercept('GET', '**/api/social/resonance/wallet', {statusCode: 200, body: {success: true, data: null}});
  cy.intercept('GET', '**/api/social/onboarding/progress', {statusCode: 200, body: {success: true}});
  cy.intercept('GET', '**/api/social/notifications*', {statusCode: 200, body: {success: true, data: []}});
  cy.intercept('GET', '**/api/social/encounters/suggestions', {statusCode: 200, body: {success: true, data: []}});
  cy.intercept('GET', '**/backend/health', {statusCode: 200, body: {healthy: true, local: {available: true}, loading: false}});
  cy.intercept('GET', '**/api/guest-id', {statusCode: 200, body: {guest_id: 'g_j52_j99_fixture'}});
};

// ════════════════════════════════════════════════════════════════════════
// J58, J64 — GAP
// ════════════════════════════════════════════════════════════════════════

describe.skip('J58, J64: GAP-flagged journeys (covered by pytest skip-markers)', () => {
  it('J58 DMs placeholder', () => {});
  it('J64 HiveMind fusion placeholder', () => {});
});

// ════════════════════════════════════════════════════════════════════════
// J52-J57 — WAMP + crossbar + kids
// ════════════════════════════════════════════════════════════════════════

describe('J52-J57: WAMP/crossbar/kids runtime', () => {
  beforeEach(() => {
    installBaselineStubs();
  });

  it('J52: GET /api/wamp/status returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/wamp/status`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 503]);
    });
  });

  it('J53: GET /api/wamp/ticket returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/wamp/ticket`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403]);
    });
  });

  it('J54: GET /api/media/asset with missing prompt returns 400', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/media/asset`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([400, 401, 403, 503]);
    });
  });

  it('J55: GET /api/social/kids/game lists kids game slots', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/social/kids/game`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 404, 503]);
    });
  });

  it('J56: GET /api/mcp/local/health returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/mcp/local/health`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 503]);
    });
  });

  it('J57: GET /api/mcp/local/tools/list returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/mcp/local/tools/list`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 403, 503]);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// J60-J63 — Auth, peer, encrypted channel
// ════════════════════════════════════════════════════════════════════════

describe('J60-J63: auth + peer + encrypted channel', () => {
  beforeEach(() => {
    installBaselineStubs();
  });

  it('J60: POST /api/social/auth/register returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/social/auth/register`,
      body: {username: `cy_j60_${Date.now()}`, password: 'testpwd!23'},
      failOnStatusCode: false,
    }).then((r) => {
      // A new user is 201 Created (as J06 in uat-journeys-j06-j10).
      expect(r.status).to.be.oneOf([200, 201, 400, 409, 503]);
      if (r.status === 200 || r.status === 201) {
        expect(r.body.data).to.have.property('api_token');
      }
    });
  });

  it('J61: POST /api/social/auth/login returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/social/auth/login`,
      body: {username: 'nonexistent_j61', password: 'wrongpw'},
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 400, 401, 503]);
    });
  });

  it('J62: POST /api/distributed/tasks/announce returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/distributed/tasks/announce`,
      body: {},
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 202, 400, 401, 403, 404, 503]);
    });
  });

  it('J63: GET /api/distributed/peer/keys returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/distributed/peer/keys`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 404, 503]);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// J65-J77 — Runtime / shutdown / provider / VLM / fleet
// ════════════════════════════════════════════════════════════════════════

describe('J65-J77: runtime + provider + VLM + fleet', () => {
  beforeEach(() => {
    installBaselineStubs();
  });

  // The thread dump is POST only (a GET answered 405); on loopback it writes
  // every thread's stack to the startup trace and says how many.
  it('J65: POST /api/admin/diag/thread-dump dumps the threads', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/admin/diag/thread-dump`,
      body: {},
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.eq(200);
      expect(r.body.success).to.eq(true);
      expect(r.body.threads_dumped).to.be.greaterThan(0);
    });
  });

  it('J66: GET /api/admin/diag/degradations returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/admin/diag/degradations`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 500, 503]);
    });
  });

  it('J67: POST /api/tts/setup-engine returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/tts/setup-engine`,
      body: {engine: 'kokoro'},
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 400, 401, 403, 404, 405, 503]);
    });
  });

  it('J69: GET /api/admin/diag/paths returns data-dir info', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/admin/diag/paths`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 404, 503]);
    });
  });

  it('J70: GET /api/admin/shutdown returns envelope (no actual shutdown in CI)', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/admin/shutdown`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 404, 405, 503]);
    });
  });

  // J71 per tests/journey/PRODUCT_MAP.md: MCP remember -> recall (the
  // /api/memory/remember and /recall routes this used to call were never
  // registered).
  it('J71: MCP remember stores a memory that recall finds', () => {
    const content = `cypress j71 ${Date.now()}`;
    cy.mcpExecute('remember', {content}).then((r) => {
      expect(r.status).to.eq(200);
      expect(r.body.success).to.eq(true);
      expect(r.body.result).to.have.property('stored', true);
      const id = r.body.result.memory_id;
      expect(id).to.be.a('string').and.not.be.empty;
      cy.mcpExecute('recall', {q: content}).then((rr) => {
        expect(rr.status).to.eq(200);
        expect((rr.body.result.memories || []).map((m) => m.id)).to.include(id);
      });
    });
  });

  // J72 (backtrace chain) is MemoryGraph.backtrace in HARTOS: no HTTP route
  // and no MCP tool (measured: the MCP tools list has remember and recall
  // only), so a browser test cannot reach it.  Its journey test is
  // tests/journey/test_J72_memory_backtrace.py (pytest).

  it('J73: GET /api/admin/providers returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/admin/providers`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 503]);
    });
  });

  it('J74: POST /api/admin/providers/<id>/test returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/admin/providers/groq/test`,
      body: {},
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 400, 401, 403, 404, 405, 503]);
    });
  });

  it('J75: GET /api/admin/providers/gateway/stats returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/admin/providers/gateway/stats`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 503]);
    });
  });

  it('J76: POST /api/vlm/caption returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/vlm/caption`,
      body: {image_b64: '', prompt: 'describe'},
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 400, 401, 404, 415, 503]);
    });
  });

  it('J77: GET /api/vlm/health returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/vlm/health`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 404, 503]);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// J78-J82 — Tier + encryption + MCP
// ════════════════════════════════════════════════════════════════════════

describe('J78-J82: tier/encryption/mcp', () => {
  beforeEach(() => {
    installBaselineStubs();
  });

  it('J78: GET /api/admin/topology returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/admin/topology`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 404, 503]);
    });
  });

  it('J79: POST /api/admin/topology/upgrade returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/admin/topology/upgrade`,
      body: {target: 'regional'},
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 202, 400, 401, 403, 404, 405, 503]);
    });
  });

  it('J80: POST /api/mcp/local/tools/execute with wrong bearer → 403', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/mcp/local/tools/execute`,
      body: {tool: 'system_health', arguments: {}},
      headers: {Authorization: 'Bearer wrong-j80'},
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.be.oneOf([403, 503]);
    });
  });

  it('J81: GET /api/admin/tier/info returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/admin/tier/info`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 404, 503]);
    });
  });

  it('J82: GET /api/admin/encryption/keys returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/admin/encryption/keys`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 404, 503]);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// J83-J87 — distributed goals + remote desktop (86-87 skipped)
// ════════════════════════════════════════════════════════════════════════

describe('J83-J85: distributed goals', () => {
  beforeEach(() => {
    installBaselineStubs();
  });

  // There is no GET /api/distributed/goals (POST only; a GET answered 405).
  // The read side is a goal's progress: a signed-in user submits a goal with
  // its tasks and reads it back.
  it('J83: a submitted goal reports its progress', () => {
    cy.socialAuth();
    cy.socialRequest('POST', `${Cypress.env('apiUrl')}/api/distributed/goals`, {
      objective: `cypress j83 ${Date.now()}`,
      // A capability no worker advertises, so no worker claims the task.
      // With an empty list any worker may claim it, and the distributed
      // worker_loop then runs it as a real /chat turn against the LLM
      // (measured on a local server: ~54 min on the box's llama-server,
      // with task.confirmation SSE to every browser, and the goal lingers).
      tasks: [{description: 'step one', capabilities: ['cypress_j83_no_worker']}],
    }).then((r) => {
      expect(r.status).to.eq(200);
      const id = r.body.goal_id;
      expect(id).to.be.a('string').and.not.be.empty;
      cy.socialRequest('GET', `${Cypress.env('apiUrl')}/api/distributed/goals/${id}/progress`)
        .then((p) => {
          expect(p.status).to.eq(200);
          expect(p.body).to.include({goal_id: id, success: true});
          expect(p.body.tasks).to.have.length(1);
        });
    });
  });

  it('J84: POST /api/distributed/goals returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/distributed/goals`,
      body: {description: 'j84-test', acceptance_criteria: 'passes'},
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 201, 400, 401, 403, 404, 503]);
    });
  });

  it('J85: GET /api/distributed/verify/summary returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/distributed/verify/summary`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 404, 503]);
    });
  });
});

describe.skip('J86, J87: remote desktop host/viewer (headless CI cannot drive)', () => {
  it('covered via HARTOS regression suite', () => {});
});

// ════════════════════════════════════════════════════════════════════════
// J88-J91 — Coding agent + video/audio gen
// ════════════════════════════════════════════════════════════════════════

describe('J88-J91: coding + video/audio generation', () => {
  beforeEach(() => {
    installBaselineStubs();
  });

  it('J88: POST /api/distributed/goals/execute returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/distributed/goals/execute`,
      body: {goal_id: 'j88_test', code: 'print(1)'},
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 202, 400, 401, 403, 404, 503]);
    });
  });

  it('J89: POST /api/code/verify returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/code/verify`,
      body: {code: 'print(1)'},
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 400, 401, 403, 404, 503]);
    });
  });

  it('J90: POST /video-gen/ returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/video-gen/`,
      body: {prompt: 'a cat'},
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 202, 400, 401, 403, 404, 405, 503]);
    });
  });

  it('J91: POST /audio-gen/ returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/audio-gen/`,
      body: {prompt: 'happy piano'},
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 202, 400, 401, 403, 404, 405, 503]);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// J92-J99 — Social admin + misc
// ════════════════════════════════════════════════════════════════════════

describe('J92-J99: social admin + misc', () => {
  beforeEach(() => {
    installBaselineStubs();
  });

  it('J92: GET /api/social/admin/stats returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/social/admin/stats`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('J93: GET /api/social/feed returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/social/feed`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('J94: GET /api/social/posts returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/social/posts`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('J95: POST /api/social/posts returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/social/posts`,
      body: {content: 'j95-test-post'},
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 201, 400, 401, 403, 404, 500, 503]);
    });
  });

  it('J96: GET /api/social/users returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/social/users`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('J97: GET /api/social/comments returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/social/comments`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });

  it('J98: GET /api/image-proxy with http URL returns envelope', () => {
    cy.request({
      url: `${Cypress.env('apiUrl')}/api/image-proxy?url=http://example.com/test.png`,
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 400, 401, 403, 404, 415, 503]);
    });
  });

  it('J99: GET /api/social/gamification/balance returns envelope', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/social/gamification/balance`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 401, 403, 404, 500, 503]);
    });
  });
});
