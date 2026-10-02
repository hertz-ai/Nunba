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
