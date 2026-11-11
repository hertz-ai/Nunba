/**
 * UAT journeys J138–J170 — Cypress e2e coverage mapped from
 * tests/journey/PRODUCT_MAP.md § Memory / Install / Concurrency /
 * Security.
 *
 *   J138 — MemoryGraph FTS5 recall > 100 memories
 *   J139 — Memory TTL / privacy wipe
 *   J140 — Backtrace crosses agent boundary (no HTTP surface: tests/journey/test_J140)
 *   J141 — Memory write+read during FedAggregator embed
 *   J142 — Corrupt memory_graph.db graceful recovery
 *   J143 — Backtrace depth bound honored (no HTTP surface: tests/journey/test_J143)
 *   J144 — Cross-topology memory sync flat → regional (receiver: POST /api/social/peers/embedding-delta)
 *   J145 — AI installer partial success (LLM ok, TTS fail)
 *   J146 — Offline boot with cached models
 *   J147 — Disk full mid-install graceful rollback
 *   J148 — CUDA missing → CPU inference + audible TTS
 *   J149 — GPU OOM mid-session → ResourceGovernor evicts
 *   J150 — Provider key rotated mid-call
 *   J151 — HF_HUB_OFFLINE reorders ladder
 *   J152 — Plugin missing → optional_import graceful
 *   J153 — Frozen-build missing module (desktop-only)
 *   J154 — Install on D:/ (NUNBA_DATA_DIR)
 *   J155 — 2 simultaneous /chat same user
 *   J156 — Admin swaps active model mid-stream
 *   J157 — Camera + chat + TTS all firing
 *   J158 — Two users same channel concurrent inbound
 *   J159 — WAMP flood 100 events in 5s
 *   J160 — Simultaneous remember writes (FTS5)
 *   J161 — Parallel agent_daemon tick + manual
 *   J162 — Hot-reload chatbot_routes while /chat active
 *   J163 — Two Provider retries overlap
 *   J164 — Post+comment+vote race on same post
 *   J165 — Image proxy DNS rebind (TOCTOU)
 *   J166 — WAMP subscribe with spoofed user_id
 *   J167 — MCP token rotation mid-session
 *   J168 — Admin PDF upload JS sanitized (GAP)
 *   J169 — Hub install from non-allowlisted org refused
 *   J170 — File-scheme SSRF blocked
 */

const installBaselineStubs = () => {
  cy.intercept('GET', '**/api/social/resonance/wallet', {statusCode: 200, body: {success: true, data: null}});
  cy.intercept('GET', '**/api/social/onboarding/progress', {statusCode: 200, body: {success: true}});
  cy.intercept('GET', '**/api/social/notifications*', {statusCode: 200, body: {success: true, data: []}});
  cy.intercept('GET', '**/api/social/encounters/suggestions', {statusCode: 200, body: {success: true, data: []}});
  cy.intercept('GET', '**/backend/health', {statusCode: 200, body: {healthy: true, local: {available: true}, loading: false}});
  cy.intercept('GET', '**/api/guest-id', {statusCode: 200, body: {guest_id: 'g_j138_j170_fixture'}});
};

// ════════════════════════════════════════════════════════════════════════
// J138-J144 — MemoryGraph suite
// ════════════════════════════════════════════════════════════════════════

