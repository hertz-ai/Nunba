/**
 * useAuthSession.test.js — Phase 1 read-model coverage.
 *
 * Every localStorage shape we know exists in the wild today gets a
 * test case here.  When a Phase 2 reader migration breaks, this file
 * is the canonical reference for "what should the hook have returned
 * given THIS localStorage state".
 *
 * Cases covered:
 *   • cold-start (empty localStorage)
 *   • guest (HART-sealed, no cloud token)
 *   • guest (HART-not-sealed, fresh install)
 *   • cloud (full signin via OtpAuthModal)
 *   • partial-cloud (user_data.json had user_id+email, no token —
 *     useStorageSync wrote pending_cloud_* sentinel)
 *   • cloud-with-corrupt-encryption (decrypt throws — falls back gracefully)
 *   • cloud + hart-sealed (both identities co-exist, 4-layer model)
 *   • event-driven reactivity (storage / nunba:storage_hydrated /
 *     nunba:auth_changed / visibilitychange / 1s poll)
 *   • identity equality short-circuit (no setState when nothing changed)
 */
import {renderHook, act} from '@testing-library/react';

// Mock the encryption util so we don't depend on REACT_APP_SECRET_KEY
// being set in jest's process.env (the CRA bundle bakes a literal
// fallback "change-me-to-a-random-string" at build time, but
// jest runs against raw source where the env var is empty so
// CryptoJS.AES round-trips return null).  The mock uses an "ENC:"
// prefix marker — decrypt recognises it and returns the cleartext.
jest.mock('../../utils/encryption', () => ({
  __esModule: true,
  encrypt: (v) => (v == null ? null : `ENC:${String(v)}`),
  decrypt: (v) => {
    if (!v || typeof v !== 'string') return null;
    if (!v.startsWith('ENC:')) return null; // corrupt ciphertext
    return v.slice(4);
  },
}));

const useAuthSession = require('../../hooks/useAuthSession').default;
const {readAuthSession} = require('../../hooks/useAuthSession');
const {encrypt} = require('../../utils/encryption');

const ENC_USER_ID = encrypt('10202');
const ENC_EMAIL = encrypt('Sales@hertzai.com');

