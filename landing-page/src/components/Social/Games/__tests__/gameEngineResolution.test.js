/**
 * Every LOCAL_CATALOG entry must resolve to a real, renderable engine.
 *
 * Regression guard for the offline-fallback mislaunch class (2026-09-02):
 * match3 launched Sudoku, bubble-shooter hit "Unknown scene" (hyphen vs the
 * registry's underscore key), word-search launched Word Scramble, and all
 * five board games launched Tic Tac Toe, because UnifiedGameScreen guessed
 * engines from category instead of the entry itself. The catalog now
 * carries backend-canonical engine + engine_config
 * (HARTOS integrations/social/game_catalog.py is the source of truth);
 * this test pins that contract against the client registries.
 */
import {LOCAL_CATALOG} from '../../../../hooks/useGameCatalog';
import {BOARD_REGISTRY} from '../engines/BoardGameEngine';
import {SCENE_REGISTRY} from '../engines/PhaserGameBridge';

const IMPLEMENTED_ENGINES = [
  'trivia',
  'opentdb_trivia',
  'boardgame',
  'phaser',
  'word_scramble',
  'word_search',
  'sudoku',
];
// Engines the backend catalog serves but this client renders as an honest
// "coming soon" placeholder (never silently a different game).
const COMING_SOON_ENGINES = ['word_chain', 'collab_puzzle', 'compute_challenge'];

describe('LOCAL_CATALOG engine resolution', () => {
  test('every entry declares a known engine', () => {
    for (const g of LOCAL_CATALOG) {
      expect([...IMPLEMENTED_ENGINES, ...COMING_SOON_ENGINES]).toContain(
        g.engine
      );
    }
  });

  test('phaser entries reference a registered scene', () => {
    for (const g of LOCAL_CATALOG.filter((e) => e.engine === 'phaser')) {
      expect(Object.keys(SCENE_REGISTRY)).toContain(g.engine_config?.scene_id);
    }
  });

  test('board entries reference a registered board type', () => {
    for (const g of LOCAL_CATALOG.filter((e) => e.engine === 'boardgame')) {
      expect(Object.keys(BOARD_REGISTRY)).toContain(
        g.engine_config?.board_type
      );
    }
  });

  test('match3 is a phaser game, never sudoku (the 2026-09-02 mislaunch)', () => {
    const match3 = LOCAL_CATALOG.find((g) => g.id === 'match3');
    expect(match3.engine).toBe('phaser');
    expect(match3.engine_config.scene_id).toBe('match3');
  });

  test('word-search uses its own engine, not word_scramble', () => {
    expect(LOCAL_CATALOG.find((g) => g.id === 'word-search').engine).toBe(
      'word_search'
    );
  });

  test('each board game maps to its own board, not tictactoe', () => {
    const expected = {
      'tic-tac-toe': 'tictactoe',
      'connect-four': 'connect4',
      checkers: 'checkers',
      reversi: 'reversi',
      mancala: 'mancala',
    };
    for (const [id, board] of Object.entries(expected)) {
      expect(
        LOCAL_CATALOG.find((g) => g.id === id).engine_config.board_type
      ).toBe(board);
    }
  });
});
