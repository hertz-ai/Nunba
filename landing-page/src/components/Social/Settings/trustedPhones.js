/**
 * trustedPhones.js — the owner's list of phones, from the consent rows.
 *
 * A phone that asks to reach this computer's agents from the network (#111)
 * is a `device_access` consent whose scope is the phone's key
 * ('device:<64 hex>').  HARTOS keeps the table append-only (consent_api.py),
 * so one phone has several rows over time: the pending ask, a grant, a
 * revoke, a decline.  This folds them into ONE entry per phone with the
 * three states the privacy page shows.  Pure: no I/O, no React.
 *
 * What a row carries (HARTOS 29a188036, consent_api._row_to_dict):
 *   scope        the phone's key -- unreadable, so the entry keys on it but
 *                never shows it
 *   label        the name the phone signed into its FIRST ask, copied onto
 *                its grants (consent_service._label_on_file); null when the
 *                phone sent none.  Self-asserted: a hint beside the
 *                fingerprint, never identity.
 *   fingerprint  the key's first 16 hex in four groups, what the owner
 *                matches against the phone's own display
 *   granted / revoked_at   the row's fate; a pending ask has neither
 *
 * Two writers leave two shapes of "no", and _row_to_dict does not say
 * which: the HTTP POST /consent/revoke (consent_api.py, the page's Block)
 * inlines its own query and sets revoked_at on the granted rows WITHOUT
 * flipping granted, so a blocked phone reads {granted: true, revoked_at};
 * ConsentService.revoke_consent (the card's and the page's Don't allow,
 * via /consent/decline) marks the pending row {granted: false, revoked_at}.
 * ALLOWED = granted && !revoked_at and BLOCKED = any revoked_at hold for
 * both.  A pending ask has no active grant, so /revoke would 404 on it --
 * that is why the page's Don't allow goes to /decline.
 */
import {deviceFingerprint} from '../../../constants/consentAsks';

export const DEVICE_ACCESS = 'device_access';

export const PHONE_STATES = Object.freeze({
  ALLOWED: 'ALLOWED',   // a granted, unrevoked row: the gate admits the phone
  BLOCKED: 'BLOCKED',   // a revoked row and no active grant: a no stands
  PENDING: 'PENDING',   // only pending rows: the phone asked, nobody answered
});

export const UNNAMED_PHONE = 'Unnamed phone';

// One entry per phone, in the order the server listed them (newest first).
export function trustedPhones(rows) {
  const byScope = new Map();
  for (const row of rows || []) {
    if (!row || row.consent_type !== DEVICE_ACCESS || !row.scope) continue;
    let phone = byScope.get(row.scope);
    if (!phone) {
      phone = {scope: row.scope, label: null, fingerprint: null, active: false, revoked: false};
      byScope.set(row.scope, phone);
    }
    if (!phone.label && row.label) phone.label = String(row.label);
    if (!phone.fingerprint && row.fingerprint) phone.fingerprint = row.fingerprint;
    if (row.granted && !row.revoked_at) phone.active = true;
    if (row.revoked_at) phone.revoked = true;
  }
  return [...byScope.values()].map((phone) => ({
    scope: phone.scope,
    label: phone.label || UNNAMED_PHONE,
    fingerprint: phone.fingerprint || deviceFingerprint(phone.scope) || phone.scope,
    state: phone.active ? PHONE_STATES.ALLOWED
      : phone.revoked ? PHONE_STATES.BLOCKED : PHONE_STATES.PENDING,
  }));
}
