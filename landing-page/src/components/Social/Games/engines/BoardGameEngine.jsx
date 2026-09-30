import { RADIUS } from '../../../../theme/socialTokens';
import { buildSoloBotsMap, DIFFICULTY } from '../../../../utils/gameAI';
import CheckersGame, { CheckersBoard } from '../board-games/Checkers';
import ConnectFourGame, { ConnectFourBoard } from '../board-games/ConnectFour';
import MancalaGame, { MancalaBoard } from '../board-games/Mancala';
import ReversiGame, { ReversiBoard } from '../board-games/Reversi';
import TicTacToeGame, { TicTacToeBoard } from '../board-games/TicTacToe';

import { Box, Typography, Button } from '@mui/material';
import { Local } from 'boardgame.io/multiplayer';
import { Client } from 'boardgame.io/react';
import React, { useState, useMemo, useEffect, useRef } from 'react';


// Exported so the catalog contract test can verify every boardgame entry's
// board_type resolves here.
export const BOARD_REGISTRY = {
  tictactoe: { game: TicTacToeGame, board: TicTacToeBoard },
  connect4: { game: ConnectFourGame, board: ConnectFourBoard },
  checkers: { game: CheckersGame, board: CheckersBoard },
  reversi: { game: ReversiGame, board: ReversiBoard },
  mancala: { game: MancalaGame, board: MancalaBoard },
};

function BoardGameWrapper({ children, onComplete, boardType, gameOver, result }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        p: 2,
        width: '100%',
        maxWidth: 600,
        mx: 'auto',
      }}
    >
      <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, textTransform: 'capitalize' }}>
        {boardType.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
      </Typography>

      {/* The client used to be cloned here to inject onGameOver, but the prop
          never reached the board — boardgame.io's Client does not forward
          unknown props through to it — so ctx.gameover was detected and then
          dropped, and a finished board never announced itself. The engine now
          threads the handler into the board directly via a ref. */}
      <Box sx={{ width: '100%' }}>{children}</Box>

      {gameOver && (
        <Box
          sx={{
            mt: 2,
            p: 3,
            borderRadius: RADIUS.lg,
            background: 'rgba(15, 14, 23, 0.95)',
            border: '1px solid rgba(108, 99, 255, 0.4)',
            textAlign: 'center',
            width: '100%',
          }}
        >
          <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
            {result?.draw
              ? "It's a draw!"
              : result?.winner === '0'
                ? 'Player 1 wins!'
                : 'Player 2 wins!'}
          </Typography>
          <Button
            variant="contained"
            onClick={onComplete}
            sx={{
              mt: 1,
              bgcolor: '#6C63FF',
              borderRadius: RADIUS.md,
              '&:hover': { bgcolor: '#5A52E0' },
            }}
          >
            Back to Games
          </Button>
        </Box>
      )}
    </Box>
  );
}

function GameBoardWithEndDetection({ board: BoardComponent, onGameOver, ...props }) {
  const { ctx } = props;

  useEffect(() => {
    if (ctx?.gameover && onGameOver) {
      onGameOver(ctx);
    }
  }, [ctx?.gameover, onGameOver, ctx]);

  return <BoardComponent {...props} />;
}

export default function BoardGameEngine({
  multiplayer,
  catalogEntry,
  onComplete,
  difficulty = DIFFICULTY.MEDIUM,
  soloMode = 'ai', // 'ai' | 'hotseat' (two people sharing one device)
}) {
  const boardType = catalogEntry?.engine_config?.board_type || 'tictactoe';

  // Solo = no live multiplayer session (hook absent, or started with no peers).
  const isSolo = !multiplayer || !multiplayer.isMultiplayer;

  // Locked at mount: a changing prop must not rebuild the memoised client
  // and wipe the board mid-game.
  const [lockedDifficulty] = useState(difficulty);

  // Held in a ref so the memoised client is not rebuilt when the handler
  // identity changes, which would reset the game mid-play.
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState(null);

  const onGameOverRef = useRef(null);
  onGameOverRef.current = (ctx) => {
    if (ctx?.gameover && !gameOver) {
      setGameOver(true);
      setResult(ctx.gameover);
    }
  };

  const GameClient = useMemo(() => {
    const entry = BOARD_REGISTRY[boardType];
    if (!entry) return null;

    // onGameOver must be threaded in: GameBoardWithEndDetection destructures
    // it, but nothing ever passed it, so ctx.gameover fired into a no-op and a
    // finished board never announced itself or called onComplete.
    const WrappedBoard = (props) => (
      <GameBoardWithEndDetection
        board={entry.board}
        onGameOver={(ctx) => onGameOverRef.current?.(ctx)}
        {...props}
      />
    );

    // Seat 1 is played by a bot.
    //
    // These are two-player games and only seat 0 is ever mounted (see the
    // <GameClient playerID="0" /> below), so with a plain Local() there was
    // nobody to take the opposing turn. Measured on the completion sweep: all
    // five board games sat with a COMPLETELY EMPTY board after 62 seconds of
    // clicking, having accepted no move at all, while the header cheerfully
    // said "Your turn". A solo player expects an opponent in Checkers or
    // Reversi anyway, so giving seat 1 to a bot is both the fix and the right
    // product behaviour.
    //
    // The bot comes from utils/gameAI, the one dispatcher for client-side
    // opponents: it owns the bounded MCTS budgets (the library default of
    // 1000 iterations / depth 50 stalls the tab on Checkers and Reversi) and
    // returns null for a board type without ai.enumerate, which falls back to
    // a plain Local() (hotseat), as does soloMode='hotseat'.
    const bots =
      isSolo && soloMode === 'ai'
        ? buildSoloBotsMap(boardType, lockedDifficulty)
        : null;

    return Client({
      game: entry.game,
      board: WrappedBoard,
      multiplayer: bots ? Local({ bots }) : Local(),
      numPlayers: 2,
    });
  }, [boardType, isSolo, soloMode, lockedDifficulty]);

  if (!BOARD_REGISTRY[boardType]) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          gap: 2,
        }}
      >
        <Typography variant="h5" sx={{ color: '#fff' }}>
          Coming Soon
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>
          The board game &quot;{boardType}&quot; is not yet available.
        </Typography>
        <Button
          variant="outlined"
          onClick={onComplete}
          sx={{
            color: '#6C63FF',
            borderColor: '#6C63FF',
            borderRadius: RADIUS.md,
            '&:hover': { borderColor: '#5A52E0', bgcolor: 'rgba(108,99,255,0.08)' },
          }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <BoardGameWrapper
      onComplete={onComplete}
      boardType={boardType}
      gameOver={gameOver}
      result={result}
    >
      <GameClient playerID="0" />
    </BoardGameWrapper>
  );
}
