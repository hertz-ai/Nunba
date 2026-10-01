/**
 * chatRouting.js — where a chat message goes: the local backend
 * (/chat -> hevolve_chat -> HARTOS) or the cloud API (CUSTOM_GPT_URL).
 * Used by Demopage.js; NunbaChatProvider.jsx always sends locally.
 */

/**
 * @param {object} o
 * @param {'local_only'|'auto'|'hive_preferred'} o.preference  intelligence toggle
 * @param {string}  o.backendHealth  'healthy' | 'degraded' | 'offline' | ...
 * @param {boolean} o.isGuestMode    signed in as a guest of this node
 * @param {boolean} o.localAgent     the current agent was created locally
 * @param {boolean} o.online         navigator.onLine
 * @returns {boolean} true to send through the local backend
 */
export const shouldUseLocalBackend = ({preference, backendHealth, isGuestMode, localAgent, online}) => {
  if (preference === 'local_only') return true;
  // A guest's token is minted by this node (scope "local", iss "node:…").
  // The cloud API answers it with 401, the silent guest refresh mints another
  // node token, and the message ends as "Session expired" -- Hive was
  // unusable for every guest.  HARTOS serves every preference itself
  // ('hive_preferred' reaches the HiveMind through its dispatcher), so a
  // guest always goes local.
  if (isGuestMode) return true;
  return preference === 'auto' && backendHealth !== 'offline' && (localAgent || !online);
};

export default shouldUseLocalBackend;
