/**
 * silentGuestRefresh.test.js — #209 canonical guest-refresh helper.
 *
 * Verifies the consolidated silent-recover path that replaces the
 * three open-coded sites at Demopage.js:262 (auto-refresh useEffect),
 * Demopage.js:3725 (401 mid-chat helper), and SocialContext.js:261/309
 * (auth:expired listener).
 */

jest.mock('../../utils/encryption', () => ({
  __esModule: true,
  encrypt: (v) => (v == null ? null : `ENC:${String(v)}`),
  decrypt: (v) => {
    if (!v || typeof v !== 'string') return null;
    if (!v.startsWith('ENC:')) return null;
    return v.slice(4);
  },
}));

const mockGuestRegister = jest.fn();
jest.mock('../../services/socialApi', () => ({
  __esModule: true,
  authApi: {
    guestRegister: (...args) => mockGuestRegister(...args),
  },
}));

const mockGetStableDeviceId = jest.fn();
jest.mock('../../utils/deviceId', () => ({
  __esModule: true,
  getStableDeviceId: (...args) => mockGetStableDeviceId(...args),
}));

const {silentGuestRefresh} = require('../../hooks/useAuthSession');

beforeEach(() => {
  localStorage.clear();
  mockGuestRegister.mockReset();
  mockGetStableDeviceId.mockReset();
  mockGetStableDeviceId.mockResolvedValue('dev-fingerprint-abc');
});

describe('silentGuestRefresh', () => {
  test('returns null when guest_name missing (not in guest mode)', async () => {
    const result = await silentGuestRefresh();
    expect(result).toBeNull();
    expect(mockGuestRegister).not.toHaveBeenCalled();
  });

  test('calls guest-register with guest_name + device_id, returns token', async () => {
    localStorage.setItem('guest_name', 'Radiant.Green.lawliet');
    mockGuestRegister.mockResolvedValue({
      data: {
        user: {id: 'u-42'},
        token: 'jwt-new',
        existing: true,
      },
    });

    const result = await silentGuestRefresh();

    expect(mockGetStableDeviceId).toHaveBeenCalledTimes(1);
    expect(mockGuestRegister).toHaveBeenCalledWith({
      guest_name: 'Radiant.Green.lawliet',
      device_id: 'dev-fingerprint-abc',
    });
    expect(result).toEqual({
      token: 'jwt-new',
      user_id: 'u-42',
      existing: true,
    });

    // Canonical writer wrote to localStorage via setGuestIdentity
    expect(localStorage.getItem('access_token')).toBe('jwt-new');
    expect(localStorage.getItem('guest_mode')).toBe('true');
    expect(localStorage.getItem('guest_user_id')).toBe('u-42');
    expect(localStorage.getItem('social_user_id')).toBe('u-42');
  });

  test('returns null when backend omits token', async () => {
    localStorage.setItem('guest_name', 'Sky.Walker');
    mockGuestRegister.mockResolvedValue({data: {user: {id: 'u-1'}}});
    const result = await silentGuestRefresh();
    expect(result).toBeNull();
    // access_token NOT written
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  test('returns null and does not throw on network failure', async () => {
    localStorage.setItem('guest_name', 'Sky.Walker');
    mockGuestRegister.mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await silentGuestRefresh();
    expect(result).toBeNull();
  });

  test('tolerates getStableDeviceId failure (passes undefined device_id)', async () => {
    localStorage.setItem('guest_name', 'Sky.Walker');
    mockGetStableDeviceId.mockRejectedValue(new Error('fp blocked'));
    mockGuestRegister.mockResolvedValue({
      data: {user: {id: 'u-9'}, token: 'jwt-9', existing: false},
    });
    const result = await silentGuestRefresh();
    expect(mockGuestRegister).toHaveBeenCalledWith({
      guest_name: 'Sky.Walker',
      device_id: undefined,
    });
    expect(result).toEqual({token: 'jwt-9', user_id: 'u-9', existing: false});
  });

  test('fires nunba:auth_changed via setGuestIdentity', async () => {
    localStorage.setItem('guest_name', 'Test.Guest');
    mockGuestRegister.mockResolvedValue({
      data: {user: {id: 'u-77'}, token: 'jwt-77', existing: true},
    });
    const handler = jest.fn();
    window.addEventListener('nunba:auth_changed', handler);
    try {
      await silentGuestRefresh();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.source).toBe('guest_register');
    } finally {
      window.removeEventListener('nunba:auth_changed', handler);
    }
  });
});
