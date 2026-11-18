/**
 * useCameraConsent: is the owner's camera consent on file?  The one answer
 * the page's camera stream follows.
 *
 * Owner, 2026-11-09: "consent ask shd be the only gate and when consented it
 * shd work without any additional asks for vision captioning etc".  The
 * camera frames come from this browser (useCameraFrameStream), so the browser
 * has to know the answer HARTOS keeps.  Before this hook it did not:
 *   - the agent page (/local, Demopage) never listened for the answer at
 *     all; only NunbaChatProvider did, and it is mounted only under
 *     SocialLayout;
 *   - NunbaChatProvider kept the answer in sessionStorage, so a yes was
 *     forgotten at the next launch while HARTOS, holding the granted row,
 *     never asked again: allowed, and no frame ever sent;
 *   - a yes given on another surface (the floating companion, the privacy
 *     page) never reached the window that streams.
 *
 * The answer is read from HARTOS (GET /api/social/consent, the privacy
 * page's own list) when the page mounts, again whenever the realtime stream
 * (re)connects -- the page can load before HARTOS registers its routes -- and
 * whenever a camera consent is granted or revoked on any surface.  An answer
 * given on this page's card counts at once.  A read that gets no answer keeps
 * what is known; nothing is asked from here.
 */
import useCameraFrameStream from './useCameraFrameStream';

import {CAMERA_CONSENT_TYPE, CONSENT_ANSWER_TYPES} from '../constants/consentAsks';
import {NUNBA_CAMERA_CONSENT} from '../constants/events';
import realtimeService from '../services/realtimeService';
import {consentApi} from '../services/socialApi';

import {useEffect, useReducer, useRef, useState} from 'react';

// Where a guest's answer on the card is kept for the rest of the tab's
// session.  A guest has no token, so no consent row can be read back; this
// is the memory the chat panel kept for everyone before 2026-11-09, kept
// now only for the case with nothing to read.
const GUEST_ANSWER_KEY = 'nunba_camera_consent';

function grantedRows(res) {
  const rows = (res && (res.consents || (res.data && res.data.consents))) || [];
  return Array.isArray(rows) ? rows : [];
}

function hasToken() {
  try {
    return Boolean(localStorage.getItem('access_token'));
  } catch {
    return false;
  }
}

function guestAnswer() {
  try {
    return sessionStorage.getItem(GUEST_ANSWER_KEY) === 'true';
  } catch {
    return false;
  }
}

function keepGuestAnswer(approved) {
  try {
    if (approved) sessionStorage.setItem(GUEST_ANSWER_KEY, 'true');
    else sessionStorage.removeItem(GUEST_ANSWER_KEY);
  } catch { /* storage unavailable: the answer lasts this mount */ }
}

export default function useCameraConsent(userId) {
  const [allowed, setAllowed] = useState(() => !hasToken() && guestAnswer());

  useEffect(() => {
    // The list is the signed-in user's own; without a token there is
    // nothing to read (a 401 would also end a guest's session).
    if (!userId || !hasToken()) return undefined;
    let alive = true;
    const read = () => {
      consentApi
        .list({consent_type: CAMERA_CONSENT_TYPE, active_only: true},
          // Before HARTOS registers its routes the read 404s; the next
          // (re)connect reads again, so the banner has nothing to report.
          // cache: false -- the client keeps a GET for 60 s and nothing
          // clears this list on a grant, so the read a grant announcement
          // triggers would get the mount read's "no" back and turn the
          // camera off right after Allow.
          {silentError: [404], cache: false})
        .then((res) => {
          if (alive) setAllowed(grantedRows(res).length > 0);
        })
        .catch(() => { /* no answer: keep what is known */ });
    };
    const onAnswer = (answer) => {
      if (answer && answer.consent_type === CAMERA_CONSENT_TYPE) read();
    };
    read();
    const unsubs = [
      ...CONSENT_ANSWER_TYPES.map((t) => realtimeService.on(t, onAnswer)),
      realtimeService.on('connected', read),
    ];
    return () => {
      alive = false;
      unsubs.forEach((u) => u && u());
    };
  }, [userId]);

  useEffect(() => {
    const onCard = (ev) => {
      const approved = Boolean(ev?.detail?.approved);
      setAllowed(approved);
      if (!hasToken()) keepGuestAnswer(approved);
    };
    window.addEventListener(NUNBA_CAMERA_CONSENT, onCard);
    return () => window.removeEventListener(NUNBA_CAMERA_CONSENT, onCard);
  }, []);

  return allowed;
}

// ── One camera stream per person ──────────────────────────────────────────
// Both chat surfaces can be mounted at once: /social/agent/:id/chat mounts
// SocialLayout's NunbaChatProvider beside the page's Demopage, so each opened
// its own camera and socket for the same person.  Every mounted surface that
// may stream claims the person's id; the oldest claim streams and the next
// takes over when it unmounts.  A surface whose own frames already flow
// (Demopage in video mode streams 5 fps itself) holds a paused claim, and
// while one is held no surface streams through here for that person.
const claims = new Map();    // user id -> [{id, paused}] in claim order
const watchers = new Set();  // a re-render for every mounted surface

function announce() {
  watchers.forEach((rerender) => rerender());
}

function streamsHere(key, id) {
  const list = claims.get(key) || [];
  return list.length > 0 && !list.some((c) => c.paused) && list[0].id === id;
}

/**
 * Stream the camera to VisionService while the person's camera consent is
 * on file (useCameraConsent), from exactly one mounted surface.
 * ``paused``: this surface sends its own frames right now.
 */
export function useConsentedCameraStream(userId, {paused = false} = {}) {
  const allowed = useCameraConsent(userId);
  const [, rerender] = useReducer((n) => n + 1, 0);
  const self = useRef({});
  const claiming = Boolean(allowed && userId);
  const key = String(userId);

  useEffect(() => {
    watchers.add(rerender);
    return () => { watchers.delete(rerender); };
  }, []);

  useEffect(() => {
    if (!claiming) return undefined;
    const me = self.current;
    claims.set(key, [...(claims.get(key) || []), {id: me, paused}]);
    announce();
    return () => {
      const rest = (claims.get(key) || []).filter((c) => c.id !== me);
      if (rest.length) claims.set(key, rest);
      else claims.delete(key);
      announce();
    };
  }, [claiming, key, paused]);

  useCameraFrameStream({
    enabled: claiming && !paused && streamsHere(key, self.current),
    userId,
    channel: 'camera',
  });
}
