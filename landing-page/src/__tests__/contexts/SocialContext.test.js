/**
 * SocialContext.test.js — Unit tests for the SocialContext provider.
 *
 * Tests auth state management, login/logout, user profile loading,
 * derived state (accessTier, isGuest, isAuthenticated), and token refresh.
 */
import {render, screen, act, waitFor} from '@testing-library/react';
import React from 'react';
import {BrowserRouter} from 'react-router-dom';

// Build the mock axios instance — all API calls route through this
const mockAxiosInstance = {
  get: jest.fn((url) => {
    if (url === '/auth/me')
      return Promise.resolve({
        data: {id: 'u1', username: 'testuser', role: 'flat'},
      });
    if (url === '/notifications') return Promise.resolve({meta: {total: 5}});
    if (url === '/resonance/wallet')
      return Promise.resolve({data: {pulse: 100}});
    if (url === '/onboarding/progress')
      return Promise.resolve({data: {step: 2}});
    return Promise.resolve({data: {}});
  }),
  post: jest.fn(() => Promise.resolve({data: {}})),
  patch: jest.fn(() => Promise.resolve({data: {}})),
  put: jest.fn(() => Promise.resolve({data: {}})),
  delete: jest.fn(() => Promise.resolve({data: {}})),
};

jest.mock('../../services/axiosFactory', () => ({
  createApiClient: jest.fn(() => mockAxiosInstance),
}));

// A signed-in account's keys are stored encrypted; "ENC:<value>" decrypts to
// <value> here so a test can seed them.  The device id is fixed.
jest.mock('../../utils/encryption', () => ({
  __esModule: true,
  encrypt: (v) => (v == null ? null : `ENC:${String(v)}`),
  decrypt: (v) =>
    typeof v === 'string' && v.startsWith('ENC:') ? v.slice(4) : null,
}));
jest.mock('../../utils/deviceId', () => ({
  __esModule: true,
  getStableDeviceId: () => Promise.resolve('dev-1'),
}));

// The realtimeService.on() must always return a callable unsubscribe function.
// We define these outside the factory so they survive jest.clearAllMocks().
const mockUnsubNotification = jest.fn();
const mockUnsubAchievement = jest.fn();
const mockRealtimeOn = jest.fn();
const mockRealtimeOff = jest.fn();

jest.mock('../../services/realtimeService', () => ({
  __esModule: true,
  default: {
    on: mockRealtimeOn,
    off: mockRealtimeOff,
  },
}));

jest.mock('../../services/apiCache', () => ({
  apiCache: {
    clearAll: jest.fn(),
    buildKey: jest.fn(() => 'test-key'),
    get: jest.fn(() => null),
    set: jest.fn(),
    getPublic: jest.fn(() => null),
    setPublic: jest.fn(),
    getPublicTTL: jest.fn(() => 300000),
    invalidateOnMutation: jest.fn(),
    dedupFetch: jest.fn((key, fn) => fn()),
    clearPublic: jest.fn(),
    getStats: jest.fn(() => ({})),
    getTTL: jest.fn(() => 60000),
  },
}));

const {SocialProvider, useSocial} = require('../../contexts/SocialContext');
const {apiCache} = require('../../services/apiCache');

// Test consumer that exposes context values
function TestConsumer() {
  const ctx = useSocial();
  return (
    <div>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="isAuthenticated">{String(ctx.isAuthenticated)}</span>
      <span data-testid="accessTier">{ctx.accessTier}</span>
      <span data-testid="isGuest">{String(ctx.isGuest)}</span>
      <span data-testid="userRole">{String(ctx.userRole)}</span>
      <span data-testid="unreadCount">{ctx.unreadCount}</span>
      <span data-testid="username">{ctx.currentUser?.username || 'none'}</span>
      <span data-testid="profileAnswer">{String(ctx.profileAnswer)}</span>
      <button data-testid="logout-btn" onClick={ctx.logout}>
        Logout
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <BrowserRouter>
      <SocialProvider>
        <TestConsumer />
      </SocialProvider>
    </BrowserRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  jest.useFakeTimers();

  // Re-apply realtimeService.on implementation after clearAllMocks.
  // SocialContext calls realtimeService.on('notification', handler) and
  // realtimeService.on('achievement', handler), and expects each to return
  // an unsubscribe function that it invokes during cleanup.
  let callIndex = 0;
  mockRealtimeOn.mockImplementation(() => {
    callIndex++;
    if (callIndex === 1) return mockUnsubNotification;
    return mockUnsubAchievement;
  });

  // Re-apply default get mock in case a previous test replaced it
  mockAxiosInstance.get.mockImplementation((url) => {
    if (url === '/auth/me')
      return Promise.resolve({
        data: {id: 'u1', username: 'testuser', role: 'flat'},
      });
    if (url === '/notifications') return Promise.resolve({meta: {total: 5}});
    if (url === '/resonance/wallet')
      return Promise.resolve({data: {pulse: 100}});
    if (url === '/onboarding/progress')
      return Promise.resolve({data: {step: 2}});
    return Promise.resolve({data: {}});
  });
});

