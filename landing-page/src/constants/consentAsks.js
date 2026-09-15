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
 * the card never shows it; an ask without a name says "An agent".
 *
 * Allow: every grant the SPA makes goes through /api/social/consent, which
 * writes a row with no agent, so it covers every agent.  The button says
 * so (hartos-3e ruling (c): "Allow ALL agents to control this computer").
 *
 * Don't allow: /api/social/consent/decline says no to the ask, for the
 * ask's agent only when it names one.  A no stands until the owner allows
 * the type again on the privacy page (hartos-3e ruling (a)), so an ask card
 * offers it only for a type that has an on/off card there.
 *
 * Presentation only: HARTOS CONSENT_TYPES decides which types exist.  A
 * type not listed here still renders, from its own name, without a decline.
 */

// Per consent type an ask can carry:
//   asks         finishes "An agent asks to ..."
//   privacyCard  the privacy page has an on/off card for the type (the way
//                back after a "Don't allow"); PrivacyComputerControlCard.test
//                checks every one of them is on the page.
export const CONSENT_ASKS = Object.freeze({
  computer_control: {asks: 'control this computer', privacyCard: true},
  screen_capture: {asks: 'see this screen', privacyCard: true},
  data_access: {asks: 'use your data', privacyCard: false},
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

// Who is asking, as a person would say it: the agent's name, else "An agent".
export function askerName(agentName) {
  const name = String(agentName || '').trim();
  return name || 'An agent';
}

// The grant button: a grant from the SPA covers every agent.
export function allowAllLabel(consentType) {
  return `Allow ALL agents to ${consentAskText(consentType)}`;
}

export function canDecline(consentType) {
  return PRIVACY_CARD_TYPES.includes(consentType);
}

// The decline button: an ask that names an agent is declined for it only,
// and says which one when the agent has a name.
export function declineLabel(agentId, agentName) {
  if (!agentId) return "Don't allow";
  const name = String(agentName || '').trim();
  return name ? `Don't allow ${name}` : "Don't allow this agent";
}
