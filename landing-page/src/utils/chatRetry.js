/**
 * chatRetry.js — Shared retry utilities for chat message sending.
 * Used by both Demopage.js and NunbaChatProvider.jsx.
 */

export const BASE_BACKOFF_MS = 2000;
export const MAX_BACKOFF_MS = 30000;

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
