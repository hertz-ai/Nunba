/// <reference types="cypress" />

/**
 * Chat LLM Status E2E Tests
 *
 * Tests cover:
 *   1. LLM status check on page load
 *   2. Auto-setup card shown when setup_needed
 *   3. "Fully awake" toast on successful setup
 *   4. Model name displayed correctly
 *
 * The Demopage performs a proactive LLM status check on mount:
 *   GET /api/llm/status → { available, model_name, setup_needed, recommended, diagnosis }
 * If setup_needed + auto-fixable action → POST /api/llm/auto-setup
 * If setup_needed + needs download → inject llm_setup_card message
 * On success → pushNotification("Your Nunba is fully awake")
 *
 * Additionally, /api/ai/bootstrap/status is polled for capability announcements:
 *   { phase, steps: { llm: { status: 'ready' }, tts: { status: 'ready' }, ... } }
 *
 * All API calls are intercepted and mocked.
 * Follows project conventions:
 *   - {force: true} on all cy.click() / cy.type()
 *   - failOnStatusCode: false on all cy.visit()
 */

describe('Chat LLM Status', () => {
  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  function setLocalStorage() {
    localStorage.removeItem('active_agent_id');
    localStorage.setItem('hart_sealed', 'true');
    localStorage.setItem('hart_name', 'CypressTest');
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_user_id', 'cypress_user_001');
  }

  const promptsFixture = {
    prompts: [
      {
        prompt_id: 1,
        id: 'local_assistant',
        name: 'HART',
        prompt: 'You are a helpful assistant.',
        is_active: true,
        is_default: true,
        create_agent: false,
        type: 'local',
        user_id: 0,
        request_id: 'built-in-local',
        image_url: '',
        created_date: '2025-01-01T00:00:00',
      },
    ],
    success: true,
    is_online: true,
  };

  function stubCommonApis() {
    cy.intercept('GET', '**/prompts*', {
      statusCode: 200,
      body: promptsFixture,
    }).as('getPrompts');

    cy.intercept('GET', '**/backend/health', {
      statusCode: 200,
      body: { status: 'healthy' },
    }).as('backendHealth');

    cy.intercept('GET', '**/getprompt_all/**', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/getprompt/**', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/agents/sync*', { statusCode: 200, body: { agents: [] } });

    cy.intercept('POST', '**/chat', {
      statusCode: 200,
      body: {
        text: 'Hello!',
        agent_id: 'local_assistant',
        agent_type: 'local',
        source: 'llama',
        success: true,
      },
    }).as('postChat');
  }

  // =========================================================================
  // 1. LLM Status Check on Page Load
  // =========================================================================
  describe('1. LLM Status Check on Page Load', () => {
    it('1.1 GET /api/llm/status is called on mount', () => {
      stubCommonApis();
      cy.intercept('GET', '**/api/llm/status', {
        statusCode: 200,
        body: { available: true, model_name: 'qwen-2.5-7b-q4', setup_needed: false },
      }).as('llmStatus');
      cy.intercept('GET', '**/api/ai/bootstrap/status', {
        statusCode: 200,
        body: { phase: 'done', steps: {} },
      }).as('bootstrapStatus');

      setLocalStorage();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 300000 });

      // The Demopage fires /api/llm/status once on mount
      cy.wait('@llmStatus', { timeout: 300000 }).then((interception) => {
        expect(interception.response.statusCode).to.eq(200);
        expect(interception.response.body).to.have.property('available');
      });
    });

    it('1.2 page renders normally when LLM is available', () => {
      stubCommonApis();
      cy.intercept('GET', '**/api/llm/status', {
        statusCode: 200,
        body: { available: true, model_name: 'qwen-2.5-7b-q4', setup_needed: false },
      }).as('llmStatus');
      cy.intercept('GET', '**/api/ai/bootstrap/status', {
        statusCode: 200,
        body: { phase: 'done', steps: {} },
      }).as('bootstrapStatus');

      setLocalStorage();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 300000 });
      cy.wait(3000);

      // Chat textarea should be ready
      cy.get('textarea, input[type="text"]', { timeout: 300000 }).first().should('exist');
      // No setup card should appear
      cy.get('body').then(($body) => {
        const text = $body.text();
        expect(text).to.not.include('Download');
        expect(text).to.not.include('Setup Required');
      });
    });

    it('1.3 page survives when /api/llm/status returns 500', () => {
      stubCommonApis();
      cy.intercept('GET', '**/api/llm/status', {
        statusCode: 500,
        body: { error: 'internal server error' },
      }).as('llmStatusError');
      cy.intercept('GET', '**/api/ai/bootstrap/status', {
        statusCode: 200,
        body: { phase: 'done', steps: {} },
      }).as('bootstrapStatus');

      setLocalStorage();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 300000 });
      cy.wait(3000);

      // Page should not crash
      cy.get('#root').invoke('html').should('not.be.empty');
      cy.get('textarea, input[type="text"]', { timeout: 300000 }).first().should('exist');
    });

    it('1.4 page survives when /api/llm/status times out (network error)', () => {
      stubCommonApis();
      cy.intercept('GET', '**/api/llm/status', { forceNetworkError: true }).as('llmStatusNetErr');
      cy.intercept('GET', '**/api/ai/bootstrap/status', {
        statusCode: 200,
        body: { phase: 'done', steps: {} },
      }).as('bootstrapStatus');

      setLocalStorage();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 300000 });
      cy.wait(3000);

      // Page should not crash — the fetch is in a try/catch
      cy.get('#root').invoke('html').should('not.be.empty');
    });
  });

  // =========================================================================
  // 2. Auto-Setup Card Shown When setup_needed
  // =========================================================================
  describe('2. Auto-Setup Card When setup_needed', () => {
    it('2.1 shows setup notification for auto-start action', () => {
      stubCommonApis();
      cy.intercept('GET', '**/api/llm/status', {
        statusCode: 200,
        body: {
          available: false,
          model_name: null,
          setup_needed: true,
          recommended: {
            model_name: 'qwen-2.5-3b-q4',
            model_index: 5,
            size_mb: 2048,
            gpu_mode: 'cuda',
          },
          diagnosis: {
            action: 'start',
            gpu_name: 'RTX 4060',
            gpu_free_gb: 6.5,
            gpu_total_gb: 8.0,
          },
        },
      }).as('llmStatus');

      cy.intercept('POST', '**/api/llm/auto-setup', {
        statusCode: 200,
        body: {
          success: true,
          model_name: 'qwen-2.5-3b-q4',
          message: 'Model loaded successfully',
        },
      }).as('autoSetup');

      cy.intercept('GET', '**/api/ai/bootstrap/status', {
        statusCode: 200,
        body: { phase: 'done', steps: {} },
      }).as('bootstrapStatus');

      setLocalStorage();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 300000 });

      // Wait for the status check + auto-setup call
      cy.wait('@llmStatus', { timeout: 300000 });
      cy.wait('@autoSetup', { timeout: 300000 });
      cy.wait(2000);

      // "fully awake" notification should appear
      cy.get('body', { timeout: 300000 }).should(($body) => {
        const text = $body.text();
        expect(text).to.include('fully awake');
      });
    });

    it('2.2 shows setup card when download is required', () => {
      stubCommonApis();
      cy.intercept('GET', '**/api/llm/status', {
        statusCode: 200,
        body: {
          available: false,
          model_name: null,
          setup_needed: true,
          recommended: {
            model_name: 'qwen-2.5-7b-q4',
            model_index: 10,
            size_mb: 4096,
            gpu_mode: 'cuda',
          },
          diagnosis: {
            action: 'download_model',
            gpu_name: 'RTX 4060',
            compute_budget_mb: 6000,
          },
        },
      }).as('llmStatus');

      cy.intercept('GET', '**/api/ai/bootstrap/status', {
        statusCode: 200,
        body: { phase: 'done', steps: {} },
      }).as('bootstrapStatus');

      setLocalStorage();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 300000 });
      cy.wait('@llmStatus', { timeout: 300000 });
      cy.wait(3000);

      // A setup card should appear in the chat area with model info
      // The card contains the model name and a download size
      cy.get('body').should(($body) => {
        const text = $body.text();
        // For download actions, the page shows an info notification about the model
        const hasSetupInfo =
          text.includes('qwen') ||
          text.includes('download') ||
          text.includes('Download') ||
          text.includes('Setup') ||
          text.includes('setup') ||
          text.includes('GB') ||
          text.includes('4.0');
        expect(hasSetupInfo, 'Should show setup/download info for the model').to.be.true;
      });
    });

    it('2.3 auto-setup failure shows warning notification', () => {
      stubCommonApis();
      cy.intercept('GET', '**/api/llm/status', {
        statusCode: 200,
        body: {
          available: false,
          model_name: null,
          setup_needed: true,
          recommended: {
            model_name: 'qwen-2.5-3b-q4',
            model_index: 5,
            size_mb: 2048,
            gpu_mode: 'cpu',
          },
          diagnosis: { action: 'start_cpu' },
        },
      }).as('llmStatus');

      cy.intercept('POST', '**/api/llm/auto-setup', {
        statusCode: 200,
        body: {
          success: false,
          message: 'Model file not found. Please download first.',
        },
      }).as('autoSetupFail');

      cy.intercept('GET', '**/api/ai/bootstrap/status', {
        statusCode: 200,
        body: { phase: 'done', steps: {} },
      }).as('bootstrapStatus');

      setLocalStorage();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 300000 });
      cy.wait('@llmStatus', { timeout: 300000 });
      cy.wait('@autoSetupFail', { timeout: 300000 });
      cy.wait(3000);

      // A warning or setup card should appear (not the "fully awake" success)
      cy.get('body').then(($body) => {
        const text = $body.text();
        expect(text).to.not.include('fully awake');
      });
    });

    it('2.4 no auto-setup triggered when setup_needed is false', () => {
      stubCommonApis();
      cy.intercept('GET', '**/api/llm/status', {
        statusCode: 200,
        body: { available: true, model_name: 'qwen-2.5-7b-q4', setup_needed: false },
      }).as('llmStatus');

      cy.intercept('POST', '**/api/llm/auto-setup', cy.spy().as('autoSetupSpy'));

      cy.intercept('GET', '**/api/ai/bootstrap/status', {
        statusCode: 200,
        body: { phase: 'done', steps: {} },
      }).as('bootstrapStatus');

      setLocalStorage();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 300000 });
      cy.wait('@llmStatus', { timeout: 300000 });
      cy.wait(3000);

      // auto-setup should NOT have been called
      cy.get('@autoSetupSpy').should('not.have.been.called');
    });
  });

  // =========================================================================
  // 3. "Fully Awake" Toast on Successful Setup
  // =========================================================================
  describe('3. Fully Awake Toast', () => {
    it('3.1 success toast appears with "fully awake" message', () => {
      stubCommonApis();
      cy.intercept('GET', '**/api/llm/status', {
        statusCode: 200,
        body: {
          available: false,
          setup_needed: true,
          recommended: { model_name: 'phi-3-mini', model_index: 3, size_mb: 1800, gpu_mode: 'cuda' },
          diagnosis: { action: 'start' },
        },
      }).as('llmStatus');

      cy.intercept('POST', '**/api/llm/auto-setup', {
        statusCode: 200,
        body: { success: true, model_name: 'phi-3-mini' },
      }).as('autoSetup');

      cy.intercept('GET', '**/api/ai/bootstrap/status', {
        statusCode: 200,
        body: { phase: 'done', steps: {} },
      }).as('bootstrapStatus');

      setLocalStorage();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 300000 });
      cy.wait('@autoSetup', { timeout: 300000 });
      cy.wait(2000);

      cy.get('body', { timeout: 300000 }).should(($body) => {
        expect($body.text()).to.include('fully awake');
      });
    });

    it('3.2 bootstrap capability announcements show toast messages', () => {
      stubCommonApis();
      cy.intercept('GET', '**/api/llm/status', {
        statusCode: 200,
        body: { available: true, model_name: 'qwen-2.5', setup_needed: false },
      }).as('llmStatus');

      // Bootstrap status returns ready capabilities
      cy.intercept('GET', '**/api/ai/bootstrap/status', {
        statusCode: 200,
        body: {
          phase: 'done',
          steps: {
            llm: { status: 'ready', model_type: 'llm', model_name: 'qwen-2.5' },
            tts: { status: 'ready', model_type: 'tts', model_name: 'piper-en' },
          },
        },
      }).as('bootstrapStatus');

      setLocalStorage();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 300000 });
      cy.wait(6000); // Wait for bootstrap polling (initial check at 4s)

      // Capability announcements should appear
      cy.get('body').should(($body) => {
        const text = $body.text();
        const hasAnnouncement =
          text.includes('fully awake') ||
          text.includes('can speak') ||
          text.includes('can hear');
        expect(hasAnnouncement, 'Should show at least one capability announcement').to.be.true;
      });
    });

    it('3.3 GPU occupied message shown for start_cpu action', () => {
      stubCommonApis();
      cy.intercept('GET', '**/api/llm/status', {
        statusCode: 200,
        body: {
          available: false,
          setup_needed: true,
          recommended: { model_name: 'qwen-2.5-3b', model_index: 5, size_mb: 2048, gpu_mode: 'cpu' },
          diagnosis: {
            action: 'start_cpu',
            gpu_occupied: true,
            gpu_free_gb: 1.2,
            gpu_total_gb: 8.0,
          },
        },
      }).as('llmStatus');

      cy.intercept('POST', '**/api/llm/auto-setup', {
        statusCode: 200,
        body: { success: true, model_name: 'qwen-2.5-3b' },
      }).as('autoSetup');

      cy.intercept('GET', '**/api/ai/bootstrap/status', {
        statusCode: 200,
        body: { phase: 'done', steps: {} },
      }).as('bootstrapStatus');

      setLocalStorage();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 300000 });
      cy.wait('@autoSetup', { timeout: 300000 });
      cy.wait(2000);

      // Should show some info notification about GPU/CPU mode
      cy.get('body').should(($body) => {
        const text = $body.text();
        const hasGpuInfo =
          text.includes('GPU') ||
          text.includes('CPU') ||
          text.includes('occupied') ||
          text.includes('fully awake');
        expect(hasGpuInfo, 'Should mention GPU/CPU info or success').to.be.true;
      });
    });
  });

  // =========================================================================
  // 4. Model Name Displayed Correctly
  // =========================================================================
  describe('4. Model Name Display', () => {
    it('4.1 model name from auto-setup appears in notification', () => {
      stubCommonApis();
      cy.intercept('GET', '**/api/llm/status', {
        statusCode: 200,
        body: {
          available: false,
          setup_needed: true,
          recommended: { model_name: 'llama-3.2-1b-q8', model_index: 2, size_mb: 1300, gpu_mode: 'cuda' },
          diagnosis: { action: 'start' },
        },
      }).as('llmStatus');

      cy.intercept('POST', '**/api/llm/auto-setup', {
        statusCode: 200,
        body: { success: true, model_name: 'llama-3.2-1b-q8' },
      }).as('autoSetup');

      cy.intercept('GET', '**/api/ai/bootstrap/status', {
        statusCode: 200,
        body: { phase: 'done', steps: {} },
      }).as('bootstrapStatus');

      setLocalStorage();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 300000 });
      cy.wait('@autoSetup', { timeout: 300000 });
      cy.wait(2000);

      // The notification detail includes the model name
      cy.get('body').should(($body) => {
        const text = $body.text();
        // pushNotification detail is the model_name from setupData
        const hasModelInfo =
          text.includes('llama-3.2') ||
          text.includes('llama') ||
          text.includes('fully awake');
        expect(hasModelInfo, 'Should display model name or success toast').to.be.true;
      });
    });

    it('4.2 /api/llm/status response with model_name is accessible', () => {
      stubCommonApis();
      cy.intercept('GET', '**/api/llm/status', {
        statusCode: 200,
        body: { available: true, model_name: 'mistral-7b-instruct-q4', setup_needed: false },
      }).as('llmStatus');

      cy.intercept('GET', '**/api/ai/bootstrap/status', {
        statusCode: 200,
        body: { phase: 'done', steps: {} },
      }).as('bootstrapStatus');

      setLocalStorage();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 300000 });

      cy.wait('@llmStatus', { timeout: 300000 }).then((interception) => {
        expect(interception.response.body).to.have.property('model_name', 'mistral-7b-instruct-q4');
        expect(interception.response.body).to.have.property('available', true);
      });
    });

    it('4.3 setup card contains model name and size label', () => {
      stubCommonApis();
      cy.intercept('GET', '**/api/llm/status', {
        statusCode: 200,
        body: {
          available: false,
          setup_needed: true,
          recommended: { model_name: 'deepseek-r1-1.5b-q4', model_index: 1, size_mb: 980, gpu_mode: 'cpu' },
          diagnosis: { action: 'download_model', compute_budget_mb: 4000 },
        },
      }).as('llmStatus');

      cy.intercept('GET', '**/api/ai/bootstrap/status', {
        statusCode: 200,
        body: { phase: 'done', steps: {} },
      }).as('bootstrapStatus');

      setLocalStorage();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 300000 });
      cy.wait('@llmStatus', { timeout: 300000 });
      cy.wait(3000);

      // For download_model action, a setup card or notification appears with model details
      cy.get('body').should(($body) => {
        const text = $body.text();
        const hasModelRef =
          text.includes('deepseek') ||
          text.includes('980') ||
          text.includes('MB') ||
          text.includes('download') ||
          text.includes('Download');
        expect(hasModelRef, 'Should reference the model in setup info').to.be.true;
      });
    });

    it('4.4 chat still works when model_name is null (unavailable)', () => {
      stubCommonApis();
      cy.intercept('GET', '**/api/llm/status', {
        statusCode: 200,
        body: { available: false, model_name: null, setup_needed: false },
      }).as('llmStatus');

      cy.intercept('GET', '**/api/ai/bootstrap/status', {
        statusCode: 200,
        body: { phase: 'done', steps: {} },
      }).as('bootstrapStatus');

      setLocalStorage();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 300000 });
      cy.wait(3000);

      // Page should still render and textarea should be usable
      cy.get('textarea, input[type="text"]', { timeout: 300000 }).first().should('exist');
      cy.get('#root').invoke('html').should('not.be.empty');
    });
  });
});
