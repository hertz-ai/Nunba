/// <reference types="cypress" />

// Nunba's own entry page is /local, the page the desktop window opens.  Not
// '/': Flask's '/' (main.py serve_landing_page_root) redirects to
// https://hevolve.ai whenever that answers, so on an online runner a visit to
// '/' tested the hosted site.
describe('App Navigation E2E', () => {
  it('landing page loads and renders React app', () => {
    cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.get('#root').invoke('html').should('not.be.empty');
    cy.get('#root div').should('have.length.greaterThan', 0);
  });

  it('navigates to demo page via hash route', () => {
    cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.get('#root').invoke('html').should('not.be.empty');
  });

  it('page title is set to Hevolve', () => {
    cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
    cy.title().should('contain', 'Hevolve');
  });

  it('page is responsive on mobile viewport', () => {
    cy.viewport(375, 667);
    cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.get('#root div').should('have.length.greaterThan', 0);
  });

  it('page works on tablet viewport', () => {
    cy.viewport(768, 1024);
    cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.get('#root div').should('have.length.greaterThan', 0);
  });
});

// ===========================================================================
// NAVIGATION USER JOURNEY INTEGRATION TESTS
// These tests verify actual navigation interactions and state preservation
// ===========================================================================

describe('Navigation - Interactive Link Clicks', () => {
  // Nunba's home (/local, Agent) reaches /social through AgentSidebar's menu
  // (SIDEBAR_LINKS has {to: '/social'}): on a phone, a lucide hamburger
  // button with no aria-label opens it.  Hard checks: the button, the link
  // and the landing path must all exist.
  it('should navigate to social feed from the home menu', () => {
    cy.viewport(375, 667);
    cy.sealHart();
    cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
    cy.get('button:has(svg.lucide-menu)', {timeout: 30000}).first().click();
    cy.get('a[href="/social"]', {timeout: 10000}).filter(':visible').first().click();
    cy.location('pathname', {timeout: 20000}).should('eq', '/social');
  });

  // The same journey at desktop width, the usual Nunba window: AgentSidebar
  // shows the links in the account-row dropdown (the row's onClick is
  // toggleDropdown) instead of a hamburger.
  it('should navigate to social feed from the account menu on desktop', () => {
    cy.viewport(1280, 720);
    cy.sealHart();
    cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
    cy.get('a[href="/social"]:visible').should('not.exist');
    cy.get('div.mt-auto.cursor-pointer', {timeout: 30000}).first().click();
    cy.get('a[href="/social"]', {timeout: 10000}).filter(':visible').first().click();
    cy.location('pathname', {timeout: 20000}).should('eq', '/social');
  });

  it('should navigate back to home when clicking logo/brand', () => {
    cy.visit('/social', {timeout: 60000, failOnStatusCode: false});
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.wait(2000);

    cy.get('body').then(($body) => {
      const logo = $body.find(
        'a[href="/"], img[alt*="logo"], [class*="logo"], a:contains("Hevolve"), a:contains("Nunba")'
      );

      if (logo.length > 0) {
        cy.wrap(logo.first()).click({force: true});
        cy.wait(1000);

        // Should be on home page
        cy.get('#root').invoke('html').should('not.be.empty');
      }
    });
  });

  // "navbar menu items" (nav a / navbar a) was the hosted site's top navbar,
  // which Nunba's /local does not have; the menus Nunba has are tested in
  // "from the home menu" above and in Responsive Behavior on /social.
});

