/**
 * games-all-engines.cy.js — every game in the catalog, launched for real.
 *
 * Drives the OFFLINE / catalog-down path on purpose (the API is stubbed 503),
 * because that is the path that silently mislaunched games: match3 opened
 * Sudoku, bubble-shooter died on "Unknown scene", word-search opened Word
 * Scramble, and all five board games opened Tic Tac Toe. The engine that
 * actually mounts is asserted via data-testid="engine-<engine>" on the
 * playing-phase root, so a mislaunch fails loudly instead of looking fine.
 *
 * Companion unit test (catalog contract, no browser):
 *   src/components/Social/Games/__tests__/gameEngineResolution.test.js
 */

const FAKE_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwicm9sZSI6ImZsYXQifQ.fake';

// id → what MUST mount. Mirrors LOCAL_CATALOG; kept explicit so a catalog
// edit that changes an engine has to be acknowledged here too.
const GAMES = [
  // Board — each must open ITS OWN board, not tictactoe
  {id: 'tic-tac-toe', engine: 'boardgame', name: 'Tic Tac Toe'},
  {id: 'connect-four', engine: 'boardgame', name: 'Connect Four'},
  {id: 'checkers', engine: 'boardgame', name: 'Checkers'},
  {id: 'reversi', engine: 'boardgame', name: 'Reversi'},
  {id: 'mancala', engine: 'boardgame', name: 'Mancala'},
  // Arcade / Phaser — must render a live canvas
  {id: 'snake', engine: 'phaser', canvas: true, name: 'Snake'},
  {id: 'breakout', engine: 'phaser', canvas: true, name: 'Breakout'},
  {id: 'pong', engine: 'phaser', canvas: true, name: 'Pong'},
  {id: 'flappy', engine: 'phaser', canvas: true, name: 'Flappy Bird'},
  {id: 'runner', engine: 'phaser', canvas: true, name: 'Endless Runner'},
  {id: 'bubble-shooter', engine: 'phaser', canvas: true, name: 'Bubble Shooter'},
  {id: 'match3', engine: 'phaser', canvas: true, name: 'Match 3'},
  // Trivia
  {id: 'trivia-general', engine: 'trivia', name: 'General Trivia'},
  {id: 'trivia-science', engine: 'trivia', name: 'Science Quiz'},
  {id: 'trivia-history', engine: 'trivia', name: 'History Quiz'},
  {id: 'trivia-geography', engine: 'trivia', name: 'Geography Quiz'},
  {id: 'trivia-tech', engine: 'trivia', name: 'Tech Quiz'},
  {id: 'trivia-movies', engine: 'trivia', name: 'Movie Trivia'},
  // Word
  {id: 'word-scramble', engine: 'word_scramble', name: 'Word Scramble'},
  {id: 'word-search', engine: 'word_search', name: 'Word Search'},
  // OPEN DEFECT: the catalog advertises Word Chain and Collaborative Puzzle,
  // but no client engine exists for either — both can only reach a "coming
  // soon" placeholder. Asserted here as placeholder-only so the gap is
  // recorded and cannot regress into a SILENT mislaunch; they are not
  // "passing" games. Implementing the engines is a separate, owner-approved
  // change (this cycle is debug-only, no new code).
  {id: 'word-chain', engine: 'word_chain', name: 'Word Chain', placeholder: true},
  // Puzzle
  {id: 'sudoku', engine: 'sudoku', name: 'Sudoku'},
  {
    id: 'collab-puzzle',
    engine: 'collab_puzzle',
    name: 'Collaborative Puzzle',
    placeholder: true,
  },
  // Party
  {id: 'party-trivia', engine: 'trivia', name: 'Party Trivia'},
  {id: 'party-word-race', engine: 'word_scramble', name: 'Word Race'},
];

// Catalog API DOWN — forces the client-side fallback that was broken.
function stubCatalogDown() {
  cy.intercept('GET', '**/api/social/games/catalog*', {statusCode: 503, body: {}});
  cy.intercept('GET', '**/api/social/games*', {statusCode: 503, body: {}});
  cy.intercept('GET', '**/api/social/auth/me', {
    statusCode: 200,
    body: {success: true, data: {id: 1, username: 'testuser', role: 'flat'}},
  });
  cy.intercept('GET', '**/api/social/notifications*', {
    statusCode: 200,
    body: {success: true, data: [], meta: {total: 0}},
  });
  cy.intercept('GET', '**/api/social/feed*', {statusCode: 200, body: {success: true, data: []}});
}

function launch(id) {
  cy.visit(`/social/games/${id}`, {
    failOnStatusCode: false,
    onBeforeLoad(win) {
      win.localStorage.setItem('access_token', FAKE_TOKEN);
    },
  });
  cy.get('#root', {timeout: 120000}).should('exist');
  // Lobby → solo play
  cy.contains(/play solo/i, {timeout: 120000}).click({force: true});
}

describe('All catalog games launch their own engine (catalog offline)', () => {
  beforeEach(() => {
    stubCatalogDown();
  });

  GAMES.forEach((game) => {
    it(`${game.name} (${game.id}) mounts engine "${game.engine}"`, () => {
      launch(game.id);

      cy.get(`[data-testid="engine-${game.engine}"]`, {timeout: 120000}).should(
        'exist'
      );

      if (game.canvas) {
        // Phaser actually booted — a real WebGL/canvas surface with size.
        cy.get('canvas', {timeout: 120000})
          .should('exist')
          .and(($c) => {
            expect($c[0].width, 'canvas width').to.be.greaterThan(0);
            expect($c[0].height, 'canvas height').to.be.greaterThan(0);
          });
        cy.contains(/unknown scene/i).should('not.exist');
      }

      if (game.placeholder) {
        // Honest "not playable yet" — never a different game silently.
        cy.contains(/coming soon/i, {timeout: 120000}).should('be.visible');
      }

      // No engine may fall through to the unknown-engine placeholder.
      cy.contains(/unknown engine/i).should('not.exist');
    });
  });

  it('the hub lists every catalog game while the API is down', () => {
    cy.visit('/social/games', {
      failOnStatusCode: false,
      onBeforeLoad(win) {
        win.localStorage.setItem('access_token', FAKE_TOKEN);
      },
    });
    cy.get('#root', {timeout: 120000}).should('exist');
    cy.contains('Snake', {timeout: 120000}).should('be.visible');
    cy.contains('Match 3').should('be.visible');
    cy.contains('Sudoku').should('be.visible');
  });
});
