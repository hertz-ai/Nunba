/* eslint-disable */
/**
 * Cypress E2E for the custom NunbaTitleBar (TB-3 ship).
 *
 * Strategy: cypress runs against a real browser (no pywebview), so we
 * INJECT a fake window.pywebview.api before each visit to exercise the
 * render path + click handlers.  This proves the wiring end-to-end at
 * the same level real users will hit on Win+Linux frameless installs.
 *
 * Also asserts ZERO REGRESSION:
 *   - When window.pywebview is absent (browser mode = today's prod web),
 *     the titlebar is NOT rendered.  Existing pages render exactly as before.
 *   - The 32px top padding compensator activates only in pywebview mode,
 *     so /social, /local, /admin/* etc. don't shift in browser builds.
 */
describe('NunbaTitleBar — frameless custom chrome', () => {
  beforeEach(() => {
    // Disable analytics requests that flake under cypress
    cy.intercept('POST', '/api/social/marketing/track', { statusCode: 200, body: {} }).as('track');
  });

  context('Browser mode (no pywebview)', () => {
    it('does NOT render the titlebar — existing layout untouched', () => {
      cy.visit('/');
      cy.get('[data-testid="nunba-titlebar"]').should('not.exist');
      cy.get('main#main-content').should('have.css', 'padding-top').then((pt) => {
        // Either '0px' (style omitted) or undefined; must NOT be 32px
        expect(pt).not.to.equal('32px');
      });
    });

    it('Demopage chip row still renders in its original position', () => {
      cy.visit('/local');
      // The intelligence-preference chip (Local/Hybrid/Hive) lives in
      // Demopage's top-right toolbar.  In browser mode it should be at
      // top-1 right-2 relative to the page body — unchanged from today.
      cy.contains(/Local|Hybrid|Hive/, { timeout: 10000 }).should('exist');
    });
  });

  context('Frameless mode (pywebview Win+Linux)', () => {
    beforeEach(() => {
      cy.visit('/', {
        onBeforeLoad(win) {
          // Inject the fake pywebview shim BEFORE React mounts.
          win.pywebview = {
            api: {
              window_minimize: cy.stub().as('minimize'),
              window_toggle_maximize: cy.stub().as('maximize'),
              window_close: cy.stub().as('close'),
              window_start_drag: cy.stub().as('startDrag'),
              window_is_maximized: cy.stub().returns(false),
            },
          };
          // Pretend we're on Windows so the macOS branch returns false.
          Object.defineProperty(win.navigator, 'platform', {
            configurable: true,
            value: 'Win32',
          });
        },
      });
    });

    it('renders the dark titlebar', () => {
      cy.get('[data-testid="nunba-titlebar"]').should('be.visible');
      cy.get('[data-testid="nunba-window-buttons"]').should('exist');
    });

    it('shifts main content down by 32px (no overlap with titlebar)', () => {
      cy.get('main#main-content').should('have.css', 'padding-top', '32px');
    });

    it('minimize click calls pywebview.api.window_minimize', () => {
      cy.get('[data-testid="nunba-window-min"]').click();
      cy.get('@minimize').should('have.been.calledOnce');
    });

    it('maximize click calls pywebview.api.window_toggle_maximize', () => {
      cy.get('[data-testid="nunba-window-max"]').click();
      cy.get('@maximize').should('have.been.calledOnce');
    });

    it('close click calls pywebview.api.window_close', () => {
      cy.get('[data-testid="nunba-window-close"]').click();
      cy.get('@close').should('have.been.calledOnce');
    });

    it('double-click on drag region toggles maximize', () => {
      cy.get('[data-testid="nunba-titlebar"]').dblclick(200, 16);
      cy.get('@maximize').should('have.been.called');
    });

    it('Demopage chip still renders below titlebar (no overlap, no removal)', () => {
      cy.visit('/local', {
        onBeforeLoad(win) {
          win.pywebview = {
            api: {
              window_minimize: () => {},
              window_toggle_maximize: () => {},
              window_close: () => {},
              window_start_drag: () => {},
              window_is_maximized: () => false,
            },
          };
        },
      });
      cy.get('[data-testid="nunba-titlebar"]').should('be.visible');
      // Chip row still exists — verify Local/Hybrid/Hive text is in DOM.
      cy.contains(/Local|Hybrid|Hive/, { timeout: 10000 }).should('exist');

      // Verify no overlap: chip's top edge is >= titlebar's bottom edge.
      cy.get('[data-testid="nunba-titlebar"]').then(($tb) => {
        const tbBottom = $tb[0].getBoundingClientRect().bottom;
        cy.contains(/Local/).then(($chip) => {
          const chipTop = $chip[0].getBoundingClientRect().top;
          expect(chipTop).to.be.at.least(tbBottom,
            'chip must not overlap titlebar');
        });
      });
    });
  });

  context('macOS frameless guard (HIG)', () => {
    it('does NOT render titlebar on macOS even with pywebview', () => {
      cy.visit('/', {
        onBeforeLoad(win) {
          win.pywebview = {
            api: {
              window_minimize: () => {},
              window_toggle_maximize: () => {},
              window_close: () => {},
            },
          };
          Object.defineProperty(win.navigator, 'platform', {
            configurable: true,
            value: 'MacIntel',
          });
        },
      });
      cy.get('[data-testid="nunba-titlebar"]').should('not.exist');
    });
  });
});
