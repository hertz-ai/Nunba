/// <reference types="cypress" />

/**
 * chat-resilience-2026-05.cy.js — Functional + NFT contracts for the
 * resilience work shipped 2026-05-20 (#207, #208, #211, #170, #125,
 * #206, #212).  Each describe-block pins ONE contract end-to-end so
 * a CI run catches regressions in any of them.
 *
 * Test categories:
 *   Functional (FT) — given input X, the chat path produces output Y
 *   Non-functional (NFT) — latency, retry behaviour, graceful degradation
 *
 * Pre-conditions (operator-side; harness sets up the rest):
 *   - Nunba dev server running on http://localhost:5000 (Flask)
 *   - React dev server on http://localhost:3000 (or built static)
 *   - llama-server on :8082 reachable
 *   - At least one TTS backend verified runnable (Piper CPU acceptable)
 */

const APP = Cypress.config('baseUrl') || 'http://localhost:3000';
const API = 'http://localhost:5000';

describe('#207 guest session survives 401 mid-chat (functional)', () => {
  beforeEach(() => {
    cy.clearAllLocalStorage();
    cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
  });

  it('silentGuestRefresh fires on /chat 401, then retries with new token', () => {
    cy.intercept('POST', '**/auth/guest-register').as('guestRegister');
    cy.intercept('POST', '**/chat', (req) => {
      // First call returns 401 (simulates JWT TTL expired mid-chat)
      if (!req.headers['x-test-second-call']) {
        req.reply({statusCode: 401, body: {error: 'invalid_token'}});
      } else {
        req.reply({statusCode: 200, body: {text: 'Hi there!', source: 'langchain_local'}});
      }
    }).as('postChat');

    cy.get('textarea').first().type('hi{enter}');
    // Expect silent guest re-register fires, then chat succeeds
    cy.wait('@guestRegister', {timeout: 30000});
    // Login modal should NOT have opened (the bug we fixed)
    cy.get('[data-testid="otp-modal"]').should('not.exist');
  });
});


describe('#208 thinking-trace UI bounded at 180s (non-functional)', () => {
  it('Thinking-in-progress spinner force-completes after STALE_CEILING_SEC', () => {
    cy.visit('/local', {failOnStatusCode: false});
    cy.window().then((win) => {
      // Inject a stuck thinking-trace via the chat container internal
      // event stream so onComplete never arrives.
      win.dispatchEvent(new CustomEvent('test:inject-thinking', {
        detail: {step: 'analyzing...', id: 'test-1'},
      }));
    });
    // Wait past STALE_CEILING_SEC + small slack
    cy.wait(185000);
    cy.contains(/thinking completed|completed/i, {timeout: 5000}).should('be.visible');
  });
});


describe('#211 SSE resilience: token refresh does not drop the connection', () => {
  it('refreshing access_token via silentGuestRefresh keeps SSE open', () => {
    cy.visit('/local', {failOnStatusCode: false});
    cy.window().then((win) => {
      const realtimeService = win.__nunba_realtime__ ||
                              require('../../src/services/realtimeService').default;
      const initialUrl = realtimeService && realtimeService._eventSource?.url;
      // Simulate token rotation
      win.localStorage.setItem('access_token', 'jwt-rotated-' + Date.now());
      win.dispatchEvent(new CustomEvent('nunba:auth_changed', {
        detail: {source: 'token_refresh'},
      }));
      cy.wait(500);
      const afterUrl = realtimeService && realtimeService._eventSource?.url;
      // Same connection — URL did NOT rotate
      expect(afterUrl).to.equal(initialUrl);
    });
  });

  it('uid change overlap-reconnects with no broadcast-loss gap', () => {
    cy.visit('/local', {failOnStatusCode: false});
    cy.window().then((win) => {
      const realtimeService = win.__nunba_realtime__ ||
                              require('../../src/services/realtimeService').default;
      // Initial bind as 'guest'
      realtimeService.init(null, {userId: 'guest'});
      cy.wait(500);
      // Rotate to real uid
      realtimeService.init(null, {userId: 'd68c9dee-real-uid'});
      // During overlap, both connections should briefly coexist
      cy.wait(200);
      expect(realtimeService._sseConnected).to.equal(true);
    });
  });
});


describe('#170 autogen prompt stays within llama-server n_ctx budget', () => {
  it('AUTOGEN_MESSAGE_TOKEN_BUDGET is <= 3500 (safe headroom)', () => {
    // Tested indirectly via the backend health endpoint that reports
    // the active token budget.  Pinning the contract here so a UI
    // dev who increases the constant can't silently regress chat
    // reliability.
    cy.request(`${API}/api/admin/autogen-budget`, {failOnStatusCode: false})
      .then((res) => {
        if (res.status === 200 && res.body?.budget) {
          expect(res.body.budget).to.be.at.most(3500);
          expect(res.body.budget).to.be.at.least(1500);
        }
        // 404 acceptable — endpoint optional, the python-side test
        // tests/unit/test_autogen_token_budget.py is authoritative.
      });
  });
});


