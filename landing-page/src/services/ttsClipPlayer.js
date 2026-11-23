/**
 * ttsClipPlayer.js — the one function that loads a TTS clip into the shared
 * audio element (services/ttsAudioElement.js), and the window's one record of
 * what it has already said.
 *
 * The same clip reaches the chat page over two transports (SSE through
 * realtimeService's 'tts' event, WAMP through the crossbar worker), and each
 * used to assign `el.src` and call play() itself.  Assigning `src` is a new
 * load; it aborts a play() still pending on the same element, so the second
 * delivery cancelled the first and the owner heard nothing (console,
 * 2026-10-02: "The play() request was interrupted by a new load request",
 * twice per clip).  Deduping by URL here makes the second delivery a no-op.
 *
 * The record (claimSpeech) is per window, like the element, and every way the
 * window speaks asks it first: each clip player (playTtsClip, so Demopage and
 * the Social panel alike) by the clip's url, and the page's own speech
 * (utils/ttsGuards) by the message or turn it says.  It used to hold the last
 * clip only, so a clip delivered again after another one loaded was loaded a
 * second time.
 */
const DEDUP_MS = 30000;
// Entries kept before the stale ones are swept (one per clip or message).
const KEPT = 200;

const spoken = new Map(); // key -> when it was said here

function saidLately(key, now) {
  const at = spoken.get(key);
  return at !== undefined && now - at < DEDUP_MS;
}

/**
 * Whether this window may say `key` now, recording it when it may: false when
 * it was said here inside DEDUP_MS, or when `coveredBy` was (the same words
 * said another way).  An empty key is never recorded and always may.
 *
 * Keys: clipKey(url) (playTtsClip, and Demopage's <audio autoPlay> for a
 * clip a message carries), 'msg:<msg_id>' (a pushed message the page
 * speaks itself), 'said:<turn id>' (a turn's reply the page spoke itself) and
 * 'played:<turn id>' (a clip of that turn played here).
 */
export function claimSpeech(key, now = Date.now(), coveredBy = '') {
  if (!key) return true;
  if (saidLately(key, now) || (coveredBy && saidLately(coveredBy, now))) return false;
  spoken.set(key, now);
  if (spoken.size > KEPT) {
    for (const [k, at] of spoken) {
      if (now - at >= DEDUP_MS) spoken.delete(k);
    }
  }
  return true;
}

/**
 * The record's key for a clip: its path, so one clip is one key whichever
 * way its url is written (the SPA's '/tts/audio/x.wav', the phone bundle's
 * 'http://<node>:5000/tts/audio/x.wav').  '' for no url.
 */
export function clipKey(url) {
  if (!url || typeof url !== 'string') return '';
  return `clip:${url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '')}`;
}

/**
 * @param {HTMLAudioElement|null} el  the shared element
 * @param {string} url                the clip
 * @param {{onStart?:Function,onEnd?:Function,onError?:Function}} [hooks]
 * @param {number} [now]              injectable clock (tests)
 * @param {string} [turnId]           the turn the clip speaks (its request id):
 *                                    not played when the page already spoke
 *                                    that turn's reply itself
 * @returns {'played'|'duplicate'|'no-element'|'no-url'}
 */
export function playTtsClip(el, url, hooks = {}, now = Date.now(), turnId = '') {
  if (!el) return 'no-element';
  if (!url) return 'no-url';
  if (!claimSpeech(clipKey(url), now, turnId ? `said:${turnId}` : '')) return 'duplicate';
  // Noted, not claimed: a turn may have more than one clip (a draft's, then
  // the expert reply's), and each plays.
  if (turnId) claimSpeech(`played:${turnId}`, now);

  el.src = url;
  if (hooks.onStart) hooks.onStart();
  el.onended = () => { if (hooks.onEnd) hooks.onEnd(); };
  el.onerror = () => { if (hooks.onEnd) hooks.onEnd(); };
  const started = el.play();
  if (started && typeof started.catch === 'function') {
    started.catch((err) => { if (hooks.onError) hooks.onError(err); });
  }
  return 'played';
}

/** Tests only. */
export function _resetTtsClipPlayer() {
  spoken.clear();
}

export default playTtsClip;
