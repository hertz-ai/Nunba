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
 * one.  The chat page keeps each reply's `persona` on its message, and the
 * agent the reply came from as its `promptId` (a pushed message's and a /chat
 * reply's alike).
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

// The persona the open agent's newest reply names, or '' when it names none.
// Only the open agent's own replies count (their promptId is
// `openPromptId`): an agent message is pushed to the person's chat whichever
// chat is open, and an @mention switch keeps the previous agent's replies on
// screen, so a reply from another agent, or one that says no agent, never
// names this chat's persona.  The newest decides: a newer reply that names
// none clears it (review of d899016f, M1).
export function newestPersona(messages, openPromptId) {
  if (!known(openPromptId)) return '';
  const list = Array.isArray(messages) ? messages : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const m = list[i];
    if (!m || m.type !== 'assistant' || !known(m.promptId)
        || String(m.promptId) !== String(openPromptId)) continue;
    return String(m.persona || '').trim();
  }
  return '';
}
