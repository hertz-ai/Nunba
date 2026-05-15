import {useEffect} from 'react';
import axios from 'axios';

// Cloud signin populates user_data.json (via /api/storage/set when
// companionStatus.isRunning fires).  Omniparser-gui parity: when the
// embedded webview navigated to the cloud route with token-in-URL,
// Agent.js:94-106 (URL-param handler) populated localStorage.  Nunba
// IS the React app now — no cloud redirect — so this hook reads the
// same fields from /api/storage/get/<key> and mirrors the URL-param
// handler keyset.
//
// Two distinct hydrate flows live here:
//
//  1. Authenticated cloud user (access_token + user_id both present)
//     — set the full Agent.js URL-param keyset and bail.
//
//  2. Guest user OR partial-cloud-state (user_id but no access_token)
//     — still hydrate the guest-mode keys + HART identity keys so the
//     Agent.js HART gate (hart_sealed) and the Demopage guest auto-
//     refresh don't both wrongly force the user back through HART
//     onboarding / new-guest-mint on every restart.  Diagnosed by a
//     parallel session 2026-05-15: with the old strict gate, guest
//     users with access_token=null in user_data.json silently failed
//     to hydrate, then Agent.js synchronously read hart_sealed=null
//     and shoved the user into <LightYourHART/> again.
//
// CRITICAL — keys we deliberately DO NOT set:
//   • `user_id` — encrypted in localStorage (CryptoJS.AES, see
//     Agent.js:194).  Writing raw user_id breaks the decrypt path.
//   • `email_address` — same, encrypted.
//
// Raw user_id lives in `guest_user_id` / `social_user_id` /
// `hevolve_access_id` — those are the keys components actually read.
const STORAGE_KEYS = [
  'access_token',
  'user_id',
  'email',
  'agentname',
  // HART identity — required for Agent.js mount-time gate (sealed →
  // bypass <LightYourHART/>).  Without these the user re-onboards on
  // every reinstall even though user_data.json carries their cloud
  // identity perfectly fine.
  'hart_sealed',
  'hart_name',
  'hart_emoji',
  'hart_language',
];

async function fetchStorageKey(key) {
  try {
    const resp = await axios.get(`/api/storage/get/${key}`, {timeout: 3000});
    return resp?.data?.data || null;
  } catch {
    return null;
  }
}

function setIfTruthy(key, value) {
  if (value) localStorage.setItem(key, String(value));
}

function applyHartIdentity(values) {
  setIfTruthy('hart_sealed', values.hart_sealed);
  setIfTruthy('hart_name', values.hart_name);
  setIfTruthy('hart_emoji', values.hart_emoji);
  setIfTruthy('hart_language', values.hart_language);
  // hart_name also surfaces as guest_name (Agent.js:111 sets it post-
  // onboarding).  Mirror so the post-reinstall Demopage guest-refresh
  // useEffect (which keys off guest_name) doesn't see an empty value
  // and skip silently.
  if (values.hart_name && !localStorage.getItem('guest_name')) {
    localStorage.setItem('guest_name', String(values.hart_name));
  }
}

export default function useStorageSync() {
  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      // Already authenticated in-page — don't clobber.  But still
      // top-up HART identity on first mount in case localStorage was
      // wiped (WebView2 EBWebView cleanup, browser cache clear) while
      // user_data.json survived.
      let cancelled = false;
      (async () => {
        if (localStorage.getItem('hart_sealed') === 'true') return;
        const partial = {};
        for (const key of ['hart_sealed', 'hart_name', 'hart_emoji', 'hart_language']) {
          if (cancelled) return;
          partial[key] = await fetchStorageKey(key);
        }
        if (!cancelled) applyHartIdentity(partial);
      })();
      return () => { cancelled = true; };
    }

    let cancelled = false;
    (async () => {
      const values = {};
      for (const key of STORAGE_KEYS) {
        if (cancelled) return;
        values[key] = await fetchStorageKey(key);
      }
      if (cancelled) return;

      // Re-check after await to avoid races with an in-page signin
      // completing mid-fetch.
      if (localStorage.getItem('access_token')) {
        applyHartIdentity(values);
        return;
      }

      // Relaxed gate (2026-05-15): user_id alone is enough.  For
      // authenticated cloud users values.access_token is also set;
      // for guest re-logins it's null and we skip just the token-
      // setter line below, but the rest of the guest-mode keyset
      // (guest_user_id, social_user_id, etc.) still hydrates so the
      // Demopage guest-refresh flow + Agent.js mount-render see a
      // coherent identity instead of an empty localStorage.
      if (values.user_id) {
        if (values.access_token) {
          localStorage.setItem('access_token', values.access_token);
        }
        localStorage.setItem('hevolve_access_id', String(values.user_id));
        localStorage.setItem('guest_mode', 'true');
        localStorage.setItem('guest_user_id', String(values.user_id));
        localStorage.setItem('social_user_id', String(values.user_id));
        localStorage.setItem('guest_name_verified', 'true');
        if (values.agentname) {
          localStorage.setItem('agentname', values.agentname);
        }
        applyHartIdentity(values);

        // Partial-cloud-state hint — when we know there's a cloud
        // user_id+email but the access_token never made it (Demopage
        // :420 stale-const-token race), drop a sentinel for the
        // login modal's "Log in to continue as Sales@hertzai.com"
        // prompt and so the auto-guest-register effect skips
        // minting a fresh HART guest over the cloud identity.
        if (!values.access_token) {
          localStorage.setItem('pending_cloud_user_id', String(values.user_id));
          if (values.email) {
            localStorage.setItem('pending_cloud_email', values.email);
          }
        }

        // Tell Agent.js + Demopage that storage hydrated — they can
        // re-read hart_sealed / decryptedUserId without a full page
        // reload.  Same-tab setItem doesn't fire 'storage' events,
        // so use a CustomEvent and let listeners pick it up.
        try {
          window.dispatchEvent(new CustomEvent('nunba:storage_hydrated', {
            detail: {hydrated_keys: Object.keys(values).filter((k) => values[k])},
          }));
        } catch (_e) { /* same-origin, never throws */ }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
