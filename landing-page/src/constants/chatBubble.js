/**
 * chatBubble.js — canonical chat-bubble wire-contract constants.
 *
 * The `com.hertzai.hevolve.chat.{user_id}` envelope (published by HARTOS
 * core.peer_link.crossbar_publish.publish_thinking_trace) carries `priority`
 * and `action`.  The chat renderer (Demopage.handleDataReceived) keys on these
 * to decide whether a bubble is the model's reasoning (a Thought-process Step)
 * or canned progress (the "analysing…" spinner).  Canonical here so a magic
 * `49` / 'Thinking' / 'Status' is never duplicated across handlers.
 *
 * Cross-language mirror of HARTOS `core/constants.py`
 * (CHAT_BUBBLE_PRIORITY / CHAT_ACTION_THINKING / CHAT_ACTION_STATUS) — the two
 * MUST stay in lockstep; the wire contract is shared.
 */

// Reserved priority for chat-bubble (thinking/status) envelopes.
export const CHAT_BUBBLE_PRIORITY = 49;

// The model's ACTUAL reasoning → rendered as Thought-process Steps (id-49 container).
export const CHAT_ACTION_THINKING = 'Thinking';

// Canned pipeline PROGRESS (stages / routing status) → drives the
// "analysing…" spinner ONLY, never a Step.
export const CHAT_ACTION_STATUS = 'Status';

// A background (daemon) turn's request_id: `daemon_<goal_id>`.  Mirror of
// HARTOS core.chat_client.DAEMON_PREFIX / daemon_request_id.  HARTOS delivers
// a daemon agent's traces to the person who owns the goal
// (crossbar_publish.trace_audience), so the envelope reaches the same topic as
// the owner's own turns; this id is what tells the two apart.
export const DAEMON_REQUEST_PREFIX = 'daemon_';

// True for an envelope from a background agent turn, never the user's own.
export function isBackgroundRequest(requestId) {
  return typeof requestId === 'string' && requestId.startsWith(DAEMON_REQUEST_PREFIX);
}

// True for an envelope that is not the current turn's: a background agent's
// (whatever the page is doing), or an earlier turn's once the page has sent
// a newer one.  Every chat turn a page sends carries its own id (Demopage
// handleSend via chatRetry.startTurn, NunbaChatProvider: the turn's message
// id), so a reply, step or clip that lands after the next send is told apart
// from that send's.  Callers pass the envelope's raw request_id: one with no
// id, or one arriving before this page has a turn of its own, cannot be told
// apart and is treated as this turn's.
export function isOtherTurnEnvelope(requestId, currentRequestId) {
  if (isBackgroundRequest(requestId)) return true;
  if (!currentRequestId || !requestId) return false;
  return requestId !== currentRequestId;
}

// A message an agent sent the person DURING a turn carries the turn's id with
// this mark after it: '<turn>-intermediate' (CREATE) or
// '<turn>-intermediate-<n>' (REUSE).  Mirror of HARTOS
// core.peer_link.crossbar_publish._TURN_SEND_MARK.
export const TURN_SEND_MARK = '-intermediate';

// The id of the turn an envelope belongs to: its request id up to the turn
// mark (HARTOS _note_turn_send: str(request_id).partition(mark)), the whole id
// when it has no mark, '' when it has none.  The one copy of the cut.
export function turnIdOf(requestId) {
  if (typeof requestId !== 'string' || !requestId) return '';
  const i = requestId.indexOf(TURN_SEND_MARK);
  return i < 0 ? requestId : requestId.slice(0, i);
}

// True for a message sent during a turn: the mark with a turn in front of it
// (HARTOS keeps only those for the turn's speech).
export function isTurnSend(requestId) {
  return typeof requestId === 'string'
    && requestId.indexOf(TURN_SEND_MARK) > 0;
}

// Whether `row` repeats a line `rows` already show for its turn: a turn's
// HTTP reply (`turnReply`) and a pushed send of that turn (`turnSend`) with
// the same words (whitespace aside), in either order.  The reply repeats a
// send shown before it (that send came while the turn ran); a send repeats
// a reply shown before it only when the server says it was sent inside the
// turn (`turnVoiced`, HARTOS crossbar_publish.turn_voiced): a scheduled
// reminder carries the last turn's id too, and is a new line.  Two pushes
// never repeat each other (the same reminder twice is said twice), rows of
// another turn or of no turn never match, and two rows that both carry a
// msg_id match only when it is the same.
export function isShownInTurn(rows, row) {
  if (!row || !row.turnId || !Array.isArray(rows)) return false;
  const words = (t) => String(t || '').replace(/\s+/g, ' ').trim();
  const text = words(row.content);
  if (!text) return false;
  const repeats = (m) => (row.turnReply
    ? (m.turnSend === true && !m.turnReply)
    : (row.turnSend === true && row.turnVoiced === true && m.turnReply === true));
  return rows.some((m) => m && m.turnId === row.turnId && m.type === row.type
    && repeats(m)
    && !(m.msgId && row.msgId && m.msgId !== row.msgId)
    && words(m.content) === text);
}
