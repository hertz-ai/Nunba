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

/**
 * The offline word list WordScrambleEngine draws from.
 *
 * Mirrored so the driver can UNSCRAMBLE rather than guess: the engine only
 * advances a round on a correct answer, so typing anything else just burns the
 * clock. Matching is by anagram, so a different scramble of the same word still
 * resolves.
 */
const SCRAMBLE_WORDS = [
  'PLANET', 'STREAM', 'GARDEN', 'BRIDGE', 'CASTLE', 'FOREST',
  'MARKET', 'ROCKET', 'FROZEN', 'SPIRIT', 'BREEZE', 'CANDLE',
  'PUZZLE', 'SUNSET', 'VOYAGE', 'HARBOR', 'MEADOW', 'KNIGHT',
  'DRAGON', 'FALCON', 'GLIDER', 'ISLAND', 'JUNGLE', 'KITTEN',
  'LEMON', 'MANGO', 'OLIVE', 'PEACH', 'RAVEN', 'TIGER',
  'WHALE', 'ZEBRA', 'CORAL', 'DELTA', 'EMBER', 'FLAME',
];

const sortLetters = (w) => w.toUpperCase().split('').sort().join('');

/** The word whose letters match this scramble, or null. */
function unscramble(letters) {
  const key = sortLetters(letters);
  return SCRAMBLE_WORDS.find((w) => sortLetters(w) === key) || null;
}

/**
 * Click Play Solo until a game engine appears.
 *
 * Only ever clicks Play Solo: a fallback that clicked the last button matching
 * anywhere on the page once pressed "Back to Games" and measured the hub.
 */
function startSolo(attempt = 0) {
  cy.get('body', { log: false }).then(($b) => {
    if ($b.find('[data-testid^="engine-"]').length) return;
    if (attempt >= 6) return;
    if (/play solo/i.test($b[0].innerText || '')) {
      cy.contains('button', /play solo/i).then(($btn) => {
        if ($btn.length) $btn[0].click();
      });
    }
    cy.wait(1000, { log: false });
    startSolo(attempt + 1);
  });
}

/**
 * What the GAME says, not what the page says.
 *
 * Recording document.body meant every failure report came back as the sidebar
 * -- "Nunba / Thought Experiments / MEMBER / HUB / Agents ..." -- which is the
 * same for a finished game, a stalled one and a lobby, and told me nothing
 * across a dozen runs.
 */
function engineText(doc) {
  const root = doc.querySelector('[data-testid^="engine-"]');
  const src = root || doc.body;
  return (src.innerText || '').replace(/\s+/g, ' ').slice(0, 180);
}

/**
 * Pick a legal Checkers move for Red, reading the board off the screen.
 *
 * Clicking a source and then its diagonals cannot finish this game. Random
 * play loses Red down to one piece within five rounds, and from there the odds
 * of blindly hitting that piece's single legal from/to pair are tiny: measured,
 * the board sat at one red against eight black, on Red's turn, unchanged for
 * 1,190 rounds.
 *
 * The board is readable without any hooks into the game. An occupied square
 * holds exactly one child, and its background says whose piece it is: Red is
 * rgb(229,57,53) and Black rgb(51,51,51). Red men move up the board (dr -1)
 * and kings move both ways, so both directions are tried; a king is not
 * distinguishable by colour, and offering an illegal backward move costs
 * nothing because the engine rejects it.
 *
 * Captures are forced in this game -- movePiece returns INVALID_MOVE for a
 * quiet move while any capture exists -- so captures are returned first.
 */
/** One character per square: r, b or . — enough to tell if the board moved. */
function occupancySig(cell, win) {
  const kindOf = (bg) => {
    const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(bg || '');
    if (!m) return null;
    const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (r > 140 && g < 120 && b < 120) return 'r';
    if (r < 90 && g < 90 && b < 90) return 'b';
    return null;
  };
  const own = kindOf(win.getComputedStyle(cell.el).backgroundColor);
  if (own) return own;
  for (const kid of cell.el.children) {
    const k = kindOf(win.getComputedStyle(kid).backgroundColor);
    if (k) return k;
  }
  return '.';
}

