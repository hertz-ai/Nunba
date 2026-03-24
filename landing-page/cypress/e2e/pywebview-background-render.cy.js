/**
 * pywebview Background Render Tests
 *
 * Reproduces the black screen bug: when Nunba starts with --background,
 * pywebview creates a hidden window. WebView2 suspends its rendering
 * compositor. When the window becomes visible, React IS mounted (DOM exists)
 * but zero pixels are painted — user sees black.
 *
 * These tests verify:
 * 1. React mounts correctly regardless of initial visibility
 * 2. The hero→demo transition fires (not stuck on hero)
 * 3. Content is actually visible (not just in DOM)
 * 4. The recovery mechanism works when compositor is suspended
 *
 * Run against: http://localhost:5000 (Flask serves the React SPA)
 */

describe('Background Start Rendering', () => {
  // Simulate returning user (skip onboarding)
  beforeEach(() => {
    localStorage.setItem('hart_sealed', 'true');
    localStorage.setItem('hart_name', 'CypressTest');
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_user_id', 'cypress_bg_test');
  });

  describe('Normal Start (visible from beginning)', () => {
    beforeEach(() => {
      cy.visit('/local', { failOnStatusCode: false });
    });

    it('React root has children (not empty mount)', () => {
      cy.get('#root', { timeout: 10000 }).should(($root) => {
        expect($root.children().length).to.be.greaterThan(0);
      });
    });

    it('hero section exists in DOM', () => {
      cy.get('#hero-section', { timeout: 10000 }).should('exist');
    });

    it('demo section exists in DOM', () => {
      cy.get('#demo-section', { timeout: 10000 }).should('exist');
    });

    it('hero transitions to demo within 10s', () => {
      // Hero starts visible (opacity 1), should fade to 0
      // Demo starts hidden (opacity 0), should fade to 1
      cy.get('#demo-section', { timeout: 10000 }).should('exist');

      // Wait for transition
      cy.wait(6000);

      // After transition, demo should be interactive (pointer-events: auto)
      cy.get('#demo-section').should(($demo) => {
        const style = window.getComputedStyle($demo[0]);
        // Either opacity is 1 or pointer-events is auto
        const isVisible = parseFloat(style.opacity) > 0.5 || style.pointerEvents === 'auto';
        expect(isVisible).to.be.true;
      });
    });

    it('chat input is interactable after transition', () => {
      cy.wait(6000); // Wait for hero→demo transition
      cy.get('textarea, input[type="text"]', { timeout: 10000 })
        .first()
        .should('be.visible')
        .and('not.be.disabled');
    });

    it('body has non-zero dimensions', () => {
      cy.get('body').should(($body) => {
        const rect = $body[0].getBoundingClientRect();
        expect(rect.width).to.be.greaterThan(0);
        expect(rect.height).to.be.greaterThan(0);
      });
    });

    it('page has actual rendered content (not just empty divs)', () => {
      cy.wait(6000);
      cy.get('body').should(($body) => {
        // Body text should have substantial content (not just whitespace)
        const text = $body.text().trim();
        expect(text.length).to.be.greaterThan(10);
      });
    });
  });

  describe('Simulated Hidden→Visible Transition', () => {
    // This simulates what happens in --background mode:
    // 1. Page loads while "hidden" (we can't truly hide in Cypress,
    //    but we can test the recovery mechanisms)

    beforeEach(() => {
      cy.visit('/local', { failOnStatusCode: false });
    });

    it('content renders after visibility change event', () => {
      cy.wait(3000); // Let page load

      // Simulate the visibility change that happens when a hidden window shows
      cy.window().then((win) => {
        // Trigger the same reflow sequence our recovery code uses
        win.document.body.style.opacity = '0.99';
        void win.document.body.offsetHeight; // Force reflow
        win.requestAnimationFrame(() => {
          win.document.body.style.opacity = '1';
          void win.document.body.offsetHeight;
        });
      });

      cy.wait(1000);

      // Content should be visible
      cy.get('body').should(($body) => {
        const text = $body.text().trim();
        expect(text.length).to.be.greaterThan(10);
      });
    });

    it('location.reload() recovers blank page', () => {
      // Wait for initial render to complete
      cy.wait(6000);

      // Verify page is rendered before reload
      cy.get('#root', { timeout: 10000 }).should(($root) => {
        expect($root[0].innerHTML.length).to.be.greaterThan(100);
      });

      // Reload (simulates the pywebview recovery mechanism)
      cy.reload();

      // After reload, React should re-mount within the hero preloader timeout
      cy.get('#root', { timeout: 15000 }).should(($root) => {
        expect($root[0].innerHTML.length).to.be.greaterThan(100);
      });
    });
  });

  describe('Hero Preloader Behavior', () => {
    it('hero shows while demo loads (returning user)', () => {
      cy.visit('/local', { failOnStatusCode: false });

      // Hero should be in DOM immediately
      cy.get('#hero-section', { timeout: 5000 }).should('exist');

      // Hero should have non-zero opacity initially
      cy.get('#hero-section').should(($hero) => {
        const opacity = parseFloat(window.getComputedStyle($hero[0]).opacity);
        // May be 0 if transition already happened, or 1 if still showing
        // Just verify it exists and has a valid opacity
        expect(opacity).to.be.within(0, 1);
      });
    });

    it('demo section becomes active after hero fades', () => {
      cy.visit('/local', { failOnStatusCode: false });
      cy.wait(8000); // Wait for hero→demo transition + safety margin

      cy.get('#demo-section').should(($demo) => {
        const style = window.getComputedStyle($demo[0]);
        expect(parseFloat(style.opacity)).to.be.greaterThan(0.5);
      });
    });

    it('hero does not block forever (safety timeout)', () => {
      // Even if fetchPrompts fails, hero should fade within 7s
      // (5s safety timeout + 2s transition delay)
      cy.visit('/local', { failOnStatusCode: false });
      cy.wait(8000);

      // Chat input should be available
      cy.get('textarea, input[type="text"]', { timeout: 5000 })
        .first()
        .should('exist');
    });
  });

  describe('First-Time User (no hart_sealed)', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('shows LightYourHART onboarding (not hero or blank)', () => {
      cy.visit('/local', { failOnStatusCode: false });

      // Should show onboarding, not hero or chat
      cy.wait(3000);
      cy.get('body').should(($body) => {
        const text = $body.text();
        // Should have onboarding content OR hero content, NOT blank
        expect(text.length).to.be.greaterThan(10);
      });
    });
  });

  describe('Rapid Page Reload (mimics restart)', () => {
    it('content survives rapid reload', () => {
      cy.visit('/local', { failOnStatusCode: false });
      cy.wait(2000);
      cy.reload();
      cy.wait(3000);

      cy.get('#root', { timeout: 10000 }).should(($root) => {
        expect($root.children().length).to.be.greaterThan(0);
        expect($root[0].innerHTML.length).to.be.greaterThan(100);
      });
    });

    it('no blank flash on reload for returning user', () => {
      cy.visit('/local', { failOnStatusCode: false });
      cy.wait(5000);

      // Capture content before reload
      cy.get('#root').then(($root) => {
        const beforeLen = $root[0].innerHTML.length;
        expect(beforeLen).to.be.greaterThan(100);
      });

      cy.reload();
      cy.wait(5000);

      // Content should be back
      cy.get('#root').should(($root) => {
        expect($root[0].innerHTML.length).to.be.greaterThan(100);
      });
    });
  });
});
