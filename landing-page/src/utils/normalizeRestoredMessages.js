/**
 * normalizeRestoredMessages.js — the one place a restored chat message gets
 * the shape ChatMessageList renders.
 *
 * ChatMessageList reads {type, content}.  The server-DB restore in Demopage
 * (added 2026-03-25) produced {role, text}, which rendered as empty grey
 * bubbles: measured 2026-10-02, 34 restored messages and zero text on screen.
 * Messages already in {type, content} shape, and card messages (type with no
 * text), are returned as the same object.
 */

const isPlainObject = (m) => m !== null && typeof m === 'object' && !Array.isArray(m);

export function normalizeRestoredMessage(m) {
  if (!isPlainObject(m)) return m;
  if (m.role !== undefined && m.type === undefined) {
    const { role, text, ts, ...rest } = m;
    return {
      ...rest,
      type: role === 'user' ? 'user' : 'assistant',
      content: m.content !== undefined ? m.content : text,
      timestamp: m.timestamp !== undefined ? m.timestamp : ts,
    };
  }
  if (m.content === undefined && typeof m.text === 'string' && (m.type === 'user' || m.type === 'assistant')) {
    return { ...m, content: m.text };
  }
  return m;
}

export function normalizeRestoredMessages(list) {
  return Array.isArray(list) ? list.map(normalizeRestoredMessage) : [];
}
