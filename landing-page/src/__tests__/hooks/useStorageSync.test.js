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
  default: {get: jest.fn(), post: jest.fn()},
}));

const axios = require('axios').default;

const useStorageSync = require('../../hooks/useStorageSync').default;

const CLOUD_VALUES = {
  access_token: 'cloud-jwt-value',
  user_id: '10202',
  email: 'Sales@hertzai.com',
  agentname: 'Hevolve',
};

// A real GUEST JWT (payload.username starts 'guest_') routes the hook to the
// guest-hydration branch, where the Agent.js URL-param keyset — guest_user_id
// / social_user_id / hevolve_access_id / guest_mode — is populated.  The
// 'cloud-jwt-value' placeholder above is NOT a JWT, so post the 2026-05-26
// cloud/guest split it falls to the CLOUD branch (encrypts user_id, clears
// the guest keys) — which is why the two keyset tests must use this fixture.
const GUEST_JWT = 'h.' + btoa(JSON.stringify({username: 'guest_10202'})) + '.s';
const GUEST_VALUES = {
  access_token: GUEST_JWT,
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
    mockStorageReturning(GUEST_VALUES);

    renderHook(() => useStorageSync());

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBe(GUEST_JWT);
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
    // Scenario: an in-page signin already wrote the full identity keyset.
    // useStorageSync must NOT clobber access_token / guest_user_id.
    // The hook always runs the unconditional hart_reset_on_first_run marker
    // probe (consumeHartResetMarker) and, post-bbab79ea, backfills the
    // encrypted user_id / email_address blobs when they are MISSING — so we
    // seed those here too, leaving the marker probe as the only benign
    // fetch and asserting the guarded keys survive untouched.
    localStorage.setItem('access_token', 'fresh-in-page-token');
    localStorage.setItem('guest_user_id', 'fresh-user-id');
    localStorage.setItem('user_id', 'already-encrypted');
    localStorage.setItem('email_address', 'already-encrypted');
    localStorage.setItem('hart_sealed', 'true');

    mockStorageReturning(CLOUD_VALUES);

    renderHook(() => useStorageSync());

    await new Promise((r) => setTimeout(r, 50));

    // The fresh in-page identity survives — no clobber.
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
      access_token: GUEST_JWT,
      user_id: 10202,
      email: 'x@x.com',
      agentname: 'Hevolve',
    });

    renderHook(() => useStorageSync());

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBe(GUEST_JWT);
    });
    expect(localStorage.getItem('guest_user_id')).toBe('10202');
    expect(localStorage.getItem('social_user_id')).toBe('10202');
    expect(localStorage.getItem('hevolve_access_id')).toBe('10202');
  });
});

// app.py:1862 wipes the HART identity out of user_data.json when
// llama_config.json carries a hand-set `first_run: true`, leaving
// `hart_reset_on_first_run: true` as the consumed-once marker.  The wipe
// cannot reach localStorage (webview_data/ survives reinstalls), and the
// Demopage/Agent localStorage→file re-POST puts the stale identity BACK
// into user_data.json within seconds of boot — both observed live
// 2026-08-21 (file wiped 23:26, re-seeded 23:47:35, ceremony never ran).
// The hook must consume the marker: evict the localStorage copy AND clear
// the file copy via the '' DELETE sentinel, exactly once per marker-set.
describe('hart_reset_on_first_run consumption', () => {
  const HART_KEYS = ['hart_sealed', 'hart_name', 'hart_emoji', 'hart_language'];

  // A mutable backing store with app.py's merge semantics: GET serves
  // current values; POST with '' deletes a key, non-empty sets it.
  function mockLiveStore(initial) {
    const store = {...initial};
    axios.get.mockImplementation((url) => {
      const key = url.split('/').pop();
      return Promise.resolve({data: {data: store[key] ?? null, success: true}});
    });
    axios.post.mockImplementation((url, payload) => {
      Object.entries(payload || {}).forEach(([k, v]) => {
        if (v === '') delete store[k];
        else if (v !== null && v !== undefined) store[k] = v;
      });
      return Promise.resolve({data: {success: true}});
    });
    return store;
  }

  function seedStaleSealedIdentity() {
    localStorage.setItem('access_token', 'cloud-jwt-value');
    localStorage.setItem('hart_sealed', 'true');
    localStorage.setItem('hart_name', 'Old Name');
    localStorage.setItem('hart_emoji', '🔥');
    localStorage.setItem('hart_language', 'en');
  }

  it('evicts stale localStorage identity AND clears the re-seeded file copy', async () => {
    seedStaleSealedIdentity();
    const store = mockLiveStore({
      hart_reset_on_first_run: true,
      // The re-seeded state observed live: the stale localStorage identity
      // was POSTed back into user_data.json before the marker was consumed.
      hart_sealed: 'true',
      hart_name: 'Old Name',
    });

    renderHook(() => useStorageSync());

    await waitFor(() => {
      expect(localStorage.getItem('hart_reset_consumed')).toBe('true');
    });
    // Let the hart top-up that follows the consume finish — it must find
    // nothing to re-hydrate, or the fix is vacuous.
    await new Promise((r) => setTimeout(r, 50));
    for (const key of HART_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    expect(store.hart_sealed).toBeUndefined();
    expect(store.hart_name).toBeUndefined();
  });

  it('dispatches nunba:auth_changed so useAuthSession re-reads the gate', async () => {
    seedStaleSealedIdentity();
    mockLiveStore({hart_reset_on_first_run: true});
    const sources = [];
    const onChanged = (e) => sources.push(e.detail && e.detail.source);
    window.addEventListener('nunba:auth_changed', onChanged);

    renderHook(() => useStorageSync());

    await waitFor(() => {
      expect(sources).toContain('hart_reset_on_first_run');
    });
    window.removeEventListener('nunba:auth_changed', onChanged);
  });

  it('consumes only once — a re-sealed identity survives later boots while the marker persists', async () => {
    // first_run stays true until the AI wizard completes, so the marker is
    // still on file when the user has already re-run the naming ceremony.
    // A second eviction here would re-wipe the name they just sealed.
    localStorage.setItem('access_token', 'cloud-jwt-value');
    localStorage.setItem('hart_reset_consumed', 'true');
    localStorage.setItem('hart_sealed', 'true');
    localStorage.setItem('hart_name', 'New Name');
    mockLiveStore({hart_reset_on_first_run: true, hart_sealed: 'true', hart_name: 'New Name'});

    renderHook(() => useStorageSync());

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(localStorage.getItem('hart_sealed')).toBe('true');
    expect(localStorage.getItem('hart_name')).toBe('New Name');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('re-arms once the marker is popped from user_data.json', async () => {
    localStorage.setItem('access_token', 'cloud-jwt-value');
    localStorage.setItem('hart_sealed', 'true');
    localStorage.setItem('hart_reset_consumed', 'true');
    mockLiveStore({hart_sealed: 'true'});

    renderHook(() => useStorageSync());

    await waitFor(() => {
      expect(localStorage.getItem('hart_reset_consumed')).toBeNull();
    });
    expect(localStorage.getItem('hart_sealed')).toBe('true');
  });

  it('does not latch when the file-side clear fails, so the next boot retries', async () => {
    seedStaleSealedIdentity();
    mockLiveStore({hart_reset_on_first_run: true, hart_sealed: 'true'});
    axios.post.mockRejectedValue(new Error('companion restarting'));

    renderHook(() => useStorageSync());

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(localStorage.getItem('hart_reset_consumed')).toBeNull();
  });
});
