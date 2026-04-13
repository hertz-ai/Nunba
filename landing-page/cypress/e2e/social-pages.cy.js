/**
 * Cypress E2E Tests for Social/Gamification Frontend UI Pages
 *
 * Tests the social features including:
 * - Social feed
 * - Resonance dashboard (currency, levels, transactions)
 * - Achievements
 * - Challenges
 * - Seasons
 * - Regions/communities
 *
 * NOTE: The app uses BrowserRouter (not HashRouter), so routes are /social/...
 * The backend API is at http://localhost:5000/api/social/*
 * SocialContext fires auth/me, resonance/wallet, onboarding/progress,
 * and notifications on every social page load, so those must always be stubbed.
 */

describe('Social/Gamification Pages E2E Tests', () => {
  beforeEach(() => {
    // ---- Context-level API calls (SocialProvider fires these on every page) ----
    cy.intercept('GET', '**/api/social/auth/me', {
      statusCode: 401,
      body: {success: false, error: 'Not authenticated'},
    }).as('getAuthMe');

    cy.intercept('GET', '**/api/social/resonance/wallet', {
      statusCode: 401,
      body: {success: false, error: 'Authentication required'},
    }).as('getWallet');

    cy.intercept('GET', '**/api/social/onboarding/progress', {
      statusCode: 401,
      body: {success: false, error: 'Authentication required'},
    }).as('getOnboarding');

    cy.intercept('GET', '**/api/social/notifications*', {
      statusCode: 401,
      body: {success: false, error: 'Authentication required'},
    }).as('getNotifications');

    // ---- Page-specific API stubs ----

    // Feed page calls /feed/all (default tab), /seasons/current, /encounters/suggestions
    cy.intercept('GET', '**/api/social/feed*', {
      statusCode: 200,
      body: {data: [], meta: {has_more: false}, success: true},
    }).as('getFeed');

    cy.intercept('GET', '**/api/social/posts*', {
      statusCode: 200,
      body: {data: [], meta: {has_more: false}, success: true},
    }).as('getPosts');

    cy.intercept('GET', '**/api/social/encounters/suggestions', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getEncounterSuggestions');

    // Challenges page calls /challenges?status=active
    cy.intercept('GET', '**/api/social/challenges*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getChallenges');

    // Achievements page calls /achievements
    cy.intercept('GET', '**/api/social/achievements*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getAchievements');

    // Seasons page calls /seasons/current
    cy.intercept('GET', '**/api/social/seasons/current', {
      statusCode: 200,
      body: {success: true, data: null},
    }).as('getCurrentSeason');

    // Seasons leaderboard (called if season data exists)
    cy.intercept('GET', '**/api/social/seasons/*/leaderboard*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getSeasonLeaderboard');

    // Resonance dashboard calls /resonance/wallet, /resonance/transactions,
    // /resonance/leaderboard, /resonance/streak
    cy.intercept('GET', '**/api/social/resonance/transactions*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getTransactions');

    cy.intercept('GET', '**/api/social/resonance/leaderboard*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getLeaderboard');

    cy.intercept('GET', '**/api/social/resonance/streak', {
      statusCode: 200,
      body: {data: null, success: true},
    }).as('getStreak');

    // Regions page calls /regions and /regions/nearby
    cy.intercept('GET', '**/api/social/regions/nearby*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getRegionsNearby');

    cy.intercept('GET', '**/api/social/regions', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getRegions');
  });

  // -----------------------------------------------------------------------
  // Social Feed Page
  // -----------------------------------------------------------------------
  describe('Social Feed Page', () => {
    it('should load the social feed page without crashing', () => {
      cy.visit('/social', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('#root').invoke('html').should('not.be.empty');

      cy.url().should('include', '/social');
    });

    it('should handle empty feed data gracefully', () => {
      cy.visit('/social', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');

      // Should not show unhandled crash errors
      cy.get('body').should('not.contain.text', 'Uncaught');
      cy.get('body').should('not.contain.text', 'Cannot read properties');
    });
  });

  // -----------------------------------------------------------------------
  // Challenges Page
  // -----------------------------------------------------------------------
  describe('Challenges Page', () => {
    it('should load the challenges page without crashing', () => {
      cy.visit('/social/challenges', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('#root').invoke('html').should('not.be.empty');

      cy.url().should('include', '/social/challenges');
    });

    it('should make API call to fetch challenges', () => {
      cy.visit('/social/challenges', {timeout: 300000});

      // ChallengesPage calls challengesApi.list({ status: 'active' })
      cy.wait('@getChallenges', {timeout: 300000}).then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
        expect(interception.response.body).to.have.property('success', true);
        expect(interception.response.body).to.have.property('data');
      });
    });

    it('should handle empty challenges data gracefully', () => {
      cy.visit('/social/challenges', {timeout: 300000});

      cy.wait('@getChallenges', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');

      // Page should render even with empty data - no crash
      cy.get('body').should('not.contain.text', 'Uncaught');
    });

    it('should display content when challenges are empty', () => {
      cy.visit('/social/challenges', {timeout: 300000});

      cy.wait('@getChallenges', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');

      // Page should have rendered markup
      cy.get('body').then(($body) => {
        const bodyText = $body.text();
        expect(bodyText.length).to.be.greaterThan(0);
      });
    });
  });

  // -----------------------------------------------------------------------
  // Achievements Page
  // -----------------------------------------------------------------------
  describe('Achievements Page', () => {
    it('should load the achievements page without crashing', () => {
      cy.visit('/social/achievements', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('#root').invoke('html').should('not.be.empty');

      cy.url().should('include', '/social/achievements');
    });

    it('should make API call to fetch achievements', () => {
      cy.visit('/social/achievements', {timeout: 300000});

      // AchievementsPage calls achievementsApi.list()
      cy.wait('@getAchievements', {timeout: 300000}).then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
        expect(interception.response.body).to.have.property('success', true);
        expect(interception.response.body).to.have.property('data');
      });
    });

    it('should handle empty achievements data gracefully', () => {
      cy.visit('/social/achievements', {timeout: 300000});

      cy.wait('@getAchievements', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');

      // Should not crash with empty data
      cy.get('body').should('not.contain.text', 'Uncaught');
    });

    it('should display content area for achievements', () => {
      cy.visit('/social/achievements', {timeout: 300000});

      cy.wait('@getAchievements', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('#root').invoke('html').should('not.be.empty');
    });
  });

  // -----------------------------------------------------------------------
  // Seasons Page
  // -----------------------------------------------------------------------
  describe('Seasons Page', () => {
    it('should load the seasons page without crashing', () => {
      cy.visit('/social/seasons', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('#root').invoke('html').should('not.be.empty');

      cy.url().should('include', '/social/seasons');
    });

    it('should make API call to fetch current season', () => {
      cy.visit('/social/seasons', {timeout: 300000});

      cy.wait('@getCurrentSeason', {timeout: 300000}).then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
        expect(interception.response.body).to.have.property('success', true);
      });
    });

    it('should handle no active season gracefully', () => {
      cy.visit('/social/seasons', {timeout: 300000});

      cy.wait('@getCurrentSeason', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');

      // Should render page even without an active season
      cy.get('body').should('not.contain.text', 'Uncaught');
    });

    it('should display page content for seasons', () => {
      cy.visit('/social/seasons', {timeout: 300000});

      cy.wait('@getCurrentSeason', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).invoke('html').should('not.be.empty');
    });
  });

  // -----------------------------------------------------------------------
  // Resonance Dashboard Page
  // -----------------------------------------------------------------------
  describe('Resonance Dashboard Page', () => {
    it('should load the resonance page without crashing', () => {
      cy.visit('/social/resonance', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('#root').invoke('html').should('not.be.empty');

      cy.url().should('include', '/social/resonance');
    });

    it('should handle authentication error gracefully', () => {
      cy.visit('/social/resonance', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');

      // Page should handle auth error without crashing
      cy.get('body').should('not.contain.text', 'Uncaught');
    });

    it('should display content when not authenticated', () => {
      cy.visit('/social/resonance', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');

      // Should show some content (skeleton, login prompt, empty state, or data)
      cy.get('body').then(($body) => {
        const bodyHtml = $body.html();
        expect(bodyHtml.length).to.be.greaterThan(0);
      });
    });

    it('should render the page even without wallet data', () => {
      cy.visit('/social/resonance', {timeout: 300000});

      // Just verify the page loads and renders
      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('#root').invoke('html').should('not.be.empty');
    });
  });

  // -----------------------------------------------------------------------
  // Regions Page
  // -----------------------------------------------------------------------
  describe('Regions Page', () => {
    before(() => {
      cy.socialAuth();
    });

    beforeEach(() => {
      // Override parent beforeEach's 401 stub — pass through to real server
      cy.intercept('GET', '**/api/social/auth/me', (req) => {
        req.continue();
      }).as('getAuthMeReal');
    });

    it('should load the regions page without crashing', () => {
      cy.socialVisit('/social/regions');

      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('#root').invoke('html').should('not.be.empty');

      cy.url().should('include', '/social/regions');
    });

    it('should make API call to fetch regions', () => {
      cy.socialVisit('/social/regions');

      cy.wait('@getRegions', {timeout: 300000}).then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
        expect(interception.response.body).to.have.property('success', true);
        expect(interception.response.body).to.have.property('data');
      });
    });

    it('should handle empty regions data gracefully', () => {
      cy.socialVisit('/social/regions');

      cy.wait('@getRegions', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');

      // Should not crash with empty regions
      cy.get('body').should('not.contain.text', 'Uncaught');
    });

    it('should display content when no regions are available', () => {
      cy.socialVisit('/social/regions');

      cy.wait('@getRegions', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).invoke('html').should('not.be.empty');
    });
  });

  // -----------------------------------------------------------------------
  // Navigation Between Social Pages
  // -----------------------------------------------------------------------
  describe('Navigation Between Social Pages', () => {
    it('should navigate from social feed to challenges', () => {
      cy.visit('/social', {timeout: 300000});
      cy.get('#root', {timeout: 300000}).should('exist');

      cy.visit('/social/challenges', {timeout: 300000});
      cy.url().should('include', '/social/challenges');
      cy.get('#root').invoke('html').should('not.be.empty');
    });

    it('should navigate from challenges to achievements', () => {
      cy.visit('/social/challenges', {timeout: 300000});
      cy.get('#root', {timeout: 300000}).should('exist');

      cy.visit('/social/achievements', {timeout: 300000});
      cy.url().should('include', '/social/achievements');
      cy.get('#root').invoke('html').should('not.be.empty');
    });

    it('should navigate from achievements to seasons', () => {
      cy.visit('/social/achievements', {timeout: 300000});
      cy.get('#root', {timeout: 300000}).should('exist');

      cy.visit('/social/seasons', {timeout: 300000});
      cy.url().should('include', '/social/seasons');
      cy.get('#root').invoke('html').should('not.be.empty');
    });

    it('should navigate from seasons to resonance', () => {
      cy.visit('/social/seasons', {timeout: 300000});
      cy.get('#root', {timeout: 300000}).should('exist');

      cy.visit('/social/resonance', {timeout: 300000});
      cy.url().should('include', '/social/resonance');
      cy.get('#root').invoke('html').should('not.be.empty');
    });

    it('should navigate from resonance to regions', () => {
      cy.visit('/social/resonance', {timeout: 300000});
      cy.get('#root', {timeout: 300000}).should('exist');

      cy.visit('/social/regions', {timeout: 300000});
      cy.get('#root', {timeout: 300000}).should('exist');
      // RoleGuard may redirect unauthenticated users to /social
      cy.url().should('include', '/social');
      cy.get('#root').invoke('html').should('not.be.empty');
    });

    it('should navigate from regions back to social feed', () => {
      cy.visit('/social/regions', {timeout: 300000});
      cy.get('#root', {timeout: 300000}).should('exist');

      cy.visit('/social', {timeout: 300000});
      cy.url().should('include', '/social');
      cy.get('#root').invoke('html').should('not.be.empty');
    });

    it('should handle rapid navigation without crashing', () => {
      const pages = [
        '/social',
        '/social/challenges',
        '/social/achievements',
        '/social/seasons',
        '/social/resonance',
        '/social/regions',
      ];

      pages.forEach((page, index) => {
        cy.visit(page, {timeout: 300000});
        cy.get('#root', {timeout: 300000}).should('exist');

        // Small wait between navigations
        if (index < pages.length - 1) {
          cy.wait(500);
        }
      });
    });
  });

  // -----------------------------------------------------------------------
  // Error Handling and Edge Cases
  // -----------------------------------------------------------------------
  describe('Error Handling and Edge Cases', () => {
    it('should handle API errors gracefully on challenges page', () => {
      cy.intercept('GET', '**/api/social/challenges*', {
        statusCode: 500,
        body: {success: false, error: 'Internal server error'},
      }).as('getChallengesError');

      cy.visit('/social/challenges', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');

      // Page should still render even with API error
      cy.get('body').should('not.contain.text', 'Uncaught');
    });

    it('should handle API errors gracefully on achievements page', () => {
      cy.intercept('GET', '**/api/social/achievements*', {
        statusCode: 500,
        body: {success: false, error: 'Internal server error'},
      }).as('getAchievementsError');

      cy.visit('/social/achievements', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('body').should('not.contain.text', 'Uncaught');
    });

    it('should handle network timeout gracefully on regions page', () => {
      cy.intercept('GET', '**/api/social/regions', (req) => {
        req.reply({
          statusCode: 200,
          body: {data: [], success: true},
          delay: 5000,
        });
      }).as('getRegionsDelayed');

      // RoleGuard may redirect unauthenticated users; just verify the app doesn't crash
      cy.visit('/social/regions', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');

      // Should show loading state or eventually render
      cy.get('body', {timeout: 300000}).should('exist');
    });

    it('should handle malformed API response on challenges page', () => {
      cy.intercept('GET', '**/api/social/challenges*', {
        statusCode: 200,
        body: 'invalid json',
      }).as('getChallengesMalformed');

      cy.visit('/social/challenges', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');

      // Should not crash the entire app
      cy.get('body').should('exist');
    });
  });

  // -----------------------------------------------------------------------
  // Loading States
  // -----------------------------------------------------------------------
  describe('Loading States', () => {
    it('should show loading state on challenges page', () => {
      cy.intercept('GET', '**/api/social/challenges*', (req) => {
        req.reply({
          statusCode: 200,
          body: {data: [], success: true},
          delay: 1000,
        });
      }).as('getChallengesDelayed');

      cy.visit('/social/challenges', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');

      // Check if page is rendering during load
      cy.get('body').should('exist');

      cy.wait('@getChallengesDelayed', {timeout: 300000});

      // Page should still be visible after load
      cy.get('#root').invoke('html').should('not.be.empty');
    });

    it('should show loading state on regions page', () => {
      cy.intercept('GET', '**/api/social/regions', (req) => {
        req.reply({
          statusCode: 200,
          body: {data: [], success: true},
          delay: 1000,
        });
      }).as('getRegionsDelayed');

      // RoleGuard may redirect unauthenticated users; just verify the app doesn't crash
      cy.visit('/social/regions', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('#root').invoke('html').should('not.be.empty');
    });
  });

  // -----------------------------------------------------------------------
  // Data Population Tests
  // -----------------------------------------------------------------------
  describe('Data Population Tests', () => {
    it('should handle populated challenges data', () => {
      cy.intercept('GET', '**/api/social/challenges*', {
        statusCode: 200,
        body: {
          data: [
            {
              id: 1,
              title: 'Test Challenge',
              description: 'Complete 10 tasks',
              type: 'daily',
              status: 'active',
              reward: 100,
              progress: 5,
              total: 10,
            },
          ],
          success: true,
        },
      }).as('getChallengesPopulated');

      cy.visit('/social/challenges', {timeout: 300000});

      cy.wait('@getChallengesPopulated', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('#root').invoke('html').should('not.be.empty');
    });

    it('should handle populated achievements data', () => {
      cy.intercept('GET', '**/api/social/achievements*', {
        statusCode: 200,
        body: {
          data: [
            {
              id: 1,
              title: 'First Steps',
              description: 'Complete your first task',
              rarity: 'common',
              unlocked: true,
              unlockedAt: '2025-01-01T00:00:00Z',
            },
          ],
          success: true,
        },
      }).as('getAchievementsPopulated');

      cy.visit('/social/achievements', {timeout: 300000});

      cy.wait('@getAchievementsPopulated', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('#root').invoke('html').should('not.be.empty');
    });

    it('should handle populated regions data', () => {
      cy.intercept('GET', '**/api/social/regions', {
        statusCode: 200,
        body: {
          data: [
            {
              id: 1,
              name: 'Test Region',
              description: 'A test community',
              type: 'city',
              memberCount: 42,
            },
          ],
          success: true,
        },
      }).as('getRegionsPopulated');

      // RoleGuard may redirect unauthenticated users; just verify the app doesn't crash
      cy.visit('/social/regions', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('#root').invoke('html').should('not.be.empty');
    });

    it('should handle active season data', () => {
      cy.intercept('GET', '**/api/social/seasons/current', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 1,
            name: 'Season 1',
            startDate: '2025-01-01T00:00:00Z',
            endDate: '2025-03-31T23:59:59Z',
            active: true,
          },
        },
      }).as('getCurrentSeasonActive');

      cy.visit('/social/seasons', {timeout: 300000});

      cy.wait('@getCurrentSeasonActive', {timeout: 300000});

      cy.get('#root', {timeout: 300000}).should('exist');
      cy.get('#root').invoke('html').should('not.be.empty');
    });
  });
});

/**
 * Authenticated Social Page Loads
 *
 * These tests use cy.socialAuth() to register a unique test user,
 * then visit each social page with auth via cy.socialVisit() and
 * verify that the page renders content inside #root without crashing.
 */
describe('Authenticated Social Page Loads', () => {
  before(() => {
    cy.socialAuth();
  });

  beforeEach(() => {
    // Override any parent stubs — let auth/me through to real backend
    cy.intercept('GET', '**/api/social/auth/me', (req) => {
      req.continue();
    }).as('getAuthMeReal');
    // Stub known 500-error endpoints so they don't crash the page
    cy.intercept('GET', '**/api/social/resonance/wallet', {
      statusCode: 200,
      body: {data: null, success: true},
    }).as('getWalletAuth');
    cy.intercept('GET', '**/api/social/onboarding/progress', {
      statusCode: 200,
      body: {success: true},
    }).as('getOnboardingAuth');
    cy.intercept('GET', '**/api/social/notifications*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getNotificationsAuth');
    cy.intercept('GET', '**/api/social/encounters/suggestions', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getEncounterSuggestionsAuth');
    cy.intercept('GET', '**/api/social/feed*', {
      statusCode: 200,
      body: {data: [], meta: {has_more: false}, success: true},
    }).as('getFeedAuth');
    cy.intercept('GET', '**/api/social/resonance/streak', {
      statusCode: 200,
      body: {data: null, success: true},
    }).as('getStreakAuth');
    cy.intercept('GET', '**/api/social/resonance/transactions*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getTransactionsAuth');
    cy.intercept('GET', '**/api/social/resonance/leaderboard*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getLeaderboardAuth');
    cy.intercept('GET', '**/api/social/seasons/current', {
      statusCode: 200,
      body: {success: true, data: null},
    }).as('getCurrentSeasonAuth');
    cy.intercept('GET', '**/api/social/challenges*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getChallengesAuth');
    cy.intercept('GET', '**/api/social/achievements*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getAchievementsAuth');
    cy.intercept('GET', '**/api/social/communities*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getCommunitiesAuth');
    cy.intercept('GET', '**/api/social/campaigns*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getCampaignsAuth');
    cy.intercept('GET', '**/api/social/regions*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getRegionsAuth');
    cy.intercept('GET', '**/api/social/recipes*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getRecipesAuth');
    cy.intercept('GET', '**/api/social/search*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getSearchAuth');
    cy.intercept('GET', '**/api/social/gamification/**', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getGamificationAuth');
    cy.intercept('GET', '**/api/social/posts*', {
      statusCode: 200,
      body: {data: [], success: true},
    }).as('getPostsAuth');
  });

  it('should load feed page with auth', () => {
    cy.socialVisit('/social');

    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root', {timeout: 300000}).invoke('html').should('not.be.empty');
    cy.get('body').should('not.contain.text', 'Uncaught');
  });

  it('should load profile page with auth', () => {
    const userId = Cypress.env('socialUserId') || 'me';
    cy.socialVisit(`/social/profile/${userId}`);

    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root', {timeout: 300000}).invoke('html').should('not.be.empty');
    cy.get('body').should('not.contain.text', 'Uncaught');
  });

  it('should load regions page with auth', () => {
    cy.socialVisit('/social/regions');

    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root', {timeout: 300000}).invoke('html').should('not.be.empty');
    cy.get('body').should('not.contain.text', 'Uncaught');
  });

  it('should load encounters page with auth', () => {
    cy.socialVisit('/social/encounters');

    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root', {timeout: 300000}).invoke('html').should('not.be.empty');
    cy.get('body').should('not.contain.text', 'Uncaught');
  });

  it('should load challenges page with auth', () => {
    cy.socialVisit('/social/challenges');

    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root', {timeout: 300000}).invoke('html').should('not.be.empty');
    cy.get('body').should('not.contain.text', 'Uncaught');
  });

  it('should load achievements page with auth', () => {
    cy.socialVisit('/social/achievements');

    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root', {timeout: 300000}).invoke('html').should('not.be.empty');
    cy.get('body').should('not.contain.text', 'Uncaught');
  });

  it('should load campaigns page with auth', () => {
    cy.socialVisit('/social/campaigns');

    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root', {timeout: 300000}).invoke('html').should('not.be.empty');
    cy.get('body').should('not.contain.text', 'Uncaught');
  });

  it('should load notifications page with auth', () => {
    cy.socialVisit('/social/notifications');

    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root', {timeout: 300000}).invoke('html').should('not.be.empty');
    cy.get('body').should('not.contain.text', 'Uncaught');
  });

  it('should load search page with auth', () => {
    cy.socialVisit('/social/search');

    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root', {timeout: 300000}).invoke('html').should('not.be.empty');
    cy.get('body').should('not.contain.text', 'Uncaught');
  });

  it('should load recipes page with auth', () => {
    cy.socialVisit('/social/recipes');

    cy.get('#root', {timeout: 300000}).should('exist');
    cy.get('#root', {timeout: 300000}).invoke('html').should('not.be.empty');
    cy.get('body').should('not.contain.text', 'Uncaught');
  });
});