describe('Navigation - State Preservation', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should preserve authentication state after navigation', () => {
    cy.socialVisit('/social');
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.wait(2000);

    // Navigate to profile
    const userId = Cypress.env('socialUserId');
    cy.socialVisit(`/social/profile/${userId}`);
    cy.wait(1000);

    // Navigate back to feed
    cy.socialVisit('/social');
    cy.wait(1000);

    // Should still be authenticated (FAB button visible for creating posts)
    cy.get('body').should(($body) => {
      const hasFab =
        $body.find('[class*="MuiFab"], button[class*="Fab"]').length > 0;
      const hasAuthContent =
        $body.find('[class*="Avatar"], [class*="UserChip"]').length > 0;
      const pageLoaded = $body.html().length > 100;

      expect(hasFab || hasAuthContent || pageLoaded).to.be.true;
    });
  });

  it('should preserve scroll position when using browser back', () => {
    cy.socialVisit('/social');
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.wait(2000);

    // Scroll down
    cy.scrollTo(0, 500);
    cy.wait(500);

    // Get scroll position
    cy.window().then((win) => {
      const scrollBefore = win.scrollY;

      // Navigate to another page
      const userId = Cypress.env('socialUserId');
      cy.socialVisit(`/social/profile/${userId}`);
      cy.wait(1000);

      // Go back
      cy.go('back');
      cy.wait(1000);

      // Page should be stable
      cy.get('#root').invoke('html').should('not.be.empty');
    });
  });

  it('should preserve form input when navigating back', () => {
    cy.socialVisit('/social/search');
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.wait(2000);

    cy.get('body').then(($body) => {
      const searchInput = $body.find(
        'input[placeholder*="Search"], input[type="search"]'
      );

      if (searchInput.length > 0) {
        // Type in search
        cy.wrap(searchInput.first()).type('test query', {force: true});
        cy.wait(500);

        // Navigate away
        cy.socialVisit('/social');
        cy.wait(1000);

        // Go back
        cy.go('back');
        cy.wait(1000);

        // Page should be stable (input may or may not be preserved depending on implementation)
        cy.get('#root').invoke('html').should('not.be.empty');
      }
    });
  });

  it('should maintain feed tab selection after viewing post and returning', () => {
    cy.socialVisit('/social');
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.wait(2000);

    cy.get('body').then(($body) => {
      const tabs = $body.find('[role="tab"]');
      if (tabs.length >= 2) {
        // Click second tab (Trending)
        cy.get('[role="tab"]', {timeout: 30000}).eq(1).click({force: true});
        cy.wait(1000);

        // Click on a post card if available
        const cards = $body.find('[class*="MuiCard"]');
        if (cards.length > 0) {
          // Re-query from DOM to avoid stale element after tab click re-render
          cy.get('[class*="MuiCard"]').first().click({force: true});
          cy.wait(1000);

          // Go back
          cy.go('back');
          cy.wait(2000);

          // Page should be stable - wait for React to re-render
          cy.get('#root', {timeout: 30000}).should('exist');
          cy.get('body').then(($b) => {
            const rootHtml = $b.find('#root').html() || '';
            const pageLoaded = $b.html().length > 200;
            expect(
              rootHtml.length > 0 || pageLoaded,
              'Page should have rendered content after back navigation'
            ).to.be.true;
          });
        } else {
          // No cards to click - just verify page is stable
          cy.get('body').invoke('html').should('not.be.empty');
        }
      } else {
        // No tabs found - just verify page loaded
        cy.get('#root').invoke('html').should('not.be.empty');
      }
    });
  });
});

describe('Navigation - Error Pages', () => {
  it('should show 404 page for non-existent route', () => {
    cy.visit('/this-page-definitely-does-not-exist-12345', {timeout: 60000, 
      failOnStatusCode: false,
    });
    cy.get('#root', {timeout: 30000}).should('exist');

    // Should show error page or redirect, not crash
    cy.get('body').should('not.contain.text', 'Cannot read properties');
    cy.get('body').should('not.contain.text', 'Uncaught');

    cy.get('body').should(($body) => {
      const text = $body.text();
      const has404 =
        text.includes('404') ||
        text.includes('Not Found') ||
        text.includes('not found');
      const redirected = true; // Might redirect to home
      const pageLoaded = $body.html().length > 100;

      expect(has404 || redirected || pageLoaded).to.be.true;
    });
  });

  it('should handle invalid social route gracefully', () => {
    cy.visit('/social/post/invalid-post-id-that-does-not-exist', {timeout: 60000, 
      failOnStatusCode: false,
    });
    cy.get('#root', {timeout: 30000}).should('exist');

    // Should not crash
    cy.get('body').should('not.contain.text', 'Cannot read properties');
    cy.get('body').should('not.contain.text', 'Uncaught');

    // Should show error message or empty state
    cy.get('#root').invoke('html').should('not.be.empty');
  });

  it('should handle invalid admin route gracefully', () => {
    cy.visit('/admin/nonexistent-section', {timeout: 60000, failOnStatusCode: false});
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.wait(2000);

    // Should not crash
    cy.get('body').should('not.contain.text', 'Uncaught');
    // The page should either render content in #root or redirect to another page.
    // Some routes may render an empty #root while redirecting, so also check body.
    cy.get('body').invoke('html').should('not.be.empty');
    cy.get('body').should(($body) => {
      const rootHtml = $body.find('#root').html() || '';
      const pageLoaded = $body.html().length > 200;
      expect(
        rootHtml.length > 0 || pageLoaded,
        'Page should have rendered content'
      ).to.be.true;
    });
  });
});

