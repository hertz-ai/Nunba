# Auth Architecture — `useAuthSession` Consolidation

This document is the canonical reference for Nunba's identity / session / token model after the auth-consolidation refactor that landed in commits `c608135a` through `b045546e` on 2026-05-15.

## Why this exists

Before consolidation, identity state was fragmented across 14 mutation sites, 2 token authorities (Kong cloud + HARTOS local), and 4 persistence stores (browser localStorage, pywebview WebView2 leveldb, `~/Documents/HevolveAi Agent Companion/storage/user_data.json`, HARTOS social DB `User` table). Every consumer read localStorage independently at mount-time, leading to a stream of bugs where SSE subscriptions, modal visibility, and React UI state would diverge from the underlying credentials.

The consolidation introduces ONE canonical reader (`useAuthSession()` hook) and FIVE canonical writers (`setAuthFromOtp`, `setGuestIdentity`, `clearAuth`, `applyHartSeal`, `setAccessToken`, `clearAccessTokenForExpiry`). Every consumer reads from the hook; every writer goes through the named functions.

## The session shape

`useAuthSession()` returns a stable-reference object with this shape:

```js
{
  status: 'cloud' | 'guest' | 'pending' | 'unauthenticated',

  identity: {
    user_id:      string | null,    // decrypted cloud OR raw guest
    email:        string | null,
    display_name: string | null,    // hart_name OR guest_name OR email
    agentname:    string | null,    // AI brand ("Hevolve")
    hart_node:    string | null,    // local HART name
  },

  tokens: {
    cloud:     string | null,        // Kong-issued bearer
    refresh:   string | null,        // for mailer /refresh_tokens
    expire_at: number | null,        // (currently always null — see "Latent bug" below)
  },

  hart: {
    sealed:   boolean,
    name:     string | null,
    emoji:    string | null,
    language: string | null,
  },

  pending_cloud: {                   // useStorageSync's partial-state sentinel
    user_id: string | null,
    email:   string | null,
  },

  isAuthenticated: boolean,          // derived: status in {'cloud', 'guest'}

  _raw: {                            // mirror fields for components keying off them historically
    guest_user_id:        string | null,
    social_user_id:       string | null,
    hevolve_access_id:    string | null,
    guest_mode:           boolean,
    guest_name:           string | null,
    guest_name_verified:  boolean,
  },
}
```

**Status resolution** is deterministic, first-match wins:

```
cloud           — access_token AND decrypted user_id both present
guest           — guest_mode='true' AND guest_user_id present
pending         — useStorageSync sentinel: user_data.json had user_id+email but no token
unauthenticated — nothing usable
```

**Referential stability**: `session` is the same object reference across re-reads when the canonical shape hasn't changed. This is what prevents downstream consumers from re-rendering on every 1s poll tick.

## Reactivity

The hook re-reads localStorage on:

- mount (synchronous, before first render)
- `'storage'` event (cross-tab `setItem`)
- `'nunba:storage_hydrated'` (fired by `useStorageSync` after `/api/storage/get/*` hydrate)
- `'nunba:auth_changed'` (fired by all writers in this module)
- `document` `'visibilitychange'` returning visible
- 1s same-tab poll (catches same-tab `setItem` from other components that don't fire `'storage'`)

After re-read, identity-stable equality short-circuits the `setState` if nothing actually changed.

## The four writers

| Function | Replaces | Behavior |
|---|---|---|
| `setAuthFromOtp(payload)` | OtpAuthModal.js:316-336 | Cloud signin: encrypts user_id/email/refresh_token, sets access_token raw, clears prior guest_* + pending_cloud_* sentinels. Fires `nunba:auth_changed` with `source: 'otp_login'`. |
| `setGuestIdentity(payload)` | SocialContext.js:131-289 (5 sites), Demopage.js:255-257 | Guest signin / silent re-auth: writes access_token, guest_mode='true', guest_user_id, social_user_id, hevolve_access_id, guest_name, guest_name_verified='true'. Fires `nunba:auth_changed` with `source: 'guest_register'`. |
| `clearAuth()` | navbar.js, navbarlite.js, Demopage.js:3236, Demopage.js:3748 | Logout / 401 invalidation: atomically removes 12 auth keys, preserves HART node identity + unrelated keys. Fires `nunba:auth_changed` with `source: 'logout'`. |
| `applyHartSeal(payload)` | LightYourHART.js:1033, 1106 | HART onboarding: sets hart_sealed='true' + hart_name/emoji/language/tag, back-fills guest_name + guest_mode if empty. Fires `nunba:storage_hydrated` with `source: 'hart_seal'`. |

## Two narrow token writers (Phase 5)

| Function | Replaces | Behavior |
|---|---|---|
| `setAccessToken(token)` | SocialContext.js:208 (renewToken), tokenize hot path | Writes ONLY localStorage.access_token. Fires `nunba:auth_changed` with `source: 'token_refresh'`. Used for proactive JWT refresh where rotating the credential should NOT touch identity state. |
| `clearAccessTokenForExpiry()` | axiosFactory.js:127 (401 interceptor) | Removes ONLY access_token, preserves refresh_token + guest_* + hart_* (silent recovery needs them). Fires the LEGACY `'auth:expired'` event (NOT `'nunba:auth_changed'`) so SocialContext.js:272 silent-recovery listener still fires. |

## Two token authorities

| Authority | Lives at | Issues | Validates | When used |
|---|---|---|---|---|
| Kong (cloud) | `azurekong.hertzai.com/data/varify_otp` | Bearer string | Kong on every cloud API call | OTP signin, cloud chat |
| HARTOS (local) | Flask `/social/guest_register`, `/social/guest_recover` | JWT signed by `HARTOS_SECRET` | HARTOS Flask middleware | Guest mode, local-only operations |

Refresh via `mailer.hertzai.com/refresh_tokens` (Kong-tied).

## Four persistence stores

| Store | Path | What lives there | Lifetime |
|---|---|---|---|
| Browser localStorage | (regular tab origin) | Encrypted user_id, access_token, refresh_token, hart_*, guest_*, agentname | Until browser cache clear |
| pywebview WebView2 leveldb | `%LOCALAPPDATA%\HevolveAI\Nunba\EBWebView\` | Same keyset, separate origin from browser | Wiped on Nunba reinstall |
| user_data.json | `~/Documents/HevolveAi Agent Companion/storage/user_data.json` | `agentname`, `email`, `access_token`, `user_id`, `hart_*` | Survives reinstall |
| HARTOS social DB | `agent_data/social.db` `User` table | `id`, `username`, `display_name`, `email`, `api_token`, `is_verified`, `user_type` | Persistent |

`useStorageSync` hydrates browser localStorage from user_data.json on mount (covers the WebView2 wipe scenario). app.py `/api/storage/set` writes user_data.json AND upserts the HARTOS social DB row.

## Three identity layers (4-layer model, preserved)

A single human can simultaneously have:

1. **HART node name** (local, hardware-derived): `Radiant.Green.lawliet` — survives logout from cloud
2. **Cloud user_id** + email: `10202` / `Sales@hertzai.com` — identifies them across devices
3. **Display name**: whatever the agent gave them or they chose
4. **Agentname**: the AI brand they're talking to (`Hevolve`)

`clearAuth()` clears layer 2 only. Layer 1, 3, 4 persist across logout. This is intentional — logging out of your cloud account doesn't dissolve your HART identity on the local device.

## Latent bug: expire_at always null

`OtpAuthModal.js:316` writes `expires_in` (a duration in seconds, e.g. `3600`) to `localStorage.expire_token` as if it were an absolute timestamp. The hook's `readAuthSession()` returns `tokens.expire_at = null` until that bug is fixed (committing the wrong value would cause callers to false-expire valid tokens). When the bug is fixed (OtpAuthModal stores `Date.now() + expires_in * 1000` as ms-epoch), the hook can surface the real value.

Also note: `OtpAuthModal.js:387` writes `newAccessToken` to `localStorage.expire_token` (the access_token VALUE goes into the expire_token KEY). This was preserved verbatim in Phase 5 per zero-functionality-loss, but is almost certainly a bug. Investigate before any future token-lifecycle work.

## Migration trail (commits)

| Phase | Commit | Scope |
|---|---|---|
| 1 — Foundation | `c608135a` | Read-only hook + 14 jest tests |
| 2 — Demopage reader | `a34986bd` | Demopage identity state from hook |
| Test fix | `02b6b964` | useStorageSync test updated for HART top-up |
| 3a — Agent.js reader | `6115a8e4` | Agent.js HART gate from hook |
| 3b-3e — Other readers | `08d6324b` | AgentSidebar, SocialContext, navbar(s), NunbaChatProvider |
| 4 — Writer foundation | `64ef8b48` | 4 writers + 13 tests |
| 4a — OtpAuthModal writer | `9a9d1606` | setAuthFromOtp |
| 4b — Guest writers | `f017e7c9` | setGuestIdentity ×5 sites |
| 4c — HART seal writer | `4a493e69` | applyHartSeal ×2 sites + tag param |
| 4d — Logout/401 | `24c3cc1c` | clearAuth ×4 sites |
| 5 — Token lifecycle | `3006de2a` | setAccessToken + clearAccessTokenForExpiry |
| 6 — Persistence sync | `9b007a70` | Cloud-creds POST reads HART from session |
| 6.1 — Dead-gate fix | `b045546e` | Removed companionStatus.isRunning gate |
| 7 — Cleanup | (this commit) | Inline `_hydrateLocalStorageField`, ADR doc |

## Test coverage

`landing-page/src/__tests__/hooks/useAuthSession.test.js` — 32 cases:

- Read model (8): cold start, guest sealed, guest unsealed, cloud full, partial-cloud, corrupt-encryption, cloud+hart-sealed (4-layer), guest_mode without guest_user_id
- Reactivity (6): mount sync, storage_hydrated event, auth_changed event, 1s poll, identity equality, visibilitychange
- Writers (13): 3× setAuthFromOtp, 3× setGuestIdentity, 1× clearAuth (12-key atomic), 4× applyHartSeal, 2× integration
- Phase 5 writers (4): 2× setAccessToken, 2× clearAccessTokenForExpiry

`landing-page/src/__tests__/hooks/useStorageSync.test.js` — 8 cases including the WebView2-wipe HART top-up scenario.

## How to add a new auth-touching feature

1. **Read** identity / token / hart state via `useAuthSession()`. Never call `localStorage.getItem` directly for any of the 18 canonical keys.
2. **Write** via the named exports. Do not call `localStorage.setItem('access_token', ...)` inline — find the right writer:
   - Cloud signin → `setAuthFromOtp`
   - Guest signin / silent re-auth → `setGuestIdentity`
   - Logout → `clearAuth`
   - HART onboarding → `applyHartSeal`
   - Pure token refresh → `setAccessToken`
   - 401 invalidation that should trigger silent recovery → `clearAccessTokenForExpiry`
3. If you genuinely need a new write pattern, ADD a new named writer to `useAuthSession.js` with a jest test, then call it. Do NOT inline a new `setItem` call site.

## Known limitations / future work

- The cloud-creds POST in Demopage.js still has tight coupling to `currentAgent?.name` (Demopage state) and could not be fully extracted into the hook in Phase 6 without companion-status plumbing. The full extraction is a future option once we decide whether the hook should orchestrate persistence or stay read+write only.
- `setDecryptedUserId`, `setDecryptedEmail`, `setIsGuestMode`, `setGuestName`, `setGuestUserId` setters remain in Demopage.js — they're used by ~5 legitimate sites (URL-param handler, custom-event listener, user-input handlers, logout). These are direct React state updates that mirror the underlying localStorage writes. A future Phase 8 could collapse these into a `useAuthSessionState()` composite hook if needed.
- `decryptedPhone` doesn't yet flow through useAuthSession; phone is encrypted in localStorage but not in the canonical session shape. Add when a consumer needs it.
- `OtpAuthModal.js:387` token-vs-expire_token key bug — preserved verbatim, audit + fix in future commit.

## Risk register (from the consolidation)

| Risk | Mitigation | Status |
|---|---|---|
| Encrypted user_id ciphertext rotation between bundles | Hook handles `decrypt → null` gracefully, falls to `status='unauthenticated'` rather than crash | ✅ Phase 1 |
| Same-tab `setItem` doesn't fire `'storage'` event | 1s poll fallback + `'nunba:auth_changed'` CustomEvent dispatched by writers | ✅ Phase 1, 4 |
| Mid-phase regression on every commit | jest gate + cypress gate between every phase | ✅ all phases |
| pywebview WebView2 localStorage wipe on reinstall | `useStorageSync` reads from `/api/storage/get/*` and re-hydrates including hart_* | ✅ Phase 1, 4c |
| 401 invalidation breaks silent guest recovery | `clearAccessTokenForExpiry` fires legacy `'auth:expired'` (not `'nunba:auth_changed'`); explicit invariant test | ✅ Phase 5 |
| Cloud-creds POST stranded behind dead WAMP gate | `companionStatus.isRunning` gate removed; POST always fires | ✅ Phase 6.1 |
| Latent bugs in `expire_token` key handling | Documented above; future commit | ⏳ open |