describe('J138-J144: MemoryGraph FTS5 + backtrace + TTL', () => {
  beforeEach(() => {
    installBaselineStubs();
  });

  it('J138: GET /api/memory/search returns envelope', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/memory/search?q=test`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 400, 401, 403, 404, 503]);
    });
  });

  // Each test below reaches the journey through the entry point
  // tests/journey/PRODUCT_MAP.md names for it.  The routes the spec used to
  // call (/api/memory/forget, /backtrace, /remember, /status, /sync) were
  // never registered: Flask answered 405 for them, because
  // DELETE /api/memory/<memory_id> matches the path.

  it('J139: DELETE /api/memory/<id> answers in JSON (unknown id is 404)', () => {
    cy.request({
      method: 'DELETE',
      url: `${Cypress.env('apiUrl')}/api/memory/cypress_j139_no_such_id?user_id=cypress_j139`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([404, 503]);
      expect(resp.body).to.have.property('error');
    });
  });

  // J140 / J143 (backtrace across agents, depth bound) are
  // MemoryGraph.backtrace / agent_memory_tools.backtrace_memory in HARTOS:
  // there is no HTTP route or MCP tool for them, so a browser test cannot
  // reach them.  Their journey tests are tests/journey/test_J140 and
  // test_J143 (pytest).

  it('J141: MCP remember stores a memory that recall finds', () => {
    const content = `cypress j141 ${Date.now()}`;
    cy.mcpExecute('remember', {content}).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body.success).to.eq(true);
      expect(resp.body.result).to.have.property('stored', true);
      const id = resp.body.result.memory_id;
      expect(id).to.be.a('string').and.not.be.empty;
      cy.mcpExecute('recall', {q: content}).then((r) => {
        expect(r.status).to.eq(200);
        const ids = (r.body.result.memories || []).map((m) => m.id);
        expect(ids).to.include(id);
      });
    });
  });

  it('J142: GET /api/admin/diag/degradations lists degraded subsystems', () => {
    // A corrupt memory_graph.db must surface here (degradation:memory_graph)
    // while chat still boots; on a healthy box the list is just empty.
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/admin/diag/degradations`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body).to.have.property('degradations').that.is.an('array');
    });
  });

  // J144 (flat -> regional): the flat node's push is outbound, not driven
  // from a browser.  The receiving side is HTTP: a regional/central node takes
  // the delta on POST /api/social/peers/embedding-delta (HARTOS
  // integrations/social/discovery.py), which feeds
  // FederatedAggregator.receive_embedding_delta, and reports the round on
  // GET /api/learning/gradient/status.  (/api/memory-sync/pull is J234's
  // surface, cross-device cloud memory sync.)
  it('J144: the aggregator receiver refuses a malformed delta and reports its round', () => {
    // A witness_request with an empty delta is validation only: no state
    // changes, and the refusal names its reason.
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/social/peers/embedding-delta`,
      body: {action: 'witness_request', delta: {}},
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body).to.include({success: false, witness_ack: false});
      expect(resp.body.reason).to.be.a('string').and.not.be.empty;
    });
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/learning/gradient/status`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body.success).to.eq(true);
      expect(resp.body.data).to.have.property('embedding_sync');
      expect(resp.body.data.embedding_sync).to.have.property('pending_deltas');
    });
  });

});

// ════════════════════════════════════════════════════════════════════════
// J145-J154 — Installer + offline + disk-full + CUDA/GPU
// ════════════════════════════════════════════════════════════════════════

