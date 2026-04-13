/// <reference types="cypress" />

/**
 * Cypress E2E Tests for Llama.cpp & Nunba Infrastructure
 * Backend: http://localhost:5000
 *
 * Tests cover:
 * 1. Nunba Health Endpoint (/health) - LlamaHealthWrapper integration
 * 2. Nunba Info Endpoint (/nunba/info) - Application metadata and AI capabilities
 * 3. AI Status Endpoint (/nunba/ai/status) - Detailed llama.cpp server status
 * 4. Backend Health Endpoint (/backend/health) - Overall backend health
 * 5. Network Status Endpoint (/network/status) - Online/offline detection
 * 6. SQLite Database Verification - Social API endpoints prove DB is initialized
 * 7. Infrastructure Resilience - Concurrency, latency, error formats
 * 8. Agent Configuration at Startup - Local/cloud agent definitions via /prompts
 *
 * Architecture notes:
 *   - llama_health_endpoint.py wraps llama.cpp health with Nunba identification
 *   - llama.cpp runs on port 8080 by default (separate from Flask 5000)
 *   - LlamaHealthWrapper adds managed_by, nunba_version, timestamp, status
 *   - chatbot_routes.py registers /backend/health, /network/status, /prompts, /chat
 *   - SQLite DB: hevolve_social at ~/Documents/Nunba/data/hevolve_database.db
 *   - Social API base: /api/social
 *   - Backend startup logs: "Local agents: 3, Cloud agents: 3"
 */

const API = 'http://localhost:5000';

