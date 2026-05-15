/**
 * useStorageSync.test.js — guards the cloud→companion→localStorage reader.
 *
 * The hook reads /api/storage/get/<key> on mount and mirrors the Agent.js
 * URL-param handler (Hevolve/src/components/Agent/Agent.js:94-106) to
 * populate the 6 raw-id localStorage keys plus access_token + agentname.
 *
 * Must NEVER overwrite an active in-page signin (no-op when
 * localStorage.access_token is already populated).
 */
import {renderHook, waitFor} from '@testing-library/react';

jest.mock('axios', () => ({
  __esModule: true,
  default: {get: jest.fn()},
}));

const axios = require('axios').default;
const useStorageSync = require('../../hooks/useStorageSync').default;

const CLOUD_VALUES = {
  access_token: 'cloud-jwt-value',
  user_id: '10202',
  email: 'Sales@hertzai.com',
  agentname: 'Hevolve',
};

function mockStorageReturning(values) {
  axios.get.mockImplementation((url) => {
    const key = url.split('/').pop();
    return Promise.resolve({
      data: {data: values[key] ?? null, success: true},
    });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe('useStorageSync', () => {
  it('populates the Agent.js URL-param keyset when storage has token+user_id', async () => {
    mockStorageReturning(CLOUD_VALUES);

    renderHook(() => useStorageSync());

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBe('cloud-jwt-value');
    });
    expect(localStorage.getItem('hevolve_access_id')).toBe('10202');
    expect(localStorage.getItem('guest_user_id')).toBe('10202');
    expect(localStorage.getItem('social_user_id')).toBe('10202');
    expect(localStorage.getItem('guest_mode')).toBe('true');
    expect(localStorage.getItem('guest_name_verified')).toBe('true');
    expect(localStorage.getItem('agentname')).toBe('Hevolve');
  });

  it('does NOT write the encrypted user_id/email_address keys (would break Agent.js decrypt)', async () => {
    mockStorageReturning(CLOUD_VALUES);

    renderHook(() => useStorageSync());

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBe('cloud-jwt-value');
    });
    // These keys are expected to hold AES-encrypted values via CryptoJS
    // (Agent.js:194).  Writing raw cloud values would break the decrypt path.
    expect(localStorage.getItem('user_id')).toBeNull();
    expect(localStorage.getItem('email_address')).toBeNull();
  });

  it('does not overwrite existing access_token / guest_user_id when in-page signin already happened', async () => {
    // Scenario: an in-page signin already wrote access_token +
    // guest_user_id.  useStorageSync must NOT clobber those values.
    // Post-commit 150fad9b the hook DOES still top-up HART identity
    // keys (hart_sealed / hart_name / hart_emoji / hart_language) via
    // /api/storage/get/* when those keys are missing — this covers the
    // WebView2-leveldb-wipe-but-user_data.json-survived case.  The
    // assertion below verifies the cloud-identity keys are unchanged
    // while accepting that the HART top-up may fire.
    localStorage.setItem('access_token', 'fresh-in-page-token');
    localStorage.setItem('guest_user_id', 'fresh-user-id');
    // Set hart_sealed so the top-up arm also short-circuits.  Test
    // verifies the BOTH-arms short-circuit path: no axios at all,
    // no localStorage write.
    localStorage.setItem('hart_sealed', 'true');

    mockStorageReturning(CLOUD_VALUES);

    renderHook(() => useStorageSync());

    await new Promise((r) => setTimeout(r, 50));

    expect(axios.get).not.toHaveBeenCalled();
    expect(localStorage.getItem('access_token')).toBe('fresh-in-page-token');
    expect(localStorage.getItem('guest_user_id')).toBe('fresh-user-id');
  });

  it('tops up HART identity from /api/storage/get/* when token present but hart_sealed missing', async () => {
    // WebView2-wipe scenario: pywebview EBWebView leveldb cleared on
    // reinstall, but user_data.json survived with the full identity.
    // The hook's first arm (commit 150fad9b) detects access_token in
    // localStorage AND no hart_sealed, then fetches the 4 hart_*
    // keys to re-hydrate React-side from companion storage.
    localStorage.setItem('access_token', 'in-page-token');
    localStorage.setItem('guest_user_id', 'in-page-user');
    // hart_sealed deliberately absent — trigger the top-up.

    axios.get.mockImplementation((url) => {
      const key = url.split('/').pop();
      const data = {
        hart_sealed: 'true',
        hart_name: 'Radiant.Green.lawliet',
        hart_emoji: '🌿',
        hart_language: 'en',
      }[key];
      return Promise.resolve({data: {data: data ?? null, success: true}});
    });

    renderHook(() => useStorageSync());

    await waitFor(() => {
      expect(localStorage.getItem('hart_sealed')).toBe('true');
    });
    expect(localStorage.getItem('hart_name')).toBe('Radiant.Green.lawliet');
    expect(localStorage.getItem('hart_emoji')).toBe('🌿');
    expect(localStorage.getItem('hart_language')).toBe('en');
    // Cloud identity untouched.
    expect(localStorage.getItem('access_token')).toBe('in-page-token');
    expect(localStorage.getItem('guest_user_id')).toBe('in-page-user');
  });

  it('does nothing when storage has no token (no cloud signin yet)', async () => {
    mockStorageReturning({access_token: null, user_id: null});

    renderHook(() => useStorageSync());

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('guest_user_id')).toBeNull();
    expect(localStorage.getItem('hevolve_access_id')).toBeNull();
  });

  it('does nothing when only one of (token, user_id) is present', async () => {
    mockStorageReturning({
      access_token: 'has-token',
      user_id: null,
      email: 'x@x.com',
      agentname: 'Hevolve',
    });

    renderHook(() => useStorageSync());

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('silently absorbs companion API errors (companion not running)', async () => {
    axios.get.mockRejectedValue(new Error('ECONNREFUSED'));

    renderHook(() => useStorageSync());

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('coerces numeric user_id to string for localStorage', async () => {
    // Companion stores user_id as a string ("10202") but if a future
    // path passes a JSON number, the hook must still produce string
    // values (localStorage.setItem rejects non-strings).
    mockStorageReturning({
      access_token: 'jwt',
      user_id: 10202,
      email: 'x@x.com',
      agentname: 'Hevolve',
    });

    renderHook(() => useStorageSync());

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBe('jwt');
    });
    expect(localStorage.getItem('guest_user_id')).toBe('10202');
    expect(localStorage.getItem('social_user_id')).toBe('10202');
    expect(localStorage.getItem('hevolve_access_id')).toBe('10202');
  });
});
