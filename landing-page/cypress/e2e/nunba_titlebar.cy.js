/* eslint-disable */
/**
 * Cypress E2E for the custom NunbaTitleBar (TB-3 ship).
 *
 * Strategy: cypress runs against a real browser (no pywebview), so we
 * INJECT a fake window.pywebview.api before each visit to exercise the
 * render path + click handlers.  This proves the wiring end-to-end at
 * the same level real users will hit on Win+Linux frameless installs.
 *
 * Every visit is to /local, the page the desktop window opens
 * (app.py: initial_url = http://localhost:<port>/local).  Not '/': Flask's
 * '/' (main.py serve_landing_page_root) redirects to https://hevolve.ai
 * whenever hevolve.ai answers, so on an online runner a visit to '/' tested
 * the hosted site, which has neither this titlebar nor Nunba's <main>.
 *
 * Also asserts ZERO REGRESSION:
 *   - When window.pywebview is absent (browser mode = today's prod web),
 *     the titlebar is NOT rendered.  Existing pages render exactly as before.
 *   - The 32px clearance applies only in pywebview mode.  It is reserved on
 *     <html> (NunbaTitleBar's injected stylesheet, one source), and <main>
 *     carries none of it, so /social, /local, /admin/* etc. don't shift in
 *     browser builds.
 */

// A fake pywebview bridge, put in place before React mounts, as the desktop
// window's js_api is.  Stubs are aliased so the click tests can assert them.
function fakePywebview(win) {
  win.pywebview = {
    api: {
      window_minimize: cy.stub().as('minimize'),
      window_toggle_maximize: cy.stub().as('maximize'),
      window_close: cy.stub().as('close'),
      window_start_drag: cy.stub().as('startDrag'),
      window_is_maximized: cy.stub().returns(false),
    },
  };
}

// Windows, so NunbaTitleBar's macOS guard (Apple HIG) does not hide it.
function onWindows(win) {
  Object.defineProperty(win.navigator, 'platform', {
    configurable: true,
    value: 'Win32',
  });
}

