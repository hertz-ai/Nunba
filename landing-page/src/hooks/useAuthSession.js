/**
 * useAuthSession.js — READ-ONLY auth/session view (Phase 1 of consolidation).
 *
 * This hook is the first step of an incremental migration from the
 * 14-site fragmented identity model to a single source of truth.  It
 * INTENTIONALLY does NOT replace any writers yet — every existing
 * localStorage.setItem / removeItem / decrypt call elsewhere in the
 * tree continues to function unchanged.  This hook only OBSERVES.
 *
 * Consumers should swap their inline `localStorage.getItem('user_id')
 * → decrypt(...)` patterns for `useAuthSession()` one at a time
 * (Phase 2 migrations), verifying behavior with cypress on each.
 *
 * Reactive surface — re-renders on:
 *   • mount (initial read)
 *   • 'storage' (cross-tab setItem from another window/tab)
 *   • 'nunba:storage_hydrated' (useStorageSync's hydrate-complete signal)
 *   • 'nunba:auth_changed' (OtpAuthModal post-signin signal)
 *   • document 'visibilitychange' returning visible
 *   • 1s same-tab poll fallback (SocialContext.guestRecover and other
 *     same-tab setItem callers don't fire the 'storage' event)
 *
 * Shape — stable contract that downstream readers can rely on:
 *   {
 *     status: 'cloud' | 'guest' | 'pending' | 'unauthenticated',
 *     identity: {
 *       user_id:      string | null,  // decrypted cloud OR raw guest
 *       email:        string | null,  // decrypted cloud OR null
 *       display_name: string | null,  // hart_name OR guest_name OR null
 *       agentname:    string | null,  // AI brand (e.g. "Hevolve")
 *       hart_node:    string | null,  // local HART name (e.g. "Radiant.Green.lawliet")
 *     },
 *     tokens: {
 *       cloud:        string | null,  // Kong-issued bearer
 *       refresh:      string | null,  // for /refresh_tokens
 *       expire_at:    number | null,  // ms-epoch, null if unknown
 *     },
 *     hart: {
 *       sealed:   boolean,
 *       name:     string | null,
 *       emoji:    string | null,
 *       language: string | null,
 *     },
 *     pending_cloud: {                 // useStorageSync sentinel — user_data.json
 *       user_id: string | null,        // had user_id+email but token=null
 *       email:   string | null,
 *     },
 *     isAuthenticated: boolean,        // derived: status in {'cloud','guest'}
 *   }
 *
 * Status semantics:
 *   'cloud'           — cloud bearer present AND decrypts/identity resolves
 *   'guest'           — guest_mode='true' AND guest_user_id present
 *   'pending'         — useStorageSync wrote pending_cloud_* sentinel
 *                       (user_data.json has user_id+email but no token)
 *   'unauthenticated' — nothing usable in localStorage
 *
 * IMPORTANT — READ-ONLY:
 *   This hook does NOT setItem.  It does NOT clear keys.  It does NOT
 *   call /api/storage/set.  The 14-site fragmentation problem is
 *   fixed by migrating CONSUMERS to read here, then in Phase 3
 *   centralizing the writers behind named imperative functions
 *   exported from this module.  Until then, all existing
 *   localStorage.setItem call sites keep working unchanged.
 */
import {useEffect, useState, useCallback} from 'react';

import {decrypt, encrypt} from '../utils/encryption';

/**
 * Single read pass over localStorage → canonical session shape.
 * Pulled out so jest can call it deterministically without React.
 */