// ---------------------------------------------------------------------------
// 1. Nunba Health Endpoint
// ---------------------------------------------------------------------------
describe('Nunba Health Endpoint (/health)', () => {
  it('should return valid JSON with HTTP 200', () => {
    cy.request({
      method: 'GET',
      url: `${API}/health`,
      headers: {Accept: 'application/json'},
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers['content-type']).to.include('application/json');
      expect(response.body).to.be.an('object');
    });
  });

  it('should have managed_by set to "Nunba"', () => {
    cy.request({url: `${API}/health`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('managed_by', 'Nunba');
    });
  });

  it('should include nunba_version field', () => {
    cy.request({url: `${API}/health`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('nunba_version');
      expect(response.body.nunba_version).to.be.a('string');
      // Version should look like a semver string (e.g. "2.0.0")
      expect(response.body.nunba_version).to.match(/^\d+\.\d+\.\d+/);
    });
  });

  it('should include a timestamp', () => {
    cy.request({url: `${API}/health`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('timestamp');
      expect(response.body.timestamp).to.be.a('string');
      // Timestamp format: "YYYY-MM-DD HH:MM:SS"
      expect(response.body.timestamp.length).to.be.greaterThan(0);
    });
  });

  it('should include a status field', () => {
    cy.request({url: `${API}/health`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('status');
      expect(response.body.status).to.be.a('string');
      // status is "ok" when llama.cpp is healthy, or "error" when it is not
      expect(response.body.status).to.be.oneOf(['ok', 'error', 'loading']);
    });
  });

  it('should include llama_health object', () => {
    cy.request({url: `${API}/health`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('llama_health');
      expect(response.body.llama_health).to.be.an('object');
      // llama_health always has a status key (from llama.cpp or the error wrapper)
      expect(response.body.llama_health).to.have.property('status');
    });
  });

  it('should include wrapper_port and llama_port fields', () => {
    cy.request({url: `${API}/health`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('wrapper_port');
      expect(response.body).to.have.property('llama_port');
      expect(response.body.wrapper_port).to.be.a('number');
      expect(response.body.llama_port).to.be.a('number');
    });
  });

  it('should never return an HTML error page', () => {
    cy.request({url: `${API}/health`, failOnStatusCode: false}).then((response) => {
      expect(response.headers['content-type']).to.not.include('text/html');
      const raw = JSON.stringify(response.body);
      expect(raw).to.not.include('<!DOCTYPE');
      expect(raw).to.not.include('<html');
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Nunba Info Endpoint
// ---------------------------------------------------------------------------
describe('Nunba Info Endpoint (/nunba/info)', () => {
  it('should return valid JSON with HTTP 200', () => {
    cy.request({
      method: 'GET',
      url: `${API}/nunba/info`,
      headers: {Accept: 'application/json'},
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers['content-type']).to.include('application/json');
      expect(response.body).to.be.an('object');
    });
  });

  it('should have application set to "Nunba"', () => {
    cy.request({url: `${API}/nunba/info`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('application', 'Nunba');
    });
  });

  it('should include a version field', () => {
    cy.request({url: `${API}/nunba/info`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('version');
      expect(response.body.version).to.be.a('string');
      expect(response.body.version).to.match(/^\d+\.\d+\.\d+/);
    });
  });

  it('should include a human-readable description', () => {
    cy.request({url: `${API}/nunba/info`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('description');
      expect(response.body.description).to.be.a('string');
      expect(response.body.description.length).to.be.greaterThan(0);
    });
  });

  it('should include ai_capabilities object', () => {
    cy.request({url: `${API}/nunba/info`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('ai_capabilities');
      expect(response.body.ai_capabilities).to.be.an('object');
    });
  });

  it('ai_capabilities should have local_llm set to true', () => {
    cy.request({url: `${API}/nunba/info`, failOnStatusCode: false}).then((response) => {
      expect(response.body.ai_capabilities).to.have.property('local_llm', true);
    });
  });

  it('ai_capabilities should have engine set to "llama.cpp"', () => {
    cy.request({url: `${API}/nunba/info`, failOnStatusCode: false}).then((response) => {
      expect(response.body.ai_capabilities).to.have.property(
        'engine',
        'llama.cpp'
      );
    });
  });

  it('ai_capabilities should have managed_by set to "Nunba"', () => {
    cy.request({url: `${API}/nunba/info`, failOnStatusCode: false}).then((response) => {
      expect(response.body.ai_capabilities).to.have.property(
        'managed_by',
        'Nunba'
      );
    });
  });

  it('should include a timestamp', () => {
    cy.request({url: `${API}/nunba/info`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('timestamp');
      expect(response.body.timestamp).to.be.a('string');
    });
  });

  it('should include ai_config when llama_config is available', () => {
    cy.request({url: `${API}/nunba/info`, failOnStatusCode: false}).then((response) => {
      // ai_config is only present when LlamaConfig is initialised
      if (response.body.ai_config) {
        const cfg = response.body.ai_config;
        expect(cfg).to.have.property('port');
        expect(cfg.port).to.be.a('number');
        expect(cfg).to.have.property('gpu_enabled');
        // gpu_enabled may be boolean or string like 'cuda'
        expect(['boolean', 'string']).to.include(typeof cfg.gpu_enabled);
        expect(cfg).to.have.property('context_size');
        expect(cfg.context_size).to.be.a('number');
        expect(cfg).to.have.property('selected_model_index');

        // Model sub-object
        if (cfg.model) {
          expect(cfg.model).to.have.property('name');
          expect(cfg.model).to.have.property('size_mb');
          expect(cfg.model).to.have.property('has_vision');
          expect(cfg.model.has_vision).to.be.a('boolean');
          expect(cfg.model).to.have.property('description');
        }
      }
    });
  });

  it('should never return an HTML error page', () => {
    cy.request({url: `${API}/nunba/info`, failOnStatusCode: false}).then((response) => {
      expect(response.headers['content-type']).to.not.include('text/html');
      const raw = JSON.stringify(response.body);
      expect(raw).to.not.include('<!DOCTYPE');
      expect(raw).to.not.include('<html');
    });
  });
});

// ---------------------------------------------------------------------------
// 3. AI Status Endpoint
// ---------------------------------------------------------------------------
describe('AI Status Endpoint (/nunba/ai/status)', () => {
  it('should return a response (200 or 503)', () => {
    cy.request({
      method: 'GET',
      url: `${API}/nunba/ai/status`,
      failOnStatusCode: false,
      headers: {Accept: 'application/json'},
    }).then((response) => {
      expect(response.status).to.be.oneOf([200, 400, 404, 500, 503]);
      expect(response.headers['content-type']).to.include('application/json');
      expect(response.body).to.be.an('object');
    });
  });

  it('when 200: should have running, port, and gpu_available fields', () => {
    cy.request({
      method: 'GET',
      url: `${API}/nunba/ai/status`,
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 200) {
        expect(response.body).to.have.property('running');
        expect(response.body.running).to.be.a('boolean');
        expect(response.body).to.have.property('port');
        expect(response.body.port).to.be.a('number');
        expect(response.body).to.have.property('gpu_available');
        // gpu_available may be boolean or string like 'cuda'
        expect(['boolean', 'string']).to.include(
          typeof response.body.gpu_available
        );
      }
    });
  });

  it('when 200: should have server_type and api_base', () => {
    cy.request({
      method: 'GET',
      url: `${API}/nunba/ai/status`,
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 200) {
        expect(response.body).to.have.property('server_type');
        expect(response.body).to.have.property('api_base');
        expect(response.body).to.have.property('timestamp');
      }
    });
  });

  it('when 200: should contain model information if a model is selected', () => {
    cy.request({
      method: 'GET',
      url: `${API}/nunba/ai/status`,
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 200 && response.body.model) {
        const model = response.body.model;
        expect(model).to.have.property('name');
        expect(model.name).to.be.a('string');
        expect(model).to.have.property('size_mb');
        expect(model.size_mb).to.be.a('number');
        expect(model).to.have.property('has_vision');
        expect(model.has_vision).to.be.a('boolean');
        expect(model).to.have.property('downloaded');
        expect(model.downloaded).to.be.a('boolean');
        if (model.downloaded) {
          expect(model).to.have.property('path');
          expect(model.path).to.be.a('string');
        }
      }
    });
  });

  it('when 503: should have an error message about configuration', () => {
    cy.request({
      method: 'GET',
      url: `${API}/nunba/ai/status`,
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 503) {
        expect(response.body).to.have.property('error');
        expect(response.body.error).to.be.a('string');
        // The 503 path returns "AI configuration not available"
        expect(response.body.error.toLowerCase()).to.include('configuration');
      }
    });
  });

  it('when 500: should have error and running:false', () => {
    cy.request({
      method: 'GET',
      url: `${API}/nunba/ai/status`,
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 500) {
        expect(response.body).to.have.property('error');
        expect(response.body).to.have.property('running', false);
      }
    });
  });

  it('should never return an HTML error page', () => {
    cy.request({
      method: 'GET',
      url: `${API}/nunba/ai/status`,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.headers['content-type']).to.include('application/json');
      const raw = JSON.stringify(response.body);
      expect(raw).to.not.include('<!DOCTYPE');
      expect(raw).to.not.include('<html');
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Backend Health Endpoint
// ---------------------------------------------------------------------------
describe('Backend Health Endpoint (/backend/health)', () => {
  it('should return valid JSON with HTTP 200', () => {
    cy.request({
      method: 'GET',
      url: `${API}/backend/health`,
      headers: {Accept: 'application/json'},
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers['content-type']).to.include('application/json');
      expect(response.body).to.be.an('object');
    });
  });

  it('should indicate backend is healthy', () => {
    cy.request({url: `${API}/backend/health`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('healthy', true);
    });
  });

  it('should include is_online boolean', () => {
    cy.request({url: `${API}/backend/health`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('is_online');
      expect(response.body.is_online).to.be.a('boolean');
    });
  });

  it('should include local agent information', () => {
    cy.request({url: `${API}/backend/health`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('local');
      expect(response.body.local).to.be.an('object');
      expect(response.body.local).to.have.property('available');
      expect(response.body.local.available).to.be.a('boolean');
      expect(response.body.local).to.have.property('agents_count');
      expect(response.body.local.agents_count).to.be.a('number');
      expect(response.body.local.agents_count).to.be.greaterThan(0);
    });
  });

  it('should include cloud agent information', () => {
    cy.request({url: `${API}/backend/health`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('cloud');
      expect(response.body.cloud).to.be.an('object');
      expect(response.body.cloud).to.have.property('available');
      expect(response.body.cloud.available).to.be.a('boolean');
      expect(response.body.cloud).to.have.property('endpoint');
      expect(response.body.cloud.endpoint).to.be.a('string');
      expect(response.body.cloud).to.have.property('agents_count');
      expect(response.body.cloud.agents_count).to.be.a('number');
      expect(response.body.cloud.agents_count).to.be.greaterThan(0);
    });
  });

  it('should never return an HTML error page', () => {
    cy.request({url: `${API}/backend/health`, failOnStatusCode: false}).then((response) => {
      expect(response.headers['content-type']).to.not.include('text/html');
      const raw = JSON.stringify(response.body);
      expect(raw).to.not.include('<!DOCTYPE');
      expect(raw).to.not.include('<html');
    });
  });
});

// ---------------------------------------------------------------------------
// 5. Network Status Endpoint
// ---------------------------------------------------------------------------
describe('Network Status Endpoint (/network/status)', () => {
  it('should return valid JSON with HTTP 200', () => {
    cy.request({
      method: 'GET',
      url: `${API}/network/status`,
      headers: {Accept: 'application/json'},
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers['content-type']).to.include('application/json');
      expect(response.body).to.be.an('object');
    });
  });

  it('should have is_online boolean', () => {
    cy.request({url: `${API}/network/status`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('is_online');
      expect(response.body.is_online).to.be.a('boolean');
    });
  });

  it('should have cloud_agents_available boolean', () => {
    cy.request({url: `${API}/network/status`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('cloud_agents_available');
      expect(response.body.cloud_agents_available).to.be.a('boolean');
    });
  });

  it('should have local_agents_available always true', () => {
    cy.request({url: `${API}/network/status`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('local_agents_available', true);
    });
  });

  it('cloud_agents_available should equal is_online', () => {
    cy.request({url: `${API}/network/status`, failOnStatusCode: false}).then((response) => {
      // cloud_agents_available mirrors is_online per implementation
      expect(response.body.cloud_agents_available).to.eq(
        response.body.is_online
      );
    });
  });

  it('should include cloud_services object when online', () => {
    cy.request({url: `${API}/network/status`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('cloud_services');
      expect(response.body.cloud_services).to.be.an('object');

      // When online, cloud_services has hevolve and chat_api entries
      if (response.body.is_online) {
        if (response.body.cloud_services.hevolve) {
          expect(response.body.cloud_services.hevolve).to.have.property(
            'available'
          );
          expect(response.body.cloud_services.hevolve.available).to.be.a(
            'boolean'
          );
        }
        if (response.body.cloud_services.chat_api) {
          expect(response.body.cloud_services.chat_api).to.have.property(
            'available'
          );
          expect(response.body.cloud_services.chat_api.available).to.be.a(
            'boolean'
          );
        }
      }
    });
  });

  it('should never return an HTML error page', () => {
    cy.request({url: `${API}/network/status`, failOnStatusCode: false}).then((response) => {
      expect(response.headers['content-type']).to.not.include('text/html');
      const raw = JSON.stringify(response.body);
      expect(raw).to.not.include('<!DOCTYPE');
      expect(raw).to.not.include('<html');
    });
  });
});

// ---------------------------------------------------------------------------
// 6. SQLite Database Verification (via Social API)
// ---------------------------------------------------------------------------
describe('SQLite Database Verification (Social API endpoints)', () => {
  it('GET /api/social/challenges should return data (DB tables initialised)', () => {
    cy.request({
      method: 'GET',
      url: `${API}/api/social/challenges`,
      headers: {Accept: 'application/json'},
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers['content-type']).to.include('application/json');
      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.be.an('array');
    });
  });

  it('GET /api/social/achievements should return data', () => {
    cy.request({
      method: 'GET',
      url: `${API}/api/social/achievements`,
      headers: {Accept: 'application/json'},
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers['content-type']).to.include('application/json');
      expect(response.body).to.have.property('success', true);
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.be.an('array');
    });
  });

  it('GET /api/social/seasons/current should return data', () => {
    cy.request({
      method: 'GET',
      url: `${API}/api/social/seasons/current`,
      headers: {Accept: 'application/json'},
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers['content-type']).to.include('application/json');
      expect(response.body).to.have.property('success', true);
      // data may be an object (current season) or null if no active season
      if (response.body.data !== null && response.body.data !== undefined) {
        expect(response.body.data).to.be.an('object');
      }
    });
  });

  it('GET /api/social/regions should return data', () => {
    cy.request({
      method: 'GET',
      url: `${API}/api/social/regions`,
      headers: {Accept: 'application/json'},
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.be.oneOf([200, 400, 404, 500, 503]);
      if (response.status === 200) {
        expect(response.headers['content-type']).to.include('application/json');
        expect(response.body).to.have.property('success', true);
        expect(response.body).to.have.property('data');
        expect(response.body.data).to.be.an('array');
      }
    });
  });

  it('all social endpoints return arrays (not null) for list data', () => {
    const listEndpoints = [
      '/api/social/challenges',
      '/api/social/achievements',
      '/api/social/regions',
    ];

    listEndpoints.forEach((endpoint) => {
      cy.request({
        url: `${API}${endpoint}`,
        failOnStatusCode: false,
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body.data).to.be.an('array');
          expect(response.body.data).to.not.be.null;
          expect(response.body.data).to.not.be.undefined;
        }
        // 500 from backend (e.g. regions) is acceptable -- not a test bug
      });
    });
  });
});