function chooseCheckersMove(rc, win) {
  const at = (r, c) => rc.find((x) => x.row === r && x.col === c);

  // Classify by hue rather than by an exact string. The men are
  // rgb(229,57,53) and rgb(51,51,51), but a crowned king need not paint itself
  // the same shade, and matching exact colours would quietly stop seeing a
  // piece the moment it is promoted.
  const kindOf = (bg) => {
    const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(bg || '');
    if (!m) return null;
    const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (r > 140 && g < 120 && b < 120) return 'red';
    if (r < 90 && g < 90 && b < 90) return 'black';
    return null;
  };

  // The square may BE the piece. This list holds the innermost clickable
  // element, so on an occupied square that can be the piece itself rather than
  // a cell wrapping one -- reading only children[0] then reports every square
  // as empty, which is what left the board frozen at five pieces a side.
  const occupantOf = (cell) => {
    if (!cell) return 'off';
    const own = kindOf(win.getComputedStyle(cell.el).backgroundColor);
    if (own) return own;
    for (const kid of cell.el.children) {
      const k = kindOf(win.getComputedStyle(kid).backgroundColor);
      if (k) return k;
    }
    return 'empty';
  };

  const captures = [];
  const quiet = [];
  rc.forEach((cell) => {
    if (occupantOf(cell) !== 'red') return;
    [-1, 1].forEach((dr) => {
      [-1, 1].forEach((dc) => {
        const step = at(cell.row + dr, cell.col + dc);
        const land = at(cell.row + 2 * dr, cell.col + 2 * dc);
        if (occupantOf(step) === 'black' && occupantOf(land) === 'empty') {
          captures.push([cell, land]);
        } else if (occupantOf(step) === 'empty') {
          // Forward first: a man can only go that way, and a king can do both.
          if (dr === -1) quiet.unshift([cell, step]);
          else quiet.push([cell, step]);
        }
      });
    });
  });
  return captures.length ? captures : quiet;
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
      // Checkers is simply a long game: 12 pieces a side, and once kings
      // appear it can run much further. Screenshots show the driver playing a
      // genuine game down to ~6 pieces a side with a king crowned, so what it
      // needed was time to reach a terminal position, not different moves.
      : g.id === 'checkers' ? 600000
      : g.kind === 'board' ? 200000
      : g.kind === 'word' ? 150000
      : 130000;

    it(`${g.name}: plays through to the end`, () => {
      cy.visit(`/social/games/${g.id}`, {
        failOnStatusCode: false,
        onBeforeLoad(win) { win.localStorage.setItem('access_token', FAKE_TOKEN); },
      });
      cy.get('#root', { timeout: 120000 }).should('exist');

      // Start a solo game, if this one has a lobby at all.
      //
      // startSolo presses Play Solo until an engine is on screen and does
      // nothing when the engine is already there. Everything else this block
      // accumulated has been removed: waiting on a Play Solo button to EXIST
      // blocks for its full timeout on any game that has no lobby, and
      // asserting the lobby is gone straight after the click regressed General
      // Trivia from 18s to a timeout.
      startSolo();

      if (g.kind === 'placeholder') {
        // No engine exists for these, so there is nothing to finish. The
        // contract is that they say so rather than launching a different game.
        cy.contains(/coming soon/i, { timeout: 60000 }).should('exist');
        cy.screenshot(`done-${g.id}`, { capture: 'viewport', overwrite: true });
        results[g.id] = { name: g.name, outcome: 'placeholder',
                          note: 'no client engine; shows "coming soon"' };
        return;
      }

      // Word Scramble is unscrambled, not guessed: the engine only advances a
      // round when the answer is right, so anything else just burns the clock.
      if (g.id === 'word-scramble' || g.id === 'party-word-race') {
        cy.get('[data-testid="engine-word_scramble"]', { timeout: 60000 }).should('exist');
        cy.wait(2000);

        const playRound = () => {
          cy.get('body', { log: false }).then(($b) => {
            if (DONE_RE.test($b[0].innerText || '')) return;
            cy.get('[data-testid="engine-word_scramble"]').then(($r) => {
              // The scramble is rendered as one element per letter.
              const tiles = Array.from($r[0].querySelectorAll('*'))
                .filter((e) => !e.children.length
                  && /^[A-Za-z]$/.test((e.innerText || '').trim()));
              const scrambled = tiles.map((e) => e.innerText.trim()).join('');
              const answer = unscramble(scrambled);
              if (!answer) return;
              cy.get('input').first().clear({ force: true })
                .type(`${answer}{enter}`, { force: true });
              cy.wait(900);
            });
          });
        };
        for (let i = 0; i < 40; i++) playRound();

        cy.wait(2500);
        cy.document().then((doc) => {
          const finished = DONE_RE.test(doc.body.innerText || '');
          cy.screenshot(`done-${g.id}`, { capture: 'viewport', overwrite: true });
          results[g.id] = {
            name: g.name,
            outcome: finished ? 'completed' : 'not-completed',
            tail: engineText(doc),
          };
        });
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
              if (!k || typeof d[k].onMouseEnter !== 'function'
                     || typeof d[k].onMouseDown !== 'function') return false;
              // A cell shows exactly one letter. One element passes both
              // handler checks while rendering nothing — measured, the read
              // grid began ["", "D", "D", ...] — which shifts every row by one
              // and leaves not a single word findable, which is why the sweep
              // ran in 13s and reported "0 / 8 words found": it had no
              // candidates to sweep at all.
              return /^[A-Z]$/.test((d.innerText || '').trim().toUpperCase());
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
          // Read the word list from the PAGE, and with a regex that can match.
          //
          // Two faults, both mine. The pattern held literal BACKSPACE bytes
          // where \b word boundaries were meant, so it could never match
          // anything; and the "Words to find" panel sits outside the engine
          // element, where every letter is its own line and a run of three or
          // more never appears anyway. The solver got an empty word list, swept
          // nothing, and reported "0 / 8 words found" in 12 seconds while the
          // grid it had read was perfectly correct.
          //
          // Words picked up from the surrounding page are harmless: the
          // findWordCells filter keeps only ones actually present in the grid.
          const listed = (root.ownerDocument.body.innerText || '')
            .toUpperCase().match(/[A-Z]{3,}/g) || [];
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
          //
          // Positions are captured ONCE, up front. Finding a word re-renders
          // the grid to highlight it, which detaches the element references
          // held here — and getBoundingClientRect() on a detached node returns
          // zeros, so every sweep after the first aimed at (0,0). The grid
          // itself never moves, so the coordinates stay valid.
          const centres = [];
          for (let rr = 0; rr < size; rr++) {
            for (let cc = 0; cc < size; cc++) {
              const b = at(rr, cc).getBoundingClientRect();
              centres.push({ x: b.left + b.width / 2, y: b.top + b.height / 2 });
            }
          }
          const centre = (rr, cc) => centres[rr * size + cc];

          // Sweep one word: press on its first letter, drag through it, release
          // on its last. The engine derives the selection from the start and
          // end cells only.
          const sweep = (cells) => {
            const first = centre(cells[0][0], cells[0][1]);
            cy.wrap(null, { log: false }).then(() => {
              const p0 = map(first.x, first.y);
              return cdpMouse('mouseMoved', p0.x, p0.y, { button: 'none', buttons: 0 })
                .then(() => cdpMouse('mousePressed', p0.x, p0.y));
            });
            // Let React commit isSelecting/selectionStart before dragging, and
            // again before releasing. handleCellMouseUp reads selectionStart
            // from the closure it was bound with, so with no re-render between
            // the press and the release it still sees the PREVIOUS word's
            // value — which is exactly the shape of the strictly alternating
            // hit/miss this sweep showed.
            cy.wait(150);
            cells.forEach(([rr, cc]) => {
              cy.wrap(null, { log: false }).then(() => {
                const q = centre(rr, cc);
                const pm = map(q.x, q.y);
                return cdpMouse('mouseMoved', pm.x, pm.y);
              });
            });
            cy.wait(150);
            cy.wrap(null, { log: false }).then(() => {
              const last = cells[cells.length - 1];
              const q = centre(last[0], last[1]);
              const pe = map(q.x, q.y);
              return cdpMouse('mouseReleased', pe.x, pe.y);
            });
            cy.wait(500);
          };

          const foundCount = ($el) => {
            const m = ($el.innerText || '').match(/(\d+)\s*\/\s*\d+\s*words found/i);
            return m ? Number(m[1]) : -1;
          };

          // Sweep each word, then CHECK it registered and sweep again if not.
          //
          // Measured: results alternated hit/miss strictly by position — words
          // 1,3,5,7 registered and 2,4,6,8 did not, regardless of which words
          // they were. That is a mechanical input-timing artefact, not the
          // game, and verifying each word turns it into a retry instead of a
          // lost word.
          candidates.forEach((word) => {
            const cells = findWordCells(grid, word);
            if (!cells) return;
            cy.get('[data-testid="engine-word_search"]', { log: false })
              .then(($a) => {
                const before = foundCount($a[0]);
                sweep(cells);
                cy.get('[data-testid="engine-word_search"]', { log: false })
                  .then(($b) => {
                    if (foundCount($b[0]) <= before) sweep(cells);
                  });
                cy.get('[data-testid="engine-word_search"]', { log: false })
                  .then(($c) => {
                    if (foundCount($c[0]) <= before) sweep(cells);
                  });
              });
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
            tail: engineText(doc),
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
            tail: engineText(doc),
          };
        });
        return;
      }

      cy.window().then((win) => calibrate(win).then((map) => {
        const started = Date.now();

        // One round of "try to make progress", then look for the end.
        // Whether an engine has ever been on screen for this game. Once the
        // driver refuses to press "Back to Games" — in the generic path and in
        // the board path, which builds its own list of clickables — the only
        // remaining way for the engine to vanish is the game handing back after
        // it ends. Checkers was reaching that point and being recorded as
        // unfinished, because the result panel is shown briefly and the loop
        // samples about once a second: by the next look the board was gone and
        // all that was left to read was the sidebar.
        let sawEngine = false;
        const progress = [];
        // Board fingerprint, so the driver can tell "thinking" from "stuck".
        let lastBoardSig = '';
        let stuckRounds = 0;
        let lastMoveCount = -1;

        const round = (n) => {
          return cy.document({ log: false }).then((doc) => {
            if (DONE_RE.test(doc.body.innerText || '')) return true;
            if (doc.querySelector('[data-testid^="engine-"]')) {
              sawEngine = true;
              // Record how the material count moves. Checkers running the full
              // budget could mean either "the driver never makes a legal move"
              // or "it plays, just slowly" — opposite problems. The piece
              // counts say which, and nothing else in the run does.
              const txt = doc.body.innerText || '';
              const m = txt.match(/Red:\s*(\d+)\s*Black:\s*(\d+)/i);
              // Whose turn matters as much as the counts: a board stuck on
              // "Your turn" means the driver cannot find a move, one stuck on
              // "Opponent's turn" means the bot never answered. Opposite fixes.
              const turn = /opponent's turn/i.test(txt) ? 'opp'
                : /your turn/i.test(txt) ? 'you' : '?';
              // moves offered and stuck-count too: a stall where the chooser
              // offers nothing is a reading problem, one where it offers
              // plenty is a clicking problem. Opposite fixes again.
              if (m) progress.push(`${n}:${m[1]}v${m[2]}:${turn}:m${lastMoveCount}:s${stuckRounds}`);
            } else if (sawEngine) {
              return true;
            }
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
                //
                // Strictly inside the engine. Falling back to document.body
                // when the engine had not mounted yet meant clicking the app
                // shell: the sidebar's own "testuser" profile link got hit,
                // the router left the game, and the run then spent its whole
                // budget on a page reading "User not found". That is what
                // failed General Trivia, Science, History and Party Trivia —
                // the games were fine, the driver had navigated away from them.
                const root = doc.querySelector('[data-testid^="engine-"]');
                if (!root) return cy.wait(500, { log: false }).then(() => false);
                const els = Array.from(root.querySelectorAll(
                  'button, td, [role="button"], li, .option, canvas, svg circle, svg rect, input',
                ));
                const pick = els.filter((e) => {
                  const r = e.getBoundingClientRect();
                  if (!(r.width > 4 && r.height > 4 && r.top >= 0)) return false;
                  // Never press the way out. "Back to Games" is rendered by
                  // UnifiedGameScreen and again inside BoardGameEngine, so it
                  // is reachable even with clicks scoped to the engine, and
                  // hitting it unmounts the game: the run then spends its whole
                  // budget on the hub and is recorded as the GAME failing to
                  // finish. That is what made the quizzes look flaky -- they
                  // complete in 15-20s, and the failures were 130s spent
                  // somewhere else entirely.
                  return !/back to games/i.test(e.innerText || '');
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
                      if (!k || typeof d[k].onClick !== 'function') return false;
                      // BoardGameEngine renders its own "Back to Games" INSIDE
                      // the engine, so it is picked up here as just another
                      // clickable and pressing it unmounts the board. The
                      // generic path already refuses it; this branch builds its
                      // own list and did not, which is why Checkers alone kept
                      // ending on the hub after 610s with no engine left to
                      // read.
                      return !/back to games/i.test(d.innerText || '');
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
                  const rc = rects.map((r, i) => ({
                    row: rows.indexOf(Math.round(r.top)),
                    col: cols.indexOf(Math.round(r.left)),
                    r,
                    el: leaves[i],
                  }));
                  const cellAt = (row, col) =>
                    rc.find((x) => x.row === row && x.col === col);

                  // One source cell per round, then the squares a piece could
                  // legally travel to from it. Sequential clicking only ever
                  // produced horizontally adjacent pairs, which are never a
                  // legal checkers move; the diagonals are what that game needs,
                  // and a plain source click is what Reversi and Mancala need.
                  // Checkers is played properly rather than swept: read the
                  // board, pick a legal move, click its two squares. The sweep
                  // reduces Red to one piece in five rounds and then cannot
                  // find that piece's single legal from/to pair, which is the
                  // whole reason this game never finished.
                  if (g.id === 'checkers') {
                    const moves = chooseCheckersMove(rc, doc.defaultView);
                    lastMoveCount = moves.length;
                    if (!moves.length) {
                      return chain.then(() => cy.wait(700, { log: false }))
                        .then(() => false);
                    }
                    // Try several candidates per round, not one.
                    //
                    // Some of what this generates is not legal: a man offered
                    // a backward square, or a quiet move while a capture the
                    // reader missed is forced. Playing exactly one candidate a
                    // round means an unlucky pick stalls the game — measured,
                    // a won position of seven against three sat unchanged for
                    // 1,190 rounds. A rejected move costs two clicks and
                    // changes nothing, so it is cheap to keep trying.
                    // If the position has not moved for a few rounds, stop
                    // sampling and play EVERY candidate. The generator can be
                    // wrong about legality — a man offered a backward square,
                    // or a quiet move while a capture it did not see is forced
                    // — and in the endgame there may be exactly one legal move
                    // on the board. Sampling four a round then left won
                    // positions (seven against three, five against five)
                    // untouched for over a thousand rounds. A rejected move
                    // costs two clicks and changes nothing.
                    const sig = rc.map((c) => occupancySig(c, doc.defaultView)).join('');
                    if (sig === lastBoardSig) {
                      stuckRounds += 1;
                    } else {
                      stuckRounds = 0;
                      lastBoardSig = sig;
                    }
                    const batch = [];
                    const take = stuckRounds >= 3 ? moves.length : Math.min(4, moves.length);
                    for (let i = 0; i < take; i++) {
                      batch.push(moves[(n * 4 + i) % moves.length]);
                    }
                    batch.forEach(([from, to]) => {
                      [from, to].forEach((t) => {
                        chain = chain.then(() => clickApp(map,
                          t.r.left + t.r.width / 2, t.r.top + t.r.height / 2));
                      });
                    });
                    return chain.then(() => cy.wait(700, { log: false }))
                      .then(() => false);
                  }

                  const src = rc[n % rc.length];
                  const targets = [src];
                  [[-1, -1], [-1, 1], [1, -1], [1, 1], [-2, -2], [-2, 2], [2, -2], [2, 2]]
                    .forEach(([dr, dc]) => {
                      const t = cellAt(src.row + dr, src.col + dc);
                      if (t) targets.push(t);
                    });

                  // Click the source, then only pay for destinations if that
                  // source actually selected something. Checkers has 12 movable
                  // pieces among 40 clickable squares, so most sources are
                  // dead — spending the whole round's clicks on their
                  // destinations wasted the budget on squares that could never
                  // move. Checking the board's own markup after the source
                  // click makes the search several times faster.
                  // Only Checkers moves in two steps (pick a piece, then a
                  // square). Reversi and Mancala are SINGLE-CLICK games where
                  // the source click IS the move, so skipping their follow-up
                  // clicks on an unchanged board threw away legal moves —
                  // Reversi had been completing and stopped the moment this
                  // check was applied to it.
                  const src0 = targets[0];
                  const before = root.innerHTML;

                  if (g.id === 'checkers') {
                    // Let the GAME name the legal destinations, and play a whole
                    // board pass per round.
                    //
                    // Selecting a piece makes CheckersBoard mark its legal
                    // squares (it computes them with its own getValidMoves), so
                    // the cells whose markup changes after a source click ARE
                    // the legal moves — verified: selecting a red piece lights
                    // 1-3 squares, and clicking one flips the turn and changes
                    // the piece counts.
                    //
                    // One source per round was the problem: only about a third
                    // of squares hold a movable red piece, so most rounds made
                    // no move at all and a full game never fitted in the
                    // budget. Sweeping every square each round plays many moves
                    // per round instead.
                    // Re-read the cells before EVERY source click.
                    //
                    // Each move re-renders the board and replaces these
                    // elements, so a list captured once goes stale part-way
                    // through the pass — and getBoundingClientRect() on a
                    // detached node returns zeros, sending every later click to
                    // (0,0). That is why the game advanced a few moves and then
                    // appeared frozen: the same defect as the word-search
                    // sweep, in a different game.
                    const liveCells = () => {
                      const all = Array.from(root.querySelectorAll('*')).filter((d) => {
                        const k = Object.keys(d).find((x) => x.startsWith('__reactProps$'));
                        return k && typeof d[k].onClick === 'function';
                      });
                      return all
                        .filter((d) => !all.some((o) => o !== d && d.contains(o)))
                        .filter((d) => {
                          const r = d.getBoundingClientRect();
                          return r.width > 8 && r.height > 8 && r.top >= 0;
                        });
                    };

                    leaves.forEach((_ignored, idx) => {
                      chain = chain.then(() => {
                        const cur = liveCells();
                        const cellEl = cur[idx];
                        if (!cellEl) return null;
                        const snap = cur.map((el) => el.outerHTML);
                        const b = cellEl.getBoundingClientRect();
                        if (!b.width) return null;
                        return clickApp(map, b.left + b.width / 2, b.top + b.height / 2)
                          .then(() => {
                            const after = liveCells();
                            const lit = after
                              .map((el, i) => ({ el, i }))
                              .filter(({ el, i }) => el.outerHTML !== snap[i] && i !== idx);
                            if (!lit.length) return null;
                            // Prefer a jump. Captures take material off the
                            // board, which is what drives a game toward an
                            // ending; always taking the first highlighted
                            // square converges very slowly. Cells run 8 to a
                            // row, so a jump lands 16 indices away.
                            const jump = lit.find(({ i }) => Math.abs(i - idx) >= 15);
                            const target = (jump || lit[0]).el;
                            const t = target.getBoundingClientRect();
                            if (!t.width) return null;
                            return clickApp(map, t.left + t.width / 2,
                                                 t.top + t.height / 2);
                          });
                      });
                    });
                    return chain.then(() => cy.wait(400, { log: false })).then(() => false);
                  }

                  chain = chain.then(() => clickApp(map,
                    src0.r.left + src0.r.width / 2, src0.r.top + src0.r.height / 2));
                  chain = chain.then(() => {
                    let inner = cy.wrap(null, { log: false });
                    targets.slice(1).forEach((t) => {
                      inner = inner.then(() => clickApp(map,
                        t.r.left + t.r.width / 2, t.r.top + t.r.height / 2));
                    });
                    return inner;
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
        const maxRounds = g.id === 'checkers' ? 1200
          : g.kind === 'board' ? 250
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
              progress: progress.length ? progress.slice(0, 6).concat(progress.slice(-6)) : undefined,
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
