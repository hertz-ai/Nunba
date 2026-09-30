/**
 * What a failed steer (dashboardApi.steer: inject / pause / resume / cancel)
 * or a refused read of one run means to the person, worded as the outcome,
 * not the mechanism.  Pure, so every surface that steers (NunbaChat, the
 * companion orb, the operations drawer, the interview panel) says the same
 * thing without importing the API client.
 *
 * HARTOS answers with structured flags, and they decide:
 *   data.forbidden     may_steer refused (also an unknown id: same answer)
 *   needs_sign_in      require_auth's 401: no token, or one that no longer
 *                      verifies (integrations/social/auth.py)
 *   data.not_steerable the run has no live GroupChat to take guidance
 * The prose beside them is for people and logs and has already drifted
 * (hart_intelligence_entry says "Invalid or expired token." with a period),
 * so it is matched only as the fallback for an older HARTOS that sends no
 * flags.
 */

// An older HARTOS's prose for the two flags it did not send yet.
const _LEGACY_NEEDS_SIGN_IN = /Missing or invalid Authorization header|Invalid or expired token/;
const _LEGACY_NOT_STEERABLE = /no live GroupChat/;

const _STEER = {
  refused: 'This run belongs to someone else, so nothing was changed.',
  signIn: 'Sign in to steer this run.',
};
const _READ = {
  refused: 'This run belongs to someone else, so it cannot be shown.',
  signIn: 'Sign in to see this run.',
};
const _NOT_STEERABLE = 'This run is no longer taking guidance.';

/** What a failed steer (or, with ``{read: true}``, a refused read) means to
 *  the person.  ``err`` is whatever the call rejected or resolved with: the
 *  server's JSON (socialApi; with ``status`` when the call set keepStatus),
 *  a raw axios error, or a transport Error.
 *    forbidden                   -> "...belongs to someone else..."
 *    needs_sign_in, or a 401     -> "Sign in to ... this run."
 *    not_steerable               -> "This run is no longer taking guidance."
 *    otherwise the server's reason; else "server error (<status>)" for a
 *    fault that gave none (an HTML 500); else a transport Error's message;
 *    else ``fallback``. */
export function steerError(err, fallback = 'Guidance not delivered.', {read = false} = {}) {
  const words = read ? _READ : _STEER;
  const raw = err && err.response;                 // a raw axios error
  const body = raw ? raw.data : err;
  const json = body && typeof body === 'object' ? body : {};
  const status = Number((raw && raw.status) || json.status) || 0;

  if (json.data?.forbidden) return words.refused;
  if (json.needs_sign_in || json.data?.needs_sign_in) return words.signIn;
  if (json.data?.not_steerable || json.not_steerable) return _NOT_STEERABLE;

  // The server's reason; for a transport Error (no response at all) its own
  // message.  A raw axios error's message ("Request failed with status code
  // 500") is axios talking, not a reason: its status speaks instead.
  const reason = json.data?.error || json.error || json.message || '';
  if (_LEGACY_NEEDS_SIGN_IN.test(reason) || status === 401) return words.signIn;
  if (_LEGACY_NOT_STEERABLE.test(reason)) return _NOT_STEERABLE;
  if (reason) return reason;
  if (status >= 500) return `server error (${status})`;
  return fallback;
}