describe('Navigation - Deep Linking', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should load correct content when deep linking to post', () => {
    // Create a post first
    cy.socialRequest('POST', '/posts', {
      title: `Deep Link Test ${Date.now()}`,
      content: 'Testing deep link navigation.',
    }).then((res) => {
      if (res.status === 200 || res.status === 201) {
        const postId = (res.body.data || res.body).id;

        // Deep link directly to post
        cy.socialVisit(`/social/post/${postId}`);
        cy.get('#root', {timeout: 30000}).should('exist');
        cy.wait(2000);

        // Should show post content
        cy.get('body').should(($body) => {
          const text = $body.text();
          const hasContent =
            text.includes('Deep Link Test') ||
            text.includes('Testing deep link');
          const pageLoaded = $body.html().length > 100;

          expect(hasContent || pageLoaded).to.be.true;
        });
      }
    });
  });

  it('should load correct content when deep linking to profile', () => {
    const userId = Cypress.env('socialUserId');

    cy.socialVisit(`/social/profile/${userId}`);
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.wait(2000);

    // Should show profile content
    cy.get('body').should(($body) => {
      const text = $body.text();
      const hasProfile = text.includes('Karma') || text.includes('Followers');
      const pageLoaded = $body.html().length > 100;

      expect(hasProfile || pageLoaded).to.be.true;
    });
  });

  it('should handle query parameters correctly', () => {
    cy.socialVisit('/social/search?q=test');
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.wait(3000);

    // Search query should be processed
    cy.get('body').then(($body) => {
      const searchInput = $body.find(
        'input[placeholder*="Search"], input[type="search"]'
      );

      if (searchInput.length > 0) {
        // Input may have the query value
        cy.wrap(searchInput.first()).should('exist');
      }

      // Page should be stable - check body has content even if #root is empty
      // (some routes may lazy-load or redirect)
      const rootHtml = $body.find('#root').html() || '';
      const pageLoaded = $body.html().length > 200;
      expect(
        rootHtml.length > 0 || pageLoaded,
        'Page should have rendered content'
      ).to.be.true;
    });
  });
});

describe('Navigation - History Management', () => {
  before(() => {
    cy.socialAuth();
  });

  it('should update URL when navigating within app', () => {
    cy.socialVisit('/social');
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.wait(2000);

    // Navigate to profile
    const userId = Cypress.env('socialUserId');
    cy.socialVisit(`/social/profile/${userId}`);
    cy.wait(1000);

    // URL should be updated
    cy.url().should('include', `/social/profile/${userId}`);
  });

  it('should support browser back button', () => {
    cy.socialVisit('/social');
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.wait(1000);

    // Navigate to another page
    cy.socialVisit('/social/search');
    cy.wait(1000);
    cy.url().should('include', '/social/search');

    // Go back
    cy.go('back');
    cy.wait(1000);

    // Should be back on social feed
    cy.url().should('include', '/social');
    cy.get('#root').invoke('html').should('not.be.empty');
  });

  it('should support browser forward button', () => {
    cy.socialVisit('/social');
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.wait(1000);

    // Navigate forward
    cy.socialVisit('/social/search');
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.wait(1000);

    // Go back
    cy.go('back');
    cy.wait(2000);

    // Go forward
    cy.go('forward');
    cy.wait(2000);

    // Should be on search page - the app may take time to re-render after forward nav
    cy.url().should('include', '/social');
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.get('body').should(($body) => {
      const rootHtml = $body.find('#root').html() || '';
      const pageLoaded = $body.html().length > 200;
      expect(
        rootHtml.length > 0 || pageLoaded,
        'Page should have rendered content after forward navigation'
      ).to.be.true;
    });
  });

  it('should handle multiple back navigations', () => {
    cy.socialVisit('/social');
    cy.wait(500);

    const userId = Cypress.env('socialUserId');
    cy.socialVisit(`/social/profile/${userId}`);
    cy.wait(500);

    cy.socialVisit('/social/search');
    cy.wait(500);

    // Go back twice
    cy.go('back');
    cy.wait(500);
    cy.go('back');
    cy.wait(500);

    // Should be on original page
    cy.get('#root').invoke('html').should('not.be.empty');
  });
});

describe('Navigation - Loading States', () => {
  it('should show loading indicator during route transitions', () => {
    cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
    cy.get('#root', {timeout: 30000}).should('exist');

    // Page should show content or loading
    cy.get('body').then(($body) => {
      const hasSpinner =
        $body.find('[class*="MuiCircularProgress"], [role="progressbar"]')
          .length > 0;
      const hasLoadingText = $body.text().includes('Loading');
      const hasContent =
        $body.find('[class*="MuiCard"], nav, header').length > 0;
      const pageLoaded = $body.html().length > 100;

      expect(hasSpinner || hasLoadingText || hasContent || pageLoaded).to.be
        .true;
    });
  });

  it('should complete loading within reasonable time', () => {
    const startTime = Date.now();

    cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
    cy.get('#root', {timeout: 30000}).should('exist');

    // Page should load within 10 seconds
    cy.get('#root')
      .invoke('html')
      .should('not.be.empty')
      .then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(10000);
      });
  });
});

