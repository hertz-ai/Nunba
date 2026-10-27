/**
 * canRegisterGuestForSeal.test.js
 *
 * The HART ceremony registers a guest account before it seals, so the seal
 * carries a bearer the server can resolve.  That must NOT happen for a cloud
 * user whose token is missing: useStorageSync sets `pending_cloud_user_id`
 * for exactly that state (user_data.json has a user_id but no access_token)
 * and Demopage's auto-refresh refuses to mint a guest over it.  A guest
 * minted here would overwrite guest_user_id / social_user_id /
 * hevolve_access_id and /api/hart/seal would bind the name to the guest
 * for good, so the cloud account could never claim it (review of #35).
 *
 * These call the REAL helper, not the ceremony's source text.
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

const {canRegisterGuestForSeal} = require('../../hooks/useAuthSession');

beforeEach(() => {
  localStorage.clear();
});

describe('canRegisterGuestForSeal', () => {
  test('a first-run guest (no token, nothing pending) gets registered', () => {
    expect(canRegisterGuestForSeal()).toBe(true);
  });

  test('a user who already has a token is not registered again', () => {
    localStorage.setItem('access_token', 'ENC:jwt');
    expect(canRegisterGuestForSeal()).toBe(false);
  });

  test('a cloud user with no token (pending_cloud_user_id) is NOT registered as a guest', () => {
    localStorage.setItem('pending_cloud_user_id', '10202');
    localStorage.setItem('pending_cloud_email', 'sales@example.com');
    expect(canRegisterGuestForSeal()).toBe(false);
  });

  test('the pending state useStorageSync really writes (guest_mode + guest ids set too) is still refused', () => {
    // useStorageSync.js writes all of these for user_data.json with a
    // user_id and no token, so readAuthSession().status resolves to
    // 'guest', not 'pending': the guard must read the pending flag itself.
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_user_id', '10202');
    localStorage.setItem('social_user_id', '10202');
    localStorage.setItem('hevolve_access_id', '10202');
    localStorage.setItem('pending_cloud_user_id', '10202');
    expect(canRegisterGuestForSeal()).toBe(false);
  });

  test('a pending flag does not turn a token-holding user into a registration', () => {
    localStorage.setItem('access_token', 'ENC:jwt');
    localStorage.setItem('pending_cloud_user_id', '10202');
    expect(canRegisterGuestForSeal()).toBe(false);
  });
});
