/**
 * serverChatHistory.js — an agent's chat from the page's server copy, put
 * back beside the copy in localStorage.
 *
 * Demopage keeps each agent's chat in localStorage (chat_messages_<id>), and
 * every save also POSTs the chat's last two messages to /conversation
 * (routes/db_routes.py): one row per save, `request` the second-to-last
 * message and `response` the last.  The page read that copy back only when
 * localStorage held nothing at all for the agent.
 *
 * Since 5bd57b07 (2026-09-17) an agent switch keeps the setup cards on screen,
 * and a save that lands inside the switch wrote those cards alone over the
 * agent's stored chat.  localStorage then held a list, so the server copy was
 * never read and the chat showed only cards.  Measured 2026-11-04: agents 54,
 * local_assistant, 49 and 1793365100141 held only setup cards while
 * /conversation still held their conversations.
 *
 *   holdsAgentChat        the save guard: setup cards alone are not an
 *                         agent's chat and are never saved as one.
 *   historyFromServerRows the server rows as chat messages, oldest first.
 *   mergeServerHistory    the server messages older than the stored chat,
 *                         put before it.
 *   restoreServerHistory  fetch, rebuild and merge, while the agent is open.
 */

import { firstChatTime, isChatMessage, mergeRestoredMessages, timeOf } from './mergeRestoredMessages';

// Setup/install cards (Demopage isGlobalSetupCard, chat/SetupProgressCard)
// report system-wide state and ride along across agent switches; they are
// never part of one agent's conversation.
const SETUP_CARD_TYPES = ['setup_progress', 'llm_setup_card'];

// /conversation answers the newest rows first and 100 of them unless asked;
// the longest chat measured on 2026-11-04 (agent 54) had 290 rows.
export const SERVER_HISTORY_LIMIT = 1000;

export function isSetupCard(message) {
  return !!message && SETUP_CARD_TYPES.includes(message.type);
}

/** True when the list holds anything besides setup cards. */
export function holdsAgentChat(messages) {
  return Array.isArray(messages) && messages.some((m) => m && !isSetupCard(m));
}

const textOf = (m) => {
  const t = m && (m.content !== undefined && m.content !== null ? m.content : m.text);
  return typeof t === 'string' ? t.trim() : '';
};

const rowMs = (r) => timeOf({timestamp: r.created_date}) || 0;

const fieldText = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * The rows as messages, oldest first, each timed by its row.  A save posts
 * the chat's last two entries as one row (`request` the second-to-last,
 * `response` the last), so consecutive rows are overlapping two-message
 * windows:
 *   - the same pair as the row before: saved again with nothing new; skipped;
 *   - a row starting with the message the row before ended with: one new
 *     message (a save in the middle of a turn, or the save after it), added
 *     in the next speaker's role;
 *   - anything else: a new turn, `request` as the user's and `response` as
 *     the assistant's.
 * The rows hold no roles, so where the chat had two replies (or two user
 * messages) in a row the second can come back in the other side's role.
 * Measured 2026-11-04, this code on the real rows of the 7 agents whose page
 * copy is still intact on the desktop (402 messages rebuilt): 392 in the
 * page copy's order and role, 7 in the other role, 3 the copy does not hold.
 * The rule before this one skipped any message equal to one of the last two
 * kept, which dropped a repeated turn such as "next", "next" (review of
 * fc660500): 380 in order and role, 6 in the other role, the same 3.
 */
export function historyFromServerRows(rows) {
  if (!Array.isArray(rows)) return [];
  const ordered = rows
    .filter((r) => r && typeof r === 'object')
    .sort((a, b) => rowMs(a) - rowMs(b) || Number(a.conv_id) - Number(b.conv_id));
  const out = [];
  const add = (type, content, timestamp) => out.push({type, content, timestamp});
  let prev = null;
  ordered.forEach((r) => {
    const req = fieldText(r.request);
    const resp = fieldText(r.response);
    if (!req && !resp) return;
    if (prev && req === prev[0] && resp === prev[1]) return;
    if (prev && req && req === prev[1]) {
      const last = out[out.length - 1];
      if (resp) add(last && last.type === 'user' ? 'assistant' : 'user', resp, r.created_date);
    } else {
      if (req) add('user', req, r.created_date);
      if (resp) add('assistant', resp, r.created_date);
    }
    prev = [req, resp];
  });
  return out;
}

/**
 * The server messages older than the stored chat, placed by the one merge
 * rule (utils/mergeRestoredMessages), which puts them in front of it.  This
 * function only decides which server messages are history.  A newer server
 * message is in the stored chat already or was deleted on screen, so it is
 * left out.  A row is saved after the messages it holds were written
 * (measured 2026-11-04: no stored message on the desktop is timed after every
 * row holding its text), so cutting at the stored chat's first time keeps a
 * stored message's own server copy out, while an older message with the same
 * text ("next", "hi") still comes back.  A stored chat with no times has
 * nothing to cut at; there the server messages whose text the chat holds are
 * left out instead.  Setup cards and other non-conversation entries stay
 * where they are.  Returns `local` itself when there is nothing to add.
 */
export function mergeServerHistory(local, serverHistory) {
  const base = Array.isArray(local) ? local : [];
  if (!Array.isArray(serverHistory) || serverHistory.length === 0) return base;
  const first = firstChatTime(base);
  let older;
  if (first !== Infinity) {
    older = serverHistory.filter((m) => {
      const t = timeOf(m);
      return t !== null && t < first;
    });
  } else {
    const held = new Set(base.filter(isChatMessage).map(textOf));
    older = serverHistory.filter((m) => !held.has(textOf(m)));
  }
  return older.length ? mergeRestoredMessages(base, older) : base;
}

/**
 * Fetch the agent's server copy and merge it into the chat on screen, but
 * only while that agent is still the open one (isOpen), so a slow answer never
 * lands in another agent's chat.  Resolves to the number of messages the
 * server copy held (0 when it held none or could not be read).
 */
export function restoreServerHistory({fetchFn, userId, promptId, isOpen, setMessages, limit = SERVER_HISTORY_LIMIT}) {
  if (!promptId || typeof fetchFn !== 'function') return Promise.resolve(0);
  const url =
    `/conversation?user_id=${encodeURIComponent(userId || 'guest')}` +
    `&topic=${encodeURIComponent(`agent_${promptId}`)}&limit=${limit}`;
  return Promise.resolve()
    .then(() => fetchFn(url))
    .then((res) => (res && res.ok ? res.json() : []))
    .then((rows) => {
      const history = historyFromServerRows(rows);
      if (history.length === 0 || !isOpen(promptId)) return 0;
      setMessages((prev) => mergeServerHistory(prev, history));
      return history.length;
    })
    .catch(() => 0);
}
