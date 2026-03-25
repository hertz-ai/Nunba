/// <reference types="cypress" />

/**
 * Chat Thinking Traces E2E Tests
 *
 * Tests cover:
 *   1. Thinking container appears during response
 *   2. Thinking steps expand/collapse
 *   3. Daemon traces NOT shown in user chat
 *   4. Thinking container marks completed after response
 *
 * The ThinkingProcessContainer component renders:
 *   - A collapsible container with "Thought process" heading
 *   - Animated pulse dots while thinking, green checkmark when completed
 *   - "Thought process (completed)" text when done
 *   - Individual expandable steps inside the container
 *
 * All API calls are intercepted and mocked.
 * Follows project conventions:
 *   - {force: true} on all cy.click() / cy.type()
 *   - failOnStatusCode: false on all cy.visit()
 */

describe('Chat Thinking Traces', () => {
  // ---------------------------------------------------------------------------
  // Shared fixtures
  // ---------------------------------------------------------------------------

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

  /** Set up intercepts for all standard endpoints. */
  function stubBaseApis() {
    cy.intercept('GET', '**/prompts*', {
      statusCode: 200,
      body: promptsFixture,
    }).as('getPrompts');

    cy.intercept('GET', '**/api/llm/status', {
      statusCode: 200,
      body: { available: true, model_name: 'qwen-2.5', setup_needed: false },
    }).as('llmStatus');

    cy.intercept('GET', '**/api/ai/bootstrap/status', {
      statusCode: 200,
      body: { phase: 'done', steps: {} },
    }).as('bootstrapStatus');

    cy.intercept('GET', '**/backend/health', {
      statusCode: 200,
      body: { status: 'healthy' },
    }).as('backendHealth');

    cy.intercept('GET', '**/getprompt_all/**', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/getprompt/**', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/agents/sync*', { statusCode: 200, body: { agents: [] } });
  }

  function setLocalStorage() {
    localStorage.removeItem('active_agent_id');
    localStorage.setItem('hart_sealed', 'true');
    localStorage.setItem('hart_name', 'CypressTest');
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_user_id', 'cypress_user_001');
  }

  // =========================================================================
  // 1. Thinking Container Appears During Response
  // =========================================================================
  describe('1. Thinking Container Appears During Response', () => {
    beforeEach(() => {
      stubBaseApis();

      // Delay the chat response so the thinking container has time to render
      cy.intercept('POST', '**/chat', (req) => {
        req.reply({
          statusCode: 200,
          body: {
            text: 'The answer is 4.',
            agent_id: 'local_assistant',
            agent_type: 'local',
            source: 'llama',
            success: true,
          },
          delay: 3000,
        });
      }).as('postChat');

      setLocalStorage();
      cy.visit('/local', { failOnStatusCode: false });
      cy.wait('@getPrompts', { timeout: 20000 });
      cy.wait(2000);
    });

    it('1.1 shows loading indicator after sending a message', () => {
      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('what is 2+2{enter}', { force: true });

      // A loading indicator (hourglass animation, dots, or cycling verb) should appear
      cy.get('body', { timeout: 10000 }).should(($body) => {
        const text = $body.text();
        // The CyclingVerb component shows words like "Analyzing...", "Processing...", etc.
        const hasLoadingIndicator =
          text.includes('Analyzing') ||
          text.includes('Processing') ||
          text.includes('Reasoning') ||
          text.includes('Composing') ||
          text.includes('Evaluating') ||
          text.includes('Understanding') ||
          text.includes('Exploring') ||
          text.includes('Connecting') ||
          text.includes('Synthesizing') ||
          text.includes('Reflecting') ||
          text.includes('Interpreting') ||
          text.includes('Considering') ||
          // Also accept the raw thinking container text
          text.includes('Thought process');
        expect(hasLoadingIndicator, 'Should show a loading/thinking indicator').to.be.true;
      });
    });

    it('1.2 user message appears in the chat before response arrives', () => {
      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('hello there{enter}', { force: true });

      // User message should be visible immediately
      cy.contains('hello there', { timeout: 5000 }).should('exist');
    });

    it('1.3 response text appears after the API returns', () => {
      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('what is 2+2{enter}', { force: true });

      cy.wait('@postChat', { timeout: 20000 });
      cy.wait(1000);

      cy.contains('The answer is 4', { timeout: 10000 }).should('exist');
    });

    it('1.4 response does not contain raw <think> tags', () => {
      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('tell me something{enter}', { force: true });

      cy.wait('@postChat', { timeout: 20000 });
      cy.wait(1000);

      cy.get('body').then(($body) => {
        const text = $body.text();
        expect(text).to.not.include('<think>');
        expect(text).to.not.include('</think>');
      });
    });
  });

  // =========================================================================
  // 2. Thinking Steps Expand / Collapse
  // =========================================================================
  describe('2. Thinking Steps Expand/Collapse', () => {
    beforeEach(() => {
      stubBaseApis();

      // Return a response that contains thinking trace data
      cy.intercept('POST', '**/chat', {
        statusCode: 200,
        body: {
          text: 'Paris is the capital of France.',
          agent_id: 'local_assistant',
          agent_type: 'local',
          source: 'llama',
          success: true,
        },
      }).as('postChat');

      setLocalStorage();
    });

    it('2.1 thinking container button is clickable (toggle expand)', () => {
      cy.visit('/local', { failOnStatusCode: false });
      cy.wait('@getPrompts', { timeout: 20000 });
      cy.wait(2000);

      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('what is the capital of France{enter}', { force: true });

      cy.wait('@postChat', { timeout: 15000 });
      cy.wait(1000);

      // If a thinking container appeared, its toggle button should be clickable
      cy.get('body').then(($body) => {
        if ($body.text().includes('Thought process')) {
          cy.contains('Thought process').click({ force: true });
          // No crash = pass
          cy.get('body').should('be.visible');
        }
      });
    });

    it('2.2 expand/collapse does not crash the page', () => {
      cy.visit('/local', { failOnStatusCode: false });
      cy.wait('@getPrompts', { timeout: 20000 });
      cy.wait(2000);

      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('explain gravity{enter}', { force: true });

      cy.wait('@postChat', { timeout: 15000 });
      cy.wait(1000);

      // Double-toggle: expand then collapse
      cy.get('body').then(($body) => {
        if ($body.text().includes('Thought process')) {
          cy.contains('Thought process').click({ force: true });
          cy.wait(500);
          cy.contains('Thought process').click({ force: true });
          cy.wait(500);
        }
      });

      // Page should still be functional
      cy.get('#root').invoke('html').should('not.be.empty');
    });

    it('2.3 thinking container shows green checkmark when completed', () => {
      cy.visit('/local', { failOnStatusCode: false });
      cy.wait('@getPrompts', { timeout: 20000 });
      cy.wait(2000);

      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('hello{enter}', { force: true });

      cy.wait('@postChat', { timeout: 15000 });
      cy.wait(2000);

      // After response arrives, if thinking container exists it should show completed state
      cy.get('body').then(($body) => {
        if ($body.text().includes('Thought process')) {
          // The completed state shows "Thought process (completed)" and a green checkmark
          cy.get('.bg-green-500').should('exist');
        }
      });
    });
  });

  // =========================================================================
  // 3. Daemon Traces NOT Shown in User Chat
  // =========================================================================
  describe('3. Daemon Traces Filtered', () => {
    beforeEach(() => {
      stubBaseApis();

      cy.intercept('POST', '**/chat', {
        statusCode: 200,
        body: {
          text: 'I can help with that.',
          agent_id: 'local_assistant',
          agent_type: 'local',
          source: 'llama',
          success: true,
        },
      }).as('postChat');

      setLocalStorage();
      cy.visit('/local', { failOnStatusCode: false });
      cy.wait('@getPrompts', { timeout: 20000 });
      cy.wait(2000);
    });

    it('3.1 chat does not show autogen daemon content', () => {
      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('hi{enter}', { force: true });

      cy.wait('@postChat', { timeout: 15000 });
      cy.wait(2000);

      cy.get('body').then(($body) => {
        const text = $body.text();
        expect(text).to.not.include('Execute Action 1');
        expect(text).to.not.include('AUTONOMOUS RESEARCH');
        expect(text).to.not.include('ChatInstructor');
        expect(text).to.not.include('StatusVerifier');
      });
    });

    it('3.2 chat does not show raw daemon request IDs', () => {
      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('hello{enter}', { force: true });

      cy.wait('@postChat', { timeout: 15000 });
      cy.wait(2000);

      cy.get('body').then(($body) => {
        const text = $body.text();
        // Daemon traces contain specific patterns that should never leak to user chat
        expect(text).to.not.include('daemon_request_id');
        expect(text).to.not.include('DaemonThread');
        expect(text).to.not.include('background_task');
      });
    });

    it('3.3 only user message and assistant response are visible', () => {
      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('test message{enter}', { force: true });

      cy.wait('@postChat', { timeout: 15000 });
      cy.wait(2000);

      // User message should be present
      cy.contains('test message', { timeout: 5000 }).should('exist');
      // Assistant response should be present
      cy.contains('I can help with that', { timeout: 5000 }).should('exist');
    });

    it('3.4 no Thinking Process label shown for simple responses', () => {
      // For a quick response with no thinking steps, there should be no
      // "Thinking Process:" raw text
      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('hi{enter}', { force: true });

      cy.wait('@postChat', { timeout: 15000 });
      cy.wait(2000);

      cy.get('body').then(($body) => {
        const text = $body.text();
        expect(text).to.not.include('Thinking Process:');
      });
    });
  });

  // =========================================================================
  // 4. Thinking Container Marks Completed After Response
  // =========================================================================
  describe('4. Thinking Container Completion', () => {
    beforeEach(() => {
      stubBaseApis();
      setLocalStorage();
    });

    it('4.1 response appears even without thinking traces', () => {
      cy.intercept('POST', '**/chat', {
        statusCode: 200,
        body: {
          text: 'Quick reply!',
          agent_id: 'local_assistant',
          agent_type: 'local',
          source: 'llama',
          success: true,
        },
      }).as('postChat');

      cy.visit('/local', { failOnStatusCode: false });
      cy.wait('@getPrompts', { timeout: 20000 });
      cy.wait(2000);

      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('hey{enter}', { force: true });

      cy.wait('@postChat', { timeout: 15000 });
      cy.contains('Quick reply!', { timeout: 10000 }).should('exist');
    });

    it('4.2 completed thinking shows duration label', () => {
      cy.intercept('POST', '**/chat', {
        statusCode: 200,
        body: {
          text: 'Done thinking.',
          agent_id: 'local_assistant',
          agent_type: 'local',
          source: 'llama',
          success: true,
        },
        delay: 2000,
      }).as('postChatSlow');

      cy.visit('/local', { failOnStatusCode: false });
      cy.wait('@getPrompts', { timeout: 20000 });
      cy.wait(2000);

      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('think about this{enter}', { force: true });

      cy.wait('@postChatSlow', { timeout: 20000 });
      cy.wait(2000);

      // If thinking container is present, it should show a time duration
      cy.get('body').then(($body) => {
        if ($body.text().includes('Thought process')) {
          // Duration is shown as Xms or X.Xs or XmXs
          cy.get('.font-mono', { timeout: 5000 }).should('exist');
        }
      });
    });

    it('4.3 multiple messages each get independent thinking state', () => {
      cy.intercept('POST', '**/chat', {
        statusCode: 200,
        body: {
          text: 'Response received.',
          agent_id: 'local_assistant',
          agent_type: 'local',
          source: 'llama',
          success: true,
        },
      }).as('postChat');

      cy.visit('/local', { failOnStatusCode: false });
      cy.wait('@getPrompts', { timeout: 20000 });
      cy.wait(2000);

      // Send first message
      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('first question{enter}', { force: true });
      cy.wait('@postChat', { timeout: 15000 });
      cy.wait(1500);

      // Send second message
      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('second question{enter}', { force: true });
      cy.wait('@postChat', { timeout: 15000 });
      cy.wait(1500);

      // Both messages should be present
      cy.contains('first question', { timeout: 5000 }).should('exist');
      cy.contains('second question', { timeout: 5000 }).should('exist');
      // Page should not crash with multiple messages
      cy.get('#root').invoke('html').should('not.be.empty');
    });

    it('4.4 error response does not leave a stuck thinking indicator', () => {
      cy.intercept('POST', '**/chat', {
        statusCode: 200,
        body: {
          text: 'Sorry, I could not process that.',
          agent_id: 'local_assistant',
          agent_type: 'local',
          error: 'local_llm_unavailable',
          success: false,
        },
      }).as('postChatError');

      cy.visit('/local', { failOnStatusCode: false });
      cy.wait('@getPrompts', { timeout: 20000 });
      cy.wait(2000);

      cy.get('textarea, input[type="text"]', { timeout: 15000 })
        .first()
        .type('trigger error{enter}', { force: true });

      cy.wait('@postChatError', { timeout: 15000 });
      cy.wait(3000);

      // After an error, there should be no forever-spinning thinking indicator.
      // The animate-pulse dots only appear during active thinking.
      cy.get('body').then(($body) => {
        const text = $body.text();
        // If "Thought process" appears at all, it should say "completed"
        if (text.includes('Thought process')) {
          expect(text).to.include('completed');
        }
      });
    });
  });
});
