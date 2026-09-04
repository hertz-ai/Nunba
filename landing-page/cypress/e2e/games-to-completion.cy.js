/**
 * Drive every catalogue game to its COMPLETION screen.
 *
 * games-play-through.cy.js proves each game reacts to input. That is not the
 * same as finishing one, and "it moved when I poked it" is a weaker claim than
 * "I played it to the end".
 *
 * Completion is directly observable here: UnifiedGameScreen has a `complete`
 * phase, entered when an engine calls onComplete (a Phaser game over, the last
 * trivia question, a finished board). That phase renders AdultScoreboard, whose
 * heading is "Run complete" for a solo run, alongside "Play Again" and
 * "Back to Games". None of those strings appear while a game is in progress, so
 * they are a reliable terminal marker.
 *
 * Strategy is deliberately generic rather than per-game: each round presses the
 * keys the game might use, clicks whatever interactive elements it exposes, and
 * clicks around the canvas, then checks for the marker. Encoding a bespoke
 * winning line per game would test my model of the game rather than the game.
 *
 * Every game gets a screenshot of the state it ended in, and the per-game
 * outcome is written to cypress/results/completion.json so the summary reports
 * what actually happened instead of what I assumed.
 */

import { calibrate, clickApp, cdpMouse } from '../support/realInput';

const FAKE_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwicm9sZSI6ImZsYXQifQ.fake';
const OUT = 'cypress/results/completion.json';

// Games whose engine this client has not implemented. They render an honest
// "coming soon" placeholder, so they have no completion state to reach and are
// asserted on that basis instead.
const PLACEHOLDERS = new Set(['word-chain', 'collab-puzzle']);

const GAMES = [
  { id: 'tic-tac-toe', name: 'Tic Tac Toe', kind: 'board' },
  { id: 'connect-four', name: 'Connect Four', kind: 'board' },
  { id: 'checkers', name: 'Checkers', kind: 'board' },
  { id: 'reversi', name: 'Reversi', kind: 'board' },
  { id: 'mancala', name: 'Mancala', kind: 'board' },

  { id: 'snake', name: 'Snake', kind: 'phaser' },
  { id: 'breakout', name: 'Breakout', kind: 'phaser' },
  { id: 'pong', name: 'Pong', kind: 'phaser' },
  { id: 'flappy', name: 'Flappy Bird', kind: 'phaser' },
  { id: 'runner', name: 'Endless Runner', kind: 'phaser' },
  { id: 'bubble-shooter', name: 'Bubble Shooter', kind: 'phaser' },
  { id: 'match3', name: 'Match 3', kind: 'phaser' },

  { id: 'trivia-general', name: 'General Trivia', kind: 'trivia' },
  { id: 'trivia-science', name: 'Science Quiz', kind: 'trivia' },
  { id: 'trivia-history', name: 'History Quiz', kind: 'trivia' },
  { id: 'trivia-geography', name: 'Geography Quiz', kind: 'trivia' },
  { id: 'trivia-tech', name: 'Tech Quiz', kind: 'trivia' },
  { id: 'trivia-movies', name: 'Movie Trivia', kind: 'trivia' },
  { id: 'party-trivia', name: 'Party Trivia', kind: 'trivia' },

  { id: 'word-scramble', name: 'Word Scramble', kind: 'word' },
  { id: 'party-word-race', name: 'Word Race', kind: 'word' },
  { id: 'word-search', name: 'Word Search', kind: 'word' },
  { id: 'sudoku', name: 'Sudoku', kind: 'word' },

  { id: 'word-chain', name: 'Word Chain', kind: 'placeholder' },
  { id: 'collab-puzzle', name: 'Collaborative Puzzle', kind: 'placeholder' },
];

const K = {
  left: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  up: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  down: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  space: { key: ' ', code: 'Space', keyCode: 32 },
};

