/**
 * consentAsks.js — how the SPA names a HARTOS consent ask and its answers.
 *
 * HARTOS asks the desktop owner through ConsentService.request_consent
 * (integrations/social/consent_service.py); the ask arrives as
 * {type: 'consent.request', consent_type, scope, agent_id, agent_name, reason}.
 * When the producer gives a reason (integrations/vlm/safety.
 * computer_control_block does), the card shows that reason; this module
 * says what is asked when there is none, and names the answers.
 *
 * Who asks: agent_name is the agent's own name, resolved by HARTOS where the
 * ask is built.  agent_id is a prompt id, which means nothing to a person, so
 * the card never shows it; an ask without a name says "An agent".  A
 * person's phone asking for this desktop (#111, device_access) carries
 * requester_name instead, and agent_id null.
 *
 * Allow: every grant the SPA makes goes through /api/social/consent, which
 * writes a row with no agent, so it covers every agent.  The button says
 * so (hartos-3e ruling (c): "Allow ALL agents to control this computer").
 * A per-requester type (device_access) grants the ask's exact scope, one
 * phone, and the button names it: "Always allow Giri's phone".
 *
 * Don't allow: /api/social/consent/decline says no to the ask, for the
 * ask's agent only when it names one.  A no stands until the owner allows
 * the type again on the privacy page (hartos-3e ruling (a)), so an ask card
 * offers it only for a type that has an on/off card there.
 *
 * Answered elsewhere: an answer given on any surface dismisses the ask on
 * every surface it was shown on, for that user or the network guests (owner
 * 2026-09-15).  HARTOS tells every device: grant_consent emits
 * consent.granted and revoke_consent (the card's "Don't allow") emits
 * consent.revoked, both {consent_type, scope, agent_id}, through the same
 * on_notification fan-out the ask rides (consent_service._emit).  Every
 * surface that shows the card listens for those and drops the asks they
 * cover (answerCoversAsk).  "Not now" is local: the server has no ack for
 * an open ask, and a waiting gate re-sends it anyway.
 *
 * Presentation only: HARTOS CONSENT_TYPES decides which types exist.  A
 * type not listed here still renders, from its own name, without a decline.
 */

// Per consent type an ask can carry:
//   asks         finishes "An agent asks to ..."
//   privacyCard  the privacy page has an on/off card for the type (the way
//                back after a "Don't allow"); PrivacyComputerControlCard.test
//                checks every one of them is on the page.
//   perRequester the ask comes from a person, not an agent (requester_name),
//                and the grant is the ask's exact scope: that one requester,
//                never a blanket over every agent.
export const CONSENT_ASKS = Object.freeze({
  computer_control: {asks: 'control this computer', privacyCard: true},
  screen_capture: {asks: 'see this screen', privacyCard: true},
  data_access: {asks: 'use your data', privacyCard: false},
  // A person's phone asking to reach this desktop's agents from the network
  // (#111 phase 1): scope 'device:<64 hex key>', agent_id null.  The privacy
  // page's per-person device card (#111, in review) is the way back after a
  // "Don't allow"; privacyCard flips when it lands.
  device_access: {
    asks: 'reach this computer from their phone', privacyCard: false, perRequester: true,
  },
});

// The consent types with an on/off card on the privacy page.
export const PRIVACY_CARD_TYPES = Object.freeze(
  Object.keys(CONSENT_ASKS).filter((type) => CONSENT_ASKS[type].privacyCard),
);

export function consentAskText(consentType) {
  if (CONSENT_ASKS[consentType]) return CONSENT_ASKS[consentType].asks;
  const name = String(consentType || 'this permission').replace(/_/g, ' ');
  return `use ${name}`;
}

function isPerRequester(consentType) {
  return Boolean(CONSENT_ASKS[consentType] && CONSENT_ASKS[consentType].perRequester);
}

// Who is asking, as a person would say it: the name the ask carries, else
// "An agent" (a person's ask with no name: "Someone").
export function askerName(name, consentType) {
  const who = String(name || '').trim();
  if (who) return who;
  return isPerRequester(consentType) ? 'Someone' : 'An agent';
}

// What a per-requester grant or decline covers: "Giri's phone".
function requesterDevice(name) {
  const who = String(name || '').trim();
  return who ? `${who}'s phone` : 'this phone';
}

// The grant button: a grant from the SPA covers every agent.
export function allowAllLabel(consentType) {
  return `Allow ALL agents to ${consentAskText(consentType)}`;
}

// The grant button for an ask: every agent, or the one requester the ask's
// scope names.
export function grantLabel(consentType, requesterName) {
  if (isPerRequester(consentType)) return `Always allow ${requesterDevice(requesterName)}`;
  return allowAllLabel(consentType);
}

export function canDecline(consentType) {
  return PRIVACY_CARD_TYPES.includes(consentType);
}

// The decline button: a person's ask is declined for that requester; an
// ask that names an agent is declined for it only, and says which one when
// the agent has a name.
export function declineLabel(consentType, agentId, name) {
  if (isPerRequester(consentType)) return `Don't allow ${requesterDevice(name)}`;
  if (!agentId) return "Don't allow";
  const who = String(name || '').trim();
  return who ? `Don't allow ${who}` : "Don't allow this agent";
}

// The events HARTOS broadcasts when an ask is answered, on any surface.
export const CONSENT_ANSWER_TYPES = Object.freeze(['consent.granted', 'consent.revoked']);

// True when an answer settles an ask, by ConsentService.check_consent's own
// lookup, step for step:
//   1. exact: the same type, scope and agent;
//   2. wildcard: the ask's own agent answered for every scope ('*');
//   3. blanket: every agent answered for every scope ('*', no agent).
// Steps 2 and 3 run only for an ask that names an agent (check_consent
// guards both with `agent_id is not None`), so an ask with no agent — a
// person's phone (device_access, scope 'device:<key>') — is settled by its
// exact scope alone: a blanket device_access row admits no phone, and the
// gate keeps answering consent_pending, so the card must stay up
// (hartos-3e review of ef237047).  An answer for another agent or another
// phone leaves this ask open.
export function answerCoversAsk(answer, ask) {
  if (!answer || !ask || !answer.consent_type
      || answer.consent_type !== ask.consent_type) return false;
  const scope = answer.scope || '*';
  const askScope = ask.scope || '*';
  const sameAgent = answer.agent_id == null
    ? ask.agent_id == null : String(answer.agent_id) === String(ask.agent_id);
  if (scope === askScope && sameAgent) return true;
  if (ask.agent_id == null || scope !== '*') return false;
  return answer.agent_id == null || String(answer.agent_id) === String(ask.agent_id);
}
