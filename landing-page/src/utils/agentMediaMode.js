/**
 * The mode an agent opens in (owner 27 Nov: "Face agents open in video"; "default agent mode is
 * voice as we discussed").
 *
 * A person's own choice for an agent stays theirs: the mode they picked for it (the mode menu or the
 * cycle button) is remembered per agent and wins.  With no choice, an agent with a face (a
 * teacher_avatar_id, the face its live replies speak with) opens in video, and every other agent in
 * voice.  The page's last mode is still saved under 'nunba_media_mode' for the components that read it.
 */
const CHOICE_KEY = 'nunba_media_mode_choice:';
const MODES = ['text', 'audio', 'video'];

/** A stable key for the agent, or null when there is none yet. */
export function agentKey(agent) {
  if (!agent) return null;
  const id = agent.prompt_id ?? agent.id ?? agent.name;
  return id === undefined || id === null || id === '' ? null : String(id);
}

/** Remember the person's own choice of mode for this agent. */
export function rememberChoice(agent, mode) {
  const key = agentKey(agent);
  if (!key || !MODES.includes(mode)) return;
  try {
    localStorage.setItem(CHOICE_KEY + key, mode);
  } catch (e) {
    /* a preference only */
  }
}

/** The person's own choice for this agent, or null. */
export function rememberedChoice(agent) {
  const key = agentKey(agent);
  if (!key) return null;
  try {
    const mode = localStorage.getItem(CHOICE_KEY + key);
    return MODES.includes(mode) ? mode : null;
  } catch (e) {
    return null;
  }
}

/** The mode this agent opens in, or null when the agent is not known yet. */
export function openingMode(agent) {
  if (!agentKey(agent)) return null;
  return rememberedChoice(agent) || (agent.teacher_avatar_id ? 'video' : 'audio');
}
