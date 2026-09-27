/**
 * What a failed steer (dashboardApi.steer: inject / pause / resume / cancel)
 * means to the person, worded as the outcome, not the mechanism.  Pure, so
 * every surface that steers (NunbaChat, the companion orb, the operations
 * drawer) says the same thing without importing the API client.
 */

// require_auth's two 401 answers (integrations/social/auth.py): no token,
// or one that no longer verifies.
const _STEER_NEEDS_SIGN_IN = /Missing or invalid Authorization header|Invalid or expired token/;

/** What a failed steer means to the person, from whatever dashboardApi.steer
 *  rejected with (the server's JSON, or a transport Error).  Worded as the
 *  outcome, not the mechanism:
 *    403 forbidden (HARTOS may_steer; also an unknown id, same answer)
 *        -> "You can only steer your own runs."
 *    401 from require_auth -> "Sign in to steer this run."
 *    no live GroupChat     -> "This run is no longer taking guidance."
 *    otherwise the server's reason, else `fallback`. */
export function steerError(err, fallback = 'Guidance not delivered.') {
  // socialApi rejects with the server's JSON; a raw axios error carries it
  // under response.data (and a message that is only "status code 403").
  const body = err?.response?.data || err;
  if (body?.data?.forbidden) return 'You can only steer your own runs.';
  const reason = body?.data?.error || body?.error
    || (err?.response ? '' : err?.message) || '';
  if (_STEER_NEEDS_SIGN_IN.test(reason)) return 'Sign in to steer this run.';
  if (/no live GroupChat/.test(reason)) return 'This run is no longer taking guidance.';
  return reason || fallback;
}
