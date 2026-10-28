/**
 * The ceremony's handle on HARTOS's onboarding session (/api/hart/advance).
 *
 * The session (hartos/hart_onboarding.py HARTOnboardingSession) owns the one
 * wait-then-fall-back for the name: the escape answer starts the model on a
 * background thread (_start_prewarm, one per session), the ~8.5s of
 * acknowledgement and pre-reveal hide its latency, and the reveal waits at
 * most REVEAL_WAIT_S for it before answering with an instant curated name.
 *
 * It only gets there if every step arrives, in order.  The ceremony used to
 * send select_language and the two answers but not the bare steps for the
 * greeting and the two acknowledgements, so the greeting branch swallowed
 * the passion answer, the escape answer landed in 'passion', the prewarm
 * never ran, and the name came from a second, one-shot path instead.
 *
 * Steps are queued: each is sent only after the previous one answered, so a
 * slow request can never let a later step overtake it.
 */

import { logger } from '../../utils/logger';

// The network bound on every request the ceremony makes: the session steps
// and the seal.  The session answers each step at once except the reveal,
// which HARTOS bounds itself (REVEAL_WAIT_S, then the instant path), so this
// only stops a hung network from holding the queue (and every step behind
// it) or the seal forever.  A seal that times out is retried on the next
// launch (the absent hart_sealed flag is the retry trigger).
export const HART_REQUEST_TIMEOUT_MS = 8000;

/**
 * fetch(), aborted after `timeoutMs`.  Rejects on abort or network failure,
 * exactly like fetch.  The one bounded fetch for the ceremony's requests.
 */
export async function fetchWithin(url, init = {}, {
  timeoutMs = HART_REQUEST_TIMEOUT_MS,
  fetchImpl = (...args) => fetch(...args),
} = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One session per ceremony.  `key` names it on the server: a fresh one per
 * mount, so a reload never resumes a half-finished session stuck in a later
 * phase (where select_language does nothing), and a first-run guest with no
 * user id yet still gets one.  It is not an identity or a secret (sealing
 * goes through /api/hart/seal with the real user); it only has to differ
 * between two ceremonies.
 */
export function createCeremonySession({
  baseUrl,
  fetchImpl = (...args) => fetch(...args),
  timeoutMs = HART_REQUEST_TIMEOUT_MS,
  key = `hart-ceremony-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
} = {}) {
  let queue = Promise.resolve(null);

  const send = async (action, data) => {
    try {
      const resp = await fetchWithin(`${baseUrl}/api/hart/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action || null, data: data || {}, user_id: key }),
      }, { timeoutMs, fetchImpl });
      if (resp.ok) return await resp.json();
      logger.warn(`[HART] session step ${action || 'next'} answered HTTP ${resp.status}`);
    } catch (err) {
      // Offline / timeout: the ceremony carries on locally.
      logger.warn(`[HART] session step ${action || 'next'} failed: ${err && err.message}`);
    }
    return null;
  };

  return {
    key,
    /** Send one step after every earlier one; resolves to the reply or null. */
    step(action, data) {
      queue = queue.then(() => send(action, data));
      return queue;
    },
  };
}

/** The name a reveal step answered with, or null if it is not a reveal. */
export function nameFromReveal(resp) {
  if (!resp || resp.phase !== 'reveal' || !resp.hart_name) return null;
  return {
    name: resp.hart_name,
    hartTag: resp.hart_tag || '',
    emojiCombo: resp.emoji_combo || '',
    candidates: (resp.candidates || []).filter((c) => c !== resp.hart_name),
  };
}