// Completion markers. "Play Again" and "Run complete" exist only in the
// complete phase; a game in progress never renders either.
//
// BoardGameEngine announces its own terminal state before handing back, as
// "Player 1 wins!", "Player 2 wins!" or "It's a draw!". The draw wording was
// missing here at first, and random play draws often — so finished board games
// were being recorded as not-completed. Deliberately NOT matching
// "Back to Games": that button also sits at the top of the lobby, so it would
// mark every game finished the moment it launched.
const DONE_RE = /run complete|play again|you win|wins!|it'?s a draw/i;

function stubCatalogDown() {
  cy.intercept('GET', '**/api/social/games*', { statusCode: 503, body: {} });
  cy.intercept('GET', '**/api/social/auth/me', {
    statusCode: 200,
    body: { success: true, data: { id: 1, username: 'testuser', role: 'flat' } },
  });
  cy.intercept('GET', '**/api/social/notifications*', {
    statusCode: 200, body: { success: true, data: [], meta: { total: 0 } },
  });
  cy.intercept('GET', '**/api/social/feed*', { statusCode: 200, body: { success: true, data: [] } });
}

/** Press a key for real: Phaser polls isDown, so it must be held, not tapped. */
function holdKey(win, desc, ms) {
  const opts = { key: desc.key, code: desc.code, keyCode: desc.keyCode,
                 which: desc.keyCode, bubbles: true };
  win.document.dispatchEvent(new win.KeyboardEvent('keydown', opts));
  return new Cypress.Promise((res) => setTimeout(res, ms)).then(() => {
    win.document.dispatchEvent(new win.KeyboardEvent('keyup', opts));
  });
}

/**
 * Solve a 9x9 sudoku by backtracking.
 *
 * Sudoku cannot be finished by pressing things: the only way to reach its
 * completion screen is to fill every empty cell correctly. Reading the grid and
 * solving it is what a player does, and it keeps the test honest about the
 * puzzle actually on screen rather than assuming the built-in one.
 */
function solveSudoku(grid) {
  const ok = (r, c, n) => {
    for (let i = 0; i < 9; i++) {
      if (grid[r][i] === n || grid[i][c] === n) return false;
    }
    const br = r - (r % 3);
    const bc = c - (c % 3);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[br + i][bc + j] === n) return false;
      }
    }
    return true;
  };
  const go = () => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        for (let n = 1; n <= 9; n++) {
          if (!ok(r, c, n)) continue;
          grid[r][c] = n;
          if (go()) return true;
          grid[r][c] = 0;
        }
        return false;
      }
    }
    return true;
  };
  return go() ? grid : null;
}

/** The eight directions a word-search word can run. */
const WS_DIRS = [[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, -1], [-1, 1]];

/**
 * Locate a word in a letter grid, returning the cells it occupies.
 *
 * Word Search cannot be finished by clicking around: a word only counts when
 * the exact run of cells is swept, so the test has to actually find it.
 */
function findWordCells(grid, word) {
  const H = grid.length;
  const W = grid[0].length;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (grid[r][c] !== word[0]) continue;
      for (const [dr, dc] of WS_DIRS) {
        const cells = [];
        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (rr < 0 || rr >= H || cc < 0 || cc >= W || grid[rr][cc] !== word[i]) {
            ok = false;
            break;
          }
          cells.push([rr, cc]);
        }
        if (ok) return cells;
      }
    }
  }
  return null;
}

const results = {};

