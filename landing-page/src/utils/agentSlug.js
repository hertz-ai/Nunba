/**
 * Canonical agent-URL slug: ONE writer rule, ONE reader rule.
 *
 * WHY THIS MODULE EXISTS
 *
 * `/agents/:agentName` had one writer and three different readers, none of which
 * reversed what the writer did:
 *
 *   writer   Agents.js       `agent.name.replace(/\s+/g, '-')`   hyphenated, original case
 *   reader   Agent.js:271    `a.name.toLowerCase() === agentName.toLowerCase()`
 *   reader   Demopage.js:957 `a.name === agentName`              exact, no folding
 *
 * Neither reader un-hyphenated, so for any agent whose name contains a space
 * the round-trip could not close: "Local Tutor" was written as "Local-Tutor",
 * and both readers then compared that against "Local Tutor" and missed.
 *
 * Clicking a card still worked, which is why this survived — Agent.js:70 reads
 * `location.state.agentData`, so the object arrives out-of-band and the URL is
 * never consulted. But a DEEP LINK, refresh, bookmark or shared URL has no
 * router state, so it fell through to `defaultAgentData`: the user asked for one
 * agent and silently got a different one. No error, no 404, just the wrong page.
 *
 * THE RULE: compare slug-to-slug, and slugify BOTH sides.
 *
 * Slugifying the incoming param as well as the candidate name is what makes
 * this backward compatible without a redirect table. `agentSlug` is idempotent
 * and strips the punctuation the old writer left in, so every URL the old code
 * could emit still resolves:
 *
 *   old "Local-Tutor" -> agentSlug -> "local-tutor"  ==  agentSlug("Local Tutor")
 *   old "Dr.-Who?"    -> agentSlug -> "dr-who"       ==  agentSlug("Dr. Who?")
 *
 * The slugify body is ported from Hevolve web `components/Agent/Agents.js:24`,
 * which is in turn a deliberate mirror of that repo's `scripts/fetch-agents.js`
 * so its /agents/:slug/about registry pages resolve. Keeping the algorithm
 * identical means a link built on either surface addresses the same agent.
 *
 * NOTE for anyone reading the parity plan: this is NOT the same concern as web's
 * `agentUrlMode.js`. That module maps a QUERY STRING to render flags
 * ({pluginMode, audioOnly, autoGuest}); this one maps a NAME to a path segment.
 * The plan described them as rival slug implementations and warned against
 * porting both — they are orthogonal, and web uses both.
 */

/** Name -> URL-safe path segment. Idempotent. */
export function agentSlug(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
}

/**
 * Resolve a URL segment back to an agent.
 *
 * Slugifies both sides so old-style and new-style URLs both work. Returns
 * undefined when nothing matches — callers decide what to do with that, and
 * "fall back to the default agent" is a decision worth making explicitly rather
 * than inheriting from a failed `.find()`.
 */
export function matchAgentBySlug(agents, slugOrName) {
  const target = agentSlug(slugOrName);
  if (!target) return undefined;
  return (agents || []).find((a) => a && agentSlug(a.name) === target);
}

export default agentSlug;
