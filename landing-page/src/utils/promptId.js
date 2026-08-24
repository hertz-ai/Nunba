/**
 * Session-shape contract (owner, 2026-08-24): once an agent CREATE or
 * REUSE flow starts, every following turn in that conversation must carry
 * the prompt_id the backend minted — the /chat route derives casual_conv
 * (casual companion vs agent-bound session) from its presence
 * (routes/chatbot_routes.py `not bool(prompt_id or create_agent)`).
 * The backend already returns prompt_id on every response
 * (chatbot_routes:3108 forwards HARTOS's minted id); before this rule
 * existed, both chat surfaces read data.Agent_status but dropped
 * data.prompt_id, so agent-flow follow-ups arrived prompt_id-less and
 * were misrouted as casual turns.
 *
 * ONE adoption rule for every surface:
 *   - adopt only a real minted id (not 0 / null / echo of the current);
 *   - never hijack an explicit agent context — if the surface already
 *     has a prompt_id, the explicit choice wins.
 *
 * @param {string|number|null} currentId  prompt_id the surface used this turn
 * @param {string|number|null} responseId prompt_id in the /chat response
 * @returns {string|number|null} id to adopt for subsequent turns, or null
 */
export function adoptMintedPromptId(currentId, responseId) {
  if (responseId === null || responseId === undefined) return null;
  const r = String(responseId);
  if (r === '' || r === '0' || r === 'null' || r === 'undefined') return null;
  if (currentId && String(currentId) !== '0') return null;
  return responseId;
}
