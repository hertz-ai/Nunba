import {encrypt} from '../utils/encryption';

import axios from 'axios';
import {useEffect} from 'react';

// Detect whether the supplied JWT was minted by /auth/guest-register
// (HARTOS integrations/social/api.py:213 — username='guest_<n>_<id>')
// versus a real cloud OTP signin (username = real email/handle).
//
// 2026-05-26 — this disambiguation is the load-bearing fix for the
// webview's immediate "Session expired" bug.  readAuthSession at
// useAuthSession.js:141 promotes the session to status='cloud' as
// soon as it sees BOTH access_token AND a decryptable user_id.  If
// useStorageSync ever encrypts a guest user_id into the cloud-decrypt
// key, the next mount mis-classifies the session as cloud, isGuestMode
// flips false, /chat routes to ${CLOUD_API_URL}/chat/custom_gpt with
// the guest JWT in the Authorization header, and Hevolve cloud rejects
// it instantly.  Result: retry/delete bar with "Session expired" on
// every turn, no request ever reaches HARTOS.  Gate every encrypted-
// blob write on isGuestJwt(token)===false so a guest can never be
// promoted to cloud.
function isGuestJwt(token) {
  if (!token || typeof token !== 'string') return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    // Base64URL-decode the payload (handle URL-safe variant + padding).
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(pad));
    const u = String(payload.username || '');
    return u.startsWith('guest_');
  } catch (_e) {
    return false;
  }
}

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
// The four localStorage keys mirroring the HART identity carried in
// user_data.json — Agent.js's mount gate reads hart_sealed, LightYourHART
// writes all four on ceremony completion.
const HART_IDENTITY_KEYS = ['hart_sealed', 'hart_name', 'hart_emoji', 'hart_language'];

