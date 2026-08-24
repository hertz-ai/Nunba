/**
 * prompt_id is SERVER-OWNED.  The client NEVER generates one — the only
 * minter is HARTOS (create_recipe _next_prompt_id) when an agent CREATE
 * or REUSE flow starts.  The server returns its id on every /chat
 * response (chatbot_routes:3108); this helper only decides whether to
 * REMEMBER that server-assigned id so follow-up turns echo it back.
 * The route derives casual (companion) vs agent-bound session shape
 * from its presence (`not bool(prompt_id or create_agent)`), so
 * dropping it — as both surfaces did before 2026-08-24 — misroutes
 * every agent-flow follow-up as a casual turn.
 *
 * ONE rule for every surface:
 *   - remember only a real server id (not 0 / null / empty);
 *   - never override an explicit agent context — if the surface already
 *     has a prompt_id, the explicit choice wins.
 *
 * @param {string|number|null} currentId  prompt_id the surface sent this turn
 * @param {string|number|null} responseId prompt_id the SERVER returned
 * @returns {string|number|null} server id to echo on subsequent turns, or null
 */
export function rememberServerPromptId(currentId, responseId) {
  if (responseId === null || responseId === undefined) return null;
  const r = String(responseId);
  if (r === '' || r === '0' || r === 'null' || r === 'undefined') return null;
  if (currentId && String(currentId) !== '0') return null;
  return responseId;
}
