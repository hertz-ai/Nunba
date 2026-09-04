/**
 * Which Checkers squares are movable pieces, and does selecting one mark its
 * destinations?
 *
 * Checkers is the last board that will not finish. Guessing from/to pairs never
 * lands, and clicking the squares whose markup changes after a source click did
 * not either — so one of two things is untrue: selecting a piece does not mark
 * anything, or the squares being clicked are not pieces.
 *
 * This clicks every clickable square in turn and reports, for each, how many
 * OTHER squares changed markup. A movable piece should light up its
 * destinations; a dead square should change nothing.
 */

import { calibrate, clickApp } from '../support/realInput';

const FAKE_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwicm9sZSI6ImZsYXQifQ.fake';

describe('checkers diagnosis', () => {
  it('reports which squares select and what they light up', () => {
    cy.intercept('GET', '**/api/social/games*', { statusCode: 503, body: {} });
    cy.intercept('GET', '**/api/social/auth/me', {
      statusCode: 200,
      body: { success: true, data: { id: 1, username: 'testuser', role: 'flat' } },
    });
    cy.intercept('GET', '**/api/social/feed*', { statusCode: 200, body: { success: true, data: [] } });
    cy.intercept('GET', '**/api/social/notifications*', {
      statusCode: 200, body: { success: true, data: [], meta: { total: 0 } },
    });

    const rep = { probes: [] };
    cy.visit('/social/games/checkers', {
      failOnStatusCode: false,
      onBeforeLoad(win) { win.localStorage.setItem('access_token', FAKE_TOKEN); },
    });
    cy.get('#root', { timeout: 120000 }).should('exist');
    cy.contains(/play solo/i, { timeout: 120000 }).click({ force: true });
    cy.get('[data-testid="engine-boardgame"]', { timeout: 60000 }).should('exist');
    cy.wait(3000);

    cy.window().then((win) => calibrate(win).then((map) => {
      cy.get('[data-testid="engine-boardgame"]').then(($root) => {
        const root = $root[0];
        const clickable = Array.from(root.querySelectorAll('*')).filter((d) => {
          const k = Object.keys(d).find((x) => x.startsWith('__reactProps$'));
          return k && typeof d[k].onClick === 'function';
        });
        const cells = clickable
          .filter((d) => !clickable.some((o) => o !== d && d.contains(o)))
          .filter((d) => {
            const r = d.getBoundingClientRect();
            return r.width > 8 && r.height > 8 && r.top >= 0;
          });
        rep.cellCount = cells.length;
        rep.header = (root.innerText || '').replace(/\s+/g, ' ').slice(0, 70);
        // What does a square look like? Sample a few so piece markup is visible.
        rep.sampleMarkup = cells.slice(0, 3).map((c) => c.outerHTML.slice(0, 150));

        // Play ONE real move: select a red piece, then click a square the
        // board lit up in response. That is the sequence the driver runs, so
        // if the header does not change here the driver cannot work either.
        rep.moves = [];
        cells.slice(40, 64).forEach((cell, idx0) => {
          cy.wrap(null, { log: false }).then(() => {
            if (rep.moves.length >= 3) return null;
            const snap = cells.map((c) => c.outerHTML);
            const b = cell.getBoundingClientRect();
            return clickApp(map, b.left + b.width / 2, b.top + b.height / 2)
              .then(() => {
                const lit = cells.filter((c, i) => c.outerHTML !== snap[i] && c !== cell);
                if (!lit.length) return null;
                const t = lit[0].getBoundingClientRect();
                return clickApp(map, t.left + t.width / 2, t.top + t.height / 2)
                  .then(() => {
                    rep.moves.push(`${idx0 + 40}->lit${lit.length}:` +
                      (root.innerText || '').replace(/\s+/g, ' ').slice(0, 46));
                  });
              });
          });
          cy.wait(500);
        });
      });
    }));

    cy.wait(1500);
    cy.get('[data-testid="engine-boardgame"]').then(($r) => {
      rep.headerAfter = ($r[0].innerText || '').replace(/\s+/g, ' ').slice(0, 70);
      cy.writeFile('cypress/results/checkers-diagnosis.json', rep, { log: false });
    });
  });
});