describe('NunbaTitleBar — frameless custom chrome', () => {
  beforeEach(() => {
    // Disable analytics requests that flake under cypress
    cy.intercept('POST', '/api/social/marketing/track', { statusCode: 200, body: {} }).as('track');
  });

  context('Browser mode (no pywebview)', () => {
    it('does NOT render the titlebar — existing layout untouched', () => {
      cy.visit('/local');
      cy.get('main#main-content').should('exist');
      cy.get('[data-testid="nunba-titlebar"]').should('not.exist');
      cy.document().its('documentElement').should('not.have.class', 'nunba-frameless-active');
      cy.get('main#main-content').should('have.css', 'padding-top').then((pt) => {
        // Either '0px' (style omitted) or undefined; must NOT be 32px
        expect(pt).not.to.equal('32px');
      });
    });

    it('Demopage chip row still renders in its original position', () => {
      cy.openLocalChat();
      // The intelligence-preference chip (Local/Hybrid/Hive) lives in
      // Demopage's top-right toolbar.  In browser mode it renders inline at
      // top-1 right-2 of the page body — unchanged from today.
      cy.contains('button', /^Local$/, { timeout: 20000 }).should('be.visible');
    });
  });

  // /local with no HART sealed is the first-run ceremony (LightYourHART), a
  // full-window layer: the first thing a new person sees in the desktop
  // window, so the window controls must work over it.
  context('Frameless mode (pywebview Win+Linux)', () => {
    beforeEach(() => {
      cy.visit('/local', {
        onBeforeLoad(win) {
          fakePywebview(win);
          onWindows(win);
        },
      });
    });

    it('renders the dark titlebar', () => {
      cy.get('[data-testid="nunba-titlebar"]').should('be.visible');
      cy.get('[data-testid="nunba-window-buttons"]').should('exist');
    });

    it('reserves 32px above the page so nothing sits under the titlebar', () => {
      // NunbaTitleBar's stylesheet reserves the strip on <html> and zeroes
      // <main>'s padding, so the gap is applied exactly once.
      cy.document().its('documentElement').should('have.class', 'nunba-frameless-active');
      cy.document().then((doc) => {
        expect(doc.defaultView.getComputedStyle(doc.documentElement).paddingTop).to.equal('32px');
      });
      cy.get('main#main-content').should('have.css', 'padding-top', '0px');
      cy.get('[data-testid="nunba-titlebar"]').then(($tb) => {
        cy.get('main#main-content').then(($main) => {
          expect($main[0].getBoundingClientRect().top)
            .to.be.at.least($tb[0].getBoundingClientRect().bottom, 'main must start below the titlebar');
        });
      });
    });

    it('the first-run ceremony starts below the titlebar, not over it', () => {
      cy.contains(/What language feels like home/i, { timeout: 20000 }).should('be.visible');
      cy.get('[data-testid="nunba-titlebar"]').should('be.visible').then(($tb) => {
        const tbBottom = $tb[0].getBoundingClientRect().bottom;
        // The point just below the strip's middle belongs to the ceremony;
        // the strip's own middle belongs to the titlebar.
        cy.document().then((doc) => {
          const x = doc.defaultView.innerWidth / 2;
          const onStrip = doc.elementFromPoint(x, tbBottom / 2);
          expect($tb[0].contains(onStrip), 'the titlebar is on top at its own row').to.be.true;
        });
      });
      // The particle canvas fills the space below the strip and no more, so
      // it never gives the ceremony a scrollbar of its own.  (The language
      // list itself may still scroll in a short window: by design, so every
      // option stays reachable.)
      cy.get('canvas').first().should(($canvas) => {
        const root = $canvas[0].parentElement;
        expect($canvas[0].getBoundingClientRect().height, 'canvas height')
          .to.be.at.most(root.clientHeight);
      });
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
  });

  context('Frameless mode, the bridge attaches after the page', () => {
    // pywebview can attach its api after the page has rendered; NunbaTitleBar
    // shows on `pywebviewready`, and the ceremony root shrinks by 32px with no
    // window resize.  The particle canvas must follow the root.
    it('the ceremony still fits below the titlebar, canvas included', () => {
      cy.viewport(1280, 800);
      cy.visit('/local');
      cy.contains(/What language feels like home/i, { timeout: 20000 }).should('be.visible');
      cy.get('[data-testid="nunba-titlebar"]').should('not.exist');
      cy.window().then((win) => {
        fakePywebview(win);
        onWindows(win);
        win.dispatchEvent(new win.Event('pywebviewready'));
      });
      cy.get('[data-testid="nunba-titlebar"]').should('be.visible');
      cy.get('canvas').first().should(($canvas) => {
        const root = $canvas[0].parentElement;
        const c = $canvas[0].getBoundingClientRect();
        expect(root.getBoundingClientRect().top, 'root below the strip').to.equal(32);
        expect(c.top, 'canvas starts where the root starts').to.equal(32);
        expect(c.height, 'canvas height').to.equal(root.clientHeight);
        expect(c.width, 'canvas width').to.equal(root.clientWidth);
        // At 800px the language list fits: nothing to scroll.
        expect(root.scrollHeight, 'root scroll').to.be.at.most(root.clientHeight);
      });
    });
  });

  context('Frameless mode, the chat page', () => {
    it('Demopage chip sits in the titlebar right slot (TB-Phase-B), not over the page', () => {
      // Demopage portals its toolbar into the titlebar's right slot when the
      // slot exists (useTitleBarRightSlot), so in the desktop window the chip
      // is part of the titlebar row.
      cy.openLocalChat({
        onBeforeLoad(win) {
          fakePywebview(win);
          onWindows(win);
        },
      });
      cy.get('[data-testid="nunba-titlebar"]').should('be.visible');
      cy.get('[data-testid="nunba-titlebar-rightslot"]', { timeout: 20000 })
        .contains('button', /^Local$/)
        .should('be.visible');
      cy.get('[data-testid="nunba-titlebar"]').then(($tb) => {
        const tb = $tb[0].getBoundingClientRect();
        cy.get('[data-testid="nunba-titlebar-rightslot"]').contains('button', /^Local$/).then(($chip) => {
          const chip = $chip[0].getBoundingClientRect();
          expect(chip.top, 'chip top inside the titlebar').to.be.at.least(tb.top);
          expect(chip.bottom, 'chip bottom inside the titlebar').to.be.at.most(tb.bottom);
        });
      });
    });
  });

  context('macOS frameless guard (HIG)', () => {
    it('does NOT render titlebar on macOS even with pywebview', () => {
      cy.visit('/local', {
        onBeforeLoad(win) {
          fakePywebview(win);
          Object.defineProperty(win.navigator, 'platform', {
            configurable: true,
            value: 'MacIntel',
          });
        },
      });
      // The page is Nunba's own (not a redirect elsewhere), so the absence
      // below is the guard's doing.
      cy.get('main#main-content').should('exist');
      cy.get('[data-testid="nunba-titlebar"]').should('not.exist');
    });
  });
});
