/**
 * Why does Word Search stay at "0 / 8 words found"?
 *
 * The sweep locates every word correctly and sweeps its cells, yet the counter
 * never moves. Three things could be wrong and they need different fixes:
 * the cells are not the ones being read, the words are not being derived, or
 * the drag is not producing the enter/leave React needs for onMouseEnter.
 *
 * This reports each of them instead of guessing between them.
 */

import { calibrate, cdpMouse } from '../support/realInput';

const FAKE_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwicm9sZSI6ImZsYXQifQ.fake';

const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, -1], [-1, 1]];

function findWordCells(grid, word) {
  const H = grid.length;
  const W = grid[0].length;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (grid[r][c] !== word[0]) continue;
      for (const [dr, dc] of DIRS) {
        const cells = [];
        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || rr >= H || cc < 0 || cc >= W || grid[rr][cc] !== word[i]) { ok = false; break; }
          cells.push([rr, cc]);
        }
        if (ok) return cells;
      }
    }
  }
  return null;
}

describe('word search diagnosis', () => {
  it('reports cells, words, and whether a sweep registers', () => {
    cy.intercept('GET', '**/api/social/games*', { statusCode: 503, body: {} });
    cy.intercept('GET', '**/api/social/auth/me', {
      statusCode: 200,
      body: { success: true, data: { id: 1, username: 'testuser', role: 'flat' } },
    });
    cy.intercept('GET', '**/api/social/feed*', { statusCode: 200, body: { success: true, data: [] } });
    cy.intercept('GET', '**/api/social/notifications*', {
      statusCode: 200, body: { success: true, data: [], meta: { total: 0 } },
    });

    const rep = {};
    cy.visit('/social/games/word-search', {
      failOnStatusCode: false,
      onBeforeLoad(win) { win.localStorage.setItem('access_token', FAKE_TOKEN); },
    });
    cy.get('#root', { timeout: 120000 }).should('exist');
    cy.contains(/play solo/i, { timeout: 120000 }).click({ force: true });
    cy.get('[data-testid="engine-word_search"]', { timeout: 60000 }).should('exist');
    cy.wait(3000);

    cy.window().then((win) => calibrate(win).then((map) => {
      rep.scale = map.scale;
      cy.get('[data-testid="engine-word_search"]').then(($root) => {
        const root = $root[0];
        const withDown = Array.from(root.querySelectorAll('*')).filter((d) => {
          const k = Object.keys(d).find((x) => x.startsWith('__reactProps$'));
          return k && typeof d[k].onMouseDown === 'function';
        });
        const withEnter = Array.from(root.querySelectorAll('*')).filter((d) => {
          const k = Object.keys(d).find((x) => x.startsWith('__reactProps$'));
          return k && typeof d[k].onMouseEnter === 'function';
        });
        rep.cellsWithMouseDown = withDown.length;
        rep.cellsWithMouseEnter = withEnter.length;

        const size = Math.round(Math.sqrt(withDown.length));
        rep.derivedSize = size;
        const grid = [];
        for (let r = 0; r < size; r++) {
          grid.push(withDown.slice(r * size, r * size + size)
            .map((el) => (el.innerText || '').trim().toUpperCase()));
        }
        rep.firstRow = grid[0];
        const listed = (root.innerText || '').toUpperCase().match(/[A-Z]{3,}/g) || [];
        rep.listedTokens = Array.from(new Set(listed)).slice(0, 20);
        rep.locatable = rep.listedTokens.filter((w) => findWordCells(grid, w));
        rep.counterBefore = (root.innerText || '').match(/\d+\s*\/\s*\d+\s*words found/i)?.[0] || 'n/a';

        // Sweep exactly ONE word, the first locatable one, and see if the
        // counter moves. One word is enough to tell a working drag from a
        // broken one, and keeps the failure readable.
        const word = rep.locatable[0];
        rep.swept = word || null;
        if (word) {
          const cells = findWordCells(grid, word);
          const at = (r, c) => withDown[r * size + c];
          const pt = (r, c) => {
            const b = at(r, c).getBoundingClientRect();
            return map(b.left + b.width / 2, b.top + b.height / 2);
          };
          const p0 = pt(cells[0][0], cells[0][1]);
          cy.wrap(null, { log: false })
            .then(() => cdpMouse('mouseMoved', p0.x, p0.y, { button: 'none', buttons: 0 }))
            .then(() => cdpMouse('mousePressed', p0.x, p0.y));
          cells.forEach(([rr, cc]) => {
            cy.wrap(null, { log: false }).then(() => {
              const q = pt(rr, cc);
              return cdpMouse('mouseMoved', q.x, q.y);
            });
          });
          cy.wrap(null, { log: false }).then(() => {
            const last = cells[cells.length - 1];
            const q = pt(last[0], last[1]);
            return cdpMouse('mouseReleased', q.x, q.y);
          });
        }
      });
    }));

    cy.wait(2500);
    cy.get('[data-testid="engine-word_search"]').then(($root) => {
      rep.counterAfter = ($root[0].innerText || '').match(/\d+\s*\/\s*\d+\s*words found/i)?.[0] || 'n/a';
      cy.writeFile('cypress/results/wordsearch-diagnosis.json', rep, { log: false });
    });
  });
});
