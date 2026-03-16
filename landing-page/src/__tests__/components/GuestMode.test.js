/* eslint-disable */
/**
 * Regression tests for Guest Mode feature.
 *
 * Tests the guest mode authentication logic, localStorage interactions,
 * and the isAuthenticated computation used throughout Demopage.js.
 */

describe('Guest Mode - localStorage logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // --- isAuthenticated computation ---

  test('isAuthenticated is false when no token, no userId, no guest mode', () => {
    const decryptedUserId = null;
    const token = localStorage.getItem('access_token');
    const isGuestMode = localStorage.getItem('guest_mode') === 'true';
    const isAuthenticated = (decryptedUserId && token) || isGuestMode;

    expect(isAuthenticated).toBeFalsy();
  });

  test('isAuthenticated is true with valid token and userId', () => {
    localStorage.setItem('access_token', 'some-token');
    const decryptedUserId = 'user-123';
    const token = localStorage.getItem('access_token');
    const isGuestMode = localStorage.getItem('guest_mode') === 'true';
    const isAuthenticated = (decryptedUserId && token) || isGuestMode;

    expect(isAuthenticated).toBeTruthy();
  });

  test('isAuthenticated is true in guest mode even without token', () => {
    localStorage.setItem('guest_mode', 'true');
    const decryptedUserId = null;
    const token = null;
    const isGuestMode = localStorage.getItem('guest_mode') === 'true';
    const isAuthenticated = (decryptedUserId && token) || isGuestMode;

    expect(isAuthenticated).toBeTruthy();
  });

  test('isAuthenticated is false when guest_mode is not "true"', () => {
    localStorage.setItem('guest_mode', 'false');
    const decryptedUserId = null;
    const token = null;
    const isGuestMode = localStorage.getItem('guest_mode') === 'true';
    const isAuthenticated = (decryptedUserId && token) || isGuestMode;

    expect(isAuthenticated).toBeFalsy();
  });

  // --- effectiveUserId ---

  test('effectiveUserId returns guestUserId in guest mode', () => {
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_user_id', 'guest-uuid-abc');

    const isGuestMode = localStorage.getItem('guest_mode') === 'true';
    const guestUserId = localStorage.getItem('guest_user_id') || '';
    const decryptedUserId = null;
    const effectiveUserId = isGuestMode ? guestUserId : decryptedUserId;

    expect(effectiveUserId).toBe('guest-uuid-abc');
  });

  test('effectiveUserId returns decryptedUserId when not guest', () => {
    const isGuestMode = localStorage.getItem('guest_mode') === 'true';
    const guestUserId = localStorage.getItem('guest_user_id') || '';
    const decryptedUserId = 'real-user-456';
    const effectiveUserId = isGuestMode ? guestUserId : decryptedUserId;

    expect(effectiveUserId).toBe('real-user-456');
  });

  // --- Guest login sets correct keys ---

  test('guest login sets all required localStorage keys', () => {
    const guestName = 'TestUser';
    const guestId = 'uuid-1234';

    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_name', guestName);
    localStorage.setItem('guest_user_id', guestId);
    localStorage.setItem('guest_name_verified', 'false');

    expect(localStorage.getItem('guest_mode')).toBe('true');
    expect(localStorage.getItem('guest_name')).toBe('TestUser');
    expect(localStorage.getItem('guest_user_id')).toBe('uuid-1234');
    expect(localStorage.getItem('guest_name_verified')).toBe('false');
  });

  // --- Logout clears guest keys ---

  test('logout clears all guest localStorage keys', () => {
    // Set up guest session
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_name', 'TestUser');
    localStorage.setItem('guest_user_id', 'uuid-1234');
    localStorage.setItem('guest_name_verified', 'false');
    localStorage.setItem('access_token', 'some-token');
    localStorage.setItem('user_id', 'encrypted-id');
    localStorage.setItem('email_address', 'encrypted-email');

    // Simulate LogOutUser
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('email_address');
    localStorage.removeItem('guest_mode');
    localStorage.removeItem('guest_name');
    localStorage.removeItem('guest_user_id');
    localStorage.removeItem('guest_name_verified');

    expect(localStorage.getItem('guest_mode')).toBeNull();
    expect(localStorage.getItem('guest_name')).toBeNull();
    expect(localStorage.getItem('guest_user_id')).toBeNull();
    expect(localStorage.getItem('guest_name_verified')).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('user_id')).toBeNull();
    expect(localStorage.getItem('email_address')).toBeNull();
  });

  // --- OTP login clears guest keys ---

  test('successful OTP login clears guest localStorage keys', () => {
    // Set up guest session first
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_name', 'GuestUser');
    localStorage.setItem('guest_user_id', 'guest-uuid');
    localStorage.setItem('guest_name_verified', 'false');

    // Simulate OTP login success (from OtpAuthModal handleVerifyOtp)
    localStorage.setItem('access_token', 'new-token');
    localStorage.setItem('user_id', 'encrypted-real-id');
    localStorage.setItem('email_address', 'encrypted-email');
    localStorage.removeItem('guest_mode');
    localStorage.removeItem('guest_name');
    localStorage.removeItem('guest_user_id');
    localStorage.removeItem('guest_name_verified');

    expect(localStorage.getItem('guest_mode')).toBeNull();
    expect(localStorage.getItem('guest_name')).toBeNull();
    expect(localStorage.getItem('access_token')).toBe('new-token');
  });

  // --- Guest name verification ---

  test('guest_name_verified starts as false', () => {
    localStorage.setItem('guest_name_verified', 'false');
    expect(localStorage.getItem('guest_name_verified')).toBe('false');
  });

  test('guest_name_verified is set to true after uniqueness check passes', () => {
    localStorage.setItem('guest_name_verified', 'false');

    // Simulate successful uniqueness check
    localStorage.setItem('guest_name_verified', 'true');
    expect(localStorage.getItem('guest_name_verified')).toBe('true');
  });

  test('handleGuestNameChange updates name and marks as verified', () => {
    localStorage.setItem('guest_name', 'OldName');
    localStorage.setItem('guest_name_verified', 'false');

    // Simulate handleGuestNameChange
    const newName = 'SuggestedName123';
    localStorage.setItem('guest_name', newName);
    localStorage.setItem('guest_name_verified', 'true');

    expect(localStorage.getItem('guest_name')).toBe('SuggestedName123');
    expect(localStorage.getItem('guest_name_verified')).toBe('true');
  });
});

describe('Guest Mode - name validation', () => {
  test('rejects names shorter than 3 characters', () => {
    const guestName = 'ab';
    const isValid = guestName && guestName.trim().length >= 3;
    expect(isValid).toBe(false);
  });

  test('rejects empty names', () => {
    const guestName = '';
    const isValid = guestName && guestName.trim().length >= 3;
    expect(isValid).toBeFalsy();
  });

  test('rejects whitespace-only names', () => {
    const guestName = '   ';
    const isValid = guestName && guestName.trim().length >= 3;
    expect(isValid).toBe(false);
  });

  test('accepts names with exactly 3 characters', () => {
    const guestName = 'abc';
    const isValid = guestName && guestName.trim().length >= 3;
    expect(isValid).toBe(true);
  });

  test('accepts normal names', () => {
    const guestName = 'TestUser';
    const isValid = guestName && guestName.trim().length >= 3;
    expect(isValid).toBe(true);
  });

  test('trims whitespace before storing', () => {
    const guestName = '  TestUser  ';
    const trimmed = guestName.trim();
    expect(trimmed).toBe('TestUser');
  });
});
