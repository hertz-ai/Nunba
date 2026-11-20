/**
 * How the agent audit page (Social/Agents/AgentAuditPage TrailView) words one
 * line of the HARTOS audit trail (security/audit_trail.py).  Pure functions,
 * so the wording is tested without the page.
 */

// The audit trail's kinds (HARTOS security.audit_trail.KINDS, less the
// trail's own gap / storage lines), as filters.
export const TRAIL_KINDS = [
  ['', 'All'],
  ['message', 'Messages'],
  ['transcript', 'Transcripts'],
  ['audio', 'Audio'],
  ['video', 'Video'],
  ['file', 'Files'],
  ['image_caption', 'Image captions'],
  ['screen_caption', 'Screen captions'],
  ['video_caption', 'Video captions'],
  ['llm_call', 'Model calls'],
  ['speech_out', 'Spoken replies'],
  ['action', 'Actions'],
];

// Who acted, then the agent's role and the person's role as separate labels:
// a person's role is never an agent's, nor the reverse (owner, 2026-11-07).
export function trailWho(row) {
  const parts = [row.actor || row.dir];
  if (row.agent_role) parts.push(`agent role: ${row.agent_role}`);
  const pr = row.person_role;
  if (pr) {
    const bits = [pr.kind, pr.admin ? 'admin' : null, pr.tier ? `tier ${pr.tier}` : null]
      .filter(Boolean);
    if (bits.length) parts.push(`person: ${bits.join(', ')}`);
  }
  return parts.filter(Boolean).join(' · ');
}

// The line's words, or what it points at, and whether text was cut or held.
export function trailBody(row) {
  if (row.text) {
    return row.text_len > row.text.length
      ? `${row.text}\n… first ${row.text.length} of ${row.text_len} characters kept; the checksum covers all of them`
      : row.text;
  }
  const ex = row.extra || {};
  const name = ex.name || (ex.names && Object.values(ex.names)[0]) || row.ref || '';
  const bits = [ex.event, name, row.model, ex.step, ex.state].filter(Boolean);
  if (row.text_len) bits.push(`text withheld (${row.text_len} characters; checksum kept)`);
  return bits.join(' · ') || row.kind;
}

// Why the trail could not be read, so a refusal never looks like "nothing
// recorded".  The calls pass keepStatus, so the rejection carries the status.
export function trailError(err) {
  if (err?.status === 403) return "Only this agent's owner or an admin can read its trail.";
  if (err?.status === 404) return 'This node does not serve the audit trail yet.';
  const why = err?.error || err?.data?.error || err?.message;
  return `The trail could not be read${why ? `: ${why}` : ''}.`;
}
