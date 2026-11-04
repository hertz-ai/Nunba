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

const toMs = (ts) => new Date(ts).getTime();

const textOf = (m) => {
  const t = m && (m.content !== undefined && m.content !== null ? m.content : m.text);
  return typeof t === 'string' ? t.trim() : '';
};

const rowMs = (r) => {
  const ms = toMs(r.created_date);
  return Number.isNaN(ms) ? 0 : ms;
};

/**
 * The rows as messages, oldest first: `request` as the user's and `response`
 * as the assistant's, each timed by its row.  A save posts the chat's last
 * two messages again, so a message equal to one of the last two kept is a
 * re-post and is skipped.  Measured 2026-11-04 against the copies still in
 * the desktop's page storage: for agents 13, 48 and 49 every rebuilt message
 * (274, 83, 10) is in the page copy; 9 of the 385 rebuilt messages the page
 * copies also hold (agents 13, 48, 49, 20) got the other side's role, because
 * a row saved mid-turn holds the reply as `request`.
 */
export function historyFromServerRows(rows) {
  if (!Array.isArray(rows)) return [];
  const ordered = rows
    .filter((r) => r && typeof r === 'object')
    .sort((a, b) => rowMs(a) - rowMs(b) || Number(a.conv_id) - Number(b.conv_id));
  const out = [];
  ordered.forEach((r) => {
    [[r.request, 'user'], [r.response, 'assistant']].forEach(([field, type]) => {
      const content = typeof field === 'string' ? field.trim() : '';
      if (!content) return;
      if (out.slice(-2).some((m) => m.content === content)) return;
      out.push({type, content, timestamp: r.created_date});
    });
  });
  return out;
}

/**
 * The server messages older than the first stored message of the chat, and
 * not already in it, put before the stored list.  Newer server messages are
 * left out: the stored chat is complete from its first message on, and a
 * message deleted on screen must not come back.  Setup cards and other
 * non-conversation entries stay where they are.  Returns `local` itself when
 * there is nothing to add.
 */
export function mergeServerHistory(local, serverHistory) {
  const base = Array.isArray(local) ? local : [];
  if (!Array.isArray(serverHistory) || serverHistory.length === 0) return base;
  const chat = base.filter((m) => m && (m.type === 'user' || m.type === 'assistant'));
  const times = chat.map((m) => toMs(m.timestamp)).filter((ms) => !Number.isNaN(ms));
  const firstStored = times.length ? Math.min(...times) : Infinity;
  const held = new Set(chat.map(textOf));
  const older = serverHistory.filter((m) => {
    const ms = toMs(m.timestamp);
    return (Number.isNaN(ms) || ms < firstStored) && !held.has(textOf(m));
  });
  return older.length ? [...older, ...base] : base;
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
