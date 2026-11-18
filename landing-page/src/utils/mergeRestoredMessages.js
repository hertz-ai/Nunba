/**
 * mergeRestoredMessages.js — one rule for putting a stored chat back beside
 * the messages already on screen (and the server copy's history beside the
 * chat: utils/serverChatHistory chooses those messages and places them here).
 *
 * Demopage restores stored history only after the agents fetch returns.  A
 * message sent before that (the first "hey" after install) is already in
 * state, and the old rule "keep whichever list is longer" replaced it with
 * the stored history, so the new exchange and its reply vanished.  The
 * stored list is the base; live messages the stored list does not hold are
 * appended after it, because they are newer.
 *
 * Except a live user/assistant message timed before the stored chat's first
 * one: that is the server copy's history, which utils/serverChatHistory put
 * in front of the open chat.  When the agents fetch runs again before the
 * next save (a sign-in or sign-out reloads the list), the stored list still
 * lacks that history, and appending it put the whole history below today's
 * chat; the next save then kept that order and posted two old messages as a
 * new /conversation row (review of fc660500, 2026-11-04).  Those messages go
 * in front of the stored list instead.
 */

/** A message's time in milliseconds, or null when it has none. */
export function timeOf(m) {
  const ms = new Date(m && m.timestamp).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isChatMessage(m) {
  return !!m && (m.type === 'user' || m.type === 'assistant');
}

/** The time of the list's earliest timed user/assistant message; Infinity
 *  when none has a time. */
export function firstChatTime(list) {
  let first = Infinity;
  (Array.isArray(list) ? list : []).forEach((m) => {
    const t = isChatMessage(m) ? timeOf(m) : null;
    if (t !== null && t < first) first = t;
  });
  return first;
}

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
  if (!fresh.length) return base;
  if (!base.length) return fresh;
  const first = firstChatTime(base);
  const isOlder = (m) => isChatMessage(m) && timeOf(m) !== null && timeOf(m) < first;
  const older = fresh.filter(isOlder);
  return [...older, ...base, ...fresh.filter((m) => !isOlder(m))];
}
