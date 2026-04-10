/**
 * gameAI — Client-side AI opponent dispatcher for solo game play.
 *
 * Two-path architecture matching HARTOS integrations/social/game_ai.py:
 *
 *   1. CLIENT-AUTHORITATIVE (this file):
 *      Board games whose rules live in boardgame.io Game definitions
 *      at components/Social/Games/board-games/*. Rules live ONCE —
 *      re-implementing them in Python (HARTOS) would be a DRY
 *      violation. Uses boardgame.io/ai's MCTSBot / RandomBot, which
 *      read each Game's `ai.enumerate` to discover legal moves and
 *      then simulate forward via the Game's own `moves` functions.
 *      Zero duplication.
 *
 *   2. SERVER-CASCADED (HARTOS /games/<id>/ai_move endpoint):
 *      Engines where the server holds the answer key
 *      (opentdb_trivia, trivia, word_scramble, word_search, sudoku).
 *      The server "cheats" with difficulty-scaled error rate. Not
 *      handled here — see Nunba services/socialApi gamesApi.aiMove
 *      and the corresponding HARTOS game_ai.py.
 *
 * Difficulty model
 * ────────────────
 *   easy    → RandomBot (no planning, purely legal moves)
 *   medium  → MCTSBot with iterations=100, playoutDepth=30
 *   hard    → MCTSBot with iterations=600, playoutDepth=60
 *
 * Iterations/playoutDepth chosen so that:
 *   - tic-tac-toe: hard is near-perfect (solvable)
 *   - connect4: hard is decent mid-game strategy
 *   - checkers/reversi/mancala: hard feels challenging without
 *     blocking the UI thread for more than ~1-2s per move
 *
 * Usage
 * ─────
 *   import {getBoardGameBot, BOARD_GAME_AI_SUPPORT} from
 *     '../../../../utils/gameAI';
 *
 *   const bot = getBoardGameBot('hard');
 *   <GameClient bots={{'1': bot}} />
 *
 * Integration point: BoardGameEngine.jsx — when multiplayer is null
 * or multiplayer.isMultiplayer is false, wire Local({bots}) so
 * player '1' is AI-controlled.
 */

import {MCTSBot, RandomBot} from 'boardgame.io/ai';

// ─── Difficulty presets ──────────────────────────────────────────────

export const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

// MCTS tuning per difficulty. Higher iterations = more "thinking" but
// slower response. playoutDepth caps simulation length so games with
// long endgames (checkers) don't run away.
//
// Chosen to keep AI turn wall time under ~1s on mid-range laptops
// even for the highest-branching games (connect4 branching factor 7,
// checkers 10-20). Previous values of 600/60 were too aggressive for
// connect4/checkers — measured at ~2-4s of main-thread jank with no
// loading indicator. Dropping to 300/40 keeps MCTS strong on the
// small-board games (tic-tac-toe stays near-perfect, reversi still
// plays well) while keeping the UI responsive.
const MCTS_PRESETS = {
  [DIFFICULTY.MEDIUM]: {iterations: 80, playoutDepth: 25},
  [DIFFICULTY.HARD]: {iterations: 300, playoutDepth: 40},
};

// ─── Board game AI support map ───────────────────────────────────────
//
// Maps board_type strings (used in BoardGameEngine's BOARD_REGISTRY)
// to a support flag. Explicit so a future board_type added to the
// registry without an ai.enumerate in its Game def is caught at
// dispatch time rather than silently erroring deep inside boardgame.io.
export const BOARD_GAME_AI_SUPPORT = {
  tictactoe: true,
  connect4: true,
  checkers: true,
  reversi: true,
  mancala: true,
};

// ─── Dispatcher ──────────────────────────────────────────────────────

/**
 * Resolve a client-side AI bot for the given difficulty.
 *
 * Returns a **bot class** (not an instance) — boardgame.io/multiplayer
 * Local() accepts a `bots` map keyed by playerID where values are bot
 * constructors that it instantiates with the Game definition.
 *
 * Easy → RandomBot (just picks uniformly from ai.enumerate output)
 * Medium/Hard → MCTSBot with tuned iterations/playoutDepth
 *
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @returns {Function} bot class constructor
 */
export function getBoardGameBot(difficulty = DIFFICULTY.MEDIUM) {
  if (difficulty === DIFFICULTY.EASY) {
    return RandomBot;
  }

  const preset = MCTS_PRESETS[difficulty] || MCTS_PRESETS[DIFFICULTY.MEDIUM];

  // boardgame.io's Local() multiplayer wants a bot **constructor** that
  // it calls as `new Bot({ game, enumerate })`. Return a subclass that
  // hardcodes the MCTS parameters so the caller doesn't have to thread
  // them through.
  class TunedMCTSBot extends MCTSBot {
    constructor(opts) {
      super({
        ...opts,
        iterations: preset.iterations,
        playoutDepth: preset.playoutDepth,
      });
    }
  }

  return TunedMCTSBot;
}

/**
 * Check whether a board_type has client-side AI support.
 *
 * True iff the board game's Game definition has `ai.enumerate`.
 * Callers should fall back to `Local()` hotseat when support is
 * false (no AI — just 2-player same-device).
 *
 * @param {string} boardType - e.g. 'tictactoe', 'connect4'
 * @returns {boolean}
 */
export function hasBoardGameAI(boardType) {
  return BOARD_GAME_AI_SUPPORT[boardType] === true;
}

/**
 * Build the `bots` map for boardgame.io's Local() multiplayer.
 *
 * In solo mode we put the AI as player '1'. Player '0' is the human.
 * If the caller wants a different mapping (e.g. AI as player '0'),
 * pass `{ aiPlayerID: '0' }`.
 *
 * @param {string} boardType
 * @param {string} difficulty
 * @param {object} options - { aiPlayerID: string }
 * @returns {object|null} bots map or null if AI not supported
 */
export function buildSoloBotsMap(
  boardType,
  difficulty = DIFFICULTY.MEDIUM,
  {aiPlayerID = '1'} = {},
) {
  if (!hasBoardGameAI(boardType)) {
    return null;
  }
  const Bot = getBoardGameBot(difficulty);
  return {[aiPlayerID]: Bot};
}
