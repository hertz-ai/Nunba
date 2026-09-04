/**
 * Checkers must be able to END.
 *
 * Its endIf only ever returned a result in two cases: a side wiped out, or the
 * side to move having no legal move. There was no drawing condition at all, so
 * a king-and-king endgame shuffles forever and the game can never finish.
 * Observed directly: a real game driven for 15 minutes reached a handful of
 * pieces and a crowned king without ever reaching a terminal position.
 *
 * Standard checkers draws a position after 40 moves with no capture. These
 * tests exercise the rule against the real game object rather than the UI, so
 * they are unaffected by how the board is driven.
 */

import CheckersGame from '../components/Social/Games/board-games/Checkers';

// endIf is called with the same shape boardgame.io passes it.
const endIf = (G, currentPlayer = '0') =>
  CheckersGame.endIf({ G, ctx: { currentPlayer } });

function freshState() {
  return CheckersGame.setup();
}

describe('Checkers can reach a terminal position', () => {
  test('setup starts the quiet-move counter at zero', () => {
    expect(freshState().movesSinceCapture).toBe(0);
  });

  test('a fresh board is not already over', () => {
    expect(endIf(freshState())).toBeUndefined();
  });

  test('40 moves without a capture is a draw', () => {
    const G = freshState();
    G.movesSinceCapture = 40;
    expect(endIf(G)).toEqual({ draw: true });
  });

  test('39 quiet moves is NOT yet a draw', () => {
    const G = freshState();
    G.movesSinceCapture = 39;
    // Still a live position — the rule must not fire early, or a normal game
    // gets cut short.
    expect(endIf(G)).toBeUndefined();
  });

  // Piece tokens come from the board the game itself sets up, so these tests
  // cannot drift from the module's own constants.
  // Pieces occupy the squares where (row + col) is odd, so (5,0) and (0,1)
  // are real pieces while (5,1) is an empty square.
  const RED = CheckersGame.setup().board[5][0];
  const BLACK = CheckersGame.setup().board[0][1];

  test('a capture resets the count, so a lively game is never drawn', () => {
    const G = freshState();
    G.movesSinceCapture = 39;

    // Red at (5,0) takes Black at (4,1), landing on the empty (3,2).
    G.board = G.board.map((row) => row.map(() => null));
    G.board[5][0] = RED;
    G.board[4][1] = BLACK;
    // A spare each, so neither side is wiped out by this capture.
    G.board[7][6] = RED;
    G.board[0][1] = BLACK;

    CheckersGame.moves.movePiece({ G, playerID: '0' }, 5, 0, 3, 2);

    expect(G.movesSinceCapture).toBe(0);
    expect(endIf(G)).toBeUndefined();
  });

  test('a quiet move advances the count', () => {
    const G = freshState();
    const before = G.movesSinceCapture;
    // Red slides from (5,0) to the empty (4,1) — red moves up the board.
    G.board = G.board.map((row) => row.map(() => null));
    G.board[5][0] = RED;
    G.board[0][1] = BLACK;

    CheckersGame.moves.movePiece({ G, playerID: '0' }, 5, 0, 4, 1);

    expect(G.movesSinceCapture).toBe(before + 1);
  });

  test('wiping out a side still wins, and outranks the draw count', () => {
    const G = freshState();
    G.movesSinceCapture = 99;
    G.board = G.board.map((row) => row.map(() => null));
    G.board[5][0] = CheckersGame.setup().board[5][0]; // player 0 only
    expect(endIf(G, '0')).toEqual({ winner: '0' });
  });

  describe('the bot only ever offers moves the game will accept', () => {
    // ai.enumerate feeds the opposing bot. Any move it offers that movePiece
    // rejects leaves the bot's turn unfinished, and the game deadlocks: the
    // state still says it is the human's turn while the client stays inactive,
    // so no click does anything. That is what happened — a driven game reached
    // Red 9 / Black 10 and sat on that identical position for 22 board passes.
    const enumerate = (G, currentPlayer) =>
      CheckersGame.ai.enumerate(G, { currentPlayer });

    test('every enumerated move is accepted by movePiece', () => {
      const G = freshState();
      const moves = enumerate(G, '0');
      expect(moves.length).toBeGreaterThan(0);

      moves.forEach(({ move, args }) => {
        const probe = { board: G.board.map((row) => [...row]), movesSinceCapture: 0 };
        const result = CheckersGame.moves[move]({ G: probe, playerID: '0' }, ...args);
        // movePiece returns INVALID_MOVE for anything it refuses.
        expect(result).toBeUndefined();
      });
    });

    test('with a capture on the board, no quiet move is offered', () => {
      // Built from scratch rather than by clearing the setup board — the
      // earlier attempt asserted against a fixture that had not actually been
      // cleared, so it was testing itself.
      const board = Array.from({ length: 8 }, () => Array(8).fill(null));
      board[5][0] = RED;    // can take (4,1) and land on the empty (3,2)
      board[4][1] = BLACK;
      board[5][2] = RED;    // has only a quiet slide to (4,3)
      board[0][7] = BLACK;  // keeps black alive so the game is not already won
      const G = { board, movesSinceCapture: 0 };

      const moves = enumerate(G, '0');
      expect(moves.length).toBeGreaterThan(0);
      // Both red pieces happen to have a capture here — (5,0) takes onto (3,2)
      // and (5,2) takes onto (3,0). What must NOT appear is the quiet slide
      // (5,2) -> (4,3): movePiece rejects it under the forced-capture rule, so
      // offering it left the bot's turn unfinished and deadlocked the game.
      const quietSlide = moves.filter(
        (m) => m.args[2] === 4 && m.args[3] === 3);
      expect(quietSlide).toEqual([]);
      // And every move offered lands two rows away, i.e. is a jump.
      moves.forEach((m) => {
        expect(Math.abs(m.args[2] - m.args[0])).toBe(2);
      });
    });
  });
});
