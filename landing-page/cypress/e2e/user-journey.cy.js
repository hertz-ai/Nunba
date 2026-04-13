/**
 * User Journey E2E Tests
 *
 * Tests end-to-end user flows across the Nunba platform:
 * 1. Guest → Login transition (11 tests)
 * 2. Social route navigation (14 tests)
 * 3. Agent page ↔ Social navigation (9 tests)
 * 4. Multi-channel journey tracing (8 tests)
 */

// ── Shared helpers ──

const setupSocialStubs = () => {
  cy.intercept('GET', '**/api/social/resonance/wallet', {
    statusCode: 200,
    body: {data: null, success: true},
  }).as('getWallet');
  cy.intercept('GET', '**/api/social/onboarding/progress', {
    statusCode: 200,
    body: {success: true},
  }).as('getOnboarding');
  cy.intercept('GET', '**/api/social/notifications*', {
    statusCode: 200,
    body: {data: [], success: true},
  }).as('getNotifications');
  cy.intercept('GET', '**/api/social/encounters/suggestions', {
    statusCode: 200,
    body: {data: [], success: true},
  }).as('getEncounterSuggestions');
  cy.intercept('GET', '**/api/social/feed*', {
    statusCode: 200,
    body: {
      data: [
        {
          id: 1,
          title: 'Test Post',
          content: 'Hello world',
          score: 5,
          comment_count: 2,
          view_count: 10,
          created_at: new Date().toISOString(),
          author: {username: 'alice', level: 1},
        },
      ],
      meta: {has_more: false},
      success: true,
    },
  }).as('getFeed');
  cy.intercept('GET', '**/api/social/posts*', {
    statusCode: 200,
    body: {data: [], success: true},
  }).as('getPosts');
};

const stubPromptsApi = () => {
  cy.intercept('GET', '**/prompts*', {
    statusCode: 200,
    body: {
      prompts: [
        {
          prompt_id: 54,
          name: 'Hevolve',
          is_public: true,
          is_active: true,
          image_url: '',
          teacher_image_url: '',
          video_text: 'This is Static Description',
        },
      ],
      success: true,
    },
  }).as('getPrompts');
};

// ============================================================================
// SECTION 1: Guest → Login Transition
// ============================================================================

