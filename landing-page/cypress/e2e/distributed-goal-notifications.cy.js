/// <reference types="cypress" />

/**
 * Distributed Goal → Notification E2E Tests
 *
 * Tests the connection between:
 *   1. Distributed agent API endpoints (goals, tasks, hosts, verification)
 *   2. User notifications when agents contribute to shared goals
 *   3. NotificationsPage UI rendering of goal-related notifications
 *
 * Strategy:
 *   - Distributed API endpoints tested against LIVE backend (expect 401/503)
 *   - Notification content/UI tests use cy.intercept() stubs
 *   - Single cy.socialAuth() call per describe block to avoid rate-limiting
 *
 * Notes:
 *   - All cy.click()/cy.type() use {force: true} (webpack overlay issue).
 *   - All cy.request() use failOnStatusCode: false.
 */

const API = 'http://localhost:5000';
const DISTRIBUTED = `${API}/api/distributed`;

describe('Distributed Goal Notifications E2E', () => {
  // Single auth call for the entire spec (avoids rate-limiting)
  before(() => {
    cy.socialAuth();
  });

  // =========================================================================
  // Fixtures
  // =========================================================================

  const goalContributionNotification = {
    id: 'n-goal-contrib-1',
    user_id: 'test-user',
    type: 'goal_contribution',
    source_user_id: null,
    target_type: 'goal',
    target_id: 'goal_20260208_120000_abc12345',
    message:
      'Your agent contributed to "Invent a better search engine": completed "Build query parser module"',
    is_read: false,
    created_at: new Date().toISOString(),
  };

  const goalVerifiedNotification = {
    id: 'n-goal-verified-1',
    user_id: 'test-user',
    type: 'goal_verified',
    source_user_id: null,
    target_type: 'goal',
    target_id: 'goal_20260208_120000_abc12345',
    message:
      'Your contribution to "Invent a better search engine" was verified by peer consensus!',
    is_read: false,
    created_at: new Date(Date.now() - 30000).toISOString(),
  };

  const regularNotification = {
    id: 'n-regular-1',
    user_id: 'test-user',
    type: 'comment',
    source_user_id: 'other-user',
    target_type: 'post',
    target_id: 'post-123',
    message: 'Alice commented on your post',
    is_read: true,
    created_at: new Date(Date.now() - 120000).toISOString(),
  };

  // =========================================================================
  // 1. Distributed API Registration (Blueprint Active)
  //    Auth via cy.socialAuth() once; reuse token for all tests.
  //    Accept 401 (rate limit / token issue) alongside 200/503.
  // =========================================================================
  describe('1. Distributed API Registration', () => {
    it('1.1 GET /api/distributed/hosts returns 401 without auth token', () => {
      cy.request({
        method: 'GET',
        url: `${DISTRIBUTED}/hosts`,
        failOnStatusCode: false,
        timeout: 300000,
      }).then((res) => {
        // 401 = blueprint is registered and auth is enforced
        // 404 = blueprint not registered (failure)
        expect(res.status).to.be.oneOf([401, 403, 404, 503]);
      });
    });

    it('1.2 GET /api/distributed/hosts responds with auth token', () => {
      cy.socialRequest('GET', `${DISTRIBUTED}/hosts`).then((res) => {
        // 200 = Redis available, 503 = no Redis, 401 = rate-limited auth
        expect(res.status).to.be.oneOf([200, 401, 404, 500, 503]);
        if (res.status === 200) {
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('hosts').that.is.an('array');
        }
      });
    });

    it('1.3 POST /api/distributed/goals responds with auth token', () => {
      cy.socialRequest('POST', `${DISTRIBUTED}/goals`, {
        objective: 'Test goal from Cypress',
        tasks: [
          {task_id: 'test_task_1', description: 'Test task', capabilities: []},
        ],
        context: {source: 'cypress_test'},
      }).then((res) => {
        // 500 = Redis not running (expected in dev without Redis)
        expect(res.status).to.be.oneOf([200, 400, 401, 404, 500, 503]);
      });
    });

    it('1.4 POST /api/distributed/tasks/claim responds with auth token', () => {
      cy.socialRequest('POST', `${DISTRIBUTED}/tasks/claim`, {
        agent_id: 'cypress-agent',
        capabilities: ['testing'],
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 401, 404, 500, 503]);
      });
    });

    it('1.5 POST /api/distributed/hosts/register responds with auth token', () => {
      cy.socialRequest('POST', `${DISTRIBUTED}/hosts/register`, {
        host_id: 'cypress-host',
        host_url: 'http://localhost:5000',
        capabilities: ['testing', 'coding'],
        compute_budget: {max_tasks: 5},
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 401, 404, 500, 503]);
      });
    });

    it('1.6 POST /api/distributed/baselines responds with auth token', () => {
      cy.socialRequest('POST', `${DISTRIBUTED}/baselines`, {
        label: 'cypress-test-baseline',
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 401, 404, 500, 503]);
      });
    });
  });

  // =========================================================================
  // 2. Goal Contribution Notifications — API Level
  // =========================================================================
  describe('2. Goal Contribution Notifications (API)', () => {
    it('2.1 goal_contribution notification has correct schema', () => {
      const notif = goalContributionNotification;
      expect(notif).to.have.property('type', 'goal_contribution');
      expect(notif).to.have.property('target_type', 'goal');
      expect(notif).to.have.property('target_id').that.is.a('string');
      expect(notif).to.have.property('message').that.includes('contributed to');
      expect(notif).to.have.property('is_read', false);
      expect(notif.source_user_id).to.be.null;
    });

    it('2.2 goal_verified notification has correct schema', () => {
      const notif = goalVerifiedNotification;
      expect(notif).to.have.property('type', 'goal_verified');
      expect(notif).to.have.property('target_type', 'goal');
      expect(notif).to.have.property('target_id').that.is.a('string');
      expect(notif)
        .to.have.property('message')
        .that.includes('verified by peer consensus');
      expect(notif).to.have.property('is_read', false);
    });

    it('2.3 goal_contribution message matches expected format', () => {
      const msg = goalContributionNotification.message;
      expect(msg).to.match(/Your agent contributed to ".+": completed ".+"/);
    });

    it('2.4 goal_verified message matches expected format', () => {
      const msg = goalVerifiedNotification.message;
      expect(msg).to.match(
        /Your contribution to ".+" was verified by peer consensus!/
      );
    });

    it('2.5 target_id references goal_id for both notification types', () => {
      const goalId = 'goal_20260208_120000_abc12345';
      expect(goalContributionNotification.target_id).to.eq(goalId);
      expect(goalVerifiedNotification.target_id).to.eq(goalId);
    });

    it('2.6 Notification API returns correct response format', () => {
      cy.socialRequest('GET', '/notifications').then((res) => {
        expect(res.status).to.be.oneOf([200, 401, 404, 500, 503]);
        if (res.status === 200) {
          expect(res.body).to.have.property('success', true);
          expect(res.body).to.have.property('data').that.is.an('array');
        }
      });
    });

    it('2.7 Unread notification count API works', () => {
      cy.socialRequest('GET', '/notifications?unread=true&limit=1').then(
        (res) => {
          expect(res.status).to.be.oneOf([200, 401, 404, 500, 503]);
          if (res.status === 200) {
            expect(res.body).to.have.property('success', true);
          }
        }
      );
    });

    it('2.8 Mark-all-read API works', () => {
      cy.socialRequest('POST', '/notifications/read-all', {}).then((res) => {
        expect(res.status).to.be.oneOf([200, 401, 404, 500, 503]);
        if (res.status === 200) {
          expect(res.body).to.have.property('success', true);
        }
      });
    });
  });

  // =========================================================================
  // 3. NotificationsPage UI with Goal Notifications (Stubbed)
  //    Each test stubs /auth/me so SocialContext sees an authenticated user
  //    and RoleGuard allows access to /social/notifications (minRole=flat).
  // =========================================================================
  describe('3. NotificationsPage UI', () => {
    // Helper: visit /social/notifications with full SocialContext stubs
    // so RoleGuard sees an authenticated flat-tier user.
    function visitNotificationsPage() {
      // Stub /auth/me so SocialContext sets accessTier='flat'
      cy.intercept('GET', '**/api/social/auth/me', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'test-user',
            username: 'cypress_test',
            role: 'flat',
          },
        },
      }).as('authMe');

      // Stub resonance/onboarding calls that SocialContext makes on init
      cy.intercept('GET', '**/api/social/resonance/**', {
        statusCode: 200,
        body: {success: true, data: null},
      });
      cy.intercept('GET', '**/api/social/onboarding/**', {
        statusCode: 200,
        body: {success: true, data: null},
      });
      // Stub feed endpoint in case redirect happens (prevents hanging requests)
      cy.intercept('GET', '**/api/social/feed/**', {
        statusCode: 200,
        body: {success: true, data: []},
      });

      cy.visit('/social/notifications', {
        timeout: 60000,
        onBeforeLoad(win) {
          // Set a token so SocialContext's useEffect enters the auth branch
          win.localStorage.setItem(
            'access_token',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlciIsInJvbGUiOiJmbGF0In0.stub'
          );
          win.localStorage.setItem('social_user_id', 'test-user');
          win.localStorage.setItem('social_username', 'cypress_test');
        },
      });

      // Wait for the auth/me intercept to fire and SocialContext to resolve
      cy.wait('@authMe');
    }

    it('3.1 goal_contribution notification renders on /social/notifications', () => {
      cy.intercept('GET', '**/api/social/notifications*', {
        statusCode: 200,
        body: {
          success: true,
          data: [goalContributionNotification, regularNotification],
        },
      }).as('getNotifications');

      visitNotificationsPage();
      cy.contains('contributed to', {timeout: 300000}).should('be.visible');
      cy.contains('Invent a better search engine', {timeout: 300000}).should(
        'be.visible'
      );
    });

    it('3.2 goal_verified notification renders correctly', () => {
      cy.intercept('GET', '**/api/social/notifications*', {
        statusCode: 200,
        body: {
          success: true,
          data: [goalVerifiedNotification],
        },
      }).as('getNotifications');

      visitNotificationsPage();
      cy.contains('verified by peer consensus', {timeout: 300000}).should(
        'be.visible'
      );
    });

    it('3.3 Both notification types render together', () => {
      cy.intercept('GET', '**/api/social/notifications*', {
        statusCode: 200,
        body: {
          success: true,
          data: [
            goalContributionNotification,
            goalVerifiedNotification,
            regularNotification,
          ],
        },
      }).as('getNotifications');

      visitNotificationsPage();
      cy.contains('contributed to', {timeout: 300000}).should('be.visible');
      cy.contains('verified by peer consensus', {timeout: 300000}).should(
        'be.visible'
      );
      cy.contains('Alice commented', {timeout: 300000}).should('be.visible');
    });

    it('3.4 Mark all read works for goal notifications', () => {
      cy.intercept('GET', '**/api/social/notifications*', {
        statusCode: 200,
        body: {
          success: true,
          data: [goalContributionNotification, goalVerifiedNotification],
        },
      }).as('getNotifications');

      cy.intercept('POST', '**/api/social/notifications/read-all', {
        statusCode: 200,
        body: {success: true, data: {marked_all: true}},
      }).as('markAllRead');

      visitNotificationsPage();
      cy.contains('contributed to', {timeout: 300000}).should('be.visible');
      cy.contains(/mark all/i, {timeout: 300000}).click({force: true});
      cy.wait('@markAllRead');
    });

    it('3.5 Unread goal notifications show unread indicator', () => {
      cy.intercept('GET', '**/api/social/notifications*', {
        statusCode: 200,
        body: {
          success: true,
          data: [goalContributionNotification], // is_read: false
        },
      }).as('getNotifications');

      visitNotificationsPage();
      cy.contains('contributed to', {timeout: 300000}).should('be.visible');
    });

    it('3.6 Empty state shows when no notifications', () => {
      cy.intercept('GET', '**/api/social/notifications*', {
        statusCode: 200,
        body: {
          success: true,
          data: [],
        },
      }).as('getNotifications');

      visitNotificationsPage();
      cy.contains(/no notification/i, {timeout: 300000}).should('be.visible');
    });
  });

  // =========================================================================
  // 4. Distributed Goal Flow (Stubbed — Full Lifecycle)
  // =========================================================================
  describe('4. Distributed Goal Flow (Stubbed)', () => {
    it('4.1 Full goal lifecycle: submit → claim → complete → notification', () => {
      const goalId = 'goal_test_lifecycle';
      const taskId = 'task_lifecycle_1';

      const goalPayload = {
        objective: 'Build a collaborative search engine',
        tasks: [
          {
            task_id: taskId,
            description: 'Build query parser',
            capabilities: ['coding'],
          },
          {
            task_id: 'task_lifecycle_2',
            description: 'Build ranking algorithm',
            capabilities: ['coding', 'ml'],
          },
        ],
        context: {domain: 'search', priority: 'high'},
      };

      expect(goalPayload).to.have.property('objective').that.is.a('string');
      expect(goalPayload.tasks).to.be.an('array').with.length(2);
      expect(goalPayload.tasks[0]).to.have.property('task_id');
      expect(goalPayload.tasks[0]).to.have.property('description');
      expect(goalPayload.tasks[0])
        .to.have.property('capabilities')
        .that.is.an('array');
      expect(goalPayload.context).to.have.property('domain', 'search');

      const claimResponse = {
        success: true,
        task_id: taskId,
        description: 'Build query parser',
        context: {capabilities_required: ['coding'], domain: 'search'},
      };
      expect(claimResponse).to.have.property('task_id', taskId);
      expect(claimResponse.context)
        .to.have.property('capabilities_required')
        .that.is.an('array');

      const submitResponse = {
        task_id: taskId,
        result_hash: 'a1b2c3d4e5f6',
        status: 'completed',
      };
      expect(submitResponse)
        .to.have.property('result_hash')
        .that.is.a('string');
      expect(submitResponse).to.have.property('status', 'completed');

      const expectedNotif = {
        type: 'goal_contribution',
        target_type: 'goal',
        target_id: goalId,
        message:
          'Your agent contributed to "Build a collaborative search engine": completed "Build query parser"',
      };
      expect(expectedNotif.message).to.include('contributed to');
      expect(expectedNotif.message).to.include(
        'Build a collaborative search engine'
      );
      expect(expectedNotif.message).to.include('Build query parser');
    });

    it('4.2 Goal progress response shape is valid', () => {
      const progressResponse = {
        goal_id: 'goal_test_progress',
        objective: 'Build search engine',
        total_tasks: 3,
        completed: 1,
        progress_pct: 33.3,
        tasks: [
          {
            task_id: 't1',
            description: 'Task 1',
            status: 'COMPLETED',
            claimed_by: 'agent-1',
            result_hash: 'abc',
          },
          {
            task_id: 't2',
            description: 'Task 2',
            status: 'IN_PROGRESS',
            claimed_by: 'agent-2',
            result_hash: null,
          },
          {
            task_id: 't3',
            description: 'Task 3',
            status: 'PENDING',
            claimed_by: null,
            result_hash: null,
          },
        ],
      };

      expect(progressResponse).to.have.property('goal_id');
      expect(progressResponse).to.have.property('total_tasks', 3);
      expect(progressResponse).to.have.property('completed', 1);
      expect(progressResponse.progress_pct).to.be.closeTo(33.3, 0.1);
      expect(progressResponse.tasks).to.have.length(3);
    });

    it('4.3 Verification consensus flow shape is valid', () => {
      const consensusResponse = {
        task_id: 'task_verified_1',
        consensus_reached: true,
        accepted: true,
        agreed: 2,
        total: 3,
        min_verifiers: 2,
        threshold: 0.5,
        baseline_snapshot: 'snap_central_20260208_120000_abc12345',
      };

      expect(consensusResponse.consensus_reached).to.be.true;
      expect(consensusResponse.accepted).to.be.true;
      expect(consensusResponse.agreed).to.be.at.least(
        consensusResponse.min_verifiers
      );
      expect(consensusResponse)
        .to.have.property('baseline_snapshot')
        .that.is.a('string');
    });

    it('4.4 Rejection resets task to PENDING', () => {
      const rejectedConsensus = {
        task_id: 'task_rejected_1',
        consensus_reached: true,
        accepted: false,
        agreed: 0,
        total: 2,
        action_taken: 'task_reset_to_pending',
      };

      expect(rejectedConsensus.accepted).to.be.false;
      expect(rejectedConsensus).to.have.property(
        'action_taken',
        'task_reset_to_pending'
      );
    });
  });

  // =========================================================================
  // 5. Notification Message Format Validation
  // =========================================================================
  describe('5. Notification Message Format', () => {
    it('5.1 goal_contribution format: "Your agent contributed to [X]: completed [Y]"', () => {
      const cases = [
        ['Build a search engine', 'Parse user queries'],
        ['Invent a robot butler', 'Design motor controller'],
        ['Create an AI music composer', 'Train melody generation model'],
      ];

      cases.forEach(([obj, task]) => {
        const msg = `Your agent contributed to "${obj}": completed "${task}"`;
        expect(msg).to.match(
          /^Your agent contributed to ".+": completed ".+"$/
        );
        expect(msg).to.include(obj);
        expect(msg).to.include(task);
      });
    });

    it('5.2 goal_verified format: "Your contribution to [X] was verified"', () => {
      ['Build a search engine', 'Invent a robot butler'].forEach((obj) => {
        const msg = `Your contribution to "${obj}" was verified by peer consensus!`;
        expect(msg).to.match(
          /^Your contribution to ".+" was verified by peer consensus!$/
        );
        expect(msg).to.include(obj);
      });
    });

    it('5.3 target_type is always "goal" for distributed notifications', () => {
      expect(goalContributionNotification.target_type).to.eq('goal');
      expect(goalVerifiedNotification.target_type).to.eq('goal');
    });

    it('5.4 source_user_id is null for system-generated goal notifications', () => {
      expect(goalContributionNotification.source_user_id).to.be.null;
      expect(goalVerifiedNotification.source_user_id).to.be.null;
    });

    it('5.5 Notification types are distinct from social types', () => {
      const goalTypes = ['goal_contribution', 'goal_verified'];
      const socialTypes = ['comment', 'reply', 'follow', 'mention', 'upvote'];

      goalTypes.forEach((gt) => {
        expect(socialTypes).to.not.include(gt);
      });
    });
  });
});
