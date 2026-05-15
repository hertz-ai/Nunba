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

  it('is a no-op when an in-page signin already set access_token', async () => {
    localStorage.setItem('access_token', 'fresh-in-page-token');
    localStorage.setItem('guest_user_id', 'fresh-user-id');

    mockStorageReturning(CLOUD_VALUES);

    renderHook(() => useStorageSync());

    // Give the effect a tick to run; it should short-circuit before
    // making any axios call.
    await new Promise((r) => setTimeout(r, 50));

    expect(axios.get).not.toHaveBeenCalled();
    expect(localStorage.getItem('access_token')).toBe('fresh-in-page-token');
    expect(localStorage.getItem('guest_user_id')).toBe('fresh-user-id');
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