export function readAuthSession() {
  const get = (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };

  const access_token = get('access_token');
  const refresh_token = get('refresh_token');
  const expire_token_raw = get('expire_token');

  // Cloud encrypted keys (OtpAuthModal writes via CryptoJS.AES).
  const user_id_enc = get('user_id');
  const email_enc = get('email_address');
  let cloud_user_id = null;
  let cloud_email = null;
  try {
    cloud_user_id = user_id_enc ? decrypt(user_id_enc) : null;
  } catch {
    cloud_user_id = null;
  }
  try {
    cloud_email = email_enc ? decrypt(email_enc) : null;
  } catch {
    cloud_email = null;
  }

  // Raw cloud-or-guest id mirrors (Agent.js URL-param keyset).
  const hevolve_access_id = get('hevolve_access_id');
  const guest_user_id = get('guest_user_id');
  const social_user_id = get('social_user_id');

  // Guest mode flags.
  const guest_mode = get('guest_mode') === 'true';
  const guest_name = get('guest_name') || null;
  const guest_name_verified = get('guest_name_verified') === 'true';

  // Brand + node identity.
  const agentname = get('agentname') || null;

  // HART local identity.
  const hart_sealed = get('hart_sealed') === 'true';
  const hart_name = get('hart_name') || null;
  const hart_emoji = get('hart_emoji') || null;
  const hart_language = get('hart_language') || null;

  // Partial-cloud-state sentinel (useStorageSync writes this when
  // user_data.json has user_id+email but no access_token).
  const pending_cloud_user_id = get('pending_cloud_user_id') || null;
  const pending_cloud_email = get('pending_cloud_email') || null;

  // expire_token is currently stored as seconds-duration (OtpAuthModal:316)
  // not absolute ms-epoch — that's a latent bug tracked separately.  We
  // surface null until that's fixed so callers don't false-expire.
  // TODO: when OtpAuthModal switches to absolute epoch, return ms here.
  const expire_at = null;
  void expire_token_raw;

  // Status resolution — deterministic order, first-match wins:
  //   cloud  > guest > pending > unauthenticated
  let status = 'unauthenticated';
  let user_id = null;
  let email = null;
  let display_name = null;

  if (access_token && cloud_user_id) {
    status = 'cloud';
    user_id = cloud_user_id;
    email = cloud_email;
    display_name = hart_name || guest_name || cloud_email || null;
  } else if (guest_mode && guest_user_id) {
    status = 'guest';
    user_id = guest_user_id;
    email = null;
    display_name = hart_name || guest_name || null;
  } else if (pending_cloud_user_id) {
    status = 'pending';
    user_id = pending_cloud_user_id;
    email = pending_cloud_email;
    display_name = hart_name || guest_name || pending_cloud_email || null;
  }

  // hart_node is the HART local name — only meaningful in guest/pending.
  // For cloud users it's still set in localStorage but not part of their
  // primary identity (cloud users still have a HART node alongside).
  const hart_node = guest_name || hart_name;

  return {
    status,
    identity: {
      user_id,
      email,
      display_name,
      agentname,
      hart_node,
    },
    tokens: {
      cloud: access_token || null,
      refresh: refresh_token || null,
      expire_at,
    },
    hart: {
      sealed: hart_sealed,
      name: hart_name,
      emoji: hart_emoji,
      language: hart_language,
    },
    pending_cloud: {
      user_id: pending_cloud_user_id,
      email: pending_cloud_email,
    },
    isAuthenticated: status === 'cloud' || status === 'guest',

    // Raw / mirror fields surfaced for consumers that historically
    // keyed off them.  Phase-2 migrations will collapse these into the
    // canonical fields above as each consumer is moved over.
    _raw: {
      guest_user_id,
      social_user_id,
      hevolve_access_id,
      guest_mode,
      guest_name,
      guest_name_verified,
    },
  };
}

// Identity-stable session "equality" — two snapshots are equal when
// every field that callers consume is shallow-equal.  Used by the
// reducer to skip setState calls that would no-op render but burn
// React reconciler cycles.
function _sessionEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.status === b.status &&
    a.identity.user_id === b.identity.user_id &&
    a.identity.email === b.identity.email &&
    a.identity.display_name === b.identity.display_name &&
    a.identity.agentname === b.identity.agentname &&
    a.identity.hart_node === b.identity.hart_node &&
    a.tokens.cloud === b.tokens.cloud &&
    a.tokens.refresh === b.tokens.refresh &&
    a.tokens.expire_at === b.tokens.expire_at &&
    a.hart.sealed === b.hart.sealed &&
    a.hart.name === b.hart.name &&
    a.hart.emoji === b.hart.emoji &&
    a.hart.language === b.hart.language &&
    a.pending_cloud.user_id === b.pending_cloud.user_id &&
    a.pending_cloud.email === b.pending_cloud.email
  );
}

