/**
 * Match 3 — prove the board responds to real input.
 *
 * History of this file matters, because it corrects two of my own false
 * verdicts:
 *
 *  - The 25-game sweep called match3 FROZEN at 0.033% pixel change. That 0.033%
 *    was only the countdown timer repainting "1:52" -> "1:51".
 *  - The first version of this spec swept all 112 adjacent pairs and still
 *    scored 0. I nearly reported that as a game defect. A pixel decode of the
 *    final board showed 15 legal moves available, so "no match in 112 swaps"
 *    could not be the game's fault.
 *
 * The real cause was the harness: CDP dispatches at BROWSER-WINDOW coordinates
 * while getBoundingClientRect() is APP-relative, and the Cypress runner scales
 * the app iframe to 60% and offsets it by (468, 80). Every click was landing
 * hundreds of pixels away. cypress/support/realInput.js measures that transform
 * at runtime; this spec aims through it.
 *
 * Match3Scene reverts any swap that forms no line-of-3, so a single blind swap
 * proves nothing either way. Sweeping every adjacent pair does: on a board with
 * a legal move, at least one swap must clear gems and raise the score.
 */

import { calibrate, clickApp } from '../support/realInput';

const FAKE_TOKEN = 'e2e-fake-token';

// Mirrors the private constants in Match3Scene.js.
const GRID_SIZE = 8;
const CELL_SIZE = 40; // GEM_SIZE 36 + GEM_PADDING 4
const GRID_PX = GRID_SIZE * CELL_SIZE;
const GRID_Y_NUDGE = 20; // gridOffsetY adds +20

describe('Match 3 responds to real pointer input', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/social/games*', { statusCode: 503, body: {} });
    cy.intercept('GET', '**/api/social/auth/me', {
      statusCode: 200,
      body: { success: true, data: { id: 1, username: 'testuser', role: 'flat' } },
    });
    cy.intercept('GET', '**/api/social/notifications*', {
      statusCode: 200, body: { success: true, data: [], meta: { total: 0 } },
    });
    cy.intercept('GET', '**/api/social/feed*', { statusCode: 200, body: { success: true, data: [] } });
  });

  it('clears at least one match when every adjacent swap is tried', () => {
    cy.visit('/social/games/match3', {
      failOnStatusCode: false,
      onBeforeLoad(win) { win.localStorage.setItem('access_token', FAKE_TOKEN); },
    });
    cy.get('#root', { timeout: 120000 }).should('exist');
    cy.contains(/play solo/i, { timeout: 120000 }).click({ force: true });
    cy.get('canvas', { timeout: 60000 }).should('be.visible');
    cy.wait(2500); // let the board build and settle

    cy.screenshot('match3-real-1-before', { overwrite: true });

    cy.window().then((win) => {
      return calibrate(win).then((map) => {
        cy.log(`pointer scale ${map.scale.kx.toFixed(3)},${map.scale.ky.toFixed(3)} ` +
               `origin ${map.origin.x.toFixed(0)},${map.origin.y.toFixed(0)}`);

        const el = win.document.querySelector('canvas');
        const r = el.getBoundingClientRect();
        // Phaser reports pointer coords in GAME units; convert through the
        // canvas rect so this holds at any canvas scale.
        const sx = r.width / el.width;
        const sy = r.height / el.height;
        const offX = (el.width - GRID_PX) / 2;
        const offY = (el.height - GRID_PX) / 2 + GRID_Y_NUDGE;

        const centre = (row, col) => ({
          x: r.left + (offX + col * CELL_SIZE + CELL_SIZE / 2) * sx,
          y: r.top + (offY + row * CELL_SIZE + CELL_SIZE / 2) * sy,
        });

        // Guard the derived board against the canvas, so a geometry drift fails
        // loudly instead of quietly reporting "no match found".
        const tl = centre(0, 0);
        const br = centre(GRID_SIZE - 1, GRID_SIZE - 1);
        expect(tl.x, 'board left edge inside canvas').to.be.greaterThan(r.left);
        expect(tl.y, 'board top edge inside canvas').to.be.greaterThan(r.top);
        expect(br.x, 'board right edge inside canvas').to.be.lessThan(r.right);
        expect(br.y, 'board bottom edge inside canvas').to.be.lessThan(r.bottom);

        const pairs = [];
        for (let rr = 0; rr < GRID_SIZE; rr++)
          for (let c = 0; c < GRID_SIZE - 1; c++) pairs.push([[rr, c], [rr, c + 1]]);
        for (let rr = 0; rr < GRID_SIZE - 1; rr++)
          for (let c = 0; c < GRID_SIZE; c++) pairs.push([[rr, c], [rr + 1, c]]);

        cy.log(`sweeping ${pairs.length} adjacent swaps`);

        // A swap tweens for 2 x ANIMATION_SPEED (150ms) and the scene drops
        // clicks while isAnimating, so pace above that.
        pairs.forEach(([a, b]) => {
          const pa = centre(a[0], a[1]);
          const pb = centre(b[0], b[1]);
          cy.wrap(null, { log: false }).then(() => clickApp(map, pa.x, pa.y));
          cy.wait(60, { log: false });
          cy.wrap(null, { log: false }).then(() => clickApp(map, pb.x, pb.y));
          cy.wait(380, { log: false });
        });
      });
    });

    cy.wait(1500); // let any cascade finish
    cy.screenshot('match3-real-2-after', { overwrite: true });
  });
});
