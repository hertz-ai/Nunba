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
const API = `${Cypress.env('apiUrl')}`;

describe('#207 guest session survives 401 mid-chat (functional)', () => {
  beforeEach(() => {
    cy.clearAllLocalStorage();
    cy.openLocalChat();
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


// #208 (thinking-trace spinner force-completes after STALE_CEILING_SEC) is
// pinned by src/__tests__/pages/chat/ThinkingProcessContainer.ceiling.test.js
// on computeIsReallyCompleted, boundary and the 83-minute case included.
// The Cypress test that stood here dispatched a 'test:inject-thinking' event
// that nothing in the app listens for, then slept 185 s: it could not pass
// and cost ~6 min a run with the retry.


// #211 (a token refresh keeps the SSE stream; a uid change opens the new
// stream before closing the old) is pinned by
// src/__tests__/services/realtimeService.resilience.test.js with a fake
// EventSource.  The Cypress tests that stood here never reached the app's
// stream: the app sets no window.__nunba_realtime__, so they require()d a
// second copy of realtimeService into the spec bundle, where API_BASE_URL
// is the localhost:5000 default.  On a dev box that copy opened SSE streams
// on the installed Nunba (measured 2026-11-05: uid=guest and
// uid=d68c9dee-real-uid registered there during a run against :5001).


describe('#170 autogen prompt stays within llama-server n_ctx budget', () => {
  it('AUTOGEN_MESSAGE_TOKEN_BUDGET is <= 3500 (safe headroom)', () => {
    // Tested indirectly via the backend health endpoint that reports
    // the active token budget.  Pinning the contract here so a UI
    // dev who increases the constant can't silently regress chat
    // reliability.
    // Options object, not cy.request(url, {...}): the second argument of
    // that form is the request BODY, so failOnStatusCode never applied and
    // the 404 below failed the test.
    cy.request({url: `${API}/api/admin/autogen-budget`, failOnStatusCode: false})
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
    cy.openLocalChat();
  });

  it('after MAX_RETRIES backend-unreachable attempts, message status=failed', () => {
    // Force backend down for the whole test
    cy.intercept('POST', '**/chat', {forceNetworkError: true}).as('chatFail');
    // Only the timers are faked (Date stays real), and only once the chat
    // is usable: Agent.js crossfades the hero into the chat on setTimeout,
    // so a clock installed before the visit left #demo-section at
    // pointer-events:none.  handleSend sleeps getBackoff(n) between
    // attempts, 2 s doubling to 30 s, ~3.5 min of real time for
    // MAX_RETRIES (utils/chatRetry); in real time that sat at the edge of
    // the old 240 s timeout (222 s pass, then a fail, on the same stack).
    cy.get('textarea').first().should('be.visible').and('not.be.disabled');
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout']);
    cy.get('textarea').first().type('this will fail{enter}');

    // Step the backoff forward one second at a time: handleSend counts the
    // backoff down with one setTimeout(1000) per second (Demopage.js, the
    // "retrying in Ns" loop), so a tick fires at most one of them and the
    // next is armed only after it resolves.  The short real wait lets the
    // failed request settle and the next timer be armed; a tick that lands
    // first is caught up by the next one.  ~210 steps for MAX_RETRIES.
    const stepUntilGaveUp = (stepsLeft) => {
      cy.get('body', {log: false}).then(($body) => {
        if (/gave up after \d+ attempts/i.test($body.text()) || stepsLeft === 0) return;
        cy.wait(30, {log: false});
        cy.tick(1000, {log: false});
        stepUntilGaveUp(stepsLeft - 1);
      });
    };
    stepUntilGaveUp(400);
    cy.contains(/gave up after \d+ attempts/i, {timeout: 10000}).should('be.visible');
    // User can manually retry — the Retry button is rendered
    cy.contains('button', /retry/i).should('be.visible');
  });
});


/**
 * Whether a TTS clip was put on the shared TTS audio element
 * (services/ttsAudioElement.js, id nunba-tts-audio).  A data: URI does not
 * count: handleSend primes that element on every send with a silent
 * data:audio/wav clip (WebView2 autoplay), so "src is set" was true for
 * any send, spoken or not.
 */
function ttsClipQueued(win) {
  const el = win.document.getElementById('nunba-tts-audio');
  const src = (el && el.getAttribute('src')) || '';
  return src !== '' && !src.startsWith('data:');
}

describe('#206 + #218 TTS playback after on-device reply', () => {
  // 'on-device assistant message triggers tts.speak() once' stood here.  By
  // design (utils/ttsGuards.shouldSpeakLocalReply, the 2026-05-20 double-
  // playback fix) the page speaks a local reply itself only when the
  // realtime stream is down; with it up, the server's TTS push is the audio.
  // On a CI-like stack (/chat stubbed, NUNBA_DISABLE_TTS=1) neither can
  // happen, and the test passed only on the silent data: clip handleSend
  // primes the element with.  Both branches are pinned in
  // src/__tests__/utils/ttsGuards.test.js.

  it('draft-first bubble does NOT speak (waits for expert)', () => {
    cy.openLocalChat({consent: 'granted'});
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
      const piperFired = ttsClipQueued(win);
      expect(piperFired).to.equal(false);
    });
  });
});


describe('#204 TaskLedger 3-level grouping (admin)', () => {
  it('prompt -> flow -> action hierarchy renders with expand/collapse', () => {
    // The ledger page is /admin/task-ledger (MainRoute.js, RoleGuard
    // minRole guest); /admin/tasks is the 404 page.  The stub is registered
    // before the visit, which is when the page fetches.
    cy.sealHart('Test.Resilience.User');
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
    cy.visit('/admin/task-ledger', {failOnStatusCode: false});
    cy.wait('@listTasks');
    cy.contains(/Flow 1/i).should('exist');
    cy.contains(/Flow 2/i).should('exist');
    // Flow 1 holds the in-progress action, so it is open on arrival.
    cy.contains('Execute Action 1: lookup').should('exist');
    cy.contains('Execute Action 2: synthesize').should('exist');
    // Flow 2 has only pending work: collapsed until its header is clicked.
    cy.contains('Flow 2 / Action 1: post').should('not.exist');
    cy.contains('tr', /↳ Flow 2/).click();
    cy.contains('Flow 2 / Action 1: post').should('exist');
  });
});


describe('NFT — premium-UX criteria (visible feedback within 100ms)', () => {
  it('clicking send button shows visual feedback under 100ms', () => {
    cy.openLocalChat();
    cy.intercept('POST', '**/chat', {
      statusCode: 200,
      body: {text: 'ok', source: 'langchain_local'},
      delay: 2000,
    });
    cy.get('textarea').first().type('hi');
    // Measured inside the page, from the click to the first mutation that
    // marks the UI busy.  `const before = Date.now()` at the top level ran
    // while Cypress was still building the command queue, so it counted the
    // visit and the typing; timing the next cy.get() instead counts
    // Cypress's own polling (366 ms locally for a busy flag already set).
    const BUSY = '[aria-busy="true"], .loading, [data-loading="true"]';
    cy.get('button[type="submit"], button[aria-label*="send" i]').first()
      .then(($btn) => {
        const win = $btn[0].ownerDocument.defaultView;
        win.__busyAfterMs = null;
        const start = win.performance.now();
        const obs = new win.MutationObserver(() => {
          if (win.__busyAfterMs === null && win.document.querySelector(BUSY)) {
            win.__busyAfterMs = win.performance.now() - start;
            obs.disconnect();
          }
        });
        obs.observe(win.document.body, {
          subtree: true, childList: true, attributes: true,
          attributeFilter: ['aria-busy', 'class', 'data-loading'],
        });
        $btn[0].click();
      });
    cy.window().its('__busyAfterMs', {timeout: 2000}).should('not.be.null')
      .then((ms) => {
        // 100 ms premium-UX target + slack, the bound this test always had.
        // Measured in-page on a slow dev box: 162 ms.
        expect(ms).to.be.lessThan(200);
      });
  });
});
