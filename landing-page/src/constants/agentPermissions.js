/**
 * agentPermissions.js: what one agent is allowed, read from the consent rows.
 *
 * Owner, 2026-11-21: a consent an agent asked for once is kept for the
 * agent's whole life unless the user turns it off in chat "or user consents
 * off in nunba admin for that agent".  Admin's agent drawer shows that
 * switch (AgentOperationsDrawer, Permissions).
 *
 * The rows come from GET /api/social/consent?agent_id=<this agent>, which
 * says which agent each row is for (agent_id; null means every agent) and
 * where the agent stands (agent_state: 'allowed' or 'turned_off', worked
 * out by HARTOS consent_service.agent_state, the reading its own tools
 * enforce).  This file shows that state and keeps no rule for it: it used
 * to work it out again here, and for a no and an "Allow ALL agents" given
 * in the same millisecond it showed "Off" while HARTOS allowed the agent.
 *   - the agent's own row says the agent's state;
 *   - with no row of its own, the every-agent row says it, for the agent
 *     the request named.
 *
 * Off = POST /consent/decline with agent_id (that agent's own no; the
 * others keep theirs).  On = POST /consent/reopen, which takes back every
 * agent's no for that permission (owner 2026-11-22: the switch says so
 * before it is pressed: BACK_ON_LABEL and REOPEN_NOTE).
 */
import {consentAskText} from './consentAsks';

// The kinds an agent holds for itself and HARTOS checks for that agent, so
// one agent can be switched.  The camera and the screen are shared: a no
// for one agent stops them for that agent only, and the others keep them
// (HARTOS announce_revocation, feed_said_no).  Data access is not here:
// what reads it in HARTOS (the microphone and chat learning) hears a
// person, not an agent, so a switch for one agent would change nothing.
export const AGENT_SWITCHABLE = Object.freeze(
  ['computer_control', 'camera_capture', 'screen_capture']);

// One switch for the whole computer: a no for one agent would switch the
// copilot off for every agent, so it is shown, not switched; the Privacy
// page is where it changes.
export const COMPUTER_WIDE = Object.freeze(['copilot_access']);

export const COMPUTER_WIDE_NOTE =
  'One switch for the whole computer. Change it in Privacy settings.';
export const OFF_LABEL = 'Turn off for this agent';
// On is for the whole permission, and the button says so before it is
// pressed.
export const BACK_ON_LABEL = 'Turn back on for every agent';
export const REOPEN_NOTE =
  'Turning it back on is for every agent: it also turns it back on for any '
  + 'other agent you turned it off for.';
export const ALLOWED = 'allowed';
export const TURNED_OFF = 'turned_off';
export const OWN_GRANT_NOTE =
  'Given to this agent only. Once ended it has to be asked for again.';

// A grant that was not ended: what the row itself says (the server's
// active_only filter reads the same two fields).
const isActive = (r) => Boolean(r.granted) && !r.revoked_at;
const sameAgent = (r, id) => r.agent_id != null && String(r.agent_id) === id;

function label(consentType, scope) {
  if (consentType === 'chat_join') {
    const joiner = String(scope || '').split('#')[0];
    return `Lets user ${joiner || 'someone'} join your chat with this agent`;
  }
  const text = consentAskText(consentType);
  return `May ${text}`;
}

// True when every row says where its agent stands.  A list from a HARTOS
// that does not send agent_state cannot be shown as on or off.
export function statesAreSaid(rows) {
  return (rows || []).every((r) => !r || !r.consent_type
    || Object.prototype.hasOwnProperty.call(r, 'agent_state'));
}

// One entry per permission this agent holds or was turned off for:
//   {consentType, scope, label, on, canSwitch, own, note}
// own: the agent's own grant (ending it cannot be undone from here).
// rows: GET /consent?agent_id=<agentId>.
export function agentPermissions(rows, agentId) {
  const id = agentId == null ? '' : String(agentId).trim();
  if (!id) return [];
  const list = (rows || []).filter((r) => r && r.consent_type);
  const out = [];
  for (const consentType of [...AGENT_SWITCHABLE, ...COMPUTER_WIDE]) {
    const every = list.filter((r) => r.consent_type === consentType
      && r.agent_id == null && (r.scope || '*') === '*');
    const mine = list.filter((r) => r.consent_type === consentType
      && sameAgent(r, id) && (r.scope || '*') === '*');
    const ownGrant = mine.some(isActive);
    // Listed while something on file was given: "Allow ALL agents" that
    // was not ended, or a grant of the agent's own.
    if (!every.some(isActive) && !ownGrant) continue;
    // Where the agent stands is HARTOS's word, never worked out here.
    const said = (mine[0] || every[0]).agent_state;
    if (said !== ALLOWED && said !== TURNED_OFF) continue;
    const wide = COMPUTER_WIDE.includes(consentType);
    const off = said === TURNED_OFF;
    out.push({
      consentType,
      scope: '*',
      label: label(consentType, '*'),
      on: !off,
      canSwitch: !wide,
      own: ownGrant,
      note: wide ? COMPUTER_WIDE_NOTE : (ownGrant ? OWN_GRANT_NOTE : (off ? REOPEN_NOTE : '')),
    });
  }
  // The agent's own grants for a named scope (a joined chat).
  for (const r of list) {
    if (!sameAgent(r, id) || (r.scope || '*') === '*' || !isActive(r)) continue;
    if (r.consent_type !== 'chat_join') continue;
    out.push({
      consentType: r.consent_type,
      scope: r.scope,
      label: label(r.consent_type, r.scope),
      on: true,
      canSwitch: true,
      own: true,
      note: OWN_GRANT_NOTE,
    });
  }
  return out;
}
