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
 *   - BoardGameEngine.jsx imports buildSoloBotsMap from utils/gameAI
 *     and wires it into Local() in solo mode
 *   - Each board game's enumerate returns the right move name (the
 *     name of a move function defined in its own moves block — so a
 *     future renamer doesn't silently break AI via string mismatch)
 *   - Difficulty presets map 3 levels (easy/medium/hard) → bot type
 */

const fs = require('fs');
const path = require('path');

// __dirname = src/__tests__/utils → walk up twice to reach src/
const SRC_ROOT = path.join(__dirname, '../..');
const GAME_AI_PATH = path.join(SRC_ROOT, 'utils/gameAI.js');
const BOARD_GAMES_DIR = path.join(
  SRC_ROOT,
  'components/Social/Games/board-games'
);
const BOARD_ENGINE_PATH = path.join(
  SRC_ROOT,
  'components/Social/Games/engines/BoardGameEngine.jsx'
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

// ─── Enumerate move names match actual move function names ──────────

describe('enumerate move names reference real moves', () => {
  // Each game's enumerate must emit `move: '<name>'` where <name> is
  // a key defined in that game's own `moves: { ... }` block. This
  // catches the "rename the move function and forget the AI" class
  // of bug.
  //
  // Hand-mapped because text parsing the full moves block across all
  // 5 files robustly is more code than the payoff warrants — and the
  // mapping itself should be stable.
  const EXPECTED = [
    {file: 'TicTacToe.js', expectedMoves: ['clickCell']},
    {file: 'ConnectFour.js', expectedMoves: ['dropPiece']},
    {file: 'Checkers.js', expectedMoves: ['movePiece']},
    {file: 'Reversi.js', expectedMoves: ['placePiece', 'pass']},
    {file: 'Mancala.js', expectedMoves: ['sowStones']},
  ];

  test.each(EXPECTED)(
    '$file enumerate emits $expectedMoves and those are defined in moves block',
    ({file, expectedMoves}) => {
      const src = fs.readFileSync(path.join(BOARD_GAMES_DIR, file), 'utf8');

      // Extract the ai.enumerate body (everything between `ai: {` and
      // the matching closing brace — simple scan, good enough for
      // our single-ai-block files).
      const aiIdx = src.indexOf('ai:');
      expect(aiIdx).toBeGreaterThan(-1);
      const enumerateBody = src.slice(aiIdx);

      expectedMoves.forEach((moveName) => {
        // enumerate must reference this move name
        expect(enumerateBody).toMatch(
          new RegExp(`move:\\s*['"]${moveName}['"]`)
        );
        // moves block must define it
        expect(src).toMatch(
          new RegExp(`${moveName}\\s*:\\s*\\(\\s*\\{`)
        );
      });
    }
  );
});

// ─── BoardGameEngine wiring ──────────────────────────────────────────

describe('BoardGameEngine.jsx solo-mode wiring', () => {
  const src = fs.readFileSync(BOARD_ENGINE_PATH, 'utf8');

  test('imports buildSoloBotsMap from utils/gameAI', () => {
    expect(src).toMatch(
      /import\s*\{[^}]*buildSoloBotsMap[^}]*\}\s*from\s*['"][^'"]*utils\/gameAI['"]/
    );
  });

  test('imports DIFFICULTY from utils/gameAI', () => {
    expect(src).toMatch(
      /import\s*\{[^}]*DIFFICULTY[^}]*\}\s*from\s*['"][^'"]*utils\/gameAI['"]/
    );
  });

  test('accepts difficulty prop with default', () => {
    expect(src).toMatch(/difficulty\s*=\s*DIFFICULTY\.[A-Z]+/);
  });

  test('detects solo mode via !multiplayer || !multiplayer.isMultiplayer', () => {
    expect(src).toMatch(/!multiplayer\s*\|\|\s*!multiplayer\.isMultiplayer/);
  });

  test('calls buildSoloBotsMap in solo mode with locked difficulty', () => {
    expect(src).toMatch(/buildSoloBotsMap\(boardType,\s*lockedDifficulty\)/);
  });

  test('locks difficulty at mount via useState initializer', () => {
    expect(src).toMatch(/useState\(difficulty\)/);
  });

  test('accepts soloMode prop with default "ai"', () => {
    expect(src).toMatch(/soloMode\s*=\s*['"]ai['"]/);
  });

  test('preserves hotseat as a solo option', () => {
    expect(src).toMatch(/soloMode\s*===\s*['"]ai['"]/);
    // hotseat comment must be present so a future reader knows why
    expect(src).toMatch(/hotseat/);
  });

  test('wires Local({bots}) when bots map is non-null', () => {
    expect(src).toMatch(/Local\(\{\s*bots\s*\}\)/);
  });

  test('falls back to Local() when bots map is null', () => {
    expect(src).toMatch(/bots\s*\?\s*Local\(\{\s*bots\s*\}\)\s*:\s*Local\(\)/);
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
  const src = fs.readFileSync(path.join(BOARD_GAMES_DIR, 'Reversi.js'), 'utf8');

  test('emits a pass move when getValidMoves returns empty', () => {
    const aiBlock = src.slice(src.indexOf('ai:'));
    expect(aiBlock).toMatch(/getValidMoves/);
    expect(aiBlock).toMatch(/validMoves\.length\s*===\s*0/);
    expect(aiBlock).toMatch(/move:\s*['"]pass['"]/);
  });
});