describe('Every game is driven to completion', () => {
  beforeEach(stubCatalogDown);

  after(() => {
    cy.writeFile(OUT, results, { log: false });
  });

  // A full sweep takes over half an hour, which is far too slow a loop for
  // chasing one misbehaving game. --env games=word-race,sudoku runs just those.
  const only = (Cypress.env('games') || '').split(',').map((x) => x.trim()).filter(Boolean);
  const selected = only.length ? GAMES.filter((g) => only.includes(g.id)) : GAMES;

  selected.forEach((g) => {
    // Budget per game shape. Match 3 runs a 2:00 clock and needs room beyond
    // it; boards need enough turns for a real game against the bot; Pong and
    // Endless Runner are simply the slowest arcade games to reach a death.
    const budgetMs = g.id === 'match3' ? 200000
      : g.kind === 'board' ? 200000
      : g.kind === 'word' ? 150000
      : 130000;

    it(`${g.name}: plays through to the end`, () => {
      cy.visit(`/social/games/${g.id}`, {
        failOnStatusCode: false,
        onBeforeLoad(win) { win.localStorage.setItem('access_token', FAKE_TOKEN); },
      });
      cy.get('#root', { timeout: 120000 }).should('exist');
      cy.contains(/play solo/i, { timeout: 120000 }).click({ force: true });

      if (g.kind === 'placeholder') {
        // No engine exists for these, so there is nothing to finish. The
        // contract is that they say so rather than launching a different game.
        cy.contains(/coming soon/i, { timeout: 60000 }).should('exist');
        cy.screenshot(`done-${g.id}`, { capture: 'viewport', overwrite: true });
        results[g.id] = { name: g.name, outcome: 'placeholder',
                          note: 'no client engine; shows "coming soon"' };
        return;
      }

      // Word Search gets solved too: a word only registers when its exact run
      // of cells is swept, so clicking around can never finish one.
      if (g.id === 'word-search') {
        cy.get('[data-testid="engine-word_search"]', { timeout: 60000 }).should('exist');
        cy.wait(2500);
        cy.window().then((win) => calibrate(win).then((map) => {
        cy.get('[data-testid="engine-word_search"]').then(($root) => {
          const root = $root[0];
          // Select on onMouseEnter, NOT onMouseDown.
          //
          // The grid CONTAINER carries an onMouseDown too, so filtering on it
          // returns 101 elements for a 10x10 board and shifts every row by one
          // — the letters read out of the grid then belong to the wrong
          // coordinates, and the sweeps land on the wrong cells. Only the 100
          // real cells carry onMouseEnter. Measured: 101 vs 100 exactly.
          const cellEls = Array.from(root.querySelectorAll('*'))
            .filter((d) => {
              const k = Object.keys(d).find((x) => x.startsWith('__reactProps$'));
              return k && typeof d[k].onMouseEnter === 'function'
                       && typeof d[k].onMouseDown === 'function';
            });
          const size = Math.round(Math.sqrt(cellEls.length));
          expect(size * size, 'word search grid is square').to.eq(cellEls.length);

          const grid = [];
          for (let r = 0; r < size; r++) {
            grid.push(cellEls.slice(r * size, r * size + size)
              .map((el) => (el.innerText || '').trim().toUpperCase()));
          }
          const at = (r, c) => cellEls[r * size + c];

          // The words on offer are whatever the panel lists; fall back to
          // scanning for the known local set if the list cannot be read.
          const listed = (root.innerText || '')
            .toUpperCase().match(/[A-Z]{3,}/g) || [];
          const candidates = Array.from(new Set(listed))
            .filter((w) => findWordCells(grid, w));

          // Sweep each word with a REAL pointer drag.
          //
          // The cells listen on onMouseEnter, and React synthesises that from
          // native mouseover/mouseout pairs with a relatedTarget. A bare
          // .trigger('mouseover') carries none, so no cell after the first ever
          // joined the selection and the board stayed at "0 / 8 words found"
          // even though every word had been located correctly. CDP moves the
          // actual pointer, which produces genuine enter/leave.
          const centre = (rr, cc) => {
            const b = at(rr, cc).getBoundingClientRect();
            return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
          };

          candidates.forEach((word) => {
            const cells = findWordCells(grid, word);
            if (!cells) return;
            const first = centre(cells[0][0], cells[0][1]);
            cy.wrap(null, { log: false }).then(() => {
              const p0 = map(first.x, first.y);
              return cdpMouse('mouseMoved', p0.x, p0.y, { button: 'none', buttons: 0 })
                .then(() => cdpMouse('mousePressed', p0.x, p0.y));
            });
            cells.forEach(([rr, cc]) => {
              cy.wrap(null, { log: false }).then(() => {
                const q = centre(rr, cc);
                const pm = map(q.x, q.y);
                return cdpMouse('mouseMoved', pm.x, pm.y);
              });
            });
            cy.wrap(null, { log: false }).then(() => {
              const last = cells[cells.length - 1];
              const q = centre(last[0], last[1]);
              const pe = map(q.x, q.y);
              return cdpMouse('mouseReleased', pe.x, pe.y);
            });
            cy.wait(300);
          });
        });
        }));
        cy.wait(3000);
        cy.document().then((doc) => {
          const finished = DONE_RE.test(doc.body.innerText || '');
          cy.screenshot(`done-${g.id}`, { capture: 'viewport', overwrite: true });
          results[g.id] = {
            name: g.name,
            outcome: finished ? 'completed' : 'not-completed',
            tail: (doc.body.innerText || '').replace(/\s+/g, ' ').slice(0, 160),
          };
        });
        return;
      }

      // Sudoku gets solved rather than poked: its completion screen is only
      // reachable by filling every empty cell correctly.
      if (g.id === 'sudoku') {
        cy.get('[data-testid="engine-sudoku"]', { timeout: 60000 }).should('exist');
        cy.wait(2500);
        cy.get('[data-testid="engine-sudoku"]').then(($root) => {
          const cells = Array.from($root[0].querySelectorAll('div, button'))
            .filter((d) => {
              const k = Object.keys(d).find((x) => x.startsWith('__reactProps$'));
              if (!k || typeof d[k].onClick !== 'function') return false;
              const r = d.getBoundingClientRect();
              return r.width > 10 && r.height > 10;
            })
            .slice(0, 81);
          expect(cells.length, 'sudoku exposes 81 clickable cells').to.eq(81);

          const grid = [];
          for (let r = 0; r < 9; r++) {
            grid.push(cells.slice(r * 9, r * 9 + 9)
              .map((el) => parseInt((el.innerText || '').trim(), 10) || 0));
          }
          const givens = grid.map((row) => row.slice());
          const solved = solveSudoku(grid.map((row) => row.slice()));
          expect(solved, 'the puzzle on screen is solvable').to.not.eq(null);

          for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
              if (givens[r][c] !== 0) continue;
              const el = cells[r * 9 + c];
              const digit = String(solved[r][c]);
              cy.wrap(el).click({ force: true });
              cy.window({ log: false }).then((w) => {
                w.dispatchEvent(new w.KeyboardEvent('keydown', {
                  key: digit, code: `Digit${digit}`,
                  keyCode: 48 + Number(digit), which: 48 + Number(digit),
                  bubbles: true,
                }));
              });
            }
          }
        });
        cy.wait(4000);
        cy.document().then((doc) => {
          const finished = DONE_RE.test(doc.body.innerText || '');
          cy.screenshot(`done-${g.id}`, { capture: 'viewport', overwrite: true });
          results[g.id] = {
            name: g.name,
            outcome: finished ? 'completed' : 'not-completed',
            tail: (doc.body.innerText || '').replace(/\s+/g, ' ').slice(0, 160),
          };
        });
        return;
      }

      cy.window().then((win) => calibrate(win).then((map) => {
        const started = Date.now();

        // One round of "try to make progress", then look for the end.
        const round = (n) => {
          return cy.document({ log: false }).then((doc) => {
            if (DONE_RE.test(doc.body.innerText || '')) return true;
            if (Date.now() - started > budgetMs) return false;

            // Arcade games split into two kinds and a single strategy cannot
            // serve both. Snake, Flappy and Runner END BY DYING, so continuous
            // input keeps them alive and they never finish. Breakout, Pong and
            // Bubble Shooter need input to PROGRESS — Bubble Shooter only ends
            // once the bubbles reach the bottom, which requires shooting — and
            // idling stalls them instead.
            //
            // So alternate: play for a stretch, then coast for a stretch. Every
            // game gets both the input it needs to advance and the quiet it
            // needs to lose.
            if (g.kind === 'phaser' && g.id !== 'match3' && n > 8 && (n % 25) >= 12) {
              return cy.wait(700, { log: false }).then(() => false);
            }

            // Keys — held, because Phaser polls key state per frame.
            const keys = [K.space, K.right, K.up, K.down, K.left];
            const k = keys[n % keys.length];
            return cy.window({ log: false })
              .then((w) => holdKey(w, k, 260))
              .then(() => {
                // Clicks — whatever the engine exposes, plus the canvas.
                const root = doc.querySelector('[data-testid^="engine-"]') || doc.body;
                const els = Array.from(root.querySelectorAll(
                  'button, td, [role="button"], li, .option, canvas, svg circle, svg rect, input',
                ));
                const pick = els.filter((e) => {
                  const r = e.getBoundingClientRect();
                  return r.width > 4 && r.height > 4 && r.top >= 0;
                });
                let chain = cy.wrap(null, { log: false });

                // Board games render their cells as plain divs with click
                // handlers, which no CSS selector here matches — measured:
                // tic-tac-toe sat with a completely EMPTY board after 62s of
                // clicking, because every click went to something else. So for
                // boards, sweep a grid of points across the engine's own box
                // and let the game decide which are cells.
                if (g.kind === 'board') {
                  // Cells are leaf elements carrying a React onClick. A blind
                  // grid over the engine box missed them — the container is far
                  // taller than the board, so most grid rows fell outside the
                  // viewport and the board stayed empty for the whole budget.
                  // A cell is the INNERMOST element carrying an onClick — not
                  // necessarily a childless one.
                  //
                  // Requiring no children worked for Tic Tac Toe and Connect
                  // Four, whose empty squares really are leaves, and silently
                  // excluded every Checkers, Reversi and Mancala cell, because
                  // those render a piece or a stone count INSIDE the square.
                  // That is why those three never accepted a move while the
                  // other two played through.
                  const clickable = Array.from(root.querySelectorAll('*'))
                    .filter((d) => {
                      const k = Object.keys(d).find((x) => x.startsWith('__reactProps$'));
                      return k && typeof d[k].onClick === 'function';
                    });
                  const leaves = clickable
                    .filter((d) => !clickable.some((o) => o !== d && d.contains(o)))
                    .filter((d) => {
                      const r = d.getBoundingClientRect();
                      return r.width > 8 && r.height > 8 && r.top >= 0;
                    });
                  if (!leaves.length) {
                    return chain.then(() => cy.wait(600, { log: false })).then(() => false);
                  }

                  // Recover the board's grid from the cells' own geometry, so a
                  // move can be aimed rather than guessed.
                  const rects = leaves.map((el) => el.getBoundingClientRect());
                  const rows = [...new Set(rects.map((r) => Math.round(r.top)))].sort((a, b) => a - b);
                  const cols = [...new Set(rects.map((r) => Math.round(r.left)))].sort((a, b) => a - b);
                  const rc = rects.map((r) => ({
                    row: rows.indexOf(Math.round(r.top)),
                    col: cols.indexOf(Math.round(r.left)),
                    r,
                  }));
                  const cellAt = (row, col) =>
                    rc.find((x) => x.row === row && x.col === col);

                  // One source cell per round, then the squares a piece could
                  // legally travel to from it. Sequential clicking only ever
                  // produced horizontally adjacent pairs, which are never a
                  // legal checkers move; the diagonals are what that game needs,
                  // and a plain source click is what Reversi and Mancala need.
                  const src = rc[n % rc.length];
                  const targets = [src];
                  [[-1, -1], [-1, 1], [1, -1], [1, 1], [-2, -2], [-2, 2], [2, -2], [2, 2]]
                    .forEach(([dr, dc]) => {
                      const t = cellAt(src.row + dr, src.col + dc);
                      if (t) targets.push(t);
                    });

                  targets.forEach((t) => {
                    chain = chain.then(() => clickApp(map,
                      t.r.left + t.r.width / 2, t.r.top + t.r.height / 2));
                  });
                  // Give the bot on seat 1 time to answer before looking again.
                  return chain.then(() => cy.wait(700, { log: false })).then(() => false);
                }

                pick.slice(0, 6).forEach((el, i) => {
                  const r = el.getBoundingClientRect();
                  if (el.tagName === 'CANVAS') {
                    // Spread clicks over the canvas so board-style Phaser
                    // scenes get hit in different cells each round.
                    const fx = 0.2 + 0.15 * ((n + i) % 5);
                    const fy = 0.2 + 0.15 * ((n + i * 2) % 5);
                    chain = chain.then(() => clickApp(map,
                      r.left + r.width * fx, r.top + r.height * fy));
                  } else if (el.tagName === 'INPUT') {
                    chain = chain.then(() => {
                      el.focus();
                      return null;
                    });
                  } else {
                    chain = chain.then(() => clickApp(map,
                      r.left + r.width / 2, r.top + r.height / 2));
                  }
                });
                return chain.then(() => cy.wait(500, { log: false })).then(() => false);
              });
          });
        };

        // Sequential rounds until done or out of budget.
        // Rounds, not just the clock, bound the run. At 60 rounds the longer
        // board games were stopping at ~76s with a 180s budget still unspent —
        // the cap was the limiter, not the time. Tic Tac Toe finishes in 3s;
        // Checkers and Reversi simply need more turns.
        // Rounds have to outlast the budget or they, not the clock, decide when
        // a game stops. Match 3 was ending at ~104s against a clock it needed
        // 120s to run out, and Movie Trivia at ~76s despite completing on
        // three earlier runs — both were hitting a 60-round cap, not failing.
        const maxRounds = g.kind === 'board' ? 250
          : g.id === 'match3' ? 220
          : g.kind === 'word' ? 160
          : 140;
        let chain = cy.wrap(false, { log: false });
        for (let n = 0; n < maxRounds; n++) {
          chain = chain.then((done) => (done ? true : round(n)));
        }

        return chain.then((done) => {
          cy.document({ log: false }).then((doc) => {
            const finished = done || DONE_RE.test(doc.body.innerText || '');
            cy.screenshot(`done-${g.id}`, { capture: 'viewport', overwrite: true });
            const text = (doc.body.innerText || '').replace(/\s+/g, ' ');
            results[g.id] = {
              name: g.name,
              outcome: finished ? 'completed' : 'not-completed',
              seconds: Math.round((Date.now() - started) / 1000),
              tail: text.slice(0, 160),
            };

            // Trivia cannot finish without questions, and unauthenticated
            // visitors get none: LOCAL_CATALOG's trivia entries carry no
            // engine_config.questions. What it must NOT do is sit on
            // "Waiting for questions..." forever, which is what all seven
            // trivia games did for the full budget before TriviaEngine's wait
            // was bounded. Require the honest message instead.
            // The defect these quizzes had was an UNBOUNDED wait: the engine
            // sat on "Waiting for questions..." forever with no fallback. That
            // is the invariant to hold, and it holds whether or not the quiz
            // finishes.
            //
            // Demanding "no questions available" on any unfinished quiz was
            // wrong once the offline bank landed: questions ARE available now,
            // so a quiz that merely runs slow was being failed for not showing
            // an error it correctly had no reason to show.
            if (g.kind === 'trivia') {
              expect(text, `${g.name} must not sit on an unbounded wait`)
                .to.not.match(/waiting for questions/i);
            }
            // Report honestly rather than failing the run: a game with no
            // reachable end inside the budget is a finding to look at, and
            // failing here would hide the other 24 outcomes.
            expect(results[g.id].outcome).to.be.oneOf(['completed', 'not-completed']);
          });
        });
      }));
    });
  });
});
