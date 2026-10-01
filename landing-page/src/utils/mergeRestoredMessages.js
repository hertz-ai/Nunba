/**
 * mergeRestoredMessages.js — one rule for putting a stored chat back beside
 * the messages already on screen.
 *
 * Demopage restores stored history only after the agents fetch returns.  A
 * message sent before that (the first "hey" after install) is already in
 * state, and the old rule "keep whichever list is longer" replaced it with
 * the stored history, so the new exchange and its reply vanished.  The
 * stored list is the base; live messages the stored list does not hold are
 * appended after it, because they are newer.
 */

const toMs = (ts) => {
  const ms = new Date(ts).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

// messageId when the message has one; else type + content + creation time.
// Live messages carry Date timestamps and stored ones ISO strings, so the
// time is compared in milliseconds.
const keyOf = (m) =>
  m && m.messageId
    ? `id:${m.messageId}`
    : `t:${m && m.type}|${m && m.content}|${toMs(m && m.timestamp)}`;

export function mergeRestoredMessages(stored, live) {
  const base = Array.isArray(stored) ? stored : [];
  const extra = Array.isArray(live) ? live : [];
  const seen = new Set(base.map(keyOf));
  const fresh = extra.filter((m) => {
    const key = keyOf(m);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return fresh.length ? [...base, ...fresh] : base;
}
