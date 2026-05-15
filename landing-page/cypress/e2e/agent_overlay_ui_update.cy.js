/// <reference types="cypress" />

/**
 * AgentOverlay `agent.ui.update` substrate — live render contract.
 *
 * Covers the surfaces shipped 2026-05-14 (tasks #520-#524):
 *   - landing-page/src/components/AgentOverlay/AgentOverlay.jsx
 *     NotificationCard now honors data.actions[] with kind:'navigate'
 *     and kind:'external'; navigate prop is threaded through.
 *   - landing-page/src/pages/admin/TaskLedgerPage.js
 *     ?task_id= deep-link highlights the matching row.
 *
 * Verification approach:
 *   The full path (HARTOS agent_ui_update → WAMP/SSE → realtimeService →
 *   AgentOverlay → DOM) is too heavy for unit tests but trivial in
 *   Cypress: load the React app, inject a synthetic event through the
 *   dev-mode `window.__realtimeService` handle (added 2026-05-14 in
 *   src/services/realtimeService.js), then assert DOM + URL.
 *
 * This is the live verification the goal-hook ("all agentic liquid ui
 * in nunba shd work and should be verified") demands — distinct from
 * the Jest unit tests which only cover the React renderer in jsdom
 * with mocked transport.
 */

const NOTIFICATION_PAYLOAD = {
  type: 'notification',
  title: 'AI is working on…',
  message: '• demo task (in_progress)',
  severity: 'info',
  actions: [
    {label: 'View all tasks', kind: 'navigate',
     target: '/admin/task-ledger'},
    {label: 'View abc12345', kind: 'navigate',
     target: '/admin/task-ledger?task_id=abc12345'},
  ],
};

const OAUTH_PAYLOAD = {
  type: 'oauth_link',
  provider: 'reddit',
  description: 'Sign in to Reddit to forward subreddit content.',
  authorize_url: 'https://www.reddit.com/api/v1/authorize?stub=1',
};

const TOAST_PAYLOAD = {
  type: 'toast',
  title: 'Saved',
  message: 'Channel binding stored.',
  severity: 'success',
};

const LEDGER_TASKS = [
  {task_id: 'abc12345-aaaa', title: 'First active task',
   status: 'IN_PROGRESS', agent_id: 'agent_a'},
  {task_id: 'def67890-bbbb', title: 'Second active task',
   status: 'IN_PROGRESS', agent_id: 'agent_b'},
];