const STORAGE_KEYS = [
  'access_token',
  'user_id',
  'email',
  'agentname',
  // HART identity — required for Agent.js mount-time gate (sealed →
  // bypass <LightYourHART/>).  Without these the user re-onboards on
  // every reinstall even though user_data.json carries their cloud
  // identity perfectly fine.
  ...HART_IDENTITY_KEYS,
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

// app.py:1862 honours a hand-set `first_run: true` in llama_config.json by
// wiping the HART identity out of user_data.json ONCE, leaving
// `hart_reset_on_first_run: true` behind as the consumed marker.  That wipe
// cannot reach the OTHER copy of the identity: webview_data/ lives under
// ~/Documents/Nunba and survives every reinstall, so localStorage kept
// hart_sealed='true' and the naming ceremony stayed gated off — and within
// seconds of boot the Demopage/Agent localStorage→/api/storage/set mirror
// pushed the stale identity BACK into user_data.json, undoing the wipe
// entirely (both observed live 2026-08-21: file wiped 23:26, re-seeded
// 23:47:35, chat rendered instead of the ceremony).
//
// Consume the marker here, in the one place backend storage state already
// flows into localStorage: evict the four localStorage keys AND clear any
// re-seeded file copies via the '' DELETE sentinel the /api/storage/set
// merge handler defines (same payload shape SettingsPage's reset uses).
//
// Consumed-once, mirrored from app.py's marker semantics: the marker stays
// on file until onboarding completes (first_run → false pops it), so a
// plain marker check would re-wipe a name the user re-seals before
// finishing the AI wizard.  The localStorage latch makes the evict fire
// once per marker-set; the latch is only written after the file-side clear
// succeeds so a failed clear retries next boot, and it is removed when the
// marker disappears so the next manual reset is honoured again.
const HART_RESET_LATCH = 'hart_reset_consumed';

async function consumeHartResetMarker() {
  const marker = await fetchStorageKey('hart_reset_on_first_run');
  if (!marker) {
    localStorage.removeItem(HART_RESET_LATCH);
    return;
  }
  if (localStorage.getItem(HART_RESET_LATCH)) return;

  let evicted = false;
  for (const key of HART_IDENTITY_KEYS) {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      evicted = true;
    }
  }
  try {
    const clearPayload = {};
    for (const key of HART_IDENTITY_KEYS) clearPayload[key] = '';
    await axios.post('/api/storage/set', clearPayload, {timeout: 3000});
  } catch {
    return; // no latch — next boot retries the file-side clear
  }
  localStorage.setItem(HART_RESET_LATCH, 'true');
  if (evicted) {
    try {
      window.dispatchEvent(new CustomEvent('nunba:auth_changed', {
        detail: {source: 'hart_reset_on_first_run'},
      }));
    } catch (_e) { /* same-origin, never throws */ }
  }
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
      // Already authenticated in-page — don't clobber the cloud
      // signin keyset.  But TWO holes still need filling:
      //
      //   (a) HART identity — top-up if localStorage was wiped
      //       (WebView2 EBWebView cleanup, browser cache clear)
      //       while user_data.json survived.
      //   (b) Encrypted `user_id` + `email_address` localStorage
      //       keys — these are what readAuthSession decrypts to
      //       resolve status='cloud' + populate session.identity.
      //       The 2026-05-15 storage cleanup (or any prior
      //       OtpAuthModal-skip auth path) can leave access_token
      //       set but the encrypted blobs missing — in which case
      //       AgentSidebar:254 falls to the 'Account' placeholder
      //       forever even though Nunba IS authenticated.  Backfill
      //       from user_data.json so the email shows up.
      let cancelled = false;
      (async () => {
        if (cancelled) return;
        // Must run before the hart top-up below: a stale sealed flag would
        // both keep the ceremony gated off and get re-POSTed into the file.
        await consumeHartResetMarker();
        if (cancelled) return;
        const tok = localStorage.getItem('access_token');
        const guestTok = isGuestJwt(tok);

        // 2026-05-26 cleanup — if a prior session left an encrypted
        // user_id / email_address behind while the current
        // access_token is a guest JWT, the readAuthSession cloud
        // gate fires on the stale encrypted blobs and routes /chat
        // to the public cloud endpoint with a guest token (instant
        // 401 → "Session expired").  Evict the stale blobs so the
        // 'guest' branch of readAuthSession can win.  No-op when
        // there's nothing to clean.
        if (guestTok
            && (localStorage.getItem('user_id')
                || localStorage.getItem('email_address'))) {
          localStorage.removeItem('user_id');
          localStorage.removeItem('email_address');
          try {
            window.dispatchEvent(new CustomEvent('nunba:auth_changed', {
              detail: {source: 'storage_guest_cloud_mismatch_cleanup'},
            }));
          } catch (_e) { /* same-origin, never throws */ }
        }

        // (b) Backfill encrypted cloud blobs when missing — but ONLY
        // when the active access_token is a CLOUD JWT.  A guest JWT
        // carries a user_id that must NOT be encrypted into the
        // cloud-decrypt key (see isGuestJwt rationale at the top of
        // this file).
        if (!guestTok
            && (!localStorage.getItem('user_id')
                || !localStorage.getItem('email_address'))) {
          const u = await fetchStorageKey('user_id');
          const em = await fetchStorageKey('email');
          if (!cancelled) {
            if (u && !localStorage.getItem('user_id')) {
              const enc_u = encrypt(String(u));
              if (enc_u) localStorage.setItem('user_id', enc_u);
            }
            if (em && !localStorage.getItem('email_address')) {
              const enc_em = encrypt(String(em));
              if (enc_em) localStorage.setItem('email_address', enc_em);
            }
            // Tell Demopage + useAuthSession to re-read localStorage
            // so the sidebar updates without a full reload.
            if (u || em) {
              try {
                window.dispatchEvent(new CustomEvent('nunba:auth_changed', {
                  detail: {source: 'storage_backfill', user_id: u || ''},
                }));
              } catch (_e) { /* same-origin, never throws */ }
            }
          }
        }
        // (a) HART identity top-up — unchanged behaviour.
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
      // Same ordering constraint as the authenticated branch: consume the
      // reset before the hart_* fetch loop can re-hydrate a stale identity.
      await consumeHartResetMarker();
      if (cancelled) return;
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
        // 2026-05-26 — branch on JWT TYPE (cloud vs guest), not on
        // mere access_token presence.  user_data.json carries
        // access_token for both flows; promoting a guest JWT through
        // the cloud branch encrypts the guest user_id into the
        // cloud-decrypt key and breaks routing (see isGuestJwt
        // rationale at top of file).
        const cloudSignin = values.access_token
            && !isGuestJwt(values.access_token);
        if (cloudSignin) {
          // CLOUD-AUTH hydration — values from a real OTP cloud
          // signin.  Mirror setAuthFromOtp's post-OTP keyset so
          // readAuthSession matches and the sidebar resolves the
          // email instead of falling to 'Account'.
          localStorage.setItem('access_token', values.access_token);
          const enc_user = encrypt(String(values.user_id));
          if (enc_user) localStorage.setItem('user_id', enc_user);
          if (values.email) {
            const enc_email = encrypt(String(values.email));
            if (enc_email) localStorage.setItem('email_address', enc_email);
          }
          // Cloud signin clears any prior guest identity + pending
          // sentinels — same mutual-exclusion contract as
          // setAuthFromOtp:349-351.
          ['guest_mode', 'guest_user_id', 'guest_name',
           'guest_name_verified', 'pending_cloud_user_id',
           'pending_cloud_email'].forEach((k) => localStorage.removeItem(k));
        } else {
          // GUEST hydration OR partial-cloud-state (user_id known
          // but no access_token).  Write the guest keyset so
          // Agent.js + Demopage see a coherent identity instead of
          // an empty localStorage.
          //
          // If values.access_token IS a guest JWT (from /auth/guest-
          // register persisted in user_data.json), record it so the
          // Demopage auth interceptor can forward it to HARTOS /chat
          // — guest JWTs are valid there, they just must NOT be
          // promoted to a cloud session.
          if (values.access_token) {
            localStorage.setItem('access_token', values.access_token);
          }
          localStorage.setItem('hevolve_access_id', String(values.user_id));
          localStorage.setItem('guest_mode', 'true');
          localStorage.setItem('guest_user_id', String(values.user_id));
          localStorage.setItem('social_user_id', String(values.user_id));
          localStorage.setItem('guest_name_verified', 'true');
          if (!values.access_token) {
            // Drop sentinel for the login modal's
            // "Log in to continue as Sales@hertzai.com" prompt + so
            // the auto-guest-register effect skips minting a fresh
            // HART guest over the cloud identity.  Only set when
            // we have NEITHER a cloud nor a guest JWT — i.e.,
            // user_data.json predates the access_token write.
            localStorage.setItem('pending_cloud_user_id', String(values.user_id));
            if (values.email) {
              localStorage.setItem('pending_cloud_email', values.email);
            }
          }
        }
        if (values.agentname) {
          localStorage.setItem('agentname', values.agentname);
        }
        applyHartIdentity(values);

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
