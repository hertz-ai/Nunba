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

import {decrypt} from '../utils/encryption';

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
