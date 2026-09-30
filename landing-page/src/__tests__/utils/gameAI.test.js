/**
 * gameAI.js — client-side AI opponent dispatcher validation.
 *
 * Uses text parsing (not runtime import) to sidestep the pre-existing
 * ESM/babel transform issue in the main jest suite (same pattern as
 * voiceGamesPortValidation.test.js). These tests verify the contract
 * shape without actually instantiating MCTSBot — that would require
 * boardgame.io's ai entry point which is one of the ESM-tripping
 * modules.
 *
 * What we validate:
 *   - gameAI.js exists at the expected path
 *   - Exports DIFFICULTY, BOARD_GAME_AI_SUPPORT, getBoardGameBot,
 *     hasBoardGameAI, buildSoloBotsMap
 *   - All 5 board games (tictactoe/connect4/checkers/reversi/mancala)
 *     have ai.enumerate declared in their Game definitions
 *   - BOARD_GAME_AI_SUPPORT lists exactly those 5 board types
 *   - (BoardGameEngine's solo-bot wiring: see
 *     components/Social/Games/__tests__/BoardGameEngine.soloBots.test.js)
 *   - Each board game's enumerate returns the right move name (the
 *     name of a move function defined in its own moves block — so a
 *     future renamer doesn't silently break AI via string mismatch)
 *   - Difficulty presets map 3 levels (easy/medium/hard) → bot type
 */


import CheckersGame from '../../components/Social/Games/board-games/Checkers';
import ConnectFourGame from '../../components/Social/Games/board-games/ConnectFour';
import MancalaGame from '../../components/Social/Games/board-games/Mancala';
import ReversiGame from '../../components/Social/Games/board-games/Reversi';
import TicTacToeGame from '../../components/Social/Games/board-games/TicTacToe';

import {Client as HeadlessClient} from 'boardgame.io/client';
import {INVALID_MOVE} from 'boardgame.io/core';

const fs = require('fs');
const path = require('path');

// __dirname = src/__tests__/utils → walk up twice to reach src/
const SRC_ROOT = path.join(__dirname, '../..');
const GAME_AI_PATH = path.join(SRC_ROOT, 'utils/gameAI.js');
const BOARD_GAMES_DIR = path.join(
  SRC_ROOT,
  'components/Social/Games/board-games'
);

const BOARD_GAMES = [
  {file: 'TicTacToe.js', varName: 'TicTacToeGame'},
  {file: 'ConnectFour.js', varName: 'ConnectFourGame'},
  {file: 'Checkers.js', varName: 'CheckersGame'},
  {file: 'Reversi.js', varName: 'ReversiGame'},
  {file: 'Mancala.js', varName: 'MancalaGame'},
];

// ─── Sanity ──────────────────────────────────────────────────────────

describe('gameAI.js module existence', () => {
  test('file exists at the expected path', () => {
    expect(fs.existsSync(GAME_AI_PATH)).toBe(true);
  });

  test('file is non-empty and has a module header', () => {
    const src = fs.readFileSync(GAME_AI_PATH, 'utf8');
    expect(src.length).toBeGreaterThan(200);
    expect(src).toMatch(/gameAI — Client-side AI opponent dispatcher/);
  });
});

// ─── Public exports ──────────────────────────────────────────────────