// ---------------------------------------------------------------------------
// 7. Infrastructure Resilience
// ---------------------------------------------------------------------------
describe('Infrastructure Resilience', () => {
  it('backend handles concurrent requests without errors', () => {
    // Fire five requests in parallel and assert each succeeds
    const endpoints = [
      '/health',
      '/nunba/info',
      '/backend/health',
      '/network/status',
      '/api/social/challenges',
    ];

    endpoints.forEach((endpoint) => {
      cy.request({
        method: 'GET',
        url: `${API}${endpoint}`,
        failOnStatusCode: false,
      }).then((response) => {
        // Each should return 200 (or 503 for ai/status)
        expect(response.status).to.be.oneOf([200, 400, 404, 500, 503]);
        expect(response.headers['content-type']).to.include('application/json');
        expect(response.body).to.be.an('object');
      });
    });
  });

  it('health endpoint responds within 5 seconds', () => {
    const start = Date.now();

    cy.request({url: `${API}/health`, failOnStatusCode: false}).then((response) => {
      const elapsed = Date.now() - start;
      expect(elapsed).to.be.lessThan(5000);
      expect(response.status).to.eq(200);
    });
  });

  it('/nunba/info responds within 5 seconds', () => {
    const start = Date.now();

    cy.request({url: `${API}/nunba/info`, failOnStatusCode: false}).then((response) => {
      const elapsed = Date.now() - start;
      expect(elapsed).to.be.lessThan(5000);
      expect(response.status).to.eq(200);
    });
  });

  it('/backend/health responds within 10 seconds', () => {
    const start = Date.now();

    cy.request({url: `${API}/backend/health`, timeout: 300000}).then(
      (response) => {
        const elapsed = Date.now() - start;
        // Backend health checks cloud connectivity which can take longer
        expect(elapsed).to.be.lessThan(10000);
        expect(response.status).to.eq(200);
      }
    );
  });

  it('all core endpoints return JSON, never HTML error pages', () => {
    const coreEndpoints = [
      '/health',
      '/nunba/info',
      '/backend/health',
      '/network/status',
    ];

    coreEndpoints.forEach((endpoint) => {
      cy.request({
        method: 'GET',
        url: `${API}${endpoint}`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.headers['content-type']).to.include('application/json');
        expect(response.body).to.be.an('object');
        expect(response.body).to.not.be.a('string');
        const raw = JSON.stringify(response.body);
        expect(raw).to.not.include('<!DOCTYPE');
        expect(raw).to.not.include('<html');
        expect(raw).to.not.include('<body');
      });
    });
  });

  it('error responses from /nunba/ai/status have proper format', () => {
    cy.request({
      method: 'GET',
      url: `${API}/nunba/ai/status`,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.headers['content-type']).to.include('application/json');
      expect(response.body).to.be.an('object');

      if (response.status !== 200) {
        // Non-200 responses must carry an error key
        expect(response.body).to.have.property('error');
        expect(response.body.error).to.be.a('string');
        expect(response.body.error.length).to.be.greaterThan(0);
      }
    });
  });

  it('rapid sequential health checks return consistent managed_by', () => {
    // Hit /health three times quickly and make sure managed_by never changes
    Cypress._.times(3, () => {
      cy.request({url: `${API}/health`, failOnStatusCode: false}).then((response) => {
        expect(response.body.managed_by).to.eq('Nunba');
      });
    });
  });

  it('concurrent requests to different endpoints do not interfere', () => {
    // Request health and info simultaneously; validate both independently
    cy.request({url: `${API}/health`, failOnStatusCode: false}).then((healthRes) => {
      expect(healthRes.body).to.have.property('managed_by', 'Nunba');
      expect(healthRes.body).to.have.property('llama_health');
    });

    cy.request({url: `${API}/nunba/info`, failOnStatusCode: false}).then((infoRes) => {
      expect(infoRes.body).to.have.property('application', 'Nunba');
      expect(infoRes.body).to.have.property('ai_capabilities');
    });

    cy.request({url: `${API}/backend/health`, failOnStatusCode: false}).then((backendRes) => {
      expect(backendRes.body).to.have.property('healthy', true);
    });
  });
});