beforeEach(() => {
  localStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('readAuthSession — pure read model', () => {
  test('cold-start returns unauthenticated', () => {
    const s = readAuthSession();
    expect(s.status).toBe('unauthenticated');
    expect(s.identity.user_id).toBeNull();
    expect(s.identity.email).toBeNull();
    expect(s.tokens.cloud).toBeNull();
    expect(s.hart.sealed).toBe(false);
    expect(s.isAuthenticated).toBe(false);
  });

  test('guest sealed — full HART identity, no cloud token', () => {
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_user_id', 'guest-abc-123');
    localStorage.setItem('social_user_id', 'guest-abc-123');
    localStorage.setItem('hevolve_access_id', 'guest-abc-123');
    localStorage.setItem('guest_name', 'Radiant.Green.lawliet');
    localStorage.setItem('guest_name_verified', 'true');
    localStorage.setItem('hart_sealed', 'true');
    localStorage.setItem('hart_name', 'Radiant.Green.lawliet');
    localStorage.setItem('hart_emoji', '🌿');
    localStorage.setItem('hart_language', 'en');
    localStorage.setItem('agentname', 'Hevolve');

    const s = readAuthSession();
    expect(s.status).toBe('guest');
    expect(s.identity.user_id).toBe('guest-abc-123');
    expect(s.identity.display_name).toBe('Radiant.Green.lawliet');
    expect(s.identity.agentname).toBe('Hevolve');
    expect(s.hart.sealed).toBe(true);
    expect(s.hart.name).toBe('Radiant.Green.lawliet');
    expect(s.hart.emoji).toBe('🌿');
    expect(s.hart.language).toBe('en');
    expect(s.tokens.cloud).toBeNull();
    expect(s.isAuthenticated).toBe(true);
  });

  test('guest unsealed — fresh install, no HART onboarding yet', () => {
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_user_id', 'fresh-guest-uuid');
    const s = readAuthSession();
    expect(s.status).toBe('guest');
    expect(s.identity.user_id).toBe('fresh-guest-uuid');
    expect(s.hart.sealed).toBe(false);
    expect(s.identity.display_name).toBeNull();
  });

  test('cloud full signin — OtpAuthModal post-verify state', () => {
    localStorage.setItem('access_token', 'BD7VN69uQsFgG0nStDhYCQmRM5MgYs0o');
    localStorage.setItem('refresh_token', 'enc-refresh-blob');
    localStorage.setItem('user_id', ENC_USER_ID);
    localStorage.setItem('email_address', ENC_EMAIL);
    localStorage.setItem('agentname', 'Hevolve');
    localStorage.setItem('hevolve_access_id', '10202');

    const s = readAuthSession();
    expect(s.status).toBe('cloud');
    expect(s.identity.user_id).toBe('10202');
    expect(s.identity.email).toBe('Sales@hertzai.com');
    expect(s.identity.agentname).toBe('Hevolve');
    expect(s.tokens.cloud).toBe('BD7VN69uQsFgG0nStDhYCQmRM5MgYs0o');
    expect(s.isAuthenticated).toBe(true);
  });

  test('partial-cloud — useStorageSync sentinel (user_data.json had id+email, no token)', () => {
    // No access_token, no encrypted user_id.  useStorageSync wrote
    // the partial-state sentinels after seeing /api/storage/get/* had
    // user_id + email but access_token=null.
    localStorage.setItem('pending_cloud_user_id', '10202');
    localStorage.setItem('pending_cloud_email', 'Sales@hertzai.com');
    localStorage.setItem('agentname', 'Hevolve');

    const s = readAuthSession();
    expect(s.status).toBe('pending');
    expect(s.identity.user_id).toBe('10202');
    expect(s.identity.email).toBe('Sales@hertzai.com');
    expect(s.pending_cloud.user_id).toBe('10202');
    expect(s.pending_cloud.email).toBe('Sales@hertzai.com');
    expect(s.tokens.cloud).toBeNull();
    expect(s.isAuthenticated).toBe(false);
  });

  test('cloud token present but encrypted user_id is corrupt — falls back to unauthenticated, not crash', () => {
    localStorage.setItem('access_token', 'valid-token');
    localStorage.setItem('user_id', 'NOT-VALID-CIPHERTEXT');
    localStorage.setItem('email_address', 'ALSO-CORRUPT');
    // Decrypt returns null for corrupt input (encryption.js:18 try/catch).
    // Without a decrypt-able cloud user_id, status falls to unauthenticated
    // rather than crashing or returning half-state.  This guards the
    // post-ENCRYPTION_KEY-rotation regression case where ciphertext
    // doesn't match the bundle's bake-in key.
    const s = readAuthSession();
    expect(s.status).toBe('unauthenticated');
    expect(s.identity.user_id).toBeNull();
  });

  test('cloud + hart-sealed — 4-layer identity (cloud + HART node co-exist)', () => {
    localStorage.setItem('access_token', 'cloud-token');
    localStorage.setItem('user_id', ENC_USER_ID);
    localStorage.setItem('email_address', ENC_EMAIL);
    localStorage.setItem('agentname', 'Hevolve');
    // HART node identity persists alongside cloud — no squash.
    localStorage.setItem('hart_sealed', 'true');
    localStorage.setItem('hart_name', 'Radiant.Green.lawliet');
    localStorage.setItem('guest_name', 'Radiant.Green.lawliet');

    const s = readAuthSession();
    expect(s.status).toBe('cloud'); // cloud wins for status
    expect(s.identity.user_id).toBe('10202');
    expect(s.identity.email).toBe('Sales@hertzai.com');
    expect(s.identity.hart_node).toBe('Radiant.Green.lawliet'); // co-exists
    expect(s.hart.sealed).toBe(true); // HART seal preserved
    expect(s.hart.name).toBe('Radiant.Green.lawliet');
    expect(s.identity.display_name).toBe('Radiant.Green.lawliet');
  });

  test('guest_mode=true but guest_user_id missing — falls through (not guest)', () => {
    // Anomalous state — log out flow that cleared guest_user_id but
    // forgot to clear guest_mode.  Should NOT report status='guest'
    // because there's no identity to authenticate against.
    localStorage.setItem('guest_mode', 'true');
    const s = readAuthSession();
    expect(s.status).toBe('unauthenticated');
    expect(s.identity.user_id).toBeNull();
  });
});

describe('useAuthSession — hook reactivity', () => {
  test('renders initial session synchronously on mount', () => {
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_user_id', 'g-1');
    const {result} = renderHook(() => useAuthSession());
    expect(result.current.status).toBe('guest');
    expect(result.current.identity.user_id).toBe('g-1');
  });

  test('re-reads on nunba:storage_hydrated event', () => {
    const {result} = renderHook(() => useAuthSession());
    expect(result.current.status).toBe('unauthenticated');

    act(() => {
      localStorage.setItem('guest_mode', 'true');
      localStorage.setItem('guest_user_id', 'late-guest');
      window.dispatchEvent(new Event('nunba:storage_hydrated'));
    });
    expect(result.current.status).toBe('guest');
    expect(result.current.identity.user_id).toBe('late-guest');
  });

  test('re-reads on nunba:auth_changed event (OtpAuthModal post-verify)', () => {
    const {result} = renderHook(() => useAuthSession());

    act(() => {
      localStorage.setItem('access_token', 'fresh-token');
      localStorage.setItem('user_id', ENC_USER_ID);
      localStorage.setItem('email_address', ENC_EMAIL);
      window.dispatchEvent(new CustomEvent('nunba:auth_changed', {
        detail: {source: 'otp_login', user_id: '10202'},
      }));
    });
    expect(result.current.status).toBe('cloud');
    expect(result.current.identity.user_id).toBe('10202');
  });

  test('1s poll catches same-tab setItem that did not fire storage event', () => {
    const {result} = renderHook(() => useAuthSession());
    expect(result.current.status).toBe('unauthenticated');

    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_user_id', 'poll-detected');
    // No event fired — only the poll should catch this.
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    expect(result.current.status).toBe('guest');
    expect(result.current.identity.user_id).toBe('poll-detected');
  });

  test('identity-equal re-read does not create a new session object (referential stability)', () => {
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_user_id', 'stable-guest');
    const {result} = renderHook(() => useAuthSession());
    const first = result.current;

    // Fire several no-op rereads.
    act(() => {
      window.dispatchEvent(new Event('nunba:storage_hydrated'));
      window.dispatchEvent(new Event('storage'));
      jest.advanceTimersByTime(3500);
    });
    // localStorage didn't change — hook should return the SAME object,
    // not a fresh-but-equal one.  This is what prevents downstream
    // consumers from re-rendering on every poll tick.
    expect(result.current).toBe(first);
  });

  test('re-reads on document visibilitychange returning visible', () => {
    const {result} = renderHook(() => useAuthSession());

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    act(() => {
      localStorage.setItem('guest_mode', 'true');
      localStorage.setItem('guest_user_id', 'visibility-detected');
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.status).toBe('guest');
  });
});