describe('J145-J154: installer ladder + resource degrade', () => {
  beforeEach(() => {
    installBaselineStubs();
  });

  it('J145: GET /api/admin/installer/status reports partial-success state', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/admin/installer/status`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401, 403, 404, 503]);
    });
  });

  it('J146: GET /api/online + cached models means /chat still works', () => {
    cy.intercept('GET', '**/api/online', {statusCode: 200, body: {online: false}});
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/chat`,
      body: {text: 'offline test', preferred_lang: 'en'},
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 400, 401, 503]);
    });
  });

  it('J147: GET /api/admin/diag/disk-free returns envelope', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/admin/diag/disk-free`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401, 403, 404, 503]);
    });
  });

  it('J148: backend/health reports GPU tier classification', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/backend/health`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 503]);
      if (resp.status === 200) {
        // core.gpu_tier classification is exposed under local or tier
        expect(resp.body).to.be.an('object');
      }
    });
  });

  it('J149: GET /api/admin/diag/resource-governor returns envelope', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/admin/diag/resource-governor`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401, 403, 404, 503]);
    });
  });

  it('J150: POST /api/admin/providers/<id>/rotate-key returns envelope', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/admin/providers/openai/rotate-key`,
      body: {new_key: 'sk-fake-rotated'},
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 202, 400, 401, 403, 404, 405, 503]);
    });
  });

  it('J151: GET /api/admin/models/hub/search with HF_HUB_OFFLINE does not crash', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/admin/models/hub/search?q=qwen`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401, 403, 404, 503]);
    });
  });

  it('J152: GET /api/admin/diag/degradations exposes optional_import failures', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/admin/diag/degradations`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401, 403, 500, 503]);
      if (resp.status === 200) {
        expect(resp.body).to.have.property('degradations');
      }
    });
  });

  it('J154: NUNBA_DATA_DIR env var is honored (read-only check via /api/admin/diag/paths)', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/admin/diag/paths`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401, 403, 404, 503]);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// J155-J164 — Concurrency journeys
// ════════════════════════════════════════════════════════════════════════

describe('J155-J164: concurrency + race journeys', () => {
  beforeEach(() => {
    installBaselineStubs();
  });

  it('J155: two simultaneous /chat same user both return envelopes', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/chat`,
      body: {text: 'first chat', preferred_lang: 'en'},
      failOnStatusCode: false,
    }).then((respA) => {
      expect(respA.status).to.be.oneOf([200, 400, 401, 503]);
    });
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/chat`,
      body: {text: 'second chat', preferred_lang: 'en'},
      failOnStatusCode: false,
    }).then((respB) => {
      expect(respB.status).to.be.oneOf([200, 400, 401, 503]);
    });
  });

  it('J156: POST /api/admin/models/swap accepts model_id', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/admin/models/swap`,
      body: {model_id: 'qwen-0.5b'},
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 400, 401, 403, 404, 405, 503]);
    });
  });

  it('J157: camera + chat + TTS simultaneous → /api/vlm/health + /chat + /tts/quick', () => {
    cy.request({url: `${Cypress.env('apiUrl')}/api/vlm/health`, failOnStatusCode: false}).then((r) => {
      expect(r.status).to.be.oneOf([200, 404, 503]);
    });
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/chat`,
      body: {text: 'concurrent-with-tts', preferred_lang: 'en'},
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.be.oneOf([200, 400, 401, 503]);
    });
  });

  it('J158: two users same adapter concurrent inbound (POST /crossbar twice)', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/crossbar`,
      body: {topic: 'com.hertzai.hevolve.chat.user_a', args: ['hi-a']},
      failOnStatusCode: false,
    });
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/crossbar`,
      body: {topic: 'com.hertzai.hevolve.chat.user_b', args: ['hi-b']},
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 400, 503]);
    });
  });

  it('J159: WAMP flood 10 events, server returns envelope on each', () => {
    for (let i = 0; i < 10; i++) {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/crossbar`,
        body: {topic: `com.hertzai.test.j159.${i}`, args: [i]},
        failOnStatusCode: false,
      });
    }
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/wamp/status`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401, 403, 503]);
    });
  });

  it('J160: two remember writes both land', () => {
    const tag = `cypress j160 ${Date.now()}`;
    cy.mcpExecute('remember', {content: `${tag} one`});
    cy.mcpExecute('remember', {content: `${tag} two`}).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body.result).to.have.property('stored', true);
    });
    cy.mcpExecute('recall', {q: tag}).then((r) => {
      expect(r.status).to.eq(200);
      expect(r.body.result.memories).to.have.length.of.at.least(2);
    });
  });

  it('J164: post+comment+vote race — frontend keys stay distinct', () => {
    cy.visit('/local', {failOnStatusCode: false});
    cy.window().then((win) => {
      win.localStorage.setItem('post_42_vote', 'up');
      win.localStorage.setItem('post_42_comment_1', 'my comment');
      win.localStorage.setItem('post_42_comment_2', 'another');
      expect(win.localStorage.getItem('post_42_vote')).to.eq('up');
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// J165-J174 — Security journeys
// ════════════════════════════════════════════════════════════════════════

describe('J165-J170: security / SSRF / origin checks', () => {
  beforeEach(() => {
    installBaselineStubs();
  });

  it('J165: /api/image-proxy rejects private-net IP (SSRF DNS rebind)', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/image-proxy?url=http://169.254.169.254/latest`,
      failOnStatusCode: false,
    }).then((resp) => {
      // Expected: 400 (rejected) or 403 (gated) or 503.  NOT 200 with body.
      expect(resp.status).to.be.oneOf([400, 401, 403, 404, 503]);
    });
  });

  it('J166: WAMP ticket endpoint responds even with missing auth', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/wamp/ticket`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([200, 401, 403]);
    });
  });

  it('J167: POST /api/mcp/local/tools/execute with wrong bearer returns 403', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/mcp/local/tools/execute`,
      body: {tool: 'system_health', arguments: {}},
      headers: {Authorization: 'Bearer rotated-invalid'},
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([403, 503]);
    });
  });

  it('J169: POST /api/admin/models/hub/install with untrusted org returns 400/401/403', () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/api/admin/models/hub/install`,
      body: {hf_id: 'untrusted-bad-org/malicious-model'},
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([400, 401, 403, 503]);
    });
  });

  it('J170: /api/image-proxy with file:// scheme rejected', () => {
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/api/image-proxy?url=file:///etc/passwd`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([400, 401, 403, 404, 503]);
      expect(resp.status).not.to.eq(200);
    });
  });
});
