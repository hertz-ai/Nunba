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
 * requester_name instead, and agent_id null.  That name is self-asserted
 * (the phone signed it into its ask), so the card shows it only as a claim
 * -- title 'A phone calling itself "Giri"' -- beside requester_fingerprint,
 * the first 16 hex of the phone's key in four groups (HARTOS
 * consent_service.device_fingerprint; the phone shows its own key the same
 * way), with the caption telling the owner to match the two.  The wording
 * is the security control (hartos-63, 2026-09-16): the name never appears
 * as fact, not in the body and not on a button.
 *
 * Allow: every grant the SPA makes goes through /api/social/consent, which
 * writes a row with no agent, so it covers every agent.  The button says
 * so (hartos-3e ruling (c): "Allow ALL agents to control this computer").
 * A per-requester type (device_access) grants the ask's exact scope, one
 * phone: "Always allow this phone".
 *
 * Don't allow: /api/social/consent/decline says no to the ask, for the
 * ask's agent only when it names one.  A no stands until the owner allows
 * the type again on the privacy page (hartos-3e ruling (a)), so an ask card
 * offers it only for a type that has a card there: an on/off card for an
 * agent type, the per-phone rows (Allow / Block / Don't allow, one scope
 * each) for device_access.
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
//   asks         finishes "An agent asks to ..." / "This phone asks to ..."
//   privacyCard  the privacy page has a card for the type (the way back
//                after a "Don't allow"): on/off for an agent type, one row
//                per phone for a per-requester type.
//                PrivacyComputerControlCard.test checks every one is there.
//   perRequester the ask comes from a person's phone, not an agent
//                (requester_name + requester_fingerprint, agent_id null),
//                and the grant is the ask's exact scope: that one phone,
//                never a blanket over every agent.
export const CONSENT_ASKS = Object.freeze({
  computer_control: {asks: 'control this computer', privacyCard: true},
  screen_capture: {asks: 'see this screen', privacyCard: true},
  // The camera's half of the pair.  screen_capture has existed since #701;
  // the camera had no consent type at all, so Request_Camera_Access could
  // only push a LiquidUI 'approval' component that this file's whole
  // vocabulary never saw -- unrecorded, unrevocable, and invisible on the
  // floating companion (#863).  HARTOS files it as camera_capture now.
  camera_capture: {asks: 'see through your camera', privacyCard: true},
  data_access: {asks: 'use your data', privacyCard: false},
  // An agent's stuck step handed to the expert, when the expert is the
  // owner's Claude Code subscription and the copilot switch is off.  The
  // owner's Allow / Don't allow acts on that ONE switch (HARTOS
  // set_copilot_enabled), the same one the admin page flips; the privacy
  // card is the way back after a no.  Node-wide, so a blanket grant.
  copilot_access: {asks: 'use your Claude subscription for a hard step', privacyCard: true},
  // A person's phone asking to reach this desktop's agents from the network
  // (#111): scope 'device:<64 hex key>', agent_id null.  The privacy page's
  // trusted-phones card (one row per phone: Allow / Block / Don't allow) is
  // the way back after a "Don't allow".
  device_access: {
    asks: "use this computer's agents from the network", privacyCard: true, perRequester: true,
  },
  // Proactive speech consent — asked when people land on the platform as the
  // first proactive step under Privacy by Design.
  voice_speech: {
    asks: 'speak aloud and provide voice guidance', privacyCard: true,
  },
  // A capability this computer does not have yet, offered the moment a task
  // needs it: a voiced reply found no cloning engine installed, so HARTOS
  // asks before downloading and installing one (scope 'tts:<engine>', one
  // capability per grant).  The ask always carries a reason naming the
  // engine and what it costs, and the card shows that reason; the wording
  // here is only the fallback.  privacyCard false, so no "Don't allow": a
  // no would have no card to come back from, and the offer returns on its
  // own only when a task needs the capability again.
  capability_setup: {
    asks: 'set up a capability this computer is missing', privacyCard: false,
  },
});

