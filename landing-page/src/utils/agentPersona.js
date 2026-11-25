/**
 * The persona an agent's replies name, and how a screen says it beside the
 * agent's name: "<agent name> · <persona>".
 *
 * Owner, 2026-11-25: "my computer desktop is child personna, where are we
 * showing the persona with agent name to user in chat screen?"  HARTOS keeps
 * one persona per account and agent and now names it (design_1125 B, one
 * reader, core.flow_progress.persona_of): `persona` on the /chat reply and on
 * every agent message it pushes, and `persona` and `to_persona` on a question
 * card.  A person with no persona placed gets no key, so nothing here guesses
 * one.  The chat page keeps each reply's `persona` on its message, and a
 * pushed message's agent as its `promptId`.
 */

// "<agent name> · <persona>", or what there is of it: the name alone when
// there is no persona (as before), the persona alone when there is no name.
export function withPersona(name, persona) {
  const who = String(name || '').trim();
  const as = String(persona || '').trim();
  if (!as) return who;
  return who ? `${who} · ${as}` : as;
}

const known = (id) => id !== undefined && id !== null && String(id) !== '';

// The newest persona the open agent's replies named, or '' when none did.
// An agent message is pushed to the person's chat whichever chat is open, so
// a message another agent pushed (its promptId is not `openPromptId`) never
// names this chat's persona.
export function newestPersona(messages, openPromptId) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const m = list[i];
    if (!m || m.type !== 'assistant' || !String(m.persona || '').trim()) continue;
    if (known(m.promptId) && known(openPromptId)
        && String(m.promptId) !== String(openPromptId)) continue;
    return String(m.persona).trim();
  }
  return '';
}
