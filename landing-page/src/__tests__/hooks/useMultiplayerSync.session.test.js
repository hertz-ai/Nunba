/**
 * useMultiplayerSync: creating, joining or quick-matching a session reaches
 * 'waiting' when the backend says yes.
 *
 * gamesApi is built on services/axiosFactory, whose response interceptor
 * returns the BODY ({success, data: {...session}}).  The hook tested
 * `res.data?.success || res.data?.data?.id`, i.e. fields of the session
 * object, both undefined, so a created room stayed in 'creating'
 * ("Setting up...") for good.  Found through
 * cypress/e2e/multiplayer-lobby.cy.js on 2026-11-06.
 */

import {act, renderHook} from '@testing-library/react';

jest.mock('../../services/gameRealtimeService', () => ({
  __esModule: true,
  default: {
    isAvailable: () => false,
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));
jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {on: jest.fn(), off: jest.fn()},
}));
jest.mock('../../services/socialApi', () => ({
  gamesApi: {
    create: jest.fn(),
    join: jest.fn(),
    quickMatch: jest.fn(),
    get: jest.fn(() => new Promise(() => {})),
    leave: jest.fn(),
  },
}));

const useMultiplayerSync =
  require('../../components/Social/KidsLearning/shared/useMultiplayerSync').default;
const {gamesApi} = require('../../services/socialApi');

// The shape axiosFactory hands back: the response body.
const SESSION_BODY = {
  success: true,
  data: {
    id: 'session-1',
    is_host: true,
    participants: [{id: 1, username: 'Host'}],
  },
};

const OPTS = {gameConfigId: 'trivia-1', gameTitle: 'Trivia', enabled: true};

afterEach(() => jest.clearAllMocks());

test('a created room is waiting for players', async () => {
  gamesApi.create.mockResolvedValue(SESSION_BODY);
  const {result} = renderHook(() => useMultiplayerSync(OPTS));

  let id;
  await act(async () => {
    id = await result.current.createSession(4);
  });

  expect(id).toBe('session-1');
  expect(result.current.status).toBe('waiting');
  expect(result.current.sessionId).toBe('session-1');
  expect(result.current.isHost).toBe(true);
  expect(result.current.participants).toHaveLength(1);
});

test('a joined room is waiting for players', async () => {
  gamesApi.join.mockResolvedValue(SESSION_BODY);
  const {result} = renderHook(() => useMultiplayerSync(OPTS));

  let ok;
  await act(async () => {
    ok = await result.current.joinSession('session-1');
  });

  expect(ok).toBe(true);
  expect(result.current.status).toBe('waiting');
  expect(result.current.isHost).toBe(false);
});

test('a quick match is waiting for players', async () => {
  gamesApi.quickMatch.mockResolvedValue(SESSION_BODY);
  const {result} = renderHook(() => useMultiplayerSync(OPTS));

  let id;
  await act(async () => {
    id = await result.current.quickMatch();
  });

  expect(id).toBe('session-1');
  expect(result.current.status).toBe('waiting');
});

test('a refused create leaves the lobby idle with a message', async () => {
  gamesApi.create.mockRejectedValue(new Error('500'));
  const {result} = renderHook(() => useMultiplayerSync(OPTS));

  await act(async () => {
    await result.current.createSession(4);
  });

  expect(result.current.status).toBe('idle');
  expect(result.current.error).toBe('Could not create game session');
});