// The camera's consent type, by name, because the SPA has to act on it and
// not just describe it: the frames come from THIS browser (getUserMedia ->
// WS to VisionService), so granting has to start the stream client-side,
// unlike screen_capture, which HARTOS's own capture loop polls and starts on
// its next tick.  One spelling, here beside the vocabulary it belongs to.
export const CAMERA_CONSENT_TYPE = 'camera_capture';

// A phone is its Ed25519 key; the consent scope is 'device:<64 hex>'.  What
// the owner reads is the key's first 16 hex in four groups -- the same rule
// as HARTOS consent_service.device_fingerprint and the phone's own display
// (PeerLinkCrypto.getEd25519PublicHex, take 16, 4x4), so the two match by
// eye.  The server sends it on the ask (requester_fingerprint) and on every
// device_access row (fingerprint) since HARTOS 29a188036; this third copy of
// the rule (one per language, each pinned by its own test) is the fallback
// for the transition only -- this SPA in front of an older HARTOS, whose
// asks and rows arrive without the field.
const DEVICE_SCOPE_PREFIX = 'device:';
const DEVICE_KEY_RE = /^[0-9a-f]{64}$/;

export function deviceFingerprint(scopeOrKey) {
  if (typeof scopeOrKey !== 'string') return null;
  let key = scopeOrKey.toLowerCase();
  if (key.startsWith(DEVICE_SCOPE_PREFIX)) key = key.slice(DEVICE_SCOPE_PREFIX.length);
  if (!DEVICE_KEY_RE.test(key)) return null;
  return [0, 4, 8, 12].map((i) => key.slice(i, i + 4)).join(' ');
}

// Under the fingerprint on a device card.
export const FINGERPRINT_CAPTION = 'Check the code matches on the phone';

// The consent types with a card on the privacy page: the way back after a
// "Don't allow" (on/off for an agent type, one row per phone for device_access).
export const PRIVACY_CARD_TYPES = Object.freeze(
  Object.keys(CONSENT_ASKS).filter((type) => CONSENT_ASKS[type].privacyCard),
);

export function consentAskText(consentType) {
  if (CONSENT_ASKS[consentType]) return CONSENT_ASKS[consentType].asks;
  const name = String(consentType || 'this permission').replace(/_/g, ' ');
  return `use ${name}`;
}

export function isPerRequester(consentType) {
  return Boolean(CONSENT_ASKS[consentType] && CONSENT_ASKS[consentType].perRequester);
}

// Who is asking, as a person would say it: the agent's name, else "An
// agent".  (A phone's name is a claim and goes in the title, askTitle.)
export function askerName(name) {
  const who = String(name || '').trim();
  return who || 'An agent';
}

// The card's title.  A phone's name is what the phone said about itself,
// so it is quoted as a claim, never stated.
export function askTitle(consentType, requesterName) {
  if (!isPerRequester(consentType)) return 'Permission needed';
  const who = String(requesterName || '').trim();
  return who ? `A phone calling itself "${who}"` : 'An unnamed phone';
}

// The grant button: a grant from the SPA covers every agent.
export function allowAllLabel(consentType) {
  return `Allow ALL agents to ${consentAskText(consentType)}`;
}

// The grant button for an ask: every agent, or the one phone the ask's
// scope names -- "this phone", never the self-asserted name.
export function grantLabel(consentType) {
  if (isPerRequester(consentType)) return 'Always allow this phone';
  return allowAllLabel(consentType);
}

export function canDecline(consentType) {
  return PRIVACY_CARD_TYPES.includes(consentType);
}

// The decline button: a phone's ask is declined for that phone ("Don't
// allow"; the phone is the title); an ask that names an agent is declined
// for it only, and says which one when the agent has a name.
export function declineLabel(consentType, agentId, name) {
  if (isPerRequester(consentType) || !agentId) return "Don't allow";
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
