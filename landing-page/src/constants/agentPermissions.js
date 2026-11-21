/**
 * agentPermissions.js: what one agent is allowed, read from the consent rows.
 *
 * Owner, 2026-11-21: a consent an agent asked for once is kept for the
 * agent's whole life unless the user turns it off in chat "or user consents
 * off in nunba admin for that agent".  Admin's agent drawer shows that
 * switch (AgentOperationsDrawer, Permissions).
 *
 * The rows come from GET /api/social/consent, which says which agent each
 * row is for (agent_id; null means every agent).  The rule here is HARTOS
 * ConsentService.check_consent's, for scope '*':
 *   - "Allow ALL agents" (a granted row with no agent) covers this agent,
 *     unless the owner said no to this agent at or after that grant (on a
 *     tie the no wins) and the no still stands (not taken back with "Allow
 *     asking again");
 *   - or the agent holds a grant of its own.
 * HARTOS decides; this only says what the switch should show.
 *
 * Off = POST /consent/decline with agent_id (that agent's own no; the
 * others keep theirs).  On = POST /consent/reopen (takes the no back).
 */
import {consentAskText} from './consentAsks';

// The kinds an agent holds for itself, so one agent can be switched.  The
// camera and the screen are shared: a no for one agent stops them for that
// agent only, and the others keep them (HARTOS announce_revocation,
// feed_said_no).
export const AGENT_SWITCHABLE = Object.freeze(
  ['computer_control', 'camera_capture', 'screen_capture', 'data_access']);

// One switch for the whole computer: a no for one agent would switch the
// copilot off for every agent, so it is shown, not switched; the Privacy
// page is where it changes.
export const COMPUTER_WIDE = Object.freeze(['copilot_access']);

export const COMPUTER_WIDE_NOTE =
  'One switch for the whole computer. Change it in Privacy settings.';
export const REOPEN_NOTE =
  'Turning it back on also takes back a no you gave any other agent for this.';
export const OWN_GRANT_NOTE =
  'Given to this agent only. Once ended it has to be asked for again.';

const time = (iso) => (iso ? Date.parse(iso) : NaN);
const isActive = (r) => Boolean(r.granted) && !r.revoked_at;
// A no taken back keeps its revoked_at; it stands only if given after.
const noStands = (r) => Boolean(r.revoked_at)
  && !(r.reopened_at && time(r.reopened_at) >= time(r.revoked_at));
const sameAgent = (r, id) => r.agent_id != null && String(r.agent_id) === id;

function label(consentType, scope) {
  if (consentType === 'chat_join') {
    const joiner = String(scope || '').split('#')[0];
    return `Lets user ${joiner || 'someone'} join your chat with this agent`;
  }
  const text = consentAskText(consentType);
  return `May ${text}`;
}

// One entry per permission this agent holds or was turned off for:
//   {consentType, scope, label, on, canSwitch, own, note}
// own: the agent's own grant (ending it cannot be undone from here).
export function agentPermissions(rows, agentId) {
  const id = agentId == null ? '' : String(agentId).trim();
  if (!id) return [];
  const list = (rows || []).filter((r) => r && r.consent_type);
  const out = [];
  for (const consentType of [...AGENT_SWITCHABLE, ...COMPUTER_WIDE]) {
    const allowAll = list
      .filter((r) => r.consent_type === consentType && r.agent_id == null
        && (r.scope || '*') === '*' && isActive(r))
      .sort((a, b) => time(b.granted_at) - time(a.granted_at))[0];
    const mine = list.filter((r) => r.consent_type === consentType
      && sameAgent(r, id) && (r.scope || '*') === '*');
    const ownGrant = mine.some(isActive);
    if (!allowAll && !ownGrant) continue;
    const wide = COMPUTER_WIDE.includes(consentType);
    const off = !ownGrant && mine.some((r) => noStands(r)
      && time(r.revoked_at) >= time(allowAll.granted_at));
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