describe('gameAI.js exports', () => {
  const src = fs.readFileSync(GAME_AI_PATH, 'utf8');

  const EXPECTED_EXPORTS = [
    'DIFFICULTY',
    'BOARD_GAME_AI_SUPPORT',
    'getBoardGameBot',
    'hasBoardGameAI',
    'buildSoloBotsMap',
  ];

  test.each(EXPECTED_EXPORTS)('exports %s', (name) => {
    // Accept any of: `export const X`, `export function X`,
    // `export class X`, or `export { X }` style.
    const pattern = new RegExp(
      `export\\s+(const|function|class|\\{[^}]*\\b${name}\\b)`,
      'g'
    );
    const src2 = src.replace(
      new RegExp(`export\\s+(const|function|class)\\s+(\\w+)`, 'g'),
      (_, kind, n) => `__EXPORT_${n}__`
    );
    // Either direct export declaration or name-list export
    const hasDirect = src.match(
      new RegExp(`export\\s+(const|function|class)\\s+${name}\\b`)
    );
    const hasListed = src.match(
      new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`)
    );
    expect(hasDirect || hasListed).toBeTruthy();
  });

  test('imports MCTSBot and RandomBot from boardgame.io/ai', () => {
    expect(src).toMatch(/from\s+['"]boardgame\.io\/ai['"]/);
    expect(src).toMatch(/MCTSBot/);
    expect(src).toMatch(/RandomBot/);
  });

  test('DIFFICULTY has EASY, MEDIUM, HARD keys', () => {
    expect(src).toMatch(/EASY:\s*['"]easy['"]/);
    expect(src).toMatch(/MEDIUM:\s*['"]medium['"]/);
    expect(src).toMatch(/HARD:\s*['"]hard['"]/);
  });

  test('BOARD_GAME_AI_SUPPORT lists all 5 board types as true', () => {
    expect(src).toMatch(/tictactoe:\s*true/);
    expect(src).toMatch(/connect4:\s*true/);
    expect(src).toMatch(/checkers:\s*true/);
    expect(src).toMatch(/reversi:\s*true/);
    expect(src).toMatch(/mancala:\s*true/);
  });

  test('getBoardGameBot dispatches easy → RandomBot', () => {
    // There must be a branch returning RandomBot when difficulty is easy.
    expect(src).toMatch(/difficulty\s*===\s*DIFFICULTY\.EASY/);
    expect(src).toMatch(/return\s+RandomBot/);
  });

  test('getBoardGameBot uses MCTSBot for medium/hard with tuned params', () => {
    expect(src).toMatch(/iterations:\s*\d+/);
    expect(src).toMatch(/playoutDepth:\s*\d+/);
  });

  test('hard difficulty has more iterations than medium', () => {
    // Extract the two iteration counts and compare numerically.
    const presetsMatch = src.match(
      /MCTS_PRESETS\s*=\s*\{([\s\S]*?)\};/
    );
    expect(presetsMatch).toBeTruthy();
    const presetsBlock = presetsMatch[1];
    const mediumMatch = presetsBlock.match(
      /MEDIUM\]\s*:\s*\{[^}]*iterations:\s*(\d+)/
    );
    const hardMatch = presetsBlock.match(
      /HARD\]\s*:\s*\{[^}]*iterations:\s*(\d+)/
    );
    expect(mediumMatch).toBeTruthy();
    expect(hardMatch).toBeTruthy();
    expect(parseInt(hardMatch[1], 10)).toBeGreaterThan(
      parseInt(mediumMatch[1], 10)
    );
  });

  test('buildSoloBotsMap defaults AI to player 1', () => {
    expect(src).toMatch(/aiPlayerID\s*=\s*['"]1['"]/);
  });

  test('buildSoloBotsMap returns null when board type not supported', () => {
    expect(src).toMatch(/if\s*\(\s*!hasBoardGameAI/);
    expect(src).toMatch(/return\s+null/);
  });
});

// ─── Board game ai.enumerate presence ────────────────────────────────

describe('board games have ai.enumerate', () => {
  test.each(BOARD_GAMES)('%s has ai.enumerate declared', ({file}) => {
    const fullPath = path.join(BOARD_GAMES_DIR, file);
    expect(fs.existsSync(fullPath)).toBe(true);
    const src = fs.readFileSync(fullPath, 'utf8');
    // ai: { enumerate: (G, ctx) => ... } — allow whitespace + optional ctx
    expect(src).toMatch(/ai:\s*\{[\s\S]*?enumerate\s*:/);
  });

  test.each(BOARD_GAMES)('%s enumerate returns {move, args} shape',
    ({file}) => {
      const src = fs.readFileSync(path.join(BOARD_GAMES_DIR, file), 'utf8');
      // Each enumerate must emit objects with both 'move' and 'args' keys.
      expect(src).toMatch(/move:\s*['"]\w+['"]/);
      expect(src).toMatch(/args:\s*\[/);
    }
  );
});

// ─── Every enumerated move is a real, legal move ─────────────────────
//
// Behavioural: each Game is started in boardgame.io's own headless client,
// its ai.enumerate is asked for the opening moves, and the first one is
// actually played. A move name missing from the Game's `moves` block, or
// args the move rejects, leaves the turn where it was. BoardGameEngine's
// solo-bot wiring is covered by
// components/Social/Games/__tests__/BoardGameEngine.soloBots.test.js.

describe('enumerate emits moves the game accepts', () => {
  const GAMES = {
    'TicTacToe.js': TicTacToeGame,
    'ConnectFour.js': ConnectFourGame,
    'Checkers.js': CheckersGame,
    'Reversi.js': ReversiGame,
    'Mancala.js': MancalaGame,
  };

  test.each(Object.keys(GAMES))('%s: opening enumeration is playable', (file) => {
    const game = GAMES[file];
    const client = HeadlessClient({game, numPlayers: 2, playerID: '0'});
    client.start();
    const before = client.getState();

    const options = game.ai.enumerate(before.G, before.ctx, '0');
    expect(options.length).toBeGreaterThan(0);
    options.forEach(({move, args}) => {
      expect(Object.keys(game.moves)).toContain(move);
      expect(Array.isArray(args)).toBe(true);
    });

    const [{move, args}] = options;
    client.moves[move](...args);
    const after = client.getState();
    expect(after._stateID).toBeGreaterThan(before._stateID);
    expect(after.ctx.currentPlayer).toBe('1');
    client.stop();
  });
});

// ─── Checkers forced-capture rule preserved in enumerate ─────────────

describe('Checkers enumerate respects forced-capture rule', () => {
  const src = fs.readFileSync(path.join(BOARD_GAMES_DIR, 'Checkers.js'), 'utf8');

  test('uses getAllCaptures to detect mandatory captures', () => {
    const aiBlock = src.slice(src.indexOf('ai:'));
    expect(aiBlock).toMatch(/getAllCaptures/);
  });

  test('returns captures only when captures exist', () => {
    const aiBlock = src.slice(src.indexOf('ai:'));
    // The branch must check captures.length > 0 before emitting
    // non-capture moves.
    expect(aiBlock).toMatch(/captures\.length\s*>\s*0/);
  });

  test('falls back to getAllNonCaptures when no captures', () => {
    const aiBlock = src.slice(src.indexOf('ai:'));
    expect(aiBlock).toMatch(/getAllNonCaptures/);
  });
});

// ─── Reversi enumerate handles the pass case ─────────────────────────

describe('Reversi enumerate handles pass when no valid moves', () => {
  // Seat 0 holds one disc next to seat 1's disc in the corner: nothing can
  // be flanked, so seat 0 has no placement anywhere on the board.
  const stuckBoard = () => {
    const board = Array.from({length: 8}, () => Array(8).fill(null));
    board[0][0] = '1';
    board[0][1] = '0';
    return board;
  };

  test('emits a pass move when the current player has no placement', () => {
    const G = {board: stuckBoard(), passCount: 0};
    expect(ReversiGame.ai.enumerate(G, {currentPlayer: '0'})).toEqual([
      {move: 'pass', args: []},
    ]);
  });

  test('the enumerated pass is accepted by the pass move', () => {
    const G = {board: stuckBoard(), passCount: 0};
    expect(ReversiGame.moves.pass({G, playerID: '0'})).not.toBe(INVALID_MOVE);
    expect(G.passCount).toBe(1);
  });

  test('a seat with no placement is passed automatically at turn start', () => {
    // Without this the human seat (no Pass button) waits forever, and the
    // pass is counted twice once the bot also passes, ending the game early.
    const game = {...ReversiGame, setup: () => ({board: stuckBoard(), passCount: 0})};
    const client = HeadlessClient({game, numPlayers: 2, playerID: '0'});
    client.start();
    const {ctx, G} = client.getState();
    expect(ctx.currentPlayer).toBe('1');
    expect(G.passCount).toBe(1);
    expect(ctx.gameover).toBeUndefined();
    client.stop();
  });

  test('never emits pass while a placement exists', () => {
    const G = ReversiGame.setup();
    const options = ReversiGame.ai.enumerate(G, {currentPlayer: '0'});
    expect(options).toHaveLength(4); // the four standard opening moves
    expect(options.every(({move}) => move === 'placePiece')).toBe(true);
  });
});
