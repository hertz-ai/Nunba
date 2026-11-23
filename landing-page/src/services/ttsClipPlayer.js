/**
 * ttsClipPlayer.js — the one function that loads a TTS clip into the shared
 * audio element (services/ttsAudioElement.js).
 *
 * The same clip reaches the chat page over two transports (SSE through
 * realtimeService's 'tts' event, WAMP through the crossbar worker), and each
 * used to assign `el.src` and call play() itself.  Assigning `src` is a new
 * load; it aborts a play() still pending on the same element, so the second
 * delivery cancelled the first and the owner heard nothing (console,
 * 2026-10-02: "The play() request was interrupted by a new load request",
 * twice per clip).  Deduping by URL here makes the second delivery a no-op.
 */
const DEDUP_MS = 30000;

let lastClip = { url: '', at: 0 };

/**
 * @param {HTMLAudioElement|null} el  the shared element
 * @param {string} url                the clip
 * @param {{onStart?:Function,onEnd?:Function,onError?:Function}} [hooks]
 * @param {number} [now]              injectable clock (tests)
 * @returns {'played'|'duplicate'|'no-element'|'no-url'}
 */
export function playTtsClip(el, url, hooks = {}, now = Date.now()) {
  if (!el) return 'no-element';
  if (!url) return 'no-url';
  if (lastClip.url === url && now - lastClip.at < DEDUP_MS) return 'duplicate';
  lastClip = { url, at: now };

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
  lastClip = { url: '', at: 0 };
}

export default playTtsClip;
