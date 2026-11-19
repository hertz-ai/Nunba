/**
 * Who is paying, and how they come back after signing in.
 *
 * Port of Hevolve web's src/utils/checkoutSession.js (commit ab8555c), for the
 * account store's paid-plan contract (Hevolve_Database 11b2401f, #286 / #202):
 * /addsubscription_by_phone wants the signed-in person's bearer token and
 * /makepayment looks the payer up by phone.  Both come from the signed-in
 * session, never from router state (#206: a visit straight to /Plan has no
 * state, so the checkout posted an empty phone and got a 500).
 *
 * The session is hooks/useAuthSession's.  Only status 'cloud' is a payer: its
 * tokens.cloud is the Kong bearer, whereas a guest's access_token is a HARTOS
 * JWT the account store does not know.  The phone is the one fact the session
 * did not keep: setAuthFromOtp now stores it (encrypted) and clearAuth clears
 * it.  Inside the Android webview the phone comes from the app's own session
 * (window.Handy.getUserDetails); the app's bridge offers no token.
 *
 * No network and no React, so it is cheap to import and to test.
 */
import {readAuthSession, readSessionPhone} from '../hooks/useAuthSession';

/** The page that lists the plans (`/pricing` here is the commercial API table). */
export const PLAN_PAGE_PATH = '/Plan';

/** The phone the Android app says the person signed in with, or null. */
export function phoneFromApp() {
  try {
    const details = JSON.parse(window.Handy.getUserDetails());
    return details && details.phone_number
      ? String(details.phone_number)
      : null;
  } catch {
    return null;
  }
}

/** True when there is a cloud sign-in (not a guest, not signed out). */
export function hasCloudSession() {
  return readAuthSession().status === 'cloud';
}

/**
 * The signed-in payer {accessToken, phone}, or null when the checkout must
 * send the person to sign in first.  A cloud session from before the phone was
 * kept has a token and no phone: it counts as not signed in, and one sign-in
 * fixes it.
 */
export function readPayer() {
  const accessToken = readAuthSession().tokens.cloud;
  if (!accessToken) return null;
  const phone = phoneFromApp() || readSessionPhone();
  if (!phone) return null;
  return {accessToken, phone};
}

/**
 * A page of THIS site that sign-in may send the person back to, or null.
 * Anything that could leave the site (another origin, //host, a scheme, a
 * backslash, control characters) is refused rather than followed.
 */
export function safeReturnPath(next) {
  if (typeof next !== 'string' || next.length === 0 || next.length > 300) {
    return null;
  }
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  if (next.includes('\\')) return null;
  for (let i = 0; i < next.length; i += 1) {
    const code = next.charCodeAt(i);
    if (code < 32 || code === 127) return null;
  }
  return next;
}

/** Where the person lands to carry on with a chosen plan: /Plan?plan=<id>. */
export function checkoutReturnPath(planId, numStudents = null) {
  const params = new URLSearchParams({plan: String(planId)});
  if (numStudents) params.set('num_students', String(numStudents));
  return `${PLAN_PAGE_PATH}?${params.toString()}`;
}
