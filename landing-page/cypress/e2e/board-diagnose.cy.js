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
    const GAME = Cypress.env('game') || 'tic-tac-toe';
    cy.visit(`/social/games/${GAME}`, {
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
        // Click a handful of cells over successive turns so the bot gets
        // several chances to answer, not just one.
        cy.wrap(withHandler[withHandler.length - 1]).click({ force: true });
        cy.wait(2500);
        cy.wrap(withHandler[0]).click({ force: true });
      }
    });

    cy.wait(4000);
    cy.get('[data-testid="engine-boardgame"]').then(($root) => {
      report.textAfter = ($root[0].innerText || '').replace(/\s+/g, ' ').slice(0, 120);
      report.changed = report.textAfter !== report.textBefore;
    });
    // With --env pairs=1, try source -> diagonal pairs the way a player moves a
    // checkers piece, and record the first ones that actually change the board.
    // Checkers is the only board that never finishes, while four others do on
    // the same engine, so the question is whether ANY aimed move lands.
    if (Cypress.env('pairs')) {
      report.moves = [];
      cy.get('[data-testid="engine-boardgame"]').then(($root) => {
        const root = $root[0];
        const cells = Array.from(root.querySelectorAll('div, td, button')).filter((d) => {
          const k = Object.keys(d).find((x) => x.startsWith('__reactProps$'));
          if (!k || typeof d[k].onClick !== 'function') return false;
          const r = d.getBoundingClientRect();
          return r.width > 8 && r.height > 8;
        });
        const rects = cells.map((e) => e.getBoundingClientRect());
        const rows = [...new Set(rects.map((r) => Math.round(r.top)))].sort((a, b) => a - b);
        const cols = [...new Set(rects.map((r) => Math.round(r.left)))].sort((a, b) => a - b);
        report.gridRows = rows.length;
        report.gridCols = cols.length;
        const rc = cells.map((e, i) => ({
          el: e,
          row: rows.indexOf(Math.round(rects[i].top)),
          col: cols.indexOf(Math.round(rects[i].left)),
        }));
        const at = (r, c) => rc.find((x) => x.row === r && x.col === c);
        let seen = (root.innerText || '').replace(/\s+/g, ' ');
        rc.forEach((src) => {
          [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => {
            const dst = at(src.row + dr, src.col + dc);
            if (!dst) return;
            cy.wrap(src.el).click({ force: true });
            cy.wrap(dst.el).click({ force: true });
            cy.get('[data-testid="engine-boardgame"]').then(($r) => {
              const now = ($r[0].innerText || '').replace(/\s+/g, ' ');
              if (now !== seen && report.moves.length < 4) {
                report.moves.push({
                  from: `${src.row},${src.col}`,
                  to: `${src.row + dr},${src.col + dc}`,
                  now: now.slice(0, 80),
                });
                seen = now;
              }
            });
          });
        });
      });
    }

    // With --env cells=1, describe how each square renders a piece. A move
    // chooser has to know which squares hold ITS pieces, and the board draws
    // them rather than labelling them.
    if (Cypress.env('cells')) {
      cy.get('[data-testid="engine-boardgame"]').then(($root) => {
        const root = $root[0];
        const win = root.ownerDocument.defaultView;
        const cells = Array.from(root.querySelectorAll('*')).filter((d) => {
          const k = Object.keys(d).find((x) => x.startsWith('__reactProps$'));
          if (!k || typeof d[k].onClick !== 'function') return false;
          const r = d.getBoundingClientRect();
          return r.width > 20 && r.height > 20 && !/back to games/i.test(d.innerText || '');
        });
        report.cellCount = cells.length;
        report.pieceColours = {};
        cells.forEach((c) => {
          const k = Array.from(c.children);
          if (!k.length) return;
          const col = win.getComputedStyle(k[0]).backgroundColor;
          report.pieceColours[col] = (report.pieceColours[col] || 0) + 1;
        });
        report.cells = cells.slice(0, 4).map((c) => {
          const kids = Array.from(c.children);
          return {
            bg: win.getComputedStyle(c).backgroundColor,
            kids: kids.length,
            kidBg: kids.map((k) => win.getComputedStyle(k).backgroundColor).slice(0, 2),
          };
        });
      });
    }

    cy.window().then((win) => {
      report.errors = (win.__errs || []).slice(0, 6);
      cy.writeFile('cypress/results/board-diagnosis.json', report, { log: false });
    });
  });
});
