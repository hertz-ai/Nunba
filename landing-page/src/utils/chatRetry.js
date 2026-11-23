/**
 * chatRetry.js — Shared retry utilities for chat message sending, and the
 * one test for whether a chat turn got its reply.
 * Used by Demopage.js, NunbaChatProvider.jsx and chat/ChatMessageList.js.
 */

export const BASE_BACKOFF_MS = 2000;
export const MAX_BACKOFF_MS = 30000;

// #125 — terminal retry cap.  Previously the Demopage handleSend
// dispatcher used `while (!localSuccess)` and `while (true)` with no
// upper bound — if classifyError kept returning retryable=true (which
// it does for offline, timeout, network error, 429, 5xx), the loop
// looped indefinitely.  10 attempts at exponential backoff (2s, 4s,
// 8s, 16s, 30s, 30s, ...) is ~3 minutes of trying — beyond that the
// user is better served by a clear "Backend unreachable" message they
// can manually retry rather than an invisible never-ending loop.
export const MAX_RETRIES = 10;

/** Classify an error into a user-readable reason + retryable flag. */
export function classifyError(error) {
  if (!navigator.onLine) return {reason: 'You are offline', retryable: true};
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout'))
    return {reason: 'Request timed out', retryable: true};
  if (
    error?.code === 'ERR_NETWORK' ||
    error?.message?.includes('Network Error')
  )
    return {reason: 'Backend not reachable', retryable: true};
  if (error?.response?.status === 429)
    return {reason: 'Rate limited', retryable: true};
  if (error?.response?.status === 401)
    return {reason: 'Session expired', retryable: false};
  if (error?.response?.status >= 500)
    return {reason: `Server error (${error.response.status})`, retryable: true};
  return {reason: error?.message || 'Unknown error', retryable: true};
}

/** Compute backoff delay for a given retry count (0-indexed). Capped at MAX_BACKOFF_MS. */
export function getBackoff(retryCount) {
  return Math.min(BASE_BACKOFF_MS * Math.pow(2, retryCount), MAX_BACKOFF_MS);
}

/** Generate a stable message ID for retry tracking. */
export function makeMsgId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Start a chat turn: mint its id and make it the page's current turn.
 *
 * The id is the turn's message id and the request_id its POST carries
 * (NunbaChatProvider sends the same id).  `currentTurnRef.current` is
 * written here, at the send, so an envelope that lands before the next
 * render is judged against this turn (constants/chatBubble.
 * isOtherTurnEnvelope).  Every call is a new turn: nothing is carried over
 * from the previous one, whatever the ref already holds.
 */
export function startTurn(currentTurnRef) {
  const id = makeMsgId();
  currentTurnRef.current = id;
  rememberOwnTurn(id);
  return id;
}

// The turns this page started, so a turn's voice plays only on the device
// that started it (owner 2026-11-23: "Only the device you used";
// utils/ttsGuards.shouldPlayPushedClip).  The newest OWN_TURNS_KEPT of this
// page, and the last one sent, which is kept in localStorage so a reload
// mid-turn still speaks that turn's reply (as the Android app keeps keyID).
const OWN_TURNS_KEPT = 200;
export const LAST_TURN_KEY = 'nunba_last_turn_id';
const ownTurns = new Set();

/**
 * Record `turnId` as this page's.  `last` (default true): it is the turn
 * just sent, kept across a reload; an ask answered here is recorded with
 * last: false.  Storage that throws is skipped.
 */
export function rememberOwnTurn(turnId, { last = true } = {}) {
  if (!turnId) return;
  const id = String(turnId);
  ownTurns.delete(id);
  ownTurns.add(id);
  while (ownTurns.size > OWN_TURNS_KEPT) {
    ownTurns.delete(ownTurns.values().next().value);
  }
  if (last) {
    try { localStorage.setItem(LAST_TURN_KEY, id); } catch (e) { /* storage blocked */ }
  }
}

/** Every turn this page started: this page's record and the last sent. */
export function turnsStartedHere() {
  const here = new Set(ownTurns);
  try {
    const last = localStorage.getItem(LAST_TURN_KEY);
    if (last && last.trim()) here.add(last.trim());
  } catch (e) { /* storage blocked */ }
  return here;
}

/**
 * True for a message the user reads as an answer: assistant text, or a card
 * that answers in its place.  ChatMessageList renders llm_setup_card and
 * plan_card only when their payload is present, so they count only then.
 */
export function isReplyMessage(message) {
  if (!message) return false;
  if (message.type === 'assistant') {
    return typeof message.content === 'string' && message.content.trim() !== '';
  }
  if (message.type === 'llm_setup_card') return !!message.setupCard;
  if (message.type === 'plan_card') return !!message.plan;
  return false;
}

/** True when the user message at userIndex has a reply before the next user message. */
export function turnHasReply(messages, userIndex) {
  for (let i = userIndex + 1; i < messages.length; i++) {
    if (messages[i].type === 'user') return false;
    if (isReplyMessage(messages[i])) return true;
  }
  return false;
}

// Shown on a message whose turn ended without a reply.
export const EMPTY_REPLY_REASON = 'The AI returned an empty reply';
export const PUSHED_REPLY_MISSING_REASON = 'Sent, but no reply reached this window';
