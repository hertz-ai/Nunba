/**
 * useGameCatalog shows the backend catalog when the backend has one.
 *
 * gamesApi is built on services/axiosFactory, whose response interceptor
 * returns the BODY ({success, data: [...], meta}), not the axios response.
 * The hook read `res.data?.data`, i.e. `.data` of the games array, so every
 * successful backend answer looked empty and the hub always fell back to
 * LOCAL_CATALOG.  Found by cypress/e2e/game-hub.cy.js on 2026-11-06: the
 * stubbed catalog's "General Knowledge" never appeared on /social/games.
 */

import {renderHook, waitFor} from '@testing-library/react';

jest.mock('../../services/socialApi', () => ({
  gamesApi: {catalog: jest.fn()},
}));

const {default: useGameCatalog, LOCAL_CATALOG} = require('../../hooks/useGameCatalog');
const {gamesApi} = require('../../services/socialApi');

// The shape axiosFactory hands back: the response body.
const BACKEND_BODY = {
  success: true,
  data: [
    {id: 'trivia-general-knowledge-classic', title: 'General Knowledge', category: 'trivia'},
    {id: 'backend-only-game', title: 'Backend Only', category: 'party'},
  ],
  meta: {total: 2, categories: {trivia: 1, party: 1}},
};

afterEach(() => jest.clearAllMocks());

describe('useGameCatalog with a backend catalog', () => {
  test('returns the backend games, not the local fallback', async () => {
    gamesApi.catalog.mockResolvedValue(BACKEND_BODY);

    const {result} = renderHook(() => useGameCatalog({}));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.games.map((g) => g.id)).toEqual([
      'trivia-general-knowledge-classic',
      'backend-only-game',
    ]);
    expect(result.current.total).toBe(2);
    expect(result.current.categories).toEqual({trivia: 1, party: 1});
  });

  test('an empty backend catalog still falls back to the local one', async () => {
    gamesApi.catalog.mockResolvedValue({success: true, data: [], meta: {total: 0}});

    const {result} = renderHook(() => useGameCatalog({}));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.games.length).toBe(LOCAL_CATALOG.length);
  });

  test('a failed backend call falls back to the local catalog', async () => {
    gamesApi.catalog.mockRejectedValue(new Error('network'));

    const {result} = renderHook(() => useGameCatalog({}));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.games.length).toBe(LOCAL_CATALOG.length);
  });
});
