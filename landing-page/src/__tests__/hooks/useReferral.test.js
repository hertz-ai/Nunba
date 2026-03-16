/**
 * useReferral.test.js — Unit tests for the useReferral hook and getReferralCode helper.
 *
 * Tests URL parameter extraction, localStorage storage, API notification,
 * URL cleanup, and edge cases.
 */
import {renderHook} from '@testing-library/react';

// Build mock axios instance — must be declared before jest.mock factory
const mockAxiosInstance = {
  get: jest.fn(() => Promise.resolve({data: {}})),
  post: jest.fn(() => Promise.resolve({data: {}})),
  patch: jest.fn(() => Promise.resolve({data: {}})),
  put: jest.fn(() => Promise.resolve({data: {}})),
  delete: jest.fn(() => Promise.resolve({data: {}})),
};

jest.mock('../../services/axiosFactory', () => ({
  createApiClient: jest.fn(() => mockAxiosInstance),
}));

// Import using require after mocks are set up
const {useReferral, getReferralCode} = require('../../hooks/useReferral');

let replaceStateSpy;

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  replaceStateSpy = jest
    .spyOn(window.history, 'replaceState')
    .mockImplementation(() => {});
});

afterEach(() => {
  replaceStateSpy.mockRestore();
  // Reset location.search
  delete window.location;
  window.location = new URL('http://localhost/');
});

function setLocationSearch(search) {
  delete window.location;
  window.location = new URL(`http://localhost/${search}`);
}

// ── URL parameter extraction ──────────────────────────────────────────────
describe('useReferral - URL parameter extraction', () => {
  it('extracts ref code from URL query param', () => {
    setLocationSearch('?ref=ABC123');
    renderHook(() => useReferral());
    expect(localStorage.getItem('nunba_referral_code')).toBe('ABC123');
  });

  it('stores referral timestamp', () => {
    setLocationSearch('?ref=XYZ');
    renderHook(() => useReferral());
    const ts = localStorage.getItem('nunba_referral_ts');
    expect(ts).toBeTruthy();
    expect(Number(ts)).toBeGreaterThan(0);
  });

  it('does nothing when no ref param present', () => {
    setLocationSearch('?other=value');
    renderHook(() => useReferral());
    expect(localStorage.getItem('nunba_referral_code')).toBeNull();
  });

  it('does nothing when URL has no query params', () => {
    setLocationSearch('');
    renderHook(() => useReferral());
    expect(localStorage.getItem('nunba_referral_code')).toBeNull();
  });
});

// ── Referral code storage ─────────────────────────────────────────────────
describe('useReferral - localStorage storage', () => {
  it('does not overwrite existing referral code', () => {
    localStorage.setItem('nunba_referral_code', 'FIRST');
    setLocationSearch('?ref=SECOND');
    renderHook(() => useReferral());
    expect(localStorage.getItem('nunba_referral_code')).toBe('FIRST');
  });
});

// ── API call for referral tracking ────────────────────────────────────────
describe('useReferral - API notification', () => {
  it('sends referral to API when user has JWT', () => {
    localStorage.setItem('social_jwt', 'fake-jwt-token');
    setLocationSearch('?ref=REF001');
    renderHook(() => useReferral());
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/referral/use', {
      code: 'REF001',
    });
  });

  it('does not send referral to API when no JWT', () => {
    setLocationSearch('?ref=REF002');
    renderHook(() => useReferral());
    expect(mockAxiosInstance.post).not.toHaveBeenCalledWith(
      '/referral/use',
      expect.anything()
    );
  });
});

// ── URL cleanup ───────────────────────────────────────────────────────────
describe('useReferral - URL cleanup', () => {
  it('cleans ref param from URL without reload', () => {
    setLocationSearch('?ref=CLEAN');
    renderHook(() => useReferral());
    expect(replaceStateSpy).toHaveBeenCalled();
  });

  it('preserves other query params when cleaning ref', () => {
    setLocationSearch('?tab=trending&ref=KEEP&page=2');
    renderHook(() => useReferral());
    expect(replaceStateSpy).toHaveBeenCalled();
    const newUrl = replaceStateSpy.mock.calls[0][2];
    expect(newUrl).toContain('tab=trending');
    expect(newUrl).toContain('page=2');
    expect(newUrl).not.toContain('ref=');
  });
});

// ── getReferralCode helper ────────────────────────────────────────────────
describe('getReferralCode', () => {
  it('returns null when no code stored', () => {
    expect(getReferralCode()).toBeNull();
  });

  it('returns stored referral code', () => {
    localStorage.setItem('nunba_referral_code', 'STORED');
    expect(getReferralCode()).toBe('STORED');
  });
});

// ── Error handling ────────────────────────────────────────────────────────
describe('useReferral - error handling', () => {
  it('does not throw when localStorage throws', () => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('Storage full');
    };
    setLocationSearch('?ref=FAIL');
    expect(() => renderHook(() => useReferral())).not.toThrow();
    Storage.prototype.getItem = originalGetItem;
  });
});