describe('AgentOverlay agent.ui.update — live substrate', () => {
  beforeEach(() => {
    // Bypass HART onboarding gate (Agent.js:245) — without this,
    // <Agent/> renders <LightYourHART/> instead of <Demopage/> and
    // AgentOverlay never mounts (verified 2026-05-15: substrate
    // sub-tree was unreachable; goal-hook surfaced as a real first-
    // run UX gap).  Also seal welcomeDone (Agent.js:250) so the
    // post-HART welcome bridge doesn't intercept either.
    cy.window({log: false}).then((win) => {
      win.localStorage.setItem('hart_sealed', 'true');
      win.localStorage.setItem('hart_name', 'cypress');
      win.localStorage.setItem('welcome_done', 'true');
      // guest_mode=true lifts accessTier to 'guest' so RoleGuard
      // minRole='guest' lets the /admin/task-ledger route render
      // (SocialContext.js:302).  Without it, the route redirects to
      // /social and the highlight assertion never sees the table.
      win.localStorage.setItem('guest_mode', 'true');
    });

    // Stub the SSE + WAMP boot so realtimeService doesn't try to
    // reach a real Flask backend.  Cypress doesn't natively stub
    // EventSource, so we just let it fail silently — the dev-mode
    // window.__realtimeService handle bypasses transport entirely.
    cy.intercept('GET', '/api/wamp/ticket', {
      statusCode: 200, body: {ticket: 'cypress-overlay-ticket'},
    });
    cy.intercept('GET', '/api/social/events/stream*', {
      statusCode: 204, body: '',
    });
    cy.intercept('GET', '/api/agent-engine/ledger/tasks*', {
      statusCode: 200,
      body: {success: true, tasks: LEDGER_TASKS, total: 2},
    });
    cy.intercept('GET', '/api/agent-engine/ledger/stats*', {
      statusCode: 200, body: {success: true, stats: {total: 2}},
    });
    // Auth-me stub so RoleGuard lets us into /admin/task-ledger.
    cy.intercept('GET', '/api/social/auth/me*', {
      statusCode: 200,
      body: {success: true, data: {id: 1, role: 'central'}},
    });
  });

  // Helper: wait until AgentOverlay has subscribed via realtimeService.on,
  // then emit.  Without this, _emit fires when zero listeners are
  // registered (race between cy.visit() React-mount and our cy.window()
  // emit call).
  const emitWhenReady = (payload) => {
    // 1. Hook must exist.
    cy.window({timeout: 20000}).should('have.property',
                                       '__realtimeService');
    // 2. Surface which listener names ARE registered (debug aid).
    cy.window().then((win) => {
      const names = win.__realtimeService._listeners
        && win.__realtimeService._listeners.keys
        ? Array.from(win.__realtimeService._listeners.keys())
        : [];
      cy.log('listener names: ' + JSON.stringify(names));
    });
    // 3. Wait until agent.ui.update has at least one subscriber.
    //    On failure, embed the actual registered names in the assertion
    //    message so the screenshot's first line tells us what mounted.
    cy.window({timeout: 20000}).should((win) => {
      const l = win.__realtimeService._listeners
        && win.__realtimeService._listeners.get('agent.ui.update');
      const count = l ? (l.size || l.length || 0) : 0;
      const allNames = win.__realtimeService._listeners
        && win.__realtimeService._listeners.keys
        ? Array.from(win.__realtimeService._listeners.keys())
        : [];
      expect(count,
             `agent.ui.update listeners (registered: [${allNames.join('|')}])`)
        .to.be.greaterThan(0);
    });
    // 4. Emit.
    cy.window().then((win) => {
      win.__realtimeService._emit('agent.ui.update', payload);
    });
  };

  it('notification with navigate action renders + click changes URL', () => {
    cy.visit('/', {failOnStatusCode: false});
    emitWhenReady(NOTIFICATION_PAYLOAD);

    // Overlay text from the synthetic event must appear in the DOM.
    cy.contains('AI is working on', {timeout: 5000}).should('be.visible');
    cy.contains('View all tasks').should('be.visible');
    cy.contains('View abc12345').should('be.visible');

    // Clicking the specific-task action navigates to the ledger page
    // with the task_id query param.
    cy.contains('View abc12345').click({force: true});
    cy.location('pathname', {timeout: 10000})
      .should('eq', '/admin/task-ledger');
    cy.location('search').should('contain', 'task_id=abc12345');
  });

  it('TaskLedgerPage highlights the row matching ?task_id=', () => {
    cy.visit('/admin/task-ledger?task_id=abc12345-aaaa',
             {failOnStatusCode: false});

    // The task row from our stubbed ledger response renders.
    cy.contains('First active task', {timeout: 10000}).should('be.visible');

    // The matching row has the highlight outline (we keyed on the
    // sx={...outline:'2px solid #6C63FF'} when task_id matches).
    // Querying via styles is brittle — instead verify the row exists
    // AND that scrollIntoView would have been called.  We can't stub
    // scrollIntoView through cy.window because the assertion is
    // implicit; we settle for the row being rendered as proof the
    // useSearchParams hook resolved correctly and the highlight
    // useEffect would have fired against the right row.
    cy.contains('First active task').parents('tr')
      .should('have.css', 'outline-style', 'solid');
  });

  it('toast and oauth_link route through NotificationCard (no JSON blob)', () => {
    cy.visit('/', {failOnStatusCode: false});

    // Toast → renders title + message via NotificationCard
    emitWhenReady(TOAST_PAYLOAD);
    cy.contains('Saved', {timeout: 5000}).should('be.visible');
    cy.contains('Channel binding stored.').should('be.visible');

    // OAuth → renders provider + description + 'Open <provider>' button
    emitWhenReady(OAUTH_PAYLOAD);
    cy.contains(/sign in to reddit/i, {timeout: 5000}).should('be.visible');
    cy.contains(/open reddit/i).should('be.visible');

    // No raw JSON blob (the default fallback in OverlayContent would
    // emit `JSON.stringify(data)` which contains `"type":"toast"` etc.).
    cy.contains('"type":"toast"').should('not.exist');
    cy.contains('"type":"oauth_link"').should('not.exist');
  });

  it('notification without actions stays back-compat', () => {
    cy.visit('/', {failOnStatusCode: false});

    emitWhenReady({
      type: 'notification',
      title: 'Plain notif',
      message: 'No actions array',
      severity: 'info',
    });

    cy.contains('Plain notif', {timeout: 5000}).should('be.visible');
    cy.contains('No actions array').should('be.visible');
    // No buttons rendered when actions array is missing.
    cy.contains('Plain notif').parent()
      .find('button').should('have.length.lessThan', 2);
  });
});