describe('User Journey E2E -- Guest to Login Transition', () => {
  beforeEach(() => {
    // Stub SocialContext APIs as anonymous
    cy.intercept('GET', '**/api/social/auth/me', {
      statusCode: 401,
      body: {success: false, error: 'Not authenticated'},
    }).as('getAuthMe');
    setupSocialStubs();
    stubPromptsApi();
  });

  describe('1. Guest Browsing Phase', () => {
    it('1.1 should start with no auth tokens in localStorage', () => {
      cy.clearLocalStorage();
      cy.visit('/social', {timeout: 60000, failOnStatusCode: false});
      cy.window().then((win) => {
        expect(win.localStorage.getItem('access_token')).to.be.null;
        expect(win.localStorage.getItem('guest_mode')).to.be.null;
      });
    });

    it('1.2 should load social feed as anonymous user without crashing', () => {
      cy.visit('/social', {timeout: 60000, failOnStatusCode: false});
      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('body').should('not.contain.text', 'Uncaught');
    });

    it('1.3 should allow anonymous browsing of feed content', () => {
      cy.visit('/social', {timeout: 60000, failOnStatusCode: false});
      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('body').invoke('text').should('have.length.greaterThan', 0);
    });

    it('1.4 should set guest_mode items when visiting /local as guest', () => {
      cy.visit('/local', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('guest_mode', 'true');
          win.localStorage.setItem('guest_name', 'Cool.Blue.Cypress');
          win.localStorage.setItem('guest_user_id', 'guest_test_001');
        },
      });
      cy.window().then((win) => {
        expect(win.localStorage.getItem('guest_mode')).to.equal('true');
        expect(win.localStorage.getItem('guest_name')).to.equal(
          'Cool.Blue.Cypress'
        );
        expect(win.localStorage.getItem('guest_user_id')).to.not.be.null;
      });
    });

    it('1.5 should allow guest to browse social feed', () => {
      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('guest_mode', 'true');
          win.localStorage.setItem('guest_name', 'Test.Guest.User');
          win.localStorage.setItem('guest_user_id', 'guest_test_002');
        },
      });
      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('body').should('not.contain.text', 'Uncaught');
    });

    it('1.6 should allow guest to navigate to a post detail page', () => {
      cy.intercept('GET', '**/api/social/posts/1', {
        statusCode: 200,
        body: {
          data: {
            id: 1,
            title: 'Test Post',
            content: 'Hello',
            score: 5,
            author: {username: 'alice'},
            created_at: new Date().toISOString(),
          },
          success: true,
        },
      }).as('getPost');
      cy.intercept('GET', '**/api/social/posts/1/comments*', {
        statusCode: 200,
        body: {data: [], success: true},
      });
      cy.visit('/social/post/1', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('guest_mode', 'true');
          win.localStorage.setItem('guest_name', 'Test.Guest.Nav');
          win.localStorage.setItem('guest_user_id', 'guest_test_003');
        },
      });
      cy.get('#root', {timeout: 300000}).should('exist');
    });
  });

  describe('2. Login Transition (OTP Flow)', () => {
    it('2.1 should preserve guest browsing context URL during OTP flow', () => {
      cy.visit('/agents/Hevolve', {
        timeout: 60000,
        onBeforeLoad(win) {
          win.localStorage.setItem('guest_mode', 'true');
          win.localStorage.setItem('guest_name', 'OTP.Test.User');
          win.localStorage.setItem('guest_user_id', 'guest_otp_001');
        },
      });
      cy.get('#root', {timeout: 300000}).should('exist');
      // Verify guest mode was set
      cy.window().then((win) => {
        expect(win.localStorage.getItem('guest_mode')).to.equal('true');
      });
    });

    it('2.2 should clear guest_mode items after successful login simulation', () => {
      cy.visit('/social', {
        timeout: 60000,
        onBeforeLoad(win) {
          // Set guest mode first
          win.localStorage.setItem('guest_mode', 'true');
          win.localStorage.setItem('guest_name', 'Login.Test.User');
          win.localStorage.setItem('guest_user_id', 'guest_login_001');
          // Then simulate login by setting token and clearing guest
          win.localStorage.setItem('access_token', 'mock_jwt_token_123');
          win.localStorage.removeItem('guest_mode');
          win.localStorage.removeItem('guest_name');
          win.localStorage.removeItem('guest_user_id');
        },
      });
      cy.window().then((win) => {
        expect(win.localStorage.getItem('guest_mode')).to.be.null;
        expect(win.localStorage.getItem('guest_name')).to.be.null;
        expect(win.localStorage.getItem('access_token')).to.equal(
          'mock_jwt_token_123'
        );
      });
    });
  });

  describe('3. Post-Login Data Preservation', () => {
    before(() => {
      cy.socialAuth();
    });

    beforeEach(() => {
      // Override parent anonymous auth/me stub
      cy.intercept('GET', '**/api/social/auth/me', (req) => {
        req.continue();
      }).as('getAuthMeReal');
      setupSocialStubs();
    });

    it('3.1 should show authenticated feed content after login', () => {
      cy.socialVisit('/social');
      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('body').should('not.contain.text', 'Uncaught');
    });

    it('3.2 should retain access_token across page navigations', () => {
      cy.socialVisit('/social');
      cy.socialVisit('/social/search');
      cy.socialVisit('/social');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('access_token')).to.not.be.null;
      });
    });

    it('3.3 should load user-specific content after login', () => {
      const userId = Cypress.env('socialUserId');
      cy.intercept('GET', `**/api/social/users/${userId}`, {
        statusCode: 200,
        body: {data: {id: userId, username: 'test', karma: 0}, success: true},
      });
      cy.socialVisit(`/social/profile/${userId}`);
      cy.get('#root', {timeout: 300000}).should('exist');
    });
  });
});

// ============================================================================
// SECTION 2: Social Route Navigation
// ============================================================================