export default function useAuthSession() {
  const [session, setSession] = useState(() => readAuthSession());

  const reread = useCallback(() => {
    const next = readAuthSession();
    setSession((prev) => (_sessionEqual(prev, next) ? prev : next));
  }, []);

  useEffect(() => {
    const onStorage = () => reread();
    const onHydrated = () => reread();
    const onAuthChanged = () => reread();
    const onVisible = () => {
      if (document.visibilityState === 'visible') reread();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('nunba:storage_hydrated', onHydrated);
    window.addEventListener('nunba:auth_changed', onAuthChanged);
    document.addEventListener('visibilitychange', onVisible);
    // Same-tab same-window setItem doesn't fire 'storage'; poll once
    // per second — single localStorage read is microseconds, the
    // equality check above prevents React churn.
    const pollId = setInterval(reread, 1000);
    // First-mount catch-up (useStorageSync may have already fired).
    reread();
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('nunba:storage_hydrated', onHydrated);
      window.removeEventListener('nunba:auth_changed', onAuthChanged);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(pollId);
    };
  }, [reread]);

  return session;
}

// ────────────────────────────────────────────────────────────────────
// Phase 4 — centralised writers
// ────────────────────────────────────────────────────────────────────
//
// All identity-state writes flow through these named exports so the
// 14-site fragmentation (OtpAuthModal localStorage block, SocialContext
// guestRecover / guestRegister, LightYourHART seal, navbar logout,
// Demopage 401 invalidation, axiosFactory interceptor) collapses to
// four canonical operations.
//
// Each writer:
//   1. Performs the localStorage mutations in a deterministic order
//      (no half-state visible to other tabs mid-batch)
//   2. Dispatches the appropriate CustomEvent so useAuthSession's
//      reread fires immediately in every tab/component, not just on
//      the next 1s poll tick
//   3. Returns the resulting session shape (so callers can chain UI
//      navigation off the new identity without waiting for re-render)
//
// READERS still work unchanged after these land — Phase 5+ migrate
// the call sites one file per commit, each gated by cypress + jest.

/**
 * setAuthFromOtp — completes a successful Kong OTP verify.
 * Replaces the localStorage block in OtpAuthModal.js:316-336.
 *
 * Encrypts the cloud user_id, email, refresh_token at the boundary
 * (single import of CryptoJS / encrypt) so the rest of the codebase
 * never sees raw cloud PII at rest.  Clears any prior guest_* and
 * pending_cloud_* sentinels so the auto-guest-register useEffect
 * skips and the partial-state hint disappears.
 */
export function setAuthFromOtp(payload) {
  if (!payload || !payload.access_token || !payload.user_id) {
    throw new Error('setAuthFromOtp: payload must include access_token + user_id');
  }
  const {
    access_token,
    user_id,
    email_address,
    refresh_token,
    expires_in,
  } = payload;

  localStorage.setItem('access_token', String(access_token));
  if (expires_in != null) {
    localStorage.setItem('expire_token', String(expires_in));
  }
  // Encrypted (CryptoJS.AES) — Agent.js:194 expects these to be encrypted.
  const enc_user = encrypt(String(user_id));
  if (enc_user) localStorage.setItem('user_id', enc_user);
  if (email_address) {
    const enc_email = encrypt(String(email_address));
    if (enc_email) localStorage.setItem('email_address', enc_email);
  }
  if (refresh_token) {
    const enc_refresh = encrypt(String(refresh_token));
    if (enc_refresh) localStorage.setItem('refresh_token', enc_refresh);
  }
  // Cloud signin clears any prior guest identity and partial-state
  // sentinels — they are mutually exclusive states.
  ['guest_mode', 'guest_user_id', 'guest_name', 'guest_name_verified',
   'pending_cloud_user_id', 'pending_cloud_email'].forEach((k) =>
    localStorage.removeItem(k));

  try {
    window.dispatchEvent(new CustomEvent('nunba:auth_changed', {
      detail: {source: 'otp_login', user_id: String(user_id)},
    }));
  } catch (_e) { /* same-origin, never throws */ }
  return readAuthSession();
}

/**
 * setGuestIdentity — completes a guest_register / guest_recover.
 * Replaces the localStorage blocks in:
 *   - SocialContext.js:131-150 (guestRecover success)
 *   - SocialContext.js:146-160 (guestRegister fallback)
 *   - SocialContext.js:202-203, 243-245, 282-283 (silent re-auth)
 *   - Demopage.js:255-257 (guest auto-refresh useEffect)
 *
 * `token` is HARTOS-issued guest JWT.  user_id is the raw guest id
 * (not encrypted — guest mode is local-only, no PII at rest).
 */
