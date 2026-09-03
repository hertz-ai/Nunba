/**
 * Why does a board game accept no moves?
 *
 * Tic Tac Toe sits with a completely empty board while its header says
 * "Your turn — You are X". TicTacToeBoard.handleClick bails on `!isActive`, so
 * either isActive is false or the click never reaches the cell. Those need very
 * different fixes, so measure instead of guessing.
 *
 * Uses cy.click() deliberately: these cells are React onClick handlers, which
 * respond to synthetic events, so this isolates the question from the CDP
 * pointer path entirely.
 */

const FAKE_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwicm9sZSI6ImZsYXQifQ.fake';

describe('board move diagnosis', () => {
  it('reports whether a cell click registers', () => {
    cy.intercept('GET', '**/api/social/games*', { statusCode: 503, body: {} });
    cy.intercept('GET', '**/api/social/auth/me', {
      statusCode: 200,
      body: { success: true, data: { id: 1, username: 'testuser', role: 'flat' } },
    });
    cy.intercept('GET', '**/api/social/feed*', { statusCode: 200, body: { success: true, data: [] } });
    cy.intercept('GET', '**/api/social/notifications*', {
      statusCode: 200, body: { success: true, data: [], meta: { total: 0 } },
    });

    const report = {};
    cy.visit('/social/games/tic-tac-toe', {
      failOnStatusCode: false,
      onBeforeLoad(win) {
        win.localStorage.setItem('access_token', FAKE_TOKEN);
        // Capture anything the client logs while starting up.
        win.__errs = [];
        const oe = win.console.error;
        win.console.error = (...a) => { win.__errs.push(a.map(String).join(' ')); oe.apply(win.console, a); };
        win.addEventListener('error', (e) => win.__errs.push('window:' + e.message));
        win.addEventListener('unhandledrejection', (e) => win.__errs.push('reject:' + String(e.reason)));
      },
    });
    cy.get('#root', { timeout: 120000 }).should('exist');
    cy.contains(/play solo/i, { timeout: 120000 }).click({ force: true });
    cy.get('[data-testid="engine-boardgame"]', { timeout: 60000 }).should('exist');
    cy.wait(4000);

    cy.get('[data-testid="engine-boardgame"]').then(($root) => {
      const root = $root[0];
      report.textBefore = (root.innerText || '').replace(/\s+/g, ' ').slice(0, 120);

      // Find the grid cells: leaf divs of roughly equal size, 9 of them.
      const divs = Array.from(root.querySelectorAll('div'));
      const leaves = divs.filter((d) => d.children.length === 0);
      const boxes = leaves.map((d) => d.getBoundingClientRect())
        .filter((r) => r.width > 30 && r.height > 30);
      report.leafDivs = leaves.length;
      report.cellSized = boxes.length;

      // React attaches its props to the DOM node under a __reactProps$ key.
      const propKey = Object.keys(root).find((k) => k.startsWith('__reactProps$'));
      report.reactPropsKeyFound = Boolean(propKey);
      const withHandler = leaves.filter((d) => {
        const k = Object.keys(d).find((x) => x.startsWith('__reactProps$'));
        return k && typeof d[k].onClick === 'function';
      });
      report.cellsWithOnClick = withHandler.length;

      if (withHandler.length) {
        cy.wrap(withHandler[Math.floor(withHandler.length / 2)]).click({ force: true });
      }
    });

    cy.wait(2500);
    cy.get('[data-testid="engine-boardgame"]').then(($root) => {
      report.textAfter = ($root[0].innerText || '').replace(/\s+/g, ' ').slice(0, 120);
      report.changed = report.textAfter !== report.textBefore;
    });
    cy.window().then((win) => {
      report.errors = (win.__errs || []).slice(0, 6);
      cy.writeFile('cypress/results/board-diagnosis.json', report, { log: false });
    });
  });
});