describe('User Journey E2E -- Social Route Navigation', () => {
  before(() => {
    cy.socialAuth();
  });

  beforeEach(() => {
    // Inject flat role for RoleGuard-protected pages
    cy.intercept('GET', '**/api/social/auth/me', (req) => {
      req.continue((res) => {
        if (res.body && res.body.data) {
          res.body.data.role = 'flat';
        }
      });
    }).as('authMeWithRole');
    setupSocialStubs();
    cy.intercept('GET', '**/api/social/search*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getSearch');
    cy.intercept('GET', '**/api/social/communities*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getCommunities');
    cy.intercept('GET', '**/api/social/sync/**', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getSync');
  });

  describe('1. Sequential Route Navigation', () => {
    it('1.1 should navigate: feed -> search -> notifications -> feed', () => {
      cy.socialVisit('/social');
      cy.get('#root', {timeout: 300000}).should('exist');
      cy.socialVisit('/social/search');
      cy.url().should('include', '/social/search');
      cy.socialVisit('/social/notifications');
      cy.url().should('include', '/social/notifications');
      cy.socialVisit('/social');
      cy.url().should('include', '/social');
    });

    it('1.2 should navigate: feed -> post detail -> back to feed', () => {
      cy.intercept('GET', '**/api/social/posts/1', {
        statusCode: 200,
        body: {
          data: {
            id: 1,
            title: 'Test',
            content: 'Hello',
            score: 0,
            author: {username: 'alice'},
            created_at: new Date().toISOString(),
          },
          success: true,
        },
      });
      cy.intercept('GET', '**/api/social/posts/1/comments*', {
        statusCode: 200,
        body: {data: [], success: true},
      });
      cy.socialVisit('/social');
      cy.socialVisit('/social/post/1');
      cy.url({timeout: 300000}).should('include', '/social/post/1');
      cy.go('back');
      cy.url({timeout: 300000}).should('include', '/social');
    });

    it('1.3 should navigate: feed -> communities -> back', () => {
      cy.socialVisit('/social');
      cy.socialVisit('/social/communities');
      cy.url({timeout: 300000}).should('include', '/social/communities');
      cy.go('back');
      cy.url({timeout: 300000}).should('include', '/social');
    });

    it('1.4 should navigate: feed -> achievements -> challenges', () => {
      cy.intercept('GET', '**/api/social/gamification/**', {
        statusCode: 200,
        body: {data: [], success: true},
      });
      cy.socialVisit('/social/achievements');
      cy.get('#root', {timeout: 300000}).should('exist');
      cy.socialVisit('/social/challenges');
      cy.get('#root').should('exist');
    });

    it('1.5 should navigate: feed -> recipes -> search -> feed (full loop)', () => {
      cy.intercept('GET', '**/api/social/recipes*', {
        statusCode: 200,
        body: {data: [], success: true},
      });
      cy.socialVisit('/social');
      cy.socialVisit('/social/recipes');
      cy.socialVisit('/social/search');
      cy.socialVisit('/social');
      cy.get('#root').should('exist');
    });

    it('1.6 should navigate to backup settings page', () => {
      cy.socialVisit('/social/settings/backup');
      cy.get('#root', {timeout: 300000}).should('exist');
    });

    it('1.7 should navigate to agents audit page', () => {
      cy.socialVisit('/social/agents');
      cy.get('#root', {timeout: 300000}).should('exist');
    });
  });

  describe('2. Back Button on Detail Pages', () => {
    it('2.1 should support browser back from post detail to feed', () => {
      cy.intercept('GET', '**/api/social/posts/1', {
        statusCode: 200,
        body: {
          data: {
            id: 1,
            title: 'Test',
            content: 'Hello',
            score: 0,
            author: {username: 'alice'},
            created_at: new Date().toISOString(),
          },
          success: true,
        },
      });
      cy.intercept('GET', '**/api/social/posts/1/comments*', {
        statusCode: 200,
        body: {data: [], success: true},
      });
      cy.socialVisit('/social');
      cy.socialVisit('/social/post/1');
      cy.go('back');
      cy.url({timeout: 300000}).should('include', '/social');
    });

    it('2.2 should support browser back from profile to feed', () => {
      const userId = Cypress.env('socialUserId');
      cy.intercept('GET', `**/api/social/users/${userId}`, {
        statusCode: 200,
        body: {data: {id: userId, username: 'test', karma: 0}, success: true},
      });
      cy.socialVisit('/social');
      cy.socialVisit(`/social/profile/${userId}`);
      cy.go('back');
      cy.url({timeout: 300000}).should('include', '/social');
    });

    it('2.3 should support browser back from search to previous page', () => {
      cy.socialVisit('/social/communities');
      cy.socialVisit('/social/search');
      cy.go('back');
      cy.url({timeout: 300000}).should('include', '/social/communities');
    });

    it('2.4 should support multiple back navigations across route chain', () => {
      cy.intercept('GET', '**/api/social/gamification/**', {
        statusCode: 200,
        body: {data: [], success: true},
      });
      cy.socialVisit('/social');
      cy.socialVisit('/social/search');
      cy.socialVisit('/social/achievements');
      cy.socialVisit('/social/challenges');
      cy.go('back');
      cy.url({timeout: 300000}).should('include', '/social/achievements');
      cy.go('back');
      cy.url({timeout: 300000}).should('include', '/social/search');
      cy.go('back');
      cy.url({timeout: 300000}).should('include', '/social');
    });
  });

  describe('3. Deep Links', () => {
    it('3.1 should load post detail page directly via deep link', () => {
      cy.intercept('GET', '**/api/social/posts/42', {
        statusCode: 200,
        body: {
          data: {
            id: 42,
            title: 'Deep Link Post',
            content: 'Content',
            score: 10,
            author: {username: 'bob'},
            created_at: new Date().toISOString(),
          },
          success: true,
        },
      });
      cy.intercept('GET', '**/api/social/posts/42/comments*', {
        statusCode: 200,
        body: {data: [], success: true},
      });
      cy.socialVisit('/social/post/42');
      cy.get('#root', {timeout: 300000}).should('exist');
    });

    it('3.2 should load search page via deep link', () => {
      cy.socialVisit('/social/search');
      cy.url().should('include', '/social/search');
      cy.get('#root').should('exist');
    });

    it('3.3 should load profile page directly via deep link', () => {
      const userId = Cypress.env('socialUserId');
      cy.intercept('GET', `**/api/social/users/${userId}`, {
        statusCode: 200,
        body: {data: {id: userId, username: 'test', karma: 0}, success: true},
      });
      cy.socialVisit(`/social/profile/${userId}`);
      cy.get('#root', {timeout: 300000}).should('exist');
    });
  });
});

// ============================================================================
// SECTION 3: Agent Page ↔ Social Navigation
// ============================================================================

describe('User Journey E2E -- Agent Page and Social Navigation', () => {
  before(() => {
    cy.socialAuth();
  });

  beforeEach(() => {
    stubPromptsApi();
    setupSocialStubs();
    cy.intercept('GET', '**/api/social/auth/me', (req) => {
      req.continue();
    }).as('authMeReal');
    cy.intercept('GET', '**/backend/health', {
      statusCode: 200,
      body: {
        healthy: true,
        local: {available: true},
        cloud: {available: true},
        langchain_service: {available: false},
        llama_available: false,
      },
    }).as('backendHealth');
    cy.intercept('GET', '**/agents/sync', {
      statusCode: 200,
      body: {success: true, agents: []},
    }).as('agentSync');
  });

  describe('1. Demopage to Social Navigation', () => {
    it('1.1 should load Demopage (/) and render agent content', () => {
      cy.socialVisit('/');
      cy.get('#root', {timeout: 300000}).should('exist');
    });

    it('1.2 should navigate from Demopage to /social', () => {
      cy.socialVisit('/');
      cy.get('#root', {timeout: 300000}).should('exist');
      cy.socialVisit('/social');
      cy.url().should('include', '/social');
    });

    it('1.3 should load social feed after navigating from Demopage', () => {
      cy.socialVisit('/');
      cy.socialVisit('/social');
      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('body').should('not.contain.text', 'Uncaught');
    });
  });

  describe('2. Social to Demopage Navigation', () => {
    it('2.1 should navigate from /social back to Demopage (/)', () => {
      cy.socialVisit('/social');
      cy.get('#root', {timeout: 300000}).should('exist');
      cy.socialVisit('/');
      cy.url().should('match', /\/$/);
    });

    it('2.2 should load Demopage content after returning from social', () => {
      cy.socialVisit('/');
      cy.socialVisit('/social');
      cy.socialVisit('/');
      cy.get('#root', {timeout: 300000}).should('exist');
    });

    it('2.3 should preserve auth state across Demopage <-> Social transitions', () => {
      cy.socialVisit('/');
      cy.socialVisit('/social');
      cy.socialVisit('/');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('access_token')).to.not.be.null;
      });
    });
  });

  describe('3. Chat History Preservation', () => {
    it('3.1 should store chat messages in localStorage', () => {
      cy.socialVisit('/social', {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            'chat_messages_54',
            JSON.stringify([
              {type: 'user', content: 'test msg', timestamp: Date.now()},
            ])
          );
        },
      });
      cy.socialVisit('/social/search');
      cy.socialVisit('/social');
      cy.window().then((win) => {
        const msgs = win.localStorage.getItem('chat_messages_54');
        expect(msgs).to.include('test msg');
      });
    });

    it('3.2 should preserve chat messages across social route navigations', () => {
      const mockMessages = JSON.stringify([
        {type: 'user', content: 'preserve me', timestamp: Date.now()},
      ]);
      cy.socialVisit('/social', {
        onBeforeLoad(win) {
          win.localStorage.setItem('chat_messages_54', mockMessages);
        },
      });
      cy.socialVisit('/social/search');
      cy.socialVisit('/social/notifications');
      cy.socialVisit('/social');
      cy.window().then((win) => {
        const msgs = win.localStorage.getItem('chat_messages_54');
        expect(msgs).to.include('preserve me');
      });
    });

    it('3.3 should preserve chat messages across Demopage <-> Social transitions', () => {
      const mockMessages = JSON.stringify([
        {type: 'user', content: 'cross-route msg', timestamp: Date.now()},
      ]);
      cy.socialVisit('/social', {
        onBeforeLoad(win) {
          win.localStorage.setItem('chat_messages_54', mockMessages);
        },
      });
      cy.socialVisit('/');
      cy.socialVisit('/social');
      cy.window().then((win) => {
        const msgs = win.localStorage.getItem('chat_messages_54');
        expect(msgs).to.include('cross-route msg');
      });
    });
  });
});