export function setGuestIdentity(payload) {
  if (!payload || !payload.user_id) {
    throw new Error('setGuestIdentity: payload must include user_id');
  }
  const {user_id, token, guest_name} = payload;

  if (token) localStorage.setItem('access_token', String(token));
  localStorage.setItem('guest_mode', 'true');
  localStorage.setItem('guest_user_id', String(user_id));
  localStorage.setItem('social_user_id', String(user_id));
  localStorage.setItem('hevolve_access_id', String(user_id));
  if (guest_name) localStorage.setItem('guest_name', String(guest_name));
  localStorage.setItem('guest_name_verified', 'true');

  try {
    window.dispatchEvent(new CustomEvent('nunba:auth_changed', {
      detail: {source: 'guest_register', user_id: String(user_id)},
    }));
  } catch (_e) { /* same-origin */ }
  return readAuthSession();
}

/**
 * clearAuth — full logout.
 * Replaces:
 *   - navbar.js:33-37 + navbarlite.js:33-37 (LogOutUser)
 *   - Demopage.js:3184-3186 + Demopage.js:3695-3702 (401 invalidation)
 *   - axiosFactory.js:127 (401 interceptor)
 *
 * Atomically removes every key the canonical session reads.  Does
 * NOT touch unrelated keys (nunba_media_mode, hart_sealed once
 * sealed — HART node identity persists across logout for the same
 * device).
 */
export function clearAuth() {
  const AUTH_KEYS = [
    'access_token',
    'refresh_token',
    'expire_token',
    'user_id',
    'email_address',
    'guest_mode',
    'guest_user_id',
    'guest_name_verified',
    'social_user_id',
    'hevolve_access_id',
    'pending_cloud_user_id',
    'pending_cloud_email',
  ];
  AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
  // Note: guest_name + hart_sealed/hart_name/hart_emoji/hart_language
  // deliberately NOT cleared — HART node identity persists across
  // logout per the 4-layer identity model (HART node + cloud account
  // co-exist; logging out of cloud doesn't dissolve the HART node).

  try {
    window.dispatchEvent(new CustomEvent('nunba:auth_changed', {
      detail: {source: 'logout'},
    }));
  } catch (_e) { /* same-origin */ }
  return readAuthSession();
}

/**
 * applyHartSeal — completes HART onboarding.
 * Replaces LightYourHART.js:1036 + 1107.
 *
 * Sets the four hart_* keys AND back-fills guest_name (Agent.js's
 * handleHartComplete:111 sets it as a side-effect; consolidating
 * here removes the parallel write).  Fires 'nunba:storage_hydrated'
 * (same event Phase 3a Agent.js listens for) so the HART gate
 * flips synchronously on the dispatching tab.
 */
export function applyHartSeal(payload) {
  if (!payload) return readAuthSession();
  const {name, emoji, language, tag} = payload;

  localStorage.setItem('hart_sealed', 'true');
  if (name) localStorage.setItem('hart_name', String(name));
  if (emoji) localStorage.setItem('hart_emoji', String(emoji));
  if (language) localStorage.setItem('hart_language', String(language));
  // hart_tag: free-form discriminator written by LightYourHART.js:1034
  // (used by SettingsPage for display).  Optional; only written when
  // provided so re-seal calls don't clobber.
  if (tag) localStorage.setItem('hart_tag', String(tag));
  // Back-fill guest_name if not already set — Agent.js handleHartComplete
  // relied on this for the auto-guest-refresh path.
  if (name && !localStorage.getItem('guest_name')) {
    localStorage.setItem('guest_name', String(name));
  }
  // Ensure guest_mode is on so auto-refresh works after restart
  // (Agent.js:114-116 used to do this inline).
  if (!localStorage.getItem('guest_mode')) {
    localStorage.setItem('guest_mode', 'true');
  }

  try {
    window.dispatchEvent(new CustomEvent('nunba:storage_hydrated', {
      detail: {
        hydrated_keys: ['hart_sealed', 'hart_name', 'hart_emoji', 'hart_language'],
        source: 'hart_seal',
      },
    }));
  } catch (_e) { /* same-origin */ }
  return readAuthSession();
}