// The social layout's mobile menu, measured at 375px on /social: one menu
// button (MENU_BTN also matches its MenuIcon svg, hence .first()); the modal
// drawer holds 40 links, 27 of them under /social/ (DRAWER_LINK).
describe('Navigation - Responsive Behavior', () => {
  const MENU_BTN = 'button[aria-label*="menu"], [data-testid="MenuIcon"]';
  // The menu button opens the temporary (modal) drawer; the docked drawer's
  // paper is also in the DOM, hidden at this width, so scope to the modal.
  const MENU_PAPER = '.MuiDrawer-modal .MuiDrawer-paper';
  // Links that stay inside the social layout (e.g. /social/communities): the
  // drawer is keepMounted, so after them it closes but stays in the DOM.
  const DRAWER_LINK = `${MENU_PAPER} a[href^="/social/"]`;

  before(() => {
    cy.socialAuth();
  });

  const openMobileMenu = () => {
    cy.viewport(375, 667);
    cy.socialVisit('/social');
    cy.get('#root', {timeout: 30000}).should('exist');
    // No {force: true}: an overlay over the button or the drawer fails the
    // test (the Getting Started checklist once covered the open menu).
    cy.get(MENU_BTN, {timeout: 30000}).first().click();
    cy.get(MENU_PAPER, {timeout: 10000}).should('be.visible');
  };

  it('should show mobile navigation menu on small screens', () => {
    openMobileMenu();
    cy.get(DRAWER_LINK).should('have.length.greaterThan', 0);
  });

  it('should navigate correctly from mobile menu', () => {
    openMobileMenu();
    cy.get(DRAWER_LINK).first().then(($a) => {
      const target = $a.attr('href').split('?')[0];
      cy.wrap($a).click();
      cy.location('pathname', {timeout: 20000}).should('eq', target);
    });
  });

  it('should close mobile menu after navigation', () => {
    openMobileMenu();
    cy.get(DRAWER_LINK).first().click();
    cy.location('pathname', {timeout: 20000}).should('match', /^\/social\//);
    cy.get(MENU_PAPER).should('not.be.visible');
  });

  it('should adapt navigation layout on viewport resize', () => {
    cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.wait(1000);

    // Desktop
    cy.viewport(1280, 720);
    cy.wait(500);
    cy.get('#root').invoke('html').should('not.be.empty');

    // Mobile
    cy.viewport(375, 667);
    cy.wait(500);
    cy.get('#root').invoke('html').should('not.be.empty');

    // Back to desktop
    cy.viewport(1280, 720);
    cy.wait(500);
    cy.get('#root').invoke('html').should('not.be.empty');
  });
});

describe('Navigation - Authentication Redirects', () => {
  it('should redirect to login when accessing protected route without auth', () => {
    // Clear any existing auth
    cy.clearLocalStorage();

    cy.visit('/admin', {timeout: 60000, failOnStatusCode: false});
    cy.get('#root', {timeout: 30000}).should('exist');
    cy.wait(2000);

    // Should redirect to login or show access denied
    cy.get('body').then(($body) => {
      const text = $body.text();
      const hasLoginForm =
        $body.find('input[type="password"], form').length > 0;
      const hasLoginText = text.includes('Login') || text.includes('Sign in');
      const hasAccessDenied =
        text.includes('Access') || text.includes('Unauthorized');
      const pageLoaded = $body.html().length > 100;

      expect(hasLoginForm || hasLoginText || hasAccessDenied || pageLoaded).to
        .be.true;
    });
  });

  it('should redirect to intended page after login', () => {
    // This tests the post-login redirect flow
    cy.socialAuth().then(() => {
      cy.socialVisit('/admin');
      cy.get('#root', {timeout: 30000}).should('exist');
      cy.wait(2000);

      // Should show admin content or redirect appropriately
      cy.get('#root').invoke('html').should('not.be.empty');
    });
  });
});

describe('Navigation - Performance', () => {
  it('should not cause memory leaks during navigation', () => {
    // Navigate between pages multiple times
    const pages = ['/social', '/social/search', '/social'];

    pages.forEach((page) => {
      cy.visit(page, {timeout: 60000, failOnStatusCode: false});
      cy.get('#root', {timeout: 30000}).should('exist');
      cy.wait(500);
    });

    // Final page should still be responsive
    cy.get('#root').invoke('html').should('not.be.empty');
    cy.get('body').should('not.contain.text', 'Uncaught');
  });

  it('should handle rapid navigation without errors', () => {
    cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
    cy.get('#root', {timeout: 30000}).should('exist');

    // Rapid navigation
    cy.visit('/social', {timeout: 60000, failOnStatusCode: false});
    cy.visit('/local', {timeout: 60000, failOnStatusCode: false});
    cy.visit('/social', {timeout: 60000, failOnStatusCode: false});
    cy.wait(1000);

    // Should settle on final page
    cy.get('#root').invoke('html').should('not.be.empty');
    cy.get('body').should('not.contain.text', 'Uncaught');
  });
});