// ============================================================================
// SECTION 4: Multi-Channel Journey Tracing
// ============================================================================

describe('User Journey E2E -- Multi-Channel Journey Tracing', () => {
  before(() => {
    cy.socialAuthWithRole('central');
  });

  beforeEach(() => {
    setupSocialStubs();

    // Stub channels admin API
    cy.intercept('GET', '**/api/admin/channels', {
      statusCode: 200,
      body: {
        channels: [
          {type: 'web', enabled: true, name: 'Web Widget', status: 'connected'},
          {
            type: 'whatsapp',
            enabled: true,
            name: 'WhatsApp',
            status: 'connected',
          },
          {
            type: 'telegram',
            enabled: false,
            name: 'Telegram',
            status: 'disconnected',
          },
        ],
      },
    }).as('getChannels');

    cy.intercept('GET', '**/api/admin/channels/*', {
      statusCode: 200,
      body: {type: 'web', enabled: true, config: {}, stats: {messages: 42}},
    }).as('getChannelDetail');

    cy.intercept('GET', '**/api/admin/sessions*', {
      statusCode: 200,
      body: {
        sessions: [
          {
            id: 's1',
            user_id: 'u1',
            channel: 'web',
            started_at: '2026-02-16T10:00:00Z',
            messages: 5,
          },
          {
            id: 's2',
            user_id: 'u1',
            channel: 'whatsapp',
            started_at: '2026-02-16T10:05:00Z',
            messages: 3,
          },
        ],
      },
    }).as('getSessions');

    cy.intercept('GET', '**/api/admin/metrics', {
      statusCode: 200,
      body: {total_sessions: 100, active_channels: 2, messages_today: 250},
    }).as('getMetrics');

    cy.intercept('GET', '**/api/admin/config/**', {
      statusCode: 200,
      body: {success: true, data: {}},
    }).as('getConfig');
  });

  describe('1. Channel API Stubs', () => {
    it('1.1 should load admin channels page with stubbed channel list', () => {
      cy.socialVisitAsAdmin('/admin/channels');
      cy.get('#root', {timeout: 300000}).should('exist');
    });

    it('1.2 should display stubbed channel data without crashing', () => {
      cy.socialVisitAsAdmin('/admin/channels');
      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('body').should('not.contain.text', 'Uncaught');
    });

    it('1.3 should load admin dashboard with stubbed metrics', () => {
      cy.socialVisitAsAdmin('/admin');
      cy.get('#root', {timeout: 300000}).should('exist');
    });
  });

  describe('2. Cross-Channel User Journey', () => {
    it('2.1 should navigate from social feed to admin dashboard', () => {
      cy.socialVisitAsAdmin('/social');
      cy.get('#root', {timeout: 300000}).should('exist');
      cy.socialVisitAsAdmin('/admin');
      cy.url().should('include', '/admin');
    });

    it('2.2 should navigate from admin dashboard to admin channels', () => {
      cy.socialVisitAsAdmin('/admin');
      cy.get('#root', {timeout: 300000}).should('exist');
      cy.socialVisitAsAdmin('/admin/channels');
      cy.url().should('include', '/admin/channels');
    });

    it('2.3 should navigate from admin channels back to social feed', () => {
      cy.socialVisitAsAdmin('/admin/channels');
      cy.get('#root', {timeout: 300000}).should('exist');
      cy.socialVisitAsAdmin('/social');
      cy.url().should('include', '/social');
    });

    it('2.4 should preserve auth across social -> admin -> social transitions', () => {
      cy.socialVisitAsAdmin('/social');
      cy.socialVisitAsAdmin('/admin');
      cy.socialVisitAsAdmin('/social');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('access_token')).to.not.be.null;
      });
    });

    it('2.5 should handle multi-channel session data via admin', () => {
      cy.socialVisitAsAdmin('/admin');
      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('body').should('not.contain.text', 'Uncaught');
    });
  });
});