afterEach(() => {
  jest.useRealTimers();
});

// Helper: advance time without hitting infinite loop from setInterval
async function flushWithTimers() {
  // Advance by 100ms — enough for immediate effects, not enough to trigger intervals
  await act(async () => {
    jest.advanceTimersByTime(100);
  });
  // Flush pending microtasks (async API calls)
  await act(async () => {});
}

// ── Auth state — no token ─────────────────────────────────────────────────
describe('SocialContext - no token', () => {
  it('sets loading to false when no access_token in localStorage', async () => {
    renderProvider();
    await flushWithTimers();
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('sets accessTier to anonymous when no token', async () => {
    renderProvider();
    await flushWithTimers();
    expect(screen.getByTestId('accessTier').textContent).toBe('anonymous');
  });

  it('isAuthenticated is false when no token', async () => {
    renderProvider();
    await flushWithTimers();
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
  });
});

// ── Auth state — with token ───────────────────────────────────────────────
describe('SocialContext - with token', () => {
  beforeEach(() => {
    // Set a JWT with role=flat in payload
    const payload = btoa(
      JSON.stringify({
        sub: 'u1',
        role: 'flat',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    );
    localStorage.setItem('access_token', `header.${payload}.sig`);
  });

  it('fetches user profile on mount', async () => {
    renderProvider();
    await flushWithTimers();
    await waitFor(() => {
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/auth/me',
        expect.objectContaining({keepStatus: true})
      );
    });
  });

  it('sets user data from API response', async () => {
    renderProvider();
    await flushWithTimers();
    await waitFor(() => {
      expect(screen.getByTestId('username').textContent).toBe('testuser');
    });
  });

  it('sets isAuthenticated to true when user loaded', async () => {
    renderProvider();
    await flushWithTimers();
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    });
  });

  it('sets accessTier from user role', async () => {
    renderProvider();
    await flushWithTimers();
    await waitFor(() => {
      expect(screen.getByTestId('accessTier').textContent).toBe('flat');
    });
  });

  // A cloud Hevolve account can carry its Hevolve role ('student',
  // 'indvteacher') on the social user row.  That is not a tier: the
  // server treats it as a plain signed-in member, so the page must too,
  // not rank it below a guest and hide Privacy and Encounters.
  it.each(['student', 'indvteacher'])(
    'a signed-in user whose role %s is not a tier is a flat member',
    async (role) => {
      mockAxiosInstance.get.mockImplementation((url) => {
        if (url === '/auth/me')
          return Promise.resolve({data: {id: 'u1', username: 'testuser', role}});
        return Promise.resolve({data: {}});
      });
      renderProvider();
      await flushWithTimers();
      await waitFor(() => {
        expect(screen.getByTestId('accessTier').textContent).toBe('flat');
      });
    }
  );

  it.each(['guest', 'regional', 'central'])(
    'a tier role %s is kept as it is',
    async (role) => {
      mockAxiosInstance.get.mockImplementation((url) => {
        if (url === '/auth/me')
          return Promise.resolve({data: {id: 'u1', username: 'testuser', role}});
        return Promise.resolve({data: {}});
      });
      renderProvider();
      await flushWithTimers();
      await waitFor(() => {
        expect(screen.getByTestId('accessTier').textContent).toBe(role);
      });
    }
  );

  it('fetches resonance wallet on mount', async () => {
    renderProvider();
    await flushWithTimers();
    await waitFor(() => {
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/resonance/wallet');
    });
  });

  it('fetches onboarding progress on mount', async () => {
    renderProvider();
    await flushWithTimers();
    await waitFor(() => {
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/onboarding/progress'
      );
    });
  });

  it('fetches unread notifications on mount', async () => {
    renderProvider();
    await flushWithTimers();
    await waitFor(() => {
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/notifications',
        expect.anything()
      );
    });
  });

  it('subscribes to realtime notification and achievement events', async () => {
    renderProvider();
    await flushWithTimers();
    await waitFor(() => {
      expect(mockRealtimeOn).toHaveBeenCalledWith(
        'notification',
        expect.any(Function)
      );
      expect(mockRealtimeOn).toHaveBeenCalledWith(
        'achievement',
        expect.any(Function)
      );
    });
  });
});