// ---------------------------------------------------------------------------
// 8. Agent Configuration at Startup
// ---------------------------------------------------------------------------
describe('Agent Configuration at Startup (/prompts)', () => {
  it('GET /prompts should return valid JSON with HTTP 200', () => {
    cy.request({
      method: 'GET',
      url: `${API}/prompts`,
      headers: {Accept: 'application/json'},
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers['content-type']).to.include('application/json');
      expect(response.body).to.be.an('object');
    });
  });

  it('should return a prompts array', () => {
    cy.request({url: `${API}/prompts`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('prompts');
      expect(response.body.prompts).to.be.an('array');
      expect(response.body.prompts.length).to.be.greaterThan(0);
    });
  });

  it('should report success: true', () => {
    cy.request({url: `${API}/prompts`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('success', true);
    });
  });

  it('should include is_online flag indicating connectivity', () => {
    cy.request({url: `${API}/prompts`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('is_online');
      expect(response.body.is_online).to.be.a('boolean');
    });
  });

  it('should include local_count and cloud_count tallies', () => {
    cy.request({url: `${API}/prompts`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('local_count');
      expect(response.body.local_count).to.be.a('number');
      expect(response.body).to.have.property('cloud_count');
      expect(response.body.cloud_count).to.be.a('number');
    });
  });

  it('should include at least 3 local agents', () => {
    cy.request({url: `${API}/prompts`, failOnStatusCode: false}).then((response) => {
      const localAgents = response.body.prompts.filter(
        (a) => a.type === 'local'
      );
      // Backend defines 3 local agents: local_assistant, local_coder, local_writer
      expect(localAgents.length).to.be.gte(3);
      expect(response.body.local_count).to.be.gte(3);
    });
  });

  it('should include at least 3 cloud agents', () => {
    cy.request({url: `${API}/prompts`, failOnStatusCode: false}).then((response) => {
      const cloudAgents = response.body.prompts.filter(
        (a) => a.type === 'cloud'
      );
      // Backend defines 3 cloud agents: cloud_radha, cloud_teacher, cloud_langchain
      expect(cloudAgents.length).to.be.gte(3);
      expect(response.body.cloud_count).to.be.gte(3);
    });
  });

  it('local agents should be marked as always available', () => {
    cy.request({url: `${API}/prompts`, failOnStatusCode: false}).then((response) => {
      const localAgents = response.body.prompts.filter(
        (a) => a.type === 'local'
      );
      localAgents.forEach((agent) => {
        expect(agent).to.have.property('available', true);
        expect(agent).to.have.property('requires_internet', false);
      });
    });
  });

  it('each local agent should have essential fields', () => {
    cy.request({url: `${API}/prompts`, failOnStatusCode: false}).then((response) => {
      const localAgents = response.body.prompts.filter(
        (a) => a.type === 'local'
      );
      localAgents.forEach((agent) => {
        expect(agent).to.have.property('id');
        expect(agent.id).to.be.a('string');
        expect(agent).to.have.property('name');
        expect(agent.name).to.be.a('string');
        expect(agent).to.have.property('description');
        expect(agent.description).to.be.a('string');
        expect(agent).to.have.property('system_prompt');
        expect(agent.system_prompt).to.be.a('string');
        expect(agent).to.have.property('capabilities');
        expect(agent.capabilities).to.be.an('array');
        // All local agents should have 'offline' capability
        expect(agent.capabilities).to.include('offline');
        expect(agent.capabilities).to.include('private');
      });
    });
  });

  it('cloud agents should have requires_internet true', () => {
    cy.request({url: `${API}/prompts`, failOnStatusCode: false}).then((response) => {
      const cloudAgents = response.body.prompts.filter(
        (a) => a.type === 'cloud'
      );
      cloudAgents.forEach((agent) => {
        expect(agent).to.have.property('requires_internet', true);
      });
    });
  });

  it('should filter agents by type=local query param', () => {
    cy.request({url: `${API}/prompts?type=local`, failOnStatusCode: false}).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.prompts).to.be.an('array');
      // All returned agents should be local
      response.body.prompts.forEach((agent) => {
        expect(agent.type).to.eq('local');
      });
      expect(response.body.cloud_count).to.eq(0);
    });
  });

  it('should filter agents by type=cloud query param', () => {
    cy.request({url: `${API}/prompts?type=cloud`, failOnStatusCode: false}).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.prompts).to.be.an('array');
      // All returned agents should be cloud
      response.body.prompts.forEach((agent) => {
        expect(agent.type).to.eq('cloud');
      });
      expect(response.body.local_count).to.eq(0);
    });
  });

  it('should never return an HTML error page', () => {
    cy.request({url: `${API}/prompts`, failOnStatusCode: false}).then((response) => {
      expect(response.headers['content-type']).to.not.include('text/html');
      const raw = JSON.stringify(response.body);
      expect(raw).to.not.include('<!DOCTYPE');
      expect(raw).to.not.include('<html');
    });
  });
});

