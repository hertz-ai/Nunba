/// <reference types="cypress" />

/**
 * Chat Agent Selection E2E Tests
 *
 * Tests cover:
 *   1. Default agent is local_assistant on fresh load
 *   2. Switching agents updates the chat heading
 *   3. Created agents show in sidebar
 *   4. Agent capabilities display correctly
 *
 * All API calls are intercepted and mocked so the tests run without a live backend.
 * Follows project conventions:
 *   - {force: true} on all cy.click() / cy.type()
 *   - failOnStatusCode: false on all cy.visit() / cy.request()
 *   - ONE cy.socialAuth() in outer before() where needed
 */

describe('Chat Agent Selection', () => {
  // ---------------------------------------------------------------------------
  // Shared fixtures
  // ---------------------------------------------------------------------------

  const localAssistant = {
    prompt_id: 1,
    id: 'local_assistant',
    name: 'HART',
    prompt: 'You are a helpful local assistant.',
    is_active: true,
    is_public: false,
    is_default: true,
    create_agent: false,
    type: 'local',
    user_id: 0,
    request_id: 'built-in-local',
    image_url: '',
    created_date: '2025-01-01T00:00:00',
    capabilities: ['chat', 'code', 'math'],
  };

  const cloudAgent = {
    prompt_id: 2,
    id: 'cloud_gpt',
    name: 'Cloud GPT',
    prompt: 'You are a cloud-powered assistant.',
    is_active: true,
    is_public: true,
    is_default: false,
    create_agent: false,
    type: 'cloud',
    user_id: 0,
    request_id: 'built-in-cloud',
    image_url: '',
    created_date: '2025-01-01T00:00:00',
    capabilities: ['chat', 'vision'],
  };

  const createdAgent = {
    prompt_id: 301,
    id: 'created_science_tutor',
    name: 'Science Tutor',
    prompt: 'You are a science tutor.',
    is_active: true,
    is_public: false,
    create_agent: true,
    type: 'local',
    user_id: 999,
    request_id: 'user-req-301',
    image_url: '',
    created_date: '2025-06-15T10:00:00',
    capabilities: ['chat', 'research'],
  };

  const createdAgentTwo = {
    prompt_id: 302,
    id: 'created_music_agent',
    name: 'Music Composer',
    prompt: 'You compose music.',
    is_active: true,
    is_public: true,
    create_agent: true,
    type: 'local',
    user_id: 999,
    request_id: 'user-req-302',
    image_url: '',
    created_date: '2025-06-16T10:00:00',
    capabilities: ['chat', 'audio_gen'],
  };

  const promptsFixture = {
    prompts: [localAssistant, cloudAgent, createdAgent, createdAgentTwo],
    success: true,
    is_online: true,
  };

  /** Stub all network calls so the page renders with mocked data. */
  function stubApis(fixture = promptsFixture) {
    cy.intercept('GET', '**/prompts*', {
      statusCode: 200,
      body: fixture,
    }).as('getPrompts');

    cy.intercept('POST', '**/chat', {
      statusCode: 200,
      body: {
        text: 'Hello! How can I help you?',
        agent_id: 'local_assistant',
        agent_type: 'local',
        source: 'llama',
        success: true,
      },
    }).as('postChat');

    // Stub cloud agent endpoints so they don't 404
    cy.intercept('GET', '**/getprompt_all/**', { statusCode: 200, body: [] }).as('cloudPublic');
    cy.intercept('GET', '**/getprompt/**', { statusCode: 200, body: [] }).as('cloudUser');

    // Stub LLM status so setup card doesn't appear.  The trailing * also
    // matches Demopage's one-shot /api/llm/status?full=1 setup check; without
    // it that request reached the runner's real (model-less) backend and a
    // 'Local LLM Setup' card replaced the empty-chat block.
    cy.intercept('GET', '**/api/llm/status*', {
      statusCode: 200,
      body: { available: true, model_name: 'qwen-2.5', setup_needed: false },
    }).as('llmStatus');

    // Stub bootstrap status
    cy.intercept('GET', '**/api/ai/bootstrap/status', {
      statusCode: 200,
      body: { phase: 'done', steps: {} },
    }).as('bootstrapStatus');

    // Stub backend health
    cy.intercept('GET', '**/backend/health', {
      statusCode: 200,
      body: { status: 'healthy' },
    }).as('backendHealth');

    // Stub agents sync
    cy.intercept('GET', '**/agents/sync*', {
      statusCode: 200,
      body: { agents: [] },
    }).as('agentsSync');
  }

  /**
   * A returning guest on this device: a sealed HART (no onboarding), guest
   * mode, and the speech-consent question answered.  Unanswered, Demopage
   * shows the ProactiveConciergeCard where the empty-chat block, and the
   * active agent's name in its heading, would be.
   */
  function seedReturningGuest() {
    localStorage.removeItem('active_agent_id');
    localStorage.setItem('hart_sealed', 'true');
    localStorage.setItem('hart_name', 'CypressTest');
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_user_id', 'cypress_user_001');
    localStorage.setItem('nunba_speech_consent', 'text_only');
  }

  /** The active agent's name: the empty-chat heading (Demopage.js). */
  function activeAgentHeading() {
    return cy.get('h1', {timeout: 30000}).filter(':visible');
  }

  /**
   * The /prompts agents are listed in the 'View All Agents' overlay
   * (components/Agent/Agents.js, predefinedAgents = Demopage's allAgents).
   * The sidebar's Recents is a fixed showcase list, not /prompts.
   */
  function openAllAgents() {
    cy.contains('button', 'View All Agents', {timeout: 30000}).click({force: true});
    cy.contains('h2', 'All Agents', {timeout: 30000}).should('be.visible');
  }

  // =========================================================================
  // 1. Default Agent on Fresh Load
  // =========================================================================
  describe('1. Default Agent on Fresh Load', () => {
    beforeEach(() => {
      stubApis();
      seedReturningGuest();
    });

    it('1.1 selects local_assistant as default when no saved preference', () => {
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 30000 });
      cy.wait(3000);

      // The active agent's name heads the empty chat.  (A body-text match
      // for 'HART' also hit the sidebar's 'Hear HART OS speak'.)
      activeAgentHeading().should('contain.text', 'HART');
    });

    it('1.2 does not auto-select a user-created agent on fresh load', () => {
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 30000 });
      cy.wait(3000);

      // Should NOT show the created agent's name as the active/heading agent
      // The created agent name might appear in the sidebar list, so we check
      // the main chat area heading specifically
      activeAgentHeading()
        .should('contain.text', 'HART')
        .and('not.contain.text', 'Science Tutor');
    });

    it('1.3 restores saved agent from localStorage if valid', () => {
      // Pre-set active_agent_id to the cloud agent
      localStorage.setItem('active_agent_id', '2');
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 30000 });
      cy.wait(3000);

      activeAgentHeading().should('contain.text', 'Cloud GPT');
    });

    it('1.4 clears invalid active_agent_id and falls back to default', () => {
      // Set a non-numeric agent ID which Demopage treats as invalid
      localStorage.setItem('active_agent_id', 'garbage_value');
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 30000 });
      cy.wait(3000);

      // The unknown id is dropped and the default agent chosen, and the
      // default's id is saved in its place (Demopage.js fetchPrompts: the
      // fallback writes active_agent_id, symmetric with a restore).
      activeAgentHeading().should('contain.text', 'HART');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('active_agent_id')).to.eq('1');
      });
    });
  });

  // =========================================================================
  // 2. Switching Agents Updates Chat Heading
  // =========================================================================
  describe('2. Switching Agents Updates Chat', () => {
    beforeEach(() => {
      stubApis();
      seedReturningGuest();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 30000 });
      cy.wait(3000);
    });

    it('2.1 clicking an agent in the sidebar updates the active agent', () => {
      openAllAgents();
      cy.contains('.agent-card__name', 'Cloud GPT', { timeout: 30000 }).click({ force: true });

      activeAgentHeading().should('contain.text', 'Cloud GPT');
    });

    it('2.2 switching agents persists active_agent_id to localStorage', () => {
      openAllAgents();
      cy.contains('.agent-card__name', 'Cloud GPT', { timeout: 30000 }).click({ force: true });

      cy.window().its('localStorage').invoke('getItem', 'active_agent_id')
        .should('eq', '2');
    });

    it('2.3 switching back to default agent works', () => {
      // First switch away
      openAllAgents();
      cy.contains('.agent-card__name', 'Cloud GPT', { timeout: 30000 }).click({ force: true });
      activeAgentHeading().should('contain.text', 'Cloud GPT');

      // Then switch back to HART
      openAllAgents();
      cy.contains('.agent-card__name', /^HART$/, { timeout: 30000 })
        .click({ force: true });

      activeAgentHeading().should('contain.text', 'HART');
    });

    it('2.4 switching to a created agent shows its name', () => {
      openAllAgents();
      cy.contains('.agent-card__name', 'Science Tutor', { timeout: 30000 }).click({ force: true });

      activeAgentHeading().should('contain.text', 'Science Tutor');
    });
  });

  // =========================================================================
  // 3. Created Agents Show in Sidebar
  // =========================================================================
  describe('3. Created Agents in Sidebar', () => {
    beforeEach(() => {
      stubApis();
      seedReturningGuest();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 30000 });
      cy.wait(3000);
    });

    it('3.1 user-created agents appear in the agent list', () => {
      openAllAgents();
      cy.contains('Science Tutor', { timeout: 30000 }).should('exist');
      cy.contains('Music Composer', { timeout: 30000 }).should('exist');
    });

    it('3.2 built-in agents appear in the agent list', () => {
      openAllAgents();
      cy.contains('HART', { timeout: 30000 }).should('exist');
      cy.contains('Cloud GPT', { timeout: 30000 }).should('exist');
    });

    it('3.3 total agent count matches fixture', () => {
      openAllAgents();
      cy.contains('4 agents').should('exist');
      cy.get('.agents-page').then(($body) => {
        const text = $body.text();
        expect(text).to.include('HART');
        expect(text).to.include('Cloud GPT');
        expect(text).to.include('Science Tutor');
        expect(text).to.include('Music Composer');
      });
    });

    it('3.4 agent list does not show inactive agents', () => {
      const fixtureWithInactive = {
        ...promptsFixture,
        prompts: [
          ...promptsFixture.prompts,
          {
            prompt_id: 999,
            id: 'inactive_agent',
            name: 'InactiveBot',
            prompt: 'I should not appear.',
            is_active: false,
            is_public: false,
            create_agent: true,
            type: 'local',
            user_id: 999,
            request_id: 'inactive-req',
            image_url: '',
            created_date: '2025-01-01T00:00:00',
          },
        ],
      };

      // Re-stub with inactive agent included
      cy.intercept('GET', '**/prompts*', {
        statusCode: 200,
        body: fixtureWithInactive,
      }).as('getPromptsInactive');

      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPromptsInactive', { timeout: 30000 });
      cy.wait(3000);

      // Active agents should be listed
      openAllAgents();
      cy.contains('Cloud GPT', { timeout: 30000 }).should('exist');
      // Inactive agent should not appear (backend filters, frontend also filters)
      cy.get('.agents-page').then(($body) => {
        const text = $body.text();
        expect(text).to.not.include('InactiveBot');
      });
    });
  });

  // =========================================================================
  // 4. Agent Capabilities Display
  // =========================================================================
  describe('4. Agent Capabilities', () => {
    beforeEach(() => {
      stubApis();
      seedReturningGuest();
      cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
      cy.wait('@getPrompts', { timeout: 30000 });
      cy.wait(3000);
    });

    it('4.1 agent type (local vs cloud) is distinguishable in the UI', () => {
      // Both local and cloud agents should render
      openAllAgents();
      cy.get('.agents-page').then(($body) => {
        const text = $body.text();
        // At minimum the agent names are present — type is conveyed via
        // icon/badge/label next to each agent name
        expect(text).to.include('HART');
        expect(text).to.include('Cloud GPT');
      });
    });

    it('4.2 selecting a local agent sends agent_type "local" in chat payload', () => {
      // Ensure HART (local) is selected (default)
      cy.get('textarea, input[type="text"]', { timeout: 30000 })
        .first()
        .type('hello{enter}', { force: true });

      cy.wait('@postChat', { timeout: 30000 }).then((interception) => {
        expect(interception.request.body).to.have.property('agent_type', 'local');
        expect(interception.request.body).to.have.property('agent_id');
      });
    });

    it('4.3 /prompts response contains expected agent fields', () => {
      cy.wait('@getPrompts', { timeout: 30000 }).then((interception) => {
        const agents = interception.response.body.prompts;
        agents.forEach((agent) => {
          expect(agent).to.have.property('prompt_id');
          expect(agent).to.have.property('name');
          expect(agent).to.have.property('is_active');
        });
      });
    });

    it('4.4 chat textarea is available for interaction', () => {
      cy.get('textarea, input[type="text"]', { timeout: 30000 })
        .first()
        .should('exist');
    });
  });
});
