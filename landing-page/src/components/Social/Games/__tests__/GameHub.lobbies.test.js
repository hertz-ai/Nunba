/**
 * GameHub lists the open lobbies the backend returns.
 *
 * gamesApi is built on services/axiosFactory, whose response interceptor
 * returns the BODY ({success, data: [...]}).  fetchLobbies read
 * `res.data?.data`, i.e. `.data` of the lobby array, so the Open Lobbies
 * section never rendered.  Found by cypress/e2e/game-hub.cy.js
 * ("shows Open Lobbies section when lobbies exist") on 2026-11-06.
 */

import {render, screen, waitFor} from '@testing-library/react';
import React from 'react';
import {MemoryRouter} from 'react-router-dom';

jest.mock('../../../../services/socialApi', () => ({
  gamesApi: {
    list: jest.fn(),
    catalog: jest.fn(),
    quickMatch: jest.fn(),
    join: jest.fn(),
  },
}));

const {gamesApi} = require('../../../../services/socialApi');
const GameHub = require('../GameHub').default;

beforeEach(() => {
  // The shapes axiosFactory hands back: response bodies.
  gamesApi.list.mockResolvedValue({
    success: true,
    data: [
      {id: 'lobby-1', game_type: 'trivia', title: 'Trivia Night',
       host_name: 'Alice', player_count: 2, max_players: 4, status: 'waiting'},
    ],
  });
  gamesApi.catalog.mockResolvedValue({success: true, data: [], meta: {}});
});

afterEach(() => jest.clearAllMocks());

test('an open lobby from the backend is listed', async () => {
  render(
    <MemoryRouter initialEntries={['/social/games']}>
      <GameHub />
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(screen.getByText('Trivia Night')).toBeInTheDocument();
  });
  expect(screen.getByText(/open lobbies/i)).toBeInTheDocument();
});
