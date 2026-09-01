/**
 * Clicking "Play Solo" must actually start the game.
 *
 * Mirror of the guard added to the Hevolve web copy, where this screen passed
 * `onStart` to <AdultLobby/> — which destructures `onStartSolo` /
 * `onGameStart` / `gameTitle` — leaving the callback undefined so no game
 * could be started on hevolve.ai at all. This copy passes the right props;
 * this test keeps it that way, since the two copies are known to drift.
 */
import UnifiedGameScreen from '../UnifiedGameScreen';

import {render, screen, fireEvent} from '@testing-library/react';
import React from 'react';

jest.mock('react-router-dom', () => ({
  useParams: () => ({gameId: 'sudoku'}),
  useNavigate: () => jest.fn(),
}));

// Backend down — exercises the LOCAL_CATALOG fallback path.
jest.mock('../../../../services/socialApi', () => ({
  gamesApi: {
    catalog: jest.fn(() => Promise.reject(new Error('offline'))),
    get: jest.fn(() => Promise.reject(new Error('offline'))),
  },
}));

jest.mock('../../KidsLearning/shared/useMultiplayerSync', () => ({
  __esModule: true,
  default: () => ({status: 'idle', isMultiplayer: false, participants: []}),
}));

jest.mock('../engines/SudokuEngine', () => ({
  __esModule: true,
  default: () => <div data-testid="sudoku-engine-mounted" />,
}));

describe('UnifiedGameScreen lobby → play', () => {
  test('Play Solo starts the game and mounts the engine', async () => {
    render(<UnifiedGameScreen />);

    const playSolo = await screen.findByText(/play solo/i, {}, {timeout: 5000});
    fireEvent.click(playSolo);

    expect(
      await screen.findByTestId('sudoku-engine-mounted')
    ).toBeInTheDocument();
  });

  test('the lobby shows the real game title, not the generic default', async () => {
    render(<UnifiedGameScreen />);
    expect(
      await screen.findByText(/sudoku/i, {}, {timeout: 5000})
    ).toBeInTheDocument();
  });
});
