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
import {CAMERA_CONSENT_TYPE, CONSENT_ANSWER_TYPES} from '../constants/consentAsks';
import {NUNBA_CAMERA_CONSENT} from '../constants/events';
import realtimeService from '../services/realtimeService';
import {consentApi} from '../services/socialApi';

import {useEffect, useState} from 'react';

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

export default function useCameraConsent(userId) {
  const [allowed, setAllowed] = useState(false);

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
    const onCard = (ev) => setAllowed(Boolean(ev?.detail?.approved));
    window.addEventListener(NUNBA_CAMERA_CONSENT, onCard);
    return () => window.removeEventListener(NUNBA_CAMERA_CONSENT, onCard);
  }, []);

  return allowed;
}