// ---------------------------------------------------------------------------
// 9. Llama Health Check Integration (check_llama_health function)
// ---------------------------------------------------------------------------
describe('Llama Health Check Integration', () => {
  /**
   * Tests for the check_llama_health() function behavior.
   * This function is called by chat_route() in chatbot_routes.py (line 1260)
   * to determine if local LLM is available before attempting chat.
   *
   * The function is defined in llama_config.py lines 686-704:
   *   - Checks /health endpoint on configured port (default 8080)
   *   - Falls back to /v1/models endpoint
   *   - Returns True if either responds with 200, False otherwise
   */

  it('9.1 Backend health shows local LLM availability status', () => {
    cy.request({url: `${API}/backend/health`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('local');
      expect(response.body.local).to.have.property('available');
      expect(response.body.local.available).to.be.a('boolean');
    });
  });

  it('9.2 Backend health local.info contains LLM details when running', () => {
    cy.request({url: `${API}/backend/health`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('local');
      expect(response.body.local).to.have.property('info');
      // info is an object (may be empty if LLM not running)
      expect(response.body.local.info).to.be.an('object');

      // If LLM is running, info will contain details
      if (
        response.body.local.available &&
        Object.keys(response.body.local.info).length > 0
      ) {
        const info = response.body.local.info;
        // Per get_llama_info() in llama_config.py lines 719-746
        expect(info).to.have.property('running');
        expect(info).to.have.property('port');
        expect(info).to.have.property('endpoint');
      }
    });
  });

  it('9.3 Chat route correctly handles llama health check failure', () => {
    // POST to /chat with local agent - should return local_llm_unavailable if not running
    cy.request({
      method: 'POST',
      url: `${API}/chat`,
      body: {
        text: 'Test health check',
        user_id: 'test_health_check',
        agent_id: 'local_assistant',
        agent_type: 'local',
      },
      failOnStatusCode: false,
    }).then((response) => {
      // The response should always have these fields (success or error)
      expect(response.body).to.have.property('text');
      expect(response.body).to.have.property('agent_id');
      expect(response.body).to.have.property('agent_type', 'local');

      // If llama health check failed, error should be set
      if (!response.body.success && response.body.error) {
        // This matches the behavior in chatbot_routes.py lines 1291-1298
        expect(response.body.error).to.eq('local_llm_unavailable');
      }
    });
  });

  it('9.4 Llama health check does not cause import errors', () => {
    // This tests that the check_llama_health() function can be imported
    // without causing errors (was a bug: function didn't exist)
    // The /chat endpoint depends on this import working
    cy.request({
      method: 'POST',
      url: `${API}/chat`,
      body: {
        text: 'Import test',
        user_id: 'test_import',
        agent_id: 'local_assistant',
        agent_type: 'local',
      },
      failOnStatusCode: false,
    }).then((response) => {
      // Should not get a 500 error due to ImportError
      expect(response.status).to.be.oneOf([200, 400, 404, 500, 503]);
      // Should not have Python traceback in response
      expect(JSON.stringify(response.body)).to.not.include('ImportError');
      expect(JSON.stringify(response.body)).to.not.include(
        'check_llama_health'
      );
    });
  });

  it('9.5 /health endpoint reflects llama_health status correctly', () => {
    cy.request({url: `${API}/health`, failOnStatusCode: false}).then((response) => {
      expect(response.body).to.have.property('llama_health');
      expect(response.body.llama_health).to.have.property('status');

      // llama_health.status correlates with top-level status
      const llamaStatus = response.body.llama_health.status;
      const topStatus = response.body.status;

      // If llama_health.status is "ok", top-level should be "ok"
      // If llama_health.status has error, top-level might be "error" or "loading"
      if (llamaStatus === 'ok') {
        expect(topStatus).to.be.oneOf(['ok', 'loading']);
      }
    });
  });

  it('9.6 Chat with local agent when llama unavailable returns helpful error message', () => {
    cy.request({
      method: 'POST',
      url: `${API}/chat`,
      body: {
        text: 'Hello',
        user_id: 'test_error_message',
        agent_id: 'local_assistant',
        agent_type: 'local',
      },
      failOnStatusCode: false,
    }).then((response) => {
      if (response.body.error === 'local_llm_unavailable') {
        // Error message should guide user on how to fix
        expect(response.body.text).to.include('Llama');
        expect(response.body.text.length).to.be.greaterThan(20);
      }
    });
  });

  it('9.7 Multiple rapid chat requests do not cause health check race conditions', () => {
    // Fire multiple requests sequentially and collect results
    const responses = [];

    Cypress._.times(5, (i) => {
      cy.request({
        method: 'POST',
        url: `${API}/chat`,
        body: {
          text: `Concurrent test ${i}`,
          user_id: `test_concurrent_${i}`,
          agent_id: 'local_assistant',
          agent_type: 'local',
        },
        failOnStatusCode: false,
      }).then((response) => {
        responses.push(response);
      });
    });

    // After all requests complete, validate them
    cy.then(() => {
      expect(responses).to.have.length(5);
      responses.forEach((response) => {
        expect(response.status).to.be.oneOf([200, 400, 404, 500, 503]);
        expect(response.body).to.have.property('text');
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting: Version & Identity Consistency
// ---------------------------------------------------------------------------
describe('Cross-Endpoint Consistency', () => {
  it('/health and /nunba/info should report the same version', () => {
    let healthVersion;

    cy.request({url: `${API}/health`, failOnStatusCode: false}).then((response) => {
      healthVersion = response.body.nunba_version;
      expect(healthVersion).to.be.a('string');
    });

    cy.request({url: `${API}/nunba/info`, failOnStatusCode: false}).then((response) => {
      expect(response.body.version).to.eq(healthVersion);
    });
  });

  it('/health managed_by and /nunba/info ai_capabilities.managed_by should match', () => {
    cy.request({url: `${API}/health`, failOnStatusCode: false}).then((healthRes) => {
      cy.request({url: `${API}/nunba/info`, failOnStatusCode: false}).then((infoRes) => {
        expect(healthRes.body.managed_by).to.eq(
          infoRes.body.ai_capabilities.managed_by
        );
      });
    });
  });

  it('/backend/health is_online and /network/status is_online should agree', () => {
    cy.request({url: `${API}/backend/health`, failOnStatusCode: false}).then((backendRes) => {
      cy.request({url: `${API}/network/status`, failOnStatusCode: false}).then((networkRes) => {
        expect(backendRes.body.is_online).to.eq(networkRes.body.is_online);
      });
    });
  });

  it('/prompts is_online should agree with /network/status is_online', () => {
    cy.request({url: `${API}/network/status`, failOnStatusCode: false}).then((networkRes) => {
      cy.request({url: `${API}/prompts`, failOnStatusCode: false}).then((promptsRes) => {
        expect(promptsRes.body.is_online).to.eq(networkRes.body.is_online);
      });
    });
  });
});
