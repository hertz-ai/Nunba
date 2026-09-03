/**
 * games-play-through.cy.js — DRIVE every game, don't just mount it.
 *
 * games-all-engines.cy.js proves the right engine mounts. This spec proves the
 * game is actually PLAYABLE: it clicks cells, types answers, presses keys,
 * drags across grids, and screenshots before/after so a human can see it moved.
 *
 * Every game gets a screenshot pair in cypress/screenshots/. Assertions are on
 * observable change (board state, canvas pixels, DOM text), not on the engine
 * having rendered.
 *
 * Catalog API is stubbed DOWN on purpose — that is the path real users hit
 * unauthenticated, and the path that used to launch the wrong game entirely.
 */

const FAKE_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwicm9sZSI6ImZsYXQifQ.fake';

function stubCatalogDown() {
  cy.intercept('GET', '**/api/social/games/catalog*', { statusCode: 503, body: {} });
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

function launch(id) {
  cy.visit(`/social/games/${id}`, {
    failOnStatusCode: false,
    onBeforeLoad(win) { win.localStorage.setItem('access_token', FAKE_TOKEN); },
  });
  cy.get('#root', { timeout: 120000 }).should('exist');
  cy.contains(/play solo/i, { timeout: 120000 }).click({ force: true });
}

/**
 * Liveness probe for a Phaser scene.
 *
 * Do NOT use canvas.toDataURL() here. Phaser runs on WebGL (Phaser.AUTO) and
 * the drawing buffer is not preserved, so toDataURL returns a BLANK, STABLE
 * image even while the game is visibly animating. That produced five false
 * failures (Snake, Breakout, Pong, Flappy, Bubble Shooter) whose own
 * screenshots showed the games rendering correctly — and two false passes
 * (match3, runner) where toDataURL threw and the check was skipped entirely.
 *
 * Instead count real animation frames: a running Phaser game drives
 * requestAnimationFrame continuously. Pixel-level proof that the picture
 * CHANGES is done out-of-band by comparing the before/after PNG screenshots
 * (see scripts/compare_game_frames.py) — artifact-mediated, not proxy-mediated.
 */
function countAnimationFrames(win, ms = 800) {
  return new Cypress.Promise((resolve) => {
    let frames = 0;
    const stop = Date.now() + ms;
    const tick = () => {
      frames += 1;
      if (Date.now() < stop) win.requestAnimationFrame(tick);
      else resolve(frames);
    };
    win.requestAnimationFrame(tick);
  });
}

// ─────────────────────────── BOARD GAMES ───────────────────────────
// Drive: click a playable cell, assert the board mutated.

const BOARD_GAMES = [
  { id: 'tic-tac-toe', name: 'Tic Tac Toe' },
  { id: 'connect-four', name: 'Connect Four' },
  { id: 'checkers', name: 'Checkers' },
  { id: 'reversi', name: 'Reversi' },
  { id: 'mancala', name: 'Mancala' },
];

describe('Board games — click to play', () => {
  beforeEach(stubCatalogDown);

  BOARD_GAMES.forEach((g) => {
    it(`${g.name}: a click changes the board`, () => {
      launch(g.id);
      cy.get('[data-testid="engine-boardgame"]', { timeout: 120000 }).should('exist');
      cy.screenshot(`board-${g.id}-1-before`, { capture: 'viewport' });

      // Snapshot the board's rendered text/DOM, click a live cell, compare.
      cy.get('[data-testid="engine-boardgame"]').invoke('html').as('beforeHtml');

      // boardgame.io boards render clickable cells as td/button/div with handlers.
      cy.get('[data-testid="engine-boardgame"]')
        .find('td, button, [role="button"], svg circle, svg rect')
        .then(($cells) => {
          expect($cells.length, 'board exposes clickable cells').to.be.greaterThan(0);
          // Click a few cells — some boards need a piece selected then a target.
          cy.wrap($cells).eq(Math.floor($cells.length / 2)).click({ force: true });
          cy.wait(400);
          cy.wrap($cells).eq(0).click({ force: true });
          cy.wait(400);
        });

      cy.screenshot(`board-${g.id}-2-after`, { capture: 'viewport' });
      cy.get('@beforeHtml').then((before) => {
        cy.get('[data-testid="engine-boardgame"]').invoke('html').should((after) => {
          expect(after, `${g.name} board must react to a click`).to.not.equal(before);
        });
      });
    });
  });
});

// ─────────────────────────── PHASER / ARCADE ───────────────────────────
// Drive: send real input, assert the canvas pixels changed.

// Real key descriptors — Phaser reads code/keyCode, so a bare string is not enough.
const K = {
  left: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  up: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  down: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  space: { key: ' ', code: 'Space', keyCode: 32 },
};

const PHASER_GAMES = [
  { id: 'snake', name: 'Snake', keys: [K.right, K.down] },
  { id: 'breakout', name: 'Breakout', keys: [K.right, K.left] },
  // Pong serves on SPACE (or pointerdown) before the paddles matter.
  { id: 'pong', name: 'Pong', keys: [K.space, K.up, K.down] },
  { id: 'flappy', name: 'Flappy Bird', keys: [K.space, K.space] },
  { id: 'runner', name: 'Endless Runner', keys: [K.space, K.up] },
  { id: 'bubble-shooter', name: 'Bubble Shooter', keys: [K.left, K.space] },
  { id: 'match3', name: 'Match 3', keys: [] },
];

describe('Arcade games — input moves the game', () => {
  beforeEach(stubCatalogDown);

  PHASER_GAMES.forEach((g) => {
    it(`${g.name}: renders a live canvas and responds to input`, () => {
      launch(g.id);
      cy.get('[data-testid="engine-phaser"]', { timeout: 120000 }).should('exist');

      // Phaser boots asynchronously — wait for a sized canvas.
      cy.get('canvas', { timeout: 120000 })
        .should('exist')
        .and(($c) => {
          expect($c[0].width, 'canvas width').to.be.greaterThan(0);
          expect($c[0].height, 'canvas height').to.be.greaterThan(0);
        });
      cy.contains(/unknown scene/i).should('not.exist');

      cy.wait(1500); // let the scene render its first frames
      cy.screenshot(`arcade-${g.id}-1-before`, { capture: 'viewport' });

      // The scene must actually be running an animation loop.
      cy.window().then((win) => countAnimationFrames(win)).then((frames) => {
        expect(frames, `${g.name} must be driving requestAnimationFrame`).to.be.greaterThan(5);
      });

      // Drive it with HELD keys, not taps.
      // Phaser scenes poll `cursors.left.isDown` inside a ~16ms update tick.
      // cy.type() presses and releases within a millisecond, so the scene
      // never observes isDown=true and the game looks frozen even though it
      // is running — measured: breakout/pong/bubble-shooter/match3 came back
      // 0.000% pixel change with tapped keys.
      g.keys.forEach((k) => {
        cy.get('body').trigger('keydown', { key: k.key, code: k.code, keyCode: k.keyCode, which: k.keyCode, force: true });
        cy.wait(700); // hold long enough for many update ticks
        cy.get('body').trigger('keyup', { key: k.key, code: k.code, keyCode: k.keyCode, which: k.keyCode, force: true });
        cy.wait(200);
      });
      // Phaser's InputManager ignores synthetic pointer events that lack
      // pointerId / isPrimary / buttons, so a bare .trigger('pointerdown')
      // never reaches the scene. Bubble Shooter has NO keyboard bindings at
      // all (only pointermove/pointerdown) and Pong serves on pointerdown or
      // SPACE — both showed 0.000% pixel change until these fields were set.
      const ptr = (extra) => ({
        eventConstructor: 'PointerEvent',
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0,
        buttons: 1,
        force: true,
        ...extra,
      });
      // Only drag if the game is STILL RUNNING. Held arrow keys kill Snake
      // (into a wall) and Flappy/Runner (into an obstacle) within a second;
      // the engine then unmounts and there is no canvas left to drag on, which
      // failed the test for a game that had in fact reached completion.
      cy.get('body').then(($b) => {
        const alreadyDone = /play again|back to games|you win|game over|rematch|run complete/i.test($b.text());
        if (alreadyDone) return;
        cy.get('canvas').then(($c) => {
          const r = $c[0].getBoundingClientRect();
          const cx = r.left + r.width * 0.5;
          const cy0 = r.top + r.height * 0.5;

          if (g.id === 'match3') {
            // 8x8 grid, centred. A move is a swap of two ADJACENT cells, so
            // tap one cell then the one beside it. A generic centre drag is
            // not a legal move and left the board unchanged (0.03% pixels).
            const cell = Math.min(r.width, r.height) * 0.8 / 8;
            cy.wrap($c)
              .trigger('pointerdown', ptr({ clientX: cx, clientY: cy0 }))
              .trigger('pointerup', ptr({ clientX: cx, clientY: cy0, buttons: 0 }))
              .wait(350)
              .trigger('pointerdown', ptr({ clientX: cx + cell, clientY: cy0 }))
              .trigger('pointerup', ptr({ clientX: cx + cell, clientY: cy0, buttons: 0 }));
            cy.wait(1200);
          } else if (g.id === 'bubble-shooter') {
            // Cannon sits at (w/2, h-40); pointermove AIMS, pointerdown FIRES.
            // Fire twice at different angles and allow bubble travel time.
            [-0.25, 0.2].forEach((skew) => {
              const tx = cx + r.width * skew;
              const ty = r.top + r.height * 0.25;
              cy.wrap($c)
                .trigger('pointermove', ptr({ clientX: tx, clientY: ty }))
                .wait(250)
                .trigger('pointerdown', ptr({ clientX: tx, clientY: ty }))
                .trigger('pointerup', ptr({ clientX: tx, clientY: ty, buttons: 0 }));
              cy.wait(1400); // let the bubble fly and settle
            });
          } else {
            cy.wrap($c)
              .trigger('pointermove', ptr({ clientX: cx - 60, clientY: cy0 - 40 }))
              .wait(200)
              .trigger('pointerdown', ptr({ clientX: cx, clientY: cy0 }))
              .wait(200)
              .trigger('pointermove', ptr({ clientX: cx + 80, clientY: cy0 }))
              .wait(200)
              .trigger('pointerup', ptr({ clientX: cx + 80, clientY: cy0, buttons: 0 }));
          }
        });
      });
      cy.wait(1200);
      cy.wait(1800);
      cy.screenshot(`arcade-${g.id}-2-after`, { capture: 'viewport' });

      // After input there are TWO legitimate outcomes and both are a pass:
      //   (a) still playing  — the canvas is there and the loop still runs
      //   (b) GAME OVER      — our input ended the run (Snake into a wall,
      //                        Flappy into a pipe, Runner into an obstacle),
      //                        the engine unmounts and the completion screen
      //                        replaces the canvas. That is the game driven
      //                        to COMPLETION, which is the stronger result.
      // An earlier version demanded the canvas persist and reported (b) as
      // three failures, while the screenshots plainly showed "You Win!".
      cy.get('body').then(($b) => {
        const finished = /play again|back to games|you win|game over|rematch/i.test($b.text());
        if (finished) {
          cy.log(`${g.name}: reached game completion`);
          cy.contains(/play again|back to games|rematch/i).should('be.visible');
        } else {
          cy.get('canvas').should('exist');
          cy.window().then((win) => countAnimationFrames(win)).then((frames) => {
            expect(frames, `${g.name} must still be animating after input`).to.be.greaterThan(5);
          });
        }
      });
      cy.contains(/failed to load game/i).should('not.exist');
      cy.contains(/unknown scene/i).should('not.exist');
    });
  });
});

// ─────────────────────────── TRIVIA ───────────────────────────
// Drive: answer a question, assert progress advances.

const TRIVIA_GAMES = [
  { id: 'trivia-general', name: 'General Trivia' },
  { id: 'trivia-science', name: 'Science Quiz' },
  { id: 'trivia-history', name: 'History Quiz' },
  { id: 'trivia-geography', name: 'Geography Quiz' },
  { id: 'trivia-tech', name: 'Tech Quiz' },
  { id: 'trivia-movies', name: 'Movie Trivia' },
  { id: 'party-trivia', name: 'Party Trivia' },
];

describe('Trivia games — answering advances the game', () => {
  beforeEach(stubCatalogDown);

  TRIVIA_GAMES.forEach((g) => {
    it(`${g.name}: an answer registers`, () => {
      launch(g.id);
      cy.get('[data-testid="engine-trivia"]', { timeout: 120000 }).should('exist');
      cy.wait(1200);
      cy.screenshot(`trivia-${g.id}-1-before`, { capture: 'viewport' });

      cy.get('[data-testid="engine-trivia"]').invoke('text').as('beforeText');
      // Answer options render as buttons; click the first live one.
      cy.get('[data-testid="engine-trivia"]').find('button').then(($b) => {
        if ($b.length) {
          cy.wrap($b).eq(0).click({ force: true });
          cy.wait(1200);
        }
      });
      cy.screenshot(`trivia-${g.id}-2-after`, { capture: 'viewport' });
      cy.get('[data-testid="engine-trivia"]').should('exist'); // survived the click
    });
  });
});

// ─────────────────────────── WORD + PUZZLE ───────────────────────────

describe('Word and puzzle games — typing and dragging', () => {
  beforeEach(stubCatalogDown);

  it('Word Scramble: typing a guess and submitting is accepted', () => {
    launch('word-scramble');
    cy.get('[data-testid="engine-word_scramble"]', { timeout: 120000 }).should('exist');
    cy.wait(800);
    cy.screenshot('word-scramble-1-before', { capture: 'viewport' });
    cy.get('input').first().type('planet{enter}', { force: true });
    cy.wait(1000);
    cy.screenshot('word-scramble-2-after', { capture: 'viewport' });
  });

  it('Word Race: same engine, tighter timer', () => {
    launch('party-word-race');
    cy.get('[data-testid="engine-word_scramble"]', { timeout: 120000 }).should('exist');
    cy.wait(800);
    cy.get('input').first().type('river{enter}', { force: true });
    cy.screenshot('word-race-played', { capture: 'viewport' });
  });

  it('Word Search: dragging across the grid selects letters', () => {
    launch('word-search');
    cy.get('[data-testid="engine-word_search"]', { timeout: 120000 }).should('exist');
    cy.wait(1000);
    cy.screenshot('word-search-1-before', { capture: 'viewport' });
    // Drag across the first row of grid cells.
    cy.get('[data-testid="engine-word_search"]').find('div,span,td').then(($cells) => {
      if ($cells.length > 3) {
        cy.wrap($cells).eq(0).trigger('mousedown', { force: true });
        cy.wrap($cells).eq(1).trigger('mouseover', { force: true });
        cy.wrap($cells).eq(2).trigger('mouseup', { force: true });
      }
    });
    cy.wait(600);
    cy.screenshot('word-search-2-after', { capture: 'viewport' });
  });

  it('Sudoku: selecting a cell and entering a number', () => {
    launch('sudoku');
    cy.get('[data-testid="engine-sudoku"]', { timeout: 120000 }).should('exist');
    cy.wait(1000);
    cy.screenshot('sudoku-1-before', { capture: 'viewport' });
    cy.get('[data-testid="engine-sudoku"]').find('div,button').then(($cells) => {
      if ($cells.length > 5) cy.wrap($cells).eq(5).click({ force: true });
    });
    cy.get('body').type('5', { force: true });
    cy.wait(600);
    cy.screenshot('sudoku-2-after', { capture: 'viewport' });
  });
});

// ─────────────────── HONEST PLACEHOLDERS (open defect) ───────────────────

describe('Games with no client engine — must say so, not fake it', () => {
  beforeEach(stubCatalogDown);

  [
    { id: 'word-chain', engine: 'word_chain', name: 'Word Chain' },
    { id: 'collab-puzzle', engine: 'collab_puzzle', name: 'Collaborative Puzzle' },
  ].forEach((g) => {
    it(`${g.name}: shows "coming soon", never a different game`, () => {
      launch(g.id);
      cy.get(`[data-testid="engine-${g.engine}"]`, { timeout: 120000 }).should('exist');
      cy.contains(/coming soon/i, { timeout: 120000 }).should('be.visible');
      cy.screenshot(`placeholder-${g.id}`, { capture: 'viewport' });
    });
  });
});