// ── Logout ────────────────────────────────────────────────────────────────
describe('SocialContext - logout', () => {
  it('clears auth state on logout', async () => {
    const payload = btoa(
      JSON.stringify({
        sub: 'u1',
        role: 'flat',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    );
    localStorage.setItem('access_token', `header.${payload}.sig`);

    renderProvider();
    await flushWithTimers();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    });

    // Trigger logout
    act(() => {
      screen.getByTestId('logout-btn').click();
    });

    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    expect(screen.getByTestId('username').textContent).toBe('none');
  });

  it('removes access_token from localStorage', async () => {
    localStorage.setItem('access_token', 'test-token');
    localStorage.setItem('refresh_token', 'test-refresh');

    renderProvider();
    await flushWithTimers();

    act(() => {
      screen.getByTestId('logout-btn').click();
    });

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('clears apiCache on logout', async () => {
    const payload = btoa(
      JSON.stringify({sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600})
    );
    localStorage.setItem('access_token', `header.${payload}.sig`);

    renderProvider();
    await flushWithTimers();

    act(() => {
      screen.getByTestId('logout-btn').click();
    });

    expect(apiCache.clearAll).toHaveBeenCalled();
  });
});

// ── Derived state ─────────────────────────────────────────────────────────
describe('SocialContext - derived state', () => {
  it('isGuest is true when guest_mode is in localStorage', async () => {
    localStorage.setItem('guest_mode', 'true');
    renderProvider();
    await flushWithTimers();
    expect(screen.getByTestId('isGuest').textContent).toBe('true');
  });

  it('accessTier defaults to guest when guest_mode active', async () => {
    localStorage.setItem('guest_mode', 'true');
    renderProvider();
    await flushWithTimers();
    expect(screen.getByTestId('accessTier').textContent).toBe('guest');
  });
});

// ── auth:expired event ────────────────────────────────────────────────────
describe('SocialContext - auth:expired', () => {
  it('clears user state on auth:expired event', async () => {
    const payload = btoa(
      JSON.stringify({
        sub: 'u1',
        role: 'flat',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    );
    localStorage.setItem('access_token', `header.${payload}.sig`);

    renderProvider();
    await flushWithTimers();

    await waitFor(() => {
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
    });

    act(() => {
      window.dispatchEvent(new Event('auth:expired'));
    });

    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
  });
});

// ── API error handling ────────────────────────────────────────────────────
describe('SocialContext - API errors', () => {
  it('handles fetchProfile failure gracefully', async () => {
    mockAxiosInstance.get.mockImplementation((url) => {
      if (url === '/auth/me') return Promise.reject(new Error('Network error'));
      return Promise.resolve({data: {}});
    });

    const payload = btoa(
      JSON.stringify({sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600})
    );
    localStorage.setItem('access_token', `header.${payload}.sig`);

    renderProvider();
    await flushWithTimers();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });
});

// ── What /auth/me answered ────────────────────────────────────────────────
// 2026-10-19: the desktop page asked /auth/me ~10 s before HARTOS registered
// the route, got 404, and every later Admin click redirected to /social.  A
// 404 says nothing about the token; only 200 / 401 / 403 do.
describe('SocialContext - what /auth/me answered', () => {
  // A cloud login's token on the desktop: 32 characters, not a JWT, so the
  // page has no user until /auth/me answers.
  beforeEach(() => {
    localStorage.setItem('access_token', 'p'.repeat(32));
  });

  function meRejects(body) {
    mockAxiosInstance.get.mockImplementation((url) =>
      url === '/auth/me' ? Promise.reject(body) : Promise.resolve({data: {}})
    );
  }

  it('a 200 is an answer', async () => {
    renderProvider();
    await flushWithTimers();
    await waitFor(() => {
      expect(screen.getByTestId('profileAnswer').textContent).toBe('answered');
    });
    expect(screen.getByTestId('accessTier').textContent).toBe('flat');
  });

  it('a 401 is an answer: signed out', async () => {
    meRejects({success: false, needs_sign_in: true, status: 401});
    renderProvider();
    await flushWithTimers();
    await waitFor(() => {
      expect(screen.getByTestId('profileAnswer').textContent).toBe('answered');
    });
    expect(screen.getByTestId('accessTier').textContent).toBe('anonymous');
  });

  it('a 404 is no answer', async () => {
    meRejects({error: 'API endpoint not found', status: 404});
    renderProvider();
    await flushWithTimers();
    await waitFor(() => {
      expect(screen.getByTestId('profileAnswer').textContent).toBe(
        'unanswered'
      );
    });
  });

  it('a network failure is no answer', async () => {
    meRejects(new Error('Network Error'));
    renderProvider();
    await flushWithTimers();
    await waitFor(() => {
      expect(screen.getByTestId('profileAnswer').textContent).toBe(
        'unanswered'
      );
    });
  });

  it('a JWT user is kept when /auth/me does not answer', async () => {
    const payload = btoa(
      JSON.stringify({
        user_id: 'u9',
        username: 'jwtuser',
        role: 'flat',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    );
    localStorage.setItem('access_token', `header.${payload}.sig`);
    meRejects({error: 'API endpoint not found', status: 404});
    renderProvider();
    await flushWithTimers();
    await waitFor(() => {
      expect(screen.getByTestId('profileAnswer').textContent).toBe(
        'unanswered'
      );
    });
    expect(screen.getByTestId('username').textContent).toBe('jwtuser');
    expect(screen.getByTestId('accessTier').textContent).toBe('flat');
  });
});

// 2026-11-24 (hartos-17 M3): a 401 left a signed-in account's user_id beside
// guest_mode and the desktop's injected hardware guest id.  The page slid into
// the guest: readAuthSession said 'guest', this provider showed the guest
// user, a guest was minted over the account, and Demopage posted the guest id,
// which made the guest the desktop's owner.  Now the account signs in again;
// a guest with no account keys is restored and refreshed as before.
describe('SocialContext - a cloud account is never shown as the guest', () => {
  const {
    readAuthSession,
    clearAccessTokenForExpiry,
  } = require('../../hooks/useAuthSession');
  const axios = require('axios');
  const MINTED = {
    data: {user: {id: 'g-minted'}, token: 'guest-jwt-minted', existing: true},
  };
  const jwt = (expSecondsFromNow) =>
    `header.${btoa(
      JSON.stringify({
        user_id: 'g-1',
        username: 'guest_g1',
        role: 'guest',
        exp: Math.floor(Date.now() / 1000) + expSecondsFromNow,
      })
    )}.sig`;

  function seedGuestKeys() {
    localStorage.setItem('guest_mode', 'true');
    // What _restoreGuestIdFromInjection writes from window.__NUNBA_GUEST_ID__.
    localStorage.setItem('guest_user_id', 'hw-guest-1');
    localStorage.setItem('guest_name', 'Radiant.Green.buildra');
  }
  function seedAccountKeys() {
    localStorage.setItem('user_id', 'ENC:10202');
    localStorage.setItem('email_address', 'ENC:sales@hertzai.com');
    localStorage.setItem('phone_number', 'ENC:+919000000001');
    localStorage.setItem('refresh_token', 'ENC:refresh-1');
  }
  function expectAccountKeysKept() {
    expect(localStorage.getItem('user_id')).toBe('ENC:10202');
    expect(localStorage.getItem('email_address')).toBe('ENC:sales@hertzai.com');
    expect(localStorage.getItem('phone_number')).toBe('ENC:+919000000001');
    expect(localStorage.getItem('refresh_token')).toBe('ENC:refresh-1');
  }
  let plainPosts;
  const allPosts = () => [
    ...mockAxiosInstance.post.mock.calls,
    ...plainPosts.mock.calls,
  ];
  const guestRegisterCalls = () =>
    allPosts().filter(([url]) => url === '/auth/guest-register');
  // Any post carrying a user_id that is not '' or the 'guest' placeholder.
  const realUserIdsPosted = () =>
    allPosts()
      .map(([, body]) => body && body.user_id)
      .filter((id) => id !== undefined && id !== '' && id !== 'guest');
  const username = () => screen.getByTestId('username').textContent;

  beforeEach(() => {
    mockAxiosInstance.post.mockImplementation((url) =>
      Promise.resolve(url === '/auth/guest-register' ? MINTED : {data: {}})
    );
    plainPosts = jest
      .spyOn(axios, 'post')
      .mockImplementation(() => Promise.resolve({data: {}}));
  });

  afterEach(() => {
    mockAxiosInstance.post.mockImplementation(() =>
      Promise.resolve({data: {}})
    );
    plainPosts.mockRestore();
  });

  it('M3: signed in, then a 401: pending, no current user, no mint, nothing posted for the account', async () => {
    seedAccountKeys();
    seedGuestKeys();
    localStorage.setItem('access_token', 'p'.repeat(32)); // opaque Kong token
    renderProvider();
    await flushWithTimers();
    await waitFor(() => expect(username()).toBe('testuser'));

    await act(async () => {
      clearAccessTokenForExpiry(); // what the 401 handler runs
    });
    await flushWithTimers();

    expect(readAuthSession().status).toBe('pending');
    expect(username()).toBe('none');
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    expect(guestRegisterCalls()).toHaveLength(0);
    expect(realUserIdsPosted()).toEqual([]);
    // The desktop's owner record is not touched at all.
    expect(allPosts().filter(([url]) => url === '/api/storage/set')).toEqual([]);
    expect(localStorage.getItem('access_token')).toBeNull();
    expectAccountKeysKept();
  });

  it('an expired token at mount beside the account keys: no mint, no guest user', async () => {
    seedAccountKeys();
    seedGuestKeys();
    localStorage.setItem('access_token', jwt(-60));
    renderProvider();
    await flushWithTimers();

    expect(guestRegisterCalls()).toHaveLength(0);
    expect(username()).toBe('none');
    expect(readAuthSession().status).toBe('pending');
    expect(localStorage.getItem('access_token')).toBeNull();
    expectAccountKeysKept();
  });

  it('no token at mount, the account keys beside the guest keys: no guest user, no mint', async () => {
    seedAccountKeys();
    seedGuestKeys();
    renderProvider();
    await flushWithTimers();

    expect(guestRegisterCalls()).toHaveLength(0);
    expect(username()).toBe('none');
    expect(readAuthSession().status).toBe('pending');
    expectAccountKeysKept();
  });

  it('a guest with no account keys is still restored and refreshed', async () => {
    seedGuestKeys();
    renderProvider();
    await flushWithTimers();

    expect(username()).toBe('Radiant.Green.buildra');
    await waitFor(() => expect(guestRegisterCalls()).toHaveLength(1));
  });

  it('a guest with no account keys keeps the guest user through a 401 and is refreshed', async () => {
    seedGuestKeys();
    localStorage.setItem('access_token', jwt(3600));
    renderProvider();
    await flushWithTimers();

    await act(async () => {
      clearAccessTokenForExpiry();
    });
    await flushWithTimers();

    expect(username()).toBe('Radiant.Green.buildra');
    await waitFor(() => expect(guestRegisterCalls()).toHaveLength(1));
  });

  it('a guest with no account keys and an expired token at mount is refreshed', async () => {
    seedGuestKeys();
    localStorage.setItem('access_token', jwt(-60));
    renderProvider();
    await flushWithTimers();

    await waitFor(() => expect(guestRegisterCalls()).toHaveLength(1));
    expect(localStorage.getItem('access_token')).toBe('guest-jwt-minted');
    expect(username()).not.toBe('none');
  });

  // hartos-17 follow-ups (2026-11-25): what the page shows follows the
  // session status; canRegisterGuestForSeal only guards mints.
  it("'pending' (account keys, no token) is anonymous: isGuest false, accessTier anonymous", async () => {
    seedAccountKeys();
    seedGuestKeys();
    renderProvider();
    await flushWithTimers();

    expect(readAuthSession().status).toBe('pending');
    expect(screen.getByTestId('isGuest').textContent).toBe('false');
    expect(screen.getByTestId('accessTier').textContent).toBe('anonymous');
  });

  it("useStorageSync's pending state (guest_user_id is the account id) still shows the guest under that id, no mint", async () => {
    // What useStorageSync writes when user_data.json has a user_id but no
    // token: the account id as guest_user_id plus the pending sentinel.
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_user_id', '10202');
    localStorage.setItem('pending_cloud_user_id', '10202');
    localStorage.setItem('pending_cloud_email', 'parent@example.com');
    renderProvider();
    await flushWithTimers();

    expect(readAuthSession().status).toBe('guest');
    expect(username()).toBe('User');
    expect(screen.getByTestId('isGuest').textContent).toBe('true');
    expect(guestRegisterCalls()).toHaveLength(0);
  });
});
