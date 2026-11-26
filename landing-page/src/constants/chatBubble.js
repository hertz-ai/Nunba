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

// A message an agent sent during a turn carries the turn's id with this mark
// after it ('<turn>-intermediate', '<turn>-intermediate-<n>').  Mirror of
// HARTOS core.peer_link.crossbar_publish._TURN_SEND_MARK and the Android
// app's ChatBubble.TURN_SEND_MARK.
export const TURN_SEND_MARK = '-intermediate';

// The turn a request id names: the id up to the mark, the whole id with no
// mark, '' for none (RN ChatBubble.turnIdOf).
export function turnIdOf(requestId) {
  if (requestId === undefined || requestId === null) return '';
  const id = String(requestId);
  const i = id.indexOf(TURN_SEND_MARK);
  return i < 0 ? id : id.slice(0, i);
}

// A send the agent pushed during a turn: its request id carries the mark.
// The turn's reply, under the turn's own id, does not (RN
// ChatBubble.isPushedSend).
function isPushedSend(requestId) {
  return requestId !== undefined && requestId !== null
    && String(requestId).includes(TURN_SEND_MARK);
}

// Whether `message`, an agent's message about to be shown ({type, requestId,
// msgId, content}), repeats one that `messages` already shows, so the page
// shows it once.  Mirror of the Android app's ChatBubble.shouldDrop.
//
// HARTOS makes a turn's newest send its reply when the turn's words went out
// through the send tool (reuse_recipe [SYNTHESIS]), so the same words come
// twice: the send pushed as '<turn>-intermediate-<n>', and the reply on the
// /chat response (the turn's own id), pushed under that id (a deferred
// turn's answer) or mirrored from another device (chat.new).  Live
// 2026-11-26 14:51-15:06 IST, every reply of agents 348, 344 and 353 showed
// twice.  Either copy can come first: an SSE replay brings the push late.
//
// 1. The same non-empty msgId is one message, however many legs brought it
//    (handleDataReceived's msg_id map forgets after 60 s).
// 2. Otherwise a copy is a row of the SAME turn (turnIdOf) holding the same
//    words, every row of the turn read.  A reply and a send of one turn are
//    one message whatever their msgIds: every publish has its own.
// 3. Two replies under the turn's own id are one message unless both have
//    their own msgId.
// 4. Two sends are never copies: a scheduled send reuses the last turn's id
//    and repeats its words, a reminder (RN 3781ce460).  A reminder in the
//    reply's exact words is held back while that reply's row is on screen.
// 5. Only an agent's message is held back, only by an agent's row.  Words
//    never match across turns, and a row saved before rows kept a request id
//    never matches.
export function repeatsShownMessage(message, messages) {
  if (!message || message.type !== 'assistant' || !Array.isArray(messages)) return false;
  const turn = turnIdOf(message.requestId);
  const words = typeof message.content === 'string' ? message.content.trim() : '';
  const sent = isPushedSend(message.requestId);
  return messages.some((row) => {
    if (!row || row.type !== 'assistant') return false;
    if (message.msgId && row.msgId === message.msgId) return true;
    if (!turn.trim() || !words || turnIdOf(row.requestId) !== turn) return false;
    if (typeof row.content !== 'string' || row.content.trim() !== words) return false;
    const rowSent = isPushedSend(row.requestId);
    if (sent && rowSent) return false;
    if (sent !== rowSent) return true;
    return !(message.msgId && row.msgId);
  });
}
