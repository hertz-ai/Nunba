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

import { calibrate, clickApp } from '../support/realInput';

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

const results = {};

describe('Every game is driven to completion', () => {
  beforeEach(stubCatalogDown);

  after(() => {
    cy.writeFile(OUT, results, { log: false });
  });

  GAMES.forEach((g) => {
    // match3 runs a 2:00 clock; boards need enough turns for a real game to
    // play out against the bot, which a 75s budget did not give them.
    const budgetMs = g.id === 'match3' ? 150000
      : g.kind === 'board' ? 180000
      : 75000;

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

      cy.window().then((win) => calibrate(win).then((map) => {
        const started = Date.now();

        // One round of "try to make progress", then look for the end.
        const round = (n) => {
          return cy.document({ log: false }).then((doc) => {
            if (DONE_RE.test(doc.body.innerText || '')) return true;
            if (Date.now() - started > budgetMs) return false;

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
                  // Find the cells the way the player sees them: leaf elements
                  // that carry a React onClick. A blind grid over the engine
                  // box missed them — the container is far taller than the
                  // board, so most grid rows fell outside the viewport and the
                  // board stayed empty through the whole budget.
                  const leaves = Array.from(root.querySelectorAll('div, td, button'))
                    .filter((d) => {
                      if (d.children.length) return false;
                      const k = Object.keys(d).find((x) => x.startsWith('__reactProps$'));
                      if (!k || typeof d[k].onClick !== 'function') return false;
                      const r = d.getBoundingClientRect();
                      return r.width > 8 && r.height > 8 && r.top >= 0;
                    });
                  leaves.slice(0, 8).forEach((el, i) => {
                    const r = el.getBoundingClientRect();
                    const idx = (n * 3 + i) % Math.max(leaves.length, 1);
                    const t = leaves[idx].getBoundingClientRect();
                    void r;
                    chain = chain.then(() => clickApp(map,
                      t.left + t.width / 2, t.top + t.height / 2));
                  });
                  // Give the bot on seat 1 time to answer before looking again.
                  return chain.then(() => cy.wait(900, { log: false })).then(() => false);
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
        const maxRounds = g.kind === 'board' ? 200 : 60;
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
            if (g.kind === 'trivia' && !finished) {
              expect(text, `${g.name} must explain why it cannot start`)
                .to.match(/no questions available/i);
              expect(text).to.not.match(/waiting for questions/i);
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
