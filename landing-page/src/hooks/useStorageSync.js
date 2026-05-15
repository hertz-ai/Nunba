import {useEffect} from 'react';
import axios from 'axios';

// Cloud signin populates user_data.json (via /api/storage/set when
// companionStatus.isRunning fires).  Omniparser-gui parity: when the
// embedded webview navigated to the cloud route with token-in-URL,
// Agent.js:94-106 (URL-param handler) populated localStorage with 6
// keys.  Nunba IS the React app now — no cloud redirect — so this
// hook reads the same fields from /api/storage/get/<key> and mirrors
// the Agent.js URL-param handler EXACTLY (same 6 keys, same trigger
// condition: both access_token AND user_id present AND no existing
// localStorage access_token).
//
// CRITICAL — keys we deliberately DO NOT set:
//   • `user_id` — encrypted in localStorage (CryptoJS.AES, see
//     Agent.js:194).  Writing raw user_id breaks the decrypt path.
//   • `email_address` — same, encrypted.
//
// Raw user_id lives in `guest_user_id` / `social_user_id` /
// `hevolve_access_id` — those are the keys components actually read
// (navbar.js, NunbaChatProvider.jsx, SocialContext.js, Demopage.js,
// hevolveDemo.js, AgentSidebar.js, SocialLayout.js, TeacherSignIn.js).
//
// Idempotent: skipped entirely when localStorage already has an
// access_token — an active in-page signin is never overwritten.
const STORAGE_KEYS = ['access_token', 'user_id', 'email', 'agentname'];

async function fetchStorageKey(key) {
  try {
    const resp = await axios.get(`/api/storage/get/${key}`, {timeout: 3000});
    return resp?.data?.data || null;
  } catch {
    return null;
  }
}

export default function useStorageSync() {
  useEffect(() => {
    if (localStorage.getItem('access_token')) return;

    let cancelled = false;
    (async () => {
      const values = {};
      for (const key of STORAGE_KEYS) {
        if (cancelled) return;
        values[key] = await fetchStorageKey(key);
      }
      if (cancelled) return;

      // Trigger condition mirrors Agent.js:94-106: both token AND
      // user_id must be present, AND no existing access_token in
      // localStorage (re-check after await to avoid races with an
      // in-page signin completing mid-fetch).
      if (
        values.access_token &&
        values.user_id &&
        !localStorage.getItem('access_token')
      ) {
        localStorage.setItem('access_token', values.access_token);
        localStorage.setItem('hevolve_access_id', String(values.user_id));
        localStorage.setItem('guest_mode', 'true');
        localStorage.setItem('guest_user_id', String(values.user_id));
        localStorage.setItem('social_user_id', String(values.user_id));
        localStorage.setItem('guest_name_verified', 'true');
        if (values.agentname) {
          localStorage.setItem('agentname', values.agentname);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