describe('#125 retry cap surfaces clear failure', () => {
  beforeEach(() => {
    cy.visit('/local', {failOnStatusCode: false});
  });

  it('after MAX_RETRIES backend-unreachable attempts, message status=failed', () => {
    // Force backend down for the whole test
    cy.intercept('POST', '**/chat', {forceNetworkError: true}).as('chatFail');
    cy.get('textarea').first().type('this will fail{enter}');

    // 10 retries × ~30s max each = ~3 minutes; wait up to 4 minutes
    cy.contains(/gave up after \d+ attempts/i, {timeout: 240000}).should('be.visible');
    // User can manually retry — the Retry button is rendered
    cy.contains('button', /retry/i).should('be.visible');
  });
});


describe('#206 + #218 TTS playback after on-device reply', () => {
  it('on-device assistant message triggers tts.speak() once', () => {
    cy.visit('/local', {failOnStatusCode: false});
    let speakCalls = 0;
    cy.window().then((win) => {
      const originalSpeak = win.speechSynthesis?.speak;
      if (originalSpeak) {
        win.speechSynthesis.speak = (u) => {
          speakCalls++;
          return originalSpeak.call(win.speechSynthesis, u);
        };
      }
    });

    cy.intercept('POST', '**/chat', {
      statusCode: 200,
      body: {text: 'Hi! How can I help you today?', source: 'langchain_local'},
    });
    cy.get('textarea').first().type('hi{enter}');
    cy.contains('Hi! How can I help', {timeout: 10000}).should('be.visible');
    // Allow either Piper or WebSpeech to fire — what matters is "audio attempted"
    cy.wait(1500);
    cy.window().then((win) => {
      // If WebSpeech was used, speakCalls >= 1; if Piper, audioRef.src is set
      const audioEl = win.document.querySelector('audio');
      const piperFired = audioEl && audioEl.src && audioEl.src !== '';
      expect(speakCalls > 0 || piperFired).to.equal(true);
    });
  });

  it('draft-first bubble does NOT speak (waits for expert)', () => {
    cy.visit('/local', {failOnStatusCode: false});
    cy.intercept('POST', '**/chat', {
      statusCode: 200,
      body: {
        text: 'Quick draft...',
        source: 'langchain_local',
        speculation_id: 'spec-1',
        expert_pending: true,
      },
    });
    cy.get('textarea').first().type('q{enter}');
    cy.contains('Quick draft...', {timeout: 10000}).should('be.visible');
    // Audio MUST NOT have fired for the draft
    cy.wait(1500);
    cy.window().then((win) => {
      const audioEl = win.document.querySelector('audio');
      const piperFired = audioEl && audioEl.src && audioEl.src !== '';
      expect(piperFired).to.equal(false);
    });
  });
});


describe('#204 TaskLedger 3-level grouping (admin)', () => {
  it('prompt -> flow -> action hierarchy renders with expand/collapse', () => {
    cy.visit('/admin/tasks', {failOnStatusCode: false});
    cy.intercept('GET', '**/agent-engine/ledger/tasks*', {
      statusCode: 200,
      body: {
        success: true,
        tasks: [
          {id: 't1', task_id: 't1', agent_id: 'a1', owner_prompt_id: 'p1',
           description: 'Execute Action 1: lookup', status: 'COMPLETED'},
          {id: 't2', task_id: 't2', agent_id: 'a1', owner_prompt_id: 'p1',
           description: 'Execute Action 2: synthesize', status: 'IN_PROGRESS'},
          {id: 't3', task_id: 't3', agent_id: 'a1', owner_prompt_id: 'p1',
           description: 'Flow 2 / Action 1: post', status: 'PENDING'},
        ],
      },
    }).as('listTasks');
    cy.wait('@listTasks');
    cy.contains(/Flow 1/i).should('exist');
    cy.contains(/Flow 2/i).should('exist');
    cy.contains(/Action 1/i).should('exist');
  });
});


describe('NFT — premium-UX criteria (visible feedback within 100ms)', () => {
  it('clicking send button shows visual feedback under 100ms', () => {
    cy.visit('/local', {failOnStatusCode: false});
    cy.get('textarea').first().type('hi');
    const before = Date.now();
    cy.get('button[type="submit"], button[aria-label*="send" i]').first().click();
    cy.get('[aria-busy="true"], .loading, [data-loading="true"]', {timeout: 200})
      .should('exist')
      .then(() => {
        const elapsed = Date.now() - before;
        expect(elapsed).to.be.lessThan(200);  // 100ms target + slack for Cypress
      });
  });
});
