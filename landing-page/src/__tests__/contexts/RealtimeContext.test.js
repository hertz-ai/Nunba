/**
 * Jest smoke tests for contexts/RealtimeContext — batch #22.
 */
import React from 'react';
import {render} from '@testing-library/react';

// The identity tests below drive the provider with a chosen session; the
// smoke tests only need the module to load, which these mocks do not change.
const mockSetIdentity = jest.fn();
let mockSession = {
  status: 'unauthenticated',
  identity: {user_id: null},
  tokens: {cloud: null, hartos_local: null},
};
jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    on: jest.fn(() => () => {}),
    setIdentity: (...args) => mockSetIdentity(...args),
    disconnect: jest.fn(),
  },
}));
jest.mock('../../hooks/useAuthSession', () => ({
  __esModule: true,
  default: () => mockSession,
}));
jest.mock('../../utils/backendHost', () => ({
  __esModule: true,
  isLocalBackendHost: () => true,
}));

describe('RealtimeContext module', () => {
  it('module loads without error', () => {
    const mod = require('../../contexts/RealtimeContext');
    expect(mod).toBeDefined();
  });

  it('exports a Provider and/or context', () => {
    const mod = require('../../contexts/RealtimeContext');
    const provider = mod.RealtimeProvider || mod.default;
    const ctx = mod.RealtimeContext;
    expect(typeof provider === 'function' || typeof ctx === 'object').toBe(true);
  });
});

// hartos-17 follow-up to the login dialog fix (2026-11-25): an account that
// must sign in again ('pending') has no token for its id, so the realtime
// transport connects as the 'guest' placeholder, as Demopage posts it.
describe('RealtimeContext identity', () => {
  const {RealtimeProvider} = require('../../contexts/RealtimeContext');

  beforeEach(() => {
    mockSetIdentity.mockClear();
  });

  function renderWith(session) {
    mockSession = session;
    render(React.createElement(RealtimeProvider, null, null));
  }

  it("a 'pending' account connects as 'guest', not its account id", () => {
    renderWith({
      status: 'pending',
      identity: {user_id: '10202'},
      tokens: {cloud: null, hartos_local: null},
    });
    expect(mockSetIdentity).toHaveBeenCalledWith({userId: 'guest', token: null});
    expect(mockSetIdentity).not.toHaveBeenCalledWith(
      expect.objectContaining({userId: '10202'})
    );
  });

  it('a signed-in account still connects as its own id', () => {
    renderWith({
      status: 'cloud',
      identity: {user_id: '10202'},
      tokens: {cloud: 'cloud-token', hartos_local: null},
    });
    expect(mockSetIdentity).toHaveBeenCalledWith({
      userId: '10202',
      token: 'cloud-token',
    });
  });
});
